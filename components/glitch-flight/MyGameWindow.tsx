"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ASSET_BASE, FlightRound, COUNTDOWN_SECONDS } from "./myGameConfig";

// ─── Seeded RNG — stable cloud/coin layout across renders ────────────────────
function seededRand(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        return (s >>> 0) / 0xffffffff;
    };
}

// ─── Cloud config ─────────────────────────────────────────────────────────────
interface CloudConfig {
    id: number;
    svgNum: number;
    baseDuration: number;
    delay: number;
    yStartPct: number;
    xStartPct: number;
    zFront: boolean;
    scale: number;
    opacity: number;
}

const CLOUDS: CloudConfig[] = Array.from({ length: 16 }, (_, i) => {
    const r = seededRand(i * 137 + 42);
    return {
        id: i,
        svgNum: (i % 9) + 1,
        baseDuration: 7 + r() * 12,
        delay: -(r() * 20),
        yStartPct: 5 + r() * 75,
        xStartPct: 95 + r() * 25,
        zFront: r() > 0.55,
        scale: 0.35 + r() * 0.9,
        opacity: 0.5 + r() * 0.5,
    };
});

// ─── Flying coins config ──────────────────────────────────────────────────────
interface CoinConfig {
    id: number;
    svgNum: number;
    baseDuration: number;
    delay: number;
    yStartPct: number;
    xStartPct: number;
    size: number;
    spinDuration: number;
}

const COINS: CoinConfig[] = Array.from({ length: 4 }, (_, i) => {
    const r = seededRand(i * 251 + 77);
    return {
        id: i,
        svgNum: (i % 3) + 1,
        baseDuration: 5 + r() * 8,
        delay: -(r() * 18),
        yStartPct: 20 + r() * 55,
        xStartPct: 96 + r() * 22,
        size: 26 + r() * 16,
        spinDuration: 1.4 + r() * 2,
    };
});

// ─── Multiplier-driven helpers ────────────────────────────────────────────────
function glitchIntensity(multiplier: number): 0 | 1 | 2 | 3 {
    if (multiplier < 2) return 0;
    if (multiplier < 5) return 1;
    if (multiplier < 10) return 2;
    return 3;
}

function multiplierColor(multiplier: number): string {
    if (multiplier < 2) return "#00FF94";
    if (multiplier < 5) return "#fde047";
    return "#fb923c";
}

/** Travel-animation speed factor — 1× at m=1, capped at ~6× for m≥25. */
function speedFactor(m: number): number {
    if (!isFinite(m) || m < 1) return 1;
    return Math.min(1 + (m - 1) * 0.22, 6);
}

// ─── Small presentational pieces ──────────────────────────────────────────────
function Cloud({ cfg }: { cfg: CloudConfig }): React.ReactElement {
    return (
        <img
            src={`${ASSET_BASE}/clouds/cloud_${cfg.svgNum}.svg`}
            alt=""
            draggable={false}
            style={{
                position: "absolute",
                top: `${cfg.yStartPct}%`,
                left: `${cfg.xStartPct}%`,
                width: `${cfg.scale * 208}px`,
                opacity: cfg.opacity,
                zIndex: cfg.zFront ? 20 : 8,
                animation: `gf-cloud-slide ${cfg.baseDuration}s linear ${cfg.delay}s infinite`,
                pointerEvents: "none",
                userSelect: "none",
                willChange: "transform",
                transformOrigin: "center center",
            }}
        />
    );
}

function GraphicSVG({ color }: { color: string }): React.ReactElement {
    return (
        <svg
            width="1562"
            height="550"
            viewBox="0 0 1562 550"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: "100%", display: "block", filter: `drop-shadow(0 0 9.7px ${color})`, transition: "filter 0.4s ease-out" }}
        >
            <defs>
                <linearGradient id="gf-grad" x1="774.5" y1="12.2031" x2="774.5" y2="564.203" gradientUnits="userSpaceOnUse">
                    <stop style={{ stopColor: color, stopOpacity: 0.81, transition: "stop-color 0.4s ease-out" }} />
                    <stop offset="0.9" style={{ stopColor: color, stopOpacity: 0, transition: "stop-color 0.4s ease-out" }} />
                </linearGradient>
            </defs>
            <path d="M33 450.203C661.8 447.403 1305.67 157.036 1549 12.2031V549.703H0L33 450.203Z" fill="url(#gf-grad)" />
            <path
                d="M1549 12.2031C1305.67 157.036 661.8 447.403 33 450.203"
                stroke={color}
                strokeWidth="5"
                strokeLinecap="round"
                style={{ transition: "stroke 0.4s ease-out" }}
            />
        </svg>
    );
}

function LogoCountdown({ fillKey, countdown, sf }: { fillKey: number; countdown: number; sf: number }): React.ReactElement {
    const lw = Math.round(144 * Math.max(0.55, sf));
    const lh = Math.round(151 * Math.max(0.55, sf));
    const fs = Math.round(45 * Math.max(0.6, sf));
    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: Math.round(16 * Math.max(0.6, sf)),
            }}
        >
            <div style={{ fontFamily: "monospace", fontSize: fs, fontWeight: 900, color: "white", lineHeight: 1, margin: 0 }}>
                {countdown}
            </div>

            <div style={{ position: "relative", width: lw, height: lh, flexShrink: 0 }}>
                <img
                    src={`${ASSET_BASE}/logo.svg`}
                    alt=""
                    draggable={false}
                    style={{ position: "absolute", inset: 0, width: lw, height: lh, opacity: 0.18, display: "block" }}
                />
                <img
                    key={fillKey}
                    src={`${ASSET_BASE}/logo.svg`}
                    alt=""
                    draggable={false}
                    style={{ position: "absolute", inset: 0, width: lw, height: lh, display: "block", animation: `gf-fill-progress ${COUNTDOWN_SECONDS}s linear forwards` }}
                />
            </div>

            <p style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,1)", letterSpacing: "0.22em", textTransform: "uppercase", margin: 0 }}>
                Preparing launch
            </p>
        </div>
    );
}

// ─── Multiplier overlay ───────────────────────────────────────────────────────
function MultiplierOverlay({ round }: { round: FlightRound }): React.ReactElement {
    const { phase, multiplier, cashedOutAt, revealedCrashPoint } = round;

    const color = useMemo(() => {
        if (phase === "crashed") return "text-white/80";
        if (multiplier < 2) return "text-[#00FF94]";
        if (multiplier < 5) return "text-yellow-300";
        return "text-orange-400";
    }, [multiplier, phase]);

    const glow = useMemo(() => {
        if (phase === "crashed") return "drop-shadow-[0_0_20px_rgba(255,255,255,0.25)]";
        if (multiplier < 2) return "drop-shadow-[0_0_20px_rgba(0,255,148,0.75)]";
        if (multiplier < 5) return "drop-shadow-[0_0_28px_rgba(255,240,0,0.7)]";
        return "drop-shadow-[0_0_36px_rgba(255,150,0,0.85)]";
    }, [multiplier, phase]);

    const hasCashedOut = cashedOutAt !== null && cashedOutAt > 0;

    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-start pt-5 z-30">
            <motion.div
                key="multiplier"
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-1"
            >
                <div className={`text-4xl sm:text-6xl md:text-7xl font-black font-mono transition-all duration-75 ${color} ${glow}`}>
                    {phase === "crashed" ? "CRASHED" : `${multiplier.toFixed(2)}x`}
                </div>

                {hasCashedOut && (
                    <motion.div
                        key="cashedOut"
                        initial={{ opacity: 0, y: 8, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", damping: 14, stiffness: 260 }}
                        className="flex flex-col items-center gap-0.5 mt-1"
                    >
                        <span className="text-xl sm:text-2xl font-black text-[#00FF94] drop-shadow-[0_0_18px_rgba(0,255,148,0.85)]">
                            APED OUT {cashedOutAt.toFixed(2)}x
                        </span>
                    </motion.div>
                )}

                {revealedCrashPoint !== null && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                        <span className="text-[10px] sm:text-xs text-white/45 font-mono uppercase tracking-[0.25em]">
                            Round crashed at {revealedCrashPoint.toFixed(2)}x
                        </span>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface MyGameWindowProps {
    round: FlightRound;
    sfxMuted: boolean;
}

// ─── Main scene ───────────────────────────────────────────────────────────────
const MyGameWindow: React.FC<MyGameWindowProps> = ({ round, sfxMuted }) => {
    const { phase, countdown, multiplier, cashedOutAt } = round;

    const [enterKey, setEnterKey] = useState<number>(0);
    const [fillKey, setFillKey] = useState<number>(0);
    const [boomKey, setBoomKey] = useState<number>(0);
    const [cloudsVisible, setCloudsVisible] = useState<boolean>(false);
    const [showGraphic, setShowGraphic] = useState<boolean>(false);
    const [showLandExit, setShowLandExit] = useState<boolean>(false);
    const [coinBurstKey, setCoinBurstKey] = useState<number>(0);
    const [showCoinBurst, setShowCoinBurst] = useState<boolean>(false);
    const [flashKey, setFlashKey] = useState<number>(0);
    const [showFlash, setShowFlash] = useState<boolean>(false);
    const [showCrashText, setShowCrashText] = useState<boolean>(false);
    const [crashTextExit, setCrashTextExit] = useState<boolean>(false);
    const [canvasW, setCanvasW] = useState<number>(800);

    const prevPhase = useRef<FlightRound["phase"]>(phase);
    const hasFiredCashoutAnim = useRef<boolean>(false);
    const cloudContainerRef = useRef<HTMLDivElement>(null);
    const coinContainerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const windAudioRef = useRef<HTMLAudioElement | null>(null);
    const sfxMutedRef = useRef<boolean>(sfxMuted);

    useEffect(() => {
        sfxMutedRef.current = sfxMuted;
        if (sfxMuted) windAudioRef.current?.pause();
        else if (phase === "running") windAudioRef.current?.play().catch(() => {});
    }, [sfxMuted, phase]);

    // Measure canvas width for responsive scaling
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        setCanvasW(el.clientWidth);
        const ro = new ResizeObserver(([e]) => setCanvasW(e.contentRect.width));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const sf = Math.min(1, canvasW / 800);
    const droidW = Math.round(281 * Math.max(0.45, sf));
    const boomW = Math.round(468 * Math.max(0.45, sf));

    const playSfx = (file: string, volume: number): void => {
        if (sfxMutedRef.current) return;
        const audio = new Audio(`${ASSET_BASE}/sfx/${file}`);
        audio.volume = volume;
        audio.play().catch(() => {});
    };

    // ── Phase transitions — visual state adjusts during render, side effects
    //    (audio, timers) run in the effect below.
    const [renderedPhase, setRenderedPhase] = useState<FlightRound["phase"]>(phase);
    if (renderedPhase !== phase) {
        setRenderedPhase(phase);
        if (phase === "countdown") {
            setFillKey((k) => k + 1);
        }
        if (phase === "running") {
            setEnterKey((k) => k + 1);
            setCloudsVisible(true);
            setShowGraphic(true);
            setShowLandExit(true);
        }
        if (phase === "crashed") {
            setBoomKey((k) => k + 1);
            setCloudsVisible(false);
            setCrashTextExit(false);
        }
        if (phase === "idle") {
            // Full visual reset — the scene must match first load exactly.
            setCloudsVisible(false);
            setShowGraphic(false);
            setShowLandExit(false);
            setShowCrashText(false);
            setCrashTextExit(false);
            setShowCoinBurst(false);
            setShowFlash(false);
        }
    }

    useEffect(() => {
        const prev = prevPhase.current;
        prevPhase.current = phase;

        if (prev !== "countdown" && phase === "countdown") {
            hasFiredCashoutAnim.current = false;
        }

        if (prev !== "running" && phase === "running") {
            if (!sfxMutedRef.current) {
                if (!windAudioRef.current) {
                    windAudioRef.current = new Audio(`${ASSET_BASE}/sfx/wind.mp3`);
                    windAudioRef.current.loop = true;
                }
                windAudioRef.current.volume = 0.35;
                windAudioRef.current.currentTime = 0;
                windAudioRef.current.play().catch(() => {});
            }
            const t = window.setTimeout(() => setShowLandExit(false), 800);
            return () => window.clearTimeout(t);
        }

        if (prev !== "crashed" && phase === "crashed") {
            windAudioRef.current?.pause();
            playSfx("boom.mp3", 0.6);
            const t1 = window.setTimeout(() => setShowGraphic(false), 200);
            const t2 = window.setTimeout(() => setShowCrashText(true), 400);
            const t3 = window.setTimeout(() => setCrashTextExit(true), 2000);
            const t4 = window.setTimeout(() => setShowCrashText(false), 2500);
            return () => {
                window.clearTimeout(t1);
                window.clearTimeout(t2);
                window.clearTimeout(t3);
                window.clearTimeout(t4);
            };
        }

        if (phase === "idle") {
            windAudioRef.current?.pause();
            hasFiredCashoutAnim.current = false;
        }
    }, [phase]);

    // Stop the wind loop on unmount
    useEffect(() => {
        return () => {
            windAudioRef.current?.pause();
        };
    }, []);

    // ── Smooth speed — update playbackRate on every multiplier tick ──
    useEffect(() => {
        if (phase !== "running") return;
        const speed = speedFactor(multiplier);
        [cloudContainerRef, coinContainerRef].forEach((ref) => {
            ref.current?.getAnimations({ subtree: true }).forEach((a) => {
                const name = a instanceof CSSAnimation ? a.animationName : "";
                if (name === "gf-cloud-slide" || name === "gf-coin-travel") {
                    a.playbackRate = speed;
                }
            });
        });
    }, [multiplier, phase]);

    // ── Coin burst + blue flash on cash-out — fires once per round ──
    const [renderedCashout, setRenderedCashout] = useState<number | null>(cashedOutAt);
    if (renderedCashout !== cashedOutAt) {
        setRenderedCashout(cashedOutAt);
        if (cashedOutAt !== null) {
            setCoinBurstKey((k) => k + 1);
            setShowCoinBurst(true);
            setFlashKey((k) => k + 1);
            setShowFlash(true);
        }
    }

    useEffect(() => {
        if (cashedOutAt !== null && !hasFiredCashoutAnim.current) {
            hasFiredCashoutAnim.current = true;
            playSfx("win.mp3", 0.5);
            windAudioRef.current?.pause();
            const t1 = window.setTimeout(() => setShowCoinBurst(false), 2200);
            const t2 = window.setTimeout(() => setShowFlash(false), 700);
            return () => {
                window.clearTimeout(t1);
                window.clearTimeout(t2);
            };
        }
    }, [cashedOutAt]);

    const intensity = phase === "running" ? glitchIntensity(multiplier) : 0;
    const graphicColor = phase === "crashed" ? "#f87171" : multiplierColor(multiplier);
    const showLand = phase === "idle" || phase === "countdown";
    const flying = phase === "running" && cashedOutAt === null;

    const glitchContent = (
        <div className="absolute inset-0 overflow-hidden" style={{ background: "#060b14" }}>
            <img
                src={`${ASSET_BASE}/bg.webp`}
                alt=""
                draggable={false}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ zIndex: 0, pointerEvents: "none" }}
            />
        </div>
    );

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 overflow-hidden select-none rounded-[8px]"
            style={{ background: "#060b14" }}
        >
            {/* ── Glitch wrapper: bg rendered 3× ── */}
            <div className={`gf-glitch-wrap gf-i${intensity} absolute inset-0`} style={{ zIndex: 1 }}>
                <div className="relative z-10 w-full h-full">{glitchContent}</div>
                <div className="gf-glitch-layer gf-l1" aria-hidden="true">{glitchContent}</div>
                <div className="gf-glitch-layer gf-l2" aria-hidden="true">{glitchContent}</div>
            </div>

            {/* ── Clouds ── */}
            <div
                ref={cloudContainerRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    zIndex: 2,
                    opacity: cloudsVisible ? 1 : 0,
                    transition: cloudsVisible ? "opacity 0.9s ease-in" : "opacity 2.8s ease-out",
                }}
            >
                {CLOUDS.map((cfg) => (
                    <Cloud key={cfg.id} cfg={cfg} />
                ))}
            </div>

            {/* ── Flying coins ── */}
            {phase === "running" && (
                <div ref={coinContainerRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 6 }}>
                    {COINS.map((cfg) => (
                        <div
                            key={cfg.id}
                            style={{
                                position: "absolute",
                                top: `${cfg.yStartPct}%`,
                                left: `${cfg.xStartPct}%`,
                                width: cfg.size,
                                height: cfg.size,
                                animation: `gf-coin-travel ${cfg.baseDuration}s linear ${cfg.delay}s infinite`,
                                willChange: "transform",
                            }}
                        >
                            <img
                                src={`${ASSET_BASE}/coins/coin${cfg.svgNum}.svg`}
                                alt=""
                                draggable={false}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "contain",
                                    display: "block",
                                    animation: `gf-coin-spin ${cfg.spinDuration}s linear infinite`,
                                }}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* ── Trajectory graphic — anchored to the droid's flame ── */}
            <AnimatePresence>
                {showGraphic && (
                    <motion.div
                        key={`graphic-${enterKey}`}
                        initial={{ x: "-40vw", y: "28vh", opacity: 0 }}
                        animate={{ x: 0, y: 0, opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], opacity: { duration: phase === "crashed" ? 0.15 : 0.5 } }}
                        style={{
                            position: "absolute",
                            width: "62%",
                            right: "50%",
                            top: `calc(30% + ${Math.round(60 * sf)}px)`,
                            zIndex: 2,
                            pointerEvents: "none",
                        }}
                    >
                        <div style={{ animation: "gf-graphic-sway 3.2s ease-in-out 1.5s infinite" }}>
                            <GraphicSVG color={graphicColor} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Droid / boom ── */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 25,
                    pointerEvents: "none",
                }}
            >
                <AnimatePresence mode="wait">
                    {phase === "running" && (
                        <motion.div
                            key={`droid-${flying ? "fly" : "out"}`}
                            initial={flying ? { x: "-38vw", y: "30vh", opacity: 0 } : { x: 0, y: 0, opacity: 1 }}
                            animate={flying ? { x: 0, y: 0, opacity: 1 } : { x: "45vw", y: "-45vh", opacity: 0 }}
                            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], opacity: { duration: flying ? 0.3 : 1.0 } }}
                            style={{ rotate: -22 }}
                        >
                            <img
                                key={`gif-${enterKey}`}
                                src={`${ASSET_BASE}/droid.gif?r=${enterKey}`}
                                alt="droid"
                                draggable={false}
                                style={{ width: droidW, height: "auto", display: "block" }}
                            />
                        </motion.div>
                    )}
                    {phase === "crashed" && (
                        <motion.div
                            key={`boom-${boomKey}`}
                            initial={{ opacity: 0, scale: 0.65 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.3 }}
                            transition={{ duration: 0.15 }}
                        >
                            <img
                                src={`${ASSET_BASE}/boom.gif?r=${boomKey}`}
                                alt="boom"
                                draggable={false}
                                style={{ width: boomW, height: boomW, objectFit: "contain", display: "block" }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Crashed text ── */}
            <AnimatePresence>
                {showCrashText && (
                    <motion.div
                        key="crash-text"
                        initial={{ scale: 0.2, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.05, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 380, damping: 22, opacity: { duration: 0.15 } }}
                        style={{
                            position: "absolute",
                            inset: 0,
                            zIndex: 20,
                            pointerEvents: "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <img
                            src={`${ASSET_BASE}/crashed.webp`}
                            alt="crashed"
                            draggable={false}
                            style={{
                                width: `${Math.round(450 * Math.max(0.45, sf))}px`,
                                maxWidth: "80%",
                                display: "block",
                                animation: crashTextExit ? "gf-crash-text-glitch 0.5s steps(1) forwards" : "none",
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Blue flash on cash-out ── */}
            {showFlash && (
                <div
                    key={`flash-${flashKey}`}
                    style={{
                        position: "absolute",
                        inset: 0,
                        zIndex: 50,
                        pointerEvents: "none",
                        background: "radial-gradient(ellipse at center, rgba(0,180,255,0.7) 0%, rgba(0,100,200,0.45) 50%, transparent 80%)",
                        animation: "gf-cashout-flash 0.7s ease-out forwards",
                    }}
                />
            )}

            {/* ── Coin burst on cash-out ── */}
            {showCoinBurst && (
                <div
                    key={`burst-${coinBurstKey}`}
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 51,
                        pointerEvents: "none",
                    }}
                >
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                        <img
                            key={i}
                            src={`${ASSET_BASE}/coins/coin${(i % 3) + 1}.svg`}
                            alt=""
                            draggable={false}
                            style={{
                                position: "absolute",
                                width: 22,
                                height: 22,
                                animation: `gf-coin-burst-${i} 2s cubic-bezier(0.22,1,0.36,1) forwards`,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* ── Speed lines ── */}
            {phase === "running" && multiplier > 3 && (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ zIndex: 4, opacity: Math.min((multiplier - 3) * 0.04, 0.35) }}
                >
                    {Array.from({ length: 10 }, (_, i) => (
                        <div
                            key={i}
                            style={{
                                position: "absolute",
                                top: `${10 + i * 8}%`,
                                right: 0,
                                width: `${30 + (i % 3) * 20}%`,
                                height: "1px",
                                background: "linear-gradient(to left, transparent, rgba(255,255,255,0.4), transparent)",
                                transform: "rotate(-24deg)",
                                transformOrigin: "right center",
                            }}
                        />
                    ))}
                </div>
            )}

            {/* ── Land ── */}
            {showLand && (
                <div
                    style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        zIndex: 1,
                        pointerEvents: "none",
                        animation: "gf-land-enter 0.55s cubic-bezier(0.22,1,0.36,1) forwards",
                    }}
                >
                    <img src={`${ASSET_BASE}/land.webp`} alt="" draggable={false} style={{ width: "100%", display: "block" }} />
                </div>
            )}
            {showLandExit && (
                <div
                    style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        zIndex: 1,
                        pointerEvents: "none",
                        animation: "gf-land-exit 0.7s cubic-bezier(0.55,0,1,0.45) forwards",
                    }}
                >
                    <img src={`${ASSET_BASE}/land.webp`} alt="" draggable={false} style={{ width: "100%", display: "block" }} />
                </div>
            )}

            {/* ── Idle hint ── */}
            {phase === "idle" && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        zIndex: 40,
                        pointerEvents: "none",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 14,
                    }}
                >
                    <img
                        src={`${ASSET_BASE}/logo.svg`}
                        alt="Glitch Flight"
                        draggable={false}
                        style={{ width: Math.round(120 * Math.max(0.55, sf)), opacity: 0.9, display: "block" }}
                    />
                    <p
                        style={{
                            fontFamily: "monospace",
                            fontSize: 11,
                            fontWeight: 700,
                            color: "rgba(255,255,255,0.65)",
                            letterSpacing: "0.22em",
                            textTransform: "uppercase",
                            margin: 0,
                        }}
                    >
                        Place your bet to launch
                    </p>
                </div>
            )}

            {/* ── Countdown preloader ── */}
            <AnimatePresence>
                {phase === "countdown" && (
                    <motion.div
                        key="preloader"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ position: "absolute", inset: 0, zIndex: 100, pointerEvents: "none" }}
                    >
                        <LogoCountdown fillKey={fillKey} countdown={countdown} sf={sf} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Multiplier / status overlay ── */}
            {phase !== "idle" && phase !== "countdown" && <MultiplierOverlay round={round} />}
        </div>
    );
};

export default MyGameWindow;
