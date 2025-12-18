"use client";

import { Button } from "@/components/ui/button";
import { Send, Trash2, Plus, X } from "lucide-react";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/app";
import { useAuth } from "@/app/account/AuthContext";

interface ChatMessage {
  id: string;
  role: "user" | "bot";
  content: string;
  timestamp: Date;
}

interface Bot {
  id: string;
  name: string;
  model: string;
  status?: string;
  hasHistory?: boolean;
  active?: boolean;
  botID?: number;
  groups?: string[];
}

// Format timestamp based on whether it's today or not
const formatTimestamp = (timestamp: Date): string => {
  const now = new Date();
  const msgDate = new Date(timestamp);
  
  const isToday = 
    msgDate.getDate() === now.getDate() &&
    msgDate.getMonth() === now.getMonth() &&
    msgDate.getFullYear() === now.getFullYear();

  if (isToday) {
    // Just show time: "10:42 AM"
    return msgDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else {
    // Show date and time: "Dec 16, 2025 10:42 AM"
    return msgDate.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
};

export default function Chat() {
  const { userId, email, isLoading: authLoading } = useAuth();
  const [selectedBot, setSelectedBot] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [bots, setBots] = useState<Bot[]>([]); // Bots có lịch sử chat (hiển thị trong sidebar)
  const [allBots, setAllBots] = useState<Bot[]>([]); // Tất cả bot của user (hiển thị trong modal)
  const [showBotModal, setShowBotModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allGroups, setAllGroups] = useState<Array<{id: string, name: string, sharedBotID: number[]}>>([]);

  // Customer Support Bot - always visible and active
  const CUSTOMER_SUPPORT_BOT_ID = "customer-support";
  const CUSTOMER_SUPPORT_BOT: Bot = {
    id: CUSTOMER_SUPPORT_BOT_ID,
    name: "Customer Support Bot",
    model: "GPT-4",
    hasHistory: true,
    active: true,
  };

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }
    
    async function loadBotsWithHistory() {
      try {
        setLoading(true);
        
        const allBotConfigDocs: any[] = [];
        
        // Load all groups first
        const groupsSnapshot = await getDocs(collection(db, "groups"));
        const groupsData = groupsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().groupName || "Unnamed Group",
          sharedBotID: doc.data().sharedBotID || []
        }));
        setAllGroups(groupsData);
        
        // 1. Get public bots (owner = 0) - excluding Customer Support Bot to avoid duplication
        const publicBotsQuery = query(
          collection(db, "botConfigAgent"),
          where("owner", "==", 0)
        );
        const publicBotsSnapshot = await getDocs(publicBotsQuery);
        // Filter out any bot named "Customer Support Bot" to avoid duplication
        const filteredPublicBots = publicBotsSnapshot.docs.filter(doc => {
          const data = doc.data();
          return data.botName !== "Customer Support Bot";
        });
        allBotConfigDocs.push(...filteredPublicBots);
        
        // 2. Get user's own bots (owner = userId) - only if userId exists
        if (userId) {
          const myBotsQuery = query(
            collection(db, "botConfigAgent"),
            where("owner", "==", parseInt(userId))
          );
          const myBotsSnapshot = await getDocs(myBotsQuery);
          allBotConfigDocs.push(...myBotsSnapshot.docs);
        }
        
        // 3. Get shared bots via groups (email in sharedMembersEmail) - only if email exists
        if (email) {
          const sharedGroupsQuery = query(
            collection(db, "groups"),
            where("sharedMembersEmail", "array-contains", email)
          );
          const sharedGroupsSnapshot = await getDocs(sharedGroupsQuery);
          
          // Get botIDs from shared groups using sharedBotID array
          const sharedBotIDs = new Set<number>();
          sharedGroupsSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.sharedBotID && Array.isArray(data.sharedBotID)) {
              data.sharedBotID.forEach((botId: number) => {
                sharedBotIDs.add(botId);
              });
            }
          });
          
          // Add shared bots that aren't already in the list
          if (sharedBotIDs.size > 0) {
            for (const botID of sharedBotIDs) {
              const sharedBotQuery = query(
                collection(db, "botConfigAgent"),
                where("botID", "==", botID)
              );
              const sharedBotSnapshot = await getDocs(sharedBotQuery);
              sharedBotSnapshot.docs.forEach((doc) => {
                // Only add if not already in the list
                if (!allBotConfigDocs.some(d => d.id === doc.id)) {
                  allBotConfigDocs.push(doc);
                }
              });
            }
          }
        }
        
        // Get ALL documents from botAgent collection (no filter, we'll match by botID)
        const botAgentSnapshot = await getDocs(collection(db, "botAgent"));
        
        // Create a map of botAgent data by botID for quick lookup
        const botAgentMapByBotId = new Map();
        botAgentSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.botID) {
            botAgentMapByBotId.set(data.botID, { docId: doc.id, data });
          }
        });
        
        const allUserBots: Bot[] = [CUSTOMER_SUPPORT_BOT];
        const botsWithHistory: Bot[] = [CUSTOMER_SUPPORT_BOT];
        
        // Process each bot config
        for (const botConfigDoc of allBotConfigDocs) {
          const botConfigData = botConfigDoc.data();
          const botID = botConfigData.botID;
          
          // Skip if this is a duplicate Customer Support Bot from database
          if (botConfigData.botName === "Customer Support Bot") {
            continue;
          }
          
          // Check if this bot exists in botAgent (has chat structure)
          const botAgentInfo = botAgentMapByBotId.get(botID);
          
          // Find groups that contain this bot
          const botGroups = groupsData
            .filter(group => group.sharedBotID.includes(botID))
            .map(group => group.name);
          
          const botInfo: Bot = {
            id: botAgentInfo?.docId || botConfigDoc.id, // Use botAgent ID if exists, otherwise botConfig ID
            name: botConfigData.botName || "Unnamed Bot",
            model: botConfigData.typeModel || "GPT-4",
            hasHistory: false,
            active: botConfigData.active ?? true, // Default to true if not set
            botID: botID,
            groups: botGroups,
          };
          
          // Add to all bots
          allUserBots.push(botInfo);
          
          // Check if this bot has any chats for current user (only if exists in botAgent)
          if (botAgentInfo && userId) {
            const chatsQuery = query(
              collection(db, "botAgent", botAgentInfo.docId, "chats"),
              where("userID", "==", parseInt(userId))
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
        
        setAllBots(allUserBots); // Tất cả bot (cho modal New Chat)
        setBots(botsWithHistory); // Chỉ bot có lịch sử (cho sidebar)
        
        // Auto-select Customer Support Bot if no bot is selected
        if (botsWithHistory.length > 0) {
          setSelectedBot(CUSTOMER_SUPPORT_BOT_ID);
          await loadChatHistory(CUSTOMER_SUPPORT_BOT_ID);
        }
        
      } catch (error) {
        console.error("Error loading bots:", error);
      } finally {
        setLoading(false);
      }
    }
    
    loadBotsWithHistory();
  }, [userId, email, authLoading]);

  // Load chat history for a specific bot
  const loadChatHistory = async (botDocId: string) => {
    try {
      if (botDocId === CUSTOMER_SUPPORT_BOT_ID) {
        // For Customer Support Bot, you might have a different collection
        // For now, show welcome message
        setMessages([
          {
            id: "welcome",
            role: "bot",
            content: "Hi! How can I help you today?",
            timestamp: new Date(),
          },
        ]);
        return;
      }

      // Load chat history from Firebase - only for current user
      if (!userId) {
        setMessages([]);
        return;
      }

      const chatsQuery = query(
        collection(db, "botAgent", botDocId, "chats"),
        where("userID", "==", parseInt(userId)),
        orderBy("timestamp", "asc")
      );
      const chatsSnapshot = await getDocs(chatsQuery);
      
      const chatHistory: ChatMessage[] = [];
      chatsSnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Add user message
        if (data.message) {
          chatHistory.push({
            id: `${doc.id}-user`,
            role: "user",
            content: data.message,
            timestamp: data.timestamp?.toDate() || new Date(),
          });
        }
        
        // Add bot response
        if (data.response) {
          chatHistory.push({
            id: `${doc.id}-bot`,
            role: "bot",
            content: data.response,
            timestamp: data.timestamp?.toDate() || new Date(),
          });
        }
      });
      
      setMessages(chatHistory);
    } catch (error) {
      console.error("Error loading chat history:", error);
      setMessages([
        {
          id: "error",
          role: "bot",
          content: "Hi! How can I help you today?",
          timestamp: new Date(),
        },
      ]);
    }
  };

  const handleSelectBot = async (botId: string) => {
    setSelectedBot(botId);
    
    // Check if bot is already in sidebar (bots with history)
    const botInSidebar = bots.find(b => b.id === botId);
    
    if (!botInSidebar) {
      // Bot not in sidebar yet, add it from allBots
      const selectedBotInfo = allBots.find(b => b.id === botId);
      if (selectedBotInfo) {
        setBots([...bots, selectedBotInfo]);
      }
    }
    
    // Load chat history for this bot
    await loadChatHistory(botId);
    setShowBotModal(false);
  };

  const handleNewChat = () => {
    setShowBotModal(true);
  };

  const handleClearChat = async (botId: string) => {
    try {
      // Delete only current user's chat documents from Firebase
      if (botId !== CUSTOMER_SUPPORT_BOT_ID && userId) {
        const { getDocs, deleteDoc, collection: firestoreCollection, query, where } = await import('firebase/firestore');
        const chatsRef = firestoreCollection(db, "botAgent", botId, "chats");
        const chatsQuery = query(chatsRef, where("userID", "==", parseInt(userId)));
        const chatsSnapshot = await getDocs(chatsQuery);
        
        // Delete only this user's chat documents
        const deletePromises = chatsSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
      }
      
      // Remove bot from sidebar
      setBots(bots.filter(b => b.id !== botId));
      
      // If this was the selected bot, switch to Customer Support Bot
      if (selectedBot === botId) {
        setSelectedBot(CUSTOMER_SUPPORT_BOT_ID);
        await loadChatHistory(CUSTOMER_SUPPORT_BOT_ID);
      }
    } catch (error) {
      console.error("Error clearing chat history:", error);
    }
  };

  const handleSendMessage = async () => {
    if (input.trim() && selectedBot) {
      const userMessage = input;
      const newMessage: ChatMessage = {
        id: String(Date.now()),
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      };
      setMessages([...messages, newMessage]);
      setInput("");

      try {
        // Save message to Firebase (only for non-Customer Support bots)
        if (selectedBot !== CUSTOMER_SUPPORT_BOT_ID) {
          const botInfo = bots.find(b => b.id === selectedBot);
          if (botInfo) {
            // Add new chat document to botAgent/{botId}/chats
            const { addDoc, collection: firestoreCollection, serverTimestamp } = await import('firebase/firestore');
            const chatRef = firestoreCollection(db, "botAgent", selectedBot, "chats");
            
            await addDoc(chatRef, {
              message: userMessage,
              response: "Thanks for your message! How else can I assist you?",
              timestamp: serverTimestamp(),
              userID: parseInt(userId || "0")
            });
          }
        }
        
        // Simulate bot response
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: String(Date.now() + 1),
              role: "bot",
              content: "Thanks for your message! How else can I assist you?",
              timestamp: new Date(),
            },
          ]);
        }, 500);
      } catch (error) {
        console.error("Error saving message:", error);
      }
    }
  };

  return (
    <div className="p-8 h-[calc(100vh-80px)]">
      <div className="max-w-6xl mx-auto h-full flex gap-8">
        {/* Bot List Sidebar */}
        <div className="w-64 bg-white rounded-lg border border-slate-200 p-6 flex flex-col">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Bots</h2>

          <div className="space-y-2 flex-1 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-slate-500 text-center py-4">
                Loading bots...
              </p>
            ) : bots.length > 0 ? (
              bots.map((bot) => (
                <div
                  key={bot.id}
                  className={`relative group rounded-lg transition-all ${
                    selectedBot === bot.id
                      ? "bg-blue-50 border border-blue-300"
                      : "border border-slate-200 hover:border-blue-300"
                  }`}
                >
                  <button
                    onClick={() => handleSelectBot(bot.id)}
                    className="w-full text-left p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${bot.active === false ? 'bg-red-600' : 'bg-green-600'}`}></div>
                      <span className="font-medium text-slate-900">{bot.name}</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      {bot.model?.toUpperCase() || "GPT-4"}
                    </p>
                    {bot.groups && bot.groups.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {bot.groups.map((group, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700"
                          >
                            {group}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                  {bot.id !== CUSTOMER_SUPPORT_BOT_ID && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleClearChat(bot.id)}
                        className="p-1.5 bg-white hover:bg-red-50 rounded border border-slate-200 hover:border-red-300"
                        title="Clear chat history"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">
                No chat history yet
              </p>
            )}
          </div>

          <Button onClick={handleNewChat} variant="outline" className="w-full mt-4">
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-white rounded-lg border border-slate-200 flex flex-col">
          {/* Header */}
          <div className="border-b border-slate-200 p-6">
            <h1 className="text-lg font-bold text-slate-900">
              {selectedBot
                ? bots.find((b) => b.id === selectedBot)?.name || "Select a bot"
                : "Select a bot"}
            </h1>
            <p className="text-sm text-slate-600">Chat with your bot</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-500">Loading...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-500">No messages yet</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div className="max-w-sm">
                    <div
                      className={`px-4 py-3 rounded-lg ${
                        message.role === "user"
                          ? "bg-blue-600 text-white rounded-br-none"
                          : "bg-slate-100 text-slate-900 rounded-bl-none"
                      }`}
                    >
                      <p>{message.content}</p>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 px-2">
                      {formatTimestamp(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 p-6">
            {selectedBot && bots.find(b => b.id === selectedBot)?.active === false ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                <p className="text-sm text-amber-800">
                  This bot is inactive. You can view chat history but cannot send new messages.
                </p>
              </div>
            ) : (
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <Button
                  onClick={handleSendMessage}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Bot Selection Modal */}
        {showBotModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  Select a Bot
                </h2>
                <button
                  onClick={() => setShowBotModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {allBots.filter(bot => bot.active !== false).length > 0 ? (
                  allBots.filter(bot => bot.active !== false).map((bot) => (
                    <button
                      key={bot.id}
                      onClick={() => handleSelectBot(bot.id)}
                      className="w-full p-4 rounded-lg border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-900 text-lg mb-1">
                            {bot.name}
                          </h3>
                          <p className="text-sm text-slate-600">
                            Model: <span className="font-medium">{bot.model?.toUpperCase() || "GPT-4"}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-600"></div>
                          <span className="text-sm text-green-600">Active</span>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-500 mb-4">No bots available</p>
                    <Button
                      onClick={() => (window.location.href = "/account/bots/create")}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Create Your First Bot
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
