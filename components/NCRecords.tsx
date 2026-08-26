"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { LordIcon } from "./LordIcon";
import {
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { RecordFilter, RecordFilterResult, RecordFilterRef } from "./ui/record-filter";
import { ColumnFilterDropdown, ColumnFilterOption } from "./ui/column-filter-dropdown";
import Swal from "sweetalert2";
import { documentRole } from "@/lib/documentRole";
import { useUiTheme } from "@/lib/useUiTheme";

interface NCRecord {
  id: string;
  date: string;
  client_name: string;
  reporter_name: string;
  site_name: string;
  department_name: string;
  plateNumber: string;
  driver_name: string;
  priority: string;
  status: string;
  description: string;
  location: string;
  origin_name: string;
  destination: string;
  estimated_cost: number;
  actual_price: number;
  incident_date: string;
  driver_role_name: string;
  vehicle_head_plate: string;
  vehicle_tail_plate: string;
  breakdown_status: string;
  incident_cause: string;
  claim_type: string;
  company_cost: number;
  driver_cost: number;
  insurance_claim: number;
  product_resellable: number;
  remaining_damage_cost: number;
  products?: any[];
}

interface FilterCriteria {
  start_date?: string;
  end_date?: string;
  document_no?: string;
  vehicle_plate?: string;
}

interface ColumnFilters {
  casestatus: string[];
  priority: string[];
  site_id: string[];
  department_id: string[];
  driver_id: string[];
  client_id: string[];
}

const EMPTY_COLUMN_FILTERS: ColumnFilters = {
  casestatus: [],
  priority: [],
  site_id: [],
  department_id: [],
  driver_id: [],
  client_id: [],
};

const STATUS_OPTIONS: ColumnFilterOption[] = [
  { value: "Pending", label: "🟡 Pending" },
  { value: "Completed Investigate", label: "🟢 Completed" },
  { value: "Voided", label: "🔴 Voided" },
];

const PRIORITY_OPTIONS: ColumnFilterOption[] = [
  { value: "Minor", label: "🟡 Minor" },
  { value: "Major", label: "🟠 Major" },
  { value: "Crisis", label: "🔴 Crisis" },
];

export const NCRecordsComponent = () => {
  const [records, setRecords] = useState<NCRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const router = useRouter();
  const filterRef = useRef<RecordFilterRef>(null);
  const { theme } = useUiTheme();

  // Pagination / sorting state (server-side now)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState("record_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Filter states
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>(EMPTY_COLUMN_FILTERS);
  const prevFilterKeyRef = useRef<string>("");
  // RecordFilter applies its default date range on mount; skip the very first
  // fetch until that lands, so we don't briefly fetch/show an unfiltered page.
  const [filterReady, setFilterReady] = useState(false);

  const [dropdownData, setDropdownData] = useState<{
    sites: any[];
    drivers: any[];
    departments: any[];
    clients: any[];
    plates: { plate_no: string }[];
  }>({
    sites: [],
    drivers: [],
    departments: [],
    clients: [],
    plates: [],
  });

  const loadDrivers = useCallback(async () => {
    if (dropdownData.drivers.length > 0) return;
    try {
      const res = await fetch("/api/list", { headers: { "X-Api-Path": "/masterdrivers" } });
      const data = await res.json();
      const sorted = data.sort((a: any, b: any) => {
        const nameA = `${a.first_name || ""} ${a.last_name || ""}`.trim().toLowerCase();
        const nameB = `${b.first_name || ""} ${b.last_name || ""}`.trim().toLowerCase();
        return nameA.localeCompare(nameB, 'th');
      });
      setDropdownData((prev) => ({ ...prev, drivers: sorted }));
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  }, [dropdownData.drivers.length]);

  const loadClients = useCallback(async () => {
    if (dropdownData.clients.length > 0) return;
    try {
      const res = await fetch("/api/list", { headers: { "X-Api-Path": "/clients" } });
      const data = await res.json();
      const sorted = (data || []).filter((c: any) => c.client_id !== 0).sort((a: any, b: any) => {
        return (a.client_name || "").localeCompare(b.client_name || "", 'th');
      });
      setDropdownData((prev) => ({ ...prev, clients: sorted }));
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  }, [dropdownData.clients.length]);

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const responses = await Promise.all([
          fetch("/api/list", {
            headers: { "X-Api-Path": "/sites" },
          }),
          fetch("/api/list", {
            headers: { "X-Api-Path": "/departments" },
          }),
        ]);

        const [sitesData, departmentsData] = await Promise.all(
          responses.map((res) => res.json())
        );

        const sortedSites = sitesData.sort((a: any, b: any) => {
          const nameA = (a.site_name_th || a.site_name || "").toLowerCase();
          const nameB = (b.site_name_th || b.site_name || "").toLowerCase();
          return nameA.localeCompare(nameB, 'th');
        });

        const sortedDepartments = departmentsData.sort((a: any, b: any) => {
          const nameA = (a.department_name_th || a.department_name || "").toLowerCase();
          const nameB = (b.department_name_th || b.department_name || "").toLowerCase();
          return nameA.localeCompare(nameB, 'th');
        });

        const filteredDepartments = sortedDepartments.filter((dept: any) => {
          return dept.department_id == 3 || dept.department_id == 15 || dept.department_id == 16 || dept.department_id == 17 || dept.department_id == 19 || dept.department_id == 20
        });

        setDropdownData((prev) => ({
          ...prev,
          sites: sortedSites,
          departments: filteredDepartments,
        }));


      } catch (error) {
        console.error("Error fetching dropdown data:", error);
      }
    };

    fetchDropdownData();
    // Column filter dropdowns need options up-front (no lazy onOpen), so load eagerly on mount.
    loadDrivers();
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = useCallback((filters: RecordFilterResult) => {
    const key = JSON.stringify(filters);
    const changed = prevFilterKeyRef.current !== "" && prevFilterKeyRef.current !== key;
    const isFirst = prevFilterKeyRef.current === "";
    prevFilterKeyRef.current = key;
    setFilterCriteria(filters);
    setFilterReady(true);
    // Only jump back to page 1 when the filter actually changed (a triggerSearch()
    // refresh after void must keep the current page, not reset it).
    if (changed || isFirst) setPage(1);
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("T")[0].split("-");
    const [hours, minutes] = dateString
      .split("T")[1]
      .split(".")[0]
      .split(":");
    return `${day}/${month}/${year}, ${hours}:${minutes}`;
  };

  const transformRecords = (items: any[]): NCRecord[] =>
    items.map((record: any) => ({
      id: record.document_no,
      date: record.record_date,
      incident_date: record.incident_date,
      client_name: record.client_name,
      reporter_name: record.reporter_name,
      priority: record.priority,
      status: record.casestatus,
      products: record.products,
      site_name: record.site_name,
      department_name: record.department_name,
      plateNumber: record.vehicle_truckno,
      driver_name: record.driver_name,
      driver_role_name: record.driver_role_name,
      vehicle_head_plate: record.vehicle_head_plate,
      vehicle_tail_plate: record.vehicle_tail_plate,
      incident_cause: record.incident_cause,
      breakdown_status: record.breakdown_status,
      description: record.case_details,
      location: record.case_location,
      origin_name: record.origin_name,
      destination: record.destination,
      actual_price: record.actual_price,
      estimated_cost: record.estimated_cost,
      claim_type: record.investigation?.claim_type,
      company_cost: record.investigation?.company_cost,
      driver_cost: record.investigation?.driver_cost,
      insurance_claim: record.investigation?.insurance_claim,
      product_resellable: record.investigation?.product_resellable,
      remaining_damage_cost: record.investigation?.remaining_damage_cost,
    }));

  const buildQueryParams = useCallback((pageArg: number, pageSizeArg: number) => {
    const params = new URLSearchParams();
    if (filterCriteria.start_date) params.append("start_date", filterCriteria.start_date);
    if (filterCriteria.end_date) params.append("end_date", filterCriteria.end_date);
    if (filterCriteria.document_no) params.append("document_no", filterCriteria.document_no);
    if (filterCriteria.vehicle_plate) params.append("vehicle_plate", filterCriteria.vehicle_plate);

    columnFilters.casestatus.forEach((v) => params.append("casestatus", v));
    columnFilters.priority.forEach((v) => params.append("priority", v));
    columnFilters.site_id.forEach((v) => params.append("site_id", v));
    columnFilters.department_id.forEach((v) => params.append("department_id", v));
    columnFilters.driver_id.forEach((v) => params.append("driver_id", v));
    columnFilters.client_id.forEach((v) => params.append("client_id", v));

    params.append("page", String(pageArg));
    params.append("page_size", String(pageSizeArg));
    params.append("sort_by", sortBy);
    params.append("sort_order", sortOrder);
    return params;
  }, [filterCriteria, columnFilters, sortBy, sortOrder]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildQueryParams(page, pageSize);
      const response = await fetch(`/api/record/nc?${params.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        const transformedRecords = transformRecords(data.items || []);
        setRecords(transformedRecords);
        setTotalRecords(data.total ?? 0);
        setTotalPages(data.total_pages ?? 1);

        const allPlates = new Set<string>();
        transformedRecords.forEach((r: NCRecord) => {
          if (r.plateNumber) allPlates.add(r.plateNumber);
          if (r.vehicle_head_plate) allPlates.add(r.vehicle_head_plate);
          if (r.vehicle_tail_plate) allPlates.add(r.vehicle_tail_plate);
        });
        setDropdownData((prev) => ({
          ...prev,
          plates: [...allPlates].sort().map((p) => ({ plate_no: p })),
        }));
      } else {
        console.error("Search failed");
      }
    } catch (error) {
      console.error("Error searching records:", error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildQueryParams, page, pageSize]);

  useEffect(() => {
    if (!filterReady) return;
    fetchRecords();
  }, [fetchRecords, filterReady]);

  const handleColumnFilterApply = (key: keyof ColumnFilters) => (values: string[]) => {
    setColumnFilters((prev) => ({ ...prev, [key]: values }));
    setPage(1);
  };

  const handleHeaderSort = (key: string) => {
    setSortOrder(sortBy === key && sortOrder === "asc" ? "desc" : "asc");
    setSortBy(key);
  };

  const getSortIcon = (key: string) => {
    if (sortBy !== key) {
      return <ArrowUpDown size={14} className="text-gray-400" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp size={14} className="text-blue-600" />
    ) : (
      <ArrowDown size={14} className="text-blue-600" />
    );
  };

  // Distinct value lists for the column filter dropdowns
  const siteOptions: ColumnFilterOption[] = useMemo(
    () =>
      dropdownData.sites.map((s: any) => ({
        value: s.site_id?.toString() || "",
        label: s.site_name_th || s.site_name || "ไม่ระบุชื่อ",
      })),
    [dropdownData.sites]
  );

  const departmentOptions: ColumnFilterOption[] = useMemo(
    () =>
      dropdownData.departments.map((d: any) => ({
        value: d.department_id?.toString() || "",
        label: d.department_name_th || d.department_name || "ไม่ระบุชื่อ",
      })),
    [dropdownData.departments]
  );

  const driverOptions: ColumnFilterOption[] = useMemo(
    () =>
      dropdownData.drivers.map((d: any) => ({
        value: d.driver_id?.toString() || "",
        label: `${d.first_name || ""} ${d.last_name || ""}`.trim() || "ไม่ระบุชื่อ",
      })),
    [dropdownData.drivers]
  );

  const clientOptions: ColumnFilterOption[] = useMemo(
    () =>
      dropdownData.clients.map((c: any) => ({
        value: c.client_id?.toString() || "",
        label: c.client_name || "ไม่ระบุชื่อ",
      })),
    [dropdownData.clients]
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Voided":
        return "bg-red-100 text-red-800 border-red-200";
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Completed":
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

    window.open(`/nc-form?doc=${id}`, "_blank");
  };

  const handleVoided = (id: string) => {

    const userData = localStorage.getItem("userData");
    if (!userData) {
      Swal.fire({
        title: "ไม่สามารถลบได้",
        text: "ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่",
        icon: "error"
      });
      return;
    }

    const parsedUserData = JSON.parse(userData);
    const currentUserName = `${parsedUserData.firstname || ""} ${parsedUserData.lastname || ""}`.trim();
    const currentDepartment = parsedUserData.department || "";

    const selectedRecord = records.find((record) => record.id === id);
    if (!selectedRecord) {
      Swal.fire({
        title: "ไม่พบรายการ",
        text: "ไม่พบรายการที่ต้องการลบ",
        icon: "error"
      });
      return;
    }

    if (documentRole(selectedRecord.department_name, selectedRecord.reporter_name, currentUserName, currentDepartment, selectedRecord.site_name)) {
      Swal.fire({
        title: "ไม่สามารถลบได้",
        text: "คุณไม่ใช่เจ้าของรายการนี้",
        icon: "error"
      });
      return;
    }

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
        const res = await fetch("/api/document/nc", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 'document_no': id, 'casestatus': 'Voided' }),
        });
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
    setIsExporting(true);
    try {
      const params = buildQueryParams(1, 5000);
      const response = await fetch(`/api/record/nc?${params.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        Swal.fire({
          title: "ไม่สำเร็จ!",
          text: "ไม่สามารถดึงข้อมูลสำหรับ Export ได้",
          icon: "error",
        });
        return;
      }

      const data = await response.json();

      if ((data.total_pages ?? 1) > 1) {
        Swal.fire({
          icon: "warning",
          title: "ข้อมูลมากเกินไป",
          text: "มีข้อมูลมากกว่า 5,000 รายการ กรุณาแคบช่วงวันที่หรือตัวกรองก่อน Export",
        });
        return;
      }

      const exportRecords = transformRecords(data.items || []);

      if (exportRecords.length === 0) {
        Swal.fire({
          title: "ไม่มีข้อมูล",
          text: "ไม่มีข้อมูลให้ Export",
          icon: "warning"
        });
        return;
      }

      const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

      const excelData = exportRecords.map(record => {
        let reportYear = '';
        let reportMonth = '';
        let reportDate = '';
        let reportTime = '';

        if (record.date) {
          const date = new Date(record.date);
          reportYear = date.getFullYear().toString();
          reportMonth = thaiMonths[date.getMonth()];
          reportDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
          reportTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        }

        return {
          'เลขที่เอกสาร': record.id,
          'ปีที่บันทึกเหตุ': reportYear,
          'เดือนที่บันทึกเหตุ': reportMonth,
          'วันที่บันทึกเหตุ': reportDate,
          'เวลาที่บันทึกเหตุ': reportTime,
          'วันและเวลา เกิดเหตุ': record.incident_date ? formatDate(record.incident_date) : '',
          'ระดับความรุนแรง': record.priority || '',
          'สถานะ': record.status,
          'ลูกค้า': record.client_name || '',
          'ผู้รายงาน': record.reporter_name || '',
          'สำนักงาน/ศูนย์': record.site_name || '',
          'แผนก': record.department_name || '',
          'พนักงานขับรถ': record.driver_name || '',
          'ตำแหน่งพนักงานขับรถ': record.driver_role_name || '',
          'เบอร์รถ': record.plateNumber || '',
          'ทะเบียนรถหัว': record.vehicle_head_plate || '',
          'ทะเบียนรถท้าย': record.vehicle_tail_plate || '',
          'สถานะ breakdown': (record.breakdown_status || '') === 'มี breakdown' ? 'มี' : 'ไม่มี',
          'สาเหตุของเหตุการณ์': record.incident_cause || '',
          'รายละเอียด': record.description || '',
          'สถานที่เกิดเหตุ': record.location || '',
          'ต้นทาง': record.origin_name || '',
          'ปลายทาง': record.destination || '',
          'มูลค่าความเสียหายประมาณการ': record.estimated_cost != null ? Number(record.estimated_cost) : null,
          'มูลค่าความเสียหายจริง': record.actual_price != null ? Number(record.actual_price) : null,
          'ประเภทการเคลม': record.claim_type || '',
          'ค่าใช้จ่ายบริษัท': record.company_cost != null ? Number(record.company_cost) : null,
          'ค่าใช้จ่ายพนักงานขับรถ': record.driver_cost != null ? Number(record.driver_cost) : null,
          'ประกันเคลม': record.insurance_claim != null ? Number(record.insurance_claim) : null,
          'ขายต่อ': record.product_resellable != null ? Number(record.product_resellable) : null,
          'ค่าความเสียหายที่เหลือ': record.remaining_damage_cost != null ? Number(record.remaining_damage_cost) : null,
        };
      });


      const productSheet = exportRecords.flatMap(record => {
        return record.products?.map((product: any) => ({
          'เลขที่เอกสาร': record.id,
          'ชื่อสินค้า': product.product_name || '',
          'จำนวน': product.amount || '',
          'หน่วย': product.unit || '',
          'มูลค่าความเสียหาย (บาท)': product.damage_value != null ? Number(product.damage_value) : null,
          'ผู้รับผิดชอบ': product.responsible_party || '',
          'สถานะรายงาน': record.status,
        })) || [];
      });

      const XLSX = await import('xlsx');

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'NC Records');
      const wsProducts = XLSX.utils.json_to_sheet(productSheet);
      XLSX.utils.book_append_sheet(wb, wsProducts, 'Products');

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
      const fileName = `NC_${dateStr}_${timeStr}.xlsx`;

      // Download file
      XLSX.writeFile(wb, fileName);

      Swal.fire({
        title: "สำเร็จ!",
        text: `Export ข้อมูล ${exportRecords.length} รายการเรียบร้อย`,
        icon: "success",
        timer: 2000
      });
    } catch (error) {
      console.error("Error exporting NC records:", error);
      Swal.fire({
        title: "ไม่สำเร็จ!",
        text: "เกิดข้อผิดพลาดระหว่าง Export",
        icon: "error"
      });
    } finally {
      setIsExporting(false);
    }
  }

  const extraFilterCount =
    (filterCriteria.document_no ? 1 : 0) +
    (filterCriteria.vehicle_plate ? 1 : 0) +
    Object.values(columnFilters).reduce((sum, arr) => sum + (arr.length > 0 ? 1 : 0), 0);

  return (
    <div className={`min-h-screen ${theme === "Dark" ? "bg-gradient-to-br from-slate-800 via-slate-700 to-[#3d5578]" : "bg-[#d1ffe1]"} py-6`}>
      <div className="max-w-full m-4 mx-10">
        {/* Filter Section - Using new RecordFilter component */}
        <RecordFilter
          ref={filterRef}
          type="NC"
          onFilter={handleFilterChange}
          loading={loading}
          dropdownData={dropdownData}
          onLoadPlates={() => {}}
          className="mb-6 z-[10] relative"
        />

        {/* Records Table */}
        {/* Data Table */}
        <div className="bg-white backdrop-blur-md rounded-2xl shadow-xl border border-white/30 overflow-hidden relative">
          <div className="p-4 bg-slate-700 border-b border-gray-200">
            <h2 className="text-xl text-white font-semibold">
              ข้อมูล NC Records
            </h2>
            <div className="text-white mt-1 space-y-1">
              <p>พบข้อมูล {totalRecords} รายการ</p>
              {filterCriteria.start_date && filterCriteria.end_date && (
                <p className="text-sm">
                  ช่วงวันที่: {filterCriteria.start_date} ถึง{" "}
                  {filterCriteria.end_date}
                </p>
              )}
              {extraFilterCount > 0 && (
                <p className="text-xs text-gray-200">
                  มีการใช้ตัวกรองเพิ่มเติม: {extraFilterCount} รายการ
                </p>
              )}
            </div>
            <div className="absolute top-4 right-4 flex flex-col sm:flex-row gap-2">
              <button
                onClick={exportToExcel}
                disabled={isExporting}
                className="bg-emerald-600 border border-white hover:bg-emerald-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <FileSpreadsheet size={20} />
                )}
                <span className="hidden sm:inline">Excel</span>
              </button>
            </div>
            <div className="flex flex-wrap justify-end items-center gap-3 text-sm text-gray-600">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 rounded border border-white/40 bg-slate-700 text-white text-xs focus:outline-none"
              >
                <option value={25}>25 / หน้า</option>
                <option value={50}>50 / หน้า</option>
                <option value={100}>100 / หน้า</option>
              </select>
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 border text-white rounded hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
              >
                ก่อนหน้า
              </button>
              <span className="text-gray-200">
                หน้า {page} จาก {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 border text-white rounded hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
              >
                ถัดไป
              </button>
            </div>
          </div>
          {/* Desktop View */}
          <div className="hidden lg:block overflow-x-auto overflow-y-auto max-h-[65vh]">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-200 shadow-sm">
                <tr>
                  <th className="border border-gray-300 px-3 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                    <div className="flex flex-col gap-1.5 min-w-32">
                      <div
                        className="flex items-center gap-2 cursor-pointer hover:text-emerald-700"
                        onClick={() => handleHeaderSort("document_no")}
                      >
                        <span>ID</span>
                        {getSortIcon("document_no")}
                      </div>
                      <ColumnFilterDropdown
                        label="Priority"
                        options={PRIORITY_OPTIONS}
                        selectedValues={columnFilters.priority}
                        onApply={handleColumnFilterApply("priority")}
                        sortDirection={sortBy === "priority" ? sortOrder : null}
                        onSort={(dir) => { setSortBy("priority"); setSortOrder(dir); }}
                      />
                    </div>
                  </th>
                  <th
                    className="border border-gray-300 px-4 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:text-emerald-700 transition-colors"
                    onClick={() => handleHeaderSort("record_date")}
                  >
                    <div className="flex items-center gap-2">
                      <span>Report date</span>
                      {getSortIcon("record_date")}
                    </div>
                  </th>
                  <th
                    className="border border-gray-300 px-4 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:text-emerald-700 transition-colors"
                    onClick={() => handleHeaderSort("incident_date")}
                  >
                    <div className="flex items-center gap-2">
                      <span>Incident date</span>
                      {getSortIcon("incident_date")}
                    </div>
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                    <ColumnFilterDropdown
                      label="Customer"
                      options={clientOptions}
                      selectedValues={columnFilters.client_id}
                      onApply={handleColumnFilterApply("client_id")}
                      sortDirection={sortBy === "client_name" ? sortOrder : null}
                      onSort={(dir) => { setSortBy("client_name"); setSortOrder(dir); }}
                    />
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                    <span>Reporter</span>
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                    <ColumnFilterDropdown
                      label="Site"
                      options={siteOptions}
                      selectedValues={columnFilters.site_id}
                      onApply={handleColumnFilterApply("site_id")}
                      sortDirection={sortBy === "site_name" ? sortOrder : null}
                      onSort={(dir) => { setSortBy("site_name"); setSortOrder(dir); }}
                    />
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                    <ColumnFilterDropdown
                      label="Dept."
                      options={departmentOptions}
                      selectedValues={columnFilters.department_id}
                      onApply={handleColumnFilterApply("department_id")}
                      sortDirection={sortBy === "department_name" ? sortOrder : null}
                      onSort={(dir) => { setSortBy("department_name"); setSortOrder(dir); }}
                    />
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                    <ColumnFilterDropdown
                      label="Driver"
                      options={driverOptions}
                      selectedValues={columnFilters.driver_id}
                      onApply={handleColumnFilterApply("driver_id")}
                      sortDirection={sortBy === "driver_name" ? sortOrder : null}
                      onSort={(dir) => { setSortBy("driver_name"); setSortOrder(dir); }}
                    />
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                    <span title="สาเหตุการเกิด">Cause</span>
                  </th>
                  <th
                    className="border border-gray-300 px-4 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:text-emerald-700 transition-colors"
                    onClick={() => handleHeaderSort("estimated_cost")}
                  >
                    <div className="flex items-center gap-2" title="มูลค่าความเสียหายประมาณการ">
                      <span>Est.</span>
                      {getSortIcon("estimated_cost")}
                    </div>
                  </th>
                  <th
                    className="border border-gray-300 px-4 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:text-emerald-700 transition-colors"
                    onClick={() => handleHeaderSort("actual_price")}
                  >
                    <div className="flex items-center gap-2" title="มูลค่าความเสียหายจริง">
                      <span>Act.</span>
                      {getSortIcon("actual_price")}
                    </div>
                  </th>

                  <th className="border border-gray-300 px-4 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                    <ColumnFilterDropdown
                      label="Status"
                      options={STATUS_OPTIONS}
                      selectedValues={columnFilters.casestatus}
                      onApply={handleColumnFilterApply("casestatus")}
                      sortDirection={sortBy === "casestatus" ? sortOrder : null}
                      onSort={(dir) => { setSortBy("casestatus"); setSortOrder(dir); }}
                    />
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                    <span></span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, index) => (
                    <tr key={`loading-${index}`} className="animate-pulse">
                      <td className="border border-gray-200 px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="border border-gray-200 px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="border border-gray-200 px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="border border-gray-200 px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-28"></div>
                      </td>
                      <td className="border border-gray-200 px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-28"></div>
                      </td>
                      <td className="border border-gray-200 px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-28"></div>
                      </td>
                      <td className="border border-gray-200 px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-28"></div>
                      </td>
                      <td className="border border-gray-200 px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-36"></div>
                      </td>
                      <td className="border border-gray-200 px-6 py-4">
                        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                      </td>
                      <td className="border border-gray-200 px-6 py-4 bg-gray-50">
                        <div className="flex justify-center gap-2">
                          <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
                          <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
                        </div>
                      </td>
                    </tr>
                  ))
                  : records.map((record) => (
                    <tr key={record.id} className="odd:bg-white even:bg-slate-50/60 hover:bg-gray-100 transition-colors">
                      <td className="border border-gray-200 px-3 py-4 text-xs font-medium text-gray-800">
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
                      <td className="border border-gray-200 px-3 py-4 text-xs text-gray-600">
                        {formatDate(record.date)}
                      </td>
                      <td className="border border-gray-200 px-3 py-4 text-xs text-gray-600">
                        {formatDate(record.incident_date)}
                      </td>
                      <td
                        className="border border-gray-200 px-3 py-4 text-xs text-gray-600 max-w-[100px] truncate"
                        title={record.client_name || "ไม่ระบุ"}
                      >
                        {record.client_name || "ไม่ระบุ"}
                      </td>
                      <td className="border border-gray-200 px-3 py-4 text-xs text-gray-600">
                        {record.reporter_name || "ไม่ระบุ"}
                      </td>
                      <td className="border border-gray-200 px-3 py-4 text-xs text-gray-600">
                        {record.site_name || "ไม่ระบุ"}
                      </td>
                      <td className="border border-gray-200 px-3 py-4 text-xs text-gray-600">
                        {record.department_name || "ไม่ระบุ"}
                      </td>
                      <td className="border border-gray-200 px-3 py-4 text-xs text-gray-600" >
                        {record.driver_name || "ไม่ระบุ"}
                      <p className="text-[9px]">{record.vehicle_head_plate} <span className="text-red-600 font-semibold">{record.breakdown_status == 'มี breakdown' ? 'breakdown' : ''}</span></p>
                      </td>
                      <td
                        className="border border-gray-200 px-3 py-4 text-xs text-gray-600 align-center max-w-[100px] whitespace-normal break-words leading-snug"
                        title={record.incident_cause || "ไม่ระบุ"}
                      >
                        {record.incident_cause || "ไม่ระบุ"}
                      </td>
                      <td className="border border-gray-200 px-3 py-4 text-xs text-gray-600">
                        {record.estimated_cost != null ? Number(record.estimated_cost).toLocaleString() : "-"}
                      </td>
                      <td className="border border-gray-200 px-3 py-4 text-xs text-gray-600">
                        {record.actual_price != null ? Number(record.actual_price).toLocaleString() : "-"}
                      </td>
                      <td className="border border-gray-200 px-3 py-4">
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
                      <td className="border border-gray-200 flex flex-row px-3 py-4 bg-gray-50 w-fit">
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
              : records.map((record) => {
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
                          <p className="text-gray-900 text-xs border-b-1 w-fit">{record.client_name || "ไม่ระบุ"}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-indigo-600">ผู้รายงาน:</span>
                          <p className="text-gray-900 text-xs border-b-1 w-fit">{record.reporter_name || "ไม่ระบุ"}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="font-semibold text-indigo-600">สำนักงาน/ศูนย์:</span>
                          <p className="text-gray-900 text-xs border-b-1 w-fit">{record.site_name || "ไม่ระบุ"}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-indigo-600">ทะเบียนรถ:</span>
                          <p className="text-gray-900 text-xs border-b-1 w-fit">{record.plateNumber || "ไม่ระบุ"} <span className="text-red-600 font-semibold">{record.breakdown_status == 'มี breakdown' ? 'breakdown' : ''}</span></p>
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
                          <p className="text-gray-900 text-xs border-b-1 w-fit">{record.driver_name || "ไม่ระบุ"}</p>
                        </div>
                        {record.location && (
                          <div>
                            <span className="font-semibold text-indigo-600">สถานที่:</span>
                            <p className="text-gray-900 text-xs mt-1 border-b-1 w-fit">{record.location}</p>
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="font-semibold text-indigo-600">สาเหตุการเกิด:</span>
                        <p className="text-gray-900 text-xs border-b-1 w-fit">{record.incident_cause || "ไม่ระบุ"}</p>
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
