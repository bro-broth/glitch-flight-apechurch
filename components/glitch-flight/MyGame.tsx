"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { randomBytes, Game } from "@/lib/games";
import GameWindow from "@/components/shared/GameWindow";
import MyGameWindow from "./MyGameWindow";
import MyGameSetupCard from "./MyGameSetupCard";
import MyGameResultsModal from "./MyGameResultsModal";
import {
    myGame,
    computeCrashPoint,
    multiplierAt,
    INITIAL_ROUND,
    FlightRound,
    MIN_BET,
    MAX_BET,
    TARGET_DEFAULT,
    clampTarget,
} from "./myGameConfig";
import { bytesToHex, Hex } from "viem";
import { toast } from "sonner";
import "./glitch-flight.styles.css";

interface MyGameComponentProps {
    /** Passed by the template app page; omitted on the submissions preview site. */
    game?: Game;
}

/** Outcome of the last completed round, kept for rewatch. */
interface RoundRecord {
    crashPoint: number;
    target: number;
    betAmount: number;
    payout: number;
}

const MyGameComponent: React.FC<MyGameComponentProps> = ({ game: gameProp }) => {
    const game = gameProp ?? myGame;
    const router = useRouter();
    const searchParams = useSearchParams();
    const replayIdString = searchParams.get("id");
    const walletBalance = 25; // TODO: get wallet balance from wallet

    const [currentView, setCurrentView] = useState<0 | 1 | 2>(0); // 0: setup, 1: ongoing, 2: game over
    const [isGameOngoing, setIsGameOngoing] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [betAmount, setBetAmount] = useState<number>(0);
    const [payout, setPayout] = useState<number | null>(null);
    const [gameOver, setGameOver] = useState<boolean>(false);
    const [round, setRound] = useState<FlightRound>(INITIAL_ROUND);
    const [sfxMuted, setSfxMuted] = useState<boolean>(false);
    // The single bet parameter besides the wager: the flight target multiplier.
    // The whole round is resolved on-chain from (bet, target, random word) —
    // there are no mid-flight decisions.
    const [targetMultiplier, setTargetMultiplier] = useState<number>(TARGET_DEFAULT);

    // ── Timers ── all animation timers live here so handleReset can kill them.
    const rafRef = useRef<number | null>(null);
    const timeoutsRef = useRef<number[]>([]);

    // ── Round bookkeeping ──
    const activeBetRef = useRef<number>(0);
    const activeTargetRef = useRef<number>(TARGET_DEFAULT);
    const lastRoundRef = useRef<RoundRecord | null>(null);

    const [currentGameId, setCurrentGameId] = useState<bigint>(
        replayIdString == null
            ? BigInt(bytesToHex(new Uint8Array(randomBytes(32))))
            : BigInt(replayIdString)
    );
    const [userRandomWord, setUserRandomWord] = useState<Hex>(
        bytesToHex(new Uint8Array(randomBytes(32)))
    );

    useEffect(() => {
        if (replayIdString !== null && replayIdString.length > 2) {
            setIsLoading(true);
            setCurrentGameId(BigInt(replayIdString));
        }
    }, [replayIdString]);

    const clearAllTimers = useCallback((): void => {
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        timeoutsRef.current.forEach((id) => window.clearTimeout(id));
        timeoutsRef.current = [];
    }, []);

    useEffect(() => clearAllTimers, [clearAllTimers]);

    const queueTimeout = useCallback((fn: () => void, ms: number): void => {
        timeoutsRef.current.push(window.setTimeout(fn, ms));
    }, []);

    /** Ends the round: reveals the crash point and opens the results view. */
    const finishRound = useCallback(
        (finalPayout: number, crashPoint: number, delayMs: number): void => {
            lastRoundRef.current = {
                crashPoint,
                target: activeTargetRef.current,
                betAmount: activeBetRef.current,
                payout: finalPayout,
            };
            queueTimeout(() => {
                setRound((r) => ({ ...r, revealedCrashPoint: crashPoint }));
                setPayout(finalPayout);
                setCurrentView(2);
                setGameOver(true);
                setIsGameOngoing(false);
            }, delayMs);
        },
        [queueTimeout]
    );

    /**
     * Animates one fully-determined flight: the outcome is already fixed by
     * (crash point, target) — the droid either reaches the target (payout =
     * bet x target) or crashes first (payout = 0). Used for live rounds and
     * rewatch alike since both replay the same on-chain data.
     */
    const startFlight = useCallback(
        (crashPoint: number, target: number, roundBet: number): void => {
            activeTargetRef.current = target;
            activeBetRef.current = roundBet;
            const willHitTarget = target < crashPoint;

            const takeoff = performance.now();
            setRound({ ...INITIAL_ROUND, phase: "running", multiplier: 1.0 });

            const tick = (now: number): void => {
                const m = multiplierAt(now - takeoff);

                // Target check runs before the crash check so a frame that jumps
                // past both still lands on the legitimately lower target.
                if (willHitTarget && m >= target) {
                    setRound((r) => ({ ...r, multiplier: target, targetHitAt: target }));
                    finishRound(roundBet * target, crashPoint, 1800);
                    return;
                }

                if (m >= crashPoint) {
                    setRound((r) => ({ ...r, phase: "crashed", multiplier: crashPoint }));
                    finishRound(0, crashPoint, 2000);
                    return;
                }

                setRound((r) => ({ ...r, multiplier: m }));
                rafRef.current = requestAnimationFrame(tick);
            };
            rafRef.current = requestAnimationFrame(tick);
        },
        [finishRound]
    );

    // GAME FUNCTIONS

    const playGame = async (gameId?: bigint, randomWord?: Hex): Promise<void> => {
        if (betAmount < MIN_BET || betAmount > MAX_BET) {
            toast.error(`Bet must be between ${MIN_BET} and ${MAX_BET} APE.`);
            return;
        }
        if (betAmount > walletBalance) {
            toast.error("Insufficient balance.");
            return;
        }
        const target = clampTarget(targetMultiplier);

        setIsLoading(true);
        setIsGameOngoing(true);

        const gameIdToUse = gameId ?? currentGameId;
        const randomWordToUse = randomWord ?? userRandomWord;

        try {
            // Mock on-chain transaction — replaced by the platform at integration.
            // The bet amount and target multiplier are the wager parameters; the
            // chain's random word resolves the round.
            console.log("playGame: mock tx", {
                gameId: gameIdToUse.toString(16),
                randomWord: randomWordToUse,
                betAmount,
                target,
            });
            const receiptSuccess = true;

            if (receiptSuccess) {
                // The random word fully determines this round's crash point.
                const crashPoint = computeCrashPoint(randomWordToUse);

                toast.success("Transaction complete!");
                queueTimeout(() => {
                    setIsLoading(false);
                    setCurrentView(1);
                    startFlight(crashPoint, target, betAmount);
                }, 800);
            } else {
                toast.info("Something went wrong..");
                setIsLoading(false);
                setIsGameOngoing(false);
            }
        } catch (error) {
            if (
                (error instanceof Error && error.message.includes("Transaction not found")) ||
                (typeof error === "string" && error.includes("Transaction not found"))
            ) {
                return;
            }
            toast.error("An unexpected error occurred.");
            setIsLoading(false);
            setIsGameOngoing(false);
        }
    };

    const handleReset = (isPlayingAgain: boolean = false): void => {
        clearAllTimers();

        if (!isPlayingAgain) {
            setCurrentGameId(BigInt(bytesToHex(new Uint8Array(randomBytes(32)))));
            setUserRandomWord(bytesToHex(new Uint8Array(randomBytes(32))));
        }

        activeBetRef.current = 0;

        setRound(INITIAL_ROUND);
        setCurrentView(0);
        setPayout(null);
        setGameOver(false);
        setIsGameOngoing(false);
        setIsLoading(false);

        if (replayIdString !== null) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("id");
            router.replace(`?${params.toString()}`, { scroll: false });
        }
    };

    const handlePlayAgain = async (): Promise<void> => {
        const newGameId = BigInt(bytesToHex(new Uint8Array(randomBytes(32))));
        const newUserWord = bytesToHex(new Uint8Array(randomBytes(32)));

        setCurrentGameId(newGameId);
        setUserRandomWord(newUserWord);

        handleReset(true);

        await playGame(newGameId, newUserWord);
    };

    /** Replays the previous round from its recorded data — no new transaction. */
    const handleRewatch = (): void => {
        const record = lastRoundRef.current;
        if (record === null) return;

        clearAllTimers();

        setRound(INITIAL_ROUND);
        setPayout(null);
        setGameOver(false);
        setIsGameOngoing(false);
        setCurrentView(1);

        startFlight(record.crashPoint, record.target, record.betAmount);
    };

    const shouldShowPNL: boolean = !!payout && payout > (activeBetRef.current || 0);
    const playAgainText = "Play Again";

    return (
        <div>
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-8 lg:gap-10">
                <GameWindow
                    game={game}
                    currentGameId={currentGameId}
                    isLoading={isLoading}
                    isGameFinished={gameOver}
                    // onPlayAgain deliberately omitted: it disables the built-in
                    // GameResultsModal so the game-styled MyGameResultsModal below
                    // handles the end-of-round flow instead.
                    playAgainText={playAgainText}
                    onRewatch={handleRewatch}
                    onReset={() => handleReset(false)}
                    betAmount={activeBetRef.current || betAmount}
                    payout={payout}
                    inReplayMode={replayIdString !== null}
                    isUserOriginalPlayer={true}
                    showPNL={shouldShowPNL}
                    isGamePaused={false}
                    onSfxMutedChange={setSfxMuted}
                >
                    <MyGameWindow round={round} sfxMuted={sfxMuted} />
                    <MyGameResultsModal
                        open={gameOver}
                        payout={payout}
                        betAmount={activeBetRef.current || betAmount}
                        targetHitAt={round.targetHitAt}
                        crashPoint={round.revealedCrashPoint}
                        playAgainText={playAgainText}
                        onPlayAgain={handlePlayAgain}
                        onRewatch={handleRewatch}
                        onReset={() => handleReset(false)}
                    />
                </GameWindow>

                <MyGameSetupCard
                    game={game}
                    onPlay={async () => await playGame()}
                    onRewatch={handleRewatch}
                    onReset={() => handleReset(false)}
                    onPlayAgain={async () => await handlePlayAgain()}
                    playAgainText={playAgainText}
                    currentView={currentView}
                    betAmount={currentView === 0 ? betAmount : activeBetRef.current || betAmount}
                    setBetAmount={setBetAmount}
                    isLoading={isLoading}
                    payout={payout}
                    round={round}
                    inReplayMode={replayIdString !== null}
                    walletBalance={walletBalance}
                    isGamePaused={false}
                    minBet={MIN_BET}
                    maxBet={MAX_BET}
                    targetMultiplier={currentView === 0 ? targetMultiplier : activeTargetRef.current}
                    setTargetMultiplier={setTargetMultiplier}
                />
            </div>
        </div>
    );
};

export default MyGameComponent;
