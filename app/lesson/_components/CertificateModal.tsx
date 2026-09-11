"use client";

// =============================================================================
// CertificateModal — หน้าต่างแสดงใบประกาศนียบัตร + ปุ่มดาวน์โหลด PNG / JPEG
// -----------------------------------------------------------------------------
// ใบรับรองเป็นแนวนอน (A4 landscape) แต่แอปเป็นมือถือแนวตั้ง
// จึงเปิดเป็น overlay เต็มจอ (fixed) ทะลุกรอบโทรศัพท์บนเดสก์ท็อป
// และมีโหมด "ดูเต็มจอ" ที่หมุนใบ 90° ให้อ่านตัวหนังสือได้ชัดบนมือถือ
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Expand, LoaderCircle, X } from "lucide-react";

import {
    CERT_H,
    CERT_W,
    certificateNo,
    downloadCertificate,
    drawCertificate,
    readCertFonts,
    type CertificateData,
} from "./certificate";

type Props = {
    open: boolean;
    data: CertificateData;
    onClose: () => void;
};

export function CertificateModal({ open, data, onClose }: Props) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [ready, setReady] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    /** ภาพสำหรับโหมดดูเต็มจอ — แปลงครั้งเดียวตอนเปิด ไม่แปลงซ้ำทุก render */
    const [zoomSrc, setZoomSrc] = useState<string | null>(null);

    /* วาดใบรับรองใหม่ทุกครั้งที่เปิด — ข้อมูล/ฟอนต์อาจเปลี่ยนระหว่างรอบ */
    useEffect(() => {
        if (!open) return;
        let cancelled = false;

        setReady(false);
        setError(null);

        (async () => {
            try {
                const canvas = canvasRef.current;
                if (!canvas) return;
                await drawCertificate(canvas, data, readCertFonts());
                if (!cancelled) setReady(true);
            } catch {
                if (!cancelled) setError("สร้างใบประกาศนียบัตรไม่สำเร็จ ลองใหม่อีกครั้ง");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [open, data]);

    const openZoom = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !ready) return;
        setZoomSrc(canvas.toDataURL("image/png"));
    }, [ready]);

    /* ปิดด้วยปุ่ม Esc + ล็อกไม่ให้พื้นหลังเลื่อนตามขณะเปิด overlay */
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            if (zoomSrc) setZoomSrc(null);
            else onClose();
        };
        window.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [open, zoomSrc, onClose]);

    const save = useCallback(async () => {
        const canvas = canvasRef.current;
        if (!canvas || !ready) return;
        setBusy(true);
        setError(null);
        try {
            await downloadCertificate(canvas, data);
        } catch {
            setError("บันทึกไฟล์ไม่สำเร็จ ลองใหม่อีกครั้ง");
        } finally {
            setBusy(false);
        }
    }, [data, ready]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[70] flex flex-col bg-[#08211A]/92 backdrop-blur-[2px]">
            {/* ── แถบหัว ── */}
            <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-[max(14px,env(safe-area-inset-top))]">
                <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-white">
                        ใบประกาศนียบัตร
                    </p>
                    <p className="truncate text-[10.5px] text-white/55">
                        {certificateNo(data)}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="ปิด"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/12 text-white transition active:scale-95"
                >
                    <X className="size-4.5" />
                </button>
            </div>

            {/* ── ตัวใบรับรอง ── */}
            <div className="flex flex-1 items-center justify-center overflow-auto px-4">
                <div className="relative w-full max-w-[860px]">
                    <canvas
                        ref={canvasRef}
                        width={CERT_W * 2}
                        height={CERT_H * 2}
                        onClick={openZoom}
                        style={{ aspectRatio: `${CERT_W} / ${CERT_H}` }}
                        className={`w-full rounded-[10px] bg-[#FFFDF7] shadow-[0_24px_60px_-20px_rgba(0,0,0,.7)] transition ${
                            ready ? "opacity-100" : "opacity-0"
                        }`}
                    />

                    {!ready && !error && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <LoaderCircle className="size-7 animate-spin text-white/70" />
                        </div>
                    )}

                    {ready && (
                        <button
                            type="button"
                            onClick={openZoom}
                            className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 rounded-full bg-lsn-ink/85 px-3 py-1.5 text-[11px] text-white transition active:scale-95 sm:hidden"
                        >
                            <Expand className="size-3.5" />
                            ดูเต็มจอ
                        </button>
                    )}
                </div>
            </div>

            {/* ── ปุ่มดาวน์โหลด ── */}
            <div className="shrink-0 px-5 pb-[max(18px,env(safe-area-inset-bottom))] pt-4">
                {error && (
                    <p className="mb-2.5 rounded-[14px] bg-lsn-danger/20 px-4 py-2.5 text-center text-[12px] text-white">
                        {error}
                    </p>
                )}

                <button
                    type="button"
                    onClick={save}
                    disabled={!ready || busy}
                    className="lsn-grad-gold mx-auto flex w-full max-w-[420px] items-center justify-center gap-2.5 rounded-[18px] py-[17px] text-[16px] font-medium text-lsn-ink transition active:scale-[0.98] disabled:opacity-50"
                >
                    {busy ? (
                        <LoaderCircle className="size-[18px] animate-spin" />
                    ) : (
                        <Download className="size-[18px]" strokeWidth={2.2} />
                    )}
                    ดาวน์โหลดใบประกาศนียบัตร
                </button>

                <p className="mt-2.5 text-center text-[10.5px] text-white/45">
                    ไฟล์ JPEG {CERT_W * 2} × {CERT_H * 2} px · พิมพ์บนกระดาษ A4 แนวนอนได้พอดี
                </p>
            </div>

            {/* ── โหมดดูเต็มจอ: หมุนใบ 90° ให้อ่านชัดบนมือถือ ── */}
            {zoomSrc && (
                <div
                    onClick={() => setZoomSrc(null)}
                    className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-black/95"
                >
                    {/* กว้าง 100vh + หมุน 90° → ด้านยาวของใบไปตามด้านยาวของจอพอดี */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={zoomSrc}
                        alt="ใบประกาศนียบัตร"
                        className="rotate-90"
                        style={{ width: "100vh", maxWidth: "none", height: "auto" }}
                    />
                    <span className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/12 px-4 py-2 text-[11.5px] text-white/70">
                        แตะเพื่อปิด
                    </span>
                </div>
            )}
        </div>
    );
}
