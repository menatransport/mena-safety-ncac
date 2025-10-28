"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LordIcon } from "./LordIcon";
import { DateTimePicker24h } from "./ui/datetime-picker";
import { SearchableSelect } from "./ui/searchable-select";
import { FileUpload } from "./FileUpload";
import { caseReport_NC } from "@/lib/caseReport";
import { useDropdownStore } from "@/lib/dropdownlist";
import {
  SquarePen,
  Printer,
  CirclePlus,
  CircleMinus,
  Loader2,
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
  } = useDropdownStore();

  // Form State
  const [formData, setFormData] = useState<Partial<caseReport_NC>>({
    casestatus: "",
    products: [{ product_id: 1, product_name: "", amount: 0, unit: "" }] as [
      { product_id: number; product_name: string; amount: number; unit: string; casestatus: string }
    ],
  });

  // UI State
  const [displayPIC, setDisplayPIC] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isLoadingFormData, setIsLoadingFormData] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<CategoryFiles>({});
  const [userinfo, setUserinfo] = useState<any>(null);

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
        
        if (!parsedUserData?.id || !parsedUserData?.firstname || !parsedUserData?.lastname) {
          console.error("Incomplete userData:", parsedUserData);
          return;
        }

        const newUserinfo = {
          'id': parsedUserData.id,
          'employee_id': parsedUserData.employee_id || '',
          'name': `${parsedUserData.firstname} ${parsedUserData.lastname}`.trim(),
          'department': parsedUserData.department || '',
          'site': parsedUserData.site || '',
          'position': parsedUserData.position || '',
          'position_level': parsedUserData.position_level || '',
          'position_level_id': parsedUserData.position_level_id || ''
        };
        
        console.log("Setting userinfo:", newUserinfo);
        setUserinfo(newUserinfo);

        await fetchDropdownData();
        getvaluesparams(newUserinfo.name);
      } catch (error) {
        console.error("Error parsing userData from localStorage:", error);
        setUserinfo(null);
      }
    };
    
    loadUserInfo();
  }, []);

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
         console.log("searchParams Data:", data[0]);
          if (res.ok) {

            if(data.reporter == name ) {
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

    // ========== Data Mapping Functions ==========
    const mapTextDataToIds = async (data: any) => {
      const mappedData: any = {};
      const store = useDropdownStore.getState();
      if (data.site && store.sites) {
        const site = store.sites.find((val: any) => val.site_name_th === data.site);
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
      console.log("data:", data);
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
        console.log('GET รูปภาพที่ได้:', data.files);

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
    console.log("Files received from FileUpload component:", files);
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
  const formatDT = (dateTimeString?: string) => {
    if (!dateTimeString) return "";
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return dateTimeString; // คืนค่าเดิมถ้าไม่ใช่วันที่ที่ถูกต้อง

    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Intl.DateTimeFormat("en-GB", options).format(date);
  };

  const clipboard = async () => {
    try {
      // หาข้อมูลจาก dropdown stores
      const selectedSite = sites?.find(site => site.site_id === formData.site_id);
      const selectedDepartment = departments?.find(dept => dept.department_id === formData.department_id);
      const selectedClient = clients?.find(client => client.client_id === formData.client_id);
      const selectedOrigin = locations?.find(loc => loc.location_id === formData.origin_id);
      const selectedDriverRole = driver_roles?.find(role => role.driver_role_id === formData.driver_role_id);
      const selectedDriver = masterdrivers?.find(driver => driver.driver_id === formData.driver_id);
      const selectedVehicleHead = vehicles?.find(vehicle => vehicle.vehicle_id === formData.vehicle_id_head);
      const selectedVehicleTail = vehicles?.find(vehicle => vehicle.vehicle_id === formData.vehicle_id_tail);
      const selectedIncidentCause = mastercauses?.find(cause => cause.cause_id === formData.incident_cause_id);

      const content = `🚨 รายงาน NC ระดับ ${priorityIcon(formData.priority)} 
=====================

📄 เลขที่เอกสาร: ${formData.document_no || 'ยังไม่ระบุ'}
👤 ผู้รายงาน: ${userinfo?.name || 'ไม่ระบุ'}
🏢 ศูนย์ปฏิบัติการ: ${selectedSite?.site_name_th || 'ไม่ระบุ'}
🏛️ ฝ่าย: ${selectedDepartment?.department_name_th || 'ไม่ระบุ'}
⏰ วันที่แจ้ง: ${formatDT(formData.record_date) || 'ไม่ระบุ'}
🔥 วันที่เกิดเหตุ: ${formatDT(formData.incident_date) || 'ไม่ระบุ'}

📍 ข้อมูลการขนส่ง
=====================
ลูกค้า: ${selectedClient?.client_name || 'ไม่ระบุ'}
ต้นทาง: ${selectedOrigin?.location_name || 'ไม่ระบุ'}
ปลายทาง: ${formData.destination || 'ไม่ระบุ'}
สถานที่เกิดเหตุ: ${formData.case_location || 'ไม่ระบุ'}

🚚 ข้อมูลรถและคนขับ
=====================
${selectedDriverRole?.role_name || 'ไม่ระบุ'}: ${selectedDriver ? `${selectedDriver.first_name} ${selectedDriver.last_name}` : 'ไม่ระบุ'}
ทะเบียนรถหัว: ${selectedVehicleHead?.vehicle_number_plate || 'ไม่ระบุ'}
ทะเบียนรถหาง: ${selectedVehicleTail?.vehicle_number_plate || 'ไม่ระบุ'}

📦 ข้อมูลสินค้า
=====================
${formData.products && formData.products.length > 0 
  ? formData.products.map((product, index) => 
      `${index + 1}. ${product.product_name || 'ไม่ระบุ'} - ${product.amount || 0} ${product.unit || ''}`
    ).join('\n')
  : 'ไม่มีข้อมูลสินค้า'
}

💵มูลค่าเสียหาย (ประเมิน): ${formData.estimated_cost ? `${Number(formData.estimated_cost).toLocaleString()} บาท` : ''}
💵มูลค่าเสียหาย (จริง): ${formData.actual_price ? `${Number(formData.actual_price).toLocaleString()} บาท` : ''}

⚠️ สาเหตุและรายละเอียด
=====================
สาเหตุ: ${selectedIncidentCause?.cause_name || 'ไม่ระบุ'}
รายละเอียด: ${formData.case_details || 'ไม่ระบุ'}

=====================
`;

      await navigator.clipboard.writeText(content);
      Swal.fire({
        icon: "success",
        title: "คัดลอกข้อมูลสำเร็จ",
        text: "ข้อมูลได้ถูกคัดลอกไปยังคลิปบอร์ดแล้ว",
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถคัดลอกข้อมูลได้"
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

   const validateRequiredFields = () => {
    const requiredFields = [
      { field: 'site_id', label: 'ศูนย์ปฏิบัติการ', elementName: 'site_id' },
      { field: 'department_id', label: 'ฝ่าย', elementName: 'department_id' },
      { field: 'incident_date', label: 'วันที่และเวลา เกิดเหตุ', elementName: 'incident_date' },
      { field: 'incident_cause_id', label: 'สาเหตุการเกิดเหตุ', elementName: 'incident_cause_id' },
      { field: 'case_details', label: 'รายละเอียดเหตุการณ์', elementName: 'case_details' },
      { field: 'client_id', label: 'ลูกค้า', elementName: 'client_id' },
      { field: 'origin_id', label: 'ต้นทาง/แพล้น', elementName: 'origin_id' },
      { field: 'destination', label: 'ปลายทาง', elementName: 'destination' },
      { field: 'case_location', label: 'สถานที่เกิดเหตุ', elementName: 'case_location' },
      // { field: 'province_id', label: 'จังหวัด', elementName: 'province_id' },
      // { field: 'district_id', label: 'อำเภอ', elementName: 'district_id' },
      // { field: 'sub_district_id', label: 'ตำบล', elementName: 'sub_district_id' },
      { field: 'vehicle_id_head', label: 'ทะเบียนรถหัว', elementName: 'vehicle_id_head' },
      { field: 'vehicle_id_tail', label: 'ทะเบียนรถหาง', elementName: 'vehicle_id_tail' },
      { field: 'driver_role_id', label: 'ประเภทคนขับ', elementName: 'driver_role_id' },
      { field: 'driver_id', label: 'ชื่อ-สกุลคนขับ', elementName: 'driver_id' }
    
    ];

    const missingFields: string[] = [];
    let firstMissingField: string | null = null;

    requiredFields.forEach(({ field, label, elementName }) => {
      const value = formData[field as keyof typeof formData];
      if (!value || value === '' || value === 0 || value === undefined || value === null) {
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
       const missingFieldsList = validation.missingFields.join('\n• ');
       Swal.fire({
         icon: 'warning',
         title: 'กรุณากรอกข้อมูลที่มีเครื่องหมาย " * " ให้ครบถ้วน',
         // html: `<div style="text-align: left;">กรุณากรอกข้อมูลในฟิลด์ดังต่อไปนี้:<br><br>• ${missingFieldsList.replace(/\n/g, '<br>')}</div>`,
         confirmButtonText: 'ตกลง',
         confirmButtonColor: '#d33'
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

      console.log("userData from localStorage:", userinfo.id);
      console.log("Local DateTime:", localDateTime);

      const submitData = {
        ...formData,
        record_date: localDateTime,
        reporter_id: userinfo.id,
      };

      console.log("NC Form data to submit:", submitData);

      const res = await fetch("/api/document/nc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      const responseData = await res.json();
      console.log("API Response:", responseData);

      if (res.ok) {
        console.log("Success response data:", responseData);
        Swal.fire({
          icon: "success",
          title: "บันทึกข้อมูลเรียบร้อย",
          draggable: true,
          confirmButtonText: "ตกลง",
          allowOutsideClick: false,
        });
        setFormData((prev) => ({
          ...prev,
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
       const missingFieldsList = validation.missingFields.join('\n• ');
       console.log("Missing Fields:", missingFieldsList);
       Swal.fire({
         icon: 'warning',
         title: 'กรุณากรอกข้อมูลที่มีเครื่องหมาย " * " ให้ครบถ้วน',
         // html: `<div style="text-align: left;">กรุณากรอกข้อมูลในฟิลด์ดังต่อไปนี้:<br><br>• ${missingFieldsList.replace(/\n/g, '<br>')}</div>`,
         confirmButtonText: 'ตกลง',
         confirmButtonColor: '#d33'
       });
       return;
     }
     delete formData.priority; 
     console.log("NC Form Update <><><><> :", formData);
 
     const res = await fetch("/api/document/nc", {
         method: "PUT",
         headers: {
           "Content-Type": "application/json",
         },
         body: JSON.stringify(formData),
       });
     const responseData = await res.json();
     console.log("API Response on Update:", responseData);
     if(res.ok){
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
   }


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
                {/* Section Header */}
                <div className="rounded-lg bg-white">
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
                          ศูนย์ปฏิบัติการ: <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                          options={(sites || []).map((site: any) => ({
                            value: site.site_id,
                            label: site.site_name_th,
                          }))}
                          value={formData?.site_id || ""}
                          onChange={(value) => handleSiteChange(Number(value))}
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
                            formData?.record_date
                              ? (() => {
                                  const date = new Date(formData.record_date);
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
                              : new Date().toLocaleString("en-UK", {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                })
                          }
                          readOnly
                          className="w-full text-sm p-2 bg-gray-100 border border-gray-300 rounded focus:outline-none text-black cursor-not-allowed disabled:text-blue-600 disabled:font-bold"
                    
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          วันที่และเวลา เกิดเหตุ: <span className="text-red-500">*</span>
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
                          รายละเอียด NC: <span className="text-red-500">*</span>
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
                          ต้นทาง/แพล้น: <span className="text-red-500">*</span>
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
                          ปลายทาง: <span className="text-red-500">*</span>
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
                          สถานที่เกิดเหตุ: <span className="text-red-500">*</span>
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
                          ทะเบียนรถหาง: <span className="text-red-500">*</span>
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
                      <h3>รายการสินค้าเสียหาย</h3>
                      <p className="font-semibold text-xs text-gray-600">
                        Damage Cost List
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
                                สินค้า <span className="text-red-500">*</span>
                              </th>
                              <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">
                                จำนวน <span className="text-red-500">*</span>
                              </th>
                              <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">
                                หน่วย <span className="text-red-500">*</span>
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
                              ประมาณการมูลค่าเสียหาย:
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
                    />
                  </div>
                </div>

                {/* Button Submit */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  {formData?.casestatus !== "" && (
                    <button
                      type="button"
                      onClick={clipboard}
                      className="py-2 px-4 cursor-pointer rounded-lg text-sm inline-block bg-gray-400 hover:bg-gray-500 focus:text-gray-600 focus:bg-gray-200 text-white font-semibold leading-loose transition duration-200"
                    >
                      คัดลอกข้อมูล
                    </button>
                  )}
                  {formData?.casestatus !== "" && userinfo.name == formData?.reporter && (
                    <button
                      type="button"
                      className="py-2 px-4 cursor-pointer rounded-lg text-sm inline-block bg-gray-600 hover:bg-gray-700 focus:text-gray-600 focus:bg-gray-200 text-white font-semibold leading-loose transition duration-200"
                      onClick={handleUpdate}
                    >
                      อัปเดตข้อมูล
                    </button>
                  )}
                  {formData?.casestatus == "" && (
                    <button
                      type="submit"
                      className="py-2 px-4 cursor-pointer rounded-lg text-sm inline-block bg-gray-600 hover:bg-gray-700 focus:text-gray-600 focus:bg-gray-200 text-white font-semibold leading-loose transition duration-200"
                    >
                      บันทึกข้อมูล
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
