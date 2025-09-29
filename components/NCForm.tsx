"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LordIcon } from "./LordIcon";
import { DateTimePicker24h } from "./ui/datetime-picker";
import { SearchableSelect } from "./ui/searchable-select";
import { Picture } from "./picture";
import { caseReport } from "@/lib/caseReport";
import { SquarePen, Printer, CirclePlus, CircleMinus, Loader2 } from "lucide-react";

interface FileWithId {
  id: string;
  file: File;
  url: string;
}

interface CategoryFiles {
  [key: string]: FileWithId[];
}

export const NCFormComponent = () => {
  const [formData, setFormData] = useState<Partial<caseReport>>({
    products: [{ product_id: 1, product_name: "", amount: 0, unit: "" }] as [
      { product_id: number; product_name: string; amount: number; unit: string }
    ],
  });

  const [dropdownData, setDropdownData] = useState<{
    sites?: any[];
    departments?: any[];
    clients?: any[];
    vehicles?: any[];
    locations?: any[];
    driver_roles?: any[];
    masterdrivers?: any[];
    mastercauses?: any[];
  }>({});

  const [displayPIC, setDisplayPIC] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  
  const [originalData, setOriginalData] = useState<{
    masterdrivers?: any[];
    locations?: any[];
    vehicles?: any[];
  }>({});

  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);
  const [attachedFiles, setAttachedFiles] = useState<CategoryFiles>({});
  
  const LoadingSpinner = () => (
    <Loader2 className="w-4 h-4 animate-spin text-gray-400 ml-2 inline" />
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form data before submission:", formData.document_no);
    if(formData.document_no) {
      alert('ไม่สามารถแก้ไขข้อมูลได้ในขณะนี้');
      return;
    }
    try {

      const userData = localStorage.getItem('userData');
      const parsedUserData = userData ? JSON.parse(userData) : null;
      
      if (!parsedUserData?.id) {
        alert('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่');
        return;
      }

      const now = new Date();
      const localDateTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString();
      
      console.log("userData from localStorage:", parsedUserData.id);
      console.log("Local DateTime:", localDateTime);

      const submitData = {
        ...formData,
        record_date: localDateTime,
        reporter_id: parsedUserData.id
      };

      console.log("NC Form data to submit:", submitData);

      const res = await fetch('/api/document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const responseData = await res.json();
      console.log("API Response:", responseData);

      if (res.ok) {
        alert("NC Form submitted successfully!");
        console.log("Success response data:", responseData);

        setFormData(submitData);
        

        if (responseData.document_no && Object.keys(attachedFiles).length > 0) {
          await attatchments_post(responseData.document_no);
        }
        
        // Optional: Reload page after successful submission
        // window.location.reload();
      } else {
        throw new Error(responseData.message || `HTTP ${res.status}: ${res.statusText}`);
      }
      
    } catch (error) {
      console.error('Error submitting NC Form:', error);
      alert(`เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  const attatchments_post = async (document_no: string) => {
    if (!document_no) {
      console.error('Document number is required for attachments upload.');
      return;
    }

    try {
      const uploadFormData = new FormData();
      
      // เตรียมไฟล์สำหรับอัปโหลด
      Object.entries(attachedFiles).forEach(([category, files]) => {
        if (Array.isArray(files)) {
          files.forEach((fileItem: FileWithId, index: number) => {
            // สร้างชื่อไฟล์ใหม่
            const fileExtension = fileItem.file.name.split('.').pop();
            const randomNumber = String(Math.floor(Math.random() * 100)).padStart(2, '0');
            const newFileName = `${document_no}.${category}.${randomNumber}.${fileExtension}`;
            
            const renamedFile = new File([fileItem.file], newFileName, { type: fileItem.file.type });
            uploadFormData.append('files', renamedFile);
            uploadFormData.append('categories', category);
            
            console.log(`Renamed file: ${fileItem.file.name} -> ${newFileName}`);
          });
        }
      });
      
      uploadFormData.append('document_no', document_no);
      
      console.log('Uploading attachments for document:', document_no);
      
      const res = await fetch('/api/attachment', {
        method: 'POST',
        body: uploadFormData,
      });
      
      if (res.ok) {
        const result = await res.json();
        // console.log('Attachments uploaded successfully:', result);
        window.location.reload();
      } else {
        throw new Error(`Failed to upload attachments: ${res.statusText}`);
      }
    } catch (error) {
      console.error('Error uploading attachments:', error);
      alert('เกิดข้อผิดพลาดในการอัปโหลดไฟล์แนบ');
    }
  };

  useEffect(() => {
    const getvaluesparams = async (dropdowns: any) => {
      const searchParams = useSearchParams();
      const docId = searchParams.get('doc');

      if (docId) {
        setIsViewMode(true);
        
        try {
          const res = await fetch(`/api/document?document_no=${encodeURIComponent(docId)}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          const data = await res.json();
          console.log('Fetched record for viewing:', data);
          if (res.ok) {
            setFormData(data);
            const mappedData = await mapTextDataToIds(data, dropdowns);
        
          } else {
            throw new Error(data.message || `HTTP ${res.status}: ${res.statusText}`);
          }

        } catch (error) {
          console.error('Error fetching record:', error);
          alert(`เกิดข้อผิดพลาดในการโหลดข้อมูล: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
       
      } else {
        setFormData(prev => ({
          ...prev,
          record_date: new Date().toISOString()
        }));
      }
    };

  const mapTextDataToIds = async (data: any, dropdowns: any) => {
    console.log('data:', data);
    console.log('dropdowns:', dropdowns);

    const mappedData: any = {};

    // site to site_id
    if (data.site && dropdowns.sites) {
      const site = dropdowns.sites.find((val: any) => val.site_name_th === data.site);
      if (site) {
        mappedData.site_id = site.site_id;
        // console.log(`Mapped site_name "${data.site}" to site_id:`, site.site_id);
      }
    }

    // department
    if (data.department && dropdowns.departments) {
      const department = dropdowns.departments.find((val: any) => val.department_name_th === data.department);
      if (department) {
        mappedData.department_id = department.department_id;
        // console.log(`Mapped department_name "${data.department}" to department_id:`, department.department_id);
      }
    }

    // client
    if (data.client && dropdowns.clients) {
      const client = dropdowns.clients.find((val: any) => val.client_name === data.client);
      if (client) {
        mappedData.client_id = client.client_id;
        // console.log(`Mapped client_name "${data.client}" to client_id:`, client.client_id);
      }
    }

    // location to origin_id
    if (data.location && dropdowns.locations) {
      const location = dropdowns.locations.find((val: any) => val.location_name === data.location);
      if (location) {
        mappedData.origin_id = location.location_id;
        // console.log(`Mapped location_name "${data.location}" to origin_id:`, location.location_id);
      }
    }

    //vehicle_head
    if (data.vehicle_head && dropdowns.vehicles) {
      const vehicle = dropdowns.vehicles.find((val: any) => (val.vehicle_number_plate === data.vehicle_head) && val.plate_type === 'head');
      if (vehicle) {
        mappedData.vehicle_truckno = vehicle.truck_no;
        mappedData.vehicle_id_head = vehicle.vehicle_id;
        // console.log(`Mapped vehicle_name "${data.vehicle_head}" to vehicle_id:`, vehicle.vehicle_id);
      }
    }

    //vehicle_tail
    if (data.vehicle_tail && dropdowns.vehicles) {
      const vehicle = dropdowns.vehicles.find((val: any) => (val.vehicle_number_plate === data.vehicle_tail) && val.plate_type === 'tail');
      if (vehicle) {
        mappedData.vehicle_id_tail = vehicle.vehicle_id;
        // console.log(`Mapped vehicle_name "${data.vehicle_tail}" to vehicle_id:`, vehicle.vehicle_id);
      }
    }

    //driver_role
    if (data.driver_role && dropdowns.driver_roles) {
      const role = dropdowns.driver_roles.find((val: any) => val.role_name === data.driver_role);
      if (role) {
        mappedData.driver_role_id = role.driver_role_id;
        // console.log(`Mapped driver_role "${data.driver_role}" to driver_role_id:`, role.driver_role_id);
      }
    }

    //driver_name
    if (data.driver && dropdowns.masterdrivers) {
      const driver = dropdowns.masterdrivers.find((val: any) => {
        const fullName = val.first_name + " " + val.last_name;
        console.log(`Comparing: "${fullName}" === "${data.driver}" = ${fullName === data.driver}`);
        return fullName === data.driver;
      });
      console.log('Matched driver:', driver);
      if (driver) {
        mappedData.driver_id = driver.driver_id;
        // console.log(`Mapped driver_name "${data.driver}" to driver_id:`, driver.driver_id);
      }
    }

    //incident_cause
    if (data.incident_cause && dropdowns.mastercauses) {
      const cause = dropdowns.mastercauses.find((val: any) => val.cause_name === data.incident_cause);
      if (cause) {
        mappedData.incident_cause_id = cause.cause_id;
        // console.log(`Mapped incident_cause "${data.incident_cause}" to incident_cause_id:`, cause.cause_id);
      }
    }

    // อัปเดต formData ครั้งเดียวด้วยข้อมูลที่ map แล้วทั้งหมด
    console.log('Final mapped data:', mappedData);
    setFormData(prev => ({ 
      ...prev, 
      ...mappedData 
    }));

  };

    const fetchData = async () => {
      setIsLoadingDropdowns(true);
      const list_api = [
        "/sites",
        "/departments",
        "/clients",
        "/vehicles",
        "/locations",
        "/driver_roles",
        "/masterdrivers",
        "/mastercauses",
      ];
      
      try {
        const responses = await Promise.all(
          list_api.map((api) =>
            fetch("/api/list", {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "X-Api-Path": api, 
              },
            })
          )
        );

        const data = await Promise.all(responses.map((res) => res.json()));

        const dropdownObj: any = {};
        list_api.forEach((api, index) => {
          const key = api.substring(1); 
          dropdownObj[key] = data[index];
        });

        setDropdownData(dropdownObj);
        
        setOriginalData({
          masterdrivers: dropdownObj.masterdrivers || [],
          locations: dropdownObj.locations || [],
          vehicles: dropdownObj.vehicles || []
        });

        console.log("Dropdown data fetched:", dropdownObj);
        console.log("Sites options:", dropdownObj.sites?.slice(0, 3)); // Show first 3 for debugging
        console.log("Drivers options:", dropdownObj.masterdrivers?.slice(0, 3)); // Show first 3 for debugging

        // เรียกใช้ getvaluesparams หลังจากดึงข้อมูล dropdown เสร็จแล้ว
        await getvaluesparams(dropdownObj);
        
      } catch (error) {
        console.error("Error fetching dropdown data:", error);
      } finally {
        setIsLoadingDropdowns(false);
      }
    };
    
    fetchData();
  }, []);



  // Function สำหรับรับข้อมูลไฟล์จาก Picture component
  const handleFilesFromPicture = (files: CategoryFiles) => {
    console.log('Files received from Picture component:', files);
    setAttachedFiles(files);
  };

  // Initialize form with current local datetime
  useEffect(() => {
    const now = new Date();
    const localDateTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString();
    
    setFormData(prev => ({
      ...prev,
      record_date: localDateTime
    }));
  }, []);



  // const adddropdownData = (value: any) => {
  //   setDropdownData((prevData) => ({
  //     ...prevData,
  //     ...value,
  //   }));
  // };


  const handleSiteChange = (siteId: number) => {

    setFormData((prev) => ({ ...prev, site_id: siteId }));

    if (siteId) {

      const filteredDrivers = originalData.masterdrivers?.filter(driver => driver.site_id === siteId) || [];
      const filteredLocations = originalData.locations?.filter(location => location.site_id === siteId) || [];
      // console.log("Filtered Locations:", filteredLocations);
      // const filteredVehicles = originalData.vehicles?.filter(vehicle => vehicle.site_id === siteId) || [];
      
      setDropdownData((prev) => ({ 
        ...prev, 
        masterdrivers: filteredDrivers,
        locations: filteredLocations,
        // vehicles: filteredVehicles
      }));

    } else {
      setDropdownData((prev) => ({ 
        ...prev, 
        masterdrivers: originalData.masterdrivers || [],
        locations: originalData.locations || [],
        // vehicles: originalData.vehicles || []
      }));
    }

    setFormData((prev) => ({ 
      ...prev, 
      driver_id: "", 
      origin_id: undefined,
      // vehicle_truckno: "",
      // vehicle_id_head: undefined,
      // vehicle_id_tail: undefined
    }));
  }

  const resetToOriginalData = () => {
    setDropdownData((prev) => ({
      ...prev,
      masterdrivers: originalData.masterdrivers || [],
      locations: originalData.locations || [],
      // vehicles: originalData.vehicles || []
    }));
  }

  useEffect(() => {
    if (!formData.site_id && originalData.masterdrivers && originalData.locations) {
      resetToOriginalData();
    }
  }, [formData.site_id, originalData]);

  // Filter dropdowns when view mode data is loaded
  useEffect(() => {
    if (isViewMode && formData.site_id && originalData.masterdrivers && originalData.locations) {
      console.log('Filtering dropdowns for view mode with site_id:', formData.site_id);
      
      let filteredDrivers = originalData.masterdrivers?.filter(driver => driver.site_id === formData.site_id) || [];
      const filteredLocations = originalData.locations?.filter(location => location.location_id === formData.origin_id || location.site_id === formData.site_id) || [];
      
      // เพิ่มคนขับที่เลือกไว้เข้าไปใน filtered list หากยังไม่มี
      if (formData.driver_id) {
        const selectedDriver = originalData.masterdrivers?.find(driver => driver.driver_id == formData.driver_id);
        if (selectedDriver && !filteredDrivers.find(driver => driver.driver_id == selectedDriver.driver_id)) {
          filteredDrivers = [...filteredDrivers, selectedDriver];
          console.log('Added selected driver to filtered list:', selectedDriver);
        }
      }
      
      setDropdownData((prev) => ({ 
        ...prev, 
        masterdrivers: filteredDrivers,
        locations: filteredLocations,
      }));
    }
  }, [isViewMode, formData.site_id, formData.driver_id, formData.origin_id, originalData.masterdrivers, originalData.locations]);

  const handleVehicleCodeChange = (truckNo: string) => {
    const selectedVehicle = dropdownData.vehicles?.find(vehicle => 
      vehicle.truck_no === truckNo && vehicle.plate_type === 'head'
    );
    
    if (selectedVehicle) {
      const tailVehicle = dropdownData.vehicles?.find(vehicle => 
        vehicle.truck_no === truckNo && vehicle.plate_type === 'tail'
      );

      setFormData(prev => ({
        ...prev,
        vehicle_truckno: selectedVehicle.truck_no,
        vehicle_id_head: selectedVehicle.vehicle_id,
        vehicle_id_tail: tailVehicle?.vehicle_id
      }));
    }
  };

  const handleHeadPlateChange = (vehicleId: number) => {
  const selectedVehicle = dropdownData.vehicles?.find(vehicle => 
      vehicle.vehicle_id === vehicleId && vehicle.plate_type === 'head'
    );
    
    if (selectedVehicle) {
      const tailVehicle = dropdownData.vehicles?.find(vehicle => 
        vehicle.truck_no === selectedVehicle.truck_no && vehicle.plate_type === 'tail'
      );

      setFormData(prev => ({
        ...prev,
        vehicle_truckno: selectedVehicle.truck_no,
        vehicle_id_head: selectedVehicle.vehicle_id,
        vehicle_id_tail: tailVehicle?.vehicle_id
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


  const handleAddItem = (type: string) => {
    const itemName = prompt(`เพิ่มรายการใหม่สำหรับ ${type}:`);
    if (itemName && itemName.trim()) {

      const newItem = {
        [`${type}_id`]: Date.now(), // Temporary ID
        [`${type}_name`]: itemName.trim(),
        [`${type}_name_th`]: itemName.trim(),
      };
      
      if (type === 'client') {
        newItem.client_name = itemName.trim();
      } else if (type === 'driver_role') {
        newItem.role_name = itemName.trim();
      } else if (type === 'masterdriver') {
        newItem.first_name = itemName.trim().split(' ')[0] || itemName.trim();
        newItem.last_name = itemName.trim().split(' ')[1] || '';
      } else if (type === 'mastercause') {
        newItem.cause_name = itemName.trim();
      }

      setDropdownData(prev => ({
        ...prev,
        [`${type}s`]: [...(prev[`${type}s` as keyof typeof prev] || []), newItem]
      }));
      
      alert(`เพิ่มรายการ "${itemName}" เรียบร้อยแล้ว`);
    }
  };

  const handleRemoveItem = (type: string, itemId?: string | number) => {
    const items = dropdownData[`${type}s` as keyof typeof dropdownData] || [];
    
    if (items.length === 0) {
      alert('ไม่มีรายการให้ลบ');
      return;
    }

    if (!itemId) {
      alert('ไม่สามารถระบุรายการที่จะลบได้');
      return;
    }

    const itemToRemove = items.find((item: any) => {
      const idField = `${type}_id`;
      return item[idField] === itemId;
    });

    if (!itemToRemove) {
      alert('ไม่พบรายการที่ต้องการลบ');
      return;
    }

    let itemName = '';
    if (type === 'client') {
      itemName = itemToRemove.client_name;
    } else if (type === 'driver_role') {
      itemName = itemToRemove.role_name;
    } else if (type === 'masterdriver') {
      itemName = `${itemToRemove.first_name} ${itemToRemove.last_name}`;
    } else if (type === 'mastercause') {
      itemName = itemToRemove.cause_name;
    } else {
      itemName = itemToRemove[`${type}_name_th`] || itemToRemove[`${type}_name`] || 'รายการนี้';
    }

    const shouldRemove = confirm(`คุณแน่ใจหรือไม่ที่จะลบรายการ: "${itemName}"?`);
    if (shouldRemove) {
      const filteredItems = items.filter((item: any) => {
        const idField = `${type}_id`;
        return item[idField] !== itemId;
      });

      setDropdownData(prev => ({
        ...prev,
        [`${type}s`]: filteredItems
      }));

      const formKey = `${type}_id`;
      if (formData[formKey as keyof typeof formData] === itemId) {
        setFormData(prev => ({
          ...prev,
          [formKey]: undefined
        }));
      }
      
      alert(`ลบรายการ "${itemName}" เรียบร้อยแล้ว`);
    }
  };

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

  const handlePrint = () => {
    const formElement = document.getElementById("printable-area");
    if (!formElement) return;

    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print NC Form</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                margin: 0; 
                padding: 20px;
                background: white;
                color: black;
              }
              .no-print { display: none !important; }
              table { border-collapse: collapse; }
              input, select, textarea { 
                border: 1px solid #d1d5db; 
                background: white; 
                color: black; 
              }
              #print-breakEvent {
                page-break-before: always;
                break-before: page;
              }
              @media print {
                body { margin: 2px; padding: 20px; }
                .no-print { display: none !important; }
                #print-breakEvent {
                  page-break-before: always;
                  break-before: page;
                }
              }
            </style>
          </head>
          <body>
            ${formElement.outerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  return (
    <>
      <div className="min-h-screen  bg-[#eef8ef]">
        <div className="p-6 space-y-6">
          <div className="no-print flex items-center justify-between">
            <div className="hidden items-center space-x-4">
              <div className="w-12 h-12 text-black flex items-center justify-center">
                <SquarePen className="w-16 h-16" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  NC FORM (Non-Conformity Services)
                </h1>
                <p className="text-gray-600">
                  แบบรายงานการให้บริการที่ไม่เป็นไปตามข้อกำหนด
                </p>
              </div>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
          </div>

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

              <form
                id="nc-form"
                name="nc-form"
                onSubmit={handleSubmit}
                className="space-y-8"
              >
                {/* Section Header */}
                <div className="rounded-lg bg-white">
                  {/* section part */}
                  <div className="mb-3 border-b border-gray-400 pb-4">
                    <label className="flex text-xs p-1 bg-gray-200 font-bold text-gray-800">
                      Part 1: Initial NC Reporting - Overview and key details
                    </label>
                    <label className="flex text-xs p-1 bg-gray-200 font-bold text-gray-800">
                      ส่วนที่ 1: รายงานการให้บริการที่ไม่เป็นไปตามข้อกำหนด -
                      รายละเอียดเบื้องต้นของการให้บริการที่ไม่เป็นไปตามข้อกำหนดที่เกิดขึ้น
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        เลขที่เอกสาร:
                      </label>
                      <input
                        type="text"
                        name="document_no"
                        value={formData?.document_no || "รอสร้างเลข"}
                        onChange={handleInputChange}
                        disabled
                        className="w-full cursor-not-allowed text-sm font-bold text-blue-600 p-2 bg-gray-100 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        ศูนย์ปฏิบัติการ:
                        {isLoadingDropdowns && <LoadingSpinner />}
                      </label>
                      <SearchableSelect
                        options={(dropdownData.sites || []).map((site: any) => ({
                          value: site.site_id,
                          label: site.site_name_th
                        }))}
                        value={formData?.site_id || ""}
                        onChange={(value) => handleSiteChange(Number(value))}
                        onAdd={() => handleAddItem('site')}
                        onRemove={(itemId) => handleRemoveItem('site', itemId)}
                        placeholder="เลือกศูนย์ปฏิบัติการ"
                        showAddRemove={!isViewMode}
                        disabled={isViewMode}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        ฝ่าย:
                        {isLoadingDropdowns && <LoadingSpinner />}
                      </label>
                      <SearchableSelect
                        options={(dropdownData.departments || []).map((dept: any) => ({
                          value: dept.department_id,
                          label: dept.department_name_th
                        }))}
                        value={formData?.department_id || ""}
                        onChange={(value) => setFormData(prev => ({ ...prev, department_id: Number(value) }))}
                        onAdd={() => handleAddItem('department')}
                        onRemove={(itemId) => handleRemoveItem('department', itemId)}
                        placeholder="เลือกฝ่าย"
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
                                const localDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
                                return localDate.toLocaleString('en-UK', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false
                                });
                              })()
                            : new Date().toLocaleString('en-UK', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              })
                        }
                        readOnly
                        className="w-full text-sm p-2 bg-gray-100 border border-gray-300 rounded focus:outline-none text-black cursor-not-allowed disabled:text-blue-600 disabled:font-bold"
                        placeholder="วันที่และเวลาจะถูกตั้งอัตโนมัติ"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        วันที่และเวลา เกิดเหตุ:
                      </label>
                      {isViewMode ? (
                        <input
                          type="text"
                          value={
                            formData?.incident_date
                              ? (() => {
                                  const date = new Date(formData.incident_date);
                                  const localDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
                                  return localDate.toLocaleString('en-UK', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false
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

                    <br />
                    <div className="border-t border-gray-400 md:col-span-3"></div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        ลูกค้า:
                        {isLoadingDropdowns && <LoadingSpinner />}
                      </label>
                      <SearchableSelect
                        options={(dropdownData.clients || []).map((client: any) => ({
                          value: client.client_id,
                          label: client.client_name
                        }))}
                        value={formData?.client_id || ""}
                        onChange={(value) => setFormData(prev => ({ ...prev, client_id: Number(value) }))}
                        onAdd={() => handleAddItem('client')}
                        onRemove={(itemId) => handleRemoveItem('client', itemId)}
                        placeholder="เลือกลูกค้า"
                        showAddRemove={true}
                        className="w-full"
                        disabled={isViewMode}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        ต้นทาง/แพล้น:
                        {isLoadingDropdowns && <LoadingSpinner />}
                      </label>
                      <SearchableSelect
                        options={(dropdownData.locations || []).map((location: any) => ({
                          value: location.location_id,
                          label: location.location_name
                        }))}
                        value={formData?.origin_id || ""}
                        onChange={(value) => setFormData(prev => ({ ...prev, origin_id: Number(value) }))}
                        onAdd={() => handleAddItem('locations')}
                        onRemove={(itemId) => handleRemoveItem('locations', itemId)}
                        placeholder="เลือกต้นทาง/แพล้น"
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
                          isViewMode ? 'cursor-not-allowed bg-gray-100 text-blue-600 font-bold' : ''
                        }`}
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        สถานที่เกิดเหตุ:
                      </label>
                      <input
                        type="text"
                        name="case_location"
                        value={formData?.case_location}
                        onChange={handleInputChange}
                        disabled={isViewMode}
                        className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${
                          isViewMode ? 'cursor-not-allowed bg-gray-100 text-blue-600 font-bold' : ''
                        }`}
                      />
                    </div>
                    

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        ทะเบียนรถหัว:
                        {isLoadingDropdowns && <LoadingSpinner />}
                      </label>
                      <SearchableSelect
                        options={(dropdownData.vehicles || [])
                          .filter(vehicle => vehicle.plate_type === 'head')
                          .map((vehicle: any) => ({
                            value: vehicle.vehicle_id,
                            label: `${vehicle.vehicle_number_plate}`
                          }))}
                        value={formData?.vehicle_id_head || ""}
                        onChange={(value) => handleHeadPlateChange(Number(value))}
                        onAdd={() => handleAddItem('vehicle')}
                        onRemove={(itemId) => handleRemoveItem('vehicle', itemId)}
                        placeholder="เลือกทะเบียนรถหัว"
                        showAddRemove={true}
                        className="w-full"
                        disabled={isViewMode}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        รหัสรถ:
                        {isLoadingDropdowns && <LoadingSpinner />}
                      </label>
                      <SearchableSelect
                        options={Array.from(
                          new Set(
                            (dropdownData.vehicles || [])
                              .filter(vehicle => vehicle.plate_type === 'head')
                              .map(vehicle => vehicle.truck_no)
                          )
                        ).map((truckNo: string) => ({
                          value: truckNo,
                          label: truckNo
                        }))}
                        value={formData?.vehicle_truckno || ""}
                        onChange={(value) => handleVehicleCodeChange(String(value))}
                        onAdd={() => handleAddItem('vehicle')}
                        onRemove={(itemId) => handleRemoveItem('vehicle', itemId)}
                        placeholder="เลือกรหัสรถ"
                        showAddRemove={true}
                        className="w-full"
                        disabled={isViewMode}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        ทะเบียนรถหาง:
                        {isLoadingDropdowns && <LoadingSpinner />}
                      </label>
                      <SearchableSelect
                        options={(dropdownData.vehicles || [])
                          .filter(vehicle => vehicle.plate_type === 'tail')
                          .map((vehicle: any) => ({
                            value: vehicle.vehicle_id,
                            label: `${vehicle.vehicle_number_plate}`
                          }))}
                        value={formData?.vehicle_id_tail || ""}
                        onChange={(value) => setFormData(prev => ({ ...prev, vehicle_id_tail: Number(value) }))}
                        onAdd={() => handleAddItem('vehicle')}
                        onRemove={(itemId) => handleRemoveItem('vehicle', itemId)}
                        placeholder="เลือกทะเบียนรถหาง"
                        showAddRemove={true}
                        className="w-full"
                        disabled={isViewMode}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        ประเภทคนขับ:
                        {isLoadingDropdowns && <LoadingSpinner />}
                      </label>
                      <SearchableSelect
                        options={(dropdownData.driver_roles || []).map((role: any) => ({
                          value: role.driver_role_id,
                          label: role.role_name
                        }))}
                        value={formData?.driver_role_id || ""}
                        onChange={(value) => setFormData(prev => ({ ...prev, driver_role_id: Number(value) }))}
                        onAdd={() => handleAddItem('driver_role')}
                        onRemove={(itemId) => handleRemoveItem('driver_role', itemId)}
                        placeholder="เลือกประเภทคนขับ"
                        showAddRemove={true}
                        className="w-full"
                        disabled={isViewMode}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        ชื่อ-สกุลคนขับ:
                        {isLoadingDropdowns && <LoadingSpinner />}
                      </label>
                      <SearchableSelect
                        options={(dropdownData.masterdrivers || []).map((driver: any) => ({
                          value: driver.driver_id,
                          label: `${driver.first_name} ${driver.last_name}`
                        }))}
                        value={formData?.driver_id || ""}
                        onChange={(value) => setFormData(prev => ({ ...prev, driver_id: String(value) }))}
                        onAdd={() => handleAddItem('masterdriver')}
                        onRemove={(itemId) => handleRemoveItem('masterdriver', itemId)}
                        placeholder="เลือกชื่อ-สกุลคนขับ"
                        showAddRemove={true}
                        className="w-full"
                        disabled={isViewMode}
                      />
                    </div>

                    <div className="border-t border-gray-400 md:col-span-3"></div>

                    <div className="md:col-span-3">
                      <label className="flex justify-between p-2 bg-gray-200 font-bold text-gray-800 font-bold mb-3 text-sm">
                        รายการสินค้าเสียหาย :
                        <div className={`flex ${isViewMode ? 'hidden' : ''}`}>
                          <CirclePlus
                            onClick={addProductItem}
                            className="ml-2 w-5 h-5 bg-white rounded-full text-gray-600 hover:text-green-700 cursor-pointer"
                          />
                          <CircleMinus
                            onClick={removeProductItem}
                            className="ml-2 w-5 h-5 bg-white rounded-full text-gray-600 hover:text-red-700 cursor-pointer"
                          />
                        </div>
                      </label>

                      <div className="overflow-x-auto">
                        <table className="w-full border border-gray-300 text-sm">
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
                                      isViewMode ? 'cursor-not-allowed bg-gray-100 text-blue-600 font-bold' : ''
                                    }`}
                                    placeholder=""
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
                                      isViewMode ? 'cursor-not-allowed bg-gray-100 text-blue-600 font-bold' : ''
                                    }`}
                                    placeholder=""
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
                                      isViewMode ? 'cursor-not-allowed bg-gray-100 text-blue-600 font-bold' : ''
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
                      </div>
                    </div>

                    <div
                      id="print-breakEvent"
                      className="border-t border-gray-400 md:col-span-3"
                      style={{ pageBreakBefore: "always" }}
                    ></div>

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
                          isViewMode ? 'cursor-not-allowed bg-gray-100 text-blue-600 font-bold' : ''
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
                          isViewMode ? 'cursor-not-allowed bg-gray-100 text-blue-600 font-bold' : ''
                        }`}
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        สาเหตุ NC:
                        {isLoadingDropdowns && <LoadingSpinner />}
                      </label>
                      <SearchableSelect
                        options={(dropdownData.mastercauses || []).map((cause: any) => ({
                          value: cause.cause_id,
                          label: cause.cause_name
                        }))}
                        value={formData?.incident_cause_id || ""}
                        onChange={(value) => setFormData(prev => ({ ...prev, incident_cause_id: Number(value) }))}
                        onAdd={() => handleAddItem('mastercause')}
                        onRemove={(itemId) => handleRemoveItem('mastercause', itemId)}
                        placeholder="เลือกสาเหตุ"
                        showAddRemove={true}
                        className="w-full"
                        disabled={isViewMode}
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        รายละเอียด:
                      </label>
                      <textarea
                        name="case_details"
                        value={formData?.case_details}
                        onChange={handleInputChange}
                        rows={3}
                        maxLength={1000}
                        disabled={isViewMode}
                        className={`w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black ${
                          isViewMode ? 'cursor-not-allowed bg-gray-100 text-blue-600 font-bold' : ''
                        }`}
                      />
                    </div>

                    <div
                      onClick={() => setDisplayPIC(true)}
                      className="mx-5 cursor-pointer"
                    >
                      <button type="button">
                        <LordIcon
                          src="https://cdn.lordicon.com/wsaaegar.json"
                          trigger="hover"
                          colors="primary:#121331,secondary:#08a88a"
                          style={{
                            width: "56px",
                            height: "56px",
                            cursor: "pointer",
                          }}
                        />
                      </button>
                      <a className="flex text-blue-700 font-medium text-sm items-center">
                        แนบรูปภาพ
                        {Object.values(attachedFiles).reduce((total, files) => total + files.length, 0) > 0 && (
                          <span className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                            {Object.values(attachedFiles).reduce((total, files) => total + files.length, 0)}
                          </span>
                        )}
                      </a>
                    </div>

                    <div className="border-t border-gray-400 md:col-span-3"></div>

                    <div className=" hidden md:col-span-3">
                      <label className="block p-2 bg-gray-200 font-bold text-gray-800 font-bold mb-3 text-sm">
                        ลำดับการอนุมัติ (View):
                      </label>
                      {/* <div className="overflow-x-auto">
                        <table className="w-full border border-gray-300 text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">
                                วันและเวลาดำเนินการ
                              </th>
                              <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">
                                ผู้ใช้งาน
                              </th>

                              <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">
                                กระทำ
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            <tr>
                              <td className="border border-gray-300 px-3 py-2 text-black">
                                21 ก.ย. 2025 14:30:15
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-black">
                                Kittaboon.l (ผู้รายงาน)
                              </td>

                              <td className="border border-gray-300 px-3 py-2 text-black">
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                  รายงาน
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-gray-300 px-3 py-2 text-gray-400">
                                -
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-black">
                                Somchai.s (ผู้อนุมัติลำดับที่ 1)
                              </td>

                              <td className="border border-gray-300 px-3 py-2">
                                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                                  รอการอนุมัติ
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-gray-300 px-3 py-2 text-gray-400">
                                -
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-black">
                                Anuwat.t (ผู้อนุมัติลำดับที่ 2)
                              </td>

                              <td className="border border-gray-300 px-3 py-2">
                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                                  รอดำเนินการ
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-gray-300 px-3 py-2 text-gray-400">
                                -
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-black">
                                Ronnakorn.r (ผู้อนุมัติลำดับที่ 3)
                              </td>

                              <td className="border border-gray-300 px-3 py-2">
                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                                  รอดำเนินการ
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div> */}
                    </div>
                  </div>
                </div>

                <div className="no-print flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  {isViewMode && (
                    <div className="hidden bg-blue-100 border border-blue-300 text-blue-800 px-4 py-2 rounded-lg">
                      <span className="text-sm font-medium">📋 โหมดดูข้อมูล - ไม่สามารถแก้ไขได้</span>
                    </div>
                  )}
                  
                  <button
                    type="button"
                    className="hidden px-6 py-3 border border-gray-300 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 font-semibold"
                  >
                    แก้ไข
                  </button>
                  
                  {!isViewMode && (
                    <button
                      type="submit"
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center space-x-2"
                    >
                      <span>บันทึกข้อมูล</span>
                    </button>
                  )}
                  {isViewMode && (
                    <button
                      type="button"
                      onClick={() => setIsViewMode(false)}
                      className="px-6 py-3 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 transition-colors font-semibold flex items-center space-x-2"
                    >
                      <span>แก้ไขข้อมูล</span>
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {displayPIC && (
        <Picture 
          display={setDisplayPIC} 
          onSaveFiles={handleFilesFromPicture}
          initialFiles={attachedFiles}
        />
      )}
    </>
  );
};
