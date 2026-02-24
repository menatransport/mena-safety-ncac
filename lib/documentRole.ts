export function documentRole (department: string, reporterName: string, currentUserName: string, currentDepartment: string ,site_name: string): boolean {
    const siteMatchDepart = [
        ["จัดส่งลาดกระบัง","ศลบ.","ศขก."],
        ["จัดส่งสระบุรี","สสบ.","ศรย."],
        ["จัดส่งบางปะกง","ศบก."],
    ]

    // ตรวจสอบว่า site_name ตรงกับ department ของ currentUser หรือไม่
    const matchedGroup = siteMatchDepart.find(group => group.slice(1).includes(site_name));
    const matchedDepartment = matchedGroup ? matchedGroup[0] : null;

    if (currentDepartment === "Safety Standards" || currentDepartment === "Safety Standards [Compliance]" || currentDepartment === department) {
        return false;
    }

    // ถ้า currentDepartment ตรงกับ department ที่ match จาก site_name
    if (matchedDepartment && currentDepartment === matchedDepartment) {
        return false;
    }

    // Only the reporter can edit their own case
    return reporterName !== currentUserName;
}