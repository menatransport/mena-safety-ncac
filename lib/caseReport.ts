export interface caseReport {
  document_no: string,
  site_id: number,
  department_id: number,
  client_id: number,
  vehicle_id_head: number,
  vehicle_id_tail: number,
  vehicle_truckno: string,
  origin_id: number,
  driver_role_id: number,
  driver_id: string,
  incident_cause_id: number,
  reporter_id: number,
  record_date: string,
  incident_date: string,
  case_location: string,
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
      unit: string
    }
  ]
}