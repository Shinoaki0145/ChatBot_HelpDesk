import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, deleteDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/app";
import { decrypt } from "@/lib/session";
import { cookies } from "next/headers";


export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const cookie = (await cookies()).get('session')?.value;
    const session = await decrypt(cookie);

    if (!session?.userId) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid session" },
        { status: 401 }
      );
    }

    const userId = session.userId as string;

    // Get user data to get numeric userID
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const userIDNumber = userData.userID || userData.userId || 0;

    // Get bot document
    const botRef = doc(db, "botConfigAgent", id);
    const botDoc = await getDoc(botRef);

    if (!botDoc.exists()) {
      return NextResponse.json(
        { error: "Bot not found" },
        { status: 404 }
      );
    }

    const botData = botDoc.data();

    // Only owner can delete bot
    // Do not allow deleting public bots (owner = 0)
    if (botData.owner === 0) {
      return NextResponse.json(
        { error: "Forbidden - Cannot delete public bots" },
        { status: 403 }
      );
    }

    if (botData.owner !== userIDNumber) {
      return NextResponse.json(
        { error: "Forbidden - You don't have permission to delete this bot" },
        { status: 403 }
      );
    }

    // Delete bot configuration
    await deleteDoc(botRef);

    // Also delete from botAgent collection if exists
    const botID = botData.botID;
    if (botID) {
      // Find botAgent document with this botID
      const botAgentQuery = query(collection(db, "botAgent"));
      const botAgentSnapshot = await getDocs(botAgentQuery);
      
      for (const botAgentDoc of botAgentSnapshot.docs) {
        const data = botAgentDoc.data();
        if (data.botID === botID) {
          // Delete all chats first
          const chatsRef = collection(db, "botAgent", botAgentDoc.id, "chats");
          const chatsSnapshot = await getDocs(chatsRef);
          
          const deleteChatsPromises = chatsSnapshot.docs.map(chatDoc => 
            deleteDoc(chatDoc.ref)
          );
          await Promise.all(deleteChatsPromises);

          // Delete botAgent document
          await deleteDoc(doc(db, "botAgent", botAgentDoc.id));
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Bot deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting bot:", error);
    return NextResponse.json(
      { error: "Failed to delete bot", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }) { {
  try {
    const { id } = await params;
    console.log("Fetching bot with ID:", id);
    const q = query(collection(db, "botConfigAgent"), where("botID", "==", +id));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return NextResponse.json({
            message: "Bot not found"
        }, { status: 404 });
    }

    const docSnap = querySnapshot.docs[0];
    const data = docSnap.data();
    console.log("Fetched bot data:", data);
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching bot:", error);
    return NextResponse.json(
      { error: "Failed to fetch bot", details: error.message },
      { status: 500 }
    );
  }
} }