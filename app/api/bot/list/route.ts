import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/app";
import { decrypt } from "@/lib/session";
import { cookies } from "next/headers";
import { doc, getDoc } from "firebase/firestore";

export async function GET(req: NextRequest) {
  try {
    // Get session from cookie
    const cookie = (await cookies()).get('session')?.value;
    const session = await decrypt(cookie);

    if (!session?.userId) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid session" },
        { status: 401 }
      );
    }

    const userId = session.userId as string;

    // Get user data to get email
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const email = userData.email || "";
    const userIDNumber = userData.userID || userData.userId || 0; // Get numeric userID from user data

    const allBotConfigDocs: any[] = [];

    // Get public bots (owner = 0) - excluding Customer Support Bot
    const publicBotsQuery = query(
      collection(db, "botConfigAgent"),
      where("owner", "==", 0)
    );
    const publicBotsSnapshot = await getDocs(publicBotsQuery);
    const filteredPublicBots = publicBotsSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.botName !== "Customer Support Bot";
    });
    allBotConfigDocs.push(...filteredPublicBots);

    // Get user's own bots (owner = userId)
    if (userIDNumber) {
      const myBotsQuery = query(
        collection(db, "botConfigAgent"),
        where("owner", "==", userIDNumber) // Use numeric userID
      );
      const myBotsSnapshot = await getDocs(myBotsQuery);
      allBotConfigDocs.push(...myBotsSnapshot.docs);
    }

    // Get shared bots via groups (email in sharedMembersEmail)
    if (email) {
      const sharedGroupsQuery = query(
        collection(db, "groups"),
        where("sharedMembersEmail", "array-contains", email)
      );
      const sharedGroupsSnapshot = await getDocs(sharedGroupsQuery);

      const sharedBotIDs = new Set<number>();
      sharedGroupsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.sharedBotID && Array.isArray(data.sharedBotID)) {
          data.sharedBotID.forEach((botId: number) => {
            sharedBotIDs.add(botId);
          });
        }
      });

      if (sharedBotIDs.size > 0) {
        for (const botID of sharedBotIDs) {
          const sharedBotQuery = query(
            collection(db, "botConfigAgent"),
            where("botID", "==", botID)
          );
          const sharedBotSnapshot = await getDocs(sharedBotQuery);
          sharedBotSnapshot.docs.forEach((doc) => {
            if (!allBotConfigDocs.some(d => d.id === doc.id)) {
              allBotConfigDocs.push(doc);
            }
          });
        }
      }
    }

    // Get ALL documents from botAgent collection
    const botAgentSnapshot = await getDocs(collection(db, "botAgent"));

    // Create a map of botAgent data by botID
    const botAgentMapByBotId = new Map();
    botAgentSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.botID) {
        botAgentMapByBotId.set(data.botID, { docId: doc.id, data });
      }
    });

    const allBots: any[] = [];
    const botsWithHistory: any[] = [];

    // Add Customer Support Bot
    const customerSupportBot = {
      id: "customer-support",
      name: "Customer Support Bot",
      model: "GPT-4",
      hasHistory: true,
      active: true,
      botID: 0,
    };
    allBots.push(customerSupportBot);
    botsWithHistory.push(customerSupportBot);

    // Process each bot config
    for (const botConfigDoc of allBotConfigDocs) {
      const botConfigData = botConfigDoc.data();
      const botID = botConfigData.botID;

      // Skip duplicate Customer Support Bot from database
      if (botConfigData.botName === "Customer Support Bot") {
        continue;
      }

      const botAgentInfo = botAgentMapByBotId.get(botID);

      const botInfo = {
        id: botConfigDoc.id, // Always use botConfigDoc.id for unique key
        botID: botID,
        name: botConfigData.botName || "Unnamed Bot",
        model: botConfigData.typeModel || "GPT-4",
        hasHistory: false,
        active: botConfigData.active ?? true,
        createdAt: botConfigData.createdAt || null,
        botAgentId: botAgentInfo?.docId || null, // Store botAgent ID separately if needed
      };

      allBots.push(botInfo);

      // Check if this bot has any chats
      if (botAgentInfo) {
        const chatsQuery = query(
          collection(db, "botAgent", botAgentInfo.docId, "chats")
        );
        const chatsSnapshot = await getDocs(chatsQuery);

        if (!chatsSnapshot.empty) {
          botsWithHistory.push({
            ...botInfo,
            hasHistory: true,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      allBots,
      botsWithHistory,
    });
  } catch (error: any) {
    console.error("Error fetching bots:", error);
    return NextResponse.json(
      { error: "Failed to fetch bots", details: error.message },
      { status: 500 }
    );
  }
}
