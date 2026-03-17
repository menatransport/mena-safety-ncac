// ============================
// Trainer App - Type Definitions
// ============================

export type TaskStatus = "Open" | "Pending" | "Cancel" | "Abesnt" | "Inspection Done";

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

export interface Task {
    plant_code: string;
    inspection_task_id: string;
    action_date: string | null;
    trainer_id: string;
    client_name: string;
    plan_date: string;
    inspection_task_status: TaskStatus | null;
}

export interface CreateTask {
    trainer_id: string;
    client_name: string;
    plant_code: string;
    plan_date: string;
    action_date: string;
    inspection_task_status: string;
}

export interface Driver {
    inspection_task_id: string;
    driver_id: string;
    truck_number: string | null;
    drug_test_id: number | null;
    vehicle_inspect_id: number | null;
    inspection_task_driver_id: string;
    truck_id: string;
    truck_type: string | null;
    ppe_test_id: number | null;
    inspection_task_driver_status: string | null;
}

export interface TaskDetail {
    task: Task;
    drivers: Driver[];
}
