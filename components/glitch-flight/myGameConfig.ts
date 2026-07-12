import { Game } from "@/lib/games";
import { Hex } from "viem";

/**
 * Layout mode for this game.
 * Glitch Flight uses the classic two-column crash layout:
 * flight scene on the left, bet panel on the right.
 */
export type GameLayout = "two-column" | "full-size";

export const myGameLayout: GameLayout = "two-column";

/** Base URL for all static assets of this game (under public/). */
export const ASSET_BASE = "/glitch-flight";

export const myGame: Game = {
    title: "Glitch Flight",
    description:
        "Pick a target multiplier and launch the glitch droid. Reach the target before the crash and win bet x target — crash first and the bet is gone.",
    gameAddress: "0x1234567890123456789012345678901234567890",
    gameBackground: `${ASSET_BASE}/bg.webp`,
    card: `${ASSET_BASE}/card.png`,
    banner: `${ASSET_BASE}/banner.png`,
    themeColorBackground: "#3b82f6",
    song: `${ASSET_BASE}/audio/song.mp3`,
    // Crash games do not use a combinatorial payout table — the payout
    // multiplier is the pre-selected flight target (or 0x on a crash).
    // Kept minimal to satisfy the Game type.
    payouts: {
        0: { 0: { 0: 0 } },
    },
};

// ─── Betting bounds ───────────────────────────────────────────────────────────

export const MIN_BET = 1;
export const MAX_BET = 100;

/**
 * Bounds for the flight target multiplier — the only bet parameter besides
 * the wager. The round is resolved fully on-chain: the droid reaches the
 * target (payout = bet x target) or crashes first (payout = 0x). The ceiling
 * stays below CRASH_CAP so every selectable target is winnable.
 */
export const TARGET_MIN = 1.01;
export const TARGET_MAX = 200;
export const TARGET_DEFAULT = 2.0;

export function clampTarget(value: number): number {
    if (!Number.isFinite(value)) return TARGET_DEFAULT;
    return parseFloat(Math.min(TARGET_MAX, Math.max(TARGET_MIN, value)).toFixed(2));
}

// ─── Crash math ───────────────────────────────────────────────────────────────
// The on-chain random word fully determines the crash point, so a round can be
// replayed (rewatch) without a new transaction and audited after the fact.
// Final house-edge / cap values are protocol-configured at integration time.

/** Probability that a round instantly busts at 1.00x (primary house edge). */
export const HOUSE_EDGE = 0.05;

/**
 * Hard ceiling for the crash point — protects the house pool from extreme
 * heavy-tail outliers. Protocol-configured at integration time; must stay
 * above TARGET_MAX so the whole preset range remains winnable.
 */
export const CRASH_CAP = 500;

/**
 * Exponential multiplier growth rate (per millisecond of flight time):
 * multiplier(t) = e^(t · GROWTH_RATE). Reaches 2x at ~5s and 10x at ~16.5s.
 */
export const GROWTH_RATE = 0.00014;

/** Multiplier value at flight time `elapsedMs`. */
export function multiplierAt(elapsedMs: number): number {
    return parseFloat(Math.exp(elapsedMs * GROWTH_RATE).toFixed(2));
}

/** Flight time (ms) at which the given multiplier is reached. */
export function elapsedAtMultiplier(multiplier: number): number {
    return Math.log(Math.max(1, multiplier)) / GROWTH_RATE;
}

/**
 * Derives the crash point from the game's 32-byte random word.
 * Mirrors the provably-fair curve used by the original Glitch Flight
 * game server: 1/(1-u) style heavy-tail distribution with an instant-bust
 * house edge and a tiered ceiling.
 */
export function computeCrashPoint(randomWord: Hex): number {
    const h = parseInt(randomWord.slice(2, 10), 16);
    const e = 2 ** 32;

    if (h % Math.round(1 / HOUSE_EDGE) === 0) return 1.0;

    const raw = Math.floor((100 * e - h) / (e - h)) / 100;
    return Math.min(CRASH_CAP, Math.max(1.0, raw));
}

// ─── Shared types ─────────────────────────────────────────────────────────────

/** Visual phase of the flight scene. */
export type FlightPhase = "idle" | "running" | "crashed";

/** Everything the window needs to render one frame of the round. */
export interface FlightRound {
    phase: FlightPhase;
    /** Live multiplier while running; final value after crash. */
    multiplier: number;
    /** Target multiplier once the droid has reached it, or null before/never. */
    targetHitAt: number | null;
    /** Crash point revealed once the round is over (null while hidden). */
    revealedCrashPoint: number | null;
}

export const INITIAL_ROUND: FlightRound = {
    phase: "idle",
    multiplier: 1.0,
    targetHitAt: null,
    revealedCrashPoint: null,
};
