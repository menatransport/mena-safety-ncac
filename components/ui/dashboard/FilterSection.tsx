import { Search, Calendar, Building2, FileText, ChevronDown, ChevronUp } from 'lucide-react';

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
  { value: 'ลาดกระบัง', label: 'ลาดกระบัง' },
  { value: 'สระบุรี', label: 'สระบุรี' },
  { value: 'บางประกง', label: 'บางประกง' },
  { value: 'ระยอง', label: 'ระยอง' }
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
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
      <div 
        className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-4">
          <Search className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-700">ตัวกรองข้อมูล</h2>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          {isCollapsed ? (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronUp className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </div>
      
      {!isCollapsed && (
        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Month Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                เดือน
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
              >
                {MONTHS.map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                ปี
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
              >
                {[2025, 2026].map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Operation Center Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                สำนักงาน/ศูนย์ปฏิบัติการ
              </label>
              <select
                value={selectedCenter}
                onChange={(e) => setSelectedCenter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
              >
                {OPERATION_CENTERS.map(center => (
                  <option key={center.value} value={center.value}>
                    {center.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Case Type Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                ประเภทอุบัติการณ์
              </label>
              <select
                value={selectedCaseType}
                onChange={(e) => setSelectedCaseType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
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
          <div className="mt-4">
            <button
              onClick={onSearch}
              disabled={loading}
              className="w-full md:w-auto px-8 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
