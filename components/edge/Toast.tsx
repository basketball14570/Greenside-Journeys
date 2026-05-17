"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// Minimal toast system. Lives once at the dashboard layout level and
// is consumed via the `toast()` helper anywhere downstream — works
// from event handlers, from useEffects, doesn't care.
//
// Why not a library: we render ~3 chip variants, the UI is bespoke
// (Greenside green for success, amber warn, red error), and pulling
// in react-hot-toast just to format a "Link copied" chip feels rude.

export type ToastTone = "success" | "info" | "warn" | "error";

type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  push: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let externalPush: ((message: string, tone?: ToastTone) => void) | null = null;

// Imperative escape hatch — anywhere in the app:
//   import { toast } from "@/components/edge/Toast";
//   toast("Link copied", "success");
// Works without threading useContext through callsites. The provider
// registers itself into this module variable on mount.
export function toast(message: string, tone: ToastTone = "info"): void {
  if (externalPush) {
    externalPush(message, tone);
  } else if (typeof window !== "undefined") {
    // Provider hasn't mounted yet (shouldn't happen in the dashboard
    // tree but guards against early imports). Defer one tick.
    setTimeout(() => externalPush?.(message, tone), 0);
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const push = useCallback((message: string, tone: ToastTone = "info") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, tone }]);
    const t = setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
      timers.current.delete(id);
    }, 3200);
    timers.current.set(id, t);
  }, []);

  useEffect(() => {
    externalPush = push;
    return () => {
      if (externalPush === push) externalPush = null;
    };
  }, [push]);

  useEffect(() => {
    const timersRef = timers.current;
    return () => {
      timersRef.forEach(clearTimeout);
      timersRef.clear();
    };
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 bottom-4 lg:bottom-6 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <ToastChip key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { push: (m, t) => toast(m, t) };
  }
  return ctx;
}

const PALETTE: Record<ToastTone, { fg: string; bg: string; border: string }> = {
  success: { fg: "#7fd49a", bg: "rgba(127,212,154,0.12)", border: "#7fd49a55" },
  info:    { fg: "#f0ebe0", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.18)" },
  warn:    { fg: "#f5c558", bg: "rgba(245,197,88,0.12)",  border: "#f5c55855" },
  error:   { fg: "#e87c7c", bg: "rgba(232,124,124,0.12)", border: "#e87c7c55" },
};

function ToastChip({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const p = PALETTE[toast.tone];
  return (
    <button
      onClick={onDismiss}
      className="num pointer-events-auto rounded-[10px] px-4 py-2.5 backdrop-blur"
      style={{
        fontSize: 13,
        background: p.bg,
        color: p.fg,
        border: `1px solid ${p.border}`,
        boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
        animation: "greensideToastIn 0.18s ease-out",
        letterSpacing: 0.2,
        maxWidth: "min(520px, calc(100% - 32px))",
        textAlign: "left",
      }}
    >
      {toast.message}
    </button>
  );
}
