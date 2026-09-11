"use client";

/**
 * Mascot-style illustrations for the Home main menu.
 * Each mascot is a self-contained inline SVG (no extra deps) drawn on a 96x96 grid
 * and themed with `isDark` so the "paper" surfaces stay readable on both themes.
 */

type MascotProps = {
  isDark: boolean;
  className?: string;
};

/** Document with a warning badge — represents NC/AC (Non-Conformance / Corrective Action). */
export function NcacMascot({ isDark, className }: MascotProps) {
  const paper = isDark ? "#1e293b" : "#ffffff";
  const paperStroke = isDark ? "#fda4af" : "#fb7185";
  const line = isDark ? "#fecdd3" : "#fda4af";
  const fold = isDark ? "#334155" : "#ffe4e6";

  return (
    <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ncacBadge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>

      {/* Back sheet (depth) */}
      <rect x="28" y="10" width="42" height="56" rx="8" fill={paper} stroke={paperStroke} strokeOpacity="0.45" strokeWidth="2" />

      {/* Front sheet */}
      <path
        d="M20 22a8 8 0 0 1 8-8h22l14 14v42a8 8 0 0 1-8 8H28a8 8 0 0 1-8-8V22Z"
        fill={paper}
        stroke={paperStroke}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Folded corner */}
      <path d="M50 14v10a4 4 0 0 0 4 4h10" fill={fold} stroke={paperStroke} strokeWidth="2.5" strokeLinejoin="round" />

      {/* Text lines */}
      <rect x="29" y="38" width="22" height="4" rx="2" fill={line} />
      <rect x="29" y="48" width="28" height="4" rx="2" fill={line} opacity="0.75" />
      <rect x="29" y="58" width="18" height="4" rx="2" fill={line} opacity="0.5" />

      {/* Warning badge */}
      <circle cx="68" cy="68" r="17" fill="url(#ncacBadge)" stroke={isDark ? "#0f172a" : "#ffffff"} strokeWidth="3" />
      <path d="M68 58.5 77 74H59l9-15.5Z" fill="rgba(255,255,255,0.25)" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M68 64v4.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="68" cy="71.3" r="1.2" fill="#fff" />
    </svg>
  );
}

/** Checklist clipboard with a graduation cap — represents the Trainer field follow-up app. */
export function TrainerMascot({ isDark, className }: MascotProps) {
  const paper = isDark ? "#1e293b" : "#ffffff";
  const paperStroke = isDark ? "#67e8f9" : "#22d3ee";
  const line = isDark ? "#a5f3fc" : "#67e8f9";
  const clip = isDark ? "#0e7490" : "#0891b2";

  return (
    <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="trainerCap" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="trainerCheck" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>

      {/* Clipboard */}
      <rect x="18" y="20" width="50" height="64" rx="9" fill={paper} stroke={paperStroke} strokeWidth="2.5" />
      <rect x="33" y="14" width="20" height="12" rx="5" fill={clip} />
      <rect x="37" y="11" width="12" height="7" rx="3.5" fill={clip} />

      {/* Checklist rows */}
      <circle cx="30" cy="42" r="4.5" fill="url(#trainerCheck)" />
      <path d="M27.8 42 29.5 43.7 32.4 40.6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="38" y="40" width="22" height="4" rx="2" fill={line} />

      <circle cx="30" cy="56" r="4.5" fill="url(#trainerCheck)" />
      <path d="M27.8 56 29.5 57.7 32.4 54.6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="38" y="54" width="18" height="4" rx="2" fill={line} opacity="0.75" />

      <circle cx="30" cy="70" r="4.5" fill="none" stroke={line} strokeWidth="2" />
      <rect x="38" y="68" width="24" height="4" rx="2" fill={line} opacity="0.5" />

      {/* Graduation cap (floating, tilted) */}
      <g transform="translate(66 30) rotate(-12)">
        <path d="M0 0 18 -8 36 0 18 8 0 0Z" fill="url(#trainerCap)" stroke={isDark ? "#0f172a" : "#ffffff"} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M8 3.5v8c0 3 4.5 5.5 10 5.5s10-2.5 10-5.5v-8" fill="url(#trainerCap)" stroke={isDark ? "#0f172a" : "#ffffff"} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M30 2v10" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
        <circle cx="30" cy="13.5" r="2" fill="#fbbf24" />
      </g>
    </svg>
  );
}

/** Open book with a glowing idea bulb — represents Safety Self Learning lessons. */
export function LessonMascot({ isDark, className }: MascotProps) {
  const paper = isDark ? "#1e293b" : "#ffffff";
  const paperStroke = isDark ? "#6ee7b7" : "#34d399";
  const line = isDark ? "#a7f3d0" : "#6ee7b7";
  const spine = isDark ? "#047857" : "#059669";

  return (
    <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="lessonBulb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="lessonCover" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
      </defs>

      {/* Bulb rays */}
      <g stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" opacity="0.9">
        <path d="M48 8v5" />
        <path d="M32 15l3.5 3.5" />
        <path d="M64 15l-3.5 3.5" />
      </g>
      {/* Bulb */}
      <path
        d="M48 16a12 12 0 0 0-7 21.7c1.4 1.1 2 2.5 2 4.3h10c0-1.8.6-3.2 2-4.3A12 12 0 0 0 48 16Z"
        fill="url(#lessonBulb)"
        stroke={isDark ? "#0f172a" : "#ffffff"}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <rect x="43" y="43" width="10" height="4" rx="2" fill={isDark ? "#94a3b8" : "#cbd5e1"} />

      {/* Book cover (bottom layer) */}
      <path d="M14 56c10-4 22-4 34 0 12-4 24-4 34 0v24c-10-4-22-4-34 0-12-4-24-4-34 0V56Z" fill="url(#lessonCover)" />

      {/* Open pages */}
      <path d="M17 52c9-3.5 20-3.5 29 0v24c-9-3.5-20-3.5-29 0V52Z" fill={paper} stroke={paperStroke} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M79 52c-9-3.5-20-3.5-29 0v24c9-3.5 20-3.5 29 0V52Z" fill={paper} stroke={paperStroke} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M48 52v24" stroke={spine} strokeWidth="2.5" strokeLinecap="round" />

      {/* Page lines */}
      <rect x="23" y="58" width="16" height="3" rx="1.5" fill={line} />
      <rect x="23" y="65" width="12" height="3" rx="1.5" fill={line} opacity="0.7" />
      <rect x="57" y="58" width="16" height="3" rx="1.5" fill={line} />
      <rect x="57" y="65" width="12" height="3" rx="1.5" fill={line} opacity="0.7" />
    </svg>
  );
}
