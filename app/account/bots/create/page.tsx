"use client";

import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import {
  ArrowLeft,
  Upload,
  Link as LinkIcon,
  Send,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Group {
  id: string;
  name: string;
}

export default function BotCreate() {
  const [model, setModel] = useState("gemini");
  const [botName, setBotName] = useState("");
  const [knowledgeSource, setKnowledgeSource] = useState<"url" | "file" | null>(null);
  const [knowledgeUrl, setKnowledgeUrl] = useState("");
  const [knowledgeText, setKnowledgeText] = useState(""); // NEW: extracted text
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [botCreated, setBotCreated] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [responseAdjustment, setResponseAdjustment] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const packageType = typeof window !== "undefined" ? localStorage.getItem("packageType") || "individual" : "individual";
  const router = useRouter();

  // Mock groups
  const [availableGroups] = useState<Group[]>([
    { id: "1", name: "Sales Team" },
    { id: "2", name: "Support Team" },
    { id: "3", name: "Marketing Team" },
  ]);

  // ----------------------------
  // (unchanged) extractor & callGenerateAPI_clean
  // ----------------------------
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
        if (cand?.content?.parts && Array.isArray(cand.content.parts) && typeof cand.content.parts[0]?.text === "string") {
          return cand.content.parts[0].text;
        }
        if (Array.isArray(cand.content)) {
          for (const c of cand.content) {
            if (typeof c?.text === "string") return c.text;
            if (Array.isArray(c?.parts) && typeof c.parts[0]?.text === "string") return c.parts[0].text;
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
            if (Array.isArray(c?.parts) && typeof c.parts[0]?.text === "string") return c.parts[0].text;
          }
        }
        if (out0.content?.parts && Array.isArray(out0.content.parts) && typeof out0.content.parts[0]?.text === "string") {
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
        if (typeof obj.text === "string" && obj.text.trim().length > 0) return obj.text;
        if (Array.isArray(obj.parts) && obj.parts.length > 0 && typeof obj.parts[0]?.text === "string") return obj.parts[0].text;
        if (Array.isArray(obj.content)) {
          for (const el of obj.content) {
            const f = deepFindText(el);
            if (f) return f;
          }
        }
        for (const key of Object.keys(obj)) {
          try {
            const val = obj[key];
            if (typeof val === "string" && key.toLowerCase().includes("text") && val.trim().length > 0) return val;
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

  async function callGenerateAPI_clean(prompt: string): Promise<{ output: string; raw: any }> {
    const payload = {
      prompt,
      model: model === "gemini" ? "gemini-2.5-flash" : model,
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
      const errMsg = json?.error ? (typeof json.error === "string" ? json.error : JSON.stringify(json.error)) : `HTTP ${res.status}`;
      throw new Error(errMsg);
    }

    if (typeof json === "object" && typeof json.output === "string") {
      console.debug("callGenerateAPI_clean - wrapper output present, raw:", json.raw ?? json);
      return { output: json.output, raw: json.raw ?? json };
    }

    console.debug("callGenerateAPI_clean - raw response:", json);
    const rawCandidate = (typeof json === "object" && json.raw) ? json.raw : json;
    const output = extractTextFromApiResponse(rawCandidate);
    return { output, raw: rawCandidate };
  }

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

  // ----------------------------
  // Create bot
  // ----------------------------
  const handleCreateBot = async () => {
    if (!botName.trim()) {
      alert("Please enter bot name");
      return;
    }

    let finalKnowledgeText = knowledgeText;

    try {
      if (knowledgeSource === "url" && knowledgeUrl) {
        finalKnowledgeText = await readWebsite(knowledgeUrl);
        setKnowledgeText(finalKnowledgeText);
      }
    } catch (err: any) {
      alert("Failed to read website: " + err.message);
      return;
    }

    const storedBotsRaw = localStorage.getItem("bots");
    const bots = storedBotsRaw ? JSON.parse(storedBotsRaw) : [];

    const newBot = {
      id: String(bots.length + 1),
      name: botName,
      model,
      knowledgeUrl,
      knowledgeText: finalKnowledgeText,
      createdAt: new Date().toISOString(),
    };

    bots.push(newBot);
    localStorage.setItem("bots", JSON.stringify(bots));

    setBotCreated(true);
  };


  // ----------------------------
  // Send test message
  // - Now: if responseAdjustment exists, we inject it into prompt as an instruction
  // ----------------------------
  const handleSendMessage = async () => {
    if (!testMessage.trim()) return;

    setChatMessages((prev) => [...prev, { role: "user", content: testMessage }]);
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
      parts.push("Please answer the user's ques tion following the instructions above and using the provided document when relevant. If the document does not contain the answer, say you don't know.");

      const combinedPrompt = parts.join("\n\n");

      const { output, raw } = await callGenerateAPI_clean(combinedPrompt);

      console.log("=== GEMINI RAW RESPONSE ===");
      console.log(raw);

      // Extract best assistant text robustly
      const assistantText = extractTextFromApiResponse(raw) || "No response";

      setChatMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      setLastError(msg);
      setChatMessages((prev) => [...prev, { role: "assistant", content: `Error: ${msg}` }]);
    } finally {
      setSending(false);
    }
  };

  const handleFinishCreation = () => {
    router.push("/account/bots");
  };

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroups((prev) => prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]);
  };

  // ----------------------------
  // UPLOAD helpers (client)
  // ----------------------------
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function uploadFileToServer(file: File): Promise<{ url: string; text: string }> {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: fd,
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `Upload failed (${res.status})`);

    // json: { url: "/uploads/..", text: "extracted text" }
    return json;
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setSending(true);
      const resp = await uploadFileToServer(f);
      const absolute = window.location.origin + resp.url;
      setKnowledgeUrl(absolute);
      setKnowledgeText(resp.text || "");
      setKnowledgeSource("file");
    } catch (err: any) {
      console.error("Upload error", err);
      alert("Upload failed: " + (err?.message ?? err));
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* hidden file input */}
        <input ref={fileInputRef} type="file" accept=".pdf,.txt,.docx" onChange={handleFileChange} style={{ display: "none" }} />

        {/* header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/account/bots"><button className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button></Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{botCreated ? "Test Bot" : "Create New Bot"}</h1>
            <p className="text-slate-600">{botCreated ? "Chat with your bot to test responses" : "Configure your AI-powered chatbot"}</p>
          </div>
        </div>

        {!botCreated ? (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-slate-200 p-6 sticky top-24">
                <h2 className="text-lg font-bold text-slate-900 mb-4">AI Model</h2>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input type="radio" name="model" value="gpt4" checked={model === "gpt4"} onChange={(e) => setModel(e.target.value)} />
                    <div><div className="font-semibold text-slate-900">GPT-4</div><div className="text-xs text-slate-600">Most advanced</div></div>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input type="radio" name="model" value="claude3" checked={model === "claude3"} onChange={(e) => setModel(e.target.value)} />
                    <div><div className="font-semibold text-slate-900">Claude 3</div><div className="text-xs text-slate-600">Balanced & fast</div></div>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input type="radio" name="model" value="gemini" checked={model === "gemini"} onChange={(e) => setModel(e.target.value)} />
                    <div><div className="font-semibold text-slate-900">Gemini</div><div className="text-xs text-slate-600">Cost effective</div></div>
                  </label>
                </div>
                {packageType === "business" && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-4">Share with Groups</h3>
                    <Button onClick={() => setShowGroupModal(true)} variant="outline" className="w-full"><Share2 className="w-4 h-4 mr-2" />Select Groups ({selectedGroups.length})</Button>
                  </div>
                )}
              </div>
            </div>

            {/* Right */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-6">Bot Configuration</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">Bot Name *</label>
                    <input type="text" value={botName} onChange={(e) => setBotName(e.target.value)} placeholder="e.g., Customer Support Bot" className="w-full px-4 py-3 rounded-lg border border-slate-300" />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-slate-900 mb-4">Knowledge Base</h3>
                    <div className="space-y-3">
                      <button onClick={() => setKnowledgeSource(knowledgeSource === "url" ? null : "url")} className={`w-full p-4 rounded-lg border-2 text-left ${knowledgeSource === "url" ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-blue-300"}`}>
                        <div className="flex items-center gap-3 mb-2"><LinkIcon className="w-5 h-5 text-blue-600" /><span className="font-semibold">Add Website Link</span></div>
                        <p className="text-sm text-slate-600">Train bot with website content</p>
                      </button>

                      {knowledgeSource === "url" && (
                        <input type="url" value={knowledgeUrl} onChange={(e) => setKnowledgeUrl(e.target.value)} placeholder="https://example.com" className="w-full px-4 py-3 rounded-lg border border-slate-300" />
                      )}

                      <button onClick={handleUploadClick} className={`w-full p-4 rounded-lg border-2 text-left ${knowledgeSource === "file" ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-blue-300"}`}>
                        <div className="flex items-center gap-3 mb-2"><Upload className="w-5 h-5 text-blue-600" /><span className="font-semibold">Upload File</span></div>
                        <p className="text-sm text-slate-600">PDF, TXT or DOCX files</p>
                      </button>

                      {knowledgeUrl && <div className="text-sm text-green-700">Uploaded: {knowledgeUrl}</div>}
                      {knowledgeText && <div className="mt-2 p-3 bg-slate-50 rounded text-sm whitespace-pre-wrap max-h-40 overflow-auto">{knowledgeText.slice(0, 1000)}{knowledgeText.length > 1000 ? "…(truncated)" : ""}</div>}
                    </div>
                  </div>

                  <Button onClick={handleCreateBot} disabled={!botName.trim()} className="w-full bg-gradient-to-r from-blue-600 to-blue-700">Create Bot</Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // testing UI (kept same)
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-slate-200 flex flex-col h-96 mb-6">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center">
                      <div><p className="text-slate-500 mb-2">No messages yet</p><p className="text-sm text-slate-400">Start chatting with your bot below</p></div>
                    </div>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-xs px-4 py-2 rounded-lg ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-900"}`}>{msg.content}</div>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t border-slate-200 p-4 flex gap-2">
                  <input type="text" value={testMessage} onChange={(e) => setTestMessage(e.target.value)} placeholder="Test your bot..." className="flex-1 px-4 py-2 rounded-lg border border-slate-300" onKeyPress={(e) => e.key === "Enter" && handleSendMessage()} />
                  <Button onClick={handleSendMessage} className="bg-blue-600"><Send className="w-4 h-4" /></Button>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="font-bold mb-4">Adjust Bot Response</h3>
                <textarea value={responseAdjustment} onChange={(e) => setResponseAdjustment(e.target.value)} rows={4} className="w-full border rounded-lg p-3" />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6 sticky top-24 h-fit">
              <h3 className="font-bold mb-4">Bot Info</h3>
              <p><b>Name:</b> {botName}</p>
              <p><b>Model:</b> {model}</p>
              <p><b>Status:</b> Active</p>
              {knowledgeUrl && <p className="mt-3 text-xs text-slate-600">Knowledge: {knowledgeUrl}</p>}
              <Button className="w-full mt-6 bg-blue-600 text-white" onClick={() => router.push("/account/bots")}>Save & Finish</Button>
              <Button className="w-full mt-3" variant="outline" onClick={() => setBotCreated(false)}>Back</Button>
            </div>
          </div>
        )}

        {showGroupModal && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg max-w-md w-full">
              <h3 className="text-lg font-bold mb-4">Select Groups</h3>
              <div className="space-y-3">
                {availableGroups.map((g) => (
                  <label key={g.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={selectedGroups.includes(g.id)} onChange={() => toggleGroupSelection(g.id)} />
                    {g.name}
                  </label>
                ))}
              </div>
              <Button className="w-full mt-4 bg-blue-600 text-white" onClick={() => setShowGroupModal(false)}>Done</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
