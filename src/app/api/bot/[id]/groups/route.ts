import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/app";
import { decrypt } from "@/lib/session";
import { cookies } from "next/headers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: botDocId } = await params;

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

    // Get user data to get email and numeric userID
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const email = userData.email || "";
    const userIDNumber = userData.userID || userData.userId || 0;

    // Get bot config to find botID
    const botConfigRef = doc(db, "botConfigAgent", botDocId);
    const botConfigDoc = await getDoc(botConfigRef);

    if (!botConfigDoc.exists()) {
      return NextResponse.json(
        { error: "Bot not found" },
        { status: 404 }
      );
    }

    const botData = botConfigDoc.data();
    const botID = botData.botID;

    if (!botID) {
      return NextResponse.json(
        { error: "Bot ID not found in config" },
        { status: 404 }
      );
    }

    // Query groups where bot is shared
    const groupsRef = collection(db, "groups");
    const groupsWithBotQuery = query(
      groupsRef,
      where("sharedBotID", "array-contains", botID)
    );
    const groupsSnapshot = await getDocs(groupsWithBotQuery);

    // Filter groups where user is a member
    const userGroups: any[] = [];
    groupsSnapshot.forEach((doc) => {
      const data = doc.data();
      const isOwner = data.ownerID === userIDNumber;
      const isMember = Array.isArray(data.sharedMembersEmail) && 
                       data.sharedMembersEmail.includes(email);

      if (isOwner || isMember) {
        const sharedMembers = data.sharedMembersEmail || [];
        userGroups.push({
          id: doc.id,
          groupID: data.groupID,
          groupName: data.groupName || "Unnamed Group",
          ownerID: data.ownerID,
          members: sharedMembers,
          totalMembers: sharedMembers.length + 1, // +1 for owner
          isOwner: isOwner,
          createdAt: data.create_at?.toDate().toISOString() || null,
        });
      }
    });

    return NextResponse.json({
      success: true,
      groups: userGroups,
      botID: botID,
      botName: botData.botName,
    });

  } catch (error: any) {
    console.error("Error fetching bot groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch bot groups", details: error.message },
      { status: 500 }
    );
  }
}
