import type { TaskFilterResult } from '../../../type';

/** แปลงตัวกรองบนหน้าเป็น query string ของ /api/task/analytics/* */
export const analyticsQuery = (filters: TaskFilterResult) => {
    const p = new URLSearchParams();
    filters.selectedYears.forEach(y => p.append('year', String(y)));
    filters.selectedMonths.forEach(m => p.append('month', String(m)));
    if (filters.trainerId) p.set('trainer_id', filters.trainerId);
    if (filters.clientName) p.set('client_name', filters.clientName);
    if (filters.status && filters.status !== 'all') p.set('status', filters.status);
    return p.toString();
};
