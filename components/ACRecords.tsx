"use client";
import React, { useState, useEffect, useRef } from "react";

import { LordIcon } from "./LordIcon";
import {
  FileSpreadsheet,
  Eye,
  Trash2,
  Edit,
  Weight,
  Search,
  Filter,
  Calendar,
  X,
  ChevronDown,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { RecordFilter, RecordFilterResult, RecordFilterRef } from "./ui/record-filter";
import Swal from "sweetalert2";
import { sendErrorLog } from '@/lib/logError';

interface ACRecord {
  id: string;
  date: string;
  customer: string;
  reporter: string;
  site: string;
  department: string;
  plateNumber: string;
  driver: string;
  status: string;
  description: string;
  location: string;
  priority: string;
  estimated_cost?: number;
  actual_price?: number;
  date_event: string;
  driver_role_name: string;
  vehicle_head_plate: string;
  vehicle_tail_plate: string;
  drug_test: string;
  drug_test_result: string;
  alcohol_test: string;
  alcohol_test_result: string;
  province_name: string;
  district_name: string;
  sub_district_name: string;
  product_damage: string;
  product_damage_details: string;
  estimated_goods_damage_value: number;
  actual_goods_damage_value: number;
  truck_damage: string;
  truck_damage_details: string;
  estimated_vehicle_damage_value: number;
  actual_vehicle_damage_value: number;
}

interface FilterCriteria {
  start_date?: string;
  end_date?: string;
  document_no?: string;
  site_id?: string;
  driver_id?: string;
  casestatus?: string;
  priority?: string;
}

type SortConfig = {
  key: keyof ACRecord | null;
  direction: "asc" | "desc";
};

export const ACRecordsComponent = () => {
  const [records, setRecords] = useState<ACRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const recordsPerPage = 10;
  const filterRef = useRef<RecordFilterRef>(null);

  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "date",
    direction: "desc",
  });

  // Filter states
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({});
  const [dropdownData, setDropdownData] = useState<{
    sites: any[];
    drivers: any[];
  }>({
    sites: [],
    drivers: [],
  });

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const responses = await Promise.all([
          fetch("/api/list", {
            headers: { "X-Api-Path": "/sites" },
          }),
          fetch("/api/list", {
            headers: { "X-Api-Path": "/masterdrivers" },
          }),
        ]);

        const [sitesData, driversData] = await Promise.all(
          responses.map((res) => res.json())
        );

        const sortedSites = sitesData.sort((a: any, b: any) => {
          const nameA = (a.site_name_th || a.site_name || "").toLowerCase();
          const nameB = (b.site_name_th || b.site_name || "").toLowerCase();
          return nameA.localeCompare(nameB, 'th');
        });

        const sortedDrivers = driversData.sort((a: any, b: any) => {
          const nameA = `${a.first_name || ""} ${a.last_name || ""}`.trim().toLowerCase();
          const nameB = `${b.first_name || ""} ${b.last_name || ""}`.trim().toLowerCase();
          return nameA.localeCompare(nameB, 'th');
        });

        setDropdownData({
          sites: sortedSites,
          drivers: sortedDrivers,
        });

      } catch (error) {
        console.error("Error fetching AC dropdown data:", error);
        sendErrorLog('ACRecords/fetchDropdownData', error instanceof Error ? error : String(error));
      }
    };

    fetchDropdownData();
  }, []);


  const handleFilterChange = async (filters: RecordFilterResult) => {
    setFilterCriteria(filters);
    await handleSearchWithFilters(filters);
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split("T")[0].split("-");
    const [hours, minutes, seconds] = dateString
      .split("T")[1]
      .split(".")[0]
      .split(":");
    return `${day}/${month}/${year}, ${hours}:${minutes}`;
  };

  const handleSearchWithFilters = async (filters: RecordFilterResult) => {
    setLoading(true);
    setCurrentPage(1);
    try {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value && value.toString().trim()) {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/record/ac?${params.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const transformedRecords = data.map((record: any) => ({
          id: record.document_no_ac,
          date: record.record_datetime,
          date_event: record.incident_datetime,
          customer: record.client_name,
          reporter: record.reporter_name,
          site: record.site_name,
          department: record.department_name,
          plateNumber: record.vehicle_head_plate,
          driver: record.driver_name,
          driver_role_name: record.driver_role_name,
          vehicle_head_plate: record.vehicle_head_plate,
          vehicle_tail_plate: record.vehicle_tail_plate,
          drug_test: record.drug_test,
          drug_test_result: record.drug_test_result,
          alcohol_test: record.alcohol_test,
          alcohol_test_result: record.alcohol_test_result,
          status: record.casestatus,
          priority: record.priority,
          description: record.case_details,
          location: record.case_location,
          province_name: record.province_name,
          district_name: record.district_name,
          sub_district_name: record.sub_district_name,
          product_damage: record.product_damage,
          product_damage_details: record.product_damage_details,
          estimated_goods_damage_value: record.estimated_goods_damage_value,
          actual_goods_damage_value: record.actual_goods_damage_value,
          truck_damage: record.truck_damage,
          truck_damage_details: record.truck_damage_details,
          estimated_vehicle_damage_value: record.estimated_vehicle_damage_value,
          actual_vehicle_damage_value: record.actual_vehicle_damage_value,
          estimated_cost: (record.estimated_goods_damage_value + record.estimated_vehicle_damage_value),
          actual_price: (record.actual_goods_damage_value + record.actual_vehicle_damage_value),
        }));
        setRecords(transformedRecords);
      } else {
        console.error("AC Search failed");
        sendErrorLog('ACRecords/handleSearch', `AC Search failed with status ${response}`);
      }
    } catch (error) {
      console.error("Error searching AC records:", error);
      sendErrorLog('ACRecords/handleSearch', error instanceof Error ? error : String(error));
    } finally {
      setLoading(false);
    }
  };

  // Sort function
  const handleSort = (key: keyof ACRecord) => {
    let direction: "asc" | "desc" = "asc";

    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }

    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof ACRecord) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown size={14} className="text-gray-400" />;
    }

    if (sortConfig.direction === "asc") {
      return <ArrowUp size={14} className="text-blue-600" />;
    } else {
      return <ArrowDown size={14} className="text-blue-600" />;
    }
  };

  const sortedRecords = React.useMemo(() => {
    const sortableRecords = [...records];

    if (sortConfig.key) {
      sortableRecords.sort((a, b) => {
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];

        if (sortConfig.key === "date") {
          const aDate = new Date(aValue as string).getTime();
          const bDate = new Date(bValue as string).getTime();

          if (sortConfig.direction === "asc") {
            return aDate - bDate;
          } else {
            return bDate - aDate;
          }
        }

        // Handle string sorting
        if (typeof aValue === "string" && typeof bValue === "string") {
          if (sortConfig.direction === "asc") {
            return aValue.localeCompare(bValue);
          } else {
            return bValue.localeCompare(aValue);
          }
        }

        return 0;
      });
    }

    return sortableRecords;
  }, [records, sortConfig]);

  const filteredRecords = sortedRecords.filter((record) => {
    const matchesSearch =
      record.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      !filterCriteria.casestatus ||
      filterCriteria.casestatus
        .split(",")
        .map((s) => s.trim())
        .includes(record.status);

    const matchesSite =
      !filterCriteria.site_id ||
      filterCriteria.site_id
        .split(",")
        .map((s) => s.trim())
        .some((siteId) => {
          const site = dropdownData.sites.find(
            (s) => s.site_id?.toString() === siteId
          );
          return site && record.site === (site.site_name_th || site.site_name);
        });

    const matchesDriver =
      !filterCriteria.driver_id ||
      filterCriteria.driver_id
        .split(",")
        .map((d) => d.trim())
        .some((driverId) => {
          const driver = dropdownData.drivers.find(
            (d) => d.driver_id?.toString() === driverId
          );
          return (
            driver &&
            record.driver ===
            `${driver.first_name || ""} ${driver.last_name || ""}`.trim()
          );
        });

    const matchesDocumentNo =
      !filterCriteria.document_no ||
      filterCriteria.document_no
        .split(",")
        .map((d) => d.trim())
        .some((docNo) => record.id.toLowerCase().includes(docNo.toLowerCase()));

    const matchesPriority =
      !filterCriteria.priority ||
      filterCriteria.priority
        .split(",")
        .map((p) => p.trim())
        .includes(record.priority);

    return (
      matchesSearch &&
      matchesStatus &&
      matchesSite &&
      matchesDriver &&
      matchesDocumentNo &&
      matchesPriority
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = filteredRecords.slice(startIndex, endIndex);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Voided":
        return "bg-red-100 text-red-800 border-red-200";
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Completed Investigate":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPriorityIcon = (priority: string) => {
    if (!priority) {
      return {
        icon: "⚪",
        color: "text-gray-600",
        bgColor: "bg-gray-50",
        borderColor: "border-gray-200",
        label: "ไม่ระบุ",
      };
    }

    switch (priority.toLowerCase()) {
      case "minor":
        return {
          icon: "🟡",
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          label: "Minor",
        };

      case "major":
        return {
          icon: "🟠",
          color: "text-orange-600",
          bgColor: "bg-orange-50",
          borderColor: "border-orange-200",
          label: "Major",
        };
      case "crisis":
        return {
          icon: "🔴",
          color: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          label: "Crisis",
        };
      default:
        return {
          icon: "⚪",
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          label: priority,
        };
    }
  };

  const handleRouter = (id: string) => {

    window.open(`/ac-form?doc=${id}`, "_blank");
  };

  const handleVoided = (id: string) => {

    Swal.fire({
      title: "คุณแน่ใจที่จะลบ หรือไม่",
      text: "รายการที่คุณจะลบ คือ " + id,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "ใช่",
      cancelButtonText: "ไม่"
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await fetch("/api/document/ac", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 'document_no_ac': id, 'casestatus': 'Voided' }),
        });
        const data = await res.json();
        if (res.ok) {
          Swal.fire({
            title: "สำเร็จ!",
            text: "คุณลบรายการนี้สำเร็จแล้ว",
            icon: "success"
          });
          filterRef.current?.triggerSearch();
        } else {
          Swal.fire({
            title: "ไม่สำเร็จ!",
            text: "โปรดลองใหม่อีกครั้ง",
            icon: "error"
          });
        }
      }
    });

  }

  const exportToExcel = async () => {
    if (filteredRecords.length === 0) {
      Swal.fire({
        title: "ไม่มีข้อมูล",
        text: "ไม่มีข้อมูลให้ Export",
        icon: "warning"
      });
      return;
    }
    // console.log("Exporting records:", filteredRecords);
    const excelData = filteredRecords.map(record => ({
      'เลขที่เอกสาร': record.id,
      'วันและเวลา บันทึกเหตุ': record.date ? formatDate(record.date) : '',
      'วันและเวลา เกิดเหตุ': record.date_event ? formatDate(record.date_event) : '',
      'ระดับความรุนแรง': record.priority || '',
      'สถานะ': record.status || '',
      'ลูกค้า': record.customer || '',
      'ผู้รายงาน': record.reporter || '',
      'สำนักงาน/ศูนย์': record.site || '',
      'แผนก': record.department || '',
      'พนักงานขับรถ': record.driver || '',
      'ตำแหน่งพนักงานขับรถ': record.driver_role_name || '',
      'ทะเบียนหัวรถ': record.vehicle_head_plate || '',
      'ทะเบียนหางรถ': record.vehicle_tail_plate || '',
      'การตรวจสารเสพติด': record.drug_test || '',
      'ผลการตรวจสารเสพติด': record.drug_test_result || '',
      'การตรวจแอลกอฮอล์': record.alcohol_test || '',
      'ผลการตรวจแอลกอฮอล์': record.alcohol_test_result || '',
      'รายละเอียด': record.description || '',
      'สถานที่เกิดเหตุ': record.location || '',
      'จังหวัด': record.province_name || '',
      'อำเภอ': record.district_name || '',
      'ตำบล': record.sub_district_name || '',
      'ความเสียหายของสินค้า': record.product_damage || '',
      'รายละเอียดความเสียหายของสินค้า': record.product_damage_details || '',
      'ความเสียหายของรถ': record.truck_damage || '',
      'รายละเอียดความเสียหายของรถ': record.truck_damage_details || '',
      'มูลค่าความเสียหายประมาณการ': record.estimated_cost != null ? Number(record.estimated_cost).toLocaleString() : '-',
      'มูลค่าความเสียหายจริง': record.actual_price != null ? Number(record.actual_price).toLocaleString() : '-'
    }));

    const XLSX = await import('xlsx');
    
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'AC Records');

    const now = new Date();
    const dateStr = now.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-');
    const timeStr = now.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(/:/g, '-');
    const fileName = `AC_${dateStr}_${timeStr}.xlsx`;

    // Download file
    XLSX.writeFile(wb, fileName);

    Swal.fire({
      title: "สำเร็จ!",
      text: `Export ข้อมูล ${filteredRecords.length} รายการเรียบร้อย`,
      icon: "success",
      timer: 2000
    });
  }

  return (
    <div className="min-h-screen bg-[#d1ffe1] p-6">
      <div className="max-w-7xl mx-auto m-4">
        <RecordFilter
          ref={filterRef}
          type="AC"
          onFilter={handleFilterChange}
          loading={loading}
          dropdownData={dropdownData}
          className="mb-6 z-[10] relative"
        />

        {/* Records Table */}
        {/* Data Table */}
        <div className="bg-white backdrop-blur-md rounded-2xl shadow-xl border border-white/30 overflow-hidden relative">
          <div className="p-4 bg-gray-500 border-b border-gray-200">
            <h2 className="text-xl text-white font-semibold">
              ข้อมูล AC Records
            </h2>
            <div className="text-white mt-1 space-y-1">
              <p>พบข้อมูล {filteredRecords.length} รายการ</p>
              {filterCriteria.start_date && filterCriteria.end_date && (
                <p className="text-sm">
                  ช่วงวันที่: {filterCriteria.start_date} ถึง{" "}
                  {filterCriteria.end_date}
                </p>
              )}
              {Object.keys(filterCriteria).filter(
                (key) =>
                  key !== "start_date" &&
                  key !== "end_date" &&
                  filterCriteria[key as keyof FilterCriteria]
              ).length > 0 && (
                  <p className="text-xs text-gray-200">
                    มีการใช้ตัวกรองเพิ่มเติม:{" "}
                    {
                      Object.keys(filterCriteria).filter(
                        (key) =>
                          key !== "start_date" &&
                          key !== "end_date" &&
                          filterCriteria[key as keyof FilterCriteria]
                      ).length
                    }{" "}
                    รายการ
                  </p>
                )}
            </div>
            <div className="absolute top-4 right-4 flex flex-col sm:flex-row gap-2">
              <button
                onClick={exportToExcel}
                className="bg-emerald-600 border border-white hover:bg-emerald-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <FileSpreadsheet size={20} />
                <span className="hidden sm:inline">Excel</span>
              </button>
            </div>
            <div className="flex justify-end items-center gap-2 text-sm text-gray-600">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-3 py-1 border text-white rounded hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
              >
                ก่อนหน้า
              </button>
              <span className="text-gray-200">
                หน้า {currentPage} จาก {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1 border text-white rounded hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
              >
                ถัดไป
              </button>
            </div>
          </div>
          {/* Desktop View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-300">
                <tr>
                  <th
                    className="px-3 py-4 text-left text-sm font-medium text-gray-600 cursor-pointer hover:scale-105 transition-colors"
                    onClick={() => handleSort("id")}
                  >
                    <div className="flex justify-center items-center gap-2 min-w-32">
                      <span>ID</span>
                      {getSortIcon("id")}
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-sm font-medium text-gray-600 cursor-pointer hover:scale-105 transition-colors"
                    onClick={() => handleSort("date")}
                  >
                    <div className="flex items-center gap-2">
                      <span>Report Date</span>
                      {getSortIcon("date")}
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-sm font-medium text-gray-600 cursor-pointer hover:scale-105 transition-colors"
                    onClick={() => handleSort("date_event")}
                  >
                    <div className="flex items-center gap-2">
                      <span>Incident Date</span>
                      {getSortIcon("date_event")}
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-sm font-medium text-gray-600 cursor-pointer hover:scale-105 transition-colors"
                    onClick={() => handleSort("customer")}
                  >
                    <div className="flex items-center gap-2">
                      <span>Customer</span>
                      {getSortIcon("customer")}
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-sm font-medium text-gray-600 cursor-pointer hover:scale-105 transition-colors"
                    onClick={() => handleSort("reporter")}
                  >
                    <div className="flex items-center gap-2">
                      <span>Reporter</span>
                      {getSortIcon("reporter")}
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-sm font-medium text-gray-600 cursor-pointer hover:scale-105 transition-colors"
                    onClick={() => handleSort("site")}
                  >
                    <div className="flex items-center gap-2">
                      <span>Site</span>
                      {getSortIcon("site")}
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-sm font-medium text-gray-600 cursor-pointer hover:scale-105 transition-colors"
                    onClick={() => handleSort("department")}
                  >
                    <div className="flex items-center gap-2">
                      <span>Dept.</span>
                      {getSortIcon("department")}
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-sm font-medium text-gray-600 cursor-pointer hover:scale-105 transition-colors"
                    onClick={() => handleSort("driver")}
                  >
                    <div className="flex items-center gap-2">
                      <span>Driver</span>
                      {getSortIcon("driver")}
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-sm font-medium text-gray-600 cursor-pointer hover:scale-105 transition-colors"
                    onClick={() => handleSort("estimated_cost")}
                  >
                    <div className="flex items-center gap-2" title="มูลค่าความเสียหายประมาณการ">
                      <span>Est.</span>
                      {getSortIcon("estimated_cost")}
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-sm font-medium text-gray-600 cursor-pointer hover:scale-105 transition-colors"
                    onClick={() => handleSort("actual_price")}
                  >
                    <div className="flex items-center gap-2" title="มูลค่าความเสียหายจริง">
                      <span>Act.</span>
                      {getSortIcon("actual_price")}
                    </div>
                  </th>

                  <th
                    className="px-4 py-4 text-left text-sm font-medium text-gray-600 cursor-pointer hover:scale-105 transition-colors"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-2">
                      <span>Status</span>
                      {getSortIcon("status")}
                    </div>
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-medium text-gray-600">
                    <span></span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white">
                {loading
                  ? Array.from({ length: 5 }).map((_, index) => (
                    <tr key={`loading-${index}`} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-28"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-28"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-28"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-28"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-36"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                      </td>
                      <td className="px-6 py-4 bg-gray-50">
                        <div className="flex justify-center gap-2">
                          <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
                          <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
                        </div>
                      </td>
                    </tr>
                  ))
                  : currentRecords.map((record) => (
                    <tr className="hover:bg-gray-100 transition-colors">
                      <td className="px-3 py-4 text-xs font-medium text-gray-800">
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex items-center justify-center w-6 h-6 rounded-full ${getPriorityIcon(record.priority).bgColor
                              } ${getPriorityIcon(record.priority).borderColor
                              } border`}
                          >
                            <span className="text-sm">
                              {getPriorityIcon(record.priority).icon}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">{record.id}</span>
                            <span
                              className={`text-xs ${getPriorityIcon(record.priority).color
                                } font-medium`}
                            >
                              {getPriorityIcon(record.priority).label}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-xs text-gray-600">
                        {record.date ? formatDate(record.date) : "ไม่ระบุ"}
                      </td>
                      <td className="px-3 py-4 text-xs text-gray-600">
                        {record.date_event ? formatDate(record.date_event) : "ไม่ระบุ"}
                      </td>
                      <td
                        className="px-3 py-4 text-xs text-gray-600 max-w-[140px] truncate"
                        title={record.customer || "ไม่ระบุ"}
                      >
                        {record.customer || "ไม่ระบุ"}
                      </td>
                      <td className="px-3 py-4 text-xs text-gray-600">
                        {record.reporter || "ไม่ระบุ"}
                      </td>
                      <td className="px-3 py-4 text-xs text-gray-600">
                        {record.site || "ไม่ระบุ"}
                      </td>
                      <td className="px-3 py-4 text-xs text-gray-600">
                        {record.department || "ไม่ระบุ"}
                      </td>
                      <td className="px-3 py-4 text-xs text-gray-600" >
                        {record.driver || "ไม่ระบุ"}
                      </td>
                      <td className="px-3 py-4 text-xs text-gray-600">
                        {record.estimated_cost != null ? Number(record.estimated_cost).toLocaleString() : "-"}
                      </td>
                      <td className="px-3 py-4 text-xs text-gray-600">
                        {record.actual_price != null ? Number(record.actual_price).toLocaleString() : "-"}
                      </td>
                      <td className="px-3 py-4">
                        <span
                          className={`flex justify-center px-3 py-1 rounded-full text-xs font-medium text-center shadow-sm border ${getStatusColor(
                            record.status
                          )}`}
                        >
                          {
                            record.status === "Completed Investigate"
                              ? "Completed" : record.status
                          }

                        </span>
                      </td>
                      <td className="flex flex-row px-3 py-4 bg-gray-50 w-fit">
                        <div className="flex flex-col items-center justify-center space-x-2">
                          <button
                            onClick={() => handleRouter(record.id)}
                            className="p-2 text-blue-600  hover:scale-110 rounded-lg cursor-pointer"
                            title="ดูรายละเอียด"
                          >
                            <LordIcon
                              src="https://cdn.lordicon.com/hmpomorl.json"
                              trigger="hover"
                              colors="primary:#151a17,secondary:#4fd19b"
                              style={{ width: "28px", height: "28px" }}
                            />
                          </button>
                          <span className="text-xs text-gray-600">เปิด</span>
                        </div>
                        <div className="flex flex-col items-center justify-center space-x-2">
                          <button
                            onClick={() => handleVoided(record.id)}
                            className="p-2 text-blue-600  hover:scale-110 rounded-lg cursor-pointer"
                            title="ลบรายการนี้"
                          >
                            <LordIcon
                              src="https://cdn.lordicon.com/jzinekkv.json"
                              trigger="hover"
                              colors="primary:#242424,secondary:#c71f16"
                              style={{ width: "28px", height: "28px" }}
                            />
                          </button>
                          <span className="text-xs text-gray-600">ลบ</span>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="lg:hidden space-y-4 p-4">
            {loading
              ? Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                    <div className="flex space-x-2">
                      <div className="h-8 bg-gray-200 rounded w-16"></div>
                      <div className="h-8 bg-gray-200 rounded w-12"></div>
                    </div>
                  </div>
                </div>
              ))
              : currentRecords.map((record) => {
                const priorityInfo = getPriorityIcon(record.priority);
                return (
                  <div key={record.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{record.id}</h3>
                        <p className="text-sm text-gray-500">
                          {record.date ? formatDate(record.date) : "ไม่ระบุ"}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${priorityInfo.bgColor
                          } ${priorityInfo.color
                          } ${priorityInfo.borderColor
                          }`}
                      >
                        <span className="mr-1">{priorityInfo.icon}</span>
                        {priorityInfo.label}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="mb-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="font-semibold text-indigo-600">ลูกค้า:</span>
                          <p className="text-gray-900 text-xs border-b-1 w-fit">{record.customer || "ไม่ระบุ"}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-indigo-600">ผู้รายงาน:</span>
                          <p className="text-gray-900 text-xs border-b-1 w-fit">{record.reporter || "ไม่ระบุ"}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="font-semibold text-indigo-600">สำนักงาน/ศูนย์:</span>
                          <p className="text-gray-900 text-xs border-b-1 w-fit">{record.site || "ไม่ระบุ"}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-indigo-600">ทะเบียนรถ:</span>
                          <p className="text-gray-900 text-xs border-b-1 w-fit">{record.plateNumber || "ไม่ระบุ"}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="font-semibold text-indigo-600">มูลค่าความเสียหายประมาณการ:</span>
                          <p className="text-gray-900 text-xs border-b-1 w-fit">{record.estimated_cost != null ? Number(record.estimated_cost).toLocaleString() : "-"}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-indigo-600">มูลค่าความเสียหายจริง:</span>
                          <p className="text-gray-900 text-xs border-b-1 w-fit">{record.actual_price != null ? Number(record.actual_price).toLocaleString() : "-"}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="font-semibold text-indigo-600">พนักงานขับรถ:</span>
                          <p className="text-gray-900 text-xs border-b-1 w-fit">{record.driver || "ไม่ระบุ"}</p>
                        </div>
                        {record.location && (
                          <div>
                            <span className="font-semibold text-indigo-600">สถานที่:</span>
                            <p className="text-gray-900 text-xs border-b-1 w-fit">{record.location}</p>
                          </div>
                        )}
                      </div>

                      {record.description && (
                        <div>
                          <span className="font-semibold text-indigo-600">รายละเอียด:</span>
                          <p className="text-gray-900 text-xs mt-1 border-1 p-1 w-fit">{record.description}</p>
                        </div>
                      )}


                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-2 mt-4 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleRouter(record.id)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors shadow-sm hover:shadow-md flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        แก้ไข
                      </button>
                      <button
                        onClick={() => handleVoided(record.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors shadow-sm hover:shadow-md flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        ลบ
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

        </div>
      </div>
    </div>
  );
};
