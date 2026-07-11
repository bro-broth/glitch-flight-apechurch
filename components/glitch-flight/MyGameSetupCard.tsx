"use client";

import React from "react";
import { Game } from "@/lib/games";
import BetAmountInput from "@/components/shared/BetAmountInput";
import {
    FlightRound,
    AUTO_CASHOUT_DEFAULT,
    AUTO_CASHOUT_MIN,
    AUTO_CASHOUT_MAX,
    clampAutoCashout,
} from "./myGameConfig";

interface MyGameSetupCardProps {
    game: Game;
    onPlay: () => void;
    onCashOut: () => void;
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

    /** Pre-round target multiplier; null = manual ape-out only. */
    autoCashOutAt: number | null;
    setAutoCashOutAt: (value: number | null) => void;
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
    onCashOut,
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
    autoCashOutAt,
    setAutoCashOutAt,
}) => {
    const usdMode = false;

    // Local text state for the target input so partial typing doesn't fight
    // the clamped numeric value upstream.
    const [targetText, setTargetText] = React.useState<string>(
        (autoCashOutAt ?? AUTO_CASHOUT_DEFAULT).toFixed(2)
    );
    const autoEnabled = autoCashOutAt !== null;

    const commitTarget = (raw: string): void => {
        const clamped = clampAutoCashout(parseFloat(raw.replace(",", ".")));
        setTargetText(clamped.toFixed(2));
        setAutoCashOutAt(clamped);
    };

    const stepTarget = (delta: number): void => {
        const base = autoCashOutAt ?? AUTO_CASHOUT_DEFAULT;
        const clamped = clampAutoCashout(base + delta);
        setTargetText(clamped.toFixed(2));
        setAutoCashOutAt(clamped);
    };

    const toggleAuto = (): void => {
        if (autoEnabled) {
            setAutoCashOutAt(null);
        } else {
            commitTarget(targetText);
        }
    };

    const isFlying = round.phase === "running" && round.cashedOutAt === null;
    const hasCashedOut = round.cashedOutAt !== null;

    const formatApe = (value: number): string =>
        `${value.toLocaleString([], { minimumFractionDigits: 0, maximumFractionDigits: 3 })} APE`;

    const potentialWin = betAmount * round.multiplier;

    const canPlaceBet =
        betAmount >= minBet && betAmount <= maxBet && betAmount <= walletBalance && !isGamePaused && !isLoading;

    const won = (payout ?? 0) > 0;

    return (
        <div className="lg:basis-1/3 rounded-2xl border border-white/10 bg-[#05070c] p-5 sm:p-6 flex flex-col text-white selection:bg-white/20">
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

                    {/* ── Auto ape out — pick the target multiplier before take-off ── */}
                    <div className="mt-6 flex items-center justify-between gap-3">
                        <div className="flex flex-col gap-1">
                            <Label>Auto Ape Out</Label>
                            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/20">
                                Exit at target multiplier
                            </span>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={autoEnabled}
                            aria-label="Toggle auto ape out"
                            onClick={toggleAuto}
                            disabled={isLoading}
                            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                                autoEnabled ? "bg-[#00FF94]" : "bg-white/10"
                            }`}
                        >
                            <span
                                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                                    autoEnabled ? "left-[22px]" : "left-0.5"
                                }`}
                            />
                        </button>
                    </div>

                    {autoEnabled && (
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
                                    aria-label={`Target multiplier (${AUTO_CASHOUT_MIN}–${AUTO_CASHOUT_MAX})`}
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
                    )}

                    <div className="grow" />

                    <div className="mt-8 flex flex-col gap-2">
                        <StatRow label="Max Bet Per Flight" value={`${maxBet.toLocaleString([], { maximumFractionDigits: 0 })} APE`} />
                        {autoEnabled && autoCashOutAt !== null && (
                            <StatRow
                                label="Target Win"
                                value={formatApe(betAmount * autoCashOutAt)}
                                valueClass="text-[#00FF94]"
                            />
                        )}
                        <StatRow label="How To Play" value="Ape out before the crash" />
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
                        <StatRow
                            label="Auto Ape Out"
                            value={autoCashOutAt !== null ? `${autoCashOutAt.toFixed(2)}x` : "Off"}
                            valueClass={autoCashOutAt !== null ? "text-[#00FF94]" : "text-white/40"}
                        />
                        <StatRow
                            label="Potential Win"
                            value={formatApe(potentialWin)}
                            valueClass="text-[#00FF94] drop-shadow-[0_0_10px_rgba(0,255,148,0.45)]"
                        />
                    </div>

                    <div className="grow" />

                    <div className="mt-8 flex flex-col items-center gap-3">
                        <button
                            type="button"
                            onClick={onCashOut}
                            disabled={!isFlying}
                            className={`w-full rounded-xl py-4 font-mono text-base font-black uppercase tracking-[0.2em] transition-all ${
                                isFlying
                                    ? "bg-[#00FF94] text-black shadow-[0_0_28px_rgba(0,255,148,0.45)] hover:bg-[#33ffa9]"
                                    : hasCashedOut
                                        ? "border border-[#00FF94]/40 bg-transparent text-[#00FF94]"
                                        : "bg-white/10 text-white/40"
                            }`}
                        >
                            {hasCashedOut
                                ? `Aped Out ${round.cashedOutAt!.toFixed(2)}x`
                                : isFlying
                                    ? "Ape Out"
                                    : round.phase === "crashed"
                                        ? "Crashed"
                                        : "Launching…"}
                        </button>

                        {isFlying && (
                            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30 animate-pulse text-center">
                                Cash out now for {formatApe(potentialWin)}
                            </p>
                        )}
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
                        {round.cashedOutAt !== null && (
                            <StatRow label="Aped Out At" value={`${round.cashedOutAt.toFixed(2)}x`} valueClass="text-[#00FF94]" />
                        )}
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
