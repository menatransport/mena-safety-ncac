import type { Task, Users } from "@/app/trainer-app/type";

/**
 * Maps raw task list against dropdown data to resolve display values.
 *
 * @param tasks   - Raw task array (plant_code as ID, trainer_id as employee ID)
 * @param locations - Plant options array (plant_code, plant_name)
 * @param users   - Users array (employee_id, firstname, lastname)
 * @returns Task[] with plant_code→plant_name and trainer_id→name resolved
 */
/**
 * Maps a single Task against dropdown data to resolve display values.
 */
export function mapSingleTask(
    task: Task,
    locations: { plant_code: string; plant_name: string }[],
    users: Users[]
): Task {
    const plant = locations.find((v) => String(v.plant_code) === task.plant_code);
    const trainer = users.find((v) => String(v.employee_id) === task.trainer_id);
    return {
        ...task,
        plant_name: plant ? plant.plant_name : task.plant_code,
        trainer_id: trainer
            ? `${trainer.firstname} ${trainer.lastname}`
            : task.trainer_id,
    };
}

export function mapTasksWithDropdowns(
    tasks: Task[],
    locations: { plant_code: string; plant_name: string }[],
    users: Users[]
): Task[] {
    const hasLocations = locations && locations.length > 0;
    const hasUsers = users && users.length > 0;
    if (!hasLocations && !hasUsers) return tasks;

    return tasks.map((task) => {
        const plant = hasLocations
            ? locations.find((v) => String(v.plant_code) === task.plant_code)
            : undefined;
        const trainer = hasUsers
            ? users.find((v) => String(v.employee_id) === task.trainer_id)
            : undefined;
        return {
            ...task,
            plant_name: plant ? plant.plant_name : task.plant_code,
            trainer_id: trainer
                ? `${trainer.firstname} ${trainer.lastname}`
                : task.trainer_id,
        };
    });
}
