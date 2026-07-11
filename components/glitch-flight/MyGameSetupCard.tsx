"use client";

import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { Game } from "@/lib/games";
import BetAmountInput from "@/components/shared/BetAmountInput";
import { FlightRound } from "./myGameConfig";

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
}) => {
    const themeColorBackground = game.themeColorBackground;
    const usdMode = false;

    const isFlying = round.phase === "running" && round.cashedOutAt === null;
    const hasCashedOut = round.cashedOutAt !== null;

    const formatApe = (value: number): string =>
        `${value.toLocaleString([], { minimumFractionDigits: 0, maximumFractionDigits: 3 })} APE`;

    const potentialWin = betAmount * round.multiplier;

    const canPlaceBet =
        betAmount >= minBet && betAmount <= maxBet && betAmount <= walletBalance && !isGamePaused && !isLoading;

    const roundStats = (showPayout: boolean): React.ReactElement => (
        <div className="font-roboto flex flex-col gap-8">
            {inReplayMode && (
                <p className="mt-2 font-semibold text-3xl text-center" style={{ color: themeColorBackground }}>
                    Replay Mode
                </p>
            )}

            <div className="w-full flex flex-col items-center gap-2 font-medium text-xs text-[#91989C]">
                <div className="w-full flex justify-between items-center gap-2">
                    <p>Bet Amount</p>
                    <p className="text-right">{formatApe(betAmount)}</p>
                </div>
                {showPayout ? (
                    <>
                        <div className="w-full flex justify-between items-center gap-2">
                            <p>Total Payout</p>
                            <p className={`text-right font-semibold ${(payout ?? 0) > 0 ? "text-green-500" : "text-red-400"}`}>
                                {formatApe(payout ?? 0)}
                            </p>
                        </div>
                        {round.cashedOutAt !== null && (
                            <div className="w-full flex justify-between items-center gap-2">
                                <p>Aped Out At</p>
                                <p className="text-right text-green-500 font-semibold">{round.cashedOutAt.toFixed(2)}x</p>
                            </div>
                        )}
                        {round.revealedCrashPoint !== null && (
                            <div className="w-full flex justify-between items-center gap-2">
                                <p>Crash Point</p>
                                <p className="text-right">{round.revealedCrashPoint.toFixed(2)}x</p>
                            </div>
                        )}
                        <div className="w-full flex justify-between items-center gap-2">
                            <p>Wallet Balance</p>
                            <p className="text-right">{formatApe(walletBalance)}</p>
                        </div>
                    </>
                ) : (
                    <div className="w-full flex justify-between items-center gap-2">
                        <p>Potential Win</p>
                        <p className="text-right text-green-500 font-semibold">{formatApe(potentialWin)}</p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <Card className="lg:basis-1/3 p-6 flex flex-col">
            {currentView === 0 && (
                <>
                    <CardContent className="font-roboto">
                        <Button
                            onClick={onPlay}
                            className="lg:hidden w-full"
                            style={{ backgroundColor: themeColorBackground, borderColor: themeColorBackground }}
                            disabled={!canPlaceBet}
                        >
                            Launch Flight
                        </Button>

                        <div className="mt-5">
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
                                themeColorBackground={themeColorBackground}
                            />
                        </div>
                    </CardContent>

                    <div className="grow"></div>

                    <CardFooter className="mt-8 w-full flex flex-col font-roboto">
                        <div className="w-full flex flex-col items-center gap-2 font-medium text-xs text-[#91989C]">
                            <div className="w-full flex justify-between items-center gap-2">
                                <div className="flex items-center gap-2">
                                    <p>Max Bet Per Flight</p>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Info size={16} />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Maximum amount you can bet per round</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <p className="text-right">{maxBet.toLocaleString([], { maximumFractionDigits: 0 })} APE</p>
                            </div>
                            <div className="w-full flex justify-between items-center gap-2">
                                <p>How To Play</p>
                                <p className="text-right">Cash out before the crash</p>
                            </div>
                        </div>

                        <Button
                            onClick={onPlay}
                            className="hidden lg:flex mt-6 w-full"
                            style={{ backgroundColor: themeColorBackground, borderColor: themeColorBackground }}
                            disabled={!canPlaceBet}
                        >
                            Launch Flight
                        </Button>
                    </CardFooter>
                </>
            )}

            {currentView === 1 && (
                <CardContent className="grow font-roboto flex flex-col-reverse lg:flex-col lg:justify-between gap-8">
                    {roundStats(false)}

                    <div className="flex lg:flex-col justify-center items-center">
                        <div className="font-roboto flex flex-col items-center gap-3 w-full">
                            <Button
                                onClick={onCashOut}
                                className="w-full text-lg font-bold py-6"
                                style={{
                                    backgroundColor: isFlying ? "#22c55e" : hasCashedOut ? "#16a34a" : "#6b7280",
                                    borderColor: isFlying ? "#22c55e" : hasCashedOut ? "#16a34a" : "#6b7280",
                                }}
                                disabled={!isFlying}
                            >
                                {hasCashedOut
                                    ? `APED OUT ${round.cashedOutAt!.toFixed(2)}x`
                                    : isFlying
                                        ? "APE OUT"
                                        : round.phase === "crashed"
                                            ? "CRASHED"
                                            : "Preparing launch…"}
                            </Button>

                            {isFlying && (
                                <p className="text-sm text-center text-muted-foreground animate-pulse">
                                    Cash out now for {formatApe(potentialWin)}
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            )}

            {currentView === 2 && (
                <CardContent className="grow font-roboto flex flex-col lg:justify-between gap-8">
                    <div className="lg:hidden">
                        <Button
                            className="w-full"
                            style={{ backgroundColor: themeColorBackground, borderColor: themeColorBackground }}
                            onClick={onPlayAgain}
                            disabled={isGamePaused}
                        >
                            {playAgainText}
                        </Button>

                        <Button className="w-full mt-3" variant="secondary" onClick={onReset}>
                            Change Bet
                        </Button>
                    </div>

                    {roundStats(true)}

                    <CardFooter className="w-full hidden lg:block">
                        <div className="w-full flex flex-col gap-4">
                            <Button
                                className="w-full"
                                style={{ backgroundColor: themeColorBackground, borderColor: themeColorBackground }}
                                onClick={onPlayAgain}
                                disabled={isGamePaused}
                            >
                                {playAgainText}
                            </Button>

                            <Button className="w-full" variant="secondary" onClick={onReset}>
                                Change Bet
                            </Button>
                        </div>
                    </CardFooter>
                </CardContent>
            )}
        </Card>
    );
};

export default MyGameSetupCard;
