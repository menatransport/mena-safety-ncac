"use client";
import { useState, useEffect, use } from "react";
import { DateTimePicker24h } from "./ui/datetime-picker";
import { SearchableSelect } from "./ui/searchable-select";
import { useSearchParams } from "next/navigation";
import { useDropdownStore } from "@/lib/dropdownlist";
import { caseReport_AC } from "@/lib/caseReport";
import { FileUpload } from "./FileUpload";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import { useClipboard_ac } from "@/lib/clipboard";
import { LoaderPage } from "./LoaderPage";
import { error } from "console";
import { set } from "date-fns";

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
  });




  const [displayPIC, setDisplayPIC] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isLoadingFormData, setIsLoadingFormData] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<CategoryFiles>({});
  const [userinfo, setUserinfo] = useState<any>(null);
  const [docValue, setDocValue] = useState<any[]>([]);

  // Filtered Data for Site Dependencies
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

        // console.log("Setting userinfo:", newUserinfo);
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
      // เปลี่ยน title ของหน้าเว็บเมื่อมี doc parameter
      document.title = `${docId}`;
      setIsLoadingFormData(true);

      try {
        const res = await fetch(
          `/api/document/ac?case_id=${encodeURIComponent(docId)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const data = await res.json();
        console.log("Fetched AC record data:", data);
        if (res.ok) {
          if (data.reporter_name == name) {
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
        console.error("Error fetching AC record:", error);
      } finally {
        setIsLoadingFormData(false);
      }
    } else {
      // ถ้าไม่มี doc parameter ให้ reset title กลับเป็นปกติ
      document.title = "MENA NCAC - AC Form";
    }
  };

  // ========== Data Mapping Functions ==========
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
              const category = parts.slice(1, -1).join("_");
              // console.log('Category:', category);

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
      } else {
        console.error("Failed to load attachments:", res.statusText);
      }
    } catch (error) {
      console.error("Error loading attachments:", error);
    }
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
    }
  }, [masterdrivers, locations, vehicles, clients, formData.site_id]);
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

  function toThaiISO(date: Date) {
    const timezoneOffset = -7 * 60 * 60 * 1000; // -7 ชั่วโมง
    const utcDate = new Date(date.getTime() - timezoneOffset);
    return utcDate
  }

  function toThaiISO_Reverse(date: Date) {
    const timezoneOffset = 7 * 60 * 60 * 1000; // +7 ชั่วโมง
    const utcDate = new Date(date.getTime() - timezoneOffset);
    return utcDate
  }

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
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถคัดลอกข้อมูลได้",
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
      console.log("obj : ", obj);
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
        obj = { location_name: itemName, site_id: formData.site_id };
        break;
      case "masterdrivers":
        let diffname = itemName.split(" ")
        obj = { first_name: diffname[0], last_name: diffname[1], site_id: formData.site_id, driver_role_id: formData.driver_role_id };
        break;
      case "clients":
        obj = { client_name: itemName, site_id: formData.site_id };
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

    return { missingFields, firstMissingField };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateRequiredFields();
    console.log('validation : ', validation)
    if (validation.missingFields.length > 0) {
      const missingFieldsList = validation.missingFields.join("\n• ");
      Swal.fire({
        icon: "warning",
        title: 'กรุณากรอกข้อมูลที่มีเครื่องหมาย " * " ให้ครบถ้วน',
        // html: `<div style="text-align: left;">กรุณากรอกข้อมูลในฟิลด์ดังต่อไปนี้:<br><br>• ${missingFieldsList.replace(/\n/g, '<br>')}</div>`,
        confirmButtonText: "ตกลง",
        confirmButtonColor: "#d33",
      });
      return;
    }

    // console.log("AC Form submitted:", formData);
    try {
      if (!userinfo?.id) {
        alert("ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
        setUserinfo(null);
        return;
      }

      const submitData = {
        ...formData,
        incident_datetime: toThaiISO(new Date(formData.incident_datetime || "")),
        fatalities: Number(formData.fatalities) || 0,
        injured_hospitalized: Number(formData.injured_hospitalized) || 0,
        injured_not_hospitalized: Number(formData.injured_not_hospitalized) || 0,
        estimated_goods_damage_value: Number(formData.estimated_goods_damage_value) || 0,
        estimated_vehicle_damage_value: Number(formData.estimated_vehicle_damage_value) || 0,
        actual_goods_damage_value: Number(formData.actual_goods_damage_value) || 0,
        actual_vehicle_damage_value: Number(formData.actual_vehicle_damage_value) || 0,
        record_datetime: toThaiISO(new Date()),
        reporter_id: userinfo.id,
        docs: [docValue as any]
      };

      console.log("AC Form data to submit:", submitData);

      const res = await fetch("/api/document/ac", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      const responseData = await res.json();
      console.log("API Response:", responseData);

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
          responseData.document_no_ac &&
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
      alert(
        `เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleUpdate = async () => {
    const validation = validateRequiredFields();
    if (validation.missingFields.length > 0) {
      // const missingFieldsList = validation.missingFields.join("\n• ");
      Swal.fire({
        icon: "warning",
        title: 'กรุณากรอกข้อมูลที่มีเครื่องหมาย " * " ให้ครบถ้วน',
        // html: `<div style="text-align: left;">กรุณากรอกข้อมูลในฟิลด์ดังต่อไปนี้:<br><br>• ${missingFieldsList.replace(/\n/g, '<br>')}</div>`,
        confirmButtonText: "ตกลง",
        confirmButtonColor: "#d33",
      });
      return;
    }

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

    const data = { ...filteredFormData,
      incident_datetime: toThaiISO(new Date(filteredFormData.incident_datetime || "")),
      fatalities: Number(filteredFormData.fatalities) || 0,
      injured_hospitalized: Number(filteredFormData.injured_hospitalized) || 0,
      injured_not_hospitalized: Number(filteredFormData.injured_not_hospitalized) || 0,
      estimated_goods_damage_value: Number(filteredFormData.estimated_goods_damage_value) || 0,
      estimated_vehicle_damage_value: Number(filteredFormData.estimated_vehicle_damage_value) || 0,
      actual_goods_damage_value: Number(filteredFormData.actual_goods_damage_value) || 0,
      actual_vehicle_damage_value: Number(filteredFormData.actual_vehicle_damage_value) || 0,
      docs: [docValue as any] 
    };
    console.log("AC Form data to update:", data);
    const res = await fetch("/api/document/ac", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const responseData = await res.json();
    console.log("API Response on Update:", responseData);
    if (res.ok) {
      Swal.fire({
        icon: "success",
        title: "อัปเดตข้อมูลเรียบร้อย",
        draggable: true,
        confirmButtonText: "ตกลง",
        allowOutsideClick: false,
      });
    } else {
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
    if (responseData.document_no_ac && Object.keys(attachedFiles).length > 0) {
      await attatchments_post(responseData.document_no_ac);
    }
    // }
  };

  const attatchments_post = async (document_no_ac: string) => {
    if (!document_no_ac) {
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

      if (res.ok) {
        const result = await res.json();
        if (attachedFiles['investigate_report'] && attachedFiles['investigate_report'].length > 0) {
          const statusRes = await fetch("/api/document/ac", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              document_no_ac: document_no_ac,
              casestatus: 'Completed Investigate',
            }),
          });
          if (statusRes.ok) {
            setFormData((prev) => ({
              ...prev,
              casestatus: 'Completed Investigate',
            }));
          }
        } 
      } else {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาดในการอัปโหลดไฟล์แนบ",
        });
      }
    } catch (error) {
      console.error("Error uploading attachments:", error);
      alert("เกิดข้อผิดพลาดในการอัปโหลดไฟล์แนบ");
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
      return data?.filter((dept: any) => dept.department_name_en === "Compliance") || []
    default:
      return data || []
  }
};

  return (
    <>
      <div className="min-h-screen bg-[#d1ffe1]">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center">
            <div
              id="printable-area"
              className="md:w-4xl sm:w-full m-4 space-y-6 bg-white p-8 rounded-xl shadow-sm border border-gray-500"
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
                        options={filteredForm("department",departments).map((dept: any) => ({
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
                        วันที่และเวลา แจ้งเหตุ:
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
                        วันที่และเวลา เกิดเหตุ:{" "}
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
                        maxLength={1000}
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
                        onAdd={() => handleAddItem("masterdrivers")}
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      รายละเอียดการบาดเจ็บ:
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
                <div className="flex flex-col p-2 bg-gray-200 font-bold text-gray-800 mb-3 text-sm md:col-span-3">
                  <h3>แนบเอกสาร</h3>
                  <p className="font-semibold text-xs text-gray-600">
                    Document Attachments
                  </p>
                </div>
                <div className="p-6 md:col-span-3">
                  <FileUpload
                    onFilesChange={handleFilesFromUpload}
                    existingFiles={attachedFiles}
                    onChangedocs={(docs) => setDocValue(docs as any)}
                    docs={formData.docs?.[0]}
                    case="ac"
                  />
                </div>


                {/* Button Submit */}
                <div className="flex justify-start p-2">
                  <p className="text-sm text-gray-600">Form created by: {formData?.reporter_name || "N/A"}</p>
                </div>
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
                  {formData?.casestatus !== "" && formData?.casestatus !== "Voided" && (
                    <button
                      type="button"
                      onClick={handleUpdate}
                      className="py-2 px-4 cursor-pointer rounded-lg text-sm inline-block bg-gray-600 hover:bg-gray-700 focus:text-gray-600 focus:bg-gray-200 text-white font-semibold leading-loose transition duration-200"
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
