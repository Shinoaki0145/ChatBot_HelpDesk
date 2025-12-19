import { NextRequest, NextResponse } from "next/server";
import { collection, query, orderBy, getDocs, deleteDoc } from "firebase/firestore";
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
      // If bot doesn't have chat collection yet, return empty messages
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

    // Cannot clear Customer Support Bot history
    if (botId === "customer-support") {
      return NextResponse.json(
        { error: "Cannot clear Customer Support Bot history" },
        { status: 400 }
      );
    }

    // Delete all chat documents from Firebase
    const chatsRef = collection(db, "botAgent", botId, "chats");
    const chatsSnapshot = await getDocs(chatsRef);

    // Delete all chat documents
    const deletePromises = chatsSnapshot.docs.map(doc => deleteDoc(doc.ref));
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
