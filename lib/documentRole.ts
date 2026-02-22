export function documentRole (department: string, reporterName: string, currentUserName: string, currentDepartment: string): boolean {
    // Admin departments can always delete
    console.log("department / Current Department:", [department, currentDepartment]);
    if (currentDepartment === "Safety Standards" || currentDepartment === "Safety Standards [Compliance]" || currentDepartment === department) {
        return false;
    }
    // Only the reporter can delete their own case
    return reporterName !== currentUserName;
}