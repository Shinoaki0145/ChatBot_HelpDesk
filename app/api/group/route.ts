import { NextResponse } from 'next/server';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/app';
import { get } from 'http';

export async function GET( request: Request ): Promise<Response> {
    try {
        const url = new URL(request.url);
        const userId = Number(url.searchParams.get('userId'));

        if (!userId) {
            return NextResponse.json(
                { error: 'userId parameter is required' }, 
                { status: 400 }
            );
        }

        const groupsRef = collection(db, 'groups');
        const q = query(groupsRef, where('sharedMemberID', 'array-contains', userId));
        const snapshot = await getDocs(q);
        const groups = snapshot.docs.map(doc => ({...doc.data()}));
        return NextResponse.json({ groups }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
    }
}