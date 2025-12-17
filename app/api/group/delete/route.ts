import { NextRequest,NextResponse } from 'next/server';
import { 
    collection, 
    getDocs, 
    query, 
    where,
    deleteDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/app';
import { GET as getSession } from '@/app/api/session/route'

/*
DELETE method to delete group
- API DELETE "api/group/delete"
- params:
    - groupID: number
- header:
    - cookie: 
        - session
*/
export async function DELETE(request: NextRequest) {
    // Get session to authenticate and secure api 
    const authSession = await getSession(request);
    if (!(authSession.ok)){
        return authSession;
    };
    const { userId } = await authSession.json();
    const url = new URL(request.url)
    const groupID = Number(url.searchParams.get('groupID'));

    try{
        // get group by id
        const groupsRef = collection(db, 'groups');
        const q = query(groupsRef, where('groupID', '==', Number(groupID)));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return NextResponse.json({ 
                message: 'Group not found!',
            }, { status: 404 });
        }

        if (snapshot.docs[0].data().ownerID !== Number(userId)) {
            return NextResponse.json({ 
                message: 'You are not the owner of this group!',
            }, { status: 403 });
        }

        // delete group
        await deleteDoc(snapshot[0].ref);
        
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