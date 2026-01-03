"use client";

import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface Bot {
  id: string;
  name: string;
  status: "active" | "inactive";
}

export default function Embed() {
  const [selectedBot, setSelectedBot] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const bots: Bot[] = [
    { id: "1", name: "Customer Support Bot", status: "active" },
    { id: "2", name: "Sales Assistant", status: "active" },
  ];

  const embedCode = selectedBot
    ? `<div id="botforge-widget" data-bot-id="${selectedBot}"></div>
<script src="https://botforge.io/embed.js"></script>`
    : "";

  const handleCopyCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Embed Bot
          </h1>
          <p className="text-slate-600 mb-8">
            Select a bot and embed it on your website
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Bot Selection */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                Select Bot
              </h2>
              <div className="space-y-3">
                {bots.map((bot) => (
                  <button
                    key={bot.id}
                    onClick={() => setSelectedBot(bot.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedBot === bot.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-300 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {bot.name}
                        </h3>
                        <p className="text-sm text-slate-600 capitalize">
                          {bot.status}
                        </p>
                      </div>
                      <div
                        className={`w-4 h-4 rounded border-2 transition-colors ${
                          selectedBot === bot.id
                            ? "bg-blue-600 border-blue-600"
                            : "border-slate-300"
                        }`}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Embed Code */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                Embed Code
              </h2>
              {selectedBot ? (
                <div className="bg-slate-900 rounded-lg p-4 text-slate-100 font-mono text-sm overflow-x-auto mb-4">
                  <pre>{embedCode}</pre>
                </div>
              ) : (
                <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-8 text-center text-slate-500">
                  <p>Select a bot to see the embed code</p>
                </div>
              )}
              {selectedBot && (
                <Button
                  onClick={handleCopyCode}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Code
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Instructions */}
          {selectedBot && (
            <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Installation Instructions
              </h3>
              <ol className="space-y-3 text-slate-700">
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600 flex-shrink-0">
                    1.
                  </span>
                  <span>Copy the embed code above</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600 flex-shrink-0">
                    2.
                  </span>
                  <span>Paste it into your website's HTML, usually before the closing &lt;/body&gt; tag</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600 flex-shrink-0">
                    3.
                  </span>
                  <span>The bot widget will automatically appear on your website</span>
                </li>
              </ol>
            </div>
          )}
        </div>
      </div>
  );
}
