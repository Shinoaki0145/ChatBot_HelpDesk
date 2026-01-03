import { db } from "@/lib/firebase/app";
import { collection, getDocs } from "firebase/firestore";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const { email } = await request.json();
    let isEmailUsed: boolean = false;
    const querySnapshot = await getDocs(collection(db, "users"));
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.email === email) {
            isEmailUsed = true;
            return;
        }
    });

    if (isEmailUsed) {
        return NextResponse.json({ message: 'Email already used.' }, { status: 409 });
    }

    return NextResponse.json({
        message: "Check successful"
    }, { status: 200 });
}