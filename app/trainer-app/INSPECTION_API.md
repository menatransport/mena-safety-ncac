# Inspection API Documentation (Trainer App)

> เอกสารอ้างอิงเส้น API สำหรับระบบ Inspection ใน Trainer App  
> Backend Swagger: https://api-ncac.onrender.com/docs#/inspection  
> การ upload รูป หรือ link ไฟล์ จะต้องส่ง https://mena-safety-ncac.vercel.app/trainer-app/images/{inspection_task_id}
> Base URL (Next.js Proxy): `/api/task`

---

## สรุปภาพรวม Route Structure

```
app/api/task/
├── route.ts                                          GET, POST      (Tasks)
├── ppe/
│   └── route.ts                                      GET            (List PPE)
├── [id]/
│   ├── route.ts                                      GET, PUT, DELETE (Single Task)
│   ├── driver/
│   │   └── route.ts                                  POST           (Add Driver)
│   └── safety-talk/
│       ├── route.ts                                  GET, POST, PUT (Safety Talk)
│       
│        
└── driver/
    └── [id]/
        ├── route.ts                                  GET, PUT, DELETE (Driver)
        ├── status/
        │   └── route.ts                              PATCH          (Driver Status)
        ├── drug-test/
        │   └── route.ts                              GET, POST, PUT (Drug Test)
        ├── ppe/
        │   └── route.ts                              GET, POST, PUT (PPE Test)
        └── vehicle-inspect/
            └── route.ts                              GET, POST, PUT, DELETE (Vehicle)
```

---

## 1. Task (งาน)

### 1.1 GET `/api/task` — ดึงรายการงานทั้งหมด

|항목 | รายละเอียด |
|------|-----------|
| Method | `GET` |
| Backend | `GET /inspection/task/` |
| Response | `Task[]` |

**Response Example:**
```json
[
  {
    "inspection_task_id": "TASK-001",
    "trainer_id": "EMP-100",
    "client_name": "Client A",
    "plant_code": "PLT-01",
    "plan_date": "2026-04-01",
    "action_date": null,
    "inspection_task_status": "open"
  }
]
```

---

### 1.2 POST `/api/task` — สร้างงานใหม่

| 항목 | รายละเอียด |
|------|-----------|
| Method | `POST` |
| Backend | `POST /inspection/task/` |
| Body | `InspectionTaskCreate` |

**Request Body:**
```json
{
  "trainer_id": "EMP-100",
  "client_name": "Client A",
  "plant_code": "PLT-01",
  "plant_name": "Plant Name",
  "plan_date": "2026-04-01",
  "action_date": null,
  "inspection_task_status": "open"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `trainer_id` | string \| null | No | รหัสเทรนเนอร์ |
| `client_name` | string \| null | No | ชื่อลูกค้า |
| `plant_code` | string \| null | No | รหัส Plant |
| `plant_name` | string \| null | No | ชื่อ Plant |
| `plan_date` | date \| null | No | วันที่แผน |
| `action_date` | date \| null | No | วันที่ดำเนินงานจริง |
| `inspection_task_status` | string | **Yes** | สถานะงาน (`open`, `pending`, `cancel`, `inspection_done`) |

---

### 1.3 GET `/api/task/{id}` — ดึงข้อมูลงานตาม ID

| 항목 | รายละเอียด |
|------|-----------|
| Method | `GET` |
| Backend | `GET /inspection/task/{inspection_task_id}` |
| Params | `id` — inspection_task_id |

**Response:** `TaskDetail` (task + drivers)

---

### 1.4 PUT `/api/task/{id}` — อัปเดตงาน

| 항목 | รายละเอียด |
|------|-----------|
| Method | `PUT` |
| Backend | `PUT /inspection/task/{inspection_task_id}` |
| Params | `id` — inspection_task_id |
| Body | `InspectionTaskUpdate` |

**Request Body:**
```json
{
  "trainer_id": "EMP-100",
  "client_name": "Client A",
  "action_date": "2026-04-02",
  "inspection_task_status": "inspection_done",
  "drug_test_attachment": null
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `trainer_id` | string \| null | No | รหัสเทรนเนอร์ |
| `client_name` | string \| null | No | ชื่อลูกค้า |
| `action_date` | date \| null | No | วันดำเนินงานจริง |
| `inspection_task_status` | string \| null | No | สถานะงาน |
| `drug_test_attachment` | string \| null | No | ไฟล์แนบผลตรวจสารเสพติด |

---

### 1.5 DELETE `/api/task/{id}` — ลบงาน

| 항목 | รายละเอียด |
|------|-----------|
| Method | `DELETE` |
| Backend | `DELETE /inspection/task/{inspection_task_id}` |
| Params | `id` — inspection_task_id |
| Body | `DeleteTaskRequest` |

**Request Body:**
```json
{
  "deleted_by": "EMP-100",
  "remark": "ลบงานเนื่องจาก..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `deleted_by` | string | **Yes** | รหัสผู้ลบ |
| `remark` | string \| null | No | หมายเหตุ |

---

## 2. Driver (คนขับ)

### 2.1 POST `/api/task/{id}/driver` — เพิ่มคนขับในงาน

| 항목 | รายละเอียด |
|------|-----------|
| Method | `POST` |
| Backend | `POST /inspection/driver/{inspection_task_id}` |
| Params | `id` — inspection_task_id |
| Body | `DriverCreate` |

**Request Body:**
```json
{
  "driver_id": "DRV-001",
  "number_plate": "กข 1234",
  "truck_number": "TK-001",
  "truck_type": "6-wheel"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `driver_id` | string | **Yes** | รหัสคนขับ |
| `number_plate` | string | **Yes** | ทะเบียนรถ |
| `truck_number` | string | **Yes** | หมายเลขรถ |
| `truck_type` | string | **Yes** | ประเภทรถ |

---

### 2.2 GET `/api/task/driver/{id}` — ดึงรายละเอียดคนขับ

| 항목 | รายละเอียด |
|------|-----------|
| Method | `GET` |
| Backend | `GET /inspection/driver/{inspection_task_driver_id}` |
| Params | `id` — inspection_task_driver_id |

---

### 2.3 PUT `/api/task/driver/{id}` — อัปเดตคนขับ

| 항목 | รายละเอียด |
|------|-----------|
| Method | `PUT` |
| Backend | `PUT /inspection/driver/{inspection_task_driver_id}` |
| Body | `DriverUpdate` |

**Request Body:**
```json
{
  "number_plate": "กข 5678",
  "truck_number": "TK-002",
  "truck_type": "10-wheel",
  "first_name": "สมชาย",
  "last_name": "ใจดี",
  "inspection_date": "2026-04-02T10:00:00"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `number_plate` | string \| null | No | ทะเบียนรถ |
| `truck_number` | string \| null | No | หมายเลขรถ |
| `truck_type` | string \| null | No | ประเภทรถ |
| `first_name` | string \| null | No | ชื่อ |
| `last_name` | string \| null | No | นามสกุล |
| `inspection_date` | datetime \| null | No | วันที่ตรวจสอบ |

---

### 2.4 DELETE `/api/task/driver/{id}` — ลบคนขับ

| 항목 | รายละเอียด |
|------|-----------|
| Method | `DELETE` |
| Backend | `DELETE /inspection/driver/{inspection_task_driver_id}` |
| Params | `id` — inspection_task_driver_id |

---

### 2.5 PATCH `/api/task/driver/{id}/status?status={status}` — อัปเดตสถานะคนขับ

| 항목 | รายละเอียด |
|------|-----------|
| Method | `PATCH` |
| Backend | `PATCH /inspection/driver/{inspection_task_driver_id}/status` |
| Params | `id` — inspection_task_driver_id |
| Query | `status` (required) — สถานะใหม่ |

**ตัวอย่าง:**
```
PATCH /api/task/driver/DRV-001/status?status=inspection_done
```

---

## 3. Drug Test (ตรวจสารเสพติด)

### 3.1 POST `/api/task/driver/{id}/drug-test` — เพิ่มผลตรวจ

| 항목 | รายละเอียด |
|------|-----------|
| Method | `POST` |
| Backend | `POST /inspection/drug-test/{inspection_task_driver_id}` |
| Params | `id` — inspection_task_driver_id |
| Body | `DrugTestCreate` |

**Request Body:**
```json
{
  "alcohol": 0.0,
  "alcohol_attachment": "https://...",
  "amfetamin": "negative",
  "amfetamin_attachment": "https://...",
  "kra": "negative",
  "kra_attachment": "https://...",
  "thc": "negative",
  "thc_attachment": "https://..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alcohol` | number \| null | No | ค่าแอลกอฮอล์ (mg%) |
| `alcohol_attachment` | string \| null | No | ภาพผลตรวจแอลกอฮอล์ |
| `amfetamin` | string \| null | No | ผลแอมเฟตามีน (`negative`/`positive`) |
| `amfetamin_attachment` | string \| null | No | ภาพผลตรวจแอมเฟตามีน |
| `kra` | string \| null | No | ผลกระท่อม (`negative`/`positive`) |
| `kra_attachment` | string \| null | No | ภาพผลตรวจกระท่อม |
| `thc` | string \| null | No | ผลกัญชา (`negative`/`positive`) |
| `thc_attachment` | string \| null | No | ภาพผลตรวจกัญชา |

**Response:** `DrugTestResponse` (includes `drug_test_id`, `drug_test_status`)

---

### 3.2 PUT `/api/task/driver/{id}/drug-test` — อัปเดตผลตรวจ

เหมือน POST — ส่ง body `DrugTestCreate` เดียวกัน

---

### 3.3 GET `/api/task/driver/{id}/drug-test` — ดึงผลตรวจ

Response: `DrugTestResponse`

---

## 4. PPE Test (ตรวจอุปกรณ์ PPE)

### 4.1 POST `/api/task/driver/{id}/ppe` — เพิ่มผลตรวจ PPE

| 항목 | รายละเอียด |
|------|-----------|
| Method | `POST` |
| Backend | `POST /inspection/ppe/{inspection_task_driver_id}` |
| Body | `PPETestCreate` |

**Request Body:**
```json
{
  "helmet_check": "มี",
  "glasses_check": "มี",
  "mask_check": "ไม่มี",
  "vest_check": "มี",
  "glove_check": "ชำรุด",
  "safety_shoes_check": "มี",
  "ppe_attachment": "https://..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `helmet_check` | string \| null | No | หมวกนิรภัย |
| `glasses_check` | string \| null | No | แว่นตานิรภัย |
| `mask_check` | string \| null | No | หน้ากาก |
| `vest_check` | string \| null | No | เสื้อสะท้อนแสง |
| `glove_check` | string \| null | No | ถุงมือ |
| `safety_shoes_check` | string \| null | No | รองเท้านิรภัย |
| `ppe_attachment` | string \| null | No | ไฟล์แนบ |

**Response:** `PPETestResponse` (includes `ppe_test_id`, `ppe_status`)

---

### 4.2 PUT `/api/task/driver/{id}/ppe` — อัปเดตผลตรวจ PPE

เหมือน POST — ส่ง body: `PPETestUpdate`

---

### 4.3 GET `/api/task/driver/{id}/ppe` — ดึงผลตรวจ PPE

Response: `PPETestResponse`

---

### 4.4 GET `/api/task/ppe?status={status}` — ดึงรายการ PPE ทั้งหมด

| 항목 | รายละเอียด |
|------|-----------|
| Method | `GET` |
| Backend | `GET /inspection/ppe/` |
| Query | `status` (optional) — กรองตามสถานะ |

Response: `PPETestResponse[]`

---

## 5. Vehicle Inspect (ตรวจสภาพรถ)

### 5.1 POST `/api/task/driver/{id}/vehicle-inspect` — สร้างรายการตรวจรถ

| 항목 | รายละเอียด |
|------|-----------|
| Method | `POST` |
| Backend | `POST /inspection/vehicle-inspect/{inspection_task_driver_id}` |
| Body | `VehicleInspectCreate` |

**Request Body:**
```json
{
  "checklist": {
    "exterior": [
      { "item": "ไฟหน้า", "status": "pass", "remark": null },
      { "item": "ไฟท้าย", "status": "fail", "remark": "ชำรุด" }
    ],
    "interior": [
      { "item": "เข็มขัดนิรภัย", "status": "pass", "remark": null }
    ]
  },
  "around_check_attachment": ["https://img1.jpg", "https://img2.jpg"],
  "cockpit_attachment": "https://cockpit.jpg"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `checklist` | object (dict of ChecklistItem[]) | **Yes** | รายการตรวจแบ่งตามหมวด |
| `around_check_attachment` | string[] \| null | No | รูปตรวจรอบคัน |
| `cockpit_attachment` | string \| null | No | รูปห้องโดยสาร |

**ChecklistItem:**
| Field | Type | Required |
|-------|------|----------|
| `item` | string | **Yes** |
| `status` | string | **Yes** |
| `remark` | string \| null | No |

**Response:** `VehicleInspectResponse` (includes `vehicle_inspect_id`)

---

### 5.2 GET `/api/task/driver/{id}/vehicle-inspect` — ดึงข้อมูลตรวจรถ

### 5.3 PUT `/api/task/driver/{id}/vehicle-inspect` — อัปเดตข้อมูลตรวจรถ

### 5.4 DELETE `/api/task/driver/{id}/vehicle-inspect` — ลบข้อมูลตรวจรถ

---

## 6. Safety Talk (ประชุมความปลอดภัย)

### 6.1 POST `/api/task/{id}/safety-talk` — สร้าง Safety Talk

| 항목 | รายละเอียด |
|------|-----------|
| Method | `POST` |
| Backend | `POST /inspection/safety-talk/{inspection_task_id}` |
| Body | `SafetyTalkCreate` |

**Request Body:**
```json
{
  "topics": ["ขับรถปลอดภัย", "การใช้ PPE"], // หัวข้อพูดคุย
  "noted": "หมายเหตุเพิ่มเติม",
  "upload_url": "https://..." 
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `topics` | string[] \| null | No | หัวข้อ Safety Talk |
| `noted` | string \| null | No | หมายเหตุ |
| `upload_url` | string \| null | No | ไฟล์แนบ |

**Response:** `SafetyTalkResponse` (includes `safety_talk_id`, `inspection_task_id`)

---

### 6.2 PUT `/api/task/{id}/safety-talk` — อัปเดต Safety Talk

Body: `SafetyTalkUpdate` (same fields, all optional)

---

### 6.3 GET `/api/task/{id}/safety-talk` — ดึงข้อมูล Safety Talk

Response: `SafetyTalkResponse`

---

## Client-Side Usage Examples

### ดึงข้อมูลงานทั้งหมด
```ts
const res = await fetch('/api/task');
const tasks: Task[] = await res.json();
```

### สร้างงานใหม่
```ts
const res = await fetch('/api/task', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    trainer_id: 'EMP-100',
    client_name: 'Client A',
    plant_code: 'PLT-01',
    plan_date: '2026-04-01',
    inspection_task_status: 'open',
  }),
});
```

### เพิ่มคนขับ
```ts
const res = await fetch(`/api/task/${taskId}/driver`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    driver_id: 'DRV-001',
    number_plate: 'กข 1234',
    truck_number: 'TK-001',
    truck_type: '6-wheel',
  }),
});
```

### บันทึก Drug Test
```ts
const res = await fetch(`/api/task/driver/${driverId}/drug-test`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    alcohol: 0.0,
    amfetamin: 'negative',
    kra: 'negative',
    thc: 'negative',
  }),
});
```

### บันทึก PPE
```ts
const res = await fetch(`/api/task/driver/${driverId}/ppe`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    helmet_check: 'มี',
    glasses_check: 'มี',
    mask_check: 'มี',
    vest_check: 'มี',
    glove_check: 'มี',
    safety_shoes_check: 'มี',
  }),
});
```

### อัปเดตสถานะคนขับ
```ts
await fetch(`/api/task/driver/${driverId}/status?status=inspection_done`, {
  method: 'PATCH',
});
```

---

## Error Responses

ทุก endpoint จะส่ง error ในรูปแบบ:

```json
{
  "error": "Error message",
  "detail": { ... }
}
```

| Status | Description |
|--------|-------------|
| `400` | Bad Request — พารามิเตอร์ไม่ถูกต้อง |
| `404` | Not Found — ไม่พบข้อมูล |
| `422` | Validation Error — ข้อมูลไม่ผ่านการตรวจสอบ |
| `500` | Internal Server Error — ข้อผิดพลาดภายใน |
