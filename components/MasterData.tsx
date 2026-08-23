"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  Database,
  Plus,
  Search,
  Pencil,
  Trash2,
  RefreshCw,
  X,
  Loader2,
  Info,
  Lock,
  Inbox,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ListFilter,
  Check,
  FilterX,
  Columns3,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUiTheme } from "@/lib/useUiTheme";
import { useDropdownStore } from "@/lib/dropdownlist";
import {
  MASTER_CONFIGS,
  MasterConfig,
  MasterField,
  MasterRefSource,
  REF_SOURCES,
  canEditMasterData,
  masterRequest,
} from "@/lib/masterData";

const PAGE_SIZE = 10;
const MAX_FILTER_VALUES = 500;

const toast = (icon: "success" | "error", title: string) =>
  Swal.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    showConfirmButton: false,
    timer: 2400,
    timerProgressBar: true,
  });

interface ColumnMenuProps {
  field: MasterField;
  isDark: boolean;
  sortDir: "asc" | "desc" | null;
  selected?: string[];
  /** เรียกตอนเปิดเมนูเท่านั้น เพื่อดึงค่าที่เลือกได้ของคอลัมน์นี้ */
  getValues: () => string[];
  onSort: (dir: "asc" | "desc" | null) => void;
  onFilter: (values: string[] | null) => void;
}

/** เมนูหัวคอลัมน์: เรียงลำดับ + กรองค่าแบบ Excel */
const ColumnMenu: React.FC<ColumnMenuProps> = ({
  field,
  isDark,
  sortDir,
  selected,
  getValues,
  onSort,
  onFilter,
}) => {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");

  const values = useMemo(() => (open ? getValues() : []), [open, getValues]);
  const visibleValues = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    const list = key ? values.filter((v) => v.toLowerCase().includes(key)) : values;
    return list.slice(0, MAX_FILTER_VALUES);
  }, [values, keyword]);

  // ค่าเริ่มต้นคือไม่ติ๊กอะไรเลย (ไม่กรอง) — ติ๊กเฉพาะค่าที่ต้องการกรอง
  const picked = selected || [];
  const isFiltered = picked.length > 0;
  const isChecked = (value: string) => picked.includes(value);
  const allChecked = visibleValues.length > 0 && visibleValues.every(isChecked);

  const toggleValue = (value: string) => {
    const next = picked.includes(value)
      ? picked.filter((v) => v !== value)
      : [...picked, value];
    onFilter(next);
  };

  const toggleAll = () => {
    if (allChecked) {
      onFilter(picked.filter((v) => !visibleValues.includes(v)));
    } else {
      onFilter(Array.from(new Set([...picked, ...visibleValues])));
    }
  };

  const rowBtn = `w-full cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors ${
    isDark ? "text-white/70 hover:bg-white/10" : "text-slate-600 hover:bg-slate-100"
  }`;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setKeyword("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          className={`cursor-pointer inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors ${
            sortDir || isFiltered
              ? isDark
                ? "bg-indigo-500/25 text-indigo-300"
                : "bg-emerald-100 text-emerald-700"
              : isDark
              ? "text-white/30 hover:bg-white/10 hover:text-white/70"
              : "text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          }`}
          title="เรียงลำดับ / กรองข้อมูล"
        >
          {isFiltered ? (
            <ListFilter size={13} />
          ) : sortDir === "asc" ? (
            <ArrowUp size={13} />
          ) : sortDir === "desc" ? (
            <ArrowDown size={13} />
          ) : (
            <ChevronDown size={13} />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className={`w-64 p-2 normal-case tracking-normal ${
          isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"
        }`}
      >
        <div className="space-y-0.5">
          <button className={rowBtn} onClick={() => onSort(sortDir === "asc" ? null : "asc")}>
            <ArrowUp size={14} /> เรียงน้อย → มาก (ก–ฮ)
            {sortDir === "asc" && <Check size={14} className="ml-auto" />}
          </button>
          <button className={rowBtn} onClick={() => onSort(sortDir === "desc" ? null : "desc")}>
            <ArrowDown size={14} /> เรียงมาก → น้อย (ฮ–ก)
            {sortDir === "desc" && <Check size={14} className="ml-auto" />}
          </button>
        </div>

        <div className={`my-2 border-t ${isDark ? "border-white/10" : "border-slate-200"}`} />

        <div className="relative mb-2">
          <Search
            size={14}
            className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${
              isDark ? "text-white/30" : "text-slate-400"
            }`}
          />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={`ค้นหาใน${field.label}`}
            className={`w-full rounded-lg border py-1.5 pl-8 pr-2 text-xs outline-none ${
              isDark
                ? "bg-white/5 border-white/10 text-white placeholder:text-white/30"
                : "bg-white border-slate-200 text-slate-700 placeholder:text-slate-400"
            }`}
          />
        </div>

        <label
          className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold ${
            isDark ? "text-white/70 hover:bg-white/10" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <input type="checkbox" checked={allChecked} onChange={toggleAll} className="accent-current" />
          เลือกทั้งหมดที่แสดง
          {isFiltered && (
            <span className={`ml-auto font-normal ${isDark ? "text-white/40" : "text-slate-400"}`}>
              ติ๊กแล้ว {picked.length}
            </span>
          )}
        </label>

        <div className="max-h-52 overflow-y-auto pr-1">
          {visibleValues.length === 0 ? (
            <p className={`px-2 py-3 text-xs ${isDark ? "text-white/40" : "text-slate-400"}`}>
              ไม่พบค่าที่ตรงกัน
            </p>
          ) : (
            visibleValues.map((value) => (
              <label
                key={value}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${
                  isDark ? "text-white/60 hover:bg-white/10" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked(value)}
                  onChange={() => toggleValue(value)}
                  className="accent-current"
                />
                <span className="truncate">{value}</span>
              </label>
            ))
          )}
        </div>

        {values.length > MAX_FILTER_VALUES && (
          <p className={`px-2 pt-1 text-[11px] ${isDark ? "text-white/30" : "text-slate-400"}`}>
            แสดง {MAX_FILTER_VALUES} ค่าแรก — พิมพ์เพื่อค้นหาเพิ่มเติม
          </p>
        )}

        <div className={`mt-2 border-t pt-2 ${isDark ? "border-white/10" : "border-slate-200"}`}>
          <button
            className={rowBtn}
            onClick={() => {
              onFilter(null);
              onSort(null);
              setKeyword("");
            }}
          >
            <X size={14} /> ล้างตัวกรองคอลัมน์นี้
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

interface MasterDataProps {
  /** ชุดข้อมูลที่เลือกจากเมนู Master Data (storeKey) */
  type?: string;
}

export const MasterDataComponent: React.FC<MasterDataProps> = ({ type }) => {
  const { isDark } = useUiTheme();
  const setStoreData = useDropdownStore((s) => s.setData);

  const [rows, setRows] = useState<any[]>([]);
  const [refData, setRefData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [hiddenCols, setHiddenCols] = useState<Record<string, boolean>>({});
  const [canEdit, setCanEdit] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const config = useMemo(
    () => MASTER_CONFIGS.find((c) => c.storeKey === type) || MASTER_CONFIGS[0],
    [type]
  );

  const allowCreate = canEdit && config.actions?.create !== false;
  const allowUpdate = canEdit && config.actions?.update !== false;
  const allowDelete = canEdit && config.actions?.delete !== false;
  const showActionColumn = allowUpdate || allowDelete;
  const isLocked = !allowCreate && !allowUpdate && !allowDelete;
  const tableFields = useMemo(
    () => config.fields.filter((f) => hiddenCols[f.key] !== true),
    [config, hiddenCols]
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem("userData");
      setCanEdit(canEditMasterData(stored ? JSON.parse(stored) : null));
    } catch {
      setCanEdit(false);
    }
  }, []);

  const loadRows = useCallback(
    async (target: MasterConfig) => {
      setLoading(true);
      try {
        const data = await masterRequest("GET", target.apiPath);
        const list = Array.isArray(data) ? data : [];
        const sorted = [...list].sort((a, b) =>
          String(a?.[target.primaryKey] || "").localeCompare(String(b?.[target.primaryKey] || ""))
        );
        setRows(sorted);
        setStoreData({ [target.storeKey]: sorted } as any);
      } catch (error: any) {
        setRows([]);
        toast("error", error?.message || "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    },
    [setStoreData]
  );

  useEffect(() => {
    setSearch("");
    setPage(1);
    setSort(null);
    setFilters({});
    setHiddenCols(
      Object.fromEntries(config.fields.filter((f) => f.hideInTable).map((f) => [f.key, true]))
    );
    loadRows(config);
  }, [config, loadRows]);

  // โหลดตารางอ้างอิงของ field แบบ select (หน่วยงาน / ตำแหน่ง พขร.)
  useEffect(() => {
    const sources = Array.from(
      new Set(config.fields.map((f) => f.source).filter(Boolean))
    ) as MasterRefSource[];

    sources.forEach((source) => {
      if (refData[source]) return;
      masterRequest("GET", REF_SOURCES[source].apiPath)
        .then((data) =>
          setRefData((prev) => ({ ...prev, [source]: Array.isArray(data) ? data : [] }))
        )
        .catch(() => setRefData((prev) => ({ ...prev, [source]: [] })));
    });
  }, [config, refData]);

  const refLabel = (source: MasterRefSource, value: any) => {
    if (value === null || value === undefined || value === "") return "-";
    const meta = REF_SOURCES[source];
    const item = (refData[source] || []).find((i) => String(i[meta.idKey]) === String(value));
    if (!item) return `#${value}`;
    return meta.labelKeys.map((k) => item[k]).find(Boolean) || `#${value}`;
  };

  const cellValue = (row: any, field: MasterField) => {
    if (field.type === "select" && field.source) return refLabel(field.source, row[field.key]);
    if (field.type === "options") {
      const value = row[field.key];
      if (value === null || value === undefined || value === "") return "-";
      return field.options?.find((o) => o.value === String(value))?.label || String(value);
    }
    return row[field.key] || "-";
  };

  const searchedRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((row) =>
      config.fields.some((f) => String(cellValue(row, f)).toLowerCase().includes(keyword))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, config, refData]);

  /** แถวที่ผ่านตัวกรองของคอลัมน์อื่น (ใช้สร้างรายการค่าให้เลือกในเมนูคอลัมน์นั้น) */
  const rowsForColumn = useCallback(
    (skipKey?: string) => {
      const active = Object.entries(filters).filter(
        ([key, values]) => key !== skipKey && values && values.length > 0
      );
      if (active.length === 0) return searchedRows;
      return searchedRows.filter((row) =>
        active.every(([key, values]) => {
          const field = config.fields.find((f) => f.key === key);
          return field ? values.includes(String(cellValue(row, field))) : true;
        })
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, searchedRows, config, refData]
  );

  const filteredRows = useMemo(() => {
    const result = [...rowsForColumn()];
    if (!sort) return result;

    const field = config.fields.find((f) => f.key === sort.key);
    if (!field) return result;

    return result.sort((a, b) => {
      const valueA = String(cellValue(a, field));
      const valueB = String(cellValue(b, field));
      const numA = Number(valueA);
      const numB = Number(valueB);
      const compared =
        valueA !== "" && valueB !== "" && !isNaN(numA) && !isNaN(numB)
          ? numA - numB
          : valueA.localeCompare(valueB, "th");
      return sort.dir === "asc" ? compared : -compared;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsForColumn, sort, config, refData]);

  const activeFilterCount = Object.values(filters).filter((v) => v && v.length > 0).length;

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openCreate = () => {
    setEditingRow(null);
    setForm(Object.fromEntries(config.fields.map((f) => [f.key, ""])));
    setModalOpen(true);
  };

  const openEdit = (row: any) => {
    setEditingRow(row);
    setForm(Object.fromEntries(config.fields.map((f) => [f.key, row?.[f.key] ?? ""])));
    setModalOpen(true);
  };

  const buildPayload = () => {
    const payload: Record<string, any> = {};
    config.fields.forEach((f) => {
      if (f.readOnly) return;
      const value = form[f.key];
      if (f.type === "select") {
        payload[f.key] = value === "" || value === null ? null : Number(value);
      } else {
        payload[f.key] = value === "" ? null : String(value).trim();
      }
    });
    return payload;
  };

  const handleSave = async () => {
    const missing = config.fields.filter(
      (f) => f.required && (form[f.key] === "" || form[f.key] === null || form[f.key] === undefined)
    );
    if (missing.length > 0) {
      toast("error", `กรุณากรอก: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }

    setSaving(true);
    try {
      if (editingRow) {
        await masterRequest("PUT", `${config.apiPath}/${editingRow[config.idKey]}`, buildPayload());
        toast("success", "แก้ไขข้อมูลเรียบร้อย");
      } else {
        await masterRequest("POST", `${config.apiPath}/`, buildPayload());
        toast("success", "เพิ่มข้อมูลเรียบร้อย");
      }
      setModalOpen(false);
      await loadRows(config);
    } catch (error: any) {
      toast("error", error?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: any) => {
    const result = await Swal.fire({
      title: "ยืนยันการลบ",
      html: `ต้องการลบ <b>${row?.[config.primaryKey] || "-"}</b> ออกจาก${config.label}ใช่หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ลบข้อมูล",
      cancelButtonText: "ยกเลิก",
      customClass: { popup: "rounded-xl", confirmButton: "rounded-lg", cancelButton: "rounded-lg" },
    });
    if (!result.isConfirmed) return;

    try {
      await masterRequest("DELETE", `${config.apiPath}/${row[config.idKey]}`);
      toast("success", "ลบข้อมูลเรียบร้อย");
      await loadRows(config);
    } catch (error: any) {
      toast("error", error?.message || "ลบไม่สำเร็จ (อาจมีข้อมูลอื่นอ้างอิงอยู่)");
    }
  };

  const card = isDark ? "bg-slate-900/60 border-white/10" : "bg-white border-slate-200/70";
  const textMain = isDark ? "text-white" : "text-slate-900";
  const textSub = isDark ? "text-white/50" : "text-slate-500";
  const divider = isDark ? "border-white/10" : "border-slate-200/70";
  const accentBtn = isDark
    ? "bg-gradient-to-r from-indigo-500 to-blue-500 shadow-indigo-500/25"
    : "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/25";
  const inputClass = `w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all duration-200 ${
    isDark
      ? "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-indigo-400/60"
      : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500"
  }`;

  return (
    <div className="w-full min-w-0 max-w-full p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${accentBtn}`}>
          <Database size={22} className="text-white" />
        </div>
        <div>
          <p className={`text-xs font-bold uppercase tracking-widest ${textSub}`}>Master Data</p>
          <h1 className={`text-2xl font-bold tracking-tight ${textMain}`}>{config.label}</h1>
        </div>
      </div>

      {/* ตารางข้อมูล */}
      <div>
        <div className={`rounded-2xl border backdrop-blur-xl shadow-sm overflow-hidden ${card}`}>
          {/* Toolbar */}
          <div className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b ${divider}`}>
            <div className="min-w-0 flex-1">
              <h2 className={`text-sm font-semibold ${textMain}`}>{config.description}</h2>
              <div className={`flex items-center gap-2 text-xs ${textSub}`}>
                <span>
                  แสดง {filteredRows.length} จาก {rows.length} รายการ
                </span>
                {(activeFilterCount > 0 || sort) && (
                  <button
                    onClick={() => {
                      setFilters({});
                      setSort(null);
                      setPage(1);
                    }}
                    className={`cursor-pointer inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-semibold transition-colors ${
                      isDark
                        ? "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    <FilterX size={12} />
                    ล้างตัวกรองทั้งหมด
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textSub}`} />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="ค้นหา..."
                  className={`${inputClass} pl-9`}
                />
              </div>
              <button
                onClick={() => loadRows(config)}
                className={`cursor-pointer inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 ${
                  isDark
                    ? "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
                title="โหลดข้อมูลใหม่"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>

              {/* เลือกคอลัมน์ที่แสดง */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={`cursor-pointer inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-all duration-300 ${
                      isDark
                        ? "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                    title="เลือกคอลัมน์ที่แสดง"
                  >
                    <Columns3 size={15} />
                    <span className="hidden md:inline">
                      คอลัมน์ ({tableFields.length}/{config.fields.length})
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className={`w-60 p-2 ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"}`}
                >
                  <p className={`px-2 pb-1.5 text-[11px] font-bold uppercase tracking-widest ${textSub}`}>
                    คอลัมน์ที่แสดง
                  </p>
                  <div className="max-h-64 overflow-y-auto pr-1">
                    {config.fields.map((f) => (
                      <label
                        key={f.key}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${
                          isDark ? "text-white/70 hover:bg-white/10" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={hiddenCols[f.key] !== true}
                          onChange={() =>
                            setHiddenCols((prev) => ({ ...prev, [f.key]: prev[f.key] !== true }))
                          }
                          className="accent-current"
                        />
                        <span className="truncate">{f.label}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {allowCreate && (
                <button
                  onClick={openCreate}
                  className={`cursor-pointer inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 ${accentBtn}`}
                >
                  <Plus size={16} />
                  เพิ่ม
                </button>
              )}
            </div>
          </div>

          {config.note && (
            <div
              className={`flex items-start gap-2 px-4 py-2.5 text-xs border-b ${divider} ${
                isLocked
                  ? isDark
                    ? "bg-white/5 text-white/50"
                    : "bg-slate-50 text-slate-500"
                  : isDark
                  ? "bg-amber-500/10 text-amber-200"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {isLocked ? (
                <Lock size={14} className="mt-0.5 shrink-0" />
              ) : (
                <Info size={14} className="mt-0.5 shrink-0" />
              )}
              <span>{config.note}</span>
            </div>
          )}

          {/* Table */}
          <div className="w-full max-w-full overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className={isDark ? "bg-white/5" : "bg-slate-50"}>
                  <th className={`px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider w-12 ${textSub}`}>
                    #
                  </th>
                  {tableFields.map((f) => (
                    <th
                      key={f.key}
                      className={`px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap ${textSub}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{f.label}</span>
                        <ColumnMenu
                          field={f}
                          isDark={isDark}
                          sortDir={sort?.key === f.key ? sort.dir : null}
                          selected={filters[f.key]}
                          getValues={() =>
                            Array.from(
                              new Set(rowsForColumn(f.key).map((row) => String(cellValue(row, f))))
                            ).sort((a, b) => a.localeCompare(b, "th"))
                          }
                          onSort={(dir) => {
                            setSort(dir ? { key: f.key, dir } : null);
                            setPage(1);
                          }}
                          onFilter={(values) => {
                            setFilters((prev) => {
                              const next = { ...prev };
                              if (!values || values.length === 0) delete next[f.key];
                              else next[f.key] = values;
                              return next;
                            });
                            setPage(1);
                          }}
                        />
                      </div>
                    </th>
                  ))}
                  {showActionColumn && (
                    <th
                      className={`sticky right-0 z-10 px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider w-24 ${
                        isDark ? "bg-slate-900" : "bg-slate-50"
                      } ${textSub}`}
                    >
                      จัดการ
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={tableFields.length + 2} className="px-4 py-16 text-center">
                      <Loader2 size={28} className={`mx-auto animate-spin ${textSub}`} />
                    </td>
                  </tr>
                ) : pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={tableFields.length + 2} className={`px-4 py-16 text-center ${textSub}`}>
                      <Inbox size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium">ไม่พบข้อมูล</p>
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((row, index) => (
                    <tr
                      key={row[config.idKey] ?? index}
                      className={`border-t transition-colors ${
                        isDark ? "border-white/5 hover:bg-white/5" : "border-slate-100 hover:bg-slate-50"
                      }`}
                    >
                      <td className={`px-3 py-2.5 font-mono text-xs ${textSub}`}>
                        {(currentPage - 1) * PAGE_SIZE + index + 1}
                      </td>
                      {tableFields.map((f) => (
                        <td
                          key={f.key}
                          className={`max-w-[220px] truncate whitespace-nowrap px-3 py-2.5 ${textMain}`}
                          title={String(cellValue(row, f))}
                        >
                          {cellValue(row, f)}
                        </td>
                      ))}
                      {showActionColumn && (
                        <td
                          className={`sticky right-0 z-10 px-3 py-2.5 ${
                            isDark ? "bg-slate-900" : "bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-end gap-1">
                            {allowUpdate && (
                              <button
                                onClick={() => openEdit(row)}
                                className={`cursor-pointer rounded-lg p-2 transition-colors ${
                                  isDark
                                    ? "text-white/50 hover:bg-indigo-500/20 hover:text-indigo-300"
                                    : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"
                                }`}
                                title="แก้ไข"
                              >
                                <Pencil size={15} />
                              </button>
                            )}
                            {allowDelete && (
                              <button
                                onClick={() => handleDelete(row)}
                                className={`cursor-pointer rounded-lg p-2 transition-colors ${
                                  isDark
                                    ? "text-white/50 hover:bg-red-500/20 hover:text-red-300"
                                    : "text-slate-500 hover:bg-red-50 hover:text-red-600"
                                }`}
                                title="ลบ"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && filteredRows.length > PAGE_SIZE && (
            <div className={`flex items-center justify-between gap-3 border-t px-4 py-3 ${divider}`}>
              <span className={`text-xs ${textSub}`}>
                หน้า {currentPage} จาก {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                  className={`cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                    isDark
                      ? "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(currentPage + 1)}
                  className={`cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                    isDark
                      ? "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div
            className={`relative w-full max-w-lg rounded-2xl border shadow-2xl ${
              isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"
            }`}
          >
            <div className={`flex items-center justify-between border-b px-5 py-4 ${divider}`}>
              <div>
                <h2 className={`text-lg font-bold ${textMain}`}>
                  {editingRow ? "แก้ไข" : "เพิ่ม"}
                  {config.label}
                </h2>
                <p className={`text-xs ${textSub}`}>กรอกข้อมูลให้ครบถ้วนแล้วกดบันทึก</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className={`cursor-pointer rounded-lg p-2 transition-colors ${
                  isDark ? "text-white/50 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"
                }`}
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-5 py-5 max-h-[60vh] overflow-y-auto">
              {config.fields.map((field: MasterField) => (
                <div key={field.key} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
                  <label className={`mb-1.5 block text-sm font-semibold ${textMain}`}>
                    {field.label}
                    {field.required && <span className="ml-1 text-red-500">*</span>}
                    {field.readOnly && (
                      <span className={`ml-1 text-[11px] font-normal ${textSub}`}>(อ่านอย่างเดียว)</span>
                    )}
                  </label>
                  {field.readOnly ? (
                    <input
                      value={form[field.key] ?? ""}
                      readOnly
                      disabled
                      placeholder="ระบบกำหนดให้อัตโนมัติ"
                      className={`${inputClass} opacity-60 cursor-not-allowed`}
                    />
                  ) : field.type === "options" ? (
                    <select
                      value={form[field.key] ?? ""}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">— ไม่ระบุ —</option>
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "select" && field.source ? (
                    <select
                      value={form[field.key] ?? ""}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">— ไม่ระบุ —</option>
                      {(refData[field.source] || []).map((item) => {
                        const meta = REF_SOURCES[field.source!];
                        return (
                          <option key={item[meta.idKey]} value={item[meta.idKey]}>
                            {meta.labelKeys.map((k) => item[k]).find(Boolean) || item[meta.idKey]}
                          </option>
                        );
                      })}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      rows={3}
                      value={form[field.key] ?? ""}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      placeholder={field.placeholder || field.label}
                      className={`${inputClass} resize-none`}
                    />
                  ) : (
                    <input
                      value={form[field.key] ?? ""}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      placeholder={field.placeholder || field.label}
                      disabled={!!editingRow && field.key === config.idKey}
                      className={`${inputClass} disabled:opacity-60 disabled:cursor-not-allowed`}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className={`flex justify-end gap-2 border-t px-5 py-4 ${divider}`}>
              <button
                onClick={() => setModalOpen(false)}
                className={`cursor-pointer rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                  isDark
                    ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`cursor-pointer inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 ${accentBtn}`}
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterDataComponent;
