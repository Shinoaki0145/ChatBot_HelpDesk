import { NextRequest,NextResponse } from 'next/server';
import { 
    collection, 
    getDocs, 
    query, 
    where, 
    updateDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/app';
import { GET as getSession } from '@/app/api/session/route'

/*
PUT method to update member's emails
- API PUT "api/group/update_members"
- header:
    - cookie: 
        - session
- body: 
    - groupName: string;
    - Member_Emails: string;
*/
interface UpdateGroupRequest {
    // userID: number;
    groupID: number;
    Member_Emails: string;
}

export async function PUT(request: NextRequest) {
    // Get session to authenticate and secure api 
    const authSession = await getSession(request);
    if (!(authSession.ok)){
        return authSession;
    };
    const { userId : userID } = await authSession.json();
    const body: UpdateGroupRequest = await request.json();
    const { groupID, Member_Emails } = body;

    try{
        // get group by id
        const groupsRef = collection(db, 'groups');
        const q = query(groupsRef, where('groupID', '==', Number(groupID)));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return NextResponse.json({ 
                message: 'Group not found!',
                body
            }, { status: 404 });
        }

        if (snapshot.docs[0].data().ownerID !== Number(userID)) {
            return NextResponse.json({ 
                message: 'You are not the owner of this group!',
            }, { status: 403 });
        }

        // update group
        const groupDoc = snapshot.docs[0];
        await updateDoc(groupDoc.ref, {
            sharedMembersEmail: Member_Emails.split(',').map(email => email.trim()),
        });

        return NextResponse.json({ 
            message: 'Update successful!',
        }, { status: 200 });

    } catch (error) {
        console.log(`Error updating group: ${error}`);
    }
    return NextResponse.json({ 
        message: 'Update group failed with error',
    }, { status: 500 });
}