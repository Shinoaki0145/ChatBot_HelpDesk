import { NextResponse } from "next/server";
import { addDoc, collection, runTransaction, doc } from "firebase/firestore";
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

        await addDoc(collection(db, "botAgent"), {
            botApi: "",
            botID: newId,
            embed: ""
        });

        await addDoc(collection(db, "botConfigAgent"), {
            active: true,
            adjustBotResponses: adjustBotResponses,
            botID: newId,
            botName: botName,
            owner: owner,
            typeModel: typeModel,
            uploadFile: uploadFile,
            websiteLink: websiteLink
        });

        return NextResponse.json({ 
            message: 'Create bot successful!',
            
        }, { status: 201 });

    } catch (error) {
        console.log(`Transaction failed: ${error}`);
    }
    return NextResponse.json({ 
        message: 'Create bot failed with error',
    }, { status: 500 });
}