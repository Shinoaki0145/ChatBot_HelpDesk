"use client";

import { Button } from "@/components/ui/button";
import { Plus, Bot, Edit2, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/app";
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

  useEffect(() => {
    if (authLoading) {
      return;
    }

    async function loadBots() {
      try {
        setLoading(true);
        const allBotConfigDocs: any[] = [];

        // 1. Get public bots (owner = 0)
        const publicBotsQuery = query(
          collection(db, "botConfigAgent"),
          where("owner", "==", 0)
        );
        const publicBotsSnapshot = await getDocs(publicBotsQuery);
        allBotConfigDocs.push(...publicBotsSnapshot.docs);

        // 2. Get user's own bots (owner = userId)
        if (userId) {
          const myBotsQuery = query(
            collection(db, "botConfigAgent"),
            where("owner", "==", parseInt(userId))
          );
          const myBotsSnapshot = await getDocs(myBotsQuery);
          allBotConfigDocs.push(...myBotsSnapshot.docs);
        }

        // 3. Get shared bots via groups (email in sharedMembersEmail)
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

        // Convert to BotItem format
        const botsList: BotItem[] = allBotConfigDocs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            botID: data.botID,
            name: data.botName || "Unnamed Bot",
            model: data.typeModel || "GPT-4",
            createdAt: data.createdAt ? new Date(data.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit"
            }) : "N/A",
            active: data.active ?? true,
          };
        });

        setBots(botsList);
      } catch (error) {
        console.error("Error loading bots:", error);
      } finally {
        setLoading(false);
      }
    }

    loadBots();
  }, [userId, email, authLoading]);

  const handleToggleStatus = async (botDocId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      const botRef = doc(db, "botConfigAgent", botDocId);
      await updateDoc(botRef, {
        active: newStatus
      });

      // Update local state
      setBots(bots.map(bot => 
        bot.id === botDocId ? { ...bot, active: newStatus } : bot
      ));
    } catch (error) {
      console.error("Error updating bot status:", error);
      alert("Failed to update bot status");
    }
  };

  const handleDeleteBot = (id: string) => {
    // TODO: Implement Firebase delete
    const updatedBots = bots.filter((bot) => bot.id !== id);
    setBots(updatedBots);
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
                    <Link href={`/account/bots/${bot.id}`} className="flex-1">
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
