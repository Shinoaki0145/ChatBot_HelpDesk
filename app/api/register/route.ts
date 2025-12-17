import { NextResponse } from "next/server";
import { hashSync } from "bcrypt-ts";
import { addDoc, collection, runTransaction, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/app";

interface RegistrationRequest {
    email: string;
    password: string;
    packageType: 'individual' | 'business' | null;
}

export async function POST(request: Request) {
    const body: RegistrationRequest = await request.json();
    const { email, password, packageType } = body;

    const cntDocRef = doc(db, "users", "id_counter");
    try {
        const newId = await runTransaction(db, async (transaction) => {
            const cntDoc = await transaction.get(cntDocRef);
            if (!cntDoc.exists) {
                throw "Document does not exist!";
            }

            const newCurrent = +cntDoc.data().current + 1;
            transaction.update(cntDocRef, { current: newCurrent });
            return newCurrent;
        });

        const hashedPassword = hashSync(password, 10);
        await addDoc(collection(db, "users"), {
            userId: newId,
            email: email,
            password: hashedPassword,
            type: packageType
        })

        return NextResponse.json({ 
            message: 'Registration successful!',
            userId: newId,
            package: packageType,
        }, { status: 201 });

    } catch (error) {
        console.log(`Transaction failed: ${error}`);
    }
    return NextResponse.json({ 
        message: 'Registration failed with error',
    }, { status: 500 });
}