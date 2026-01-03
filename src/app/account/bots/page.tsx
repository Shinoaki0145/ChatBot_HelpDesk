"use client";

import { Button } from "@/components/ui/button";
import { Plus, Bot, Edit2, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/app/account/AuthContext";

interface BotItem {
  id: string;
  botID: number;
  name: string;
  model: string;
  createdAt: string;
  active: boolean;
}

export default function Bots() {
  const { userId, email, isLoading: authLoading } = useAuth();
  const [bots, setBots] = useState<BotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    async function loadBots() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/bot/list');
        
        if (!response.ok) {
          throw new Error('Failed to fetch bots');
        }

        const data = await response.json();

        // Only show bots that user OWNS (not shared bots)
        const botsList: BotItem[] = data.ownedBots.map((bot: any) => ({
          id: bot.id,
          botID: bot.botID,
          name: bot.name,
          model: bot.model,
          createdAt: bot.createdAt ? new Date(bot.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
          }) : "N/A",
          active: bot.active ?? true,
        }));

        setBots(botsList);
      } catch (error: any) {
        console.error("Error loading bots:", error);
        setError(error.message || "Failed to load bots");
      } finally {
        setLoading(false);
      }
    }

    loadBots();
  }, [userId, email, authLoading]);

  const handleToggleStatus = async (botDocId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      
      const response = await fetch(`/api/bot/${botDocId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update bot status');
      }

      setBots(bots.map(bot => 
        bot.id === botDocId ? { ...bot, active: newStatus } : bot
      ));
    } catch (error: any) {
      console.error("Error updating bot status:", error);
      alert(error.message || "Failed to update bot status");
    }
  };

  const handleDeleteBot = async (id: string) => {
    try {
      // Call API to delete bot
      const response = await fetch(`/api/bot/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete bot');
      }

      setBots(bots.filter((bot) => bot.id !== id));
    } catch (error: any) {
      console.error("Error deleting bot:", error);
      alert(error.message || "Failed to delete bot");
    }
  };

  return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Bot</h1>
              <p className="text-slate-600">
                Build and manage your AI-powered chatbots
              </p>
            </div>
            <Link href="/account/bots/create">
              <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                <Plus className="w-4 h-4 mr-2" />
                Create New Bot
              </Button>
            </Link>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Bots Grid */}
          {loading ? (
            <div className="text-center py-16">
              <p className="text-slate-500">Loading bots...</p>
            </div>
          ) : bots.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bots.map((bot) => (
                <div
                  key={bot.id}
                  className="bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                      <Bot className="w-6 h-6 text-blue-600" />
                    </div>
                    <button
                      onClick={() => handleToggleStatus(bot.id, bot.active)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all hover:opacity-80 ${
                        bot.active
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-red-100 text-red-700 hover:bg-red-200"
                      }`}
                      title={`Click to ${bot.active ? 'deactivate' : 'activate'}`}
                    >
                      {bot.active ? "Active" : "Inactive"}
                    </button>
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    {bot.name}
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">Model: {bot.model}</p>
                  <p className="text-xs text-slate-500 mb-6">
                    Created {bot.createdAt}
                  </p>

                  <div className="flex gap-2">
                    <Link href={`/account/bots/${bot.botID}`} className="flex-1">
                      <Button
                        variant="outline"
                        className="w-full"
                        size="sm"
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </Link>
                    <button
                      title="Delete Bot"
                      onClick={() => handleDeleteBot(bot.id)}
                      className="p-2 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Bot className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                No bots yet
              </h2>
              <p className="text-slate-600 mb-6">
                Create your first bot to get started
              </p>
              <Link href="/account/bots/create">
                <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                  Create Your First Bot
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
  );
}
