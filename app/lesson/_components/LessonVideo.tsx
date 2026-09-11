"use client";

// =============================================================================
// LessonVideo — ตัวเล่นวิดีโอแบบง่าย ใช้เป็น "ตัวอย่าง" เท่านั้น
//   ปัจจุบันใช้ในฟอร์มฝั่ง admin เพื่อพรีวิวลิงก์ที่กรอก/อัปโหลด
//   ฝั่งผู้เรียนใช้ LessonPlayer แทน (เต็มจอ + ห้ามเลื่อนข้าม + คำถามแทรก)
// =============================================================================

import { PlayCircle } from "lucide-react";

import { youtubeEmbed } from "../constant";

type Props = {
    url: string;
    title: string;
    onEnded?: () => void;
};

export function LessonVideo({ url, title, onEnded }: Props) {
    const embed = youtubeEmbed(url);

    if (!url) {
        return (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-[18px] bg-lsn-surface text-lsn-mute2">
                <PlayCircle className="size-8" strokeWidth={1.5} />
                <p className="text-xs">ยังไม่มีวิดีโอ</p>
            </div>
        );
    }

    // YouTube ไม่ยิง event จบวิดีโอผ่าน iframe ธรรมดา — พรีวิวอย่างเดียวจึงพอ
    if (embed) {
        return (
            <iframe
                src={embed}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="aspect-video w-full rounded-[18px] border-0 bg-black"
            />
        );
    }

    return (
        <video
            src={url}
            controls
            playsInline
            controlsList="nodownload"
            onEnded={onEnded}
            className="aspect-video w-full rounded-[18px] bg-black"
        />
    );
}
