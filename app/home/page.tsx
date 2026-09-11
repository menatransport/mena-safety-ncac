'use client';

import { NavComponent } from "@/components/Navbar";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  AlertTriangle,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { useUiTheme } from "@/lib/useUiTheme";
import Swal from "sweetalert2";
import { useEffect } from "react";
import { NcacMascot, TrainerMascot, LessonMascot } from "@/components/home/MenuMascots";

function IncidentSvgButton({ onClick, isDark }: { onClick: () => void; isDark: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`group relative inline-flex w-full items-center justify-center gap-3 rounded-2xl border px-5 py-3 font-semibold transition-all duration-300 hover:-translate-y-0.5 sm:w-auto ${isDark
          ? "border-rose-300/40 bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-900/30 hover:shadow-xl hover:shadow-rose-900/40"
          : "border-rose-300 bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 text-white shadow-lg shadow-rose-300/40 hover:shadow-xl hover:shadow-rose-300/55"
        }`}
    >
      <span className="relative flex h-7 w-7 items-center justify-center">
        <span className={`absolute h-7 w-7 rounded-full border opacity-70 animate-ping ${isDark ? "border-white/60" : "border-white/90"}`} />
        <svg
          viewBox="0 0 24 24"
          className="relative h-6 w-6"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 3.5L21 19.5H3L12 3.5Z"
            fill="rgba(255,255,255,0.25)"
            stroke="white"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M12 9.2V13.2" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="16.6" r="1.1" fill="white" />
        </svg>
      </span>
      <span>แจ้งเหตุอุบัติการณ์</span>
      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Shared row primitives                                               */
/* ------------------------------------------------------------------ */

type Accent = "rose" | "cyan" | "emerald";

/** Per-accent Tailwind classes, split by theme so `isDark` stays the single switch. */
const ACCENT = {
  rose: {
    dark: {
      row: "hover:border-rose-300/35",
      glow: "from-rose-500/25 to-orange-400/10",
      tile: "from-rose-500/20 to-orange-400/10 ring-rose-300/25",
      badge: "border-rose-300/40 bg-rose-500/15 text-rose-100",
    },
    light: {
      row: "hover:border-rose-300 shadow-rose-100/40",
      glow: "from-rose-300/40 to-orange-200/30",
      tile: "from-rose-100 to-orange-50 ring-rose-200/70",
      badge: "border-rose-300/70 bg-rose-50 text-rose-700",
    },
  },
  cyan: {
    dark: {
      row: "hover:border-cyan-300/35",
      glow: "from-cyan-400/30 to-indigo-400/10",
      tile: "from-cyan-500/20 to-indigo-400/10 ring-cyan-300/25",
      badge: "border-cyan-300/40 bg-cyan-500/15 text-cyan-100",
    },
    light: {
      row: "hover:border-cyan-300 shadow-cyan-100/40",
      glow: "from-cyan-300/40 to-indigo-200/30",
      tile: "from-cyan-100 to-indigo-50 ring-cyan-200/70",
      badge: "border-cyan-300/70 bg-cyan-50 text-cyan-700",
    },
  },
  emerald: {
    dark: {
      row: "hover:border-emerald-300/35",
      glow: "from-emerald-400/30 to-teal-400/10",
      tile: "from-emerald-500/20 to-teal-400/10 ring-emerald-300/25",
      badge: "border-emerald-300/40 bg-emerald-500/15 text-emerald-100",
    },
    light: {
      row: "hover:border-emerald-300 shadow-emerald-100/40",
      glow: "from-emerald-300/40 to-teal-200/30",
      tile: "from-emerald-100 to-teal-50 ring-emerald-200/70",
      badge: "border-emerald-300/70 bg-emerald-50 text-emerald-700",
    },
  },
} as const;

type MenuRowProps = {
  isDark: boolean;
  accent: Accent;
  mascot: React.ReactNode;
  badgeIcon: React.ReactNode;
  badgeLabel: string;
  title: string;
  description: string;
  action: React.ReactNode;
  /** When provided the entire row becomes a button that navigates. */
  onClick?: () => void;
};

/**
 * One standardized list row: [mascot] [badge + title + description] [action].
 * Renders as a <button> when `onClick` is given (whole row is the target),
 * otherwise as a <div> so the nested action button owns the interaction.
 */
function MenuRow({
  isDark,
  accent,
  mascot,
  badgeIcon,
  badgeLabel,
  title,
  description,
  action,
  onClick,
}: MenuRowProps) {
  const a = ACCENT[accent][isDark ? "dark" : "light"];

  const rowClass = `group relative w-full overflow-hidden rounded-3xl border p-5 text-left shadow-xl transition-all duration-300 hover:-translate-y-1 sm:p-6 ${isDark
      ? `border-white/15 bg-white/5 backdrop-blur-sm hover:bg-white/[0.07] ${a.row}`
      : `border-slate-200/80 bg-white/85 ${a.row}`
    } ${onClick ? "cursor-pointer" : ""}`;

  const content = (
    <>
      {/* Ambient glow (top-right) */}
      <div
        className={`pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-gradient-to-br transition-all duration-300 group-hover:scale-110 ${a.glow} ${isDark ? "blur-3xl" : "blur-2xl"}`}
      />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
        {/* Mascot + copy */}
        <div className="flex min-w-0 flex-1 items-start gap-4 sm:items-center sm:gap-5">
          <div
            className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br p-2 ring-1 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-2 sm:h-24 sm:w-24 sm:p-3 ${a.tile}`}
          >
            {mascot}
          </div>

          <div className="min-w-0 flex-1">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold tracking-wide ${a.badge}`}
            >
              {badgeIcon}
              {badgeLabel}
            </div>

            <h2 className={`mt-3 text-xl font-extrabold leading-snug sm:text-2xl ${isDark ? "text-white" : "text-slate-900"}`}>
              {title}
            </h2>
            <p className={`mt-1.5 text-sm leading-relaxed ${isDark ? "text-white/65" : "text-slate-600"}`}>
              {description}
            </p>
          </div>
        </div>

        {/* Action */}
        <div className="shrink-0 sm:pl-2">{action}</div>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={rowClass}>
        {content}
      </button>
    );
  }
  return <div className={rowClass}>{content}</div>;
}

/** Gradient pill CTA used by rows whose whole surface navigates. */
function RowCta({
  isDark,
  icon,
  label,
  gradient,
}: {
  isDark: boolean;
  icon: React.ReactNode;
  label: string;
  gradient: { dark: string; light: string };
}) {
  return (
    <span
      className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-3 font-semibold text-white shadow-lg transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-xl sm:w-auto ${isDark ? gradient.dark : gradient.light}`}
    >
      {icon}
      {label}
      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  const router = useRouter();
  const { theme } = useUiTheme();
  const isDark = theme === "Dark";

  useEffect(() => {
    const showWelcome = sessionStorage.getItem("showWelcome")
    if (showWelcome === "true") {
      Swal.fire({
        icon: 'success',
        title: 'ยินดีต้อนรับเข้าสู่ระบบ',
        text: '',
        draggable: true
      })

      sessionStorage.removeItem("showWelcome")
    }
  }, []);

  return (
    <NavComponent>
      <div
        className={`relative min-h-screen overflow-hidden ${isDark
            ? "bg-gradient-to-br from-slate-800 via-slate-700 to-[#3d5578]"
            : "bg-[radial-gradient(circle_at_20%_20%,#dbeafe_0%,#f8fafc_35%,#fff7ed_100%)]"
          }`}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className={`absolute -top-36 -right-36 h-[520px] w-[520px] rounded-full blur-3xl ${isDark ? "bg-cyan-500/10" : "bg-cyan-300/25"}`} />
          <div className={`absolute -bottom-20 -left-20 h-[360px] w-[360px] rounded-full blur-3xl ${isDark ? "bg-rose-500/10" : "bg-rose-200/30"}`} />
          <div
            className={`absolute inset-0 [background-size:28px_28px] ${isDark
                ? "opacity-25 [background-image:linear-gradient(to_right,rgba(148,163,184,0.16)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.16)_1px,transparent_1px)]"
                : "opacity-50 [background-image:linear-gradient(to_right,rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.05)_1px,transparent_1px)]"
              }`}
          />
        </div>

        <div className="relative mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="mb-8 flex flex-col items-center gap-2 text-center sm:mb-10">
            <h1
              className={`text-2xl font-black tracking-tight sm:text-4xl ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              ยินดีต้อนรับสู่{" "}
              <span
                className={`bg-clip-text text-transparent ${
                  isDark
                    ? "bg-gradient-to-r from-blue-300 via-cyan-300 to-teal-300"
                    : "bg-gradient-to-r from-blue-700 via-cyan-600 to-teal-600"
                }`}
              >
                Mena Safety
              </span>
            </h1>
            <p className={`text-sm ${isDark ? "text-white/60" : "text-slate-600"}`}>
              เลือกเมนูที่ต้องการใช้งาน
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:gap-5">
            {/* 1. NC/AC — row is a container; the incident button is the action */}
            <MenuRow
              isDark={isDark}
              accent="rose"
              mascot={<NcacMascot isDark={isDark} className="h-full w-full" />}
              badgeIcon={<AlertTriangle className="h-4 w-4" />}
              badgeLabel="MENA-NCAC"
              title="ระบบจัดการเอกสาร NC/AC"
              description="สำหรับจัดการรายงาน NC/AC พร้อมปุ่มแจ้งเหตุอุบัติการณ์แบบด่วน"
              action={<IncidentSvgButton isDark={isDark} onClick={() => router.push("/nc-form")} />}
            />

            {/* 2. Trainer — whole row navigates */}
            <MenuRow
              isDark={isDark}
              accent="cyan"
              onClick={() => router.push("/trainer-app")}
              mascot={<TrainerMascot isDark={isDark} className="h-full w-full" />}
              badgeIcon={<GraduationCap className="h-4 w-4" />}
              badgeLabel="Trainer App"
              title="ระบบติดตามผลหน้างานเทรนเนอร์"
              description="ระบบสำหรับติดตามผลการตรวจแพล้น และรายงานผลการออกตรวจแพล้นครบวงจร"
              action={
                <RowCta
                  isDark={isDark}
                  icon={<GraduationCap className="h-4 w-4" />}
                  label="เข้าใช้งาน"
                  gradient={{
                    dark: "border-cyan-200/40 bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 shadow-cyan-900/30 group-hover:shadow-cyan-900/40",
                    light: "border-cyan-300 bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 shadow-cyan-300/50 group-hover:shadow-cyan-300/70",
                  }}
                />
              }
            />

            {/* 3. Safety Self Learning — whole row navigates */}
            <MenuRow
              isDark={isDark}
              accent="emerald"
              onClick={() => router.push("/lesson-admin")}
              mascot={<LessonMascot isDark={isDark} className="h-full w-full" />}
              badgeIcon={<BookOpen className="h-4 w-4" />}
              badgeLabel="Safety Self Learning"
              title="ระบบจัดการบทเรียน"
              description="สร้างและแก้ไขบทเรียน พร้อมติดตามผลคะแนนของผู้เรียน และรายงานผลการเรียนครบวงจร"
              action={
                <RowCta
                  isDark={isDark}
                  icon={<BookOpen className="h-4 w-4" />}
                  label="เข้าใช้งาน"
                  gradient={{
                    dark: "border-emerald-200/40 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 shadow-emerald-900/30 group-hover:shadow-emerald-900/40",
                    light: "border-emerald-300 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 shadow-emerald-300/50 group-hover:shadow-emerald-300/70",
                  }}
                />
              }
            />
          </div>
        </div>
      </div>
    </NavComponent>
  );
}
