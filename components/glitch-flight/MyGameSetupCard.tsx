"use client";

import React from "react";
import { Game } from "@/lib/games";
import BetAmountInput from "@/components/shared/BetAmountInput";
import {
    FlightRound,
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

/** Two rows of six presets, spread from 2x to 200x. */
const TARGET_PRESETS: number[] = [2, 3, 5, 7, 10, 15, 20, 30, 50, 75, 100, 200];

function StatRow({ label, value, valueClass = "text-white" }: { label: string; value: string; valueClass?: string }): React.ReactElement {
    return (
        <div className="w-full flex justify-between items-center gap-2 text-xs font-medium">
            <p className="text-[#91989C]">{label}</p>
            <p className={`text-right font-semibold ${valueClass}`}>{value}</p>
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

    const isFlying = round.phase === "running" && round.targetHitAt === null;
    const targetHit = round.targetHitAt !== null;

    const formatApe = (value: number): string =>
        `${value.toLocaleString([], { minimumFractionDigits: 0, maximumFractionDigits: 3 })} APE`;

    const targetWin = betAmount * targetMultiplier;

    const canPlaceBet =
        betAmount >= minBet && betAmount <= maxBet && betAmount <= walletBalance && !isGamePaused && !isLoading;

    const won = (payout ?? 0) > 0;

    const liveColor =
        round.phase === "crashed" ? "#f87171" : round.multiplier < 2 ? "#00FF94" : round.multiplier < 5 ? "#fde047" : "#fb923c";

    return (
        <div
            className="lg:basis-1/3 rounded-2xl border border-white/10 bg-[#0c1519]/70 backdrop-blur-md p-5 sm:p-6 flex flex-col text-white selection:bg-white/20"
            style={{ "--theme-color": game.themeColorBackground } as React.CSSProperties}
        >
            {inReplayMode && (
                <p className="mb-4 gf-mono text-xs font-black uppercase tracking-[0.3em] text-[#3b82f6] text-center">
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

                    {/* ── Flight target — same idiom as the bet block above ── */}
                    <div className="mt-5 w-full space-y-2">
                        <div className="flex items-center justify-between gap-2 text-sm font-medium text-gray-400">
                            <p>Flight Target</p>
                        </div>

                        <div className="flex items-center gap-2 bg-gray-900/70 rounded-[8px] px-3 py-2.5">
                            <input
                                type="text"
                                inputMode="decimal"
                                value={targetText}
                                onChange={(e) => setTargetText(e.target.value)}
                                onBlur={(e) => commitTarget(e.target.value)}
                                disabled={isLoading}
                                aria-label={`Target multiplier (${TARGET_MIN}–${TARGET_MAX})`}
                                className="w-full bg-transparent p-0 border-0 focus:ring-0 focus:outline-none font-medium text-white"
                            />
                            <span className="shrink-0 text-gray-400 font-medium">x</span>
                        </div>

                        <div className="grid grid-cols-6 gap-2">
                            {TARGET_PRESETS.map((preset) => {
                                const active = Math.abs(targetMultiplier - preset) < 0.005;
                                return (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => commitTarget(String(preset))}
                                        disabled={isLoading}
                                        className={`text-xs font-semibold text-white py-1.5 border rounded-[5px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                                            active
                                                ? "bg-(--theme-color)/40 border-(--theme-color)/60"
                                                : "bg-gray-700/20 border-(--theme-color)/30 hover:bg-(--theme-color)/40 hover:border-(--theme-color)/60"
                                        }`}
                                    >
                                        {preset}x
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grow" />

                    <div className="mt-8 rounded-[8px] border border-white/10 bg-gray-900/40 p-4 flex flex-col gap-2">
                        <StatRow label="Flight Target" value={`${targetMultiplier.toFixed(2)}x`} valueClass="text-[#00FF94]" />
                        <StatRow label="Potential Payout" value={formatApe(targetWin)} valueClass="text-[#00FF94]" />
                        <StatRow label="Max Bet Per Flight" value={`${maxBet.toLocaleString([], { maximumFractionDigits: 0 })} APE`} />
                    </div>

                    <button
                        type="button"
                        onClick={onPlay}
                        disabled={!canPlaceBet}
                        className="mt-6 w-full rounded-xl bg-white py-3.5 gf-mono text-sm font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-white/85 disabled:opacity-30 disabled:hover:bg-white"
                    >
                        Launch Flight
                    </button>
                </>
            )}

            {currentView === 1 && (
                <>
                    <div className="mt-2 flex flex-col items-center gap-1">
                        <p className="text-sm font-medium text-gray-400">Current Multiplier</p>
                        <p
                            className="gf-mono text-5xl font-black text-[#00FF94] drop-shadow-[0_0_22px_rgba(0,255,148,0.45)]"
                            style={{ color: liveColor }}
                        >
                            {round.multiplier.toFixed(2)}x
                        </p>
                    </div>

                    <div className="grow" />

                    <div className="flex flex-col items-center gap-1 text-center">
                        {targetHit ? (
                            <>
                                <p className="text-sm font-medium text-gray-400">Target hit at</p>
                                <p className="gf-mono text-2xl font-black text-[#00FF94]">{round.targetHitAt!.toFixed(2)}x</p>
                                <p className="mt-2 text-sm text-white/45 max-w-[260px]">
                                    Payout locked in — the droid rides on until the crash.
                                </p>
                            </>
                        ) : round.phase === "crashed" ? (
                            <>
                                <p className="text-sm font-medium text-gray-400">Crashed at</p>
                                <p className="gf-mono text-2xl font-black text-red-400">{round.multiplier.toFixed(2)}x</p>
                            </>
                        ) : (
                            <>
                                <p className="text-sm font-medium text-gray-400">Cashing out at</p>
                                <p className="gf-mono text-2xl font-black text-white">{targetMultiplier.toFixed(2)}x</p>
                                <p className="mt-2 text-sm text-white/45 max-w-[260px]">
                                    Target locked in — the run is already decided. Sit back and watch.
                                </p>
                            </>
                        )}
                    </div>

                    <div className="grow" />

                    <div className="flex flex-col gap-2">
                        <StatRow label="Bet Amount" value={formatApe(betAmount)} />
                        <StatRow label="Potential Payout" value={formatApe(targetWin)} valueClass="text-[#00FF94]" />
                    </div>
                </>
            )}

            {currentView === 2 && (
                <>
                    <div className="rounded-[8px] border border-white/10 bg-gray-900/40 p-4 flex flex-col gap-2">
                        <StatRow label="Bet Amount" value={formatApe(betAmount)} />
                        <StatRow
                            label="Total Payout"
                            value={formatApe(payout ?? 0)}
                            valueClass={won ? "text-[#00FF94]" : "text-red-400"}
                        />
                        <StatRow label="Flight Target" value={`${targetMultiplier.toFixed(2)}x`} valueClass={won ? "text-[#00FF94]" : "text-white"} />
                        {round.revealedCrashPoint !== null && (
                            <StatRow label="Crash Point" value={`${round.revealedCrashPoint.toFixed(2)}x`} />
                        )}
                    </div>

                    <div className="grow" />

                    <div className="mt-8 flex flex-col gap-3">
                        <button
                            type="button"
                            onClick={onPlayAgain}
                            disabled={isGamePaused}
                            className="w-full rounded-xl bg-white py-3.5 gf-mono text-sm font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-white/85 disabled:opacity-30"
                        >
                            {playAgainText}
                        </button>

                        <button
                            type="button"
                            onClick={onReset}
                            className="w-full rounded-xl border border-white/15 bg-transparent py-3 gf-mono text-xs font-black uppercase tracking-[0.2em] text-white/60 transition-colors hover:border-white/30 hover:text-white"
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
