import { NextResponse } from "next/server";
import { addDoc, collection, runTransaction, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/app";

export async function POST(request: Request) {
    const body= await request.json();
    const { adjustBotResponses, botName, owner, typeModel, uploadFile, websiteLink } = body;
    console.log(body)

    const cntDocRef = doc(db, "botAgent", "id_counter");
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

        // Create botConfigAgent document first to get auto-generated ID
        const botConfigRef = await addDoc(collection(db, "botConfigAgent"), {
            active: true,
            adjustBotResponses: adjustBotResponses,
            botID: newId,
            botName: botName,
            owner: owner,
            typeModel: typeModel,
            uploadFile: uploadFile,
            websiteLink: websiteLink,
            createdAt: serverTimestamp()
        });

        // Create botAgent document with matching ID
        await setDoc(doc(db, "botAgent", botConfigRef.id), {
            botApi: "",
            botID: newId,
            embed: ""
        });

        return NextResponse.json({ 
            message: 'Create bot successful!',
            botId: botConfigRef.id
        }, { status: 201 });

    } catch (error) {
        console.log(`Transaction failed: ${error}`);
    }
    return NextResponse.json({ 
        message: 'Create bot failed with error',
    }, { status: 500 });
}