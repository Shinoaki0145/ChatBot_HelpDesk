import { NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/app";
import { compareSync } from "bcrypt-ts";
import { encrypt } from "@/lib/session";
import { cookies } from "next/headers";

interface LoginRequest {
    email: string,
    password: string
};

export async function POST(request: Request) {
    const body: LoginRequest = await request.json();
    const { email, password } = body;

    const q = query(collection(db, "users"), where("email", "==", email));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return NextResponse.json({
            message: "Invalid email or password"
        }, { status: 401 });
    }

    const docSnap = querySnapshot.docs[0];
    const data = docSnap.data();
    if (!compareSync(password, data.password)) {
        return NextResponse.json({
            message: "Invalid email or password"
        }, { status: 401 });
    }

    const userId = docSnap.id;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const session = await encrypt({ userId });
    const cookieStore = await cookies();

    cookieStore.set('session', session, {
        httpOnly: true,
        secure: true,
        expires: expiresAt,
        sameSite: 'lax',
        path: '/',
    });
    
    return NextResponse.json({
        message: "Login successful",
        userId
    }, { status: 200 });
}