import { NextRequest, NextResponse } from "next/server";
import { addDoc, collection, runTransaction, doc, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/app";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const userId = +searchParams.get("userId");
    if (!userId) {
        return NextResponse.json({
            message: 'No user id'
        }, { status: 400 });
    }

    const q = query(collection(db, "billingHistory"), where("accountID", "==", userId));
    const querySnapshot = await getDocs(q);
    let res = [];
    querySnapshot.forEach((doc) => {
        res.push(doc.data());
    })

    return NextResponse.json({
        message: "Fetch billing history succesful!",
        billing_history: res
    }, { status: 200 });
}

export async function POST(request: Request) {
    const { userId, botId, amount } = await request.json();
    
    if (!userId) {
        return NextResponse.json({
            message: 'No user id'
        }, { status: 400 });
    }

    if (!botId) {
        return NextResponse.json({
            message: 'No bot id'
        }, { status: 400 });
    }

    if (!amount) {
        return NextResponse.json({
            message: 'No amount'
        }, { status: 400 });
    }

    const collection_name = "billingHistory";
    const cntDocRef = doc(db, collection_name, "id_counter");
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

        await addDoc(collection(db, collection_name), {
            billID: newId,
            accountID: userId,
            date: Timestamp.fromDate(new Date()),
            relateBotID: botId,
            amount: amount,
            status: "paid",
            invoice: "https://picsum.photos/200/300"
        })

        return NextResponse.json({ 
            message: 'Create bill successful!',
        }, { status: 201 });

    } catch (error) {
        console.log(`Transaction failed: ${error}`);
    }
    return NextResponse.json({ 
        message: 'Create bill failed with error',
    }, { status: 500 });
}