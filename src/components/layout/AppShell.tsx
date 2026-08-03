"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { emitDataRefresh } from "@/lib/refresh-events";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (status === "unauthenticated" && pathname !== "/login") {
      router.push("/login");
    }
  }, [status, pathname, router]);

  if (status === "loading") {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-ink">só</h1>
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
    <div className="h-screen flex overflow-hidden">
      <OfflineBanner />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="relative flex-1 min-h-0">
          <main
            ref={mainRef}
            className="h-full overflow-y-auto overscroll-contain pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0"
          >
            <PullToRefresh scrollRef={mainRef} onRefresh={emitDataRefresh}>
              <div className="px-4 lg:px-6 pt-20 pb-4 lg:pb-6 max-w-7xl mx-auto">{children}</div>
            </PullToRefresh>
          </main>
          <div className="absolute top-0 inset-x-0 z-40">
            <Header user={session?.user} onLogout={handleLogout} />
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
