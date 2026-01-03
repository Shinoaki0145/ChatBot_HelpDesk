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
import { sendEmail } from '@/lib/email'
import { render } from '@react-email/components';
import { GroupInvitationEmail } from '@/components/ui/mail-template';

/*
PUT method to update member's emails
- API PUT "api/group/update_members"
- header:
    - cookie: 
        - session
- body: 
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
        const newMemberEmails = Member_Emails.split(',').map(email => email.trim());
        const existingMemberEmails: string[] = groupDoc.data().sharedMembersEmail || [];

        newMemberEmails.forEach(async email => {
            if (!existingMemberEmails.includes(email)) {
                const emailHtml = await render(GroupInvitationEmail({
                    UserName: email.split('@')[0],
                    GroupName: groupDoc.data().groupName
                }));
                sendEmail({
                    to: email,
                    subject: `Group ${groupDoc.data().groupName} Membership Updated`,
                    text: `Hello,\n\nYou have been retained as a member of the group "${groupDoc.data().groupName}".\n\nBest regards,\nChatBot-HelpDesk Team`,
                    html: emailHtml
                });
            }
        });

        await updateDoc(groupDoc.ref, {
            sharedMembersEmail: newMemberEmails,
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