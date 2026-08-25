# รายงานความพร้อมระบบ — ACForm & Investigate AC

> ตรวจ + แก้ไข 2026-08-21 · ขอบเขต: เฉพาะ **ACForm (ส่วนที่ 1)** และ **AC Investigation Report (ส่วนที่ 2)**
> Frontend: `acnc-project` (Next.js) · Backend: `C:\Users\Lenovo\Desktop\FastAPI\ncacdb` (FastAPI) · Live: `https://api-ncac.onrender.com`

---

## สถานะปัจจุบัน

| ส่วน | ก่อนแก้ | หลังแก้ |
|---|---|---|
| Proxy `/api/investigate/ac` | 🔴 ไฟล์ว่าง ไม่มี handler | 🟢 GET/POST/PUT/DELETE ครบ |
| ENV `ac_investigation_url` | 🔴 404 | 🟢 ชี้ `/accident-case-investigate` |
| `why_analysis[].root_cause_id` | 🟠 หาย | 🟢 round-trip แล้ว |
| `root_causes[].problem` | 🟠 หาย | 🟢 round-trip แล้ว |
| `investigators[].employee_id` | 🟠 หาย | 🟢 round-trip แล้ว |
| `damage_items[]` (ACForm ส่วนที่ 1) | 🔴 ไม่มีใน backend | 🟢 มีตารางลูกแล้ว |
| `repair_request_no` / `breakdown_status` | 🔴 ไม่มีใน backend | 🟢 เพิ่ม column แล้ว |
| Dead code `investigate_report` | 🟡 ไม่มีวันทำงาน | 🟢 ลบแล้ว |
| `loadInvestigate()` กลืน error | 🟡 404 = 500 | 🟢 แยกแล้ว |

> **2026-08-24 — ส่วนที่ 2 เป็นสวิตช์เปิด/ปิดบนหน้าฟอร์ม ค่าเริ่มต้นคือปิด** ระหว่างที่ปิดอยู่ใช้การแนบ "เอกสารสอบสวน" + ปุ่มปิดเคสแทน ผู้ใช้กดเปิดฟอร์มเต็มเองได้ตลอด — ดูหัวข้อ [พักการใช้ฟอร์มสอบสวน](#พักการใช้ฟอร์มสอบสวน--ใช้แนบเอกสารแทน-2026-08-24)

**migration + ENV บน Vercel เสร็จแล้ว (2026-08-23)** — เหลือแค่ commit/deploy `ncacdb` แล้วค่อย redeploy frontend (ดูหัวข้อ "ก่อน deploy")

---

## สิ่งที่แก้ไปแล้ว

### Frontend (`acnc-project`)

**1. เขียน proxy route ใหม่ทั้งไฟล์** — [app/api/investigate/ac/route.ts](app/api/investigate/ac/route.ts)

เดิมมีแค่ `import` กับ comment 85 bytes → Next.js ตอบ 405 ทุก request ตอนนี้มีครบ:

| Method | ปลายทาง | หมายเหตุ |
|---|---|---|
| `POST` | `{ac_investigation_url}/{document_no}` | upsert, อ่าน `document_no` จาก header |
| `PUT` | เหมือนกัน | update only |
| `GET` | `?document_no=` | **404 ส่งกลับเป็น 404 + body `null`** ไม่แปลงเป็น 500 |
| `DELETE` | เหมือนกัน | เผื่อใช้ภายหลัง |

ต่างจาก proxy ของ NC ตรงที่ส่ง `detail` จาก FastAPI กลับมาให้ FE เห็นสาเหตุจริงเวลาบันทึกไม่ผ่าน

**2. แก้ ENV** — [.env.local](.env.local)

```diff
- ac_investigation_url = ".../accident-cases-investigate"   # 404
+ ac_investigation_url = ".../accident-case-investigate"    # 200
```

**3. แยก 404 ออกจาก error จริง** — [ACForm.tsx](components/ACForm.tsx) `loadInvestigate()`

เดิม `if (!res.ok) return;` ทำให้ระบบพัง (405/500) ดูเหมือน "ยังไม่เคยกรอก" — เป็นเหตุผลที่ blocker ตัวใหญ่ไม่ถูกจับได้เร็ว ตอนนี้ 404 = กรอกใหม่ ส่วน error อื่นเข้า `sendErrorLog()`

**4. ลบ dead code** — `attatchments_post()`

เดิมเช็ค `attachedFiles['investigate_report']` เพื่อดัน `casestatus` แต่ category นั้นถูกลบออกจาก `DOCUMENT_CATEGORIES` ไปแล้ว → เงื่อนไข false เสมอ ตอนนี้ใช้ `is_complete` ที่ backend ส่งกลับมาแทน (`_sync_case_status`) และ sync `casestatus` ให้เห็นบนจอทันทีหลังบันทึกผลการสอบสวน

### Backend (`ncacdb`) — ไม่ได้ commit ตามที่สั่ง

**5. เพิ่ม 3 ฟิลด์ที่ FE ส่งมาแต่ DB ทิ้ง** — `models/accident_case_investigate_model.py` + schema

| ตาราง | column ใหม่ | เหตุผล |
|---|---|---|
| `..._whys` | `root_cause_client_id` | FE แยกชุด Why-Why ตามแต่ละสาเหตุ ถ้าไม่เก็บ WHY ของทุกสาเหตุจะยุบไปรวมที่สาเหตุแรกตอนโหลดใหม่ |
| `..._root_causes` | `problem` | ประเด็นตั้งต้นของชุดวิเคราะห์ (= problem ของ WHY1) |
| `..._investigators` | `employee_id` | ผูกกับทะเบียนพนักงานแทนการเทียบจากชื่อ |

**6. ตัด orphan WHY แบบเดียวกับ measures** — `routes/accident_cases_investigate.py` `_apply_children()`

WHY ที่ชี้ไปยังสาเหตุที่ถูกลบไปแล้วจะถูกตัดทิ้ง แต่ **WHY ที่ `root_cause_id` ว่าง (ข้อมูลรูปแบบเดิม) ยังเก็บไว้** ให้ FE ผูกกับสาเหตุแรกเอง

**7. รองรับรายการความเสียหายของ ACForm ส่วนที่ 1**

- ตารางใหม่ `accident_case_damage_items` (`AccidentCaseDamageItem`) — cascade delete ตามเอกสาร, เรียงด้วย `seq`
- `accident_cases` เพิ่ม `repair_request_no`, `breakdown_status`
- `replace_damage_items()` — เขียนใหม่ทั้งชุดตาม state ของฟอร์ม, **ข้ามแถวว่างล้วน**, ตีเลข `seq` 1..n
- ต่อเข้าทั้ง `create_case` และ `update_case` + `joinedload` ในทุก query ที่อ่านเคส
- `to_dict()` ส่ง `damage_id = seq` กลับ ตรงกับที่ `normalizeDamageItems()` ฝั่ง FE คาดหวัง

**8. กัน setattr มั่ว** — `update_case()`

เพิ่ม `and hasattr(models.AccidentCase, k)` ทำให้ฟิลด์ที่ backend ไม่รู้จัก (`incident_cause`, `estimated_cost`, `site_name`, ...) ถูกข้ามอย่างชัดเจน แทนที่จะไปสร้าง attribute ลอย ๆ บน ORM object

**9. สคริปต์ migration** — `scripts/migrations/2026-08-21_ac_form_investigate.sql`

`Base.metadata.create_all()` สร้างได้แค่ตารางใหม่ ไม่ ALTER ตารางเดิม จึงต้องรันเอง เขียนแบบ idempotent (`IF NOT EXISTS` ทุกคำสั่ง) รันซ้ำได้ปลอดภัย

---

## ผลการทดสอบ

| การทดสอบ | ผล |
|---|---|
| `npx tsc --noEmit` (frontend) | ✅ ผ่าน ไม่มี error |
| `python -m py_compile` (ไฟล์ backend ที่แก้ทั้งหมด) | ✅ ผ่าน |
| `configure_mappers()` — relationship ทั้งระบบ | ✅ MAPPERS OK |
| `import schemas` — ทุก schema โหลดได้ | ✅ SCHEMAS OK |
| Round-trip `root_cause_id` / `problem` / `employee_id` | ✅ ค่าไม่ถูกทิ้งแล้ว |
| Round-trip `damage_items` / `repair_request_no` / `breakdown_status` | ✅ ผ่าน |
| `GET /accident-case-investigate/` (live) | ✅ 200 |
| `GET /accident-cases-investigate/` (live) | ✅ 404 — ยืนยันว่า env เดิมผิดจริง |

> ⚠️ `npx eslint` รันไม่ผ่านเพราะ config ของโปรเจกต์เอง (`TypeError: Converting circular structure to JSON` ใน `eslint.config.mjs`) — เป็นปัญหาเดิมที่มีอยู่ก่อน ไม่เกี่ยวกับการแก้ครั้งนี้ และไม่ได้แตะต้อง

---

## ก่อน deploy — งานที่ต้องทำด้วยมือ

### 1. ~~รัน migration บน Postgres production~~ ✅ รันแล้ว 2026-08-23

ปลายทาง: `db-mena-sb-...ondigitalocean.com:25060/ncacdb` — ผ่านครบทุกคำสั่ง ตรวจ `information_schema` ยืนยันแล้ว

| ตรวจ | ผล |
|---|---|
| `accident_cases.repair_request_no` / `.breakdown_status` | ✅ `varchar(50)` ทั้งคู่ |
| `accident_case_damage_items` (7 columns) | ✅ สร้างแล้ว + FK `ON DELETE CASCADE` + index `document_no_ac` |
| `..._whys.root_cause_client_id` `varchar(64)` + index | ✅ |
| `..._root_causes.problem` `text` | ✅ |
| `..._investigators.employee_id` `varchar(50)` | ✅ |
| ข้อมูลเดิม `accident_cases` | ✅ 595 แถวครบ ไม่มีการสูญหาย |

migration เป็นแบบเพิ่มอย่างเดียว โค้ด backend ตัวเก่าที่รันอยู่จึงไม่กระทบ — deploy ชุดใหม่ได้เลย

<details><summary>วิธีรันซ้ำ (idempotent) / รันกับ DB อื่น</summary>

เครื่อง dev ไม่มี `psql` — ใช้ runner แทน (`scripts/migrations/run_migration.py`, ต้องการแค่ `psycopg2`)
`DATABASE_URL` อยู่ที่ `C:\Users\Lenovo\Desktop\FastAPI\.env`

```powershell
# ดึง External Database URL จาก Render > PostgreSQL
$env:DATABASE_URL = "postgresql://..."
cd C:\Users\Lenovo\Desktop\FastAPI\ncacdb

# ดูก่อนว่าจะต่อไปที่ไหน + SQL หน้าตายังไง (ไม่รันจริง)
python scripts/migrations/run_migration.py scripts/migrations/2026-08-21_ac_form_investigate.sql --dry-run

# รันจริง — พังกลางทาง rollback ทั้งชุด แล้ว verify column ให้อัตโนมัติ
python scripts/migrations/run_migration.py scripts/migrations/2026-08-21_ac_form_investigate.sql
```

หรือถ้ามี `psql`: `psql "$DATABASE_URL" -f scripts/migrations/2026-08-21_ac_form_investigate.sql`

</details>

### 2. ~~ตั้ง `ac_investigation_url` บน Vercel~~ ✅ ตั้งแล้ว 2026-08-23

```
ac_investigation_url = https://api-ncac.onrender.com/accident-case-investigate
```

ยิงจริงยืนยันปลายทางแล้ว: `GET /accident-case-investigate/` → **200 `[]`** ส่วน path เดิมที่ผิด `/accident-cases-investigate/` → **404** ตามคาด

> ENV ใหม่มีผลกับ deployment ถัดไปเท่านั้น — ต้อง redeploy frontend ไม่ใช่แค่กด Save

### 3. Commit backend เอง (ตามที่สั่ง — ไม่ได้ commit ให้)

ไฟล์ที่แก้ใน `ncacdb`:

```
models/accident_case_model.py
models/accident_case_investigate_model.py
models/__init__.py
schemas/accident_schema.py
schemas/accident_case_investigate_schema.py
schemas/__init__.py
routes/accident_cases.py
routes/accident_cases_investigate.py
scripts/migrations/2026-08-21_ac_form_investigate.sql   (ไฟล์ใหม่)
scripts/migrations/run_migration.py                     (ไฟล์ใหม่ — runner แทน psql)
```

---

## รอบ QA ก่อน commit/deploy — 2026-08-23

ตรวจซ้ำทั้ง 2 repo แล้ว **ของเดิมไม่มีอะไรพัง** (`tsc --noEmit` ผ่าน, `next build` ผ่าน, `configure_mappers()` + import routes ผ่าน, schema ทุกตัวมี column รองรับครบ ไม่มีฟิลด์ไหนหลุด) เจอเพิ่ม 5 จุดและแก้ให้แล้ว:

**Q1. 🔴 บันทึกส่วนที่ 1 ไม่ผ่าน = เห็นแค่ "Internal server error"** — [app/api/document/ac/route.ts](../app/api/document/ac/route.ts)

proxy เดิม `throw new Error(...)` ทุกกรณีที่ backend ไม่ 2xx แล้วตอบ 500 ลอย ๆ ทับสาเหตุจริงหมด ถ้าวันดีพลอยลืมรัน migration จะได้ `UndefinedColumn: repair_request_no` แต่หน้าจอบอกแค่ "เกิดข้อผิดพลาดในการบันทึกข้อมูล" ตอนนี้ส่ง `detail` + status code จริงกลับมาแล้ว (แบบเดียวกับ proxy ของ investigate)

**Q2. 🔴 ช่องเวลาที่บันทึกผลการสอบสวนทับข้อมูลเดิมได้** — [components/ACForm.tsx](../components/ACForm.tsx)

`loadInvestigate()` ยิงหลังหน้าเรนเดอร์เสร็จ ระหว่างรอ response ฟอร์มส่วนที่ 2 เป็นแถวเปล่าที่ `ACInvestigate` seed ไว้ ถ้าผู้ใช้กด "บันทึกผลการสอบสวน" ในจังหวะนั้น `investigate_id` ยังว่าง → ยิง **POST (upsert, `partial=False`)** → สาเหตุ/WHY/มาตรการ/ผู้สอบสวนของเดิมถูกแทนด้วยแถวเปล่าทั้งชุด แก้โดยเพิ่ม `isLoadingInvestigate` ปิดปุ่มและกันที่ handler

**Q3. 🟠 ยอดค่าเสียหายจริงค้างค่าเดิม** — `useEffect` ซิงก์ยอดรวม

เดิม `if (total === 0) return;` ทำให้ลบยอดในรายการออกจนเหลือ 0 แล้ว `actual_vehicle_damage_value` ยังค้าง 50,000 อยู่ → `calculate_priority()` ฝั่ง backend คำนวณ priority จากค่าที่เกินจริง ตอนนี้ถ้ากลุ่มนั้น "เคยกรอก" (มีรายละเอียด/ผู้รับผิดชอบ/ยอด) จะซิงก์เป็น 0 ได้ ส่วนกลุ่มที่ยังว่างล้วนยังไม่แตะค่าเดิม (กันข้อมูลเก่าที่กรอกยอดรวมตรง ๆ ถูกล้าง)

**Q4. 🟠 แถวความเสียหายของกลุ่มที่เปลี่ยนเป็น "ไม่เสียหาย" ยังถูกบันทึก/พิมพ์** — `buildInitialReportPayload()` + [lib/printDocument.ts](../lib/printDocument.ts)

กรอกรายการรถไว้แล้วเปลี่ยน `truck_damage` เป็น no → ฟอร์มซ่อนแถวให้ แต่ payload ยังส่งไปลง DB และใบพิมพ์ยังขึ้นตาราง ตอนนี้กรองด้วย `visibleDamageGroups` ทั้งตอนบันทึกและตอนพิมพ์

**Q5. 🟡 `breakdown_status VARCHAR(20)` เหลือที่ว่าง 1 ตัวอักษร**

ค่าจริงจาก dropdown คือ `"ไม่สามารถวิ่งต่อได้"` = **19 ตัวอักษร** พอดีเป๊ะ เพิ่มตัวเลือกที่ยาวกว่านี้เมื่อไหร่ก็ 500 ทันที ขยายเป็น `VARCHAR(50)` ทั้ง model และ migration (มี `ALTER COLUMN ... TYPE` เผื่อคนที่รันสคริปต์เวอร์ชันก่อนไปแล้ว)

> `case_reports.breakdown_status` ก็ยังเป็น `VARCHAR(20)` เหมือนกัน — นอกขอบเขตรอบนี้ แต่ปัญหาเดียวกัน

### ผลตรวจซ้ำหลังแก้

| การทดสอบ | ผล |
|---|---|
| `npx tsc --noEmit` | ✅ ผ่าน |
| `npm run build` (Next.js production) | ✅ Compiled successfully — 34/34 pages |
| `import models, schemas, routes` + `configure_mappers()` | ✅ ผ่าน |
| `AccidentCaseCreate/Update` ทุกฟิลด์มี column รองรับ | ✅ ไม่มีฟิลด์ตกหล่น |

---

## ทดสอบ round-trip บน production — 2026-08-23

กรอกผลการสอบสวนจริงผ่าน proxy ของ Vercel (เส้นทางเดียวกับผู้ใช้) บนเคส `AC-BP-2608-007` แล้วอ่านกลับเทียบทีละฟิลด์ จากนั้นลบทิ้งและคืนสถานะเคส

**ผล: 62/63 ผ่าน** — ข้อที่ไม่ผ่านเป็นความคาดหวังที่เขียนผิดในสคริปต์ทดสอบเอง (ส่ง `employee_id: ""` แล้วคาดว่าจะได้ `null` กลับ แต่ได้ `""` ซึ่งถูกต้องอยู่แล้ว และ FE เช็คด้วย truthiness จึงไม่ต่างกัน)

| กลุ่มที่ตรวจ | ผล |
|---|---|
| ฟิลด์ parent 10 ตัว (รวม `accident_types`, วันที่ประเมินความเสี่ยง) | ✅ |
| `root_causes[].problem` / `id` / `seq` / `category` | ✅ |
| `why_analysis[].root_cause_id` — **2 สาเหตุ × ชุด WHY แยกกัน (3 + 2 ข้อ)** | ✅ ไม่ยุบรวม |
| `measures[]` ผูกกับสาเหตุถูกตัว + `action_completed_date` `""` → `null` | ✅ |
| `investigators[].employee_id` | ✅ |
| `is_complete` → ดัน `casestatus` เป็น Completed Investigate | ✅ |
| DELETE แล้วข้อมูลหายจริง (`GET` → 404, list → `[]`) | ✅ |
| คืน `casestatus` / `priority` / `damage_items` เท่าเดิม | ✅ |

### 🔴 บั๊กที่เจอระหว่างทดสอบ — `ac_investigation_url` มี `/` ท้าย

ค่าบน Vercel ตั้งเป็น `.../accident-case-investigate/` proxy จึงต่อ path ได้ `.../accident-case-investigate//AC-BP-2608-007` ซึ่ง FastAPI ไม่ match route ใดเลย ตอบ `404 {"detail":"Not Found"}`

อาการที่ผู้ใช้เห็นคือ **ฟอร์มส่วนที่ 2 ดูปกติทุกอย่าง แต่กดบันทึกไม่เคยเข้า DB** แล้วโหลดกลับมาขึ้นเป็น "ยังไม่เคยสอบสวน" เพราะ GET handler แปลง 404 ทุกชนิดเป็น `null` เหมือนกันหมด แยก "ยังไม่เคยกรอก" ออกจาก "ยิงผิด URL" ไม่ได้

> การยิง `GET` ผ่าน proxy แล้วได้ `404 null` **ไม่ได้พิสูจน์ว่า ENV ถูก** — ต้องยิง backend ตรง ๆ เทียบข้อความ `detail` ถึงจะแยกออก

แก้แล้วใน `target()` / `acUrl()` — ตัด `/` ท้าย base URL ก่อนต่อ path ทั้ง `investigate/ac` และ `document/ac` (ตัวหลังเปราะแบบเดียวกัน) พร้อม `encodeURIComponent` เลขที่เอกสาร **ตอนนี้โค้ดทนกับ ENV ที่มี slash ท้ายแล้ว ไม่ต้องแก้ค่าบน Vercel**

---

## พักการใช้ฟอร์มสอบสวน — ใช้แนบเอกสารแทน (2026-08-24)

ตามที่สั่งให้ **ซ่อนส่วนที่ 2 ไปก่อน** แล้วใช้การแนบเอกสารสอบสวนเป็นเงื่อนไขปิดเคสแทน

### 1. ส่วนที่ 2 เป็นสวิตช์เปิด/ปิด — ค่าเริ่มต้นคือปิด

> เดิมรอบแรกทำเป็น `SHOW_INVESTIGATE_SECTION = false` ตายตัวในโค้ด · **อัปเดต 2026-08-24 (รอบ 2):** เปลี่ยนเป็นปุ่มให้ผู้ใช้กดเองบนหน้าฟอร์ม

[components/ACForm.tsx](../components/ACForm.tsx) — ปุ่ม 📋 **"สอบสวน"** อยู่ในแถบปุ่มลอยด้านขวา (ชุดเดียวกับปุ่มพิมพ์) ขึ้นเมื่อเคสมีเลขที่เอกสารแล้ว

| สถานะปุ่ม | ผล |
|---|---|
| ปิด (ค่าเริ่มต้น) — ปุ่มสีเทา | ไม่มีกระดาษแผ่นที่ 2 · ไม่ยิง API ส่วนที่ 2 · ใบพิมพ์มีหน้าเดียว |
| เปิด — ปุ่มสีเขียว | กระดาษแผ่นที่ 2 + ปุ่มสลับมุมมอง split/stack กลับมา · โหลดข้อมูลสอบสวนจาก API |

**ระบบจำค่าที่เลือกไว้** ใน `localStorage` (`acFormShowInvestigate`) แบบเดียวกับมุมมอง split/stack ที่มีอยู่เดิม

**3 จุดที่ต้องระวังตอนทำ**

- **ไม่อ่าน `localStorage` ตอน initial state** — จะทำให้ฝั่ง server เรนเดอร์ "ปิด" แต่ client เรนเดอร์ "เปิด" แล้ว hydration ไม่ตรงกัน จึงเริ่มที่ `false` เสมอแล้วอ่านค่าที่จำไว้ใน `useEffect` ตอน mount
- **ปิดแล้วเปิดใหม่ต้องไม่ดึงข้อมูลทับของที่กรอกค้างไว้** — `loadedInvestigateDocRef` จำว่าโหลดเอกสารไหนไปแล้ว โหลดครั้งเดียวต่อเอกสาร
- **ใบพิมพ์ตามหน้าจอ** — ส่ง `investigateData` เป็น `undefined` เมื่อปิดอยู่ ไม่งั้นคนที่เปิดดูแล้วปิดกลับ จะได้ใบพิมพ์ที่มีส่วนที่ 2 ติดมาทั้งที่หน้าจอไม่มี

**โค้ดส่วนที่ 2 ยังอยู่ครบทุกไฟล์** ทั้ง `ACInvestigate.tsx`, proxy, backend, migration ที่รันไปแล้ว — เปิดใช้เต็มรูปแบบได้ทันที

> ปุ่มอยู่ในแถบลอยที่เป็น `hidden md:flex` เหมือนปุ่มพิมพ์ — **บนจอมือถือจึงยังไม่มีปุ่มนี้** ตรงกับพฤติกรรมเดิมของปุ่มพิมพ์

### 2. เพิ่มเอกสารแนบ "เอกสารสอบสวน"

[lib/attachment.ts](../lib/attachment.ts) — เพิ่มใน `DOCUMENT_CATEGORIES` ฝ่าย 🚨Safety

```ts
{
  value: "investigate_doc",
  label: "เอกสารสอบสวน",
  department: "🚨Safety",
  case: "ac",
  no: false,
  multiple: true,
}
```

ใช้ `value` เดิมที่ backend รู้จักอยู่แล้ว (`AccidentCaseDocData.investigate_doc` / `investigate_doc_remark`) จึงไม่ต้องแตะ backend เลย · `FileUpload` กับใบพิมพ์อ่านรายการจาก `getCategoriesByCase('ac')` แบบ dynamic เอกสารใหม่จึงโผล่ทั้ง 2 ที่อัตโนมัติ

พร้อม helper กลางไว้ที่เดียว ไม่ให้ค่าคีย์กระจายอยู่ในคอมโพเนนต์:

```ts
export const CASE_CLOSING_DOC = "investigate_doc";
export const getCaseClosingDocLabel = () => ...
export const hasCaseClosingDoc = (files: CategoryFiles) => ...
```

### 3. ปุ่ม "ปิดเคส"

วางไว้ใน `FormActionBar` ของส่วนที่ 1 ข้างปุ่มคัดลอกข้อมูล

| เงื่อนไข | พฤติกรรม |
|---|---|
| ยังไม่มีเลขที่เอกสาร / อยู่ใน view mode / เคสถูก Voided / ปิดไปแล้ว | ไม่แสดงปุ่ม |
| ยังไม่แนบเอกสารสอบสวน | ปุ่มเป็นสีเทากดไม่ได้ + ขึ้นข้อความใต้หัวข้อเอกสารแนบว่า `แนบเอกสารสอบสวนแล้วจึงจะปิดเคสได้` |
| แนบแล้ว | กดได้ → ถามยืนยัน → ปิดเคส |

ลำดับตอนกดปิดเคส:

1. **อัปโหลดไฟล์ที่ยังค้างอยู่ก่อน** (`attatchments_post`) — กันเคสที่ผู้ใช้เพิ่งลากไฟล์เข้ามาแล้วกดปิดเคสเลยโดยไม่ได้กด "อัปเดตข้อมูล" ไม่งั้นเคสปิดไปทั้งที่เอกสารยังไม่ขึ้นระบบ
2. `PUT /api/document/ac` ส่ง `casestatus: "Completed Investigate"` **พร้อม `docs`** เพื่อให้สถานะเอกสาร ("มี") ถูกบันทึกไปในรอบเดียวกัน
3. อัปเดต `casestatus` บนหน้าจอ → `CaseStatusBadge` เปลี่ยนทันที

ใช้สถานะ `Completed Investigate` ตัวเดิมของระบบ ไม่ได้เพิ่มสถานะใหม่ — [ACRecords.tsx](../components/ACRecords.tsx) แสดงผลเป็น **"Completed"** อยู่แล้ว และ Dashboard ก็นับรวมอยู่แล้ว

### 4. เคสที่ปิดแล้ว — ซ่อนเอกสารที่ยังไม่มีไฟล์อัตโนมัติ

เคสที่ปิดแล้วไม่มีใครมาแนบเอกสารเพิ่มอีก รายการที่ยังว่างจึงเหลือแค่ noise — ตอนนี้ถูกระบุเป็น **"ไม่ต้องแนบ"** ให้อัตโนมัติ เหลือบนหน้าจอเฉพาะเอกสารที่มีจริง

| เงื่อนไข | พฤติกรรม |
|---|---|
| เอกสารมีไฟล์แล้ว | ไม่แตะ แสดงตามปกติ |
| เอกสารบังคับแนบ (`required`) | **ไม่แตะ** ต้องเห็นว่ายังขาดอยู่เสมอ |
| เอกสารว่างที่ซ่อนได้ | ระบุ "ไม่ต้องแนบ" → ซ่อน |
| ผู้ใช้กด **"นำกลับมาแนบ"** | กลับมาแสดงตามปกติ **ไม่ถูกซ่อนซ้ำ** |

ตัวนับ 👁️ ท้ายชื่อฝ่ายบอกจำนวนที่ซ่อนอยู่ กดเพื่อดูรายการและกด "นำกลับมาแนบ" ได้ตลอด — ใช้ UI เดิมที่มีอยู่แล้ว ไม่ได้เพิ่มของใหม่

**จุดที่ต้องระวังตอนทำ**

- **ห้ามแยกเป็น effect ใหม่** — `FileUpload` มี effect ซิงก์สถานะเอกสารอยู่แล้ว ถ้าเพิ่มอีกตัว ทั้งคู่จะอ่าน `documentInfo` จาก closure รอบเดียวกันแล้วเขียนทับกันเอง (เอกสารที่แนบแล้วอาจเด้งกลับเป็น "ไม่มี") จึงรวมไว้ effect เดียว
- **ต้องทำครั้งเดียวต่อการเปลี่ยนเป็นปิด** — คุมด้วย `autoSkippedRef` ไม่งั้นพอกด "นำกลับมาแนบ" effect จะซ่อนกลับทันทีจนกดไม่ได้เลย
- **ต้องบันทึกลง DB ด้วย** — `handleCloseCase()` เรียก `skipEmptyDocs()` ตัวเดียวกันตอนประกอบ payload ไม่งั้นหน้าจอซ่อนแต่ `docs` ใน DB ยังเป็น "ไม่มี" แล้วใบพิมพ์จะไม่ตรงกับหน้าจอ

logic อยู่ที่ [lib/attachment.ts](../lib/attachment.ts) `skipEmptyDocs()` ที่เดียว ใช้ร่วมกันทั้ง `FileUpload` (แสดงผล) และ `ACForm` (บันทึก)

### สิ่งที่แทนที่กัน

| เดิม (ส่วนที่ 2 เปิดใช้) | ตอนนี้ |
|---|---|
| กรอกฟอร์มสอบสวนครบ → backend `_sync_case_status()` ดัน status ให้ | แนบเอกสารสอบสวน → กดปุ่มปิดเคสเอง |
| ปิดเคสอัตโนมัติเมื่อ `is_complete` | ปิดเคสด้วยมือ มีหน้าต่างยืนยันก่อน |

### ปุ่มปิดเคสบันทึกอะไรให้บ้าง

**ไม่ต้องกด "อัปเดตข้อมูล" ก่อน** — ปุ่มปิดเคสทำให้ 3 อย่าง: อัปโหลดไฟล์ที่ค้างอยู่ → บันทึก `docs` (รวมรายการที่ถูกซ่อน) → เปลี่ยน `casestatus`

แต่ **ไม่ได้บันทึกฟิลด์อื่นในฟอร์ม** (รายละเอียดเหตุการณ์ ค่าเสียหาย รายการความเสียหาย ฯลฯ) เพราะ payload ส่งไปแค่ 3 คีย์ — ตั้งใจให้แคบ เพื่อไม่ให้การปิดเคสไปเขียนทับข้อมูลโดยไม่ตั้งใจ

> ถ้าแก้ฟอร์มค้างไว้ด้วย ต้องกด "อัปเดตข้อมูล" ก่อน แล้วค่อยปิดเคส

**อัปโหลดไม่ผ่าน = ไม่ปิดเคส** — เดิม `attatchments_post()` กลืน error ไว้ไม่ throw ทำให้เคสถูกปิดทั้งที่เอกสารยังไม่ขึ้น S3 ตอนนี้คืนค่า `boolean` และ `handleCloseCase()` หยุดทันทีถ้าอัปโหลดล้มเหลว

### ผลตรวจ

| การทดสอบ | ผล |
|---|---|
| `npx tsc --noEmit` | ✅ ผ่าน |
| `npx next build` | ✅ Compiled successfully |
| ไม่มี API ของส่วนที่ 2 ถูกยิงตอน flag ปิด | ✅ `return` ก่อน fetch |

> ไม่ได้แตะ backend ในรอบนี้ — ไฟล์ `ncacdb` ที่รอ commit ยังเป็นชุดเดิมตามหัวข้อ "ก่อน deploy"

---

## ประเด็นที่เหลือ — ไม่บล็อก แต่ควรรู้

**R3. `list_investigations()` โหลดเกินจำเป็น** — ใช้ `_base_query()` ที่ `selectinload` ตารางลูกครบทุกตัว ทั้งที่ response ต้องการแค่ `count` ยังไม่กระทบตอนนี้ (ข้อมูล 0 แถว) แต่จะช้าเมื่อโตขึ้น

**R4. ไฟล์แนบมาตรการผูกกับ uid** — ชื่อไฟล์ `{document_no}_measure_{uid}_{rand}.ext` และ regex `/_measure_([a-z0-9]+)_/i` ตอนโหลด ถ้า uid ไม่ round-trip กลับมา ไฟล์แนบเดิมจะกำพร้าทันที ตอนนี้ backend เก็บ `client_id` ถูกต้องแล้ว — **ห้ามเปลี่ยน logic `_rows()` โดยไม่ระวัง**

**R5. `AccidentCaseUpdate` schema ไม่ได้ถูกใช้จริง** — `update_case()` รับ `payload: dict` ดิบ ๆ ไม่ผ่าน Pydantic validation เลย schema ตัวนี้จึงเป็นแค่เอกสารประกอบ ไม่ใช่ contract จริง

**R6. ยังไม่มีข้อมูลจริงในระบบ** — `GET /accident-case-investigate/` ตอบ `[]` แปลว่าไม่มี record เก่าต้อง migrate ข้อมูล เป็นจังหวะที่ดีที่สุดในการเปลี่ยน schema

**R7. `handleUpdate()` เรียก `attatchments_post()` แม้อัปเดตไม่ผ่าน** — เช็ค `responseData.document_no_ac !== ""` ซึ่งเป็น `undefined !== ""` = true ตอน error ทำให้ขึ้น alert ซ้อนอีกอัน ควรเช็ค `res.ok` ก่อน (ของเดิมมีอยู่ก่อนแล้ว ไม่ใช่ของใหม่)

**R8. ชื่อไฟล์แนบใช้เลขสุ่ม 2 หลัก** — `{document_no}_{category}_{00-99}.ext` อัปโหลดไฟล์ประเภทเดียวกันเยอะ ๆ มีโอกาสชนชื่อกัน (ของมาตรการใช้ 4 หลัก ปลอดภัยกว่า)
