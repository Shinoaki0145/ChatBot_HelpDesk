import { NextRequest, NextResponse } from "next/server";
import { getDocs, updateDoc, where, collection, query } from "firebase/firestore";
import { db } from "@/lib/firebase/app";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const q = query(collection(db, "botConfigAgent"), where("botID", "==", +id));
    const querySnapshot = await getDocs(q);
    await updateDoc(querySnapshot.docs[0].ref, {
        botName: body.botName,
        typeModel: body.typeModel,
        uploadFile: body.uploadFile,
        websiteLink: body.websiteLink,
        adjustBotResponses: body.adjustBotResponses,
    });

    return NextResponse.json(
      {
        message: "Update successful",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating bot:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
