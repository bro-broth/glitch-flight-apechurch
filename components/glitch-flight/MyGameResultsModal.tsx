"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface MyGameResultsModalProps {
    open: boolean;
    payout: number | null;
    betAmount: number;
    targetHitAt: number | null;
    crashPoint: number | null;
    playAgainText?: string;
    onPlayAgain: () => void;
    onRewatch: () => void;
    onReset: () => void;
    /** Delay before the modal appears, so the crash / target-hit FX can finish. */
    delayMs?: number;
}

/**
 * End-of-round modal in the Glitch Flight house style. Replaces the shared
 * GameResultsModal (which is suppressed by not passing onPlayAgain to
 * GameWindow) while keeping the same flows: Play Again, Rewatch, Change Bet.
 */
const MyGameResultsModal: React.FC<MyGameResultsModalProps> = ({
    open,
    payout,
    betAmount,
    targetHitAt,
    crashPoint,
    playAgainText = "Play Again",
    onPlayAgain,
    onRewatch,
    onReset,
    delayMs = 900,
}) => {
    const [visible, setVisible] = useState<boolean>(false);

    // Hide instantly when the round resets; show after a delay when it ends.
    const [prevOpen, setPrevOpen] = useState<boolean>(open);
    if (prevOpen !== open) {
        setPrevOpen(open);
        if (!open) setVisible(false);
    }

    useEffect(() => {
        if (!open) return;
        const t = window.setTimeout(() => setVisible(true), delayMs);
        return () => window.clearTimeout(t);
    }, [open, delayMs]);

    const won = (payout ?? 0) > 0;

    const formatApe = (value: number): string =>
        `${value.toLocaleString([], { minimumFractionDigits: 0, maximumFractionDigits: 3 })} APE`;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    key="gf-results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 z-40 flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 12 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 320, damping: 26 }}
                        className="w-full max-w-[340px] rounded-2xl border border-white/10 bg-[#05070c] p-6 flex flex-col items-center text-white"
                    >
                        <span className="gf-mono text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">
                            {won ? `Target hit at ${(targetHitAt ?? 0).toFixed(2)}x` : "Flight over"}
                        </span>

                        <div
                            className={`mt-3 gf-mono text-4xl font-black ${
                                won
                                    ? "text-[#00FF94] drop-shadow-[0_0_24px_rgba(0,255,148,0.6)]"
                                    : "text-red-400 drop-shadow-[0_0_18px_rgba(248,113,113,0.4)]"
                            }`}
                        >
                            {won ? `+${formatApe(payout ?? 0)}` : "CRASHED"}
                        </div>

                        <div className="mt-5 w-full flex flex-col gap-2">
                            <div className="w-full flex justify-between items-center">
                                <span className="gf-mono text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">Bet</span>
                                <span className="gf-mono text-xs font-black text-white/80">{formatApe(betAmount)}</span>
                            </div>
                            {!won && (
                                <div className="w-full flex justify-between items-center">
                                    <span className="gf-mono text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">Payout</span>
                                    <span className="gf-mono text-xs font-black text-red-400">0 APE</span>
                                </div>
                            )}
                            {crashPoint !== null && (
                                <div className="w-full flex justify-between items-center">
                                    <span className="gf-mono text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">Crash Point</span>
                                    <span className="gf-mono text-xs font-black text-white/80">{crashPoint.toFixed(2)}x</span>
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={onPlayAgain}
                            className="mt-6 w-full rounded-xl bg-white py-3 gf-mono text-sm font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-white/85"
                        >
                            {playAgainText}
                        </button>

                        <div className="mt-3 w-full flex gap-3">
                            <button
                                type="button"
                                onClick={onRewatch}
                                className="flex-1 rounded-xl border border-white/15 py-2.5 gf-mono text-[11px] font-black uppercase tracking-[0.2em] text-white/60 transition-colors hover:border-white/30 hover:text-white"
                            >
                                Rewatch
                            </button>
                            <button
                                type="button"
                                onClick={onReset}
                                className="flex-1 rounded-xl border border-white/15 py-2.5 gf-mono text-[11px] font-black uppercase tracking-[0.2em] text-white/60 transition-colors hover:border-white/30 hover:text-white"
                            >
                                Change Bet
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MyGameResultsModal;
