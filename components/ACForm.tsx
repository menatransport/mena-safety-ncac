"use client";
import { useState, useEffect, useCallback } from "react";
import { DateTimePicker24h } from "./ui/datetime-picker";
import { SearchableSelect } from "./ui/searchable-select";
import { useSearchParams } from "next/navigation";
import { useDropdownStore } from "@/lib/dropdownlist";
import { caseReport_AC, investigate_AC } from "@/lib/caseReport";
import {
  ACInvestigateComponent,
  MeasureFileMap,
  MeasureExistingFileMap,
  normalizeInvestigateData,
} from "./ACInvestigate";
import { FormActionBar, FormActionButton } from "./FormActionBar";
import { FileUpload } from "./FileUpload";
import { getMissingRequiredDocs } from "@/lib/attachment";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import { useClipboard_ac } from "@/lib/clipboard";
import { LoaderPage } from "./LoaderPage";
import { Printer, Columns2, Rows2, CirclePlus, Trash2, Bug, Copy, X } from "lucide-react";
import { printDocument_ac } from "@/lib/printDocument";
import { sendErrorLog } from "@/lib/logError";
import { documentRole } from "@/lib/documentRole";
import { useUiTheme } from "@/lib/useUiTheme";
import { CaseStatusBadge } from "./CaseStatusBadge";

interface FileWithId {
  id: string;
  file: File;
  url: string;
  category: string;
  uploadDate: Date;
  updateData: string;
}
interface CategoryFiles {
  [key: string]: FileWithId[];
}

// มุมมองกระดาษ: จำค่าที่ผู้ใช้เลือกไว้ใน localStorage
type LayoutMode = "stack" | "split";
const LAYOUT_STORAGE_KEY = "acFormLayoutMode";

const readStoredLayout = (): LayoutMode => {
  if (typeof window === "undefined") return "stack";
  const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
  return stored === "split" || stored === "stack" ? stored : "stack";
};
// รายการความเสียหาย: แยกเป็นกลุ่มสินค้า / รถและอื่นๆ กลุ่มละอย่างน้อย 1 แถว รวมกันสูงสุด 15 แถว
type DamageCategory = "goods" | "vehicle";

type DamageItem = {
  damage_id: number;
  /** กลุ่มของรายการ ใช้รวมยอดเข้า actual_goods / actual_vehicle */
  damage_category: DamageCategory;
  damage_detail: string;
  damage_value: number;
  responsible_party: string;
};

const DAMAGE_ITEM_MIN_ROWS_PER_GROUP = 1;
const DAMAGE_ITEM_MAX_ROWS = 15;
const RESPONSIBLE_PARTY_OPTIONS = ["บริษัท", "พจส", "คู่กรณี", "ประกัน"];

/** นิยามกลุ่มความเสียหาย + ฟิลด์ยอดรวมจริง และเงื่อนไขที่ทำให้กลุ่มนี้แสดง */
const DAMAGE_GROUPS: {
  key: DamageCategory;
  label: string;
  totalField: "actual_goods_damage_value" | "actual_vehicle_damage_value";
  damageFlag: "product_damage" | "truck_damage";
}[] = [
    {
      key: "goods",
      label: "ความเสียหายของสินค้า",
      totalField: "actual_goods_damage_value",
      damageFlag: "product_damage",
    },
    {
      key: "vehicle",
      label: "ความเสียหายของรถและอื่นๆ",
      totalField: "actual_vehicle_damage_value",
      damageFlag: "truck_damage",
    },
  ];

const createDamageItem = (
  id: number,
  category: DamageCategory
): DamageItem => ({
  damage_id: id,
  damage_category: category,
  damage_detail: "",
  damage_value: 0,
  responsible_party: "",
});

const createEmptyDamageItems = (): DamageItem[] =>
  DAMAGE_GROUPS.map((group, index) => createDamageItem(index + 1, group.key));

// ข้อมูลจาก API อาจไม่มี damage_items หรือยังไม่มีกลุ่ม (ของเดิมถือเป็น "รถและอื่นๆ")
const normalizeDamageItems = (items: any): DamageItem[] => {
  const list = Array.isArray(items) ? items : [];
  const normalized: DamageItem[] = list
    .slice(0, DAMAGE_ITEM_MAX_ROWS)
    .map((item: any, index: number) => ({
      damage_id: index + 1,
      damage_category:
        item?.damage_category === "goods" ? "goods" : "vehicle",
      damage_detail: item?.damage_detail || "",
      damage_value: Number(item?.damage_value) || 0,
      responsible_party: item?.responsible_party || "",
    }));

  // เติมให้ทุกกลุ่มมีอย่างน้อย 1 แถวเสมอ
  DAMAGE_GROUPS.forEach((group) => {
    const count = normalized.filter(
      (item) => item.damage_category === group.key
    ).length;
    for (let i = count; i < DAMAGE_ITEM_MIN_ROWS_PER_GROUP; i++) {
      normalized.push(
        createDamageItem(
          Math.max(0, ...normalized.map((item) => item.damage_id)) + 1,
          group.key
        )
      );
    }
  });

  return normalized;
};

export const ACFormComponent = () => {
  const router = useRouter();

  const {
    sites,
    departments,
    clients,
    vehicles,
    locations,
    driver_roles,
    masterdrivers,
    provinces,
    districts,
    subdistricts,
    isLoading: isDropdownLoading,
    fetchDropdownData,
    fetchSingleDropdown,
    getData,
  } = useDropdownStore();

  const [formData, setFormData] = useState<Partial<caseReport_AC>>({
    alcohol_test: "",
    casestatus: "",
    drug_test: "",
    product_damage: "",
    record_datetime: new Date().toISOString(),
    injured_not_hospitalized: 0,
    injured_hospitalized: 0,
    fatalities: 0,
    estimated_goods_damage_value: 0,
    estimated_vehicle_damage_value: 0,
    actual_goods_damage_value: 0,
    actual_vehicle_damage_value: 0,
    alcohol_test_result: 0,
    damage_items: createEmptyDamageItems(),
  });

  // Part 2 : Investigate Report (แสดงเมื่อมีเลขที่เอกสารแล้ว)
  const [formInvestigate, setFormInvestigate] = useState<
    Partial<investigate_AC>
  >({
    accident_types: [],
    severity_level: "",
    accident_description: "",
    risk_assessment_completed: "",
    risk_assessment_reviewed: "",
    risk_assessment_result: "",
    risk_assessment_team: "",
    risk_assessment_attached: "",
    avoidability: "",
  });

  const [isSavingForm, setIsSavingForm] = useState(false);
  const [isSavingInvestigate, setIsSavingInvestigate] = useState(false);
  // ระหว่างโหลดผลการสอบสวนเดิม ห้ามบันทึกทับ — POST เป็น upsert แบบแทนที่ทั้งชุด
  const [isLoadingInvestigate, setIsLoadingInvestigate] = useState(false);

  // ไฟล์แนบของแต่ละมาตรการ (ส่วนที่ 2)
  const [measureFiles, setMeasureFiles] = useState<MeasureFileMap>({});
  const [measureExistingFiles, setMeasureExistingFiles] =
    useState<MeasureExistingFileMap>({});

  // มุมมองกระดาษ: "stack" = เรียงลงมาทีละแผ่น, "split" = วางคู่กัน 2 คอลัมน์
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() =>
    readStoredLayout()
  );

  const toggleLayoutMode = () => {
    setLayoutMode((prev) => {
      const next: LayoutMode = prev === "split" ? "stack" : "split";
      localStorage.setItem(LAYOUT_STORAGE_KEY, next);
      return next;
    });
  };

  const [isViewMode, setIsViewMode] = useState(false);
  const [isLoadingFormData, setIsLoadingFormData] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<CategoryFiles>({});
  const [userinfo, setUserinfo] = useState<any>(null);
  const [docValue, setDocValue] = useState<any[]>([]);
  const { theme } = useUiTheme();

  const searchParams = useSearchParams();

  // ========== Dev Payload Log (ซ่อนไว้ เปิดด้วยปุ่ม / เห็นเฉพาะ dev หรือ ?debug=1) ==========
  const [showPayload, setShowPayload] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const [filteredData, setFilteredData] = useState<{
    masterdrivers?: any[];
    locations?: any[];
    clients?: any[];
    vehicles?: any[];
    districts?: any[];
    subdistricts?: any[];
    provinces?: any[];
  }>({
    masterdrivers: [],
    locations: [],
    clients: [],
    vehicles: [],
    districts: [],
    subdistricts: [],
    provinces: [],
  });

  useEffect(() => {
    const initializeForm = async () => {
      const userData = localStorage.getItem("userData");
      if (!userData) {
        alert("ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
        console.warn("No userData found in localStorage");
        router.push("/login");
        return;
      }

      try {
        const parsedUserData = JSON.parse(userData);

        if (
          !parsedUserData?.id ||
          !parsedUserData?.firstname ||
          !parsedUserData?.lastname
        ) {
          console.error("Incomplete userData:", parsedUserData);
          return;
        }

        const newUserinfo = {
          id: parsedUserData.id,
          employee_id: parsedUserData.employee_id || "",
          name: `${parsedUserData.firstname} ${parsedUserData.lastname}`.trim(),
          department: parsedUserData.department || "",
          site: parsedUserData.site || "",
          position: parsedUserData.position || "",
          position_level: parsedUserData.position_level || "",
          position_level_id: parsedUserData.position_level_id || "",
        };

        setUserinfo(newUserinfo);

        const docId = searchParams.get("doc");

        const dropdownPromise = sites?.length === 0 ? fetchDropdownData() : Promise.resolve();

        if (docId) {
          document.title = `${docId}`;
          setIsLoadingFormData(true);

          const documentPromise = fetch(
            `/api/document/ac?case_id=${encodeURIComponent(docId)}`,
            {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            }
          ).then(res => res.json().then(data => ({ res, data })));

          const attachmentPromise = fetch(
            `/api/attachment?document_no=${encodeURIComponent(docId)}`,
            {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            }
          ).then(res => res.ok ? res.json() : null);

          try {
            const [, documentResult, attachmentData] = await Promise.all([
              dropdownPromise,
              documentPromise,
              attachmentPromise,
              fetchSingleDropdown('vehicles'),
              fetchSingleDropdown('masterdrivers'),
              fetchSingleDropdown('provinces'),
              fetchSingleDropdown('districts'),
              fetchSingleDropdown('subdistricts'),
            ]);

            const { res, data } = documentResult;

            if (res.ok) {
              // console.log('Fetched AC record data:', data);
              // console.log('Fetched newUserinfo:', newUserinfo);
              setIsViewMode(documentRole(data.department_name, data.reporter_name, newUserinfo.name, newUserinfo.department, data.site_name));
              setFormData({
                ...data,
                damage_items: normalizeDamageItems(data.damage_items),
              });

              await mapTextDataToIds(data);

              if (attachmentData) {
                processAttachmentData(attachmentData);
              }
            } else {
              throw new Error(
                data.message || `HTTP ${res.status}: ${res.statusText}`
              );
            }
          } catch (error) {
            console.error("Error fetching AC record:", error);
          } finally {
            setIsLoadingFormData(false);
          }
        } else {
          document.title = "MENA NCAC - AC Form";
          await dropdownPromise;
        }
      } catch (error) {
        console.error("Error parsing userData from localStorage:", error);
        setUserinfo(null);
      }
    };

    initializeForm();
  }, []);

  // โหลดข้อมูลการสอบสวน (ส่วนที่ 2) เมื่อมีเลขเคสแล้ว
  useEffect(() => {
    const docNo = formData.document_no_ac;
    if (!docNo) return;

    let cancelled = false;

    setFormInvestigate((prev) =>
      prev.document_no_ac === docNo ? prev : { ...prev, document_no_ac: docNo }
    );

    const loadInvestigate = async () => {
      setIsLoadingInvestigate(true);
      try {
        const res = await fetch(
          `/api/investigate/ac?document_no=${encodeURIComponent(docNo)}`
        );
        if (cancelled) return;

        // 404 = ยังไม่เคยสอบสวนเอกสารนี้ ถือว่าเป็นการกรอกใหม่ (ไม่ใช่ระบบพัง)
        if (res.status === 404) return;

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        if (!data || cancelled) return;
        setFormInvestigate((prev) => ({
          ...prev,
          ...normalizeInvestigateData(data),
          document_no_ac: docNo,
        }));
      } catch (error) {
        // โหลดไม่สำเร็จจริง ๆ ต้องเห็นใน log ไม่ใช่เงียบไปเหมือนยังไม่เคยกรอก
        console.error("Load investigate data error:", error);
        sendErrorLog(
          "ACForm/loadInvestigate",
          error instanceof Error ? error : String(error)
        );
      } finally {
        if (!cancelled) setIsLoadingInvestigate(false);
      }
    };

    loadInvestigate();
    loadMeasureFiles(docNo);

    return () => {
      cancelled = true;
    };
  }, [formData.document_no_ac]);

  const processAttachmentData = (data: any) => {
    const categorizedFiles: CategoryFiles = {};

    if (data.files && Array.isArray(data.files)) {
      data.files.forEach((file: any) => {
        const fileName = file.fileName || "";
        const parts = fileName.split("_");

        if (parts.length >= 3) {
          const category = parts.slice(1, -1).join("_");

          // ไฟล์แนบของมาตรการ (ส่วนที่ 2) แยกจัดการต่างหาก ไม่ปนกับไฟล์แนบส่วนที่ 1
          if (category.startsWith("measure_")) return;

          if (!categorizedFiles[category]) {
            categorizedFiles[category] = [];
          }

          const mockFile = new File([""], fileName, {
            type: fileName.toLowerCase().includes(".pdf")
              ? "application/pdf"
              : "image/jpeg",
          });

          categorizedFiles[category].push({
            id: file.key || Math.random().toString(36).substr(2, 9),
            file: mockFile,
            url: file.url,
            updateData: "existing",
            category: category,
            uploadDate: new Date(),
          });
        }
      });
    }
    setAttachedFiles(categorizedFiles);
  };

  const mapTextDataToIds = async (data: any) => {
    const mappedData: any = {};
    const store = getData();
    if (data.site_name && store.sites) {
      const site = store.sites.find(
        (val: any) => val.site_name_th === data.site_name
      );
      if (site) mappedData.site_id = site.site_id;
    }

    if (data.department_name && store.departments) {
      const department = store.departments.find(
        (val: any) => val.department_name_th === data.department_name
      );
      if (department) mappedData.department_id = department.department_id;
    }

    if (data.client_name && store.clients) {
      const client = store.clients.find(
        (val: any) => val.client_name === data.client_name
      );
      if (client) mappedData.client_id = client.client_id;
    }

    if (data.origin_name && store.locations) {
      const location = store.locations.find(
        (val: any) => val.location_name === data.origin_name
      );
      if (location) mappedData.origin_id = location.location_id;
    }

    // Field จังหวัด อำเภอ ตำบล

    if (data.province_name && store.provinces) {
      const province = store.provinces.find(
        (val: any) => val.province_name_th === data.province_name
      );
      if (province) {
        mappedData.province_id = province.province_id;
      }
    }

    if (data.district_name && store.districts) {
      const district = store.districts.find(
        (val: any) => val.district_name_th === data.district_name
      );
      if (district) {
        mappedData.district_id = district.district_id;
        setFilteredData((prev) => ({
          ...prev,
          districts: [district],
        }));
      }
    }

    if (data.sub_district_name && store.subdistricts) {
      const subdistrict = store.subdistricts.find(
        (val: any) => val.sub_district_name_th === data.sub_district_name
      );
      if (subdistrict) {
        mappedData.sub_district_id = subdistrict.sub_district_id;
        setFilteredData((prev) => ({
          ...prev,
          subdistricts: [subdistrict],
        }));
      }
    }

    if (data.vehicle_head_plate && store.vehicles) {
      const vehicle = store.vehicles.find(
        (val: any) =>
          val.vehicle_number_plate === data.vehicle_head_plate &&
          val.plate_type === "head"
      );
      if (vehicle) {
        mappedData.vehicle_truckno = vehicle.truck_no;
        mappedData.vehicle_id_head = vehicle.vehicle_id;
      }
    }

    if (data.vehicle_tail_plate && store.vehicles) {
      const vehicle = store.vehicles.find(
        (val: any) =>
          val.vehicle_number_plate === data.vehicle_tail_plate &&
          val.plate_type === "tail"
      );
      if (vehicle) mappedData.vehicle_id_tail = vehicle.vehicle_id;
    }

    if (data.driver_role_name && store.driver_roles) {
      const role = store.driver_roles.find(
        (val: any) => val.role_name === data.driver_role_name
      );
      if (role) mappedData.driver_role_id = role.driver_role_id;
    }

    if (data.driver_name && store.masterdrivers) {
      const driver = store.masterdrivers.find((val: any) => {
        const fullName = val.first_name + " " + val.last_name;
        return fullName === data.driver_name;
      });
      if (driver) mappedData.driver_id = driver.driver_id;
    }

    setFormData((prev) => ({ ...prev, ...mappedData }));
  };

  const handleFilesFromUpload = (files: CategoryFiles) => {
    setAttachedFiles(files);
  };

  // ========== Site Handling Functions ==========
  const handleSiteChange = (siteId: number) => {
    setFormData((prev) => ({ ...prev, site_id: siteId }));
    if (siteId) {
      let num = 0
      if (siteId === 3 || siteId === 4 || siteId === 6) {  // สระบุรี บางประกง ระยอง
        num = 3
      } else {
        num = 2
      }
      const filteredDrivers =
        masterdrivers?.filter((driver: any) => driver.site_id === num) || [];
      const filteredLocations =
        locations?.filter((location: any) => location.site_id === num) || []; // ตั้งค่าสระบุรี
      const filteredClients =
        clients?.filter((client: any) => client.site_id === num) || [];

      setFilteredData({
        masterdrivers: filteredDrivers,
        locations: filteredLocations,
        clients: filteredClients,
        // vehicles: filteredVehicles,
      });

    } else {
      setFilteredData({
        masterdrivers: masterdrivers || [],
        locations: locations || [],
        clients: clients || [],
        // vehicles: vehicles || [],
      });
    }

    // Reset dependent fields
    setFormData((prev) => ({
      ...prev,
      driver_id: "",
      origin_id: undefined,
    }));
  };

  useEffect(() => {
    if (!formData.site_id) {
      setFilteredData((prev) => ({
        ...prev,
        masterdrivers: masterdrivers || [],
        locations: locations || [],
        clients: clients || [],
        vehicles: vehicles || [],
      }));
    } else {
      const num = (formData.site_id === 3 || formData.site_id === 4 || formData.site_id === 6) ? 3 : 2;
      setFilteredData((prev) => ({
        ...prev,
        masterdrivers: masterdrivers?.filter((d: any) => d.site_id === num) || [],
        locations: locations?.filter((l: any) => l.site_id === num) || [],
        clients: clients?.filter((c: any) => c.site_id === num) || [],
        vehicles: vehicles || [],
      }));
    }
  }, [masterdrivers, locations, vehicles, clients, formData.site_id]);

  useEffect(() => {

    const detailsTextarea = document.querySelector(
      'textarea[name="case_details"]'
    ) as HTMLTextAreaElement;
    if (detailsTextarea) {
      detailsTextarea.style.height = "auto";
      detailsTextarea.style.height = `${Math.max(
        detailsTextarea.scrollHeight,
        detailsTextarea.scrollHeight
      )}px`;
    }

  }, [formData.case_details]);

  // ========== View Mode Data Filtering ==========
  useEffect(() => {
    if (isViewMode && formData.site_id && masterdrivers && locations && clients) {
      let filteredDrivers = masterdrivers.filter(
        (driver: any) => driver.site_id === formData.site_id
      );
      const filteredLocations = locations.filter(
        (location: any) =>
          location.location_id === formData.origin_id ||
          location.site_id === formData.site_id
      );
      const filteredClients = clients.filter(
        (client: any) =>
          client.client_id === formData.client_id ||
          client.site_id === formData.site_id
      );

      // Add selected driver if not in filtered list
      if (formData.driver_id) {
        const selectedDriver = masterdrivers.find(
          (driver: any) => driver.driver_id == formData.driver_id
        );
        if (
          selectedDriver &&
          !filteredDrivers.find(
            (driver: any) => driver.driver_id == selectedDriver.driver_id
          )
        ) {
          filteredDrivers = [...filteredDrivers, selectedDriver];
        }
      }

      setFilteredData((prev) => ({
        ...prev,
        masterdrivers: filteredDrivers,
        locations: filteredLocations,
        clients: filteredClients,
        vehicles: vehicles || [],
      }));
    }
  }, [
    isViewMode,
    formData.site_id,
    formData.driver_id,
    formData.origin_id,
    masterdrivers,
    locations,
    clients,
    vehicles,
  ]);

  // ========== Vehicle Handling Functions ==========
  const handleVehicleCodeChange = (truckNo: string) => {
    const selectedVehicle = vehicles?.find(
      (vehicle: any) =>
        vehicle.truck_no === truckNo && vehicle.plate_type === "head"
    );

    if (selectedVehicle) {
      const tailVehicle = vehicles?.find(
        (vehicle: any) =>
          vehicle.truck_no === truckNo && vehicle.plate_type === "tail"
      );

      setFormData((prev) => ({
        ...prev,
        vehicle_truckno: selectedVehicle.truck_no,
        vehicle_id_head: selectedVehicle.vehicle_id,
        vehicle_id_tail: tailVehicle?.vehicle_id,
      }));
    }
  };

  const handleHeadPlateChange = (vehicleId: number) => {
    const selectedVehicle = vehicles?.find(
      (vehicle: any) =>
        vehicle.vehicle_id === vehicleId && vehicle.plate_type === "head"
    );

    if (selectedVehicle) {
      const tailVehicle = vehicles?.find(
        (vehicle: any) =>
          vehicle.truck_no === selectedVehicle.truck_no &&
          vehicle.plate_type === "tail"
      );

      setFormData((prev) => ({
        ...prev,
        vehicle_truckno: selectedVehicle.truck_no,
        vehicle_id_head: selectedVehicle.vehicle_id,
        vehicle_id_tail: tailVehicle?.vehicle_id,
      }));
    }
  };

  // ========== Province/District Handling Functions ==========
  const handleProvinceChange = (provinceId: number) => {
    setFormData((prev) => ({
      ...prev,
      province_id: provinceId,
      district_id: undefined,
      sub_district_id: undefined,
    }));

    if (provinceId) {
      const filteredDistricts =
        districts?.filter(
          (district: any) => district.province_id === provinceId
        ) || [];
      setFilteredData((prev) => ({
        ...prev,
        districts: filteredDistricts,
        subdistricts: [],
      }));
    }
  };

  const handleDistrictChange = (districtId: number) => {
    setFormData((prev) => ({
      ...prev,
      district_id: districtId,
      sub_district_id: undefined,
    }));

    if (districtId) {
      const filteredSubdistricts =
        subdistricts?.filter(
          (subdistrict: any) => subdistrict.district_id === districtId
        ) || [];
      setFilteredData((prev) => ({
        ...prev,
        subdistricts: filteredSubdistricts,
      }));
    }
  };

  const clipboard = async () => {
    try {
      // หาข้อมูลจาก dropdown stores
      const selectedSite = sites?.find(
        (site) => site.site_id === formData.site_id
      );
      const selectedDepartment = departments?.find(
        (dept) => dept.department_id === formData.department_id
      );
      const selectedClient = clients?.find(
        (client) => client.client_id === formData.client_id
      );
      const selectedOrigin = locations?.find(
        (loc) => loc.location_id === formData.origin_id
      );
      const selectedProvince = provinces?.find(
        (prov) => prov.province_id === formData.province_id
      );
      const selectedDistrict = districts?.find(
        (dist) => dist.district_id === formData.district_id
      );
      const selectedSubDistrict = subdistricts?.find(
        (sub) => sub.sub_district_id === formData.sub_district_id
      );
      const selectedDriverRole = driver_roles?.find(
        (role) => role.driver_role_id === formData.driver_role_id
      );
      const selectedDriver = masterdrivers?.find(
        (driver) => driver.driver_id === formData.driver_id
      );
      const selectedVehicleHead = vehicles?.find(
        (vehicle) => vehicle.vehicle_id === formData.vehicle_id_head
      );
      const selectedVehicleTail = vehicles?.find(
        (vehicle) => vehicle.vehicle_id === formData.vehicle_id_tail
      );

      const content = useClipboard_ac({
        formData,
        userinfo,
        selectedSite,
        selectedDepartment,
        selectedClient,
        selectedOrigin,
        selectedDriverRole,
        selectedDriver,
        selectedVehicleHead,
        selectedVehicleTail,
        selectedProvince,
        selectedDistrict,
        selectedSubDistrict,
      });

      await navigator.clipboard.writeText(content);
      Swal.fire({
        icon: "success",
        title: "คัดลอกข้อมูลสำเร็จ",
        text: "ข้อมูลได้ถูกคัดลอกไปยังคลิปบอร์ดแล้ว",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      sendErrorLog("ACForm/clipboard", error instanceof Error ? error : String(error));
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถคัดลอกข้อมูลได้",
      });
    }
  };

  // ========== Print Document Function ==========
  const handlePrintDocument = () => {
    if (!formData.document_no_ac) {
      Swal.fire({
        icon: "warning",
        title: "ไม่พบข้อมูลเอกสาร",
        text: "กรุณาบันทึกข้อมูลก่อนทำการพิมพ์",
        confirmButtonText: "ตกลง"
      });
      return;
    }

    try {
      // เตรียมข้อมูลสำหรับการพิมพ์
      const selectedSite = sites?.find(
        (site) => site.site_id === formData.site_id
      );
      const selectedDepartment = departments?.find(
        (dept) => dept.department_id === formData.department_id
      );
      const selectedClient = clients?.find(
        (client) => client.client_id === formData.client_id
      );
      const selectedOrigin = locations?.find(
        (loc) => loc.location_id === formData.origin_id
      );
      const selectedDriverRole = driver_roles?.find(
        (role) => role.driver_role_id === formData.driver_role_id
      );
      const selectedDriver = masterdrivers?.find(
        (driver) => driver.driver_id === formData.driver_id
      );
      const selectedVehicleHead = vehicles?.find(
        (vehicle) => vehicle.vehicle_id === formData.vehicle_id_head
      );
      const selectedVehicleTail = vehicles?.find(
        (vehicle) => vehicle.vehicle_id === formData.vehicle_id_tail
      );
      const selectedProvince = provinces?.find(
        (prov) => prov.province_id === formData.province_id
      );
      const selectedDistrict = districts?.find(
        (dist) => dist.district_id === formData.district_id
      );
      const selectedSubDistrict = subdistricts?.find(
        (sub) => sub.sub_district_id === formData.sub_district_id
      );

      const printFormData = {
        ...formData,
        site_name: selectedSite?.site_name_th || formData.site_name,
        department_name: selectedDepartment?.department_name_th || formData.department_name,
        client_name: selectedClient?.client_name || formData.client_name,
        origin_name: selectedOrigin?.location_name || formData.origin_name,
        driver_role_name: selectedDriverRole?.role_name || formData.driver_role_name,
        driver_name: selectedDriver
          ? `${selectedDriver.first_name} ${selectedDriver.last_name}`
          : formData.driver_name,
        vehicle_head_plate: selectedVehicleHead?.vehicle_number_plate || formData.vehicle_head_plate,
        vehicle_tail_plate: selectedVehicleTail?.vehicle_number_plate || formData.vehicle_tail_plate,
        province_name: selectedProvince?.province_name_th || formData.province_name,
        district_name: selectedDistrict?.district_name_th || formData.district_name,
        sub_district_name: selectedSubDistrict?.sub_district_name_th || formData.sub_district_name,
      };

      printDocument_ac({
        formData: printFormData as caseReport_AC,
        investigateData: formInvestigate,
        userinfo,
        attachedFiles
      });

    } catch (error) {
      console.error("Error printing document:", error);
      sendErrorLog("ACForm/handlePrintDocument", error instanceof Error ? error : String(error));
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถพิมพ์เอกสารได้",
        confirmButtonText: "ตกลง"
      });
    }
  };

  // ========== Add/Remove Item Functions ==========
  const handleAddItem = async (type: string) => {
    if (formData.site_id === undefined || formData.site_id === null) return alert("กรุณาเลือก ศูนย์ปฏิบัติการ ก่อนเพิ่มรายการ");
    if (type === "masterdrivers" && (formData.driver_role_id === undefined || formData.driver_role_id === null)) return alert("กรุณาเลือก ประเภทคนขับ ก่อนเพิ่มรายการ");
    const itemName = prompt(`เพิ่มรายการใหม่สำหรับ ${type}:`);
    if (itemName && itemName.trim()) {
      const obj = finditems(type, itemName)
      // console.log("obj : ", obj);
      const res = await fetch(`/api/list`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-path": `/${type}`
        },
        body: JSON.stringify(obj),
      });
      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "เพิ่มรายการ" + itemName + "สำเร็จ",
          showConfirmButton: true,
        });

        setItemsFilter(await res.json(), type);

      } else {
        alert(`เพิ่มรายการ "${itemName}" ไม่สำเร็จ ลองใหม่อีกครั้ง`);
      }
    }
  };

  const finditems = (type: string, itemName: string) => {
    let obj = {};
    switch (type) {
      case "locations":
        obj = { location_name: itemName, site_id: formData.site_id === 6 ? 3 : formData.site_id };
        break;
      case "masterdrivers":
        let diffname = itemName.split(" ")
        obj = { first_name: diffname[0], last_name: diffname[1], site_id: formData.site_id === 6 ? 3 : formData.site_id, driver_role_id: formData.driver_role_id };
        break;
      case "clients":
        obj = { client_name: itemName, site_id: formData.site_id === 6 ? 3 : formData.site_id };
        break;
    }
    return obj;
  }

  const setItemsFilter = async (data: any, type: string) => {

    switch (type) {
      case "locations":
        setFilteredData((prev) => ({
          ...prev,
          locations: [...(prev.locations || []), data],
        }));
        break;
      case "masterdrivers":
        setFilteredData((prev) => ({
          ...prev,
          masterdrivers: [...(prev.masterdrivers || []), data],
        }));
        break;
      case "clients":
        setFilteredData((prev) => ({
          ...prev,
          clients: [...(prev.clients || []), data],
        }));
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, type, checked, value } = e.target as HTMLInputElement;

    let processedValue: any = value;

    if (type === "checkbox") {
      processedValue = checked;
    } else if (type === "number") {
      processedValue = value === "" ? 0 : Number(value);
    }
    setFormData({
      ...formData,
      [name]: processedValue,
    });
  };

  const handleRadioChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // ========== รายการความเสียหาย ==========
  const damageItems = formData.damage_items || [];

  const getDamageItemsByGroup = (category: DamageCategory) =>
    damageItems.filter((item) => item.damage_category === category);

  const sumDamageItems = (items: DamageItem[]) =>
    items.reduce((sum, item) => sum + (Number(item.damage_value) || 0), 0);

  const addDamageItem = (category: DamageCategory) => {
    if (damageItems.length >= DAMAGE_ITEM_MAX_ROWS) {
      Swal.fire({
        icon: "warning",
        title: `เพิ่มรายการความเสียหายได้สูงสุด ${DAMAGE_ITEM_MAX_ROWS} รายการ`,
        confirmButtonText: "ตกลง",
      });
      return;
    }
    setFormData((prev) => {
      const items = prev.damage_items || [];
      const newId =
        items.length > 0
          ? Math.max(...items.map((item) => item.damage_id)) + 1
          : 1;
      return {
        ...prev,
        damage_items: [...items, createDamageItem(newId, category)],
      };
    });
  };

  const removeDamageItem = (id: number) => {
    setFormData((prev) => {
      const items = prev.damage_items || [];
      const target = items.find((item) => item.damage_id === id);
      if (!target) return prev;
      // แต่ละกลุ่มต้องเหลืออย่างน้อย 1 แถว
      const sameGroup = items.filter(
        (item) => item.damage_category === target.damage_category
      );
      if (sameGroup.length <= DAMAGE_ITEM_MIN_ROWS_PER_GROUP) return prev;
      return {
        ...prev,
        damage_items: items.filter((item) => item.damage_id !== id),
      };
    });
  };

  const handleDamageItemChange = (
    id: number,
    field: keyof DamageItem,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      damage_items: (prev.damage_items || []).map((item) =>
        item.damage_id === id
          ? {
            ...item,
            [field]: field === "damage_value" ? Number(value) || 0 : value,
          }
          : item
      ),
    }));
  };

  const damageGroupTotals = {
    goods: sumDamageItems(getDamageItemsByGroup("goods")),
    vehicle: sumDamageItems(getDamageItemsByGroup("vehicle")),
  };

  /** กลุ่มนี้ถูกกรอกอะไรไว้บ้างหรือยัง — ใช้ตัดสินว่าจะซิงก์ยอดรวมเป็น 0 ได้ไหม */
  const isDamageGroupTouched = (category: DamageCategory) =>
    getDamageItemsByGroup(category).some(
      (item) =>
        (item.damage_detail || "").trim() !== "" ||
        (item.responsible_party || "").trim() !== "" ||
        Number(item.damage_value) > 0
    );

  // แสดงเฉพาะกลุ่มที่ระบุว่าเสียหายไว้แล้ว ผู้ใช้จึงไม่ต้องเลือกกลุ่มเอง
  const visibleDamageGroups = DAMAGE_GROUPS.filter(
    (group) => formData[group.damageFlag] === "yes"
  );

  const totalDamageValue = visibleDamageGroups.reduce(
    (sum, group) => sum + damageGroupTotals[group.key],
    0
  );

  /** ตารางรายการความเสียหาย 1 กลุ่ม (สินค้า / รถและอื่นๆ) */
  const renderDamageGroup = (group: (typeof DAMAGE_GROUPS)[number]) => {
    const items = getDamageItemsByGroup(group.key);
    const total = damageGroupTotals[group.key];
    const canRemoveRow = items.length > DAMAGE_ITEM_MIN_ROWS_PER_GROUP;
    const canAddRow = !isViewMode && damageItems.length < DAMAGE_ITEM_MAX_ROWS;

    return (
      <div
        key={group.key}
        className="overflow-hidden rounded border border-gray-300"
      >
        {/* หัวกลุ่ม */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-300 bg-white px-3 py-2">
          <span className="text-sm font-medium text-gray-800">
            {group.label}
          </span>
          {canAddRow && (
            <button
              type="button"
              onClick={() => addDamageItem(group.key)}
              className="flex items-center gap-1 text-xs text-gray-600 transition-colors hover:text-gray-900"
            >
              <CirclePlus className="h-4 w-4" />
              เพิ่มแถว
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-14 border-b border-gray-300 px-3 py-2 text-center font-medium text-gray-700">
                  ลำดับ
                </th>
                <th className="border-b border-gray-300 px-3 py-2 text-left font-medium text-gray-700">
                  ความเสียหาย
                </th>
                <th className="w-48 whitespace-nowrap border-b border-gray-300 px-3 py-2 text-right font-medium text-gray-700">
                  มูลค่า (บาท)
                </th>
                <th className="w-44 whitespace-nowrap border-b border-gray-300 px-3 py-2 text-left font-medium text-gray-700">
                  ผู้รับผิดชอบ
                </th>
                {!isViewMode && (
                  <th className="w-12 border-b border-gray-300 px-2 py-2"></th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white">
              {items.map((item, index) => (
                <tr key={item.damage_id} className="border-b border-gray-200 last:border-b-0">
                  <td className="px-3 py-2 text-center text-black">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2 text-black">
                    <input
                      type="text"
                      value={item.damage_detail}
                      onChange={(e) =>
                        handleDamageItemChange(
                          item.damage_id,
                          "damage_detail",
                          e.target.value
                        )
                      }
                      disabled={isViewMode}
                      className={`w-full rounded border border-gray-300 p-1 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#cfe5d0] ${isViewMode
                        ? "cursor-not-allowed bg-gray-100 font-bold text-blue-600"
                        : "bg-white"
                        }`}
                    />
                  </td>
                  <td className="px-3 py-2 text-black">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.damage_value || ""}
                      onChange={(e) =>
                        handleDamageItemChange(
                          item.damage_id,
                          "damage_value",
                          e.target.value
                        )
                      }
                      disabled={isViewMode}
                      className={`w-full rounded border border-gray-300 p-1 text-right text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#cfe5d0] ${isViewMode
                        ? "cursor-not-allowed bg-gray-100 font-bold text-blue-600"
                        : "bg-white"
                        }`}
                    />
                  </td>
                  <td className="px-3 py-2 text-black">
                    <select
                      value={item.responsible_party}
                      onChange={(e) =>
                        handleDamageItemChange(
                          item.damage_id,
                          "responsible_party",
                          e.target.value
                        )
                      }
                      disabled={isViewMode}
                      className={`w-full rounded border border-gray-300 p-1 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#cfe5d0] ${isViewMode
                        ? "cursor-not-allowed bg-gray-100 font-bold text-blue-600"
                        : "bg-white"
                        }`}
                    >
                      <option value=""></option>
                      {RESPONSIBLE_PARTY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </td>
                  {!isViewMode && (
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeDamageItem(item.damage_id)}
                        disabled={!canRemoveRow}
                        title={
                          canRemoveRow
                            ? "ลบแถวนี้"
                            : `${group.label} ต้องมีอย่างน้อย 1 แถว`
                        }
                        className="text-gray-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-gray-400"
                      >
                        <Trash2 className="mx-auto h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-300 bg-gray-50">
                <td
                  colSpan={2}
                  className="px-3 py-2 text-right text-sm text-gray-600"
                >
                  รวม{group.label}
                </td>
                <td className="px-3 py-2 text-right text-sm font-semibold text-gray-900">
                  {total.toLocaleString("th-TH")}
                </td>
                <td colSpan={isViewMode ? 1 : 2} className="px-3 py-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  // ยอดรวมของแต่ละกลุ่มคือค่าเสียหายจริง
  // กลุ่มที่ยังไม่กรอกอะไรเลย = ไม่แตะค่าเดิม (ข้อมูลเก่าที่กรอกยอดรวมไว้ตรง ๆ ต้องไม่ถูกล้าง)
  // แต่ถ้ากรอกรายการไว้แล้วลบยอดออกจนเป็น 0 ต้องซิงก์เป็น 0 ไม่ใช่ค้างยอดเดิมไว้
  useEffect(() => {
    setFormData((prev) => {
      const next = { ...prev };
      let changed = false;

      visibleDamageGroups.forEach((group) => {
        const total = damageGroupTotals[group.key];
        if (total === 0 && !isDamageGroupTouched(group.key)) return;
        if (Number(prev[group.totalField] ?? 0) !== total) {
          next[group.totalField] = total;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [
    damageGroupTotals.goods,
    damageGroupTotals.vehicle,
    damageItems,
    formData.product_damage,
    formData.truck_damage,
  ]);

  const validateRequiredFields = () => {
    const requiredFields = [
      { field: "site_id", label: "ศูนย์ปฏิบัติการ", elementName: "site_id" },
      { field: "department_id", label: "ฝ่าย", elementName: "department_id" },
      {
        field: "incident_datetime",
        label: "วันที่และเวลา เกิดเหตุ",
        elementName: "incident_datetime",
      },
      {
        field: "fault_party",
        label: "ลักษณะความรับผิดจากอุบัติเหตุ",
        elementName: "fault_party",
      },
      {
        field: "case_details",
        label: "รายละเอียดเหตุการณ์",
        elementName: "case_details",
      },
      { field: "client_id", label: "ลูกค้า", elementName: "client_id" },
      // { field: "origin_id", label: "ต้นทาง/แพล้น", elementName: "origin_id" },
      // { field: "destination", label: "ปลายทาง", elementName: "destination" },
      {
        field: "case_location",
        label: "สถานที่เกิดเหตุ",
        elementName: "case_location",
      },
      { field: "province_id", label: "จังหวัด", elementName: "province_id" },
      { field: "district_id", label: "อำเภอ", elementName: "district_id" },
      {
        field: "sub_district_id",
        label: "ตำบล",
        elementName: "sub_district_id",
      },
      {
        field: "vehicle_id_head",
        label: "ทะเบียนรถหัว",
        elementName: "vehicle_id_head",
      },
      // {
      //   field: "vehicle_id_tail",
      //   label: "ทะเบียนรถหาง",
      //   elementName: "vehicle_id_tail",
      // },
      {
        field: "driver_role_id",
        label: "ประเภทคนขับ",
        elementName: "driver_role_id",
      },
      { field: "driver_id", label: "ชื่อ-สกุลคนขับ", elementName: "driver_id" },
      {
        field: "alcohol_test",
        label: "ตรวจแอลกอฮอล์",
        elementName: "alcohol_test_radio",
      },
      {
        field: "drug_test",
        label: "ตรวจสารเสพติด",
        elementName: "drug_test_radio",
      },
      {
        field: "product_damage",
        label: "ความเสียหายของสินค้า",
        elementName: "product_damage_radio",
      },
    ];

    const missingFields: string[] = [];
    let firstMissingField: string | null = null;

    requiredFields.forEach(({ field, label, elementName }) => {
      const value = formData[field as keyof typeof formData];
      if (
        !value ||
        value === "" ||
        value === 0 ||
        value === undefined ||
        value === null
      ) {
        missingFields.push(label);
        if (!firstMissingField) {
          firstMissingField = elementName;
        }
      }
    });

    if (formData.alcohol_test === "yes") {
      const alcoholResult = formData.alcohol_test_result;
      if (!alcoholResult && alcoholResult !== 0) {
        missingFields.push("ผลตรวจแอลกอฮอล์ (ml/%)");
        if (!firstMissingField) {
          firstMissingField = "alcohol_test_result";
        }
      }
    }

    // ตรวจสอบฟิลด์เพิ่มเติมสำหรับการทดสอบสารเสพติด
    // if (formData.drug_test === "yes") {
    //   const drugResult = formData.drug_test_result;
    //   if (!drugResult || drugResult.trim() === '') {
    //     missingFields.push('ชนิดสารเสพติดที่ตรวจพบ');
    //     if (!firstMissingField) {
    //       firstMissingField = 'drug_test_result';
    //     }
    //   }
    // }

    if (formData.product_damage === "yes") {
      const damageDetails = formData.product_damage_details;
      if (!damageDetails || damageDetails.trim() === "") {
        missingFields.push("รายละเอียดความเสียหายของสินค้า");
        if (!firstMissingField) {
          firstMissingField = "product_damage_details";
        }
      }
    }

    if (formData.truck_damage === "yes") {
      const breakdownStatus = formData.breakdown_status;
      if (!breakdownStatus || breakdownStatus.trim() === "") {
        missingFields.push("รถวิ่งงานต่อได้หรือไม่");
        if (!firstMissingField) {
          firstMissingField = "breakdown_status";
        }
      }
    }

    // ตรวจเอกสารแนบตามเงื่อนไขใน lib/attachment
    getMissingRequiredDocs("ac", attachedFiles).forEach((doc) => {
      missingFields.push(doc.label);
      if (!firstMissingField) {
        firstMissingField = doc.value;
      }
    });

    return { missingFields, firstMissingField };
  };

  /** ตัวเลขที่ backend ต้องการเป็น number (ฟอร์มเก็บเป็น string) */
  const toNumericFields = (source: Partial<caseReport_AC>) => ({
    fatalities: Number(source.fatalities) || 0,
    injured_hospitalized: Number(source.injured_hospitalized) || 0,
    injured_not_hospitalized: Number(source.injured_not_hospitalized) || 0,
    estimated_goods_damage_value: Number(source.estimated_goods_damage_value) || 0,
    estimated_vehicle_damage_value: Number(source.estimated_vehicle_damage_value) || 0,
    actual_goods_damage_value: Number(source.actual_goods_damage_value) || 0,
    actual_vehicle_damage_value: Number(source.actual_vehicle_damage_value) || 0,
  });

  /**
   * เก็บเฉพาะแถวของกลุ่มที่ระบุว่าเสียหายไว้จริง
   * ถ้าผู้ใช้กรอกไว้แล้วเปลี่ยนใจเป็น "ไม่เสียหาย" แถวเดิมจะถูกซ่อนบนฟอร์ม
   * ปล่อยให้ติดไปกับ payload จะกลายเป็นข้อมูลที่มองไม่เห็นแต่ยังขึ้นในใบพิมพ์
   */
  const payloadDamageItems = () =>
    (formData.damage_items || []).filter((item) =>
      visibleDamageGroups.some((group) => group.key === item.damage_category)
    );

  /** payload ของรายงานเบื้องต้น ใช้ทั้งตอนส่งจริงและตอนดู payload */
  const buildInitialReportPayload = (mode: "create" | "update") => {
    if (mode === "create") {
      return {
        ...formData,
        incident_datetime: formData.incident_datetime,
        record_datetime: new Date(),
        ...toNumericFields(formData),
        damage_items: payloadDamageItems(),
        reporter_id: userinfo?.id,
        docs: [docValue as any],
      };
    }

    // อัปเดต: ตัดฟิลด์ที่ backend คำนวณ/join มาให้เองออก
    const {
      priority,
      reporter_name,
      record_datetime,
      site_name,
      driver_name,
      client_name,
      department_name,
      driver_role_name,
      origin_name,
      vehicle_head_plate,
      vehicle_tail_plate,
      province_name,
      district_name,
      sub_district_name,
      ...filteredFormData
    } = formData;

    return {
      ...filteredFormData,
      incident_datetime: filteredFormData.incident_datetime,
      ...toNumericFields(filteredFormData),
      damage_items: payloadDamageItems(),
      docs: [docValue as any],
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateRequiredFields();
    // console.log('validation : ', validation)
    if (validation.missingFields.length > 0) {
      const missingFieldsList = validation.missingFields.join("\n• ");
      Swal.fire({
        icon: "warning",
        title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
        html: `<div style="text-align: left;">กรุณากรอกข้อมูลในฟิลด์ดังต่อไปนี้:<br><br>• ${missingFieldsList.replace(/\n/g, '<br>')}</div>`,
        confirmButtonText: "ตกลง",
        confirmButtonColor: "#d33",
      });
      return;
    }

    // console.log("AC Form submitted:", formData);
    setIsSavingForm(true);
    try {
      if (!userinfo?.id) {
        alert("ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
        setUserinfo(null);
        return;
      }

      const submitData = {
        ...buildInitialReportPayload("create"),
        reporter_id: userinfo.id,
      };

      const res = await fetch("/api/document/ac", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      const responseData = await res.json();

      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "บันทึกข้อมูลเรียบร้อย",
          draggable: true,
          confirmButtonText: "ตกลง",
          allowOutsideClick: false,
        });
        setFormData((prev) => ({
          ...prev,
          reporter_name: responseData.reporter_name,
          priority: responseData.priority,
          document_no_ac: responseData.document_no_ac,
          casestatus: responseData.casestatus,
        }));
        if (
          responseData.document_no_ac !== "" &&
          Object.keys(attachedFiles).length > 0
        ) {
          await attatchments_post(responseData.document_no_ac);
        }
      } else {
        throw new Error(
          responseData.message || `HTTP ${res.status}: ${res.statusText}`
        );
      }
    } catch (error) {
      console.error("Error submitting AC form:", error);
      sendErrorLog("ACForm/handleSubmit", error instanceof Error ? error : String(error));
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
        text: error instanceof Error ? error.message : "Unknown error",
        confirmButtonText: "ตกลง"
      });
    } finally {
      setIsSavingForm(false);
    }
  };

  const handleUpdate = async () => {
    const validation = validateRequiredFields();
    if (validation.missingFields.length > 0) {
      const missingFieldsList = validation.missingFields.join("\n• ");
      Swal.fire({
        icon: "warning",
        title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
        html: `<div style="text-align: left;">กรุณากรอกข้อมูลในฟิลด์ดังต่อไปนี้:<br><br>• ${missingFieldsList.replace(/\n/g, '<br>')}</div>`,
        confirmButtonText: "ตกลง",
        confirmButtonColor: "#d33",
      });
      return;
    }

    const data = buildInitialReportPayload("update");

    setIsSavingForm(true);
    try {
      const res = await fetch("/api/document/ac", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const responseData = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "อัปเดตข้อมูลเรียบร้อย",
          draggable: true,
          confirmButtonText: "ตกลง",
          allowOutsideClick: false,
        });
      } else {
        sendErrorLog("ACForm/handleUpdate", `Update failed: ${responseData.message || 'Unknown error'}`);
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาดในการอัปเดตข้อมูล",
        });
      }
      setFormData((prev) => ({
        ...prev,
        priority: responseData.priority,
      }));
      // console.log("Attached Files on Update:", attachedFiles);
      if (responseData.document_no_ac !== "" && Object.keys(attachedFiles).length > 0) {
        await attatchments_post(responseData.document_no_ac);
      }
    } finally {
      setIsSavingForm(false);
    }
  };

  const attatchments_post = async (document_no_ac: string) => {
    if (!document_no_ac) {
      console.error("Document number is required for attachments upload.");
      alert("ไม่พบเลขที่เอกสารสำหรับการอัปโหลดไฟล์แนบ");
      return;
    }
    try {
      const uploadFormData = new FormData();
      Object.entries(attachedFiles).forEach(([category, files]) => {
        if (Array.isArray(files)) {
          files.forEach((fileItem: FileWithId, index: number) => {
            if (fileItem.updateData === "existing") {
              return;
            }

            const fileExtension = fileItem.file.name.split(".").pop();
            const randomNumber = String(
              Math.floor(Math.random() * 100)
            ).padStart(2, "0");
            const newFileName = `${document_no_ac}_${category}_${randomNumber}.${fileExtension}`;

            const renamedFile = new File([fileItem.file], newFileName, {
              type: fileItem.file.type,
            });
            uploadFormData.append("files", renamedFile);
            uploadFormData.append("categories", category);
          });
        }
      });

      uploadFormData.append("document_no", document_no_ac);

      if (uploadFormData.getAll("files").length === 0) {
        console.log("No new files to upload.");
        return;
      }

      const res = await fetch("/api/attachment", {
        method: "POST",
        body: uploadFormData,
      });

      // สถานะ "Completed Investigate" ถูกดันโดย backend เอง (_sync_case_status)
      // เมื่อผลการสอบสวนส่วนที่ 2 กรอกครบ — ไม่ต้องอิงไฟล์แนบอีกต่อไป
      if (!res.ok) {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาดในการอัปโหลดไฟล์แนบ",
        });
        sendErrorLog("ACForm/attatchments_post", `เกิดข้อผิดพลาดในการอัปโหลดไฟล์แนบ : ${res}`);
      }
    } catch (error) {
      console.error("Error uploading attachments catch :", error);
      alert("เกิดข้อผิดพลาดในการอัปโหลดไฟล์แนบ catch ");
      sendErrorLog("ACForm/attatchments_post", `เกิดข้อผิดพลาดในการอัปโหลดไฟล์แนบ catch : ${error}`);
    }
  };

  // ========== Investigate (Part 2) ==========
  const loadMeasureFiles = async (document_no: string) => {
    try {
      const res = await fetch(
        `/api/attachment?document_no=${encodeURIComponent(document_no)}`
      );
      if (!res.ok) return;
      const { files } = await res.json();
      const grouped: MeasureExistingFileMap = {};
      (files || []).forEach((file: any) => {
        const match = file.fileName?.match(/_measure_([a-z0-9]+)_/i);
        if (match) {
          const measureId = match[1];
          if (!grouped[measureId]) grouped[measureId] = [];
          grouped[measureId].push({
            key: file.key,
            fileName: file.fileName,
            url: file.url,
          });
        }
      });
      setMeasureExistingFiles(grouped);
    } catch (error) {
      console.error("Load measure files error:", error);
    }
  };

  const uploadMeasureFiles = async (document_no: string) => {
    for (const [measureId, files] of Object.entries(measureFiles)) {
      if (!files || files.length === 0) continue;
      const uploadFormData = new FormData();
      files.forEach((file) => {
        const ext = file.name.split(".").pop();
        const rand = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
        const newName = `${document_no}_measure_${measureId}_${rand}.${ext}`;
        uploadFormData.append(
          "files",
          new File([file], newName, { type: file.type })
        );
        uploadFormData.append("categories", `measure_${measureId}`);
      });
      uploadFormData.append("document_no", document_no);
      try {
        await fetch("/api/attachment", {
          method: "POST",
          body: uploadFormData,
        });
      } catch (error) {
        console.error("Upload measure files error:", error);
        sendErrorLog(
          "ACForm/uploadMeasureFiles",
          error instanceof Error ? error : String(error)
        );
      }
    }
    setMeasureFiles({});
    await loadMeasureFiles(document_no);
  };

  const handleSaveInvestigate = async () => {
    const documentNo = formData.document_no_ac;
    if (!documentNo) {
      Swal.fire({
        icon: "warning",
        title: "ไม่พบเลขที่เอกสาร",
        text: "กรุณาบันทึกรายงานอุบัติเหตุเบื้องต้น (ส่วนที่ 1) ก่อน",
        confirmButtonText: "ตกลง",
      });
      return;
    }

    // ยังโหลดผลการสอบสวนเดิมไม่เสร็จ = ฟอร์มยังเป็นแถวเปล่าที่ seed ไว้
    // ถ้าปล่อยให้บันทึกตอนนี้ POST (upsert) จะเขียนทับข้อมูลเดิมทั้งชุด
    if (isLoadingInvestigate) {
      Swal.fire({
        icon: "info",
        title: "กำลังโหลดผลการสอบสวนเดิม",
        text: "กรุณารอสักครู่แล้วบันทึกอีกครั้ง",
        confirmButtonText: "ตกลง",
      });
      return;
    }

    setIsSavingInvestigate(true);
    try {
      const isUpdate = !!formInvestigate.investigate_id;
      const res = await fetch("/api/investigate/ac", {
        method: isUpdate ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          document_no: documentNo,
        },
        body: JSON.stringify({ ...formInvestigate, document_no_ac: documentNo }),
      });

      const responseData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          responseData?.error || `HTTP ${res.status}: ${res.statusText}`
        );
      }

      if (responseData?.investigate_id) {
        setFormInvestigate((prev) => ({
          ...prev,
          investigate_id: responseData.investigate_id,
        }));
      }

      // backend ดัน casestatus ให้เองเมื่อผลการสอบสวนครบ — sync กลับมาแสดงทันที
      if (responseData?.is_complete) {
        setFormData((prev) => ({
          ...prev,
          casestatus: "Completed Investigate",
        }));
      }

      await uploadMeasureFiles(documentNo);

      Swal.fire({
        icon: "success",
        title: isUpdate
          ? "อัปเดตผลการสอบสวนเรียบร้อย"
          : "บันทึกผลการสอบสวนเรียบร้อย",
        confirmButtonText: "ตกลง",
        allowOutsideClick: false,
      });
    } catch (error) {
      console.error("Error saving investigate:", error);
      sendErrorLog(
        "ACForm/handleSaveInvestigate",
        error instanceof Error ? error : String(error)
      );
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาดในการบันทึกผลการสอบสวน",
        text: error instanceof Error ? error.message : "Unknown error",
        confirmButtonText: "ตกลง",
      });
    } finally {
      setIsSavingInvestigate(false);
    }
  };

  // ========== Helper Functions ==========
  const formatLocalDateTime = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // ========== Loading States ==========
  if (isLoadingFormData || (isDropdownLoading && searchParams.get("doc"))) {
    return <LoaderPage />;
  }

  const filteredForm = (title: string, data: any[] | undefined): any[] => {
    switch (title) {
      case "site":
        return data?.filter((site: any) => site.site_id !== 1) || []
      case "department":
        return data?.filter((dept: any) => dept.department_name_en === "Safety Standards [Compliance]") || []
      default:
        return data || []
    }
  };

  // ========== Dev Payload Log: payload ของ Initial AC Report ==========
  const isDebugEnabled =
    process.env.NODE_ENV !== "production" || searchParams.get("debug") === "1";
  const payloadMode: "create" | "update" =
    formData?.casestatus === "" ? "create" : "update";
  const debugPayload = {
    _endpoint:
      payloadMode === "create"
        ? "POST /api/document/ac"
        : "PUT /api/document/ac",
    ...buildInitialReportPayload(payloadMode),
    _attachments: {
      pending: Object.fromEntries(
        Object.entries(attachedFiles).map(([category, files]) => [
          category,
          files
            .filter((f) => f.updateData !== "existing")
            .map((f) => f.file?.name ?? f.id),
        ])
      ),
      uploaded: Object.fromEntries(
        Object.entries(attachedFiles).map(([category, files]) => [
          category,
          files
            .filter((f) => f.updateData === "existing")
            .map((f) => f.file?.name ?? f.id),
        ])
      ),
    },
  };
  const debugPayloadText = JSON.stringify(debugPayload, null, 2);

  const copyInitialPayload = async () => {
    try {
      await navigator.clipboard.writeText(debugPayloadText);
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 1500);
    } catch (err) {
      console.error("Copy payload error:", err);
    }
  };

  // ========== Paper Layout ==========
  const hasInvestigateSection = !!formData?.document_no_ac;
  const isSplitView = hasInvestigateSection && layoutMode === "split";
  const paperClass =
    "sm:w-full m-4 space-y-6 bg-white p-8 rounded-xl shadow-sm border border-gray-500 transition-all duration-300";






  return (
    <>
      <div className={`min-h-screen ${theme === "Dark" ? "bg-gradient-to-br from-slate-800 via-slate-700 to-[#3d5578]" : "bg-[#d1ffe1]"}`}>
        <div className="py-4 sm:p-6 space-y-4 md:space-y-6 pb-24 lg:pb-6">
          {/* Button Bar */}
          {formData.casestatus !== "" && <>
            {/* Status — collapsible side panel (auto-hide w/ motion) */}
            <CaseStatusBadge
              status={formData.casestatus || ""}
              priority={formData.priority}
              reporter={formData.reporter_name}
            />

            {/* Desktop: Fixed Action Buttons (Right) */}
            <div className="
                hidden md:flex md:flex-col md:items-center md:gap-4
                fixed top-auto right-0 m-2 z-50
              ">
              {/* สลับมุมมองกระดาษ (แสดงเมื่อมีส่วนที่ 2 แล้ว) */}
              {hasInvestigateSection && (
                <div className="hidden xl:flex xl:flex-col xl:items-center">
                  <button
                    type="button"
                    onClick={toggleLayoutMode}
                    title={
                      isSplitView
                        ? "แสดงทีละส่วน (เรียงลงมา)"
                        : "แสดงส่วนที่ 1 และ 2 คู่กัน"
                    }
                    className={`hover:scale-105 cursor-pointer text-white border border-white font-semibold p-3 rounded-lg shadow-lg hover:shadow-xl transition duration-300 flex flex-col items-center justify-center ${isSplitView
                      ? "bg-[#4a8a5c] hover:bg-[#3c7049]"
                      : "bg-gray-500 hover:bg-gray-700"
                      }`}
                  >
                    {isSplitView ? (
                      <Rows2 className="w-8 h-8" />
                    ) : (
                      <Columns2 className="w-8 h-8" />
                    )}
                  </button>
                  <span className="mt-1 text-sm font-medium text-gray-400">
                    {isSplitView ? "รวมหน้า" : "แยกหน้า"}
                  </span>
                </div>
              )}

              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={handlePrintDocument}
                  title="Print Document"
                  className="bg-gray-500 hover:bg-gray-700 hover:scale-105 cursor-pointer text-white border border-white font-semibold p-3 rounded-lg shadow-lg hover:shadow-xl transition duration-300 flex flex-col items-center justify-center"
                >
                  <Printer className="w-8 h-8" />
                </button>
                <span className="mt-1 text-sm font-medium text-gray-400">พิมพ์</span>
              </div>
            </div>
          </>
          }

          {/* Form Container */}
          <div
            className={`flex flex-col items-center justify-center ${isSplitView ? "xl:flex-row xl:items-start" : ""
              }`}
          >
            <div
              id="printable-area"
              className={`${paperClass} ${isSplitView ? "xl:w-[calc(50%-2rem)] xl:max-w-3xl" : "md:w-4xl"
                }`}
            >
              <div className="text-center border-b border-gray-400 pb-4 mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  แบบรายงานอุบัติเหตุเบื้องต้น
                </h2>
                <h3 className="text-lg text-gray-600">
                  Initial AC Reporting Form
                </h3>
              </div>

              <form id="ac-form" name="ac-form" onSubmit={handleSubmit}>
                <div className="mb-3 border-b border-gray-400 pb-4">
                  <label className="flex text-sm p-1 font-bold text-gray-800">
                    Part 1: Initial AC Reporting - Overview and key details
                  </label>
                  <label className="flex text-sm p-1 font-bold text-gray-800">
                    ส่วนที่ 1: รายงานอุบัติการณ์เบื้องต้น -
                    รายละเอียดเบื้องต้นของอุบัติการณ์ที่เกิดขึ้น
                  </label>
                </div>

                {/*ข้อมูลเบื้องต้น */}
                <div className="flex flex-col p-2 bg-gray-200 font-bold text-gray-800 mb-3 text-sm">
                  <h3>ข้อมูลเบื้องต้น</h3>
                  <p className="font-semibold text-xs text-gray-600">
                    Basic Information
                  </p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        เลขที่เอกสาร:
                      </label>
                      <input
                        type="text"
                        name="document_no_ac"
                        value={formData?.document_no_ac || "Auto Generated"}
                        disabled
                        className="w-full cursor-not-allowed text-sm font-bold text-blue-600 p-2 bg-gray-100 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        สำนักงาน/ศูนย์ปฏิบัติการ: <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        options={(filteredForm("site", sites) || []).map((site: any) => ({
                          value: site.site_id,
                          label: site.site_name_th,
                        }))}
                        value={formData?.site_id || ""}
                        onChange={(value) => handleSiteChange(Number(value))}
                        disabled={formData.document_no_ac ? true : isViewMode}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        ฝ่าย: <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        options={filteredForm("department", departments).map((dept: any) => ({
                          value: dept.department_id,
                          label: dept.department_name_th,
                        }))}
                        value={formData?.department_id || ""}
                        onChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            department_id: Number(value),
                          }))
                        }
                        disabled={isViewMode}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        วันและเวลา บันทึกเหตุ:
                      </label>
                      <DateTimePicker24h
                        value={
                          formData?.record_datetime
                            ? new Date(formData.record_datetime)
                            : undefined
                        }
                        disabled={true}
                        usedFor="datetime"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        วันและเวลา เกิดเหตุ:{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <DateTimePicker24h
                        value={
                          formData?.incident_datetime
                            ? new Date(formData.incident_datetime)
                            : undefined
                        }
                        onChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            incident_datetime: value as any,
                          }))
                        }
                        disabled={isViewMode}
                        usedFor="datetime"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        ลักษณะความรับผิดจากอุบัติเหตุ: <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        options={[
                          { value: "เป็นฝ่ายถูก", label: "เป็นฝ่ายถูก" },
                          { value: "เป็นฝ่ายผิด", label: "เป็นฝ่ายผิด" },
                          { value: "ประมาทร่วม", label: "ประมาทร่วม" },
                          { value: "รอสรุปผลคดี", label: "รอสรุปผลคดี" },
                        ]}
                        value={formData?.fault_party || ""}
                        onChange={(value) =>
                          setFormData((prev: Partial<caseReport_AC>) => ({
                            ...prev,
                            fault_party: value as any,
                          }))
                        }
                        disabled={isViewMode}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="mt-6">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        รายละเอียดเหตุการณ์:{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="case_details"
                        value={formData?.case_details || ""}
                        onChange={handleInputChange}
                        rows={4}
                        maxLength={4000}
                        disabled={isViewMode}
                        className={`w-full text-sm p-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${isViewMode
                          ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                          : ""
                          }`}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-400 md:col-span-3"></div>
                {/*ข้อมูลการขนส่งและสถานที่ */}
                <div className="flex flex-col p-2 bg-gray-200 font-bold text-gray-800 mb-3 text-sm">
                  <h3>ข้อมูลการขนส่งและสถานที่</h3>
                  <p className="font-semibold text-xs text-gray-600">
                    Transportation and Location Information
                  </p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        ลูกค้า: <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        options={(filteredData.clients || []).map((client: any) => ({
                          value: client.client_id,
                          label: client.client_name,
                        }))}
                        value={formData?.client_id || ""}
                        onChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            client_id: Number(value),
                          }))
                        }
                        disabled={isViewMode}
                        className="w-full"
                        onAdd={() => handleAddItem("clients")}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        ต้นทาง/แพล้น:
                      </label>
                      <SearchableSelect
                        options={(filteredData.locations || []).map(
                          (location: any) => ({
                            value: location.location_id,
                            label: location.location_name,
                          })
                        )}
                        value={formData?.origin_id || ""}
                        onChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            origin_id: Number(value),
                          }))
                        }
                        onAdd={() => handleAddItem("locations")}
                        disabled={isViewMode}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        ปลายทาง:
                      </label>
                      <input
                        type="text"
                        name="destination"
                        value={formData?.destination || ""}
                        onChange={handleInputChange}
                        disabled={isViewMode}
                        className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${isViewMode
                          ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                          : ""
                          }`}
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        สถานที่เกิดเหตุ: <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="case_location"
                        value={formData?.case_location || ""}
                        onChange={handleInputChange}
                        disabled={isViewMode}
                        className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${isViewMode
                          ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                          : ""
                          }`}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        จังหวัด: <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        options={(provinces || []).map((province: any) => ({
                          value: province.province_id,
                          label: province.province_name_th,
                        }))}
                        value={formData?.province_id || ""}
                        onChange={(value) =>
                          handleProvinceChange(Number(value))
                        }
                        onOpen={() => fetchSingleDropdown('provinces')}
                        disabled={isViewMode}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        อำเภอ: <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        options={(filteredData.districts || []).map(
                          (district: any) => ({
                            value: district.district_id,
                            label: district.district_name_th,
                          })
                        )}
                        value={formData?.district_id || ""}
                        onChange={(value) =>
                          handleDistrictChange(Number(value))
                        }
                        onOpen={() => fetchSingleDropdown('districts')}
                        disabled={isViewMode}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        ตำบล: <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        options={(filteredData.subdistricts || []).map(
                          (subdistrict: any) => ({
                            value: subdistrict.sub_district_id,
                            label: subdistrict.sub_district_name_th,
                          })
                        )}
                        value={formData?.sub_district_id || ""}
                        onChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            sub_district_id: Number(value),
                          }))
                        }
                        onOpen={() => fetchSingleDropdown('subdistricts')}
                        disabled={isViewMode}
                        className="w-full"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        พื้นที่สถานีตำรวจ:
                      </label>
                      <input
                        type="text"
                        name="police_station_area"
                        value={formData?.police_station_area || ""}
                        onChange={handleInputChange}
                        disabled={isViewMode}
                        className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${isViewMode
                          ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                          : ""
                          }`}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-400 md:col-span-3"></div>
                {/*ข้อมูลรถและคนขับ */}
                <div className="flex flex-col p-2 bg-gray-200 font-bold text-gray-800 mb-3 text-sm">
                  <h3>ข้อมูลพนักงานจัดส่ง</h3>
                  <p className="font-semibold text-xs text-gray-600">
                    Delivery Personnel Information
                  </p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        ทะเบียนรถหัว: <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        options={(vehicles || [])
                          .filter(
                            (vehicle: any) => vehicle.plate_type === "head"
                          )
                          .map((vehicle: any) => ({
                            value: vehicle.vehicle_id,
                            label: `${vehicle.vehicle_number_plate}`,
                          }))}
                        value={formData?.vehicle_id_head || ""}
                        onChange={(value) =>
                          handleHeadPlateChange(Number(value))
                        }
                        onOpen={() => fetchSingleDropdown('vehicles')}
                        showAddRemove={true}
                        className="w-full"
                        disabled={isViewMode}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        รหัสรถ:
                      </label>
                      <SearchableSelect
                        options={Array.from(
                          new Set(
                            (vehicles || [])
                              .filter(
                                (vehicle: any) => vehicle.plate_type === "head"
                              )
                              .map((vehicle: any) => vehicle.truck_no)
                          )
                        ).map((truckNo) => ({
                          value: truckNo,
                          label: truckNo,
                        }))}
                        value={formData?.vehicle_truckno || ""}
                        onChange={(value) =>
                          handleVehicleCodeChange(String(value))
                        }
                        onOpen={() => fetchSingleDropdown('vehicles')}
                        showAddRemove={true}
                        className="w-full"
                        disabled={isViewMode}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        ทะเบียนรถหาง:
                      </label>
                      <SearchableSelect
                        options={(vehicles || [])
                          .filter(
                            (vehicle: any) => vehicle.plate_type === "tail"
                          )
                          .map((vehicle: any) => ({
                            value: vehicle.vehicle_id,
                            label: `${vehicle.vehicle_number_plate}`,
                          }))}
                        value={formData?.vehicle_id_tail || ""}
                        onChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            vehicle_id_tail: Number(value),
                          }))
                        }
                        onOpen={() => fetchSingleDropdown('vehicles')}
                        showAddRemove={true}
                        className="w-full"
                        disabled={isViewMode}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        ประเภทคนขับ: <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        options={(driver_roles || []).map((role: any) => ({
                          value: role.driver_role_id,
                          label: role.role_name,
                        }))}
                        value={formData?.driver_role_id || ""}
                        onChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            driver_role_id: Number(value),
                          }))
                        }
                        disabled={isViewMode}
                        className="w-full"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        ชื่อ-สกุลคนขับ: <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        options={(filteredData.masterdrivers || []).map(
                          (driver: any) => ({
                            value: driver.driver_id,
                            label: `${driver.first_name} ${driver.last_name}`,
                          })
                        )}
                        value={formData?.driver_id || ""}
                        onChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            driver_id: String(value),
                          }))
                        }
                        onOpen={() => fetchSingleDropdown('masterdrivers')}
                        // onAdd={() => handleAddItem("masterdrivers")}
                        disabled={isViewMode}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-400 md:col-span-3"></div>
                {/*การตรวจแอลกอฮอล์และสารเสพติด */}
                <div className="flex flex-col p-2 bg-gray-200 font-bold text-gray-800 mb-3 text-sm">
                  <h3>การตรวจแอลกอฮอล์และสารเสพติด</h3>
                  <p className="font-semibold text-xs text-gray-600">
                    Alcohol & Drug Testing
                  </p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-700 font-medium mb-2 text-sm">
                          ตรวจแอลกอฮอล์: <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center space-x-6">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="alcohol_test_radio"
                              checked={formData.alcohol_test === "yes"}
                              disabled={isViewMode}
                              onChange={() =>
                                handleRadioChange("alcohol_test", "yes")
                              }
                              className={`mr-2 h-4 w-4 text-blue-600 ${isViewMode
                                ? "cursor-not-allowed bg-blue-400 text-blue-600 font-bold"
                                : ""
                                }`}
                            />
                            <span className="text-sm">ตรวจ</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="alcohol_test_radio"
                              disabled={isViewMode}
                              checked={formData.alcohol_test === "no" || formData?.alcohol_test_result === -1}
                              onChange={() =>
                                handleRadioChange("alcohol_test", "no")
                              }
                              className={`mr-2 h-4 w-4 text-blue-600 ${isViewMode
                                ? "cursor-not-allowed bg-blue-400 text-blue-600 font-bold"
                                : ""
                                }`}
                            />
                            <span className="text-sm">ไม่ตรวจ</span>
                          </label>
                        </div>
                      </div>

                      {formData.alcohol_test === "yes" && (
                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            ผลตรวจแอลกอฮอล์ (ml/%):{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            name="alcohol_test_result"
                            value={formData?.alcohol_test_result ?? 0}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                handleInputChange(e);
                              }
                            }}
                            disabled={isViewMode}
                            className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${isViewMode
                              ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                              : ""
                              }`}
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-700 font-medium mb-2 text-sm">
                          ตรวจยาเสพติด: <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center space-x-6">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="drug_test_radio"
                              checked={formData.drug_test === "yes"}
                              disabled={isViewMode}
                              onChange={() =>
                                handleRadioChange("drug_test", "yes")
                              }
                              className={`mr-2 h-4 w-4 text-blue-600 ${isViewMode
                                ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                                : ""
                                }`}
                            />
                            <span className="text-sm">ตรวจ</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="drug_test_radio"
                              checked={formData.drug_test === "no"}
                              disabled={isViewMode}
                              onChange={() =>
                                handleRadioChange("drug_test", "no")
                              }
                              className={`mr-2 h-4 w-4 text-blue-600 ${isViewMode
                                ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                                : ""
                                }`}
                            />
                            <span className="text-sm">ไม่ตรวจ</span>
                          </label>
                        </div>
                      </div>

                      {formData.drug_test === "yes" && (
                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            ชนิดสารเสพติดที่ตรวจพบ:
                          </label>
                          <input
                            type="text"
                            name="drug_test_result"
                            value={formData?.drug_test_result || ""}
                            onChange={handleInputChange}
                            disabled={isViewMode}
                            className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${isViewMode
                              ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                              : ""
                              }`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-400 md:col-span-3"></div>
                {/* ความเสียหาย */}

                <div className="flex flex-col p-2 bg-gray-200 font-bold text-gray-800 mb-3 text-sm">
                  <h3>ความเสียหาย</h3>
                  <p className="font-semibold text-xs text-gray-600">
                    Damage Assessment
                  </p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-700 font-medium mb-2 text-sm">
                          สินค้าเสียหาย:{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center space-x-6">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="product_damage_radio"
                              checked={formData.product_damage === "yes"}
                              disabled={isViewMode}
                              onChange={() =>
                                handleRadioChange("product_damage", "yes")
                              }
                              className={`mr-2 h-4 w-4 text-blue-600 ${isViewMode
                                ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                                : ""
                                }`}
                            />
                            <span className="text-sm">เสียหาย</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="product_damage_radio"
                              checked={formData.product_damage === "no"}
                              disabled={isViewMode}
                              onChange={() =>
                                handleRadioChange("product_damage", "no")
                              }
                              className={`mr-2 h-4 w-4 text-blue-600  ${isViewMode
                                ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                                : ""
                                }`}
                            />
                            <span className="text-sm">ไม่เสียหาย</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-700 font-medium mb-2 text-sm">
                          รถเสียหาย: <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center space-x-6">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="truck_damage_radio"
                              checked={formData.truck_damage === "yes"}
                              disabled={isViewMode}
                              onChange={() =>
                                handleRadioChange("truck_damage", "yes")
                              }
                              className={`mr-2 h-4 w-4 text-blue-600 ${isViewMode
                                ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                                : ""
                                }`}
                            />
                            <span className="text-sm">เสียหาย</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="truck_damage_radio"
                              checked={formData.truck_damage === "no"}
                              disabled={isViewMode}
                              onChange={() =>
                                handleRadioChange("truck_damage", "no")
                              }
                              className={`mr-2 h-4 w-4 text-blue-600  ${isViewMode
                                ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                                : ""
                                }`}
                            />
                            <span className="text-sm">ไม่เสียหาย</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detail fields outside of grid to maintain layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                      {formData.product_damage === "yes" && (
                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            รายละเอียดความเสียหายของสินค้า:{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            name="product_damage_details"
                            onChange={handleInputChange}
                            value={formData?.product_damage_details || ""}
                            disabled={isViewMode}
                            rows={3}
                            className={`w-full text-sm p-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${isViewMode
                              ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                              : ""
                              }`}
                          />
                        </div>
                      )}
                    </div>


                    {formData.truck_damage === "yes" && (
                      <div>
                        {/* เลขที่แจ้งซ่อม (MR) input */}
                        <div className="mb-4">
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            เลขที่แจ้งซ่อม (MR):
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="repair_request_no"
                            value={formData?.repair_request_no || ""}
                            onChange={handleInputChange}
                            disabled={isViewMode}
                            placeholder=""
                            className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${isViewMode
                              ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                              : ""
                              }`}
                          />
                        </div>

                        {/* รถวิ่งงานต่อได้หรือไม่ (แสดงเมื่อรถเสียหาย) */}
                        <div className="mb-4">
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            รถวิ่งงานต่อได้หรือไม่ : <span className="text-red-500">*</span>
                          </label>
                          <SearchableSelect
                            options={["วิ่งต่อได้", "ไม่สามารถวิ่งต่อได้"].map((status) => ({
                              value: status,
                              label: status,
                            }))}
                            value={formData?.breakdown_status || ""}
                            onChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                breakdown_status: String(value),
                              }))
                            }
                            className="w-full"
                            disabled={isViewMode}
                          />
                        </div>

                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          รายละเอียดความเสียหายของรถ:{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          name="truck_damage_details"
                          onChange={handleInputChange}
                          value={formData?.truck_damage_details || ""}
                          disabled={isViewMode}
                          rows={3}
                          className={`w-full text-sm p-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${isViewMode
                            ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                            : ""
                            }`}
                        />
                      </div>
                    )}

                  </div>
                  {/* {formData.product_damage === true && (
                      <div>
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            ความเสียหายรถ:
                          </label>
                          <textarea
                            name="truck_damage"
                            onChange={handleInputChange}
                            rows={3}
                            className="w-full text-sm p-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                        
                          />
                      </div>
                       )} */}

                  <div className="hidden grid grid-cols-1 md:grid-cols-2 gap-6">
                    {formData.product_damage === "yes" && (
                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          ประเมินค่าเสียหายสินค้า (บาท):
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          name="estimated_goods_damage_value"
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              handleInputChange(e);
                            }
                          }}
                          disabled={isViewMode}
                          value={formData?.estimated_goods_damage_value || ""}
                          className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black  ${isViewMode
                            ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                            : ""
                            }`}
                        />
                      </div>
                    )}

                    {formData.truck_damage === "yes" && (<div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        ประเมินค่าเสียหายรถ (บาท):
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        name="estimated_vehicle_damage_value"
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            handleInputChange(e);
                          }
                        }}
                        disabled={isViewMode}
                        value={formData?.estimated_vehicle_damage_value || ""}
                        className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black  ${isViewMode
                          ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                          : ""
                          }`}
                      />
                    </div>
                    )}

                    {formData.product_damage === "yes" && (<div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        ค่าเสียหายสินค้าจริง (บาท):
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        name="actual_goods_damage_value"
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            handleInputChange(e);
                          }
                        }}
                        disabled={isViewMode}
                        value={formData?.actual_goods_damage_value || ""}
                        className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black  ${isViewMode
                          ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                          : ""
                          }`}
                      />
                    </div>
                    )}

                    {formData.truck_damage === "yes" && (<div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        ค่าเสียหายรถจริง (บาท):
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        name="actual_vehicle_damage_value"
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            handleInputChange(e);
                          }
                        }}
                        disabled={isViewMode}
                        value={formData?.actual_vehicle_damage_value || ""}
                        className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black  ${isViewMode
                          ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                          : ""
                          }`}
                      />
                    </div>
                    )}
                  </div>

                  {/* รายการความเสียหาย: แสดงเฉพาะกลุ่มที่ระบุว่าเสียหายไว้แล้ว */}
                  {visibleDamageGroups.length > 0 && (
                    <div className="mt-6">
                      {/* <label className="mb-2 block text-sm font-medium text-gray-700">
                        รายการความเสียหายและมูลค่า:
                      </label> */}

                      <div className="space-y-3">
                        {visibleDamageGroups.map(renderDamageGroup)}
                      </div>
                    </div>
                  )}

                </div>

                <div className="border-t border-gray-400 md:col-span-3"></div>
                {/* การบาดเจ็บ */}
                <div className="flex flex-col p-2 bg-gray-200 font-bold text-gray-800 mb-3 text-sm">
                  <h3>ข้อมูลการบาดเจ็บและเสียชีวิต</h3>
                  <p className="font-semibold text-xs text-gray-600">
                    Injury & Fatality Information
                  </p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        บุคคลได้รับบาดเจ็บไม่ส่งโรงพยาบาล:
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        name="injured_not_hospitalized"
                        value={formData?.injured_not_hospitalized || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d+$/.test(value)) {
                            handleInputChange(e);
                          }
                        }}
                        disabled={isViewMode}
                        className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${isViewMode
                          ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                          : ""
                          }`}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        บุคคลได้รับบาดเจ็บส่งโรงพยาบาล:
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        name="injured_hospitalized"
                        value={formData?.injured_hospitalized || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d+$/.test(value)) {
                            handleInputChange(e);
                          }
                        }}
                        disabled={isViewMode}
                        className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${isViewMode
                          ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                          : ""
                          }`}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        บุคคลเสียชีวิต:
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        name="fatalities"
                        value={formData?.fatalities || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d+$/.test(value)) {
                            handleInputChange(e);
                          }
                        }}
                        disabled={isViewMode}
                        className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${isViewMode
                          ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                          : ""
                          }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium mb-1 text-sm">
                      รายละเอียดเพิ่มเติม:
                    </label>
                    <textarea
                      name="injury_description"
                      onChange={handleInputChange}
                      disabled={isViewMode}
                      value={formData?.injury_description || ""}
                      rows={4}
                      className={`w-full text-sm p-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${isViewMode
                        ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                        : ""
                        }`}
                    />
                  </div>
                </div>

                <div className="border-t border-gray-400 md:col-span-3"></div>
                {/* ข้อมูลคู่กรณี */}
                <div className="flex flex-col p-2 bg-gray-200 font-bold text-gray-800 mb-3 text-sm">
                  <h3>ข้อมูลคู่กรณี และการเคลม</h3>
                  <p className="font-semibold text-xs text-gray-600">
                    Other Party Information & Claim Officer Information
                  </p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        ชื่อ-สกุลคู่กรณี:
                      </label>
                      <input
                        type="text"
                        name="other_party_full_name"
                        onChange={handleInputChange}
                        disabled={isViewMode}
                        value={formData?.other_party_full_name || ""}
                        className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${isViewMode
                          ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                          : ""
                          }`}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        ทะเบียนรถคู่กรณี:
                      </label>
                      <input
                        type="text"
                        name="other_party_vehicle_plate"
                        onChange={handleInputChange}
                        disabled={isViewMode}
                        value={formData?.other_party_vehicle_plate || ""}
                        className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${isViewMode
                          ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                          : ""
                          }`}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        ชื่อบริษัทคู่กรณี:
                      </label>
                      <input
                        type="text"
                        name="other_party_company_name"
                        onChange={handleInputChange}
                        disabled={isViewMode}
                        value={formData?.other_party_company_name || ""}
                        className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${isViewMode
                          ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                          : ""
                          }`}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        เบอร์โทรคู่กรณี:
                      </label>
                      <input
                        type="text"
                        name="other_party_phone"
                        onChange={handleInputChange}
                        disabled={isViewMode}
                        value={formData?.other_party_phone || ""}
                        className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${isViewMode
                          ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                          : ""
                          }`}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        ชื่อบริษัทประกันคู่กรณี:
                      </label>
                      <input
                        type="text"
                        name="other_party_insurance_name"
                        onChange={handleInputChange}
                        disabled={isViewMode}
                        value={formData?.other_party_insurance_name || ""}
                        className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${isViewMode
                          ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                          : ""
                          }`}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        เลขที่เคลม:
                      </label>
                      <input
                        type="text"
                        name="other_party_claim_no"
                        onChange={handleInputChange}
                        disabled={isViewMode}
                        value={formData?.other_party_claim_no || ""}
                        className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${isViewMode
                          ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                          : ""
                          }`}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        ชื่อ-สกุล เจ้าหน้าที่เคลม:
                      </label>
                      <input
                        type="text"
                        name="claim_officer_full_name"
                        onChange={handleInputChange}
                        disabled={isViewMode}
                        value={formData?.claim_officer_full_name || ""}
                        className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${isViewMode
                          ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                          : ""
                          }`}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        เบอร์โทร เจ้าหน้าที่เคลม:
                      </label>
                      <input
                        type="text"
                        name="claim_officer_phone"
                        onChange={handleInputChange}
                        disabled={isViewMode}
                        value={formData?.claim_officer_phone || ""}
                        className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black  ${isViewMode
                          ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                          : ""
                          }`}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-400 md:col-span-3"></div>
                {/*แนบเอกสาร */}
                <div className="md:col-span-3">
                  <FileUpload
                    onFilesChange={handleFilesFromUpload}
                    existingFiles={attachedFiles}
                    onChangedocs={(docs) => setDocValue(docs as any)}
                    docs={formData.docs?.[0]}
                    case="ac"
                    requiredNote={
                      formData?.casestatus === ""
                        ? "ต้องแนบรูปเหตุการณ์อย่างน้อย 1 รูป ก่อนบันทึก"
                        : undefined
                    }
                    reporterDepartment={
                      departments?.find(
                        (dept: any) => dept.department_id === formData?.department_id
                      )?.department_name_th
                    }
                  />
                </div>


                {/* Button Submit */}
                <FormActionBar
                  mode={formData?.casestatus === "" ? "create" : "update"}
                  submitFormId={
                    formData?.casestatus === "" ? "ac-form" : undefined
                  }
                  onSave={handleUpdate}
                  isSubmitting={isSavingForm}
                  hidePrimary={formData?.casestatus === "Voided"}
                  note={`Form created by: ${formData?.reporter_name || "N/A"}`}
                >
                  {formData?.casestatus !== "" && (
                    <FormActionButton onClick={clipboard}>
                      คัดลอกข้อมูล
                    </FormActionButton>
                  )}
                </FormActionBar>
              </form>
            </div>

            {/* ===== Part 2 : Investigate Report — กระดาษแผ่นที่ 2 (แสดงเมื่อมีเลขที่เอกสารแล้ว) ===== */}
            {hasInvestigateSection && (
              <div
                id="investigate-area"
                className={`${paperClass} ${isSplitView ? "xl:w-1/2 xl:max-w-3xl" : "md:w-4xl"
                  }`}
              >
                <div className="text-center border-b border-gray-400 pb-4 mb-4">
                  <h2 className="text-xl font-bold text-gray-800">
                    รายงานผลการสอบสวนอุบัติเหตุ
                  </h2>
                  <h3 className="text-lg text-gray-600">
                    AC Investigation Report
                  </h3>
                </div>

                <ACInvestigateComponent
                  formInvestigate={formInvestigate}
                  setFormInvestigate={setFormInvestigate}
                  measureFiles={measureFiles}
                  setMeasureFiles={setMeasureFiles}
                  measureExistingFiles={measureExistingFiles}
                  setMeasureExistingFiles={setMeasureExistingFiles}
                  isViewMode={isViewMode}
                />

                <FormActionBar
                  mode={formInvestigate.investigate_id ? "update" : "create"}
                  onSave={handleSaveInvestigate}
                  isSubmitting={isSavingInvestigate}
                  disabled={isLoadingInvestigate}
                  hidePrimary={isViewMode || formData?.casestatus === "Voided"}
                  labels={{
                    create: "บันทึกผลการสอบสวน",
                    update: "อัปเดตผลการสอบสวน",
                  }}
                  note={`เอกสารเลขที่: ${formData?.document_no_ac || "-"}`}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========== Dev Payload Log — Initial Report (ซ่อนไว้) ========== */}
      {isDebugEnabled && (
        <div
          className={`fixed z-[90] print:hidden ${hasInvestigateSection ? "bottom-16" : "bottom-4"
            }`}
        >
          {!showPayload ? (
            <button
              type="button"
              onClick={() => setShowPayload(true)}
              title="ดู payload ของ Initial Report (dev only)"
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-lg cursor-pointer transition duration-200 opacity-40 hover:opacity-100"
            >
              <Bug className="w-4 h-4" />
              Initial Payload
            </button>
          ) : (
            <div className="w-[min(92vw,480px)] max-h-[70vh] flex flex-col bg-slate-900 text-slate-100 rounded-lg shadow-2xl border border-slate-700 overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-800 border-b border-slate-700">
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                  <Bug className="w-4 h-4" />
                  Initial Report Payload
                  <span className="text-slate-400 font-normal">
                    ({debugPayloadText.length.toLocaleString()} chars)
                  </span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={copyInitialPayload}
                    title="คัดลอก JSON"
                    className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white px-1.5 py-1 rounded hover:bg-slate-700 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedPayload ? "คัดลอกแล้ว" : "คัดลอก"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPayload(false)}
                    title="ปิด"
                    className="text-slate-300 hover:text-white p-1 rounded hover:bg-slate-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <pre className="flex-1 overflow-auto p-3 text-[11px] leading-relaxed whitespace-pre font-mono">
                {debugPayloadText}
              </pre>
            </div>
          )}
        </div>
      )}
    </>
  );
};
