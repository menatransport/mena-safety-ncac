"use client";
import React, { useState, useEffect } from "react";
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
import { SearchableSelect } from "./ui/searchable-select";
import { Calendar as CalendarComponent } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface NCRecord {
  id: string;
  date: string;
  customer: string;
  reporter: string;
  site: string;
  department: string;
  plateNumber: string;
  driver: string;
  priority: string;
  status: string;
  description: string;
  location: string;
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

type DateRangePreset = "custom" | "7days" | "3days" | "week" | "month";

type SortConfig = {
  key: keyof NCRecord | null;
  direction: "asc" | "desc";
};

export const NCRecordsComponent = () => {
  const [records, setRecords] = useState<NCRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const recordsPerPage = 10;
  const router = useRouter();

  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "date",
    direction: "desc",
  });

  // Filter states
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({});
  const [dateRangePreset, setDateRangePreset] =
    useState<DateRangePreset>("custom");
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [dropdownData, setDropdownData] = useState<{
    sites: any[];
    drivers: any[];
    documentNumbers: string[];
  }>({
    sites: [],
    drivers: [],
    documentNumbers: [],
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

        setDropdownData({
          sites: sitesData,
          drivers: driversData,
          documentNumbers: [],
        });

        fetchDocumentNumbers();
      } catch (error) {
        console.error("Error fetching dropdown data:", error);
      }
    };

    const fetchDocumentNumbers = async () => {
      try {
        const response = await fetch("/api/document/nc");
        if (response.ok) {
          const data = await response.json();
          const docNumbers = data
            .map((record: any) => record.document_no || record.id)
            .filter((doc: string) => doc);

          setDropdownData((prev) => ({
            ...prev,
            documentNumbers: [...new Set(docNumbers)] as string[], // Remove duplicates
          }));
        }
      } catch (error) {
        console.error("Error fetching document numbers:", error);
      }
    };

    fetchDropdownData();
  }, []);

  useEffect(() => {
    handleDatePresetChange("7days");
  }, []);

  useEffect(() => {
    if (filterCriteria.start_date) {
      handleSearch();
    }
  }, [filterCriteria]);

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split("T")[0].split("-");
    const [hours, minutes, seconds] = dateString
      .split("T")[1]
      .split(".")[0]
      .split(":");
    return `${day}/${month}/${year}, ${hours}:${minutes}`;
  };

  // Helper function to format date in local timezone (YYYY-MM-DD)
  const formatDateToLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getDateRange = (preset: DateRangePreset) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (preset) {
      case "3days":
        const threeDaysAgo = new Date(today);
        threeDaysAgo.setDate(today.getDate() - 3);
        return {
          start_date: formatDateToLocal(threeDaysAgo),
          end_date: formatDateToLocal(today),
        };

      case "7days":
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        return {
          start_date: formatDateToLocal(sevenDaysAgo),
          end_date: formatDateToLocal(today),
        };

      case "week":
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return {
          start_date: formatDateToLocal(startOfWeek),
          end_date: formatDateToLocal(endOfWeek),
        };

      case "month":
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
          start_date: formatDateToLocal(startOfMonth),
          end_date: formatDateToLocal(endOfMonth),
        };

      default:
        return {};
    }
  };

  const handleDatePresetChange = (preset: DateRangePreset) => {
    setDateRangePreset(preset);
    if (preset !== "custom") {
      const dateRange = getDateRange(preset);
      setFilterCriteria((prev) => ({
        ...prev,
        ...dateRange,
      }));
    }
  };

  // Search function
  const handleSearch = async () => {
    setLoading(true);
    setCurrentPage(1);
    try {
      const params = new URLSearchParams();

      Object.entries(filterCriteria).forEach(([key, value]) => {
        if (value && value.toString().trim()) {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/document/nc?${params.toString()}`);

      if (response.ok) {
        const data = await response.json();
        const transformedRecords = data.map((record: any) => ({
          id: record.document_no,
          date: record.record_date,
          customer: record.client,
          reporter: record.reporter,
          priority: record.priority,
          site: record.site,
          department: record.department,
          plateNumber: record.vehicle_truckno,
          driver: record.driver,
          status: record.casestatus,
          description: record.case_details,
          location: record.case_location,
        }));

        setRecords(transformedRecords);
      } else {
        console.error("Search failed");
      }
    } catch (error) {
      console.error("Error searching records:", error);
    } finally {
      setLoading(false);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setFilterCriteria({});
    setDateRangePreset("7days");
    handleDatePresetChange("7days"); // Reset to 7 days back
  };

  // Sort function
  const handleSort = (key: keyof NCRecord) => {
    let direction: "asc" | "desc" = "asc";

    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }

    setSortConfig({ key, direction });
  };

  // Get sort icon
  const getSortIcon = (key: keyof NCRecord) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown size={14} className="text-gray-400" />;
    }

    if (sortConfig.direction === "asc") {
      return <ArrowUp size={14} className="text-blue-600" />;
    } else {
      return <ArrowDown size={14} className="text-blue-600" />;
    }
  };

  // Sort records
  const sortedRecords = React.useMemo(() => {
    const sortableRecords = [...records];

    if (sortConfig.key) {
      sortableRecords.sort((a, b) => {
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];

        // Handle date sorting
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

  // Filter records
  const filteredRecords = sortedRecords.filter((record) => {
    const matchesSearch =
      record.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.description.toLowerCase().includes(searchTerm.toLowerCase());

    // Filter by status using filterCriteria
    const matchesStatus =
      !filterCriteria.casestatus ||
      filterCriteria.casestatus
        .split(",")
        .map((s) => s.trim())
        .includes(record.status);

    // Filter by priority using filterCriteria
    const matchesPriority =
      !filterCriteria.priority ||
      filterCriteria.priority
        .split(",")
        .map((p) => p.trim())
        .includes(record.priority);

    // Filter by site using filterCriteria
    const matchesSite =
      !filterCriteria.site_id ||
      filterCriteria.site_id
        .split(",")
        .map((s) => s.trim())
        .includes(record.site);

    // Filter by driver using filterCriteria
    const matchesDriver =
      !filterCriteria.driver_id ||
      filterCriteria.driver_id
        .split(",")
        .map((d) => d.trim())
        .includes(record.driver);

    // Filter by document number using filterCriteria
    const matchesDocumentNo =
      !filterCriteria.document_no ||
      filterCriteria.document_no
        .split(",")
        .map((d) => d.trim())
        .some((docNo) => record.id.toLowerCase().includes(docNo.toLowerCase()));

    return (
      matchesSearch &&
      matchesStatus &&
      matchesPriority &&
      matchesSite &&
      matchesDriver &&
      matchesDocumentNo
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = filteredRecords.slice(startIndex, endIndex);
  const getStatusColor = (status: string) => {
    switch (status) {
      case "canceled":
        return "bg-red-100 text-red-800 border-red-200";
      case "OPEN":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "completed":
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

    // const selectedRecord = records.find((record) => record.id === id);

    // localStorage.setItem("editingRecord", JSON.stringify(selectedRecord));

    window.open(`/nc-form?doc=${id}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#eef8ef] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Filter Section */}
        <div className="bg-white z-[10] relative backdrop-blur-md rounded-2xl shadow-xl border border-white/30 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Filter size={24} />
              ตัวกรองข้อมูล
            </h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden bg-gray-200 hover:bg-gray-300 p-2 rounded-lg transition-colors"
            >
              <ChevronDown size={20} />
            </button>
          </div>

          <div
            className={`space-y-6 ${showFilters ? "block" : "hidden md:block"}`}
          >
            {/* Date Range Preset Buttons */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Calendar size={16} />
                ช่วงเวลา (Date Range)
              </label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { key: "3days", label: "3 วันย้อนหลัง" },
                    { key: "7days", label: "7 วันย้อนหลัง" },
                    { key: "week", label: "สัปดาห์นี้" },
                    { key: "month", label: "เดือนนี้" },
                    { key: "custom", label: "กำหนดเอง" },
                  ] as Array<{ key: DateRangePreset; label: string }>
                ).map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => handleDatePresetChange(preset.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      dateRangePreset === preset.key
                        ? "border-1 border-emerald-500 bg-green-100 shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105 border border-gray-300"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Range (แสดงเมื่อเลือก กำหนดเอง) */}
            {dateRangePreset === "custom" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Calendar size={16} />
                    วันที่เริ่มต้น
                  </label>
                  <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                    <PopoverTrigger asChild>
                      <button className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-left flex items-center justify-between">
                        <span
                          className={
                            filterCriteria.start_date
                              ? "text-gray-900"
                              : "text-gray-500"
                          }
                        >
                          {filterCriteria.start_date || "เลือกวันที่เริ่มต้น"}
                        </span>
                        <Calendar size={16} className="text-gray-400" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0 z-[10]"
                      align="start"
                      style={{ zIndex: 10 }}
                    >
                      <CalendarComponent
                        mode="single"
                        selected={
                          filterCriteria.start_date
                            ? new Date(filterCriteria.start_date)
                            : undefined
                        }
                        onSelect={(date) => {
                          if (date) {
                            setFilterCriteria((prev) => ({
                              ...prev,
                              start_date: formatDateToLocal(date),
                            }));
                          }
                          setStartDateOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Calendar size={16} />
                    วันที่สิ้นสุด
                  </label>
                  <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                    <PopoverTrigger asChild>
                      <button className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-left flex items-center justify-between">
                        <span
                          className={
                            filterCriteria.end_date
                              ? "text-gray-900"
                              : "text-gray-500"
                          }
                        >
                          {filterCriteria.end_date || "เลือกวันที่สิ้นสุด"}
                        </span>
                        <Calendar size={16} className="text-gray-400" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0 z-[10]"
                      align="start"
                      style={{ zIndex: 10 }}
                    >
                      <CalendarComponent
                        mode="single"
                        selected={
                          filterCriteria.end_date
                            ? new Date(filterCriteria.end_date)
                            : undefined
                        }
                        onSelect={(date) => {
                          if (date) {
                            setFilterCriteria((prev) => ({
                              ...prev,
                              end_date: formatDateToLocal(date),
                            }));
                          }
                          setEndDateOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            {/* Main Filter Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Document Number */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  เลขที่เอกสาร
                </label>
                <SearchableSelect
                  options={dropdownData.documentNumbers.map((doc) => ({
                    value: doc,
                    label: doc,
                  }))}
                  value={filterCriteria.document_no || ""}
                  onChange={(value) =>
                    setFilterCriteria((prev) => ({
                      ...prev,
                      document_no: value.toString(),
                    }))
                  }
                  onAddFilter={(value) => {
                    const currentValue = filterCriteria.document_no || "";
                    const currentItems = currentValue
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean);
                    const newValue = value.toString();

                    if (!currentItems.includes(newValue)) {
                      const updatedItems = [...currentItems, newValue];
                      setFilterCriteria((prev) => ({
                        ...prev,
                        document_no: updatedItems.join(", "),
                      }));
                    }
                  }}
                  placeholder="ค้นหาเลขที่เอกสาร..."
                />
              </div>

              {/* Site Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  ศูนย์ปฏิบัติการ (Site)
                </label>
                <SearchableSelect
                  options={
                    dropdownData.sites?.map((site: any) => ({
                      value: site.site_id?.toString() || "",
                      label:
                        site.site_name_th || site.site_name || "ไม่ระบุชื่อ",
                    })) || []
                  }
                  value={filterCriteria.site_id || ""}
                  onChange={(value) =>
                    setFilterCriteria((prev) => ({
                      ...prev,
                      site_id: value.toString(),
                    }))
                  }
                  onAddFilter={(value) => {
                    const currentValue = filterCriteria.site_id || "";
                    const currentItems = currentValue
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean);
                    const newValue = value.toString();

                    if (!currentItems.includes(newValue)) {
                      const updatedItems = [...currentItems, newValue];
                      setFilterCriteria((prev) => ({
                        ...prev,
                        site_id: updatedItems.join(", "),
                      }));
                    }
                  }}
                  placeholder="เลือกศูนย์ปฏิบัติการ"
                />
              </div>

              {/* Driver Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  พนักงานขับรถ (Driver)
                </label>
                <SearchableSelect
                  options={
                    dropdownData.drivers?.map((driver: any) => ({
                      value: driver.driver_id?.toString() || "",
                      label:
                        `${driver.first_name || ""} ${
                          driver.last_name || ""
                        }`.trim() || "ไม่ระบุชื่อ",
                    })) || []
                  }
                  value={filterCriteria.driver_id || ""}
                  onChange={(value) =>
                    setFilterCriteria((prev) => ({
                      ...prev,
                      driver_id: value.toString(),
                    }))
                  }
                  onAddFilter={(value) => {
                    const currentValue = filterCriteria.driver_id || "";
                    const currentItems = currentValue
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean);
                    const newValue = value.toString();

                    if (!currentItems.includes(newValue)) {
                      const updatedItems = [...currentItems, newValue];
                      setFilterCriteria((prev) => ({
                        ...prev,
                        driver_id: updatedItems.join(", "),
                      }));
                    }
                  }}
                  placeholder="เลือกพนักงานขับรถ"
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  สถานะ (Status)
                </label>
                <SearchableSelect
                  options={[
                    { value: "OPEN", label: "เปิด (OPEN)" },
                    {
                      value: "In Progress",
                      label: "กำลังดำเนินการ (In Progress)",
                    },
                    { value: "Completed", label: "เสร็จสิ้น (Completed)" },
                    { value: "Canceled", label: "ยกเลิก (Canceled)" },
                  ]}
                  value={filterCriteria.casestatus || ""}
                  onChange={(value) =>
                    setFilterCriteria((prev) => ({
                      ...prev,
                      casestatus: value.toString(),
                    }))
                  }
                  onAddFilter={(value) => {
                    const currentValue = filterCriteria.casestatus || "";
                    const currentItems = currentValue
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean);
                    const newValue = value.toString();

                    if (!currentItems.includes(newValue)) {
                      const updatedItems = [...currentItems, newValue];
                      setFilterCriteria((prev) => ({
                        ...prev,
                        casestatus: updatedItems.join(", "),
                      }));
                    }
                  }}
                  placeholder="เลือกสถานะ"
                />
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  ระดับความรุนแรง (Priority)
                </label>
                <SearchableSelect
                  options={[
                    { value: "Minor", label: "🟡 Minor" },
                    { value: "Major", label: "🟠 Major" },
                    { value: "Crisis", label: "🔴 Crisis" },
                  ]}
                  value={filterCriteria.priority || ""}
                  onChange={(value) =>
                    setFilterCriteria((prev) => ({
                      ...prev,
                      priority: value.toString(),
                    }))
                  }
                  onAddFilter={(value) => {
                    const currentValue = filterCriteria.priority || "";
                    const currentItems = currentValue
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean);
                    const newValue = value.toString();

                    if (!currentItems.includes(newValue)) {
                      const updatedItems = [...currentItems, newValue];
                      setFilterCriteria((prev) => ({
                        ...prev,
                        priority: updatedItems.join(", "),
                      }));
                    }
                  }}
                  placeholder="เลือกระดับความรุนแรง"
                />
              </div>
            </div>
          </div>

          <div
            className={`flex flex-col sm:flex-row gap-3 mt-6 ${
              showFilters ? "block" : "hidden md:flex"
            }`}
          >
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <RefreshCw size={20} className="animate-spin" />
              ) : (
                <Search size={20} />
              )}
              {loading ? "กำลังค้นหา..." : "ค้นหาข้อมูล"}
            </button>
            <button
              onClick={clearFilters}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <RefreshCw size={20} />
              รีเซ็ต
            </button>
          </div>
        </div>

        {/* Records Table */}
        {/* Data Table */}
        <div className="bg-white backdrop-blur-md rounded-2xl shadow-xl border border-white/30 overflow-hidden relative">
          <div className="p-4 bg-gray-500 border-b border-gray-200">
            <h2 className="text-xl text-white font-semibold">
              ข้อมูล NC Records
              {dateRangePreset !== "custom" && (
                <span className="text-sm font-normal ml-2 bg-emerald-600 px-2 py-1 rounded">
                  {dateRangePreset === "3days" && "3 วันย้อนหลัง"}
                  {dateRangePreset === "7days" && "7 วันย้อนหลัง"}
                  {dateRangePreset === "week" && "สัปดาห์นี้"}
                  {dateRangePreset === "month" && "เดือนนี้"}
                </span>
              )}
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
              <button className="bg-emerald-600 border border-white hover:bg-emerald-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl">
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
                    className="px-6 py-4 text-left text-sm font-medium text-gray-600 cursor-pointer hover:scale-105 transition-colors"
                    onClick={() => handleSort("id")}
                  >
                    <div className="flex items-center gap-2">
                      <span>เลขที่เอกสาร</span>
                      {getSortIcon("id")}
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-sm font-medium text-gray-600 cursor-pointer hover:scale-105 transition-colors"
                    onClick={() => handleSort("date")}
                  >
                    <div className="flex items-center gap-2">
                      <span>วันที่และเวลารายงาน</span>
                      {getSortIcon("date")}
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-sm font-medium text-gray-600 cursor-pointer hover:scale-105 transition-colors"
                    onClick={() => handleSort("customer")}
                  >
                    <div className="flex items-center gap-2">
                      <span>ลูกค้า</span>
                      {getSortIcon("customer")}
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-sm font-medium text-gray-600 cursor-pointer hover:scale-105 transition-colors"
                    onClick={() => handleSort("reporter")}
                  >
                    <div className="flex items-center gap-2">
                      <span>ชื่อผู้แจ้ง</span>
                      {getSortIcon("reporter")}
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-sm font-medium text-gray-600 cursor-pointer hover:scale-105 transition-colors"
                    onClick={() => handleSort("site")}
                  >
                    <div className="flex items-center gap-2">
                      <span>ศูนย์ปฏิบัติการ</span>
                      {getSortIcon("site")}
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-sm font-medium text-gray-600 cursor-pointer hover:scale-105 transition-colors"
                    onClick={() => handleSort("department")}
                  >
                    <div className="flex items-center gap-2">
                      <span>ฝ่าย</span>
                      {getSortIcon("department")}
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-sm font-medium text-gray-600 cursor-pointer hover:scale-105 transition-colors"
                    onClick={() => handleSort("driver")}
                  >
                    <div className="flex items-center gap-2">
                      <span>ชื่อคนขับ</span>
                      {getSortIcon("driver")}
                    </div>
                  </th>

                  <th
                    className="px-4 py-4 text-left text-sm font-medium text-gray-600 cursor-pointer hover:scale-105 transition-colors"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-2">
                      <span>สถานะ</span>
                      {getSortIcon("status")}
                    </div>
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-medium text-gray-600">
                    <span>ดูรายละเอียด</span>
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
                        <td className="px-6 py-4 text-xs font-medium text-gray-800">
                          <div className="flex items-center gap-2">
                            <div
                              className={`flex items-center justify-center w-6 h-6 rounded-full ${
                                getPriorityIcon(record.priority).bgColor
                              } ${
                                getPriorityIcon(record.priority).borderColor
                              } border`}
                            >
                              <span className="text-sm">
                                {getPriorityIcon(record.priority).icon}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium">{record.id}</span>
                              <span
                                className={`text-xs ${
                                  getPriorityIcon(record.priority).color
                                } font-medium`}
                              >
                                {getPriorityIcon(record.priority).label}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-600">
                          {formatDate(record.date)}
                        </td>
                        <td
                          className="px-6 py-4 text-xs text-gray-600 max-w-[140px] truncate"
                          title={record.customer || "ไม่ระบุ"}
                        >
                          {record.customer || "ไม่ระบุ"}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-600">
                          {record.reporter || "ไม่ระบุ"}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-600">
                          {record.site || "ไม่ระบุ"}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-600">
                          {record.department || "ไม่ระบุ"}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-600  max-w-[140px] truncate">
                          {record.driver || "ไม่ระบุ"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium text-center min-w-[100px] shadow-sm border ${getStatusColor(
                              record.status
                            )}`}
                          >
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 bg-gray-50 w-32">
                          <div className="flex flex-col items-center justify-center space-x-2">
                            <button
                              onClick={() => handleRouter(record.id)}
                              className="p-2 text-blue-600  hover:scale-110 rounded-lg"
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
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
