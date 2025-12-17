import { NextResponse } from "next/server";
import { decrypt } from "@/lib/session";
import { cookies } from "next/headers";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/app";

export async function GET(request: Request) {
    const cookie = (await cookies()).get('session')?.value;
    const session = await decrypt(cookie);

    if (!session?.userId) {
        return NextResponse.json({ message: "Invalid session" }, { status: 401 });
    }

    const userId = session.userId as string;
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
        return NextResponse.json({ message: "User not exists" }, { status: 404 });
    }

    const data = docSnap.data();
    return NextResponse.json({ 
        userId: data.userId,
        email: data.email,
        packageType: data.type
    }, { status: 200 });
}