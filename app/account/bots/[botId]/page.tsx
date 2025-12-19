"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { ArrowLeft, Upload, Link as LinkIcon, Send, Share2, Save } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { toast } from "@/lib/hooks/use-toast";
interface Group {
  id: string;
  name: string;
  sharedBotID?: number[];
}

export default function BotView() {
  const { botId } = useParams();
  const router = useRouter();
  const [botName, setBotName] = useState("");
  const [model, setModel] = useState("gpt4");
  const [knowledgeSource, setKnowledgeSource] = useState<"url" | "file" | null>(null);
  const [knowledgeUrl, setKnowledgeUrl] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [testMessage, setTestMessage] = useState("");
  const [responseAdjustment, setResponseAdjustment] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const packageType = localStorage.getItem("packageType") || "individual";

  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState<boolean>(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroups = async () => {
      setGroupsLoading(true);
      setGroupsError(null);
      try {
        const res = await fetch('/api/group');
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.message || 'Failed to fetch groups');
        }
        const data = await res.json();
        const mapGroup = (g: any): Group => ({
          id: String(g.groupID ?? g.id),
          name: g.groupName ?? g.name ?? 'Unnamed group',
          sharedBotID: Array.isArray(g.sharedBotID) ? g.sharedBotID : [],
        });

        const owned: Group[] = data?.ownedGroups?.map(mapGroup) ?? data?.groups?.map(mapGroup) ?? [];
        const shared: Group[] = data?.sharedGroups?.map(mapGroup) ?? [];

        const combined = [...owned, ...shared];
        setAvailableGroups(combined);

        // Pre-select groups that already contain this bot (only if user hasn't selected any yet)
        if (botId && selectedGroups.length === 0) {
          const initialSelected = combined
            .filter((g) => (g.sharedBotID ?? []).includes(Number(botId)))
            .map((g) => g.id);
          if (initialSelected.length) setSelectedGroups(initialSelected);
        }
      } catch (err: any) {
        setGroupsError(err?.message || 'Failed to fetch groups');
        toast({ title: 'Failed to load groups', description: err?.message || 'Check your network' });
      } finally {
        setGroupsLoading(false);
      }
    };

    fetchGroups();
  }, []);

  useEffect(() => {
    // Load bot data from localStorage
    const storedBots = localStorage.getItem("bots");
    if (storedBots && botId) {
      const bots = JSON.parse(storedBots);
      const bot = bots.find((b: any) => b.id === botId);
      if (bot) {
        setBotName(bot.name);
        setModel(bot.model?.toLowerCase().replace(" ", "") || "gpt4");
      }
    }
  }, [botId]);

  const handleSaveBot = () => {
    if (botName.trim() && botId) {
      const storedBots = localStorage.getItem("bots");
      if (storedBots) {
        const bots = JSON.parse(storedBots);
        const botIndex = bots.findIndex((b: any) => b.id === botId);
        if (botIndex >= 0) {
          bots[botIndex].name = botName;
          bots[botIndex].model = model;
          localStorage.setItem("bots", JSON.stringify(bots));
          setIsSaved(true);
          setTimeout(() => setIsSaved(false), 2000);
        }
      }
    }
  };

  const handleSendMessage = () => {
    if (testMessage.trim()) {
      let botResponse = `Response from ${botName} using ${model}`;
      
      if (responseAdjustment.trim()) {
        botResponse = responseAdjustment;
      }

      setChatMessages([
        ...chatMessages,
        { role: "user", content: testMessage },
        {
          role: "assistant",
          content: botResponse,
        },
      ]);
      setTestMessage("");
    }
  };

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const [isSharing, setIsSharing] = useState(false);

  const handleShareBot = async () => {
    if (!botId) {
      toast({ title: "Bot ID missing", description: "Unable to share without bot ID" });
      return;
    }

    setIsSharing(true);

    try {
      const body = {
        groupIDs: selectedGroups.map((id) => Number(id)),
        botID: Number(botId),
      };

      const res = await fetch("/api/group/update_bots", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({ title: "Failed to update groups", description: data?.message || "Server error" });
        return;
      }

      toast({ title: "Shared successfully", description: data?.message || "Bot sharing updated" });
      setShowGroupModal(false);
    } catch (error) {
      console.error("Error sharing bot:", error);
      toast({ title: "Error", description: "Network or server error" });
    } finally {
      setIsSharing(false);
    }
  };

  return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link href="/account/bots">
              <button className="p-2 hover:bg-slate-100 rounded-lg">
                title="Back to Bots"
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Bot Details & Testing
              </h1>
              <p className="text-slate-600">
                Edit and test your chatbot configuration
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: Bot Configuration */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-slate-200 p-6 sticky top-24">
                <h2 className="text-lg font-bold text-slate-900 mb-4">
                  Bot Configuration
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Bot Name *
                    </label>
                    <input
                      type="text"
                      value={botName}
                      onChange={(e) => setBotName(e.target.value)}
                      placeholder="Bot name"
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      AI Model
                    </label>
                    <div className="space-y-2">
                      {[
                        { value: "gpt4", label: "GPT-4", desc: "Most advanced" },
                        { value: "claude3", label: "Claude 3", desc: "Balanced" },
                        { value: "gemini", label: "Gemini", desc: "Fast" },
                      ].map((opt) => (
                        <label key={opt.value} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                          <input
                            type="radio"
                            name="model"
                            value={opt.value}
                            checked={model === opt.value}
                            onChange={(e) => setModel(e.target.value)}
                          />
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {opt.label}
                            </div>
                            <div className="text-xs text-slate-500">{opt.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={handleSaveBot}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaved ? "Saved!" : "Save Changes"}
                  </Button>

                  {packageType === "business" && (
                    <div className="pt-4 border-t border-slate-200">
                      <h3 className="font-semibold text-slate-900 mb-3">
                        Share with Groups
                      </h3>
                      <Button
                        onClick={() => setShowGroupModal(true)}
                        variant="outline"
                        className="w-full"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Select Groups ({selectedGroups.length})
                      </Button>
                      {selectedGroups.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {selectedGroups.map((groupId) => {
                            const group = availableGroups.find((g) => g.id === groupId);
                            return (
                              <div key={groupId} className="flex items-center justify-between bg-blue-50 p-2 rounded text-sm">
                                <span className="text-blue-700">{group?.name}</span>
                                <button
                                  onClick={() => toggleGroupSelection(groupId)}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Middle & Right: Knowledge Base & Chat */}
            <div className="lg:col-span-2 space-y-6">
              {/* Knowledge Base */}
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">
                  Knowledge Base
                </h2>
                <div className="space-y-3">
                  <button
                    onClick={() =>
                      setKnowledgeSource(
                        knowledgeSource === "url" ? null : "url"
                      )
                    }
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      knowledgeSource === "url"
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-300 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <LinkIcon className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-slate-900">
                        Website Link
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      Train bot with website content
                    </p>
                  </button>

                  {knowledgeSource === "url" && (
                    <input
                      type="url"
                      value={knowledgeUrl}
                      onChange={(e) => setKnowledgeUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  )}

                  <button
                    onClick={() =>
                      setKnowledgeSource(
                        knowledgeSource === "file" ? null : "file"
                      )
                    }
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      knowledgeSource === "file"
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-300 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Upload className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-slate-900">
                        Upload File
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      PDF, TXT, or DOCX files
                    </p>
                  </button>

                  {knowledgeSource === "file" && (
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">
                        Click to upload or drag and drop
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Testing */}
              <div className="bg-white rounded-lg border border-slate-200 flex flex-col h-96">
                {/* Chat Header */}
                <div className="border-b border-slate-200 p-4">
                  <h3 className="font-bold text-slate-900">Test Chat</h3>
                  <p className="text-sm text-slate-600">Interact with your bot</p>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center">
                      <div>
                        <p className="text-slate-500 mb-2">No messages yet</p>
                        <p className="text-sm text-slate-400">
                          Start testing below
                        </p>
                      </div>
                    </div>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${
                          msg.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-xs px-4 py-2 rounded-lg ${
                            msg.role === "user"
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-900"
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Chat Input */}
                <div className="border-t border-slate-200 p-4 flex gap-2">
                  <input
                    type="text"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && handleSendMessage()
                    }
                    placeholder="Test message..."
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <Button
                    onClick={handleSendMessage}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Response Adjustment */}
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">
                  Adjust Bot Response
                </h3>
                <textarea
                  value={responseAdjustment}
                  onChange={(e) => setResponseAdjustment(e.target.value)}
                  placeholder="Enter custom response to test different bot behaviors..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="text-sm text-slate-600 mt-2">
                  Customize responses to fine-tune how your bot answers user messages.
                </p>
              </div>
            </div>
          </div>

          {/* Group Selection Modal */}
          {showGroupModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">
                  Select Groups
                </h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {groupsLoading ? (
                    <div className="text-center text-sm text-slate-500">Loading groups...</div>
                  ) : groupsError ? (
                    <div className="text-center text-sm text-red-600">{groupsError}</div>
                  ) : availableGroups.length === 0 ? (
                    <div className="text-center text-sm text-slate-500">No groups found</div>
                  ) : (
                    availableGroups.map((group) => (
                      <label
                        key={group.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroups.includes(group.id)}
                          onChange={() => toggleGroupSelection(group.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-slate-900 font-medium">{group.name}</span>
                      </label>
                    ))
                  )}
                </div>
                <div className="flex gap-3 mt-6">
                  <Button
                    onClick={handleShareBot}
                    disabled={isSharing}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  >
                    {isSharing ? "Sharing..." : "Share"}
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedGroups([]);
                      setShowGroupModal(false);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
  );
}
