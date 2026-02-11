"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { getFactForMilestone } from "@/lib/runner-facts";
import Link from "next/link";
import BibRunner from "@/components/game/bib-runner";

interface ProcessingScreenProps {
  sessionId: string;
  eventId: string;
  totalPhotos: number;
}

interface ProgressData {
  total: number;
  processed: number;
  percent: number;
  currentStep: string;
  creditsRefunded: number;
  complete: boolean;
}

export default function ProcessingScreen({
  sessionId,
  eventId,
  totalPhotos,
}: ProcessingScreenProps) {
  const [progress, setProgress] = useState<ProgressData>({
    total: totalPhotos,
    processed: 0,
    percent: 0,
    currentStep: "Démarrage...",
    creditsRefunded: 0,
    complete: false,
  });
  const [currentFact, setCurrentFact] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const lastMilestone = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connectSSE = useCallback(() => {
    const es = new EventSource(`/api/photos/upload-progress/${sessionId}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data: ProgressData = JSON.parse(event.data);
        setProgress(data);

        // Check milestones for fun facts
        const milestone = Math.floor(data.percent / 10) * 10;
        if (milestone > lastMilestone.current && milestone > 0) {
          lastMilestone.current = milestone;
          const fact = getFactForMilestone(milestone);
          if (fact) setCurrentFact(fact);
        }

        if (data.complete) {
          setShowConfetti(true);
          es.close();
        }
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => {
      es.close();
      // Reconnect after 2s if not complete
      setTimeout(() => {
        if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
          connectSSE();
        }
      }, 2000);
    };
  }, [sessionId]);

  useEffect(() => {
    connectSSE();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [connectSSE]);

  const runnerPosition = Math.min(progress.percent, 100);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Confetti */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="confetti-piece absolute"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
                backgroundColor: ["#059669", "#14B8A6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"][
                  i % 6
                ],
              }}
            />
          ))}
        </div>
      )}

      {/* Title */}
      <div className="text-center mb-8 relative z-10">
        <h1 className="text-2xl md:text-3xl font-bold font-display mb-2">
          {progress.complete ? "Traitement terminé !" : "Traitement en cours..."}
        </h1>
        <p className="text-slate-400 text-sm">
          {progress.processed} / {progress.total} photos traitées
        </p>
      </div>

      {/* Bib Runner Game */}
      <div className="w-full max-w-2xl px-8 mb-6 relative z-10">
        <BibRunner progress={progress.percent} isComplete={progress.complete} />

        {/* Progress bar */}
        <div className="h-3 bg-slate-700 rounded-full overflow-hidden mt-4">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${runnerPosition}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-sm">
          <span className="text-slate-400">{progress.currentStep}</span>
          <span className="text-emerald-400 font-bold">{progress.percent}%</span>
        </div>
      </div>

      {/* Processing badges */}
      <div className="flex flex-wrap gap-3 justify-center mb-8 relative z-10">
        <ProcessingBadge
          label="Qualité"
          active={progress.percent >= 5}
          done={progress.percent >= 30}
        />
        <ProcessingBadge
          label="OCR"
          active={progress.percent >= 20}
          done={progress.percent >= 60}
        />
        <ProcessingBadge
          label="Visages"
          active={progress.percent >= 50}
          done={progress.percent >= 85}
        />
        <ProcessingBadge
          label="Labels"
          active={progress.percent >= 70}
          done={progress.complete}
        />
      </div>

      {/* Fun fact */}
      {currentFact && (
        <div className="max-w-lg mx-auto px-6 py-4 bg-white/5 border border-white/10 rounded-xl text-center mb-8 relative z-10 animate-fade-in">
          <p className="text-sm text-slate-300">
            <span className="text-emerald-400 font-medium mr-1">Le saviez-vous ?</span>
            {currentFact}
          </p>
        </div>
      )}

      {/* Credits refunded */}
      {progress.creditsRefunded > 0 && (
        <div className="text-center mb-6 relative z-10">
          <p className="text-sm text-emerald-400">
            {progress.creditsRefunded} crédit{progress.creditsRefunded > 1 ? "s" : ""} remboursé{progress.creditsRefunded > 1 ? "s" : ""} (photos sans dossard)
          </p>
        </div>
      )}

      {/* Complete actions */}
      {progress.complete && (
        <div className="flex gap-4 relative z-10 animate-fade-in">
          <Link href={`/photographer/events/${eventId}`}>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 text-lg rounded-xl shadow-lg shadow-emerald-500/25">
              Voir les photos
            </Button>
          </Link>
        </div>
      )}

      {/* Inline styles for animations */}
      <style jsx>{`
        .confetti-piece {
          width: 8px;
          height: 8px;
          border-radius: 2px;
          animation: confettiFall linear forwards;
          top: -10px;
        }
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function ProcessingBadge({
  label,
  active,
  done,
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-500 ${
        done
          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          : active
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse"
            : "bg-slate-700/50 text-slate-500 border border-slate-600/30"
      }`}
    >
      {done ? "✓ " : active ? "⏳ " : ""}
      {label}
    </div>
  );
}
