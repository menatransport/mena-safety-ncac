/**
 * ตัวโหลด YouTube IFrame Player API
 *
 * ต้องใช้ API ตัวนี้แทนการฝัง <iframe> เปล่า ๆ เพราะบทเรียนต้อง
 *   • ซ่อนแถบควบคุมของ YouTube ไม่ให้ผู้เรียนลากข้ามไปท้ายคลิป
 *   • อ่านเวลาปัจจุบันเพื่อเด้งคำถามตรงวินาทีที่กำหนด (time_sec)
 *   • รู้ว่าวิดีโอ "จบจริง" แล้วจึงปลดล็อกแบบทดสอบ
 *
 * สคริปต์โหลดครั้งเดียวต่อหนึ่งหน้า แล้วแชร์ promise เดิมให้ทุกคอมโพเนนต์
 */

export type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
};

type YTStateEvent = { data: number; target: YTPlayer };

export type YTNamespace = {
  Player: new (
    el: HTMLElement,
    options: {
      videoId: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: YTStateEvent) => void;
      };
    }
  ) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const API_SRC = 'https://www.youtube.com/iframe_api';

let pending: Promise<YTNamespace> | null = null;

export const loadYouTubeApi = (): Promise<YTNamespace> => {
  if (pending) return pending;

  pending = new Promise<YTNamespace>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('YouTube API ใช้ได้เฉพาะฝั่ง browser'));
      return;
    }
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }

    // สคริปต์เรียก callback ตัวนี้ตัวเดียว จึงต้องต่อคิวของเดิมไว้เผื่อมีคนตั้งไว้ก่อน
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
      else reject(new Error('โหลด YouTube API ไม่สำเร็จ'));
    };

    if (!document.querySelector(`script[src="${API_SRC}"]`)) {
      const script = document.createElement('script');
      script.src = API_SRC;
      script.async = true;
      script.onerror = () => reject(new Error('โหลด YouTube API ไม่สำเร็จ'));
      document.head.appendChild(script);
    }
  });

  // ล้มเหลวแล้วต้องเคลียร์ทิ้ง ไม่งั้นครั้งต่อไปจะได้ promise ที่ reject ค้างไว้ตลอด
  pending.catch(() => {
    pending = null;
  });

  return pending;
};

/** playerVars ที่ตัดทางลัดของผู้เรียนออกให้หมด */
export const LOCKED_PLAYER_VARS = {
  controls: 0, // ไม่มีแถบเลื่อน = ลากข้ามไม่ได้ตั้งแต่ต้น
  disablekb: 1, // ปิดคีย์ลัด (ลูกศร / ตัวเลขกระโดดเป็น %)
  fs: 0, // ไม่ให้เข้าเต็มจอ เพราะเต็มจอจะมีแถบควบคุมของ YouTube โผล่มา
  modestbranding: 1,
  rel: 0,
  iv_load_policy: 3,
  playsinline: 1,
} as const;
