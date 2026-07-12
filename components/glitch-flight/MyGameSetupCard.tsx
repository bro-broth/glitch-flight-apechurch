"use client";

import React from "react";
import { Game } from "@/lib/games";
import BetAmountInput from "@/components/shared/BetAmountInput";
import {
    FlightRound,
    ASSET_BASE,
    TARGET_MIN,
    TARGET_MAX,
    clampTarget,
} from "./myGameConfig";

interface MyGameSetupCardProps {
    game: Game;
    onPlay: () => void;
    onRewatch: () => void;
    onReset: () => void;
    onPlayAgain: () => void;
    playAgainText?: string;
    currentView: 0 | 1 | 2;

    betAmount: number;
    setBetAmount: (amount: number) => void;
    isLoading: boolean;
    payout: number | null;
    round: FlightRound;
    inReplayMode: boolean;

    walletBalance: number;
    isGamePaused?: boolean;
    minBet: number;
    maxBet: number;

    /** The flight target multiplier — the round's only parameter besides the bet. */
    targetMultiplier: number;
    setTargetMultiplier: (value: number) => void;
}

/** Tiny uppercase mono label — the Glitch Flight house style. */
function Label({ children }: { children: React.ReactNode }): React.ReactElement {
    return (
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
            {children}
        </span>
    );
}

function StatRow({ label, value, valueClass = "text-white/80" }: { label: string; value: string; valueClass?: string }): React.ReactElement {
    return (
        <div className="w-full flex justify-between items-center gap-2">
            <Label>{label}</Label>
            <span className={`font-mono text-xs font-black ${valueClass}`}>{value}</span>
        </div>
    );
}

const MyGameSetupCard: React.FC<MyGameSetupCardProps> = ({
    game,
    onPlay,
    onReset,
    onPlayAgain,
    playAgainText = "Play Again",
    currentView,
    betAmount,
    setBetAmount,
    isLoading,
    payout,
    round,
    inReplayMode,
    walletBalance,
    isGamePaused = false,
    minBet,
    maxBet,
    targetMultiplier,
    setTargetMultiplier,
}) => {
    const usdMode = false;

    // Local text state for the target input so partial typing doesn't fight
    // the clamped numeric value upstream.
    const [targetText, setTargetText] = React.useState<string>(targetMultiplier.toFixed(2));

    const commitTarget = (raw: string): void => {
        const clamped = clampTarget(parseFloat(raw.replace(",", ".")));
        setTargetText(clamped.toFixed(2));
        setTargetMultiplier(clamped);
    };

    const stepTarget = (delta: number): void => {
        const clamped = clampTarget(targetMultiplier + delta);
        setTargetText(clamped.toFixed(2));
        setTargetMultiplier(clamped);
    };

    const isFlying = round.phase === "running" && round.targetHitAt === null;
    const targetHit = round.targetHitAt !== null;

    const formatApe = (value: number): string =>
        `${value.toLocaleString([], { minimumFractionDigits: 0, maximumFractionDigits: 3 })} APE`;

    const targetWin = betAmount * targetMultiplier;

    const canPlaceBet =
        betAmount >= minBet && betAmount <= maxBet && betAmount <= walletBalance && !isGamePaused && !isLoading;

    const won = (payout ?? 0) > 0;

    return (
        <div className="lg:basis-1/3 rounded-2xl border border-white/10 bg-[#05070c] p-5 sm:p-6 flex flex-col text-white selection:bg-white/20">
            {/* ── Brand ── */}
            <img
                src={`${ASSET_BASE}/brand.svg`}
                alt="ApeDroidz"
                draggable={false}
                className="mx-auto mb-5 h-9 w-auto opacity-90"
            />

            {inReplayMode && (
                <p className="mb-4 font-mono text-xs font-black uppercase tracking-[0.3em] text-[#3b82f6] text-center">
                    Replay Mode
                </p>
            )}

            {currentView === 0 && (
                <>
                    <BetAmountInput
                        min={0}
                        max={Math.min(maxBet, walletBalance)}
                        step={0.1}
                        value={betAmount}
                        onChange={setBetAmount}
                        balance={walletBalance}
                        usdMode={usdMode}
                        setUsdMode={() => {}}
                        disabled={isLoading}
                        themeColorBackground={game.themeColorBackground}
                    />

                    {/* ── Flight target — the droid flies exactly this far ── */}
                    <div className="mt-6 flex flex-col gap-1">
                        <Label>Flight Target</Label>
                        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/20">
                            Reach it before the crash to win bet x target
                        </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                        <button
                            type="button"
                            aria-label="Decrease target"
                            onClick={() => stepTarget(-0.5)}
                            disabled={isLoading}
                            className="h-10 w-10 shrink-0 rounded-lg border border-white/10 bg-white/5 font-mono text-base font-black text-white/60 transition-colors hover:border-white/25 hover:text-white"
                        >
                            −
                        </button>
                        <div className="relative flex-1">
                            <input
                                type="text"
                                inputMode="decimal"
                                value={targetText}
                                onChange={(e) => setTargetText(e.target.value)}
                                onBlur={(e) => commitTarget(e.target.value)}
                                disabled={isLoading}
                                aria-label={`Target multiplier (${TARGET_MIN}–${TARGET_MAX})`}
                                className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pr-7 text-center font-mono text-sm font-black text-[#00FF94] outline-none focus:border-[#00FF94]/40"
                            />
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs font-black text-white/30">
                                x
                            </span>
                        </div>
                        <button
                            type="button"
                            aria-label="Increase target"
                            onClick={() => stepTarget(0.5)}
                            disabled={isLoading}
                            className="h-10 w-10 shrink-0 rounded-lg border border-white/10 bg-white/5 font-mono text-base font-black text-white/60 transition-colors hover:border-white/25 hover:text-white"
                        >
                            +
                        </button>
                    </div>

                    <div className="grow" />

                    <div className="mt-8 flex flex-col gap-2">
                        <StatRow label="Max Bet Per Flight" value={`${maxBet.toLocaleString([], { maximumFractionDigits: 0 })} APE`} />
                        <StatRow label="Target Win" value={formatApe(targetWin)} valueClass="text-[#00FF94]" />
                        <StatRow label="How To Play" value="Reach the target, win the flight" />
                    </div>

                    <button
                        type="button"
                        onClick={onPlay}
                        disabled={!canPlaceBet}
                        className="mt-6 w-full rounded-xl bg-white py-3.5 font-mono text-sm font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-white/85 disabled:opacity-30 disabled:hover:bg-white"
                    >
                        Launch Flight
                    </button>
                </>
            )}

            {currentView === 1 && (
                <>
                    <div className="flex flex-col gap-2">
                        <StatRow label="Bet Amount" value={formatApe(betAmount)} />
                        <StatRow label="Flight Target" value={`${targetMultiplier.toFixed(2)}x`} valueClass="text-[#00FF94]" />
                        <StatRow
                            label="Target Win"
                            value={formatApe(targetWin)}
                            valueClass="text-[#00FF94] drop-shadow-[0_0_10px_rgba(0,255,148,0.45)]"
                        />
                    </div>

                    <div className="grow" />

                    {/* ── Flight status — no mid-flight decisions, resolution is on-chain ── */}
                    <div
                        className={`mt-8 w-full rounded-xl py-4 text-center font-mono text-base font-black uppercase tracking-[0.2em] ${
                            targetHit
                                ? "border border-[#00FF94]/40 text-[#00FF94] drop-shadow-[0_0_14px_rgba(0,255,148,0.4)]"
                                : isFlying
                                    ? "border border-white/10 bg-white/5 text-white/70 animate-pulse"
                                    : round.phase === "crashed"
                                        ? "border border-red-500/30 text-red-400"
                                        : "border border-white/10 bg-white/5 text-white/40"
                        }`}
                    >
                        {targetHit
                            ? `Target hit ${round.targetHitAt!.toFixed(2)}x`
                            : isFlying
                                ? `Flying to ${targetMultiplier.toFixed(2)}x…`
                                : round.phase === "crashed"
                                    ? "Crashed"
                                    : "Launching…"}
                    </div>
                </>
            )}

            {currentView === 2 && (
                <>
                    <div className="flex flex-col gap-2">
                        <StatRow label="Bet Amount" value={formatApe(betAmount)} />
                        <StatRow
                            label="Total Payout"
                            value={formatApe(payout ?? 0)}
                            valueClass={won ? "text-[#00FF94] drop-shadow-[0_0_10px_rgba(0,255,148,0.45)]" : "text-red-400"}
                        />
                        <StatRow label="Flight Target" value={`${targetMultiplier.toFixed(2)}x`} valueClass={won ? "text-[#00FF94]" : "text-white/80"} />
                        {round.revealedCrashPoint !== null && (
                            <StatRow label="Crash Point" value={`${round.revealedCrashPoint.toFixed(2)}x`} />
                        )}
                        <StatRow label="Wallet Balance" value={formatApe(walletBalance)} />
                    </div>

                    <div className="grow" />

                    <div className="mt-8 flex flex-col gap-3">
                        <button
                            type="button"
                            onClick={onPlayAgain}
                            disabled={isGamePaused}
                            className="w-full rounded-xl bg-white py-3.5 font-mono text-sm font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-white/85 disabled:opacity-30"
                        >
                            {playAgainText}
                        </button>

                        <button
                            type="button"
                            onClick={onReset}
                            className="w-full rounded-xl border border-white/15 bg-transparent py-3 font-mono text-xs font-black uppercase tracking-[0.2em] text-white/60 transition-colors hover:border-white/30 hover:text-white"
                        >
                            Change Bet
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default MyGameSetupCard;
