"use client";
import { useEffect, useState, Suspense, act } from "react";
import { useSearchParams } from "next/navigation";
import { LordIcon } from "./LordIcon";
import { DateTimePicker24h } from "./ui/datetime-picker";
import { SearchableSelect } from "./ui/searchable-select";
import { FileUpload } from "./FileUpload";
import { caseReport_NC, investigate_NC } from "@/lib/caseReport";
import { useDropdownStore } from "@/lib/dropdownlist";
import { useClipboard_nc } from "@/lib/clipboard";
import {
  CirclePlus,
  CircleMinus,
} from "lucide-react";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

interface FileWithId {
  id: string;
  file: File;
  url: string;
  updateData: string;
  category: string;
  uploadDate: Date;
}
interface CategoryFiles {
  [key: string]: FileWithId[];
}

export const NCFormComponent = () => {
  // ========== Hooks และ State ==========
  const router = useRouter();

  const {
    sites,
    departments,
    clients,
    vehicles,
    locations,
    driver_roles,
    masterdrivers,
    mastercauses,
    isLoading: isDropdownLoading,
    fetchDropdownData,
    getData,
  } = useDropdownStore();

  // Form State
  const [formData, setFormData] = useState<Partial<caseReport_NC>>({
    casestatus: "",
    products: [{ product_id: 1, product_name: "", amount: 0, unit: "" }] as [
      {
        product_id: number;
        product_name: string;
        amount: number;
        unit: string;
        casestatus: string;
      }
    ],
  });

  const [formInvestigate, setFormInvestigate] = useState<
    Partial<investigate_NC>
  >({});

  // UI State
  const [displayPIC, setDisplayPIC] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isLoadingFormData, setIsLoadingFormData] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<CategoryFiles>({});
  const [userinfo, setUserinfo] = useState<any>(null);
  const [thisform, setThisform] = useState<string>("initial"); // initial or investigate
  const [isAnimating, setIsAnimating] = useState(false);
  const [corrective_actions, setCorrectiveActions] = useState<
    [
      {
        action_id: number;
        corrective_action: string;
        pic_contract: string;
        plan_date: string | null;
        action_completed_date: string | null;
      }
    ]
  >([
    {
      action_id: 1,
      corrective_action: "",
      pic_contract: "",
      plan_date: null,
      action_completed_date: null,
    },
  ]);

  // Filtered Data for Site Dependencies
  const [filteredData, setFilteredData] = useState<{
    masterdrivers?: any[];
    locations?: any[];
    vehicles?: any[];
  }>({
    masterdrivers: masterdrivers || [],
    locations: locations || [],
    vehicles: vehicles || [],
  });

  useEffect(() => {
    const loadUserInfo = async () => {
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
        if (sites?.length == 0) {
          await fetchDropdownData();
        }
        getvaluesparams(newUserinfo.name);
      } catch (error) {
        console.error("Error parsing userData from localStorage:", error);
        setUserinfo(null);
      }
    };

    loadUserInfo();
  }, []);

  const searchParams = useSearchParams();

  const getvaluesparams = async (name: string) => {
    const docId = searchParams.get("doc");

    if (docId) {
      document.title = `${docId}`;
      setIsLoadingFormData(true);

      try {
        const res = await fetch(
          `/api/document/nc?document_no=${encodeURIComponent(docId)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const data = await res.json();
        if (res.ok) {
          if (data.reporter == name) {
            setIsViewMode(false);
          } else {
            setIsViewMode(true);
          }

          setFormData(data);
          await mapTextDataToIds(data);

          // โหลดไฟล์แนบ
          await loadExistingAttachments(docId);
        } else {
          throw new Error(
            data.message || `HTTP ${res.status}: ${res.statusText}`
          );
        }
      } catch (error) {
        console.error("Error fetching record:", error);
      } finally {
        setIsLoadingFormData(false);
      }
    } else {
      // ถ้าไม่มี doc parameter ให้ reset title กลับเป็นปกติ
      document.title = "Mena Safety - NC Form";

      setFormData((prev) => ({
        ...prev,
        record_date: new Date().toISOString(),
      }));
    }
  };

const thisformtype = async (type: string) => {
  if (type !== thisform) {
    setIsAnimating(true);
    setTimeout(async () => {
      if (type === "investigate") {
        setThisform("investigate");
        console.log("status: ", formData.casestatus);
        if (formData.casestatus !== "Pending") {
          try {
            const res = await fetch(`/api/investigate/nc?document_no=${formData.document_no}`, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              }
            });

            if (res.ok) {
              const data = await res.json();
              // console.log("Investigate data:", data);
              setFormInvestigate(data);
              setCorrectiveActions(
              data.corrective_actions.map((action: any, index: number) => ({
                ...action,
                action_id: index + 1
              })) as any
            );
            } else {
              console.error("Failed to fetch investigate data:", res.statusText);
            }
          } catch (error) {
            console.error("Error fetching investigate data:", error);
          }
        }
      } else {
        setThisform("initial");
      }
      setTimeout(() => setIsAnimating(false), 100);
    }, 150);
  }
};
  // ========== Data Mapping Functions ==========
  const mapTextDataToIds = async (data: any) => {
    const mappedData: any = {};
    const store = getData();
    console.log("store : ", store);
    if (data.site && store.sites) {
      const site = store.sites.find(
        (val: any) => val.site_name_th === data.site
      );
      if (site) mappedData.site_id = site.site_id;
    }

    if (data.department && store.departments) {
      const department = store.departments.find(
        (val: any) => val.department_name_th === data.department
      );
      if (department) mappedData.department_id = department.department_id;
    }

    if (data.client && store.clients) {
      const client = store.clients.find(
        (val: any) => val.client_name === data.client
      );
      if (client) mappedData.client_id = client.client_id;
    }
    if (data.origin_name && store.locations) {
      const location = store.locations.find(
        (val: any) => val.location_name === data.origin_name
      );
      if (location) mappedData.origin_id = location.location_id;
    }

    if (data.vehicle_head && store.vehicles) {
      const vehicle = store.vehicles.find(
        (val: any) =>
          val.vehicle_number_plate === data.vehicle_head &&
          val.plate_type === "head"
      );
      if (vehicle) {
        mappedData.vehicle_truckno = vehicle.truck_no;
        mappedData.vehicle_id_head = vehicle.vehicle_id;
      }
    }

    if (data.vehicle_tail && store.vehicles) {
      const vehicle = store.vehicles.find(
        (val: any) =>
          val.vehicle_number_plate === data.vehicle_tail &&
          val.plate_type === "tail"
      );
      if (vehicle) mappedData.vehicle_id_tail = vehicle.vehicle_id;
    }

    if (data.driver_role && store.driver_roles) {
      const role = store.driver_roles.find(
        (val: any) => val.role_name === data.driver_role
      );
      if (role) mappedData.driver_role_id = role.driver_role_id;
    }

    if (data.driver && store.masterdrivers) {
      const driver = store.masterdrivers.find((val: any) => {
        const fullName = val.first_name + " " + val.last_name;
        return fullName === data.driver;
      });
      if (driver) mappedData.driver_id = driver.driver_id;
    }

    if (data.incident_cause && store.mastercauses) {
      const cause = store.mastercauses.find(
        (val: any) => val.cause_name === data.incident_cause
      );
      if (cause) mappedData.incident_cause_id = cause.cause_id;
    }

    setFormData((prev) => ({ ...prev, ...mappedData }));
  };

  const loadExistingAttachments = async (document_no: string) => {
    try {
      const res = await fetch(
        `/api/attachment?document_no=${encodeURIComponent(document_no)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (res.ok) {
        const data = await res.json();

        const categorizedFiles: CategoryFiles = {};

        if (data.files && Array.isArray(data.files)) {
          data.files.forEach((file: any) => {
            const fileName = file.fileName || "";
            const parts = fileName.split("_");

            if (parts.length >= 3) {
              // ตัด docno และ number + extension ออก เหลือแค่ category
              const category = parts.slice(1, -1).join("_");
              // console.log('Category:', category);

              if (!categorizedFiles[category]) {
                categorizedFiles[category] = [];
              }

              // สร้าง mock File object สำหรับไฟล์ที่มีอยู่แล้ว
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
      } else {
        console.error("Failed to load attachments:", res.statusText);
      }
    } catch (error) {
      console.error("Error loading attachments:", error);
    }
  };

  // ========== Form Initialization ==========
  useEffect(() => {
    const now = new Date();
    const localDateTime = new Date(
      now.getTime() - now.getTimezoneOffset() * 60000
    ).toISOString();

    setFormData((prev) => ({
      ...prev,
      record_date: localDateTime,
    }));
  }, []);

  // const adddropdownData = (value: any) => {
  //   setDropdownData((prevData) => ({
  //     ...prevData,
  //     ...value,
  //   }));
  // };

  // ========== File Handling Functions ==========
  const handleFilesFromUpload = (files: CategoryFiles) => {
    // console.log("Files received from FileUpload component:", files);
    setAttachedFiles(files);
  };

  // ========== Site Handling Functions ==========
  const handleSiteChange = (siteId: number) => {
    setFormData((prev) => ({ ...prev, site_id: siteId }));
    if (siteId) {
      const filteredDrivers =
        masterdrivers?.filter((driver: any) => driver.site_id === siteId) || [];
      const filteredLocations =
        locations?.filter((location: any) => location.site_id === siteId) || [];
      // const filteredVehicles =
      //   vehicles?.filter((vehicle: any) => vehicle.site_id === siteId) || [];

      setFilteredData({
        masterdrivers: filteredDrivers,
        locations: filteredLocations,
        // vehicles: filteredVehicles,
      });
    } else {
      setFilteredData({
        masterdrivers: masterdrivers || [],
        locations: locations || [],
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

  // Update filtered data when store data changes
  useEffect(() => {
    if (!formData.site_id) {
      setFilteredData({
        masterdrivers: masterdrivers || [],
        locations: locations || [],
        vehicles: vehicles || [],
      });
    }
  }, [masterdrivers, locations, vehicles, formData.site_id]);

  // ========== Auto Resize Textarea ==========
  useEffect(() => {

    const rootCauseTextarea = document.querySelector(
      'textarea[name="root_cause_analysis"]'
    ) as HTMLTextAreaElement;
    if (rootCauseTextarea) {
      rootCauseTextarea.style.height = "auto";
      rootCauseTextarea.style.height = `${
        Math.max(100, rootCauseTextarea.scrollHeight)
      }px`;
    }

    const correctiveTextareas = document.querySelectorAll(
      'textarea[data-action-id]'
    ) as NodeListOf<HTMLTextAreaElement>;
    correctiveTextareas.forEach((textarea) => {
      textarea.style.height = "auto";
      textarea.style.height = `${
        Math.max(50, textarea.scrollHeight)
      }px`;
    });
  }, [formInvestigate.root_cause_analysis, corrective_actions]);

  // ========== View Mode Data Filtering ==========
  useEffect(() => {
    if (isViewMode && formData.site_id && masterdrivers && locations) {
      let filteredDrivers = masterdrivers.filter(
        (driver: any) => driver.site_id === formData.site_id
      );
      const filteredLocations = locations.filter(
        (location: any) =>
          location.location_id === formData.origin_id ||
          location.site_id === formData.site_id
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

      setFilteredData({
        masterdrivers: filteredDrivers,
        locations: filteredLocations,
        vehicles: vehicles || [],
      });
    }
  }, [
    isViewMode,
    formData.site_id,
    formData.driver_id,
    formData.origin_id,
    masterdrivers,
    locations,
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

  // const handleTailPlateChange = (vehicleId: number) => {
  //   const selectedVehicle = dropdownData.vehicles?.find(vehicle =>
  //     vehicle.vehicle_id === vehicleId && vehicle.plate_type === 'tail'
  //   );

  //   if (selectedVehicle) {
  //     // หา head vehicle ที่มี truck_no เดียวกัน
  //     const headVehicle = dropdownData.vehicles?.find(vehicle =>
  //       vehicle.truck_no === selectedVehicle.truck_no && vehicle.plate_type === 'head'
  //     );

  //     setFormData(prev => ({
  //       ...prev,
  //       vehicle_truckno: headVehicle?.truck_no || selectedVehicle.truck_no,
  //       vehicle_id_head: headVehicle?.vehicle_id,
  //       vehicle_id_tail: selectedVehicle.vehicle_id
  //     }));
  //   }
  // };
  // ========== Utility Functions ==========

  const clipboard = async () => {
    try {
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
      const selectedIncidentCause = mastercauses?.find(
        (cause) => cause.cause_id === formData.incident_cause_id
      );

      const content = useClipboard_nc({
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
        selectedIncidentCause,
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
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถคัดลอกข้อมูลได้",
      });
    }
  };

  // ========== Add/Remove Item Functions ==========
  const handleAddItem = (type: string) => {
    const itemName = prompt(`เพิ่มรายการใหม่สำหรับ ${type}:`);
    if (itemName && itemName.trim()) {
      // ฟีเจอร์นี้จะถูกพัฒนาในอนาคต
      alert(`ฟีเจอร์เพิ่มรายการ "${itemName}" จะพัฒนาในเร็วๆ นี้`);
    }
  };

  const handleRemoveItem = (type: string, itemId?: string | number) => {
    // ฟีเจอร์นี้จะถูกพัฒนาในอนาคต
    alert("ฟีเจอร์ลบรายการจะพัฒนาในเร็วๆ นี้");
  };

  // ========== Form Input Handlers ==========
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleInvestigateInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setFormInvestigate({
      ...formInvestigate,
      [e.target.name]: e.target.value,
    });
  };

  // const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   setFormData({
  //     ...formData,
  //     attachments: e.target.files ? e.target.files.length.toString() : "",
  //   });
  // };

  const addProductItem = () => {
    const items = formData.products || [];
    const newId =
      items.length > 0
        ? Math.max(...items.map((item) => item.product_id)) + 1
        : 1;
    if (newId > 5) return alert("เพิ่มรายการสินค้าได้สูงสุด 5 รายการ");
    setFormData({
      ...formData,
      products: [
        ...items,
        { product_id: newId, product_name: "", amount: 0, unit: "" },
      ] as any,
    });
  };

  const removeProductItem = () => {
    if (formData.products && formData.products.length > 1) {
      setFormData({
        ...formData,
        products: formData.products.slice(0, -1) as any,
      });
    }
  };

  const handleProductItemChange = (
    id: number,
    field: string,
    value: string | number
  ) => {
    if (!formData.products) return;
    setFormData({
      ...formData,
      products: formData.products.map((item) =>
        item.product_id === id
          ? { ...item, [field]: field === "amount" ? Number(value) : value }
          : item
      ) as any,
    });
  };

  // ========== Corrective Actions Functions ==========
  const addCorrectiveAction = () => {
    const actions = corrective_actions || [];
    const newId =
      actions.length > 0
        ? Math.max(...actions.map((action) => action.action_id)) + 1
        : 1;
    if (newId > 7) return alert("เพิ่มรายการแผนการแก้ไขได้สูงสุด 7 รายการ");
    setCorrectiveActions([
      ...actions,
      {
        action_id: newId,
        corrective_action: "",
        pic_contract: "",
        plan_date: null,
        action_completed_date: null,
      },
    ] as any);
  };

  const removeCorrectiveAction = () => {
    if (corrective_actions && corrective_actions.length > 1) {
      setCorrectiveActions(corrective_actions.slice(0, -1) as any);
    }
  };

  const handleCorrectiveActionChange = (
    id: number,
    field: string,
    value: string
  ) => {
    console.log("[field,value]", [field, value]);
    if (!corrective_actions) return;
    setCorrectiveActions(
      corrective_actions.map((action) =>
        action.action_id === id ? { ...action, [field]: value } : action
      ) as any
    );
  };

  const validateRequiredFields = () => {
    const requiredFields = [
      { field: "site_id", label: "ศูนย์ปฏิบัติการ", elementName: "site_id" },
      { field: "department_id", label: "ฝ่าย", elementName: "department_id" },
      {
        field: "incident_date",
        label: "วันที่และเวลา เกิดเหตุ",
        elementName: "incident_date",
      },
      {
        field: "incident_cause_id",
        label: "สาเหตุการเกิดเหตุ",
        elementName: "incident_cause_id",
      },
      {
        field: "case_details",
        label: "รายละเอียดเหตุการณ์",
        elementName: "case_details",
      },
      { field: "client_id", label: "ลูกค้า", elementName: "client_id" },
      // { field: 'origin_id', label: 'ต้นทาง/แพล้น', elementName: 'origin_id' },
      // { field: 'destination', label: 'ปลายทาง', elementName: 'destination' },
      {
        field: "case_location",
        label: "สถานที่เกิดเหตุ",
        elementName: "case_location",
      },
      // { field: 'province_id', label: 'จังหวัด', elementName: 'province_id' },
      // { field: 'district_id', label: 'อำเภอ', elementName: 'district_id' },
      // { field: 'sub_district_id', label: 'ตำบล', elementName: 'sub_district_id' },
      {
        field: "vehicle_id_head",
        label: "ทะเบียนรถหัว",
        elementName: "vehicle_id_head",
      },
      {
        field: "vehicle_id_tail",
        label: "ทะเบียนรถหาง",
        elementName: "vehicle_id_tail",
      },
      {
        field: "driver_role_id",
        label: "ประเภทคนขับ",
        elementName: "driver_role_id",
      },
      { field: "driver_id", label: "ชื่อ-สกุลคนขับ", elementName: "driver_id" },
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

    return { missingFields, firstMissingField };
  };

  // ========== Form Submission Functions ==========
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateRequiredFields();
    if (validation.missingFields.length > 0) {
      const missingFieldsList = validation.missingFields.join("\n• ");
      Swal.fire({
        icon: "warning",
        title: 'กรุณากรอกข้อมูลที่มีเครื่องหมาย " * " ให้ครบถ้วน',
        confirmButtonText: "ตกลง",
        confirmButtonColor: "#d33",
      });
      return;
    }

    try {
      if (!userinfo?.id) {
        alert("ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
        return;
      }

      const now = new Date();
      const localDateTime = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
      ).toISOString();

      // console.log("userData from localStorage:", userinfo.id);
      // console.log("Local DateTime:", localDateTime);

      const submitData = {
        ...formData,
        record_date: localDateTime,
        reporter_id: userinfo.id,
      };

      // console.log("NC Form data to submit:", submitData);

      const res = await fetch("/api/document/nc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      const responseData = await res.json();
      // console.log("API Response:", responseData);

      if (res.ok) {
        // console.log("Success response data:", responseData);
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
          document_no_ac: responseData.document_no_ac,
          casestatus: responseData.casestatus,
        }));

        if (responseData.document_no && Object.keys(attachedFiles).length > 0) {
          await attatchments_post(responseData.document_no);
        }

        // Optional: Reload page after successful submission
        // window.location.reload();
      } else {
        throw new Error(
          responseData.message || `HTTP ${res.status}: ${res.statusText}`
        );
      }
    } catch (error) {
      console.error("Error submitting NC Form:", error);
      alert(
        `เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleUpdate = async () => {
    const validation = validateRequiredFields();
    if (validation.missingFields.length > 0) {
      // const missingFieldsList = validation.missingFields.join("\n• ");
      //  console.log("Missing Fields:", missingFieldsList);
      Swal.fire({
        icon: "warning",
        title: 'กรุณากรอกข้อมูลที่มีเครื่องหมาย " * " ให้ครบถ้วน',
        confirmButtonText: "ตกลง",
        confirmButtonColor: "#d33",
      });
      return;
    }
    delete formData.priority;
    //  console.log("NC Form Update <><><><> :", formData);

    const res = await fetch("/api/document/nc", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });
    const responseData = await res.json();
    //  console.log("API Response on Update:", responseData);
    if (res.ok) {
      Swal.fire({
        icon: "success",
        title: "อัปเดตข้อมูลเรียบร้อย",
        draggable: true,
        confirmButtonText: "ตกลง",
        allowOutsideClick: false,
      });
    }
    setFormData((prev) => ({
      ...prev,
      priority: responseData.priority,
    }));
    //  console.log("Attached Files on Update:", attachedFiles);
    if (responseData.document_no && Object.keys(attachedFiles).length > 0) {
      await attatchments_post(responseData.document_no);
    }
    // }
  };

  const handleUpdateInvestigate = async () => {
    if (!formData.document_no)
      return alert("ไม่พบเลขที่เอกสารนี้ โปรดลองใหม่อีกครั้ง");
    console.log("status: ", formData.casestatus);
    console.log("NC Investigate Update <><><><> :", formInvestigate);
    const data = {
      ...formInvestigate,
      corrective_actions: corrective_actions,
    };

    const res = await fetch("/api/investigate/nc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        document_no: formData.document_no,
      },
      body: JSON.stringify(data),
    });
    const responseData = await res.json();
    console.log("API Response on Investigate Update:", responseData);
    if (res.ok) {
      Swal.fire({
        icon: "success",
        title: "บันทึกข้อมูลการสอบสวนเรียบร้อย",
        draggable: true,
        confirmButtonText: "ตกลง",
        allowOutsideClick: false,
      });
    }
  };

  // ========== File Management Functions ==========
  const attatchments_post = async (document_no: string) => {
    if (!document_no) {
      console.error("Document number is required for attachments upload.");
      return;
    }

    try {
      const uploadFormData = new FormData();
      Object.entries(attachedFiles).forEach(([category, files]) => {
        if (Array.isArray(files)) {
          files.forEach((fileItem: FileWithId, index: number) => {
            if (fileItem.updateData === "existing") {
              // Skip existing files
              return;
            }

            const fileExtension = fileItem.file.name.split(".").pop();
            const randomNumber = String(
              Math.floor(Math.random() * 100)
            ).padStart(2, "0");
            const newFileName = `${document_no}_${category}_${randomNumber}.${fileExtension}`;

            const renamedFile = new File([fileItem.file], newFileName, {
              type: fileItem.file.type,
            });
            uploadFormData.append("files", renamedFile);
            uploadFormData.append("categories", category);
          });
        }
      });

      uploadFormData.append("document_no", document_no);

      // console.log("uploadFormData prepared for upload:", uploadFormData);

      if (uploadFormData.getAll("files").length === 0) {
        console.log("No new files to upload.");
        return;
      }

      const res = await fetch("/api/attachment", {
        method: "POST",
        body: uploadFormData,
      });

      if (res.ok) {
        const result = await res.json();
      } else {
        throw new Error(`Failed to upload attachments: ${res.statusText}`);
      }
    } catch (error) {
      console.error("Error uploading attachments:", error);
      alert("เกิดข้อผิดพลาดในการอัปโหลดไฟล์แนบ");
    }
  };
  // ========== Helper Functions ==========
  const formatLocalDateTime = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };
  // ========== Loading States ==========
  if (isLoadingFormData || (isDropdownLoading && searchParams.get("doc"))) {
    return (
      <div className="min-h-screen bg-[#eef8ef] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-center">
            <p className="text-gray-700 font-medium text-lg">
              กำลังโหลดข้อมูลฟอร์ม NC...
            </p>
            <p className="text-gray-500 text-sm mt-1">
              {isDropdownLoading
                ? "กำลังโหลดรายการข้อมูล"
                : "กำลังโหลดข้อมูลเอกสาร"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#eef8ef]">
        <div className="p-6 space-y-6">
          {formData?.casestatus !== "" && (
            <div className="fixed right-6 bottom-6 flex flex-col items-center space-y-4 z-50">
              {/* Progress Line */}
              {/* <div className="absolute top-10 w-1 h-20 bg-gray-300 rounded-full overflow-hidden">
                <div 
                  className={`w-full bg-gradient-to-b from-green-500 to-emerald-600 transition-all duration-500 ease-out ${
                    thisform === "investigate" ? "h-full" : "h-0"
                  }`}
                />
              </div> */}

              {/* Button 1: Initial Report */}
              <div className="flex flex-col items-center group relative">
                <button
                  type="button"
                  onClick={() => thisformtype("initial")}
                  disabled={thisform === "initial"}
                  className={`relative flex items-center justify-center w-20 h-20 text-xl font-bold
                    rounded-full shadow-lg transition-all duration-300 ease-out
                    disabled:cursor-not-allowed overflow-hidden
                    ${
                      thisform === "initial"
                        ? "bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 text-white scale-110 shadow-2xl"
                        : "bg-white text-gray-600 hover:text-green-600 hover:scale-105 hover:shadow-xl border-2 border-gray-300 hover:border-green-400"
                    }`}
                >
                  <span className="relative z-10">1</span>
                  {thisform === "initial" && (
                    <div className="absolute inset-0 bg-white opacity-20" />
                  )}
                </button>
                <div className="mt-3 text-center">
                  <span
                    className={`text-xs font-semibold tracking-wide transition-colors duration-300 ${
                      thisform === "initial"
                        ? "text-green-600"
                        : "text-gray-600 group-hover:text-green-500"
                    }`}
                  >
                    Initial Report
                  </span>
                </div>
              </div>

              {/* Button 2: Investigation */}
              <div className="flex flex-col items-center group relative">
                <button
                  type="button"
                  onClick={() => thisformtype("investigate")}
                  disabled={thisform === "investigate"}
                  className={`relative flex items-center justify-center w-20 h-20 text-xl font-bold
                    rounded-full shadow-lg transition-all duration-300 ease-out
                    disabled:cursor-not-allowed overflow-hidden
                    ${
                      thisform === "investigate"
                        ? "bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-600 text-white scale-110 shadow-2xl"
                        : "bg-white text-gray-600 hover:text-green-600 hover:scale-105 hover:shadow-xl border-2 border-gray-300 hover:border-green-400"
                    }`}
                >
                  <span className="relative z-10">2</span>
                  {thisform === "investigate" && (
                    <div className="absolute inset-0 bg-white opacity-20 " />
                  )}
                </button>
                <div className="mt-3 text-center">
                  <span
                    className={`text-xs font-semibold tracking-wide transition-colors duration-300 ${
                      thisform === "investigate"
                        ? "text-emerald-600"
                        : "text-gray-600 group-hover:text-emerald-500"
                    }`}
                  >
                    Investigation
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center">
            <div
              id="printable-area"
              className="md:w-4xl sm:w-full mx-4 space-y-6 bg-white p-8 rounded-xl shadow-sm border border-gray-500"
            >
              <div className="text-center border-b border-gray-400 pb-4 mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  แบบรายงานการให้บริการที่ไม่เป็นไปตามข้อกำหนดเบื้องต้น
                </h2>
                <h3 className="text-lg text-gray-600">
                  Initial Non-Conformity Services Form
                </h3>
              </div>

              <form id="nc-form" name="nc-form" onSubmit={handleSubmit}>
                {/* Initial Report Section */}
                {thisform === "initial" && (
                  <div
                    className={`rounded-lg bg-white transition-all duration-300 ${
                      isAnimating
                        ? "opacity-0 translate-y-10"
                        : "opacity-100 translate-y-0"
                    }`}
                  >
                    <div className="mb-3 border-b border-gray-400 pb-4">
                      <label className="flex text-sm p-1 font-bold text-gray-800">
                        Part 1: Initial NC Reporting - Overview and key details
                      </label>
                      <label className="flex text-sm p-1 font-bold text-gray-800">
                        ส่วนที่ 1: รายงานการให้บริการที่ไม่เป็นไปตามข้อกำหนด -
                        รายละเอียดเบื้องต้นของการให้บริการที่ไม่เป็นไปตามข้อกำหนดที่เกิดขึ้น
                      </label>
                    </div>
                    {/*ข้อมูลเบื้องต้น */}
                    <div className="flex flex-col p-2 bg-gray-200 font-bold text-gray-800 font-bold mb-3 text-sm">
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
                            name="document_no"
                            value={formData?.document_no || "Auto Generated"}
                            onChange={handleInputChange}
                            disabled
                            className="w-full cursor-not-allowed text-sm font-bold text-blue-600 p-2 bg-gray-100 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            ศูนย์ปฏิบัติการ:{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <SearchableSelect
                            options={(sites || []).map((site: any) => ({
                              value: site.site_id,
                              label: site.site_name_th,
                            }))}
                            value={formData?.site_id || ""}
                            onChange={(value) =>
                              handleSiteChange(Number(value))
                            }
                            onAdd={() => handleAddItem("site")}
                            showAddRemove={!isViewMode}
                            disabled={isViewMode}
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            ฝ่าย: <span className="text-red-500">*</span>
                          </label>
                          <SearchableSelect
                            options={(departments || []).map((dept: any) => ({
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
                            onAdd={() => handleAddItem("department")}
                            disabled={isViewMode}
                            showAddRemove={true}
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            วันที่และเวลา แจ้งเหตุ:
                          </label>
                          <input
                            type="text"
                            name="record_date"
                            disabled={isViewMode}
                            value={
                              formatLocalDateTime(
                                new Date(formData.record_date || "")
                              )
                            }
                            readOnly
                            className="w-full text-sm p-2 bg-gray-100 border border-gray-300 rounded focus:outline-none text-black cursor-not-allowed disabled:text-blue-600 disabled:font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            วันที่และเวลา เกิดเหตุ:{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          {isViewMode ? (
                            <input
                              type="text"
                              value={
                                formData?.incident_date
                                  ? (() => {
                                      const date = new Date(
                                        formData.incident_date
                                      );
                                      const localDate = new Date(
                                        date.getTime() +
                                          date.getTimezoneOffset() * 60000
                                      );
                                      return localDate.toLocaleString("en-UK", {
                                        year: "numeric",
                                        month: "2-digit",
                                        day: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        hour12: false,
                                      });
                                    })()
                                  : ""
                              }
                              readOnly
                              className="w-full cursor-not-allowed text-sm font-bold text-blue-600 p-2 bg-gray-100 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                            />
                          ) : (
                            <DateTimePicker24h
                              value={
                                formData?.incident_date
                                  ? new Date(formData.incident_date)
                                  : undefined
                              }
                              onChange={(date) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  incident_date: date?.toISOString() || "",
                                }))
                              }
                              disabled={isViewMode}
                            />
                          )}
                        </div>
                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            สาเหตุ NC: <span className="text-red-500">*</span>
                          </label>
                          <SearchableSelect
                            options={(mastercauses || []).map((cause: any) => ({
                              value: cause.cause_id,
                              label: cause.cause_name,
                            }))}
                            value={formData?.incident_cause_id || ""}
                            onChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                incident_cause_id: Number(value),
                              }))
                            }
                            onAdd={() => handleAddItem("mastercause")}
                            showAddRemove={true}
                            className="w-full"
                            disabled={isViewMode}
                          />
                        </div>

                        <div className="md:col-span-3">
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            รายละเอียด NC:{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            name="case_details"
                            value={formData?.case_details}
                            onChange={handleInputChange}
                            rows={3}
                            maxLength={1000}
                            disabled={isViewMode}
                            className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${
                              isViewMode
                                ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                                : ""
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-400 md:col-span-3"></div>
                    {/*ข้อมูลการขนส่งและสถานที่ */}
                    <div className="flex flex-col p-2 bg-gray-200 font-bold text-gray-800 font-bold mb-3 text-sm">
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
                            options={(clients || []).map((client: any) => ({
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
                            onAdd={() => handleAddItem("client")}
                            showAddRemove={true}
                            className="w-full"
                            disabled={isViewMode}
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
                            showAddRemove={true}
                            className="w-full"
                            disabled={isViewMode}
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            ปลายทาง:
                          </label>
                          <input
                            type="text"
                            name="destination"
                            value={formData?.destination}
                            onChange={handleInputChange}
                            disabled={isViewMode}
                            className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${
                              isViewMode
                                ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                                : ""
                            }`}
                          />
                        </div>

                        <div className="md:col-span-3">
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            สถานที่เกิดเหตุ:{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="case_location"
                            value={formData?.case_location}
                            onChange={handleInputChange}
                            disabled={isViewMode}
                            className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${
                              isViewMode
                                ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                                : ""
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-400 md:col-span-3"></div>
                    {/*ข้อมูลรถและคนขับ */}
                    <div className="flex flex-col p-2 bg-gray-200 font-bold text-gray-800 font-bold mb-3 text-sm">
                      <h3>ข้อมูลพนักงานจัดส่ง</h3>
                      <p className="font-semibold text-xs text-gray-600">
                        Delivery Personnel Information
                      </p>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            ทะเบียนรถหัว:{" "}
                            <span className="text-red-500">*</span>
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
                            onAdd={() => handleAddItem("vehicle")}
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
                                    (vehicle: any) =>
                                      vehicle.plate_type === "head"
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
                            onAdd={() => handleAddItem("vehicle")}
                            showAddRemove={true}
                            className="w-full"
                            disabled={isViewMode}
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            ทะเบียนรถหาง:{" "}
                            <span className="text-red-500">*</span>
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
                            onAdd={() => handleAddItem("vehicle")}
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
                            onAdd={() => handleAddItem("driver_role")}
                            showAddRemove={true}
                            className="w-full"
                            disabled={isViewMode}
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            ชื่อ-สกุลคนขับ:{" "}
                            <span className="text-red-500">*</span>
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
                            onAdd={() => handleAddItem("masterdriver")}
                            showAddRemove={true}
                            className="w-full"
                            disabled={isViewMode}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-400 md:col-span-3"></div>
                    <div className="flex flex-row justify-between p-2 bg-gray-200 font-bold text-gray-800 font-bold text-sm">
                      <div className="flex flex-col ">
                        <h3>ความเสียหาย และค่าใช้จ่าย</h3>
                        <p className="font-semibold text-xs text-gray-600">
                          Damages and Costs
                        </p>
                      </div>
                      <div className={`flex p-2 ${isViewMode ? "hidden" : ""}`}>
                        <CirclePlus
                          onClick={addProductItem}
                          className="ml-2 w-5 h-5 bg-white rounded-full text-gray-600 hover:text-green-700 cursor-pointer"
                        />
                        <CircleMinus
                          onClick={removeProductItem}
                          className="ml-2 w-5 h-5 bg-white rounded-full text-gray-600 hover:text-red-700 cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="md:col-span-3">
                        <div className="overflow-x-auto">
                          <table className="w-full border border-gray-300 mb-6 text-sm">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">
                                  ลำดับ
                                </th>
                                <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">
                                  สินค้า
                                </th>
                                <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">
                                  จำนวน
                                </th>
                                <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">
                                  หน่วย
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white">
                              {(formData.products || []).map((item, index) => (
                                <tr key={item.product_id}>
                                  <td className="border border-gray-300 px-3 py-2 text-black">
                                    {index + 1}
                                  </td>
                                  <td className="border border-gray-300 px-3 py-2 text-black">
                                    <input
                                      type="text"
                                      value={item.product_name}
                                      onChange={(e) =>
                                        handleProductItemChange(
                                          item.product_id,
                                          "product_name",
                                          e.target.value
                                        )
                                      }
                                      className={`w-full text-sm p-1 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${
                                        isViewMode
                                          ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                                          : ""
                                      }`}
                                      disabled={isViewMode}
                                    />
                                  </td>
                                  <td className="border border-gray-300 px-3 py-2 text-black">
                                    <input
                                      type="number"
                                      value={item.amount}
                                      onChange={(e) =>
                                        handleProductItemChange(
                                          item.product_id,
                                          "amount",
                                          e.target.value
                                        )
                                      }
                                      className={`w-full text-sm p-1 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${
                                        isViewMode
                                          ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                                          : ""
                                      }`}
                                      disabled={isViewMode}
                                    />
                                  </td>
                                  <td className="border border-gray-300 px-3 py-2 text-black">
                                    <select
                                      value={item.unit}
                                      onChange={(e) =>
                                        handleProductItemChange(
                                          item.product_id,
                                          "unit",
                                          e.target.value
                                        )
                                      }
                                      disabled={isViewMode}
                                      className={`w-full text-sm p-1 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${
                                        isViewMode
                                          ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                                          : ""
                                      }`}
                                    >
                                      <option value=""></option>
                                      <option value="คิว">คิว</option>
                                      <option value="กล่อง">กล่อง</option>
                                      <option value="แพ็ค">แพ็ค</option>
                                      <option value="ชิ้น">ชิ้น</option>
                                    </select>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-gray-700 font-medium mb-1 text-sm">
                                มูลค่าความเสียหายประมาณการ:
                              </label>
                              <input
                                type="number"
                                name="estimated_cost"
                                value={formData?.estimated_cost || 0}
                                onChange={handleInputChange}
                                disabled={isViewMode}
                                className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${
                                  isViewMode
                                    ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                                    : ""
                                }`}
                              />
                            </div>

                            <div>
                              <label className="block text-gray-700 font-medium mb-1 text-sm">
                                มูลค่าความเสียหายจริง:
                              </label>
                              <input
                                type="number"
                                name="actual_price"
                                value={formData?.actual_price || 0}
                                onChange={handleInputChange}
                                disabled={isViewMode}
                                className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${
                                  isViewMode
                                    ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                                    : ""
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-400 md:col-span-3"></div>
                    {/*แนบเอกสาร */}
                    <div className="flex flex-col p-2 bg-gray-200 font-bold text-gray-800 font-bold mb-3 text-sm">
                      <h3>แนบเอกสาร</h3>
                      <p className="font-semibold text-xs text-gray-600">
                        Document Attachments
                      </p>
                    </div>
                    <div className="p-6">
                      <FileUpload
                        onFilesChange={handleFilesFromUpload}
                        disabled={isViewMode}
                        existingFiles={attachedFiles}
                        case="nc"
                      />
                    </div>
                  </div>
                )}

                {/* Investigate Section */}
                {thisform === "investigate" && formData?.casestatus !== "" && (
                  <div
                    className={`rounded-lg bg-white mt-6 transition-all duration-300 ${
                      isAnimating
                        ? "opacity-0 translate-y-10"
                        : "opacity-100 translate-y-0"
                    }`}
                  >
                    <div className="mb-3 border-b border-gray-400 pb-4">
                      <label className="flex text-sm p-1 font-bold text-gray-800">
                        Part 2: NC Investigation - Root Cause Analysis and
                        Corrective Actions
                      </label>
                      <label className="flex text-sm p-1 font-bold text-gray-800">
                        ส่วนที่ 2: การสอบสวน NC -
                        การวิเคราะห์สาเหตุหลักและการดำเนินการแก้ไข
                      </label>
                    </div>

                    {/* Root Cause Analysis */}
                    <div className="flex flex-col p-2 bg-gray-200 font-bold text-gray-800 mb-3 text-sm">
                      <h3>การวิเคราะห์สาเหตุของปัญหา</h3>
                      <p className="font-semibold text-xs text-gray-600">
                        Root Cause Analysis
                      </p>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 gap-6">
                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            การวิเคราะห์สาเหตุของปัญหา:{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            name="root_cause_analysis"
                            value={formInvestigate.root_cause_analysis || ""}
                            onChange={(e) => {
                              handleInvestigateInputChange(e);
                              // Auto resize on change
                              e.target.style.height = "auto";
                              e.target.style.height = `${
                                Math.max(100, e.target.scrollHeight)
                              }px`;
                            }}
                            maxLength={2000}
                            disabled={isViewMode}
                            style={{ minHeight: "100px" }}
                            className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black resize-none overflow-hidden ${
                              isViewMode
                                ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                                : ""
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-400"></div>

                    {/* Corrective Actions Table */}
                    <div className="flex flex-row justify-between p-2 bg-gray-200 font-bold text-gray-800 text-sm">
                      <div className="flex flex-col">
                        <h3>แผนการดำเนินการแก้ไขและป้องกัน</h3>
                        <p className="font-semibold text-xs text-gray-600">
                          Corrective and Preventive Action Plan
                        </p>
                      </div>
                      <div className={`flex p-2 ${isViewMode ? "hidden" : ""}`}>
                        <CirclePlus
                          onClick={addCorrectiveAction}
                          className="ml-2 w-5 h-5 bg-white rounded-full text-gray-600 hover:text-green-700 cursor-pointer"
                        />
                        <CircleMinus
                          onClick={removeCorrectiveAction}
                          className="ml-2 w-5 h-5 bg-white rounded-full text-gray-600 hover:text-red-700 cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="overflow-x-auto">
                        <table className="w-full border border-gray-300 mb-6 text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 w-8">
                                ลำดับ
                              </th>
                              <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">
                                มาตรการแก้ไขและป้องกัน
                              </th>
                              <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 w-40">
                                ผู้รับผิดชอบ
                              </th>
                              <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 w-36">
                                แผนดำเนินการ
                              </th>
                              <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 w-36">
                                ดำเนินการเสร็จ
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {(corrective_actions || []).map((action, index) => (
                              <tr key={action.action_id}>
                                <td className="border border-gray-300 px-3 py-2 text-black text-center">
                                  {index + 1}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-black">
                                  <textarea
                                    value={action.corrective_action || ""}
                                    data-action-id={action.action_id}
                                    onChange={(e) => {
                                      handleCorrectiveActionChange(
                                        action.action_id,
                                        "corrective_action",
                                        e.target.value
                                      );
                                      // Auto resize on change
                                      e.target.style.height = "auto";
                                      e.target.style.height = `${
                                        Math.max(50, e.target.scrollHeight)
                                      }px`;
                                    }}
                                    style={{ minHeight: "50px" }}
                                    className={`w-full text-sm p-1 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black resize-none overflow-hidden ${
                                      isViewMode
                                        ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                                        : ""
                                    }`}
                                    disabled={isViewMode}
                                  />
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-black">
                                  <input
                                    type="text"
                                    value={action.pic_contract}
                                    onChange={(e) =>
                                      handleCorrectiveActionChange(
                                        action.action_id,
                                        "pic_contract",
                                        e.target.value
                                      )
                                    }
                                    className={`w-full text-sm p-1 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${
                                      isViewMode
                                        ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                                        : ""
                                    }`}
                                    disabled={isViewMode}
                                  />
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-black">
                                  <DateTimePicker24h
                                    value={
                                      action.plan_date
                                        ? new Date(action.plan_date)
                                        : undefined
                                    }
                                    onChange={(date) =>
                                      handleCorrectiveActionChange(
                                        action.action_id,
                                        "plan_date",
                                        formatLocalDate(date!)
                                      )
                                    }
                                    disabled={isViewMode}
                                  />
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-black">
                                  <DateTimePicker24h
                                    value={
                                      action.action_completed_date
                                        ? new Date(action.action_completed_date)
                                        : undefined
                                    }
                                    onChange={(date) =>
                                      handleCorrectiveActionChange(
                                        action.action_id,
                                        "action_completed_date",
                                        formatLocalDate(date!)
                                      )
                                    }
                                    disabled={isViewMode}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="border-t border-gray-400"></div>

                    {/* Claim Information */}
                     <div className="flex flex-row justify-between p-2 bg-gray-200 font-bold text-gray-800 text-sm">
                      <div className="flex flex-col">
                        <h3>ข้อมูลการเคลมและค่าใช้จ่าย</h3>
                        <p className="font-semibold text-xs text-gray-600">
                          Claim Information and Costs
                        </p>
                      </div>
                      <div className={`flex flex-col text-right`}>
                       <label className={`text-sm text-gray-800 ${formData?.actual_price == 0 ? "" : "hidden"} `}> 
                         มูลค่าความเสียหายประมาณการ: {""}
                         <span className="font-bold text-blue-600">
                           {formData?.estimated_cost} บาท
                         </span>
                        </label>
                        <label className={`text-sm text-gray-800 ${formData?.actual_price == 0 ? "hidden" : ""} `}>
                         มูลค่าความเสียหายจริง: {""}
                         <span className="font-bold text-blue-600">
                           {formData?.actual_price} บาท
                         </span>
                        </label>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            ประเภทการเคลม:
                          </label>
                          <select
                            name="claim_type"
                            value={formInvestigate.claim_type || ""}
                            onChange={handleInvestigateInputChange}
                            disabled={isViewMode}
                            className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${
                              isViewMode
                                ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                                : ""
                            }`}
                          >
                            <option value=""></option>
                            <option value="insurance">ประกัน</option>
                            <option value="customer">ลูกค้า</option>
                            <option value="driver">คนขับ</option>
                            <option value="company">บริษัท</option>
                            <option value="other">อื่นๆ</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            ประกันรับเคลม (บาท):
                          </label>
                          <input
                            type="number"
                            name="insurance_claim"
                            value={formInvestigate.insurance_claim}
                            onChange={handleInvestigateInputChange}
                            disabled={isViewMode}
                            className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${
                              isViewMode
                                ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                                : ""
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            ขายสินค้าได้ (บาท):
                          </label>
                          <input
                            type="number"
                            name="product_resellable"
                            value={formInvestigate.product_resellable}
                            onChange={handleInvestigateInputChange}
                            disabled={isViewMode}
                            className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${
                              isViewMode
                                ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                                : ""
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            ค่าความเสียหายคงเหลือ (บาท):
                          </label>
                          <input
                            type="number"
                            name="remaining_damage_cost"
                            value={formInvestigate?.remaining_damage_cost}
                            onChange={handleInvestigateInputChange}
                            disabled={isViewMode}
                            className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${
                              isViewMode
                                ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                                : ""
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            คนขับรับผิดชอบค่าใช้จ่าย (บาท):
                          </label>
                          <input
                            type="number"
                            name="driver_cost"
                            value={formInvestigate?.driver_cost}
                            onChange={handleInvestigateInputChange}
                            disabled={isViewMode}
                            className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${
                              isViewMode
                                ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                                : ""
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            บริษัทรับผิดชอบค่าใช้จ่าย (บาท):
                          </label>
                          <input
                            type="number"
                            name="company_cost"
                            value={formInvestigate?.company_cost}
                            onChange={handleInvestigateInputChange}
                            disabled={isViewMode}
                            className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${
                              isViewMode
                                ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                                : ""
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Button Submit */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  {formData?.casestatus !== "" && thisform === "initial" && (
                    <button
                      type="button"
                      onClick={clipboard}
                      className="py-2 px-4 cursor-pointer rounded-lg text-sm inline-block bg-gray-400 hover:bg-gray-500 focus:text-gray-600 focus:bg-gray-200 text-white font-semibold leading-loose transition duration-200"
                    >
                      คัดลอกข้อมูล
                    </button>
                  )}
                  {formData?.casestatus !== "" &&
                    userinfo?.name == formData?.reporter &&
                    thisform === "initial" && (
                      <button
                        type="button"
                        className="py-2 px-4 cursor-pointer rounded-lg text-sm inline-block bg-gray-600 hover:bg-gray-700 focus:text-gray-600 focus:bg-gray-200 text-white font-semibold leading-loose transition duration-200"
                        onClick={handleUpdate}
                      >
                        อัปเดตข้อมูล
                      </button>
                    )}
                  {formData?.casestatus == "" && thisform === "initial" && (
                    <button
                      type="submit"
                      className="py-2 px-4 cursor-pointer rounded-lg text-sm inline-block bg-gray-600 hover:bg-gray-700 focus:text-gray-600 focus:bg-gray-200 text-white font-semibold leading-loose transition duration-200"
                    >
                      บันทึกข้อมูล
                    </button>
                  )}
                  {formData?.casestatus !== "" &&
                    thisform === "investigate" && (
                      <button
                        type="button"
                        className="py-2 px-4 cursor-pointer rounded-lg text-sm inline-block bg-gray-600 hover:bg-gray-700 focus:text-gray-600 focus:bg-gray-200 text-white font-semibold leading-loose transition duration-200"
                        onClick={handleUpdateInvestigate}
                      >
                        บันทึกข้อมูลสอบสวน
                      </button>
                    )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
