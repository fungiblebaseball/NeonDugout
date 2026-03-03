import { useState, useEffect } from "react";
import { useGameStore } from "@/lib/store";
import { X } from "lucide-react";

interface PageTipProps {
  route: string;
  message: string;
}

const AUTO_DISMISS_MS = 8000;

export default function PageTip({ route, message }: PageTipProps) {
  const { tutorialCompleted, seenPageTips, showTutorial, markPageTipSeen } = useGameStore();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  const shouldShow = tutorialCompleted && !showTutorial && !seenPageTips.includes(route);

  useEffect(() => {
    if (!shouldShow) return;
    const showTimer = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(showTimer);
  }, [shouldShow]);

  useEffect(() => {
    if (!visible) return;

    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / AUTO_DISMISS_MS) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        handleDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [visible]);

  const handleDismiss = () => {
    setVisible(false);
    markPageTipSeen(route);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-20 left-4 right-4 z-[9000] flex justify-center animate-in slide-in-from-bottom-4 fade-in duration-300"
      data-testid={`page-tip-${route.replace(/\//g, "") || "home"}`}
    >
      <div className="w-full max-w-md bg-gray-950/95 border border-cyan-500/30 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.15)] backdrop-blur-sm overflow-hidden">
        <div className="flex items-start gap-3 px-4 py-3">
          <div className="flex-1 min-w-0">
            <p
              className="text-sm text-gray-300"
              style={{ fontFamily: "VT323, monospace", fontSize: "15px" }}
            >
              {message}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            data-testid={`button-dismiss-tip-${route.replace(/\//g, "") || "home"}`}
            className="text-gray-500 hover:text-gray-300 transition-colors shrink-0 mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="h-0.5 bg-gray-800">
          <div
            className="h-full bg-cyan-500/50 transition-all"
            style={{ width: `${progress}%`, transitionDuration: "50ms" }}
          />
        </div>
      </div>
    </div>
  );
}
