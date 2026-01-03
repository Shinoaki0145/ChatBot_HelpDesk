import { NextResponse } from "next/server";
import { collection, addDoc, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/app";

// Interface cho ticket data
interface TicketData {
  ticketID?: string;
  nameTicket: string;
  question: string;
  status: "open" | "resolved";
  timeCreated: number;
  replied: string;
  fromChatId: string;
}

interface CreateTicketRequest {
  nameTicket: string;
  question: string;
  fromChatId: string; // chatDocId
  userId: string;
}

export async function POST(request: Request) {
  try {
    const body: CreateTicketRequest = await request.json();
    const { nameTicket, question, fromChatId, userId } = body;

    if (!nameTicket || !question || !fromChatId || !userId) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // (Optional) verify chat exists
    // Tìm chat này thuộc bot nào (scan botAgent)
    let chatExists = false;

    const botAgentsSnapshot = await getDocs(collection(db, "botAgent"));
    for (const botAgent of botAgentsSnapshot.docs) {
      const chatRef = doc(db, "botAgent", botAgent.id, "chats", fromChatId);
      const chatSnap = await getDoc(chatRef);
      if (chatSnap.exists()) {
        chatExists = true;
        break;
      }
    }

    if (!chatExists) {
      return NextResponse.json(
        { message: "Chat not found" },
        { status: 404 }
      );
    }

    const ticketData = {
      nameTicket,
      question,
      fromChatId, // chatDocId
      status: "open",
      replied: "",
      timeCreated: Math.floor(Date.now() / 1000),
      userId: parseInt(userId),
    };

    const ticketRef = await addDoc(collection(db, "tickets"), ticketData);

    return NextResponse.json(
      {
        message: "Ticket created successfully",
        ticketId: ticketRef.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: Fetch tickets visible to user
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const status = searchParams.get('status'); // Optional filter

        if (!userId) {
            return NextResponse.json({
                message: "Missing userId parameter"
            }, { status: 400 });
        }

        // get all tickets 
        let ticketsQuery: ReturnType<typeof query>;
        if (status) {
            ticketsQuery = query(
                collection(db, "tickets"),
                where("status", "==", status),
                orderBy("timeCreated", "desc")
            );
        } else {
            ticketsQuery = query(
                collection(db, "tickets"),
                orderBy("timeCreated", "desc")
            );
        }

        const ticketsSnapshot = await getDocs(ticketsQuery);
        const allTickets: TicketData[] = ticketsSnapshot.docs.map(doc => ({
            ticketID: doc.id,
            ...(doc.data() as Omit<TicketData, 'ticketID'>)
        }));

        // Get all botConfigAgent owned by userId to find their botIDs
        const myBotsQuery = query(
            collection(db, "botConfigAgent"),
            where("owner", "==", parseInt(userId))
        );
        const myBotsSnapshot = await getDocs(myBotsQuery);
        const myBotIDs = new Set<number>();
        myBotsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.botID) myBotIDs.add(data.botID);
        });

        //  Map botID -> botAgent docId & get all chat IDs 
        const allBotAgentsSnapshot = await getDocs(collection(db, "botAgent"));
        const botIDToDocId = new Map<number, string>();
        const validChatIds = new Set<string>();

        for (const botAgentDoc of allBotAgentsSnapshot.docs) {
            const data = botAgentDoc.data();
            if (data.botID) {
                botIDToDocId.set(data.botID, botAgentDoc.id);

                // Nếu botID này thuộc myBotIDs, lấy tất cả chatId từ subcollection "chats"
                if (myBotIDs.has(data.botID)) {
                    const chatsCollection = collection(db, "botAgent", botAgentDoc.id, "chats");
                    const chatsSnapshot = await getDocs(chatsCollection);
                    chatsSnapshot.forEach(chatDoc => {
                        validChatIds.add(chatDoc.id);
                    });
                }
            }
        }

        // Filter tickets - compare fromChatId with valid chat IDs 
        const visibleTickets = allTickets.filter((ticket: TicketData) => {
            const fromChatId = ticket.fromChatId;
            if (!fromChatId) return false;

            // fromChatId format: "botDocId_messageId", extract botDocId
            const botDocId = fromChatId.split('_')[0];

            // Check if this botDocId's chatId is in our valid chat IDs
            return validChatIds.has(botDocId);
        });


        //  Calculate average respond time =====
        const resolvedTickets = visibleTickets.filter(
          (ticket) =>
            ticket.status === "resolved" &&
            typeof (ticket as any).respondTime === "number" &&
            typeof ticket.timeCreated === "number"
        );

        let avgRespondTime = null;

        if (resolvedTickets.length > 0) {
          const totalRespondTime = resolvedTickets.reduce((sum, ticket: any) => {
            return sum + (ticket.respondTime - ticket.timeCreated);
          }, 0);

          avgRespondTime = Math.floor(
            totalRespondTime / resolvedTickets.length
          ); 
        }
        return NextResponse.json({
            tickets: visibleTickets,
            averageRespondTime: avgRespondTime
        }, { status: 200 });

    } catch (error) {
        console.error("Error fetching tickets:", error);
        return NextResponse.json({
            message: "Internal server error",
            error: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
