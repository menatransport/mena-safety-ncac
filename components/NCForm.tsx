"use client";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { DateTimePicker24h } from "./ui/datetime-picker";
import { SearchableSelect } from "./ui/searchable-select";
import { FileUpload } from "./FileUpload";
import { caseReport_NC, investigate_NC } from "@/lib/caseReport";
import { useDropdownStore } from "@/lib/dropdownlist";
import { CirclePlus, CircleMinus, Printer } from "lucide-react";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import { useClipboard_nc } from "@/lib/clipboard";
import { LoaderPage } from "./LoaderPage";
import { printDocument_nc } from "@/lib/printDocument";
import { sendErrorLog } from "@/lib/logError";
import { documentRole } from "@/lib/documentRole";

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

export const NCFormComponent = () => {
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
    fetchSingleDropdown,
    getData,
  } = useDropdownStore();



  const [formInvestigate, setFormInvestigate] = useState<
    Partial<investigate_NC>
  >({});

  const [isViewMode, setIsViewMode] = useState(false);
  const [isLoadingFormData, setIsLoadingFormData] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<CategoryFiles>({});
  const [userinfo, setUserinfo] = useState<any>(null);
  const [thisform, setThisform] = useState<string>("initial"); // initial or investigate
  const [isAnimating, setIsAnimating] = useState(false);
  const [docValue, setDocValue] = useState<any[]>([]);
  const [formData, setFormData] = useState<Partial<caseReport_NC>>({
    reporter_name: userinfo?.name || "",
    casestatus: "",
    record_date: new Date().toISOString(),
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


  const [filteredData, setFilteredData] = useState<{
    masterdrivers?: any[];
    locations?: any[];
    clients?: any[];
    vehicles?: any[];
    mastercauses?: any[];
  }>({
    masterdrivers: [],
    locations: [],
    clients: [],
    vehicles: [],
    mastercauses: [],
  });

  const searchParams = useSearchParams();

  useEffect(() => {
    const initializeForm = async () => {
      const userData = localStorage.getItem("userData");
      if (!userData) {
        alert("ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
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
            `/api/document/nc?document_no=${encodeURIComponent(docId)}`,
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
            ]);

            const { res, data } = documentResult;

            if (res.ok) {
              // console.log('Fetched NC record data:', data);
              // console.log('Fetched newUserinfo:', newUserinfo);
              setIsViewMode(documentRole(data.department_name, data.reporter_name, newUserinfo.name, newUserinfo.department, data.site_name));
              setFormData({
                ...data,
                products: data.products.map((item: any, index: number) => ({
                  ...item,
                  product_id: index + 1,
                }))
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
            console.error("Error fetching record:", error);
          } finally {
            setIsLoadingFormData(false);
          }
        } else {
          document.title = "MENA NCAC - NC Form";
          await dropdownPromise;
        }
      } catch (error) {
        console.error("Error parsing userData from localStorage:", error);
        setUserinfo(null);
      }
    };

    initializeForm();
  }, []);

  const processAttachmentData = (data: any) => {
    const categorizedFiles: CategoryFiles = {};

    if (data.files && Array.isArray(data.files)) {
      data.files.forEach((file: any) => {
        const fileName = file.fileName || "";
        const parts = fileName.split("_");

        if (parts.length >= 3) {
          const category = parts.slice(1, -1).join("_");

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

  const thisformtype = async (type: string) => {
    if (type !== thisform) {
      setIsAnimating(true);
      setTimeout(async () => {
        if (type === "investigate") {

          setThisform("investigate");

          try {
            const res = await fetch(
              `/api/investigate/nc?document_no=${formData.document_no}`,
              {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                },
              }
            );

            if (res.ok) {
              const data = await res.json();
              // console.log("Fetched investigate data:", data);
              setFormInvestigate(data);
              setCorrectiveActions(
                data.corrective_actions.map((action: any, index: number) => ({
                  ...action,
                  action_id: index + 1,
                })) as any
              );
            } else {
              console.error(
                "Failed to fetch investigate data:",
                res.statusText
              );
            }
          } catch (error) {
            console.error("Error fetching investigate data:", error);
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

    if (data.incident_cause && store.mastercauses) {
      const cause = store.mastercauses.find(
        (val: any) => val.cause_name === data.incident_cause
      );
      if (cause) mappedData.incident_cause_id = cause.cause_id;
    }
    setFormData((prev) => ({ ...prev, ...mappedData }));
    // console.log("Mapped form data with IDs:", { ...data, ...mappedData });
  };

  // ========== File Handling Functions ==========
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
        locations?.filter((location: any) => location.site_id === num) || [];
      const filtermastercauses =
        mastercauses?.filter((cause: any) => cause.site_id === num) || [];
      const filteredClients =
        clients?.filter((client: any) => client.site_id === num) || [];
      setFilteredData({
        masterdrivers: filteredDrivers,
        locations: filteredLocations,
        clients: filteredClients,
        mastercauses: filtermastercauses,
        // vehicles: filteredVehicles,
      });

    } else {
      setFilteredData({
        masterdrivers: masterdrivers || [],
        locations: locations || [],
        clients: clients || [],
        mastercauses: mastercauses || [],
        // vehicles: vehicles || [],
      });
    }

    setFormData((prev) => ({
      ...prev,
      driver_id: "",
      origin_id: undefined,
    }));
  };

  useEffect(() => {
    if (!formData.site_id) {
      setFilteredData({
        masterdrivers: masterdrivers || [],
        locations: locations || [],
        clients: clients || [],
        vehicles: vehicles || [],
        mastercauses: mastercauses || [],
      });
    } else {
      const num = (formData.site_id === 3 || formData.site_id === 4 || formData.site_id === 6) ? 3 : 2;
      setFilteredData((prev) => ({
        ...prev,
        masterdrivers: masterdrivers?.filter((d: any) => d.site_id === num) || [],
        locations: locations?.filter((l: any) => l.site_id === num) || [],
        clients: clients?.filter((c: any) => c.site_id === num) || [],
        vehicles: vehicles || [],
        mastercauses: mastercauses?.filter((c: any) => c.site_id === num) || [],
      }));
    }
  }, [masterdrivers, locations, clients, vehicles, mastercauses, formData.site_id]);


  useEffect(() => {
    const rootCauseTextarea = document.querySelector(
      'textarea[name="root_cause_analysis"]'
    ) as HTMLTextAreaElement;
    if (rootCauseTextarea) {
      rootCauseTextarea.style.height = "auto";
      rootCauseTextarea.style.height = `${Math.max(
        100,
        rootCauseTextarea.scrollHeight
      )}px`;
    }

    const detailsTextarea = document.querySelector(
      'textarea[name="case_details"]'
    ) as HTMLTextAreaElement;
    if (detailsTextarea) {
      detailsTextarea.style.height = "auto";
      detailsTextarea.style.height = `${Math.max(
        100,
        detailsTextarea.scrollHeight
      )}px`;
    }

    const correctiveTextareas = document.querySelectorAll(
      "textarea[data-action-id]"
    ) as NodeListOf<HTMLTextAreaElement>;
    correctiveTextareas.forEach((textarea) => {
      if (textarea) {
        textarea.style.height = "auto";
        textarea.style.height = `${Math.max(
          100,
          textarea.scrollHeight
        )}px`;
      }
    });
  }, [formInvestigate.root_cause_analysis, corrective_actions, formData.case_details, thisform]);

  useEffect(() => {
    if (isViewMode && formData.site_id && masterdrivers && locations && clients && mastercauses) {
      let filteredDrivers = masterdrivers.filter(
        (driver: any) => driver.site_id === formData.site_id
      );
      const filteredLocations = locations.filter(
        (location: any) =>
          location.location_id === formData.origin_id ||
          location.site_id === formData.site_id
      );
      const filtermastercauses = mastercauses.filter(
        (cause: any) => cause.site_id === formData.site_id || cause.cause_id === formData.incident_cause_id
      );

      const filteredClients = clients.filter(
        (client: any) => client.client_id === formData.client_id || client.site_id === formData.site_id
      );

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
        mastercauses: filtermastercauses,
        masterdrivers: filteredDrivers,
        locations: filteredLocations,
        clients: filteredClients,
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
    clients,
    vehicles,
    mastercauses
  ]);


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
      sendErrorLog("NCForm/clipboard", error instanceof Error ? error : String(error));
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถคัดลอกข้อมูลได้",
      });
    }
  };

  // ========== Print Document Function ==========
  const handlePrintDocument = () => {
    if (!formData.document_no) {
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
      const selectedIncidentCause = mastercauses?.find(
        (cause) => cause.cause_id === formData.incident_cause_id
      );

      // สร้างข้อมูลที่มีชื่อแทน ID สำหรับการพิมพ์
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
        incident_cause: selectedIncidentCause?.cause_name || formData.incident_cause
      };

      // เรียกใช้ฟังก์ชันพิมพ์
      printDocument_nc({
        formData: printFormData,
        investigateData: thisform === "investigate" ? formInvestigate : undefined,
        userinfo,
        attachedFiles
      });

    } catch (error) {
      console.error("Error printing document:", error);
      sendErrorLog("NCForm/handlePrintDocument", error instanceof Error ? error : String(error));
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
      case "mastercauses":
        obj = { cause_name: itemName, site_id: formData.site_id === 6 ? 3 : formData.site_id, departments: null };
        break;
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
      case "mastercauses":
        setFilteredData((prev) => ({
          ...prev,
          mastercauses: [...(prev.mastercauses || []), data],
        }));
        break;
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
        break;
    }
  }

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

  function toThaiISO(date: Date) {
    const timezoneOffset = -7 * 60 * 60 * 1000; // -7 ชั่วโมง
    const utcDate = new Date(date.getTime() - timezoneOffset);
    return utcDate
  }


  const handleCorrectiveActionChange = (
    id: number,
    field: string,
    value: string
  ) => {
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
      { field: 'origin_id', label: 'ต้นทาง/แพล้น', elementName: 'origin_id' },
      { field: 'destination', label: 'ปลายทาง', elementName: 'destination' },
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

    // ตรวจสอบว่ามีการแนบรูปเหตุการณ์อย่างน้อย 1 รูป
    if (!attachedFiles["event_img"] || attachedFiles["event_img"].length === 0) {
      missingFields.push("รูปเหตุการณ์ (อย่างน้อย 1 รูป)");
      if (!firstMissingField) {
        firstMissingField = "event_img";
      }
    }

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
        title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
        html: `<div style="text-align: left;">กรุณากรอกข้อมูลในฟิลด์ดังต่อไปนี้:<br><br>• ${missingFieldsList.replace(/\n/g, '<br>')}</div>`,
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
      const submitData = {
        ...formData,
        incident_date: toThaiISO(new Date(formData.incident_date || "")),
        record_date: toThaiISO(new Date()),
        reporter_id: userinfo.id,
        docs: [docValue as any]
      };
      // console.log("Submitting NC Form Data:", submitData);
      const res = await fetch("/api/document/nc", {
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
          title: "บันทึกข้อมูลสำเร็จ",
          draggable: true,
          confirmButtonText: "ตกลง",
          allowOutsideClick: false,
        });

        setFormData((prev) => ({
          ...prev,
          document_no: responseData.document_no,
          reporter_name: userinfo.name,
          priority: responseData.priority,
          casestatus: responseData.casestatus,
        }));

        if (responseData.document_no && Object.keys(attachedFiles).length > 0) {
          await attatchments_post(responseData.document_no);
        }
      } else {
        throw new Error(
          responseData.message || `HTTP ${res.status}: ${res.statusText}`
        );
      }
    } catch (error) {
      console.error("Error submitting NC Form:", error);
      sendErrorLog("NCForm/handleSubmit", error instanceof Error ? error : String(error));
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
        text: error instanceof Error ? error.message : "Unknown error",
        confirmButtonText: "ตกลง"
      });
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

    const {
      priority,
      reporter_name,
      record_date,
      site_name,
      driver_name,
      client_name,
      department_name,
      driver_role_name,
      origin_name,
      vehicle_head_plate,
      vehicle_tail_plate,
      ...filteredFormData
    } = formData;

    const data = {
      ...filteredFormData,
      incident_date: toThaiISO(new Date(filteredFormData.incident_date || "")),
      docs: [docValue as any]
    };

    //  console.log("NC Form Update <><><><> :", formData);

    const res = await fetch("/api/document/nc", {
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
    }
    setFormData((prev) => ({
      ...prev,
      priority: responseData.priority,
    }));

    if (responseData.document_no && Object.keys(attachedFiles).length > 0) {
      await attatchments_post(responseData.document_no);
    }
    // }
  };

  const handleSubmitInvestigate = async () => {
    if (!formData.document_no)
      return alert("ไม่พบเลขที่เอกสารนี้ โปรดลองใหม่อีกครั้ง");
    const data = {
      ...formInvestigate,
      corrective_actions: corrective_actions,
    };
    // console.log("Submitting Investigate Data:", data);
    const res = await fetch("/api/investigate/nc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        document_no: formData.document_no,
      },
      body: JSON.stringify(data),
    });
    const responseData = await res.json();
    if (res.ok) {
      Swal.fire({
        icon: "success",
        title: "บันทึกข้อมูลสำเร็จ",
        draggable: true,
        confirmButtonText: "ตกลง",
        allowOutsideClick: false,
      });
      setFormData((prev) => ({
        ...prev,
        casestatus: "Completed Investigate",
      }));
    } else {
      sendErrorLog("NCForm/handleSubmitInvestigate", `Investigate update failed: ${responseData.message || 'Unknown error'} แนบ : ${JSON.stringify(data)}`);
      Swal.fire({
        icon: "error",
        title: "การบันทึกไม่สำเร็จลองใหม่อีกครั้ง",
        draggable: true,
        confirmButtonText: "ตกลง",
        allowOutsideClick: false,
      });
    }
  };

  const handleUpdateInvestigate = async () => {
    if (!formData.document_no)
      return alert("ไม่พบเลขที่เอกสารนี้ โปรดลองใหม่อีกครั้ง");
    const data = {
      ...formInvestigate,
      corrective_actions: corrective_actions,
    };
    // console.log("Updating Investigate Data:", data);
    const res = await fetch("/api/investigate/nc", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        document_no: formData.document_no,
      },
      body: JSON.stringify(data),
    });
    const responseData = await res.json();
    if (res.ok) {
      Swal.fire({
        icon: "success",
        title: "อัปเดตข้อมูลสำเร็จ",
        draggable: true,
        confirmButtonText: "ตกลง",
        allowOutsideClick: false,
      });
    }
    else {
      sendErrorLog("NCForm/handleUpdateInvestigate", `Investigate update failed: ${responseData.message || 'Unknown error'}`);
      Swal.fire({
        icon: "error",
        title: "การอัปเดตไม่สำเร็จลองใหม่อีกครั้ง",
        draggable: true,
        confirmButtonText: "ตกลง",
        allowOutsideClick: false,
      });
    }
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
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาดในการอัปโหลดไฟล์แนบ",
        });
        sendErrorLog("NCForm/attatchments_post", `เกิดข้อผิดพลาดในการอัปโหลดไฟล์แนบ : ${res}`);
      }
    } catch (error) {
      console.error("Error uploading attachments:", error);
      alert("เกิดข้อผิดพลาดในการอัปโหลดไฟล์แนบ");
      sendErrorLog("NCForm/attatchments_post", `เกิดข้อผิดพลาดในการอัปโหลดไฟล์แนบ catch : ${error}`);
    }
  };
  // ========== Helper Functions ==========
  const formatLocalDateTime = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

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

  // ========= Filtered Data Functions ==========

  const filteredForm = (title: string, data: any[] | undefined): any[] => {
    switch (title) {
      case "site":
        return data?.filter((site: any) => site.site_id !== 1) || []
      case "department":
        return data?.filter((dept: any) => (dept.department_id > 11 || dept.department_id === 3) && (dept.department_id !== 21)) || []
      default:
        return data || []
    }
  };

  // ========= Status Design ==========

  const statusDesign = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-white border-yellow-500 text-yellow-700";
      case "Completed Investigate":
        return "bg-white border-green-500 text-green-700";
      case "Voided":
        return "bg-white border-red-500 text-red-700";
      default:
        return "hidden";
    }
  }


  return (
    <>
      <div className="min-h-screen bg-[#d1ffe1]">
        <div className="py-4 sm:p-6 space-y-4 md:space-y-6 pb-24 lg:pb-6">
          {/* Button Bar */}
          {formData?.casestatus !== "" && (
            <div>
              {/* Mobile: Status + Print ในแถวเดียวกัน */}
              <div className="flex md:hidden items-start justify-between gap-3 mb-4 mt-2">
                {/* Mobile Status */}
                <div className={`
                  flex-1
                  ${statusDesign(formData.casestatus || "")} 
                  border-l-4 p-2 shadow-md rounded-r-md bg-white
                `} role="alert">
                  <p className="font-bold text-sm">
                    สถานะ: {formData.casestatus === "Completed Investigate" ? "Completed" : formData.casestatus}
                  </p>
                  <p className="font-bold text-xs opacity-80 mt-1">
                    ระดับ: {formData.priority}
                  </p>
                  <p className="font-bold text-xs opacity-60 mt-1">
                    ผู้รายงาน: {formData.reporter_name}
                  </p>
                </div>
                {/* Mobile Print Button */}
                {/* <button
                  type="button"
                  onClick={handlePrintDocument}
                  title="Print Document"
                  className="bg-indigo-500 hover:bg-gray-700 h-20 hover:scale-105 cursor-pointer text-white border border-white font-semibold p-3 rounded-lg shadow-md hover:shadow-lg transition duration-300 flex flex-col items-center justify-center"
                >
                  <Printer className="w-6 h-6" />
                </button> */}
              </div>

              {/* Desktop: Fixed Status (Left) */}
              <div className={`
                hidden md:block
                fixed top-auto left-auto mt-5 z-50
                min-w-[220px] max-w-[280px]
                ${statusDesign(formData.casestatus || "")} 
                border-l-4 p-3 shadow-lg rounded-r-md bg-white
              `} role="alert">
                <p className="font-bold text-base">
                  สถานะ: {formData.casestatus === "Completed Investigate" ? "Completed" : formData.casestatus}
                </p>
                <p className="font-bold text-xs opacity-80 mt-1">
                  ระดับ: {formData.priority}
                </p>
                <p className="font-bold text-xs opacity-60 mt-1">
                  ผู้รายงาน: {formData.reporter_name}
                </p>
              </div>

              {/* Desktop: Fixed Print Button (Right) */}
              <div className="
                hidden md:flex md:flex-col md:items-center
                fixed top-auto right-0 m-5 z-50 
              ">
                <button
                  type="button"
                  onClick={handlePrintDocument}
                  title="Print Document"
                  className="bg-gray-500 hover:bg-gray-700 hover:scale-105 cursor-pointer text-white border border-white font-semibold p-3 rounded-lg shadow-lg hover:shadow-xl transition duration-300 flex flex-col items-center justify-center"
                >
                  <Printer className="w-8 h-8" />
                </button>
                <span className="mt-1 text-sm font-medium text-gray-700">Print</span>
              </div>

              {/* Desktop Navigation - Floating Buttons */}
              <div className="hidden lg:flex fixed right-6 bottom-6 flex-col items-center space-y-4 z-50">
                <div className="flex flex-col items-center group relative">
                  <button
                    type="button"
                    onClick={() => thisformtype("initial")}
                    disabled={thisform === "initial"}
                    className={`relative flex items-center justify-center w-20 h-20 text-xl font-bold
                      rounded-full shadow-lg transition-all duration-300 ease-out
                      disabled:cursor-not-allowed overflow-hidden
                      ${thisform === "initial"
                        ? "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white scale-110 shadow-2xl"
                        : "bg-white text-gray-600 hover:text-blue-600 hover:scale-105 hover:shadow-xl border-2 border-gray-300 hover:border-blue-400"
                      }`}
                  >
                    <span className="relative z-10">1</span>
                    {thisform === "initial" && (
                      <div className="absolute inset-0 bg-white opacity-20" />
                    )}
                  </button>
                  <div className="mt-2 text-center">
                    <span
                      className={`text-xs font-semibold tracking-wide transition-colors duration-300 ${thisform === "initial"
                        ? "text-blue-600"
                        : "text-gray-600 group-hover:text-blue-500"
                        }`}
                    >
                      Initial Report
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center group relative">
                  <button
                    type="button"
                    onClick={() => thisformtype("investigate")}
                    disabled={thisform === "investigate"}
                    className={`relative flex items-center justify-center w-20 h-20 text-xl font-bold
                      rounded-full shadow-lg transition-all duration-300 ease-out
                      disabled:cursor-not-allowed overflow-hidden
                      ${thisform === "investigate"
                        ? "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white scale-110 shadow-2xl"
                        : "bg-white text-gray-600 hover:text-blue-600 hover:scale-105 hover:shadow-xl border-2 border-gray-300 hover:border-blue-400"
                      }`}
                  >
                    <span className="relative z-10">2</span>
                    {thisform === "investigate" && (
                      <div className="absolute inset-0 bg-white opacity-20" />
                    )}
                  </button>
                  <div className="mt-2 text-center">
                    <span
                      className={`text-xs font-semibold tracking-wide transition-colors duration-300 ${thisform === "investigate"
                        ? "text-blue-600"
                        : "text-gray-600 group-hover:text-blue-500"
                        }`}
                    >
                      Investigation
                    </span>
                  </div>
                </div>
              </div>

              {/* Mobile Navigation - Fixed Bottom Bar */}
              <div className="lg:hidden fixed bottom-5 left-0 right-0 bg-white border-t-2 border-gray-300 shadow-lg z-50">
                <div className="w-full h-16">
                  <div className="flex justify-center items-stretch">
                    <button
                      type="button"
                      onClick={() => thisformtype("initial")}
                      disabled={thisform === "initial"}
                      className={`flex-1 flex flex-col items-center justify-center py-4 px-3 transition-all duration-300 ease-out
                        disabled:cursor-not-allowed min-h-[70px] border-r border-gray-100
                        ${thisform === "initial"
                          ? "bg-blue-500 text-white"
                          : "bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600 active:bg-blue-100"
                        }`}
                    >
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full mb-1 font-bold text-sm transition-colors duration-300
                        ${thisform === "initial"
                          ? "text-white"
                          : "bg-blue-100 text-blue-600"
                        }`}>
                        1
                      </div>
                      <span className="text-xs font-semibold text-center leading-tight">
                        Initial<br />Report
                      </span>
                    </button>

                    {/* Investigation Button */}
                    <button
                      type="button"
                      onClick={() => thisformtype("investigate")}
                      disabled={thisform === "investigate"}
                      className={`flex-1 flex flex-col items-center justify-center py-4 px-3 transition-all duration-300 ease-out
                        disabled:cursor-not-allowed min-h-[70px]
                        ${thisform === "investigate"
                          ? "bg-blue-500 text-white"
                          : "bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600 active:bg-blue-100"
                        }`}
                    >
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full mb-1 font-bold text-sm transition-colors duration-300
                        ${thisform === "investigate"
                          ? "text-white"
                          : "bg-blue-100 text-blue-600"
                        }`}>
                        2
                      </div>
                      <span className="text-xs font-semibold text-center leading-tight">
                        Investigation
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center">
            <div
              id="printable-area"
              className="md:w-4xl sm:w-full md:m-4 space-y-6 bg-white p-4 md:p-8 rounded-xl shadow-sm border border-gray-500"
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
                    className={`rounded-lg bg-white transition-all duration-300 ${isAnimating
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
                            name="document_no"
                            value={formData?.document_no || "Auto Generated"}
                            onChange={handleInputChange}
                            disabled
                            className="w-full cursor-not-allowed text-sm font-bold text-blue-600 p-2 bg-gray-100 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            สำนักงาน/ศูนย์ปฏิบัติการ:{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <SearchableSelect
                            options={(filteredForm("site", sites) || []).map((site: any) => ({
                              value: site.site_id,
                              label: site.site_name_th,
                            }))}
                            value={formData?.site_id || ""}
                            onChange={(value) =>
                              handleSiteChange(Number(value))
                            }
                            showAddRemove={!isViewMode}
                            disabled={formData.document_no ? true : isViewMode}
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            ฝ่าย: <span className="text-red-500">*</span>
                          </label>
                          <SearchableSelect
                            options={(filteredForm("department", departments) || []).map((dept: any) => ({
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
                            // onAdd={() => handleAddItem("department")}
                            disabled={isViewMode}
                            showAddRemove={true}
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            วันและเวลา บันทึกเหตุ:
                          </label>
                          <DateTimePicker24h
                            value={
                              formData?.record_date
                                ? new Date(formData.record_date)
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
                              formData?.incident_date
                                ? new Date(formData.incident_date)
                                : undefined
                            }
                            onChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                incident_date: value as any,
                              }))
                            }
                            disabled={isViewMode}
                            usedFor="datetime"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            สาเหตุการเกิด: <span className="text-red-500">*</span>
                          </label>
                          <SearchableSelect
                            options={(filteredData.mastercauses || []).map((cause: any) => ({
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
                            onAdd={() => handleAddItem("mastercauses")}
                            showAddRemove={true}
                            className="w-full"
                            disabled={isViewMode}
                          />
                        </div>

                        <div className="md:col-span-3">
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            รายละเอียดเหตุการณ์:{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            name="case_details"
                            value={formData?.case_details}
                            onChange={handleInputChange}
                            rows={3}
                            maxLength={1000}
                            disabled={isViewMode}
                            className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${isViewMode
                              ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold h-60"
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
                            onAdd={() => handleAddItem("clients")}
                            showAddRemove={true}
                            className="w-full"
                            disabled={isViewMode}
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            ต้นทาง/แพล้น:<span className="text-red-500">*</span>
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
                            ปลายทาง:<span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="destination"
                            value={formData?.destination}
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
                            สถานที่เกิดเหตุ:{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="case_location"
                            value={formData?.case_location}
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
                            onOpen={() => fetchSingleDropdown('vehicles')}
                            showAddRemove={true}
                            className="w-full"
                            disabled={isViewMode}
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            ทะเบียนรถหาง:{" "}
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
                            onOpen={() => fetchSingleDropdown('masterdrivers')}
                            // onAdd={() => handleAddItem("masterdrivers")}
                            showAddRemove={false}
                            className="w-full"
                            disabled={isViewMode}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-400 md:col-span-3"></div>
                    <div className="flex flex-row justify-between p-2 bg-gray-200 font-bold text-gray-800 text-sm">
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
                                      className={`w-full text-sm p-1 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${isViewMode
                                        ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                                        : "bg-white"
                                        }`}
                                      disabled={isViewMode}
                                    />
                                  </td>
                                  <td className="border border-gray-300 px-3 py-2 text-black">
                                    <input
                                      type="number"
                                      value={item.amount || ""}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        handleProductItemChange(
                                          item.product_id,
                                          "amount",
                                          value
                                        );
                                      }
                                      }
                                      className={`w-full text-sm p-1  border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${isViewMode
                                        ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                                        : "bg-white"
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
                                      className={`w-full text-sm p-1 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${isViewMode
                                        ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                                        : "bg-white"
                                        }`}
                                    >
                                      <option value=""></option>
                                      <option value="คิว">คิว</option>
                                      <option value="กล่อง">กล่อง</option>
                                      <option value="แพ็ค">แพ็ค</option>
                                      <option value="พาเลท">พาเลท</option>
                                      <option value="ชิ้น">ชิ้น</option>
                                      <option value="แกลลอน">แกลลอน</option>
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
                                type="text"
                                inputMode="numeric"
                                name="estimated_cost"
                                value={formData?.estimated_cost || ""}
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

                            <div>
                              <label className="block text-gray-700 font-medium mb-1 text-sm">
                                มูลค่าความเสียหายจริง:
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                name="actual_price"
                                value={formData?.actual_price || ""}
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
                          </div>
                        </div>
                      </div>
                    </div>


                  </div>
                )}

                {thisform === "initial" && (
                  <>
                    <div className="border-t border-gray-400 md:col-span-3"></div>
                    <div className="flex flex-col p-2 bg-gray-200 font-bold text-gray-800 mb-3 text-sm md:col-span-3">
                      <h3>แนบเอกสาร {formData?.casestatus === "" && <span className="text-red-500 text-[12px]">(ต้องแนบรูปเหตุการณ์อย่างน้อย 1 รูป ก่อนบันทึก)</span>}</h3>
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
                        case="nc"
                      />
                    </div>
                  </>
                )}

                {/* Investigate Section */}
                {thisform === "investigate" && formData?.casestatus !== "" && (
                  <div
                    className={`rounded-lg bg-white mt-6 transition-all duration-300 ${isAnimating
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
                          </label>
                          <textarea
                            name="root_cause_analysis"
                            value={formInvestigate.root_cause_analysis || ""}
                            onChange={(e) => {
                              handleInvestigateInputChange(e);
                              e.target.style.height = "auto";
                              e.target.style.height = `${Math.max(
                                100,
                                e.target.scrollHeight
                              )}px`;
                            }}
                            maxLength={2000}
                            disabled={isViewMode}
                            style={{ minHeight: "100px" }}
                            className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black resize-none overflow-hidden ${isViewMode
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
                                      e.target.style.height = `${Math.max(
                                        50,
                                        e.target.scrollHeight
                                      )}px`;
                                    }}

                                    className={`w-full text-sm p-1 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black resize-none overflow-hidden ${isViewMode
                                      ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                                      : "bg-white"
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
                                    className={`w-full text-sm p-1 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${isViewMode
                                      ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                                      : "bg-white"
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
                                    usedFor="date"
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
                                    usedFor="date"
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
                        <label
                          className={`text-sm text-gray-800 ${formData?.actual_price == 0 ? "" : "hidden"
                            } `}
                        >
                          มูลค่าความเสียหายประมาณการ: {""}
                          <span className="font-bold text-blue-600">
                            {formData?.estimated_cost ? Number(formData.estimated_cost).toLocaleString() : formData?.estimated_cost} บาท
                          </span>
                        </label>
                        <label
                          className={`text-sm text-gray-800 ${formData?.actual_price == 0 ? "hidden" : ""
                            } `}
                        >
                          มูลค่าความเสียหายจริง: {""}
                          <span className="font-bold text-blue-600">
                            {formData?.actual_price ? Number(formData.actual_price).toLocaleString() : formData?.actual_price} บาท
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
                            className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${isViewMode
                              ? "cursor-not-allowed bg-gray-100 text-blue-600 font-bold"
                              : ""
                              }`}
                          >
                            <option value=""></option>
                            <option value="เครมประกัน">เครมประกัน</option>
                            <option value="นำสินค้าไปขาย">นำสินค้าไปขาย</option>
                            <option value="คู่กรณี">คู่กรณี</option>
                            <option value="พจส.รับผิดชอบ">พจส.รับผิดชอบ</option>
                            <option value="พจร.รับผิดชอบ">พจร.รับผิดชอบ</option>
                            <option value="บริษัทรับผิดชอบ">บริษัทรับผิดชอบ</option>
                            <option value="พจส.&บริษัท รับผิดชอบ">พจส.&บริษัท รับผิดชอบ</option>
                            <option value="พจร.&บริษัท รับผิดชอบ">พจร.&บริษัท รับผิดชอบ</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            ประกันรับเคลม (บาท):
                          </label>
                          <input
                            type="number"
                            name="insurance_claim"
                            value={formInvestigate.insurance_claim ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormInvestigate(prev => ({ ...prev, insurance_claim: val === '' ? null as any : Number(val) }));
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
                            ขายสินค้าได้ (บาท):
                          </label>
                          <input
                            type="number"
                            name="product_resellable"
                            value={formInvestigate.product_resellable ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormInvestigate(prev => ({ ...prev, product_resellable: val === '' ? null as any : Number(val) }));
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
                            ค่าความเสียหายคงเหลือ (บาท):
                          </label>
                          <input
                            type="number"
                            name="remaining_damage_cost"
                            value={formInvestigate.remaining_damage_cost ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormInvestigate(prev => ({ ...prev, remaining_damage_cost: val === '' ? null as any : Number(val) }));
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
                            คนขับรับผิดชอบค่าใช้จ่าย (บาท):
                          </label>
                          <input
                            type="number"
                            name="driver_cost"
                            value={formInvestigate.driver_cost ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              // console.log("Driver Cost input value:", val);
                              setFormInvestigate(prev => ({ ...prev, driver_cost: val === '' ? null as any : Number(val) }));
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
                            บริษัทรับผิดชอบค่าใช้จ่าย (บาท):
                          </label>
                          <input
                            type="number"
                            name="company_cost"
                            value={formInvestigate.company_cost ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormInvestigate(prev => ({ ...prev, company_cost: val === '' ? null as any : Number(val) }));
                            }}
                            disabled={isViewMode}
                            className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${isViewMode
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
                <div className="flex justify-start">
                  <p className="text-sm text-gray-600">Form created by: {formData?.reporter_name || "N/A"}</p>
                </div>
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
                  {formData?.casestatus !== "" && formData?.casestatus !== "Voided" &&
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
                        onClick={formInvestigate?.investigate_id ? handleUpdateInvestigate : handleSubmitInvestigate}
                      >
                        {formInvestigate?.investigate_id ? "อัปเดตข้อมูล" : "บันทึกข้อมูล"}
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
