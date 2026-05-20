// =============================================================================
// Trainer App – Type Definitions
// -----------------------------------------------------------------------------
// Type / Interface ทั้งหมดที่ใช้ร่วมกันใน trainer-app
//   • Domain models  : Task / Driver / Users / TaskDetail / SafetyTalkFields
//   • Component types: FormField / DialogMode / TaskFilterRef / TaskFilterResult
// =============================================================================

import type React from "react";

/* -------------------------------------------------------------------------- */
/*  Domain – Task                                                             */
/* -------------------------------------------------------------------------- */
export type TaskStatus = "open" | "pending" | "cancel" | "completed" ;

export interface Task {
    plant_code: string;
    plant_name: string;
    inspection_task_id: string;
    action_date: string | null;
    trainer_id: string;
    client_name: string;
    plan_date: string;
    created_at: string;
    updated_at: string;
    inspection_task_status: TaskStatus | null;
}

export interface CreateTask {
    trainer_id: string;
    client_name: string;
    plant_code: string;
    plant_name: string;
    plan_date: string;
    action_date: string;
    inspection_task_status: string;
}

/* -------------------------------------------------------------------------- */
/*  Domain – Driver / Inspection                                              */
/* -------------------------------------------------------------------------- */
export interface Driver {
    inspection_task_driver_id: string;
    driver_id: string;
    number_plate: string;
    truck_number: string;
    last_name: string;
    truck_type: string;
    ppe_test_id: number | null;
    inspection_task_driver_status: string | null;
    inspection_date: string | null;
    inspection_task_id: string;
    first_name: string;
    status: "open" | "pending" | "completed" | null;
    drug_test_id: number | null;
    vehicle_inspect_id: number | null;
    ppe_status: string | null;
    drug_test_status: string | null;
    action_date: string | null;
    vehicle_status: string | null;
}

export interface TaskDetail {
    task: Task;
    drivers: Driver[];
}

/* -------------------------------------------------------------------------- */
/*  Domain – Users / Organization                                             */
/* -------------------------------------------------------------------------- */
export interface Users {
    id: number;
    username: string;
    email: string;
    employee_id: string;
    employee_status: string;
    firstname: string;
    lastname: string;
    department: string;
    site: string;
    position: string;
    position_level: string;
}

/* -------------------------------------------------------------------------- */
/*  Domain – Safety talk                                                      */
/* -------------------------------------------------------------------------- */
export interface SafetyTalkFields {
    topics: string[];
    noted: string;
    upload_url: string;
}

/* -------------------------------------------------------------------------- */
/*  Misc                                                                      */
/* -------------------------------------------------------------------------- */
export interface DropdownList {
    [key: string]: any[];
}

export interface TeamMember {
    id: string;
    name: string;
    avatar?: string;
    initials: string;
    role: string;
}

export interface ProjectInfo {
    title: string;
    icon: string;
    creator: TeamMember;
    deadline: string;
    team: TeamMember[];
}

/* -------------------------------------------------------------------------- */
/*  Form rendering (used by render.tsx + [id]/page.tsx)                       */
/* -------------------------------------------------------------------------- */
export interface FormField {
    label: string;
    type: "text" | "date" | "textarea" | "upload" | "dropdown" | "tags" | "checkbox";
    options?: { value: string; label: string }[];
    icon: string | React.ReactNode;
    fieldKey: string;
    value: string;
    values?: string[];
    readonly?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Calendar component                                                        */
/* -------------------------------------------------------------------------- */
export type DialogMode = "closed" | "view" | "add" | "day-list";

/* -------------------------------------------------------------------------- */
/*  TaskFilter – imperative ref + result shape                                */
/* -------------------------------------------------------------------------- */
export interface TaskFilterResult {
    search: string;
    status: TaskStatus | "all";
    selectedYears: number[];
    selectedMonths: number[];
    trainerId: string;
    clientName: string;
}

export interface TaskFilterRef {
    resetFilters: () => void;
    setTrainerFilter: (name: string) => void;
}

/* -------------------------------------------------------------------------- */
/*  Performance API                                                           */
/* -------------------------------------------------------------------------- */
export interface PerformanceData {
    summary: {
        open_count: number;
        pending_count: number;
        completed_count: number;
        total_count: number;
    };
    open: string[];
    pending: string[];
    completed: string[];
}

/* -------------------------------------------------------------------------- */
/*  Stepper                                                                   */
/* -------------------------------------------------------------------------- */
export interface StepItem {
    value: string;
    label: string;
    icon: React.ReactNode;
}
