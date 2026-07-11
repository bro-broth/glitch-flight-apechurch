import { Game } from "@/lib/games";
import { Hex } from "viem";

/**
 * Layout mode for this game.
 * Glitch Flight uses the classic two-column crash layout:
 * flight scene on the left, bet / cash-out panel on the right.
 */
export type GameLayout = "two-column" | "full-size";

export const myGameLayout: GameLayout = "two-column";

/** Base URL for all static assets of this game (under public/). */
export const ASSET_BASE = "/glitch-flight";

export const myGame: Game = {
    title: "Glitch Flight",
    description:
        "The glitch droid takes off and the multiplier climbs. Cash out before the crash to win — hold too long and you lose everything.",
    gameAddress: "0x1234567890123456789012345678901234567890",
    gameBackground: `${ASSET_BASE}/bg.webp`,
    card: `${ASSET_BASE}/card.png`,
    banner: `${ASSET_BASE}/banner.png`,
    themeColorBackground: "#3b82f6",
    song: `${ASSET_BASE}/audio/song.mp3`,
    // Crash games do not use a combinatorial payout table — the payout
    // multiplier is the live multiplier locked at the moment of cash-out
    // (or 0x on crash). Kept minimal to satisfy the Game type.
    payouts: {
        0: { 0: { 0: 0 } },
    },
};

// ─── Betting bounds ───────────────────────────────────────────────────────────

export const MIN_BET = 1;
export const MAX_BET = 100;

// ─── Crash math ───────────────────────────────────────────────────────────────
// The on-chain random word fully determines the crash point, so a round can be
// replayed (rewatch) without a new transaction and audited after the fact.
// Final house-edge / cap values are protocol-configured at integration time.

/** Probability that a round instantly busts at 1.00x (primary house edge). */
export const HOUSE_EDGE = 0.05;

/**
 * Multi-tier crash-point cap — prevents extreme outliers while keeping the
 * top end varied. When the raw crash point exceeds CAP_TIER_1, a second,
 * independent slice of the random word picks the effective ceiling:
 * 70% → CAP_TIER_1, 22% → CAP_TIER_2, 8% → CAP_TIER_3.
 */
export const CAP_TIER_1 = 47.4;
export const CAP_TIER_2 = 56.2;
export const CAP_TIER_3 = 65.51;
const CAP_TIER_2_PCT = 70;
const CAP_TIER_3_PCT = 92;

/**
 * Exponential multiplier growth rate (per millisecond of flight time):
 * multiplier(t) = e^(t · GROWTH_RATE). Reaches 2x at ~5s and 10x at ~16.5s.
 */
export const GROWTH_RATE = 0.00014;

/** Countdown (seconds) before the droid launches. */
export const COUNTDOWN_SECONDS = 3;

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
    const base = Math.max(1.0, raw);

    if (base <= CAP_TIER_1) return base;

    const capRoll = parseInt(randomWord.slice(10, 18), 16) % 100;
    if (capRoll < CAP_TIER_2_PCT) return CAP_TIER_1;
    if (capRoll < CAP_TIER_3_PCT) return CAP_TIER_2;
    return CAP_TIER_3;
}

// ─── Shared types ─────────────────────────────────────────────────────────────

/** Visual phase of the flight scene. */
export type FlightPhase = "idle" | "countdown" | "running" | "crashed";

/** Everything the window needs to render one frame of the round. */
export interface FlightRound {
    phase: FlightPhase;
    /** Seconds left before launch (only meaningful during countdown). */
    countdown: number;
    /** Live multiplier while running; final value after crash. */
    multiplier: number;
    /** Multiplier the player locked in, or null if they never cashed out. */
    cashedOutAt: number | null;
    /** Crash point revealed once the round is over (null while hidden). */
    revealedCrashPoint: number | null;
}

export const INITIAL_ROUND: FlightRound = {
    phase: "idle",
    countdown: COUNTDOWN_SECONDS,
    multiplier: 1.0,
    cashedOutAt: null,
    revealedCrashPoint: null,
};
