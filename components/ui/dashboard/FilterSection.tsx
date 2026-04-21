'use client'

import { Search, Calendar, Building2, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useUiTheme } from '@/lib/useUiTheme';

interface FilterSectionProps {
  selectedMonth: string;
  setSelectedMonth: (value: string) => void;
  selectedYear: number;
  setSelectedYear: (value: number) => void;
  selectedCenter: string;
  setSelectedCenter: (value: string) => void;
  selectedCaseType: string;
  setSelectedCaseType: (value: string) => void;
  loading: boolean;
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  onSearch: () => void;
}

const MONTHS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: '01', label: 'มกราคม' },
  { value: '02', label: 'กุมภาพันธ์' },
  { value: '03', label: 'มีนาคม' },
  { value: '04', label: 'เมษายน' },
  { value: '05', label: 'พฤษภาคม' },
  { value: '06', label: 'มิถุนายน' },
  { value: '07', label: 'กรกฎาคม' },
  { value: '08', label: 'สิงหาคม' },
  { value: '09', label: 'กันยายน' },
  { value: '10', label: 'ตุลาคม' },
  { value: '11', label: 'พฤศจิกายน' },
  { value: '12', label: 'ธันวาคม' }
];

const OPERATION_CENTERS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'ศลบ.', label: 'ลาดกระบัง' },
  { value: 'สสบ.', label: 'สระบุรี' },
  { value: 'ศบก.', label: 'บางประกง' },
  { value: 'ศรย.', label: 'ระยอง' },
  { value: 'ศขก.', label: 'ขอนแก่น' },
  { value: 'สกท.', label: 'Bangkok HQ' }
];

const CASE_TYPES = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'nc', label: 'NC' },
  { value: 'ac', label: 'AC' }
];

export const FilterSection = ({
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  selectedCenter,
  setSelectedCenter,
  selectedCaseType,
  setSelectedCaseType,
  loading,
  isCollapsed,
  setIsCollapsed,
  onSearch
}: FilterSectionProps) => {
  const { theme } = useUiTheme();
  const isDark = theme === 'Dark';

  const panelClass = isDark
    ? 'bg-slate-900/55 border-slate-700/80'
    : 'bg-white border-gray-100';

  const headerHoverClass = isDark ? 'hover:bg-slate-800/70' : 'hover:bg-gray-50';
  const titleClass = isDark ? 'text-slate-100' : 'text-gray-700';
  const iconClass = isDark ? 'text-slate-300' : 'text-gray-500';
  const chevronButtonClass = isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-gray-100 text-gray-600';
  const labelClass = isDark ? 'text-slate-200' : 'text-gray-700';
  const selectClass = isDark
    ? 'border-slate-600 bg-slate-800 text-slate-100 focus:ring-emerald-500'
    : 'border-gray-300 bg-white text-gray-900 focus:ring-green-500';

  return (
    <div className={`rounded-xl md:rounded-2xl shadow-lg border ${panelClass}`}>
      <div 
        className={`flex items-center justify-between p-4 md:p-6 cursor-pointer transition-colors ${headerHoverClass}`}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2 md:gap-4">
          <Search className={`w-4 h-4 md:w-5 md:h-5 ${iconClass}`} />
          <h2 className={`text-base md:text-lg font-semibold ${titleClass}`}>ตัวกรองข้อมูล</h2>
        </div>
        <button className={`p-1.5 md:p-2 rounded-lg transition-colors ${chevronButtonClass}`}>
          {isCollapsed ? (
            <ChevronDown className={`w-4 h-4 md:w-5 md:h-5 ${isDark ? 'text-slate-300' : 'text-gray-600'}`} />
          ) : (
            <ChevronUp className={`w-4 h-4 md:w-5 md:h-5 ${isDark ? 'text-slate-300' : 'text-gray-600'}`} />
          )}
        </button>
      </div>
      
      {!isCollapsed && (
        <div className="px-4 pb-4 md:px-6 md:pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {/* Month Select */}
            <div className="space-y-1.5 md:space-y-2">
              <label className={`text-xs md:text-sm font-medium flex items-center gap-1.5 md:gap-2 ${labelClass}`}>
                <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">เดือน</span>
                <span className="sm:hidden">เดือน</span>
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className={`w-full px-3 py-2 md:px-4 text-sm md:text-base border rounded-lg focus:ring-2 focus:border-transparent ${selectClass}`}
              >
                {MONTHS.map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Select */}
            <div className="space-y-1.5 md:space-y-2">
              <label className={`text-xs md:text-sm font-medium flex items-center gap-1.5 md:gap-2 ${labelClass}`}>
                <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span>ปี</span>
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className={`w-full px-3 py-2 md:px-4 text-sm md:text-base border rounded-lg focus:ring-2 focus:border-transparent ${selectClass}`}
              >
                {[2025, 2026].map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Operation Center Select */}
            <div className="space-y-1.5 md:space-y-2">
              <label className={`text-xs md:text-sm font-medium flex items-center gap-1.5 md:gap-2 ${labelClass}`}>
                <Building2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden md:inline">สำนักงาน/ศูนย์ปฏิบัติการ</span>
                <span className="md:hidden">ศูนย์</span>
              </label>
              <select
                value={selectedCenter}
                onChange={(e) => setSelectedCenter(e.target.value)}
                className={`w-full px-3 py-2 md:px-4 text-sm md:text-base border rounded-lg focus:ring-2 focus:border-transparent ${selectClass}`}
              >
                {OPERATION_CENTERS.map(center => (
                  <option key={center.value} value={center.value}>
                    {center.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Case Type Select */}
            <div className="space-y-1.5 md:space-y-2">
              <label className={`text-xs md:text-sm font-medium flex items-center gap-1.5 md:gap-2 ${labelClass}`}>
                <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden md:inline">ประเภทอุบัติการณ์</span>
                <span className="md:hidden">ประเภท</span>
              </label>
              <select
                value={selectedCaseType}
                onChange={(e) => setSelectedCaseType(e.target.value)}
                className={`w-full px-3 py-2 md:px-4 text-sm md:text-base border rounded-lg focus:ring-2 focus:border-transparent ${selectClass}`}
              >
                {CASE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Button */}
          <div className="mt-3 md:mt-4">
            <button
              onClick={onSearch}
              disabled={loading}
              className="w-full sm:w-50 px-5 py-2.5 rounded-xl cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold shadow-lg shadow-emerald-500/25 hover:from-emerald-700 hover:to-teal-700 hover:shadow-xl active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
