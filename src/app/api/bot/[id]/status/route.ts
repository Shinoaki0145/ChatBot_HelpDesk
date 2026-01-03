import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/app";
import { decrypt } from "@/lib/session";
import { cookies } from "next/headers";

export async function PATCH(
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

    const body = await req.json();
    const { active } = body;

    if (typeof active !== "boolean") {
      return NextResponse.json(
        { error: "Invalid request - 'active' must be a boolean" },
        { status: 400 }
      );
    }

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
    if (botData.owner === 0) {
      return NextResponse.json(
        { error: "Forbidden - Cannot modify Customer Support Bot" },
        { status: 403 }
      );
    }

    // Only owner can update bot status
    if (botData.owner !== userIDNumber) {
      return NextResponse.json(
        { error: "Forbidden - You don't have permission to update this bot" },
        { status: 403 }
      );
    }

    // Update bot status
    await updateDoc(botRef, {
      active: active,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Bot status updated successfully",
      active,
    });
  } catch (error: any) {
    console.error("Error updating bot status:", error);
    return NextResponse.json(
      { error: "Failed to update bot status", details: error.message },
      { status: 500 }
    );
  }
}
