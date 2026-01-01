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

    const groupsRef = collection(db, 'groups');

    try{
        if (groupIDs.length > 0){
            // get groups by id
            const groupsQuery = query(groupsRef, where('groupID', 'in', groupIDs));
            const snapshotGroups = await getDocs(groupsQuery);
            if (snapshotGroups.empty) {
                return NextResponse.json({ 
                    message: 'Group not found!',
                    body
                }, { status: 404 });
            }

            // get bot by id
            const botsRef = collection(db, 'botConfigAgent');
            const botsQuery = query(botsRef, where('botID', '==', botID));
            const snapshotBots = await getDocs(botsQuery);
            

            if (snapshotBots.empty) {
                return NextResponse.json({ 
                    message: 'Bot not found!'+`\nbotID: ${botID}`,
                    body
                }, { status: 404 });
            }
            
            const botAgent = snapshotBots.docs[0]; // only get one bot

            if (userID !== botAgent.data().owner) {
                return NextResponse.json({ 
                    message: 'You are not the owner of this bot!',
                }, { status: 403 });
            }

            // update group
            snapshotGroups.forEach(snapshot => {
                if (userID === snapshot.data().ownerID || 
                    snapshot.data().sharedMembersEmail.includes(email)
                ){
                    // let sharedBotID: Number[] = snapshot.data().sharedBotID.empty ? [] : snapshot.data().sharedBotID ;
                    let sharedBotID: Number[] = snapshot.data().sharedBotID || [] ;

                    if (sharedBotID.includes(botID) ) return;

                    sharedBotID.push(botID);

                    updateDoc(snapshot.ref, {
                        sharedBotID: sharedBotID,
                    });
                }
            })
        }

        // stop shared bot with some groups
        const stopSharedGroupsQuery = query(groupsRef, where('sharedBotID', 'array-contains', botID));
        const snapshotStopSharedGroups = await getDocs(stopSharedGroupsQuery);

        if (!snapshotStopSharedGroups.empty)
        snapshotStopSharedGroups.forEach(snapshot => {
            if (groupIDs.includes(snapshot.data().groupID)) return;
            let sharedBotID: Number[] = snapshot.data().sharedBotID.empty ? [] : snapshot.data().sharedBotID ;
            sharedBotID = sharedBotID.filter(botId => botId !== botID);

            updateDoc(snapshot.ref, {
                sharedBotID: sharedBotID,
            });
            
        })

        return NextResponse.json({ 
            message: 'Update successful!',
        }, { status: 200 });

    } catch (error) {
        console.log(`Error updating share bot with group: ${error}`);
    }

    return NextResponse.json({ 
        message: 'Update group failed with error',
    }, { status: 500 });
}
