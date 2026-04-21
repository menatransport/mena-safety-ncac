"use client";

// =============================================================================
// Component: Stepper
// -----------------------------------------------------------------------------
// Step indicator สำหรับ flow หลายขั้นตอน (ใช้ในหน้าตรวจ [subid])
// =============================================================================

import type { StepItem } from "../type";
export type { StepItem };

interface StepperProps {
    steps: StepItem[];
    currentStep: string;
    onStepChange: (step: string) => void;
}

export function Stepper({ steps, currentStep, onStepChange }: StepperProps) {
    const currentIndex = steps.findIndex((s) => s.value === currentStep);

    return (
        <div className="flex items-center w-full px-2 sm:px-6 py-2">
            {steps.map((step, idx) => {
                const isActive = step.value === currentStep;
                const isDone = idx < currentIndex;

                return (
                    <div key={step.value} className="flex items-center flex-1 last:flex-none">
                        <button
                            onClick={() => onStepChange(step.value)}
                            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2.5 group cursor-pointer transition-all"
                        >
                            <div
                                className={`flex items-center justify-center w-14 h-14 rounded-xl text-sm font-medium transition-all duration-300 ${
                                    isActive
                                        ? "bg-teal-500 text-white shadow-lg shadow-teal-500/25 scale-110"
                                        : isDone
                                        ? "bg-teal-100 text-teal-700"
                                        : "bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:scale-105"
                                }`}
                            >
                                {step.icon} 
                            </div>
                            <span
                                className={`mt-2 sm:hidden max-w-[76px] text-center text-[10px] font-semibold leading-tight transition-colors ${
                                    isActive
                                        ? "text-teal-700"
                                        : isDone
                                        ? "text-teal-600"
                                        : "text-slate-500 group-hover:text-slate-700"
                                }`}
                            >
                                {step.label}
                            </span>
                            <span
                                className={`text-xs font-semibold hidden sm:block transition-colors ${
                                    isActive
                                        ? "text-teal-700"
                                        : isDone
                                        ? "text-teal-600"
                                        : "text-slate-400 group-hover:text-slate-600"
                                }`}
                            >
                                {step.label}
                            </span>
                        </button>

                        {idx < steps.length - 1 && (
                            <div className="flex-1 mx-3">
                                <div
                                    className={`h-px w-full transition-colors duration-300 ${
                                        idx < currentIndex ? "bg-teal-300" : "bg-slate-200"
                                    }`}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
