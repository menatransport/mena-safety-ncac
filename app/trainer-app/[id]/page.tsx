"use client";

import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { NavComponent } from "@/components/Navbar";
import { ProjectHeader } from "../_components/ProjectHeader";
import type { TaskDetail, Driver } from "../type";
import { FormRender } from "../_components/render";
import { DriverTable } from "../_components/DriverTable";

// const  menuSteps = [
//     { value: 'task', name: 'งาน' },
//     { value: 'calendar', name: 'ปฏิทิน' },
// ]

export default function TrainerApp_ID() {
    const { id: taskId } = useParams();
    const searchParams = useSearchParams();
    const step = searchParams.get("step") ?? "0";
    const [data, setData] = useState<TaskDetail | null>(null);
    const router = useRouter();

    useEffect(() => {

        const fetchTaskDetails = async () => {
            console.log(`Task ID from params: ${taskId}, Step from search params: ${step}`);
            if (taskId && step === "0") {
                try {
                    console.log(`Fetching details for task ID: ${taskId}`);
                    const response = await fetch(`/api/task/${taskId}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                    if (!response.ok) {
                        console.log(`API responded with status: ${response.status}`);
                        Swal.fire({
                            title: "Error",
                            text: `Failed to fetch task details. Status: ${response.status}`,
                            icon: "error",
                            confirmButtonText: "Close",
                        });
                        return;
                    }
                    const data = await response.json();
                    console.log("Fetched task details:", JSON.stringify(data, null, 2));
                    console.log("plan_date:", data?.plan_date, "task[0]?.plan_date:", data?.task?.[0]?.plan_date);
                    setData(data);
                } catch (error) {
                    console.error("Error fetching task details:", error);
                    Swal.fire({
                        title: "Error",
                        text: "Failed to fetch task details.",
                        icon: "error",
                        confirmButtonText: "Close",
                    });
                }
            };
        }
        fetchTaskDetails();

    }, [taskId, router, step]);

    const taskFields = [
        {
            label: "Trainer",
            type: "text" as const,
            icon: "user",
            fieldKey: "trainer_id",
            readonly: true,
            value: data?.task.trainer_id ?? ""
        },
        {
            label: "Plan Date",
            type: "date" as const,
            icon: "calendar",
            fieldKey: "plan_date",
            readonly: true,
            value: data?.task.plan_date ?? ""
        },
        {
            label: "Actual Date",
            type: "date" as const,
            icon: "calendar",
            fieldKey: "action_date",
            readonly: false,
            value: data?.task.action_date ?? "",
        }
    ]



    const safetyTalkFields = [
        {
            label: "Topic",
            type: "textarea" as const,
            icon: "text",
            fieldKey: "safety_talk_topic",
            readonly: false,
            value: "",
        }
    ]


    const handleFieldChange = (fieldKey: string, value: string) => {
        setData((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                task: { ...prev.task, [fieldKey]: value },
            };
        });
    };

    return (
        <NavComponent>

            <div className="min-h-screen bg-[#f4efff]">
                <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">

                    {/* step = 0 */}
                    {step === "0" && (
                        <div className="space-y-6">
                            <ProjectHeader
                                title={`Plant : ${data?.task.inspection_task_id ?? "Loading..."}`}
                                date={data?.task.plan_date ? new Date(data.task.plan_date + "T00:00:00").toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" }) : null}
                            />
                            {/* Back - Tab Progress menu Step - Next */}

                            {/* Form Trainer, Plan Date, Actual Date */}
                            <FormRender title="ข้อมูลเบื้องต้น" formData={taskFields} onChange={handleFieldChange} />

                            {/* Driver Table */}
                            <DriverTable drivers={data?.drivers ?? []} />

                            {/* Safety talk */}

                            <FormRender title="Safety Talk" formData={safetyTalkFields} onChange={handleFieldChange} />
                        </div>
                    )}

                    {/* step = 1 */}
                    {step === "1" && (
                        <div className="space-y-6">
                        </div>
                    )}

                    {/* step = 2 */}
                    {step === "2" && (
                        <div className="space-y-6">
                        </div>
                    )}



                </div>
            </div>
        </NavComponent>
    );


}