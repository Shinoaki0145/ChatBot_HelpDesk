import { NextRequest, NextResponse } from "next/server";
import { collection, query, orderBy, getDocs, deleteDoc, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/app";
import { decrypt } from "@/lib/session";
import { cookies } from "next/headers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  try {
    const { botId } = await params;
    
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
    const currentUserID = userData.userID || userData.userId || 0;

    // Special handling for Customer Support Bot
    if (botId === "customer-support") {
      return NextResponse.json({
        success: true,
        messages: [
          {
            id: "welcome",
            role: "bot",
            content: "Hi! How can I help you today?",
            timestamp: new Date().toISOString(),
          },
        ],
      });
    }

    // Load chat history from Firebase
    try {
      const chatsQuery = query(
        collection(db, "botAgent", botId, "chats"),
        orderBy("timestamp", "asc")
      );
      const chatsSnapshot = await getDocs(chatsQuery);

      const chatHistory: any[] = [];
      chatsSnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Only show chats from current user
        const chatUserID = data.userID || data.userId || 0;
        if (chatUserID !== currentUserID) {
          return;
        }

        // Add user message
        if (data.message) {
          chatHistory.push({
            id: `${doc.id}-user`,
            role: "user",
            content: data.message,
            timestamp: data.timestamp?.toDate().toISOString() || new Date().toISOString(),
          });
        }

        // Add bot response
        if (data.response) {
          chatHistory.push({
            id: `${doc.id}-bot`,
            role: "bot",
            content: data.response,
            timestamp: data.timestamp?.toDate().toISOString() || new Date().toISOString(),
          });
        }
      });

      return NextResponse.json({
        success: true,
        messages: chatHistory,
      });
    } catch (error) {
      console.log(`No chat history for bot ${botId}:`, error);
      return NextResponse.json({
        success: true,
        messages: [],
      });
    }
  } catch (error: any) {
    console.error("Error loading chat history:", error);
    return NextResponse.json(
      { error: "Failed to load chat history", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  try {
    const { botId } = await params;
    
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
    const currentUserID = userData.userID || userData.userId || 0;

    // Cannot clear Customer Support Bot history
    if (botId === "customer-support") {
      return NextResponse.json(
        { error: "Cannot clear Customer Support Bot history" },
        { status: 400 }
      );
    }

    // Delete chat documents from Firebase (only current user's chats)
    const chatsRef = collection(db, "botAgent", botId, "chats");
    const chatsSnapshot = await getDocs(chatsRef);

    // Filter and delete only current user's chats
    const deletePromises = chatsSnapshot.docs
      .filter(chatDoc => {
        const chatData = chatDoc.data();
        const chatUserID = chatData.userID || chatData.userId || 0;
        return chatUserID === currentUserID;
      })
      .map(chatDoc => deleteDoc(chatDoc.ref));
    
    await Promise.all(deletePromises);

    return NextResponse.json({
      success: true,
      message: "Chat history cleared successfully",
    });
  } catch (error: any) {
    console.error("Error clearing chat history:", error);
    return NextResponse.json(
      { error: "Failed to clear chat history", details: error.message },
      { status: 500 }
    );
  }
}
