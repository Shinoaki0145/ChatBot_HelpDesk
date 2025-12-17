import { NextRequest,NextResponse } from 'next/server';
import { 
    collection, 
    getDocs, 
    query, 
    where, 
    updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/app';
import { GET as getSession } from '@/app/api/session/route'
/*
PUT method to update shared bot
- API PUT "api/group/update_bots"
- header:
    - cookie: 
        - session
- body: 
    - groupIDs: number[];
    - botID: number;
*/
interface UpdateGroupRequest {
    // userID: number;
    groupIDs: number[];
    botID: number;
}

export async function PUT(request: NextRequest) {
    // Get session to authenticate and secure api 
    const authSession = await getSession(request);
    if (!(authSession.ok)){
        return authSession;
    };
    
    const { userId : userID, email } = await authSession.json();
    const body: UpdateGroupRequest = await request.json();
    const { groupIDs, botID } = body;

    try{
        // get groups by id
        const groupsRef = collection(db, 'groups');
        const groupsQuery = query(groupsRef, where('groupID', 'array-contains-any', groupIDs));
        const snapshotGroups = await getDocs(groupsQuery);

        // get bot by id
        const botsRef = collection(db, 'groups');
        const botsQuery = query(groupsRef, where('botID', '==', botID));
        const snapshotBots = await getDocs(botsQuery);
        const botAgent = snapshotBots.docs[0]; // only get one bot

        if (snapshotGroups.empty) {
            return NextResponse.json({ 
                message: 'Group not found!',
                body
            }, { status: 404 });
        }

        if (userID === botAgent.data().ownerID) {
            return NextResponse.json({ 
                message: 'You are not the owner of this bot!',
            }, { status: 403 });
        }

        // update group
        snapshotGroups.forEach(snapshot => {
            if (userID === snapshot.data().ownerID || 
                email === snapshot.data().sharedMembersEmail
            ){
                    let sharedBotsID: Number[] = snapshot.data().sharedBotsID.empty ? [] : snapshot.data().sharedBotsID ;

                    sharedBotsID.push(botID);

                    updateDoc(snapshot.ref, {
                        sharedBotsID: sharedBotsID,
                    });
            }
        })

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