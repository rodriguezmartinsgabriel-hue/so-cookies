"use client";

import { useRef, useState, type ReactNode, type RefObject } from "react";
import { RefreshCw } from "lucide-react";

const PULL_THRESHOLD = 56;

export function PullToRefresh({
  scrollRef,
  onRefresh,
  children,
}: {
  scrollRef: RefObject<HTMLElement | null>;
  onRefresh: () => void;
  children: ReactNode;
}) {
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  function reset() {
    startY.current = null;
    setPull(0);
  }

  function handleTouchStart(e: React.TouchEvent) {
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0 || refreshing) return;
    startY.current = e.touches[0].clientY;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (startY.current === null || refreshing) return;
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) {
      e.preventDefault();
      setPull(Math.min(dy * 0.5, PULL_THRESHOLD * 1.5));
    } else {
      setPull(0);
    }
  }

  function handleTouchEnd() {
    if (startY.current === null) return;
    if (pull >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPull(PULL_THRESHOLD);
      Promise.resolve(onRefresh()).finally(() => {
        setRefreshing(false);
        setPull(0);
      });
    } else {
      reset();
    }
  }

  return (
    <div
      className="relative min-h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={reset}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center"
        style={{
          opacity: pull > 0 ? Math.min(pull / PULL_THRESHOLD, 1) : 0,
          transform: `translateY(${refreshing ? 8 : Math.max(0, pull - 44)}px)`,
          transition: refreshing ? "opacity 200ms" : undefined,
        }}
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-paper shadow-md mt-2">
          <RefreshCw className={`w-5 h-5 text-muted ${refreshing ? "animate-spin" : ""}`} strokeWidth={2} />
        </div>
      </div>
      {children}
    </div>
  );
}
