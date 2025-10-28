'use client'
import { useRouter } from 'next/navigation';
import { LordIcon } from './LordIcon';
import { 
  LayoutDashboard, 
  Calendar,
  TrendingUp,
  Users,
  AlertTriangle,
  FileText,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import Swal from 'sweetalert2';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';

// Types
interface CaseData {
  id: string;
  date: string;
  driver_name?: string;
  case_details?: string;
  type: 'NC' | 'AC';
  status?: string;
  priority?: string;
}

interface MonthlyStats {
  month: string;
  nc: number;
  ac: number;
  total: number;
}

interface DriverStats {
  name: string;
  nc: number;
  ac: number;
  total: number;
}

interface ProblemStats {
  problem: string;
  count: number;
  percentage: number;
  [key: string]: string | number;
}

const MONTHS = [
  { value: '01', label: 'มกราคม', short: 'ม.ค.' },
  { value: '02', label: 'กุมภาพันธ์', short: 'ก.พ.' },
  { value: '03', label: 'มีนาคม', short: 'มี.ค.' },
  { value: '04', label: 'เมษายน', short: 'เม.ย.' },
  { value: '05', label: 'พฤษภาคม', short: 'พ.ค.' },
  { value: '06', label: 'มิถุนายน', short: 'มิ.ย.' },
  { value: '07', label: 'กรกฎาคม', short: 'ก.ค.' },
  { value: '08', label: 'สิงหาคม', short: 'ส.ค.' },
  { value: '09', label: 'กันยายน', short: 'ก.ย.' },
  { value: '10', label: 'ตุลาคม', short: 'ต.ค.' },
  { value: '11', label: 'พฤศจิกายน', short: 'พ.ย.' },
  { value: '12', label: 'ธันวาคม', short: 'ธ.ค.' }
];

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export const DashboardComponent = () => {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [ncData, setNcData] = useState<CaseData[]>([]);
  const [acData, setAcData] = useState<CaseData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const showWelcome = sessionStorage.getItem("showWelcome")
    if (showWelcome === "true") {
      Swal.fire({
        icon: 'success',
        title: 'ยินดีต้อนรับเข้าสู่ระบบ',
        text: 'Mena Safety',
        draggable: true
      })

      sessionStorage.removeItem("showWelcome")
    }
  }, []);

  // Fetch data when month/year changes
  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

      const [ncResponse, acResponse] = await Promise.all([
        fetch(`/api/document/nc?start_date=${startDate}&end_date=${endDate}`),
        fetch(`/api/document/ac?start_date=${startDate}&end_date=${endDate}`)
      ]);

      if (ncResponse.ok && acResponse.ok) {
        const ncResult = await ncResponse.json();
        const acResult = await acResponse.json();

        setNcData((Array.isArray(ncResult) ? ncResult : []).map(item => ({
          ...item,
          type: 'NC' as const
        })));
        
        setAcData((Array.isArray(acResult) ? acResult : []).map(item => ({
          ...item,
          type: 'AC' as const
        })));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Analytics calculations
  const analytics = useMemo(() => {
    const allData = [...ncData, ...acData];
    
    // 1. Monthly case counts
    const monthlyCases: MonthlyStats[] = MONTHS.map(month => {
      const monthData = allData.filter(item => {
        const itemMonth = new Date(item.date).getMonth() + 1;
        return itemMonth === parseInt(month.value);
      });
      
      const nc = monthData.filter(item => item.type === 'NC').length;
      const ac = monthData.filter(item => item.type === 'AC').length;
      
      return {
        month: month.short,
        nc,
        ac,
        total: nc + ac
      };
    });

    // 2. Driver statistics
    const driverStats: { [key: string]: DriverStats } = {};
    allData.forEach(item => {
      const driverName = item.driver_name || 'ไม่ระบุ';
      if (!driverStats[driverName]) {
        driverStats[driverName] = { name: driverName, nc: 0, ac: 0, total: 0 };
      }
      
      if (item.type === 'NC') {
        driverStats[driverName].nc++;
      } else {
        driverStats[driverName].ac++;
      }
      driverStats[driverName].total++;
    });

    const totalCases = allData.length;
    

    return {
      monthlyCases,
      totalCases,
      ncCount: ncData.length,
      acCount: acData.length
    };
  }, [ncData, acData]);

  return (
    <div className="p-6 space-y-6 bg-[#eef8ef] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 text-black flex items-center justify-center">
            <LayoutDashboard className='w-16 h-16' />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Safety Analytics Dashboard</h1>
            <p className="text-gray-600">ภาพรวมการวิเคราะห์ข้อมูลความปลอดภัย</p>
          </div>
        </div>

        {/* Month/Year Selector */}
        <div className="flex items-center space-x-4 bg-white p-3 rounded-lg shadow-sm border">
          <Calendar className="w-5 h-5 text-gray-500" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="border-0 focus:ring-0 text-sm font-medium"
          >
            {MONTHS.map((month, index) => (
              <option key={month.value} value={index + 1}>
                {month.label}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="border-0 focus:ring-0 text-sm font-medium"
          >
            {[2023, 2024, 2025].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">จำนวนเคส NC</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">{analytics.ncCount}</p>
              <p className="text-xs text-gray-500 mt-1">Near Miss Cases</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">จำนวนเคส AC</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{analytics.acCount}</p>
              <p className="text-xs text-gray-500 mt-1">Accident Cases</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">รวมทั้งหมด</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{analytics.totalCases}</p>
              <p className="text-xs text-gray-500 mt-1">Total Cases</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
         
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Cases Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-800">กราฟ NC Case รายเดือน แสดง ระดับ Priority</h3>
            </div>
            <TrendingUp className="w-5 h-5 text-gray-500" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.monthlyCases}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [value, name === 'nc' ? 'NC Cases' : 'AC Cases']}
                labelFormatter={(label) => `เดือน: ${label}`}
              />
              <Legend />
              <Bar dataKey="nc" fill="#10b981" name="NC Cases" />
              <Bar dataKey="ac" fill="#3b82f6" name="AC Cases" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Problem Analysis Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-800">ประเภทปัญหาที่เกิดบ่อย</h3>
              <p className="text-sm text-gray-600">วิเคราะห์จากรายละเอียดเหตุการณ์</p>
            </div>
            <PieChart className="w-5 h-5 text-gray-500" />
          </div>
          
        </div>
      </div>

   

      {/* Quick Actions */}
      <div className="hidden bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "สร้างรายงาน NC", route: "/nc-form", bgColor: "bg-emerald-50", textColor: "text-emerald-700", icon: FileText },
            { title: "สร้างรายงาน AC", route: "/ac-form", bgColor: "bg-blue-50", textColor: "text-blue-700", icon: AlertTriangle },
            { title: "ดูข้อมูล NC", route: "/nc-records", bgColor: "bg-purple-50", textColor: "text-purple-700", icon: BarChart3 },
            { title: "ดูข้อมูล AC", route: "/ac-records", bgColor: "bg-orange-50", textColor: "text-orange-700", icon: Activity }
          ].map((action, index) => (
            <button
              key={index}
              onClick={() => router.push(action.route)}
              className={`${action.bgColor} ${action.textColor} p-4 rounded-lg hover:shadow-md transition-all duration-200 group`}
            >
              <div className="flex flex-col items-center text-center space-y-2">
                <action.icon className="w-8 h-8" />
                <span className="font-medium text-sm">{action.title}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};