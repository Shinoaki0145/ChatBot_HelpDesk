"use client";

import { Button } from "@/components/ui/button";
import { Send, Trash2, Plus, X, ShieldAlert, CircleAlert, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/app/account/AuthContext";
import { Alert } from "@/components/ui/alert";

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
  botAgentId?: string | null;
}

interface Group {
  id: string;
  groupID: number;
  groupName: string;
  ownerID: number;
  members: string[];
  totalMembers: number;
  isOwner: boolean;
  createdAt: string | null;
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
    // "10:42 AM"
    return msgDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else {
    // "Dec 16, 2025 10:42 AM"
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
  const [bots, setBots] = useState<Bot[]>([])
  const [allBots, setAllBots] = useState<Bot[]>([]);
  const [showBotModal, setShowBotModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Groups state
  const [botGroups, setBotGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [showGroupsModal, setShowGroupsModal] = useState(false);

  // logic to alert ticket
  const [showReportModal, setShowReportModal] = useState(false);
  const [ticketName, setTicketName] = useState("");
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  const CUSTOMER_SUPPORT_BOT_ID = "customer-support";
  const CUSTOMER_SUPPORT_BOT: Bot = {
    id: CUSTOMER_SUPPORT_BOT_ID,
    name: "Customer Support Bot",
    model: "GPT-4",
    hasHistory: true,
    active: true,
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }
    
    async function loadBotsWithHistory() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/bot/list');
        
        if (!response.ok) {
          throw new Error('Failed to fetch bots');
        }
        
        const data = await response.json();

        const allUserBots: Bot[] = data.allBots.map((bot: any) => ({
          id: bot.id,
          name: bot.name,
          model: bot.model,
          hasHistory: bot.hasHistory,
          active: bot.active,
          botAgentId: bot.botAgentId || null,
        }));
        
        const botsWithHistory: Bot[] = data.botsWithHistory.map((bot: any) => ({
          id: bot.id,
          name: bot.name,
          model: bot.model,
          hasHistory: bot.hasHistory,
          active: bot.active,
          botAgentId: bot.botAgentId || null,
        }));
        
        setAllBots(allUserBots);
        setBots(botsWithHistory);
        
        // Auto-select Customer Support Bot if no bot is selected
        if (botsWithHistory.length > 0) {
          setSelectedBot(CUSTOMER_SUPPORT_BOT_ID);
          await loadChatHistory(CUSTOMER_SUPPORT_BOT_ID);
        }
        
      } catch (error: any) {
        console.error("Error loading bots:", error);
        setError(error.message || "Failed to load bots");
      } finally {
        setLoading(false);
      }
    }
    
    loadBotsWithHistory();
  }, [userId, email, authLoading]);

  const loadChatHistory = async (botDocId: string) => {
    try {
      const response = await fetch(`/api/chat/history/${botDocId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to load chat history:', errorData);
        throw new Error(errorData.error || 'Failed to load chat history');
      }
      
      const data = await response.json();

      const chatHistory: ChatMessage[] = data.messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
      }));
      
      if (chatHistory.length === 0) {
        setMessages([
          {
            id: "welcome",
            role: "bot",
            content: "Hi! How can I help you today?",
            timestamp: new Date(),
          },
        ]);
      } else {
        setMessages(chatHistory);
      }
    } catch (error: any) {
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

    const botInSidebar = bots.find(b => b.id === botId);
    
    if (!botInSidebar) {
      const selectedBotInfo = allBots.find(b => b.id === botId);
      if (selectedBotInfo) {
        setBots([...bots, selectedBotInfo]);
      }
    }
    
    const selectedBotFromAll = allBots.find(b => b.id === botId);
    const chatBotId = selectedBotFromAll?.botAgentId || botId;

    await loadChatHistory(chatBotId);
    await loadBotGroups(botId); // Load groups when selecting bot
    setShowBotModal(false);
  };

  const handleNewChat = () => {
    setShowBotModal(true);
  };

  const loadBotGroups = async (botId: string) => {
    if (botId === CUSTOMER_SUPPORT_BOT_ID) {
      setBotGroups([]);
      return;
    }

    try {
      setLoadingGroups(true);
      const response = await fetch(`/api/bot/${botId}/groups`);
      
      if (!response.ok) {
        throw new Error('Failed to load bot groups');
      }
      
      const data = await response.json();
      setBotGroups(data.groups || []);
    } catch (error: any) {
      console.error("Error loading bot groups:", error);
      setBotGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleClearChat = async (botId: string) => {
    try {
      if (botId === CUSTOMER_SUPPORT_BOT_ID) {
        alert('Cannot clear Customer Support Bot history');
        return;
      }

      // Get the correct botAgentId for API call
      const botInfo = bots.find(b => b.id === botId);
      const apiBotId = botInfo?.botAgentId || botId;

      const response = await fetch(`/api/chat/history/${apiBotId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear chat history');
      }
      
      // Remove bot from sidebar
      setBots(bots.filter(b => b.id !== botId));
      
      // If this was the selected bot, switch to Customer Support Bot
      if (selectedBot === botId) {
        setSelectedBot(CUSTOMER_SUPPORT_BOT_ID);
        await loadChatHistory(CUSTOMER_SUPPORT_BOT_ID);
      }
    } catch (error: any) {
      console.error("Error clearing chat history:", error);
      alert(error.message || 'Failed to clear chat history');
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !selectedBot) return;

    const userMessage = input;
    setInput("");

    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botId: selectedBot,
          message: userMessage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || errorData.details || 'Failed to send message');
      }

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          id: data.userMessage.id,
          role: "user",
          content: data.userMessage.content,
          timestamp: new Date(data.userMessage.timestamp),
        },
        {
          id: data.botResponse.id,
          role: "bot",
          content: data.botResponse.content,
          timestamp: new Date(data.botResponse.timestamp),
        },
      ]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      alert(error.message || 'Failed to send message. Please try again.');
      setInput(userMessage); // Restore message on error
    }
  };


  // Handle reporting issue (creating ticket)
  const handleReportIssue = async () => {
    if (!selectedBot || messages.length === 0) return;

    setShowReportModal(true);
  };

  const handleSubmitTicket = async () => {
    if (!ticketName.trim()) {
      alert("Please enter ticket name");
      return;
    }

    const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
    if (!lastUserMessage) return;

    const chatDocId = lastUserMessage.id.split("-")[0];

    try {
      setIsSubmittingTicket(true);

      await fetch("/api/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameTicket: ticketName,
          question: lastUserMessage.content,
          fromChatId: chatDocId,
          userId,
        }),
      });

      alert("Ticket reported successfully");

      // reset
      setTicketName("");
      setShowReportModal(false);
    } catch (err) {
      console.error(err);
      alert("Failed to submit ticket");
    } finally {
      setIsSubmittingTicket(false);
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
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-lg font-bold text-slate-900">
                  {selectedBot
                    ? bots.find((b) => b.id === selectedBot)?.name || "Select a bot"
                    : "Select a bot"}
                </h1>
                <p className="text-sm text-slate-600">Chat with your bot</p>
                
                {/* Show groups */}
                {selectedBot && selectedBot !== CUSTOMER_SUPPORT_BOT_ID && (
                  <div className="mt-3">
                    {loadingGroups ? (
                      <p className="text-xs text-slate-500">Loading groups...</p>
                    ) : botGroups.length > 0 ? (
                      <button
                        onClick={() => setShowGroupsModal(true)}
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        <Users className="w-4 h-4" />
                        <span>{botGroups.length} {botGroups.length === 1 ? 'group' : 'groups'}</span>
                      </button>
                    ) : (
                      <p className="text-xs text-slate-500">No groups</p>
                    )}
                  </div>
                )}
              </div>
            </div>
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
                <Button onClick={handleReportIssue} className="bg-red-600 hover:bg-red-700">
                  <CircleAlert className="w-4 h-4" />
                </Button>
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
                  title="Close"
                  onClick={() => setShowBotModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {allBots.length > 0 ? (
                  allBots.map((bot) => (
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
        {showReportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-bold text-slate-900 mb-4">
                Report an Issue
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Ticket name
                  </label>
                  <input
                    type="text"
                    value={ticketName}
                    onChange={(e) => setTicketName(e.target.value)}
                    placeholder="e.g. Bot answered incorrectly"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowReportModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitTicket}
                    disabled={isSubmittingTicket}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isSubmittingTicket ? "Submitting..." : "Submit Ticket"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Groups Modal */}
        {showGroupsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  Groups with {bots.find((b) => b.id === selectedBot)?.name}
                </h2>
                <button
                  title="Close"
                  onClick={() => setShowGroupsModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {botGroups.length === 0 ? (
                <p className="text-center text-slate-500 py-8">
                  This bot is not shared in any groups you&apos;re a member of.
                </p>
              ) : (
                <div className="space-y-3">
                  {botGroups.map((group) => (
                    <div
                      key={group.id}
                      className="p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 text-lg mb-1">
                            {group.groupName}
                          </h3>
                          <div className="space-y-1">
                            <p className="text-sm text-slate-600">
                              {group.isOwner ? (
                                <span className="inline-flex items-center gap-1 text-blue-600">
                                  <Users className="w-3 h-3" />
                                  Owner
                                </span>
                              ) : (
                                <span className="text-slate-500">Member</span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500">
                              {group.totalMembers} {group.totalMembers === 1 ? 'member' : 'members'}
                            </p>
                            {group.createdAt && (
                              <p className="text-xs text-slate-400">
                                Created: {new Date(group.createdAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}