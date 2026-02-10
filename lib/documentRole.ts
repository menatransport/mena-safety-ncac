export function documentRole (department: string, reporterName: string, currentUserName: string, currentDepartment: string): boolean {
    return reporterName !== currentUserName && department !== currentDepartment && currentDepartment !== "Safety Standards" && currentDepartment !== "Compliance";
}