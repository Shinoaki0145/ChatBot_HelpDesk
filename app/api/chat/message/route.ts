import { NextRequest, NextResponse } from "next/server";
import { collection, addDoc, serverTimestamp, doc, getDoc, query, orderBy, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/app";
import { generateResponse } from "@/lib/gemini";
import { decrypt } from "@/lib/session";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    // Get session from cookie
    const cookie = (await cookies()).get('session')?.value;
    const session = await decrypt(cookie);

    if (!session?.userId) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid session" },
        { status: 401 }
      );
    }

    const userId = session.userId as string;

    // Get user data to extract numeric userID
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userData = userDoc.data();
    const userIDNumber = userData.userID || userData.userId || 0;

    const body = await req.json();
    const { botId, message, knowledgeBase } = body;

    if (!botId || !message) {
      return NextResponse.json(
        { error: "Missing required fields: botId and message" },
        { status: 400 }
      );
    }

    if (typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message must be a non-empty string" },
        { status: 400 }
      );
    }

    // Rate limiting check (simple: max 5000 chars per message)
    if (message.length > 5000) {
      return NextResponse.json(
        { error: "Message too long (max 5000 characters)" },
        { status: 400 }
      );
    }

    // Special handling for Customer Support Bot
    if (botId === "customer-support") {
      // Use basic AI response for customer support
      try {
        const aiResponse = await generateResponse({
          model: "gemini-1.5-flash",
          userMessage: message,
          context: "You are a helpful customer support assistant. Be polite, professional, and helpful.",
          chatHistory: [],
        });

        return NextResponse.json({
          success: true,
          userMessage: {
            id: `temp-${Date.now()}-user`,
            role: "user",
            content: message,
            timestamp: new Date().toISOString(),
          },
          botResponse: {
            id: `temp-${Date.now()}-bot`,
            role: "bot",
            content: aiResponse,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error("Error with AI response:", error);
        // Fallback to simple response
        return NextResponse.json({
          success: true,
          userMessage: {
            id: `temp-${Date.now()}-user`,
            role: "user",
            content: message,
            timestamp: new Date().toISOString(),
          },
          botResponse: {
            id: `temp-${Date.now()}-bot`,
            role: "bot",
            content: "Thanks for your message! A support agent will assist you shortly.",
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    // TODO: Add authorization check
    // Verify that user has access to this bot

    // Check if bot exists and get its configuration
    const botRef = doc(db, "botAgent", botId);
    const botDoc = await getDoc(botRef);

    if (!botDoc.exists()) {
      console.log(`Bot ${botId} not found in botAgent collection`);
      try {
        const aiResponse = await generateResponse({
          model: "gemini-2.5-flash",
          userMessage: message,
          context: "",
          chatHistory: [],
        });

        try {
          const chatRef = collection(db, "botAgent", botId, "chats");
          const docRef = await addDoc(chatRef, {
            message: message,
            response: aiResponse,
            timestamp: serverTimestamp(),
            userID: userIDNumber,
          });

          return NextResponse.json({
            success: true,
            userMessage: {
              id: `${docRef.id}-user`,
              role: "user",
              content: message,
              timestamp: new Date().toISOString(),
            },
            botResponse: {
              id: `${docRef.id}-bot`,
              role: "bot",
              content: aiResponse,
              timestamp: new Date().toISOString(),
            },
          });
        } catch (dbError) {
          console.error("Error saving to database:", dbError);
          // Return response even if DB save fails
          return NextResponse.json({
            success: true,
            userMessage: {
              id: `temp-${Date.now()}-user`,
              role: "user",
              content: message,
              timestamp: new Date().toISOString(),
            },
            botResponse: {
              id: `temp-${Date.now()}-bot`,
              role: "bot",
              content: aiResponse,
              timestamp: new Date().toISOString(),
            },
          });
        }
      } catch (aiError) {
        console.error("Error generating AI response:", aiError);
        return NextResponse.json(
          { error: "Failed to generate bot response", details: (aiError as Error).message },
          { status: 500 }
        );
      }
    }

    const botData = botDoc.data();

    // Get bot configuration to determine model type
    let botConfig: any = null;
    if (botData.botID) {
      const botConfigQuery = query(
        collection(db, "botConfigAgent"),
      );
      const botConfigSnapshot = await getDocs(botConfigQuery);
      botConfigSnapshot.forEach((doc) => {
        if (doc.data().botID === botData.botID) {
          botConfig = doc.data();
        }
      });
    }

    const modelType = botConfig?.typeModel || "gemini-1.5-flash";
    const botContext = botData.context || botData.knowledge || "";

    // Combine bot context with knowledge base from client
    let combinedContext = botContext;
    if (knowledgeBase && knowledgeBase.trim().length > 0) {
      combinedContext = `${botContext}\n\n--- Knowledge Base ---\n${knowledgeBase.slice(0, 80000)}`;
    }

    combinedContext += `
      FORMATTING RULES:
      - Use strict GitHub Flavored Markdown (GFM).
      - TABLES: Always include the separator row (e.g., |---|---|). Every row must start and end with a pipe (|).
      - LISTS: Use a single space after the bullet (e.g., "- Item" not "-Item"). 
      - HEADERS: Always put a space after the '#' (e.g., "## Section" not "##Section").
      - CODE: Always use triple backticks with the language name for code blocks.
      - SPACING: Always include a blank line before and after tables, lists, and code blocks.
      `

    // Get recent chat history for context
    const chatsQuery = query(
      collection(db, "botAgent", botId, "chats"),
      orderBy("timestamp", "desc"),
      limit(5)
    );
    const chatsSnapshot = await getDocs(chatsQuery);
    
    const chatHistory: Array<{ role: string; content: string }> = [];
    chatsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.message) {
        chatHistory.push({ role: "user", content: data.message });
      }
      if (data.response) {
        chatHistory.push({ role: "bot", content: data.response });
      }
    });
    chatHistory.reverse(); // Oldest first

    // Generate AI response
    let botResponseText: string;
    
    try {
      botResponseText = await generateResponse({
        model: modelType,
        userMessage: message,
        context: combinedContext,
        chatHistory: chatHistory,
      });
    } catch (error) {
      console.error("Error generating AI response:", error);
      // Fallback response
      botResponseText = "I apologize, but I'm having trouble generating a response right now. Please try again.";
    }

    // Add message to Firebase
    const chatRef = collection(db, "botAgent", botId, "chats");

    const docRef = await addDoc(chatRef, {
      message: message,
      response: botResponseText,
      timestamp: serverTimestamp(),
      userID: userIDNumber,
    });

    return NextResponse.json({
      success: true,
      userMessage: {
        id: `${docRef.id}-user`,
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      },
      botResponse: {
        id: `${docRef.id}-bot`,
        role: "bot",
        content: botResponseText,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message", details: error.message },
      { status: 500 }
    );
  }
}