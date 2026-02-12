export function documentRole (department: string, reporterName: string, currentUserName: string, currentDepartment: string): boolean {
    // Admin departments can always delete
    if (currentDepartment === "Safety Standards" || currentDepartment === "Compliance") {
        return false;
    }
    // Only the reporter can delete their own case
    return reporterName !== currentUserName;
}