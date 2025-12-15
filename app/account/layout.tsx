'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Zap, Menu, X, LogOut, LayoutGrid, Users, Headphones, MessageSquare, Code2, CreditCard } from "lucide-react";
import { useAuth, AuthProvider } from "./AuthContext";
import { toast } from "@/lib/hooks/use-toast";

const sidebarItems = [
  { icon: LayoutGrid, label: "Create Bot", path: "/account/bots", id: "bots" },
  { icon: Users, label: "Groups", path: "/account/groups", id: "groups" },
  { icon: Headphones, label: "Helpdesk", path: "/account/helpdesk", id: "helpdesk" },
  { icon: MessageSquare, label: "Chat", path: "/account/chat", id: "chat" },
  { icon: Code2, label: "Embed Bot", path: "/account/embed", id: "embed" },
  { icon: CreditCard, label: "Subscription", path: "/account/subscription", id: "subscription" },
];

function AccountContent({ children }: { children: React.ReactNode })  {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const {
    email,
    packageType,
    isLoading,
    isAuth
  } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuth) {
      router.replace("/");
    }
  }, [isLoading, isAuth, router]);

  const handleLogout = async function() {
    try {
      const response = await fetch("/api/logout",{
        method: "DELETE",
      })
      if (response.ok) {
        router.push("/");
      }
      else {
        toast({
          title: "Logout Error",
          description: "Unknow error during logout",
        });
      }
    } catch (error) {
      toast({
        title: "Logout Error",
        description: "Unknow error during logout",
      });
    }
  };
  
  if (isLoading) {
    return (
        <div className="flex justify-center items-center min-h-screen">
            <p className="text-lg text-slate-500">Checking authorization...</p>
        </div>
    );
  }

  if (!isAuth) {
    return null;
  }

  // Hide groups for individual plans
  const visibleItems = packageType === "individual"
    ? sidebarItems.filter(item => item.id !== "groups")
    : sidebarItems;

  return (
    <div className="min-h-screen bg-slate-50">
        {/* Top Navigation */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <Link href="/account/bots" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg text-slate-900 hidden sm:inline">Chatbot Helpdesk</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900">{email}</p>
                <p className="text-xs text-slate-600 capitalize">{packageType} Plan</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-slate-100 rounded-lg"
                title="Logout"
              >
                <LogOut className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div
            className={`fixed z-40 w-64 h-[calc(100vh-64px)] bg-white border-r border-slate-200 overflow-y-auto transition-transform ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <nav className="p-4 space-y-2">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-600"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className={`flex-1 w-full transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}>
            {children}
          </div>
        </div>
    </div>
  );
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AccountContent>{children}</AccountContent>
    </AuthProvider>
  );
}
