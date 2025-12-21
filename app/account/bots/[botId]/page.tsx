"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Upload,
  Link as LinkIcon,
  Send,
  Share2,
  Save,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { toast } from "@/lib/hooks/use-toast";
import { readDriveFile, getFileIdFromUrl } from "@/lib/drive-helpers";
import Markdown from 'marked-react';
interface Group {
  id: string;
  name: string;
  sharedBotID?: number[];
}

export default function BotView() {
  const { botId } = useParams();
  const router = useRouter();
  const [botName, setBotName] = useState("");
  const [model, setModel] = useState("gemini-pro-2.5");
  const [knowledgeSource, setKnowledgeSource] = useState<"url" | "file" | null>(
    null
  );
  const [knowledgeUrl, setKnowledgeUrl] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [testMessage, setTestMessage] = useState("");
  const [responseAdjustment, setResponseAdjustment] = useState("");
  const [adjustArray, setAdjustArray] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const packageType = localStorage.getItem("packageType") || "business";

  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState<boolean>(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [knowledgeText, setKnowledgeText] = useState<string>("");

  const [active, setActive] = useState<boolean>(true);
  const [createdAt, setCreatedAt] = useState<string>("");
  const [ownerId, setOwnerId] = useState<number | null>(null);

  const [uploadedFile, setUploadedFile] = useState<{
    provider: "drive";
    url: string;
    mimeType: string;
  } | null>(null);

  const [uploading, setUploading] = useState(false);

  const [knowledgeWebsite, setKnowledgeWebsite] = useState<string>("");
  const [knowledgeFile, setKnowledgeFile] = useState<string>("");
  const [loadingBot, setLoadingBot] = useState(false);

  useEffect(() => {
    const fetchGroups = async () => {
      setGroupsLoading(true);
      setGroupsError(null);
      try {
        const res = await fetch("/api/group");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.message || "Failed to fetch groups");
        }
        const data = await res.json();
        const mapGroup = (g: any): Group => ({
          id: String(g.groupID ?? g.id),
          name: g.groupName ?? g.name ?? "Unnamed group",
          sharedBotID: Array.isArray(g.sharedBotID) ? g.sharedBotID : [],
        });

        const owned: Group[] =
          data?.ownedGroups?.map(mapGroup) ?? data?.groups?.map(mapGroup) ?? [];
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
        setGroupsError(err?.message || "Failed to fetch groups");
        toast({
          title: "Failed to load groups",
          description: err?.message || "Check your network",
        });
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

  const handleSaveBot =  async () => {
    try{
      const res = await fetch(`/api/bot/${botId}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botName: botName.trim(),
          typeModel: model,
          uploadFile: (knowledgeFile ? knowledgeFile : "") + (uploadedFile ? "," + uploadedFile.url : ""),
          websiteLink: (knowledgeWebsite ? knowledgeWebsite : "") + (knowledgeUrl ? "," + knowledgeUrl : ""),
          adjustBotResponses: adjustArray.concat(responseAdjustment.trim()
          ? [{ question: "", answer: responseAdjustment.trim() }]
          : []),
        }),
      });
      if (!res.ok) {
        toast ({
          title: "Failed to save bot",
          description: "Please try again later.",
        });
      }
      else {
        router.push(`/account/bots`);
      }
    }
    catch(err){
      console.error("Error saving bot:", err);
    }
  };

  async function readWebsite(url: string): Promise<string> {
    const res = await fetch("/api/read-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error);

    return json.text;
  }

  const loadBot = async () => {
    if (botId) {
      try {
        setLoadingBot(true);  
        const res = await fetch(`/api/bot/${botId}`);
        if (!res.ok) {
          throw new Error("Failed to load bot data");
        }
        const data = await res.json();
        setBotName(data.botName || "");
        setModel(data.typeModel || "gemini-pro-2.5");
        setActive(data.active ?? true);
        setCreatedAt(
          data.createdAt
            ? new Date(data.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })
            : "N/A"
        );
        setOwnerId(typeof data.owner === "number" ? data.owner : null);
        setKnowledgeWebsite(data.websiteLink || "");
        setKnowledgeFile(data.uploadFile || "");

        let texts = "";
        if (data.uploadFile && data.uploadFile.trim().length > 0) {
        const knowledgeFiles = data.uploadFile.split(",").map((url: string) => url.trim());
          for (const url of knowledgeFiles) {
            if (!url || url.length === 0) continue;
            let fileId = getFileIdFromUrl(url);
            const text = await readDriveFile(fileId);
            texts += text + "\n";
          }
        }

        if (data.websiteLink && data.websiteLink.trim().length > 0) {
          const knowledgeURLs = data.websiteLink.split(",").map((url: string) => url.trim());
          for (const url of knowledgeURLs) {
            if (!url || url.length === 0) continue;
            const text = await readWebsite(url);
            texts += text + "\n";
          }
        }
        setKnowledgeText(texts);
        setAdjustArray(
          Array.isArray(data.adjustBotResponses) ? data.adjustBotResponses : []
        );
        // Load knowledge base text if available
      } catch (error: any) {
        console.error("Error loading bot data:", error);
        toast({ title: "Error", description: "Failed to load bot data" });
      }
      finally {    setLoadingBot(false);  }
    }
  };

  useEffect(() => {
    loadBot();
  }, []);

  function extractTextFromApiResponse(rawAny: any): string {
    if (!rawAny) return "";

    if (typeof rawAny === "object" && typeof rawAny.output === "string") {
      return rawAny.output;
    }

    let raw = rawAny;
    if (typeof rawAny === "object" && rawAny.raw) {
      raw = rawAny.raw;
    }

    if (typeof raw === "string") return raw;
    if (typeof raw.text === "string") return raw.text;
    if (typeof raw.response === "string") return raw.response;

    try {
      if (Array.isArray(raw.candidates) && raw.candidates.length > 0) {
        const cand = raw.candidates[0];
        if (
          cand?.content?.parts &&
          Array.isArray(cand.content.parts) &&
          typeof cand.content.parts[0]?.text === "string"
        ) {
          return cand.content.parts[0].text;
        }
        if (Array.isArray(cand.content)) {
          for (const c of cand.content) {
            if (typeof c?.text === "string") return c.text;
            if (Array.isArray(c?.parts) && typeof c.parts[0]?.text === "string")
              return c.parts[0].text;
          }
        }
        if (typeof cand.text === "string") return cand.text;
      }
    } catch (e) {}

    try {
      if (Array.isArray(raw.outputs) && raw.outputs.length > 0) {
        const out0 = raw.outputs[0];
        if (Array.isArray(out0.content) && out0.content.length > 0) {
          for (const c of out0.content) {
            if (typeof c?.text === "string") return c.text;
            if (Array.isArray(c?.parts) && typeof c.parts[0]?.text === "string")
              return c.parts[0].text;
          }
        }
        if (
          out0.content?.parts &&
          Array.isArray(out0.content.parts) &&
          typeof out0.content.parts[0]?.text === "string"
        ) {
          return out0.content.parts[0].text;
        }
      }
    } catch (e) {}

    try {
      const seen = new Set<any>();
      function deepFindText(obj: any): string | null {
        if (!obj || typeof obj !== "object") return null;
        if (seen.has(obj)) return null;
        seen.add(obj);
        if (typeof obj.text === "string" && obj.text.trim().length > 0)
          return obj.text;
        if (
          Array.isArray(obj.parts) &&
          obj.parts.length > 0 &&
          typeof obj.parts[0]?.text === "string"
        )
          return obj.parts[0].text;
        if (Array.isArray(obj.content)) {
          for (const el of obj.content) {
            const f = deepFindText(el);
            if (f) return f;
          }
        }
        for (const key of Object.keys(obj)) {
          try {
            const val = obj[key];
            if (
              typeof val === "string" &&
              key.toLowerCase().includes("text") &&
              val.trim().length > 0
            )
              return val;
            if (typeof val === "object") {
              const f = deepFindText(val);
              if (f) return f;
            }
            if (Array.isArray(val)) {
              for (const el of val) {
                const f = deepFindText(el);
                if (f) return f;
              }
            }
          } catch (e) {}
        }
        return null;
      }

      const found = deepFindText(raw);
      if (found) return found;
    } catch (e) {}

    try {
      return JSON.stringify(raw);
    } catch {
      return String(raw);
    }
  }

  async function callGenerateAPI_clean(
    prompt: string
  ): Promise<{ output: string; raw: any }> {
    const payload = {
      prompt,
      model: model,
      maxOutputTokens: 500,
      temperature: 0.2,
    };

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      const errMsg = json?.error
        ? typeof json.error === "string"
          ? json.error
          : JSON.stringify(json.error)
        : `HTTP ${res.status}`;
      throw new Error(errMsg);
    }

    if (typeof json === "object" && typeof json.output === "string") {
      console.debug(
        "callGenerateAPI_clean - wrapper output present, raw:",
        json.raw ?? json
      );
      return { output: json.output, raw: json.raw ?? json };
    }

    console.debug("callGenerateAPI_clean - raw response:", json);
    const rawCandidate = typeof json === "object" && json.raw ? json.raw : json;
    const output = extractTextFromApiResponse(rawCandidate);
    return { output, raw: rawCandidate };
  }

  const handleSendMessage = async () => {
    if (!testMessage.trim()) return;

    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: testMessage },
    ]);
    const userText = testMessage;
    setTestMessage("");

    setSending(true);
    setLastError(null);

    try {
      // Build combined prompt
      // Start with any adjustment instruction (if provided)
      const parts: string[] = [];

      if (responseAdjustment && responseAdjustment.trim()) {
        // Treat adjustment as an instruction for how to respond to the user's question.
        // Keep it explicit so model treats it as constraint.
        parts.push("Instruction for answering:");
        parts.push(responseAdjustment.trim());
        parts.push(""); // spacer
      }

      // If there is knowledge/documentation, include it (guarded)
      if (knowledgeText && knowledgeText.trim().length > 0) {
        parts.push("--- Begin provided document ---");
        parts.push(knowledgeText.slice(0, 80000)); // slice to avoid giant prompts; tune as needed
        parts.push("--- End provided document ---");
        parts.push("");
      }

      // Add the user question
      parts.push(`User question: ${userText}`);

      // Final instruction: prefer in-document answers, else respond accordingly
      parts.push(`
      FORMATTING RULES:
      - Use strict GitHub Flavored Markdown (GFM).
      - TABLES: Always include the separator row (e.g., |---|---|). Every row must start and end with a pipe (|).
      - LISTS: Use a single space after the bullet (e.g., "- Item" not "-Item"). 
      - HEADERS: Always put a space after the '#' (e.g., "## Section" not "##Section").
      - CODE: Always use triple backticks with the language name for code blocks.
      - SPACING: Always include a blank line before and after tables, lists, and code blocks.
      `);
      parts.push(
        "Please answer the user's question following the instructions above and using the provided document when relevant. If the document does not contain the answer, say you don't know."
      );

      const combinedPrompt = parts.join("\n\n");

      const { raw } = await callGenerateAPI_clean(combinedPrompt);

      // Extract best assistant text robustly
      const assistantText = extractTextFromApiResponse(raw) || "No response";

      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantText },
      ]);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      setLastError(msg);
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${msg}` },
      ]);
    } finally {
      setSending(false);
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
      toast({
        title: "Bot ID missing",
        description: "Unable to share without bot ID",
      });
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
        toast({
          title: "Failed to update groups",
          description: data?.message || "Server error",
        });
        return;
      }

      toast({
        title: "Shared successfully",
        description: data?.message || "Bot sharing updated",
      });
      setShowGroupModal(false);
    } catch (error) {
      console.error("Error sharing bot:", error);
      toast({ title: "Error", description: "Network or server error" });
    } finally {
      setIsSharing(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      toast({
        title: "File uploaded successfully",
      });
      const data = await res.json();
      const text = await readDriveFile(data.fileId);

      setKnowledgeText(text + "\n" + knowledgeText);
      setKnowledgeSource("file");
      setKnowledgeUrl(""); // clear URL
      setUploadedFile({
        provider: "drive",
        url: data.link,
        mimeType: data.mimeType,
      });
    } catch (err) {
      alert("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleURLChange = async () => {
    try {
      const text = await readWebsite(knowledgeUrl);
      setKnowledgeText(text + "\n" + knowledgeText);
      setKnowledgeSource("url");
      setUploadedFile(null); // clear uploaded file
    } catch (err) {
      toast({
        title: "Failed to read URL",  
    } );
    }
  };

  return (
    <div className="p-8">
      {/* hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.docx"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {/* header */}
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/account/bots">
            <button className="p-2 hover:bg-slate-100 rounded-lg">
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
                    <div className="bg-white rounded-lg border border-slate-200 p-6 sticky top-24">
                      <h2 className="text-lg font-bold text-slate-900 mb-4">
                        AI Model
                      </h2>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                          <input
                            type="radio"
                            name="model"
                            value="gemini-2.5-pro"
                            checked={model === "gemini-2.5-pro"}
                            onChange={(e) => setModel(e.target.value)}
                          />
                          <div>
                            <div className="font-semibold text-slate-900">
                              Gemini 2.5 Pro
                            </div>
                            <div className="text-xs text-slate-600">
                              Highest intelligence for complex tasks
                            </div>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                          <input
                            type="radio"
                            name="model"
                            value="gemini-2.5-flash"
                            checked={model === "gemini-2.5-flash"}
                            onChange={(e) => setModel(e.target.value)}
                          />
                          <div>
                            <div className="font-semibold text-slate-900">
                              Gemini 2.5 Flash
                            </div>
                            <div className="text-xs text-slate-600">
                              Mid-size, fast, and balanced
                            </div>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                          <input
                            type="radio"
                            name="model"
                            value="gemini-2.0-flash"
                            checked={model === "gemini-2.0-flash"}
                            onChange={(e) => setModel(e.target.value)}
                          />
                          <div>
                            <div className="font-semibold text-slate-900">
                              Gemini 2.0 Flash
                            </div>
                            <div className="text-xs text-slate-600">
                              Fastest stable version
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  disabled={uploading}
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
                          const group = availableGroups.find(
                            (g) => g.id === groupId
                          );
                          return (
                            <div
                              key={groupId}
                              className="flex items-center justify-between bg-blue-50 p-2 rounded text-sm"
                            >
                              <span className="text-blue-700">
                                {group?.name}
                              </span>
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
                    setKnowledgeSource(knowledgeSource === "url" ? null : "url")
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

                {knowledgeSource === "url" && !loadingBot && (
                  <input
                    type="url"
                    value={knowledgeUrl}
                    onChange={(e) => setKnowledgeUrl(e.target.value)}
                    onBlur={ () => {
                      handleURLChange();
                    }}
                    placeholder="https://example.com"
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                )}

                <button
                  disabled={uploading}
                  onClick={handleUploadClick}
                  className={`w-full p-4 rounded-lg border-2 text-left ${
                    knowledgeSource === "file"
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-300 hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Upload className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold">Upload File</span>
                  </div>
                  <p className="text-sm text-slate-600">
                    PDF, TXT or DOCX files
                  </p>
                </button>

                {uploading && (
                  <div className="text-xs text-blue-600 animate-pulse flex items-center gap-2 px-1">
                    <span>Reading and parsing document content...</span>
                  </div>
                )}
                {knowledgeUrl && <div className="text-sm text-green-700">Uploaded: {knowledgeUrl}</div>}
                {knowledgeText && <div className="mt-2 p-3 bg-slate-50 rounded text-sm whitespace-pre-wrap max-h-40 overflow-auto">{knowledgeText}</div>}
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
                        {msg.role === "user" ? msg.content :
                        (
                          <div className="prose prose-sm max-w-none prose-slate">
                            <Markdown value={msg.content} gfm={true}/>
                          </div>
                        )}
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
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
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
                Customize responses to fine-tune how your bot answers user
                messages.
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
                  <div className="text-center text-sm text-slate-500">
                    Loading groups...
                  </div>
                ) : groupsError ? (
                  <div className="text-center text-sm text-red-600">
                    {groupsError}
                  </div>
                ) : availableGroups.length === 0 ? (
                  <div className="text-center text-sm text-slate-500">
                    No groups found
                  </div>
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
                      <span className="text-slate-900 font-medium">
                        {group.name}
                      </span>
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
