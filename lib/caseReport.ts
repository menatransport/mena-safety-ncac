export interface caseReport_NC {
  document_no: string,
  site_id: number,
  department_id: number,
  department_name: string,
  driver_role_name: string,
  client_name: string,
  client_id: number,
  vehicle_id_head: number,
  vehicle_id_tail: number,
  vehicle_head_plate: string,
  vehicle_tail_plate: string,
  vehicle_truckno: string,
  origin_name: string,
  origin_id: number,
  reporter_name:string,
  priority: string,
  site_name: string,
  driver_name: string,
  driver_role_id: number,
  driver_id: string,
  incident_cause_id: number,
  reporter_id: number,
  record_date: string,
  incident_date: string,
  case_location: string,
  incident_cause: string,
  breakdown_status: string,
  description: string,
  destination: string,
  case_details: string,
  estimated_cost: number,
  actual_price: number,
  attachments: string,
  casestatus: string,
  products: [
    {
      product_id: number,
      product_name: string,
      amount: number,
      unit: string,
      damage_value: number,
      responsible_party: string
    }
  ],
 docs?: Array<{
    [key: string]: string;
  }>;
}

export interface caseReport_AC {
    site_id: number,
    case_id: string,
    site_name: string,
    department_id: number,
    department_name: string,
    driver_name: string,
    driver_role_name: string,
    client_name: string,
    client_id: number,
    vehicle_head_plate: string,
    vehicle_tail_plate: string,
    origin_name: string,
    origin_id: number,
    fault_party: string,
    reporter_id: number,
    reporter_name: string,
    record_datetime: string,
    incident_datetime: string,
    incident_date: string,  // เพิ่ม field นี้สำหรับใช้กับกราฟ (alias ของ incident_datetime)
    province_name: string,
    province_name_th: string,
    province_name_en: string,
    district_name: string,
    district_name_th: string,
    district_name_en: string,
    sub_district_name: string,
    sub_district_name_th: string,
    sub_district_name_en: string,
    province_id: number,
    district_id: number,
    sub_district_id: number,
    case_location: string,
    police_station_area: string,
    vehicle_id_head: number,
    vehicle_id_tail: number,
    vehicle_truckno: string,
    driver_role_id: number,
    driver_id: string,
    case_details: string,
    alcohol_test: string,
    drug_test: string,
    truck_damage: string,
    truck_damage_details: string,
    breakdown_status: string,
    product_damage: string,
    product_damage_details: string,
    injured_not_hospitalized: number,
    injured_hospitalized: number,
    fatalities: number,
    injury_description: string,
    other_party_full_name: string,
    other_party_vehicle_plate: string,
    other_party_company_name: string,
    other_party_phone: string,
    other_party_insurance_name: string,
    other_party_claim_no: string,
    claim_officer_full_name: string,
    claim_officer_phone: string,
    estimated_goods_damage_value: number,
    estimated_vehicle_damage_value: number,
    actual_goods_damage_value: number,
    actual_vehicle_damage_value: number,
    estimated_cost: number,  // รวมค่าเสียหายประเมิน
    actual_price: number,  // รวมค่าเสียหายจริง
    attachments: string,
    casestatus: string,
    priority: string,
    destination: string,
    alcohol_test_result: number,
    drug_test_result: string | null,
    accident_case_id: number,
    document_no_ac: string,
    incident_cause: string,  // เพิ่ม field สาเหตุ
    repair_request_no: string,  // เลขที่แจ้งซ่อม (MR) กรอกเมื่อรถเสียหาย
    damage_items: Array<{
      damage_id: number,
      damage_category: "goods" | "vehicle",  // สินค้า | รถและอื่นๆ (รวมยอดเข้า actual_goods / actual_vehicle)
      damage_detail: string,
      damage_value: number,
      responsible_party: string
    }>,
    docs?: Array<{
    [key: string]: string;
  }>;
}

// ===== AC Investigation (Part 2) =====
export interface acWhyItem {
  id: string,
  seq: number,          // ลำดับ WHY ภายในชุดวิเคราะห์ (1..n)
  root_cause_id: string, // ชุดวิเคราะห์ที่ WHY นี้สังกัด
  problem: string,      // ประเด็นที่ถาม (WHY1 = ประเด็นตั้งต้น, ถัดไป = คำตอบของ WHY ก่อนหน้า)
  cause: string         // คำตอบ "เพราะ ..."
}

export interface acRootCauseItem {
  id: string,
  seq: number,
  problem: string,   // ประเด็นปัญหาตั้งต้นของชุดวิเคราะห์ (จุดเริ่มของ Why-Why)
  root_cause: string,
  category: string   // 5M1E: man | machine | material | method | measurement | environment
}

export interface acMeasureItem {
  id: string,
  seq: number,
  root_cause_id: string,
  measure: string,
  pic_contract: string,
  plan_date: string,
  action_completed_date: string
}

export interface acMeasureExistingFile {
  key: string,
  fileName: string,
  url: string
}

export interface acInvestigatorItem {
  id: string,
  seq: number,
  employee_id?: string,  // รหัสพนักงานที่เลือกจากทะเบียนพนักงาน (Active)
  name: string,
  position: string
}

export interface investigate_AC {
  investigate_id?: number,
  document_no_ac: string,
  accident_types: string[],          // multi-select
  severity_level: string,            // L1 - L5
  accident_description: string,
  why_analysis: acWhyItem[],
  root_causes: acRootCauseItem[],
  measures: acMeasureItem[],
  risk_assessment_completed: string,   // yes | no
  risk_assessment_reviewed: string,    // yes | no | na
  risk_assessment_result: string,      // required_revise | not_required_revise
  risk_assessment_date: string,
  risk_assessment_team: string,
  risk_assessment_attached: string,    // yes | no | na
  investigators: acInvestigatorItem[],
  avoidability: string                 // avoidable | unavoidable
}

export interface investigate_NC {
  root_cause: string|number,
  root_cause_analysis: string,
  claim_type: string,
  insurance_claim: number,
  product_resellable: number,
  remaining_damage_cost: number,
  driver_cost: number,
  investigate_id: number,
  company_cost: number,
  corrective_actions: [
    {
      id: number,
      corrective_action: string,
      pic_contract: string,
      plan_date: string,
      action_completed_date: string
    }
  ]
}