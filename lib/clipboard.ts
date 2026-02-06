
const priorityIcon = (priority: string | undefined) => {
    switch (priority) {
      case "Minor":
        return "🟡 Minor";
      case "Significant":
        return "🟣 Significant";
      case "Major":
        return "🟠 Major";
      case "Crisis":
        return "🔴 Crisis";
      default:
        return "⚪ null";
    }
  };

const formatDT = (dateTimeString?: string) => {
    if (!dateTimeString) return "";
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return dateTimeString; 

    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Intl.DateTimeFormat("en-GB", options).format(date);
  };

export const useClipboard_nc = (data: any) => {
console.log("useClipboard_nc data:", data);
    const content = `🚨 รายงาน NC 
ระดับ ${priorityIcon(
        data.formData.priority)} 
====================
📄 เลขที่เอกสาร: ${data.formData.document_no || 'N/A'}
👤 ผู้รายงาน: ${data.formData.reporter_name || 'N/A'}
🏢 ศูนย์ปฏิบัติการ: ${data.selectedSite?.site_name_th || 'N/A'}
🏛️ ฝ่าย: ${data.selectedDepartment?.department_name_th || 'N/A'}
⏰ วันที่แจ้ง: ${formatDT(data.formData.record_date) || 'N/A'}
🔥 วันที่เกิดเหตุ: ${formatDT(data.formData.incident_date) || 'N/A'}

🔗 https://mena-safety-ncac.vercel.app/nc-form?doc=${data.formData.document_no}
====================
รายละเอียด: ${data.formData.case_details || 'N/A'}
    `;
    
return content;
}

export const useClipboard_ac = (data: any) => {
    console.log("useClipboard_ac data:", data);
     const content = `🚨 รายงานอุบัติเหตุ AC 
ระดับ ${priorityIcon(
    data.formData.priority
          )}
=====================
📄 เลขที่เอกสาร: ${data.formData.document_no_ac || "N/A"}
👤 ผู้รายงาน: ${data.userinfo?.name || "N/A"}
🏢 ศูนย์ปฏิบัติการ: ${data.selectedSite?.site_name_th || "N/A"}
🏛️ ฝ่าย: ${data.selectedDepartment?.department_name_th || "N/A"}
⏰ วันที่แจ้ง: ${formatDT(data.formData.record_datetime) || "N/A"}
🔥 วันที่เกิดเหตุ: ${formatDT(data.formData.incident_datetime) || "N/A"}
🕵️‍♂️ เป็นฝ่าย: ${data.formData.fault_party === 'เป็นฝ่ายถูก' ? 'ถูก' : data.formData.fault_party === 'เป็นฝ่ายผิด' ? 'ผิด' : data.formData.fault_party === 'ประมาทร่วม' ? 'ประมาทร่วม' : 'N/A'}

🔗 https://mena-safety-ncac.vercel.app/ac-form?doc=${data.formData.document_no_ac}
=====================
รายละเอียด: ${data.formData.case_details || "N/A"}
`;

    return content;
}