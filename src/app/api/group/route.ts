import { NextRequest,NextResponse } from 'next/server';
import { 
    collection, 
    getDocs, 
    query, 
    where
} from 'firebase/firestore';
import { db } from '@/lib/firebase/app';
import { GET as getSession } from '@/app/api/session/route'

/*
GET method to fetch groups for a user
- API POST "api/group"
- header:
    - cookie: 
        - session
*/
export async function GET( request: NextRequest ): Promise<NextResponse> {

    // Get session to authenticate and secure api 
    const authSession = await getSession(request);
    if (!(authSession.ok)){
        return authSession;
    };

    try {
        const url = new URL(request.url);
        // const userId = Number(url.searchParams.get('userId'));
        const { userId, email } = await authSession.json();
        // const email = url.searchParams.get('email')?.toLowerCase();

        if (!userId && !email) {
            return NextResponse.json(
                { error: 'userId or email parameter is required' }, 
                { status: 400 }
            );
        }

        // get the groups owned by user
        const groupsRef = collection(db, 'groups');
        const ownedPromise = userId
            ? getDocs(query(groupsRef, where('ownerID', '==', userId)))
            : Promise.resolve(null);
        
        // get the groups are shared with user
        const sharedPromise = email
            ? getDocs(query(groupsRef, where('sharedMembersEmail', 'array-contains', email)))
            : Promise.resolve(null);

        const [ownedSnap, sharedSnap] = await Promise.all([ownedPromise, sharedPromise]);

        const ownedGroups = ownedSnap ? ownedSnap.docs.map(doc => ({ ...doc.data() })) : [];
        const sharedGroups = sharedSnap ? sharedSnap.docs.map(doc => ({ ...doc.data() })) : [];

        // Deduplicate by groupID if a group appears in both owned/shared
        const ownedIds = new Set(ownedGroups.map((g: any) => g.groupID));
        const uniqueShared = sharedGroups.filter((g: any) => !ownedIds.has(g.groupID));

        return NextResponse.json({ ownedGroups, sharedGroups: uniqueShared }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
    }
}
