import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/app";
import { getDocs, updateDoc, where, collection, query } from "firebase/firestore";

export async function POST(request: Request) {
    const { userId, packageType } = await request.json();
    try {
        const q = query(collection(db, "users"), where("userID", "==", userId));
        const querySnapshot = await getDocs(q);
        await updateDoc(querySnapshot.docs[0].ref, {
            type: packageType
        });
    
        return NextResponse.json({
            message: "Update successful"
        }, { status: 200 });
    } catch (error) {
        console.log(error);    
    }
    return NextResponse.json({
        error: "Failed to update subscription plan"
    }, { status: 400 });
}