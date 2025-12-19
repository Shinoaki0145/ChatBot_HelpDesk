import { NextResponse } from "next/server";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/app";


export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params; 
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { message: "Missing userId parameter" },
        { status: 400 }
      );
    }

    const ticketRef = doc(db, "tickets", id);
    const ticketDoc = await getDoc(ticketRef);

    if (!ticketDoc.exists()) {
      return NextResponse.json(
        { message: "Ticket not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ticket: {
        ticketID: ticketDoc.id,
        ...ticketDoc.data(),
      },
    });
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}


export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params; 
    const body = await request.json();
    const { replied, status, userId } = body;

    // phan quyen sau nay
    if (!userId) {
      return NextResponse.json(
        { message: "Missing userId" },
        { status: 400 }
      );
    }

    const ticketRef = doc(db, "tickets", id);
    const ticketDoc = await getDoc(ticketRef);

    if (!ticketDoc.exists()) {
      return NextResponse.json(
        { message: "Ticket not found" },
        { status: 404 }
      );
    }

    const updates: any = {};
    if (replied !== undefined) updates.replied = replied;
    if (status !== undefined) updates.status = status;
    if (replied) updates.respondTime = Math.floor(Date.now() / 1000);

    await updateDoc(ticketRef, updates);

    return NextResponse.json(
      { message: "Ticket updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating ticket:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
