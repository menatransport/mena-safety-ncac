
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
    const content = `🚨 รายงาน NC ระดับ ${priorityIcon(
        data.formData.priority)} 
    =====================
    
    📄 เลขที่เอกสาร: ${data.formData.document_no || 'ยังไม่ระบุ'}
    👤 ผู้รายงาน: ${data.userinfo?.name || 'ไม่ระบุ'}
    🏢 ศูนย์ปฏิบัติการ: ${data.selectedSite?.site_name_th || 'ไม่ระบุ'}
    🏛️ ฝ่าย: ${data.selectedDepartment?.department_name_th || 'ไม่ระบุ'}
    ⏰ วันที่แจ้ง: ${formatDT(data.formData.record_date) || 'ไม่ระบุ'}
    🔥 วันที่เกิดเหตุ: ${formatDT(data.formData.incident_date) || 'ไม่ระบุ'}

    📍 ข้อมูลการขนส่ง
    =====================
    ลูกค้า: ${data.selectedClient?.client_name || 'ไม่ระบุ'}
    ต้นทาง: ${data.selectedOrigin?.location_name || 'ไม่ระบุ'}
    ปลายทาง: ${data.formData.destination || 'ไม่ระบุ'}
    สถานที่เกิดเหตุ: ${data.formData.case_location || 'ไม่ระบุ'}

    🚚 ข้อมูลรถและคนขับ
    =====================
    ${data.selectedDriverRole?.role_name || 'ไม่ระบุ'}: ${data.selectedDriver ? `${data.selectedDriver.first_name} ${data.selectedDriver.last_name}` : 'ไม่ระบุ'}
    ทะเบียนรถหัว: ${data.selectedVehicleHead?.vehicle_number_plate || 'ไม่ระบุ'}
    ทะเบียนรถหาง: ${data.selectedVehicleTail?.vehicle_number_plate || 'ไม่ระบุ'}

    📦 ข้อมูลสินค้า
    =====================
    ${data.formData.products && data.formData.products.length > 0
      ? data.formData.products.map((product : any, index: number) =>
          `${index + 1}. ${product.product_name || 'ไม่ระบุ'} - ${product.amount || 0} ${product.unit || ''}`
        ).join('\n')
      : 'ไม่มีข้อมูลสินค้า'
    }

    💵มูลค่าเสียหาย (ประเมิน): ${data.formData.estimated_cost ? `${Number(data.formData.estimated_cost).toLocaleString()} บาท` : '-'}
    💵มูลค่าเสียหาย (จริง): ${data.formData.actual_price ? `${Number(data.formData.actual_price).toLocaleString()} บาท` : '-'}

    ⚠️ สาเหตุและรายละเอียด
    =====================
    สาเหตุ: ${data.selectedIncidentCause?.cause_name || 'ไม่ระบุ'}
    รายละเอียด: ${data.formData.case_details || 'ไม่ระบุ'}

    =====================
    `;
    
return content;
}

export const useClipboard_ac = (data: any) => {
    console.log("useClipboard_ac data:", data);
     const content = `🚨 รายงานอุบัติเหตุ AC ระดับ ${priorityIcon(
            data.formData.priority
          )}
    =====================
    
    📄 เลขที่เอกสาร: ${data.formData.document_no_ac || "ยังไม่ระบุ"}
    👤 ผู้รายงาน: ${data.userinfo?.name || "ไม่ระบุ"}
    🏢 ศูนย์ปฏิบัติการ: ${data.selectedSite?.site_name_th || "ไม่ระบุ"}
    🏛️ ฝ่าย: ${data.selectedDepartment?.department_name_th || "ไม่ระบุ"}
    ⏰ วันที่แจ้ง: ${formatDT(data.formData.record_datetime) || "ไม่ระบุ"}
    🔥 วันที่เกิดเหตุ: ${formatDT(data.formData.incident_datetime) || "ไม่ระบุ"}

    📍 ข้อมูลการขนส่ง
    =====================
    ลูกค้า: ${data.selectedClient?.client_name || "ไม่ระบุ"}
    ต้นทาง: ${data.selectedOrigin?.location_name || "ไม่ระบุ"}
    ปลายทาง: ${data.formData.destination || "ไม่ระบุ"}
    สถานที่เกิดเหตุ: ${data.formData.case_location || "ไม่ระบุ"}
    จังหวัด: ${data.selectedProvince?.province_name_th || "ไม่ระบุ"}
    อำเภอ: ${data.selectedDistrict?.district_name_th || "ไม่ระบุ"}
    ตำบล: ${data.selectedSubDistrict?.sub_district_name_th || "ไม่ระบุ"}

    🚚 ข้อมูลรถและคนขับ
    =====================
    ${data.selectedDriverRole?.role_name || "ไม่ระบุ"}: ${
            data.selectedDriver
              ? `${data.selectedDriver.first_name} ${data.selectedDriver.last_name}`
              : "ไม่ระบุ"
          }
    ทะเบียนรถหัว: ${data.selectedVehicleHead?.vehicle_number_plate || "ไม่ระบุ"}
    ทะเบียนรถหาง: ${data.selectedVehicleTail?.vehicle_number_plate || "ไม่ระบุ"}

    🩺 ผลการตรวจสอบ
    =====================
    ตรวจแอลกอฮอล์: ${
            data.formData.alcohol_test === "yes"
              ? `ผลลัพธ์ (${data.formData.alcohol_test_result || 0} mg/%)`
              : data.formData.alcohol_test === "no"
              ? "ยังไม่ได้ตรวจ"
              : ""
          }
    ตรวจสารเสพติด: ${
            data.formData.drug_test === "yes"
              ? `ผลลัพธ์ (${data.formData.drug_test_result || "ไม่พบ"})`
              : data.formData.drug_test === "no"
              ? "ยังไม่ได้ตรวจ"
              : ""
          }
    
    💔 ผู้ประสบเหตุ
    =====================
    เสียชีวิต: ${data.formData.fatalities || 0} คน
    บาดเจ็บส่งโรงพยาบาล: ${data.formData.injured_hospitalized || 0} คน
    บาดเจ็บไม่ส่งโรงพยาบาล: ${data.formData.injured_not_hospitalized || 0} คน

    📦 ความเสียหาย
    =====================
    สินค้าเสียหาย: ${
            data.formData.product_damage === "yes"
              ? "มี"
              : data.formData.product_damage === "no"
              ? "ไม่มี"
              : "ไม่ระบุ"
          } ${
            data.formData.product_damage === "yes" && data.formData.product_damage_details
              ? `รายละเอียด: ${data.formData.product_damage_details}`
              : ""
          }
    💵มูลค่าสินค้า (ประเมิน): ${
            data.formData.estimated_goods_damage_value
              ? `${Number(
                  data.formData.estimated_goods_damage_value
                ).toLocaleString()} บาท`
              : ""
          }
    💵มูลค่าสินค้า (จริง): ${
            data.formData.actual_goods_damage_value
              ? `${Number(data.formData.actual_goods_damage_value).toLocaleString()} บาท`
              : ""
          }
    
    รถเสียหาย: ${
            data.formData.truck_damage === "yes"
              ? "มี"
              : data.formData.truck_damage === "no"
              ? "ไม่มี"
              : ""
          } ${
            data.formData.truck_damage === "yes" && data.formData.truck_damage_details
              ? `รายละเอียด: ${data.formData.truck_damage_details}`
              : ""
          }
    💵มูลค่ารถ (ประเมิน): ${
            data.formData.estimated_vehicle_damage_value
              ? `${Number(
                  data.formData.estimated_vehicle_damage_value
                ).toLocaleString()} บาท`
              : "-"
          }
    💵มูลค่ารถ (จริง): ${
            data.formData.actual_vehicle_damage_value
              ? `${Number(
                  data.formData.actual_vehicle_damage_value
                ).toLocaleString()} บาท`
              : "-"
          }
    
    📝 รายละเอียดเหตุการณ์
    =====================
    ${data.formData.case_details || "ไม่ระบุ"}
    
    =====================
    `;

    return content;
}