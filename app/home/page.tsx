'use client';

import { NavComponent } from "@/components/Navbar";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { useUiTheme } from "@/lib/useUiTheme";
import Swal from "sweetalert2";
import { useEffect } from "react";

function IncidentSvgButton({ onClick, isDark }: { onClick: () => void; isDark: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`group relative inline-flex items-center gap-3 rounded-2xl border px-5 py-3 font-semibold transition-all duration-300 hover:-translate-y-0.5 ${isDark
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

        <div className="relative w-full place-self-center max-w-6xl space-y-5 sm:space-y-10 px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
          <div className="mb-8 flex flex-col items-center gap-2 text-center sm:mb-10">
            <span
              className={`text-xs font-semibold uppercase tracking-[0.2em] ${
                isDark ? "text-white/50" : "text-slate-500"
              }`}
            >
              Main Menu
            </span>
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

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div
              className={`cursor-pointer group relative overflow-hidden rounded-3xl border p-6 shadow-xl transition-all duration-300 hover:-translate-y-1 ${isDark
                  ? "border-white/15 bg-white/5 backdrop-blur-sm hover:border-rose-300/30 hover:bg-white/[0.07]"
                  : "border-rose-100/90 bg-white/85 hover:border-rose-300 shadow-rose-100/40"
                }`}
            >
              <div
                className={`absolute -right-16 -top-16 h-52 w-52 rounded-full bg-gradient-to-br transition-all duration-300 group-hover:scale-110 ${isDark ? "from-rose-500/25 to-orange-400/10 blur-3xl" : "from-rose-300/40 to-orange-200/30 blur-2xl"
                  }`}
              />

              <div className="relative flex h-full flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div
                    className={`w-1/2 sm:w-1/3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold tracking-wide ${isDark
                        ? "border-rose-300/40 bg-rose-500/15 text-rose-100"
                        : "border-rose-300/70 bg-rose-50 text-rose-700"
                      }`}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    MENA-NCAC
                  </div>
                </div>

                <div>
                  <h2 className={`text-2xl font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>ระบบจัดการเอกสาร NC/AC</h2>
                  <p className={`mt-2 text-sm leading-relaxed ${isDark ? "text-white/65" : "text-slate-600"}`}>
                    สำหรับจัดการรายงาน Non-Conformance และ Action Corrective พร้อมปุ่มแจ้งเหตุอุบัติการณ์แบบด่วน
                  </p>
                </div>

                <div className="pt-2">
                  <IncidentSvgButton isDark={isDark} onClick={() => router.push("/nc-form")} />
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push("/trainer-app")}
              className={`cursor-pointer group relative overflow-hidden rounded-3xl border p-6 text-left shadow-xl transition-all duration-300 hover:-translate-y-1 ${isDark
                  ? "border-white/15 bg-white/5 backdrop-blur-sm hover:border-cyan-300/35 hover:bg-white/[0.07]"
                  : "border-cyan-100/90 bg-white/85 hover:border-cyan-300 shadow-cyan-100/40"
                }`}
            >
              <div
                className={`absolute -right-16 -top-16 h-52 w-52 rounded-full bg-gradient-to-br transition-all duration-300 group-hover:scale-110 ${isDark ? "from-cyan-400/30 to-indigo-400/10 blur-3xl" : "from-cyan-300/40 to-indigo-200/30 blur-2xl"
                  }`}
              />

              <div className="relative flex h-full flex-col gap-4">
                <div
                  className={`w-1/2 sm:w-25 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold tracking-wide ${isDark
                      ? "border-cyan-300/40 bg-cyan-500/15 text-cyan-100"
                      : "border-cyan-300/70 bg-cyan-50 text-cyan-700"
                    }`}
                >
                  <GraduationCap className="h-4 w-4" />
                  TRAINER
                </div>

                <div>
                  <h2 className={`text-2xl font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>ระบบติดตามผลหน้างานเทรนเนอร์</h2>
                  <p className={`mt-2 text-sm leading-relaxed ${isDark ? "text-white/65" : "text-slate-600"}`}>
                    ระบบสำหรับติดตามผลการตรวจแพล้น และรายงานผลการออกตรวจแพล้นครบวงจร
                  </p>
                </div>

                <div className="pt-2">
                  <span
                    className={`inline-flex items-center gap-2 rounded-2xl border px-5 py-3 font-semibold shadow-lg transition-all duration-300 group-hover:-translate-y-0.5 ${isDark
                        ? "border-cyan-200/40 bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 text-white shadow-cyan-900/30 group-hover:shadow-xl group-hover:shadow-cyan-900/40"
                        : "border-cyan-300 bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 text-white shadow-cyan-300/50 group-hover:shadow-xl group-hover:shadow-cyan-300/70"
                      }`}
                  >
                    <GraduationCap className="h-4 w-4" />
                    เข้าใช้งาน Trainer App
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </NavComponent>
  );
}
