"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated" && pathname !== "/login") {
      router.push("/login");
    }
  }, [status, pathname, router]);

  if (status === "loading") {
    return (
      <div className="h-screen flex items-center justify-center bg-paper">
        <div className="text-center">
          <h1 className="font-brand text-4xl text-ink">só</h1>
          <p className="text-muted text-sm mt-2">Carregando...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" && pathname !== "/login") {
    return null;
  }

  const handleLogout = () => signOut({ callbackUrl: "/login" });

  return (
    <div className="h-screen flex overflow-hidden bg-paper">
      <OfflineBanner />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={session?.user} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <div className="p-4 lg:p-6 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
