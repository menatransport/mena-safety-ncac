"use client";

// =============================================================================
// LessonPlayer — จอวิดีโอเต็มจอของบทเรียน
// -----------------------------------------------------------------------------
// กติกาที่ต้องบังคับให้ได้ ไม่ว่าวิดีโอจะเป็นไฟล์บน S3 หรือลิงก์ YouTube
//   ① ลากข้ามไปข้างหน้าไม่ได้ — ย้อนกลับไปดูซ้ำได้ แต่ห้ามกระโดดไปท้ายคลิป
//   ② ปุ่ม "ดูจบแล้ว · ทำแบบทดสอบ" จะโผล่ก็ต่อเมื่อวิดีโอเล่นจนจบจริง
//   ③ คำถามที่ผูกเวลาไว้ (time_sec) จะหยุดวิดีโอแล้วถามตรงจุดนั้น ตอบแล้วเล่นต่อ
//
// ไฟล์ S3 : ไม่ใส่ controls ของ browser เลย ผู้เรียนจึงไม่มีแถบเลื่อนให้ลาก
//           แล้วดักเหตุการณ์ seek/ratechange ไว้อีกชั้นเผื่อสั่งจาก devtools
// YouTube : ต้องคุมผ่าน IFrame Player API (controls:0, disablekb:1, fs:0)
//           แล้ว poll เวลาเองทุก 250ms เพราะ iframe เปล่า ๆ อ่านเวลาไม่ได้
//           ถ้าโหลด API ไม่สำเร็จ (เน็ตองค์กรบล็อก) จะถอยไปเป็น iframe ปกติ
//           + ให้กดยืนยันเอง ไม่งั้นผู้เรียนจะติดค้างเรียนต่อไม่ได้เลย
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { Lock, Play, X } from "lucide-react";

import type { LessonQuestion } from "../type";
import { formatClock, youtubeEmbed, youtubeId } from "../constant";
import { LOCKED_PLAYER_VARS, loadYouTubeApi, type YTPlayer } from "./youtube";

/** คำถามที่ผูกเวลา พร้อมตำแหน่งเดิมในอาร์เรย์ questions (ใช้ตอนส่งคำตอบ) */
export type TimedQuestion = { index: number; question: LessonQuestion };

type Props = {
    url: string;
    title: string;
    /** บรรทัดรองใต้ชื่อเรื่อง เช่น "ขั้นที่ 2 จาก 3" */
    subtitle?: string;
    timedQuestions: TimedQuestion[];
    /** คำตอบทั้งชุด (-1 = ยังไม่ตอบ) ใช้เช็กว่าคำถามข้อนี้ถามไปหรือยัง */
    answers: number[];
    onAnswer: (questionIndex: number, choice: number) => void;
    onExit: () => void;
    /** ดูจบแล้ว — ไปขั้นถัดไป */
    onFinish: () => void;
};

/** เผื่อให้การ buffer/ปัดเศษไม่ถูกมองว่าเป็นการลากข้าม */
const SEEK_TOLERANCE = 1.5;

export function LessonPlayer({
    url,
    title,
    subtitle,
    timedQuestions,
    answers,
    onAnswer,
    onExit,
    onFinish,
}: Props) {
    const ytId = youtubeId(url);

    const videoRef = useRef<HTMLVideoElement>(null);
    const hostRef = useRef<HTMLDivElement>(null);
    const ytRef = useRef<YTPlayer | null>(null);
    /** วินาทีที่ดูไปถึงจริง — เพดานกันลากข้าม (เก็บเป็น ref เพราะ handler อ่านค่าล่าสุด) */
    const watchedRef = useRef(0);

    const [current, setCurrent] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [ended, setEnded] = useState(false);
    const [asking, setAsking] = useState<TimedQuestion | null>(null);
    /** โหลด YouTube API ไม่ได้ — ถอยไปโหมดฝังธรรมดา */
    const [ytFailed, setYtFailed] = useState(false);

    /**
     * รวมค่าที่ตัวจับเวลาต้องใช้ไว้ใน ref เดียว
     * ไม่งั้น interval ของ YouTube ต้องถูกสร้างใหม่ทุกครั้งที่คำตอบเปลี่ยน
     */
    const gate = useRef({ answers, asking, timed: timedQuestions, ended, duration });
    gate.current = { answers, asking, timed: timedQuestions, ended, duration };

    /* ── คำสั่งกลาง ใช้ได้กับทั้งสองเครื่องเล่น ── */
    const pause = useCallback(() => {
        if (ytRef.current) ytRef.current.pauseVideo();
        videoRef.current?.pause();
    }, []);

    const start = useCallback(() => {
        if (ytRef.current) ytRef.current.playVideo();
        else videoRef.current?.play();
    }, []);

    const seek = useCallback((seconds: number) => {
        if (ytRef.current) ytRef.current.seekTo(seconds, true);
        else if (videoRef.current) videoRef.current.currentTime = seconds;
    }, []);

    /**
     * ตัดจบวิดีโอแบบล็อกถาวร — เรียกได้จากทั้ง event "จบจริง" ของเครื่องเล่น
     * และจากการเดา (ดูฟังก์ชัน tick) เผื่อมือถือบางรุ่นไม่ยิง event ตอนจบให้
     * หยุดเล่นซ้ำด้วยเสมอ กันเครื่องเล่นบางมือถือรีเพลย์เองหลังจบ (เช่น จาก
     * ปุ่ม replay ของ UI เครื่องเล่นที่เราคุมไม่ได้) แล้วดูเหมือนบทเรียนวนซ้ำไม่จบ
     */
    const markEnded = useCallback(() => {
        setEnded(true);
        setPlaying(false);
        pause();
    }, [pause]);

    /**
     * เรียกทุกครั้งที่เวลาขยับ ไม่ว่าจะมาจาก <video> หรือ YouTube
     * ทำ 3 อย่าง: จดเพดานเวลาที่ดูถึงจริง, เช็กว่าถึงคิวคำถามแทรกหรือยัง,
     * และเผื่อกรณีมือถือบางรุ่น/บางเครือข่ายไม่ยิง event "จบวิดีโอ" ตรง ๆ
     * (เจอบ่อยกับสตรีมที่ duration ที่รายงานมาไม่ตรงเป๊ะ) ก็ถือว่าจบเมื่อ
     * เวลาที่เล่นใกล้ duration มากพอแทน จะได้ไม่ค้างไม่มีปุ่มไปต่อ
     */
    const tick = useCallback(
        (t: number) => {
            setCurrent(t);
            if (t > watchedRef.current) watchedRef.current = t;

            const g = gate.current;
            if (!g.ended && g.duration > 0 && t >= g.duration - 0.4) {
                markEnded();
                return;
            }
            if (g.asking) return;

            const due = g.timed.find(
                (q) => g.answers[q.index] < 0 && t >= (q.question.time_sec ?? 0)
            );
            if (due) {
                pause();
                setPlaying(false);
                setAsking(due);
            }
        },
        [pause, markEnded]
    );

    /* ── สร้างเครื่องเล่น YouTube ── */
    useEffect(() => {
        if (!ytId) return;

        let cancelled = false;
        let timer = 0;
        let player: YTPlayer | null = null;

        loadYouTubeApi()
            .then((YT) => {
                const host = hostRef.current;
                if (cancelled || !host) return;

                // สร้าง element ให้ API เอง เพราะ API จะแทนที่ node นั้นทิ้ง
                // ถ้าปล่อยให้ React เป็นเจ้าของ node ตอน unmount จะพัง
                const mount = document.createElement("div");
                mount.style.width = "100%";
                mount.style.height = "100%";
                host.appendChild(mount);

                player = new YT.Player(mount, {
                    videoId: ytId,
                    playerVars: { ...LOCKED_PLAYER_VARS },
                    events: {
                        onReady: (e) => {
                            if (!cancelled) setDuration(e.target.getDuration() || 0);
                        },
                        onStateChange: (e) => {
                            if (cancelled) return;
                            if (e.data === YT.PlayerState.ENDED) {
                                markEnded();
                            } else if (e.data === YT.PlayerState.PLAYING) {
                                // เจอจบไปแล้วแต่ยังมี event เล่นเข้ามาอีก (เช่น ผู้เรียนกด
                                // replay จาก UI ของเครื่องเล่นที่เราคุมไม่ได้) ให้หยุดกลับทันที
                                if (gate.current.ended) {
                                    e.target.pauseVideo();
                                    return;
                                }
                                setPlaying(true);
                                setDuration((d) => d || e.target.getDuration() || 0);
                            } else if (e.data === YT.PlayerState.PAUSED) {
                                setPlaying(false);
                            }
                        },
                    },
                });
                ytRef.current = player;

                // iframe อ่านเวลาเองไม่ได้ ต้องถามเป็นระยะ
                timer = window.setInterval(() => {
                    const p = ytRef.current;
                    if (!p) return;
                    const t = p.getCurrentTime();
                    if (!Number.isFinite(t)) return;

                    // กันสั่ง seek จากภายนอก (extension / devtools) ให้เด้งกลับจุดที่ดูค้างไว้
                    if (t > watchedRef.current + SEEK_TOLERANCE) {
                        p.seekTo(watchedRef.current, true);
                        return;
                    }
                    tick(t);
                }, 250);
            })
            .catch(() => {
                if (!cancelled) setYtFailed(true);
            });

        return () => {
            cancelled = true;
            if (timer) window.clearInterval(timer);
            try {
                player?.destroy();
            } catch {
                /* ผู้เล่นถูกถอดไปแล้ว ไม่ต้องทำอะไรต่อ */
            }
            ytRef.current = null;
            if (hostRef.current) hostRef.current.innerHTML = "";
        };
    }, [ytId, tick]);

    /* ── ตัวจัดการเฉพาะ <video> ของ browser ── */
    const handleTimeUpdate = () => {
        const el = videoRef.current;
        if (el) tick(el.currentTime);
    };

    /** กันลากข้ามไปข้างหน้าเกินจุดที่เคยดู */
    const handleSeeking = () => {
        const el = videoRef.current;
        if (!el) return;
        if (el.currentTime > watchedRef.current + SEEK_TOLERANCE) {
            el.currentTime = watchedRef.current;
        }
    };

    /** กันเร่งความเร็วเพื่อรีบให้จบ */
    const handleRateChange = () => {
        const el = videoRef.current;
        if (el && el.playbackRate !== 1) el.playbackRate = 1;
    };

    /**
     * ดูจบแล้วแต่ยังมี event "เล่น" เข้ามาอีก (เช่น มือถือบางรุ่นเรียก .play()
     * ให้เองตอนสั่ง seek ใกล้จุดจบ หรือผู้เรียนกดปุ่มเล่นซ้ำจาก UI ของระบบ
     * ที่เราคุมไม่ได้) ให้หยุดกลับทันที ไม่ปล่อยให้วิดีโอวนเล่นใหม่
     */
    const handlePlay = () => {
        if (ended) {
            videoRef.current?.pause();
            return;
        }
        setPlaying(true);
    };

    const toggle = () => {
        if (asking || ended) return;
        if (playing) {
            pause();
            setPlaying(false);
        } else {
            start();
            setPlaying(true);
        }
    };

    /** แตะแถบความคืบหน้าเพื่อย้อนดูซ้ำ — ไปได้ไม่เกินจุดที่ดูไปถึงแล้ว */
    const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!duration || asking) return;
        const box = e.currentTarget.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
        seek(Math.min(ratio * duration, watchedRef.current));
    };

    const pickAnswer = (choice: number) => {
        if (!asking) return;
        onAnswer(asking.index, choice);
        setAsking(null);
        if (!ended) {
            start();
            setPlaying(true);
        }
    };

    /* ── ไม่มีวิดีโอ: ข้ามไปทำแบบทดสอบได้เลย ── */
    useEffect(() => {
        if (!url) onFinish();
    }, [url, onFinish]);

    if (!url) return null;

    /* ── โหมดถอย: คุม YouTube ไม่ได้จริง ๆ ── */
    if (ytId && ytFailed) {
        return (
            <div className="flex min-h-dvh flex-col bg-lsn-ink text-white lg:min-h-full">
                <div className="flex items-center justify-between px-[18px] py-4">
                    <button
                        type="button"
                        onClick={onExit}
                        aria-label="ออก"
                        className="flex size-[34px] items-center justify-center rounded-full bg-white/15 transition active:scale-95"
                    >
                        <X className="size-4" />
                    </button>
                    <span className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-light">
                        ดูให้จบก่อนทำแบบทดสอบ
                    </span>
                </div>

                <div className="relative flex-1">
                    {/* คุมผ่าน IFrame API ไม่ได้แล้ว (เน็ตมือถือบล็อกสคริปต์บ่อย) แต่ยังใส่พารามิเตอร์
                        เท่าที่ query string ทำได้ กันแถบเลื่อน/หน้าจอ "ดูอีกครั้ง" ของ YouTube โผล่มา
                        เหมือนโหมดคุมเต็ม — ปุ่ม "ดูจบแล้ว" ด้านล่างจึงต้องให้กดเองเสมอ เชื่อใจผู้เรียน */}
                    <iframe
                        src={`${youtubeEmbed(url) ?? ""}?controls=0&disablekb=1&fs=0&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1`}
                        title={title}
                        allow="accelerometer; clipboard-write; encrypted-media; gyroscope"
                        className="absolute inset-0 size-full border-0 bg-black"
                    />
                    <div className="absolute inset-0" />
                </div>

                <div className="px-[18px] pb-[26px] pt-4">
                    <p className="text-[16px] font-medium">{title}</p>
                    {subtitle && <p className="mt-0.5 text-[11.5px] text-white/70">{subtitle}</p>}
                    <button
                        type="button"
                        onClick={onFinish}
                        className="lsn-grad-go mt-4 w-full rounded-[22px] py-[17px] text-[16px] font-medium text-lsn-ink transition active:scale-[0.98]"
                    >
                        ดูจบแล้ว · ทำแบบทดสอบ
                    </button>
                </div>
            </div>
        );
    }

    const progress = duration > 0 ? (current / duration) * 100 : 0;
    const timedLeft = timedQuestions.filter((q) => answers[q.index] < 0).length;
    /** ปลดล็อกได้เมื่อดูจบจริง และไม่มีคำถามแทรกค้างอยู่ */
    const canFinish = ended && timedLeft === 0;

    return (
        <div className="relative flex min-h-dvh flex-col bg-lsn-ink text-white lg:min-h-full">
            {/* ── ชั้นวิดีโอ ── */}
            {ytId ? (
                <>
                    <div
                        ref={hostRef}
                        className="absolute inset-0 [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:size-full"
                    />
                    {/* ทับ iframe ไว้ทั้งผืน กันกดโลโก้/ชื่อคลิปแล้วเด้งออกไป YouTube */}
                    <div className="absolute inset-0 z-[4]" />
                </>
            ) : (
                <video
                    ref={videoRef}
                    src={url}
                    playsInline
                    preload="metadata"
                    disablePictureInPicture
                    disableRemotePlayback
                    {...{ "x-webkit-airplay": "deny" }}
                    controlsList="nodownload noplaybackrate noremoteplayback"
                    onContextMenu={(e) => e.preventDefault()}
                    onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
                    onTimeUpdate={handleTimeUpdate}
                    onSeeking={handleSeeking}
                    onRateChange={handleRateChange}
                    onPlay={handlePlay}
                    onPause={() => setPlaying(false)}
                    onEnded={markEnded}
                    className="absolute inset-0 size-full object-contain"
                />
            )}

            {/* ── แถบบน ── */}
            <div className="relative z-10 flex items-center justify-between px-[18px] py-4">
                <button
                    type="button"
                    onClick={onExit}
                    aria-label="ออก"
                    className="flex size-[34px] items-center justify-center rounded-full bg-white/15 backdrop-blur transition active:scale-95"
                >
                    <X className="size-4" />
                </button>
                <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-light backdrop-blur">
                    <Lock className="size-3" />
                    เลื่อนข้ามไม่ได้
                </span>
            </div>

            {/* ── พื้นที่กดเล่น/หยุด + ปุ่มเล่นตรงกลางตอนหยุด ── */}
            <button
                type="button"
                onClick={toggle}
                aria-label={playing ? "หยุดชั่วคราว" : "เล่นวิดีโอ"}
                className="relative z-[5] flex flex-1 items-center justify-center"
            >
                {!playing && !asking && !ended && (
                    <span className="flex size-16 items-center justify-center rounded-full bg-white/90 text-lsn-ink">
                        <Play className="size-6 translate-x-0.5 fill-current" strokeWidth={0} />
                    </span>
                )}
            </button>

            {/* ── แถบล่าง: ชื่อเรื่อง + ความคืบหน้า + จุดคำถาม ── */}
            <div className="relative z-10 bg-gradient-to-t from-lsn-ink via-lsn-ink/85 to-transparent px-[18px] pb-[26px] pt-10">
                <p className="text-[16px] font-medium">{title}</p>
                {subtitle && <p className="mb-3 mt-0.5 text-[11.5px] text-white/70">{subtitle}</p>}

                {/* แตะแถบเพื่อย้อนกลับไปดูซ้ำได้ แต่แตะไปข้างหน้าเกินจุดที่เคยดูไม่ได้ */}
                <div
                    role="presentation"
                    onClick={seekTo}
                    className="relative mt-2 h-[5px] cursor-pointer rounded-[3px] bg-white/25"
                >
                    <div
                        className="lsn-grad-bar h-full rounded-[3px] transition-[width] duration-200"
                        style={{ width: `${progress}%` }}
                    />
                    {duration > 0 &&
                        timedQuestions.map((q) => (
                            <span
                                key={q.index}
                                title={`คำถามนาทีที่ ${formatClock(q.question.time_sec)}`}
                                className={`absolute top-[-3.5px] size-3 -translate-x-1/2 rounded-full ${
                                    answers[q.index] >= 0 ? "bg-white" : "bg-white/45"
                                }`}
                                style={{
                                    left: `${Math.min(100, ((q.question.time_sec ?? 0) / duration) * 100)}%`,
                                }}
                            />
                        ))}
                </div>

                <div className="mt-2 flex justify-between text-[11px] text-white/70">
                    <span className="tabular-nums">
                        {formatClock(current)} / {formatClock(duration)}
                    </span>
                    {timedQuestions.length > 0 && <span>จุดขาว = คำถามแทรก</span>}
                </div>

                {canFinish ? (
                    <button
                        type="button"
                        onClick={onFinish}
                        className="lsn-grad-go mt-4 w-full rounded-[22px] py-[17px] text-[16px] font-medium text-lsn-ink transition active:scale-[0.98]"
                    >
                        ดูจบแล้ว · ทำแบบทดสอบ
                    </button>
                ) : (
                    <p className="mt-4 flex items-center justify-center gap-1.5 rounded-[22px] bg-white/10 py-[15px] text-[12.5px] font-light text-white/70">
                        <Lock className="size-3.5" />
                        {ended && timedLeft > 0
                            ? `ยังเหลือคำถามระหว่างเรียนอีก ${timedLeft} ข้อ`
                            : "ดูวิดีโอให้จบก่อนจึงจะทำแบบทดสอบได้"}
                    </p>
                )}
            </div>

            {/* ── คำถามซ้อนบนวิดีโอ ── */}
            {asking && (
                <div className="absolute inset-0 z-20 flex flex-col justify-end bg-lsn-ink/60">
                    <div className="flex flex-col gap-3.5 rounded-t-[34px] bg-white px-[22px] pb-6 pt-6 text-lsn-ink">
                        <div className="flex items-center gap-2">
                            <span className="rounded-full bg-lsn-green px-2.5 py-[3px] text-[10px] text-lsn-ink">
                                คำถามระหว่างเรียน
                            </span>
                            <span className="text-[11px] text-lsn-mute2">
                                {formatClock(asking.question.time_sec)}
                            </span>
                        </div>

                        <p className="text-[18px] font-medium leading-[1.4]">
                            {asking.question.question}
                        </p>

                        <div className="flex flex-col gap-2.5">
                            {asking.question.choices.map((choice, ci) => (
                                <button
                                    key={ci}
                                    type="button"
                                    onClick={() => pickAnswer(ci)}
                                    className="rounded-[18px] border-[1.5px] border-lsn-line bg-lsn-surface px-4 py-[15px] text-left text-[14.5px] transition active:scale-[0.99]"
                                >
                                    {choice}
                                </button>
                            ))}
                        </div>

                        <p className="text-center text-[11.5px] text-lsn-faint">
                            ตอบแล้ววิดีโอเล่นต่อเอง
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
