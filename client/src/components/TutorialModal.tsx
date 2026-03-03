import { useState } from "react";
import { useGameStore } from "@/lib/store";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const SLIDES = [
  {
    title: "Welcome to Neon Dugout!",
    icon: "⚾",
    body: "You don't need to play every day. Claim tokens periodically, train with minigames, and watch your squad grow over time. Even casual managers can build a championship team.",
  },
  {
    title: "Your Home Base",
    icon: "🏠",
    body: "The Hub shows your last match result at the top and the next match preview below. The red countdown timer shows when the next game starts. Matches run automatically every day — no action needed.",
  },
  {
    title: "Build Your Strategy",
    icon: "📋",
    body: "Set your Lineup, configure your Pitching staff, and tune Attack/Defense tactics. Your team plays with these settings each game day. Adjust them anytime before the next match.",
  },
  {
    title: "Training & Growth",
    icon: "💪",
    body: "Play minigames to boost your players' stats during the season. At season end, part of those training boosts become permanent — your squad gets stronger over time.",
  },
  {
    title: "The Market",
    icon: "🏪",
    body: "Buy and sell players with tokens on the marketplace. You can also purchase tokens with SOL directly from your wallet. Build your dream roster.",
  },
];

export default function TutorialModal() {
  const [slide, setSlide] = useState(0);
  const { markTutorialComplete } = useGameStore();

  const isLast = slide === SLIDES.length - 1;
  const isFirst = slide === 0;
  const current = SLIDES[slide];

  const handleNext = () => {
    if (isLast) {
      markTutorialComplete();
    } else {
      setSlide(slide + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) setSlide(slide - 1);
  };

  const handleSkip = () => {
    markTutorialComplete();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm px-4"
      data-testid="tutorial-modal"
    >
      <div className="relative w-full max-w-md bg-gray-950 border border-cyan-500/40 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.2)] overflow-hidden">
        <button
          onClick={handleSkip}
          data-testid="button-tutorial-skip"
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-300 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-6 pt-8 pb-6">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">{current.icon}</div>
            <h2
              className="text-lg font-bold tracking-widest uppercase text-cyan-400"
              style={{ fontFamily: "Orbitron, sans-serif" }}
              data-testid="text-tutorial-title"
            >
              {current.title}
            </h2>
          </div>

          <p
            className="text-sm text-gray-300 leading-relaxed text-center"
            style={{ fontFamily: "VT323, monospace", fontSize: "16px" }}
            data-testid="text-tutorial-body"
          >
            {current.body}
          </p>
        </div>

        <div className="flex items-center justify-center gap-1.5 pb-4">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              data-testid={`dot-tutorial-${i}`}
              className={`w-2 h-2 rounded-full transition-all ${
                i === slide
                  ? "bg-cyan-400 w-4"
                  : "bg-gray-600 hover:bg-gray-500"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between px-6 pb-6">
          <button
            onClick={handlePrev}
            disabled={isFirst}
            data-testid="button-tutorial-prev"
            className="flex items-center gap-1 px-3 py-2 text-xs font-mono uppercase tracking-wider text-gray-400 hover:text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <button
            onClick={handleNext}
            data-testid="button-tutorial-next"
            className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              isLast
                ? "bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                : "bg-gray-800 hover:bg-gray-700 text-cyan-300 border border-cyan-500/30"
            }`}
          >
            {isLast ? (
              "GOT IT"
            ) : (
              <span className="flex items-center gap-1">
                Next
                <ChevronRight className="w-4 h-4" />
              </span>
            )}
          </button>
        </div>

        <div className="h-0.5 bg-gray-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-pink-500 transition-all duration-300"
            style={{ width: `${((slide + 1) / SLIDES.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
