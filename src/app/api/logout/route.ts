import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function DELETE(request: Request) {
    const cookieStore = await cookies();
    cookieStore.delete('session');  
    
    return NextResponse.json({
        message: "Session deleted successfully"
    }, { status: 200 });
}