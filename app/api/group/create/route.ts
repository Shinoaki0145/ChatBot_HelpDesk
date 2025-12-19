import { NextRequest,NextResponse } from 'next/server';
import { 
    collection, 
    addDoc, 
    doc, 
    runTransaction, 
    Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/app';
import { GET as getSession } from '@/app/api/session/route'

/*
POST method to create group and with other member
- API POST "api/group/create"
- header:
    - cookie: 
        - session
- body: 
    - groupName: string;
    - Member_Emails: string;
*/
interface CreateGroupRequest {
    // ownerID: number;
    groupName: string;
    Member_Emails: string;
}

export async function POST(request: NextRequest) {
    // Get session to authenticate and secure api 
    const authSession = await getSession(request);
    if (!(authSession.ok)){
        return authSession;
    };

    const { userId : ownerID } = await authSession.json()
    const body: CreateGroupRequest = await request.json();
    const {groupName, Member_Emails } = body;

    if (!groupName) {
        return NextResponse.json({ 
            message: 'groupName are required!',
        }, { status: 400 });
    }

    if (!Member_Emails || Member_Emails.trim() === "") {
        return NextResponse.json({ 
            message: 'Member_Emails cannot be empty!',
        }, { status: 400 });
    }

    // get newId for new group
    const cntDocRef = doc(db, "groups", "id_counter");
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

        // add new group to database (firebase)
        await addDoc(collection(db, "groups"), {
            ownerID: ownerID,
            groupID: newId,
            groupName: groupName,
            sharedMembersEmail: Member_Emails.split(',').map(email => email.trim()),
            create_at: Timestamp.now(),
        })

        return NextResponse.json({ 
            message: 'Registration successful!',
            userId: newId,

        }, { status: 201 });

    } catch (error) {
        console.log(`Transaction failed: ${error}`);
    }

    return NextResponse.json({ 
        message: 'Registration failed with error',
    }, { status: 500 });
}
