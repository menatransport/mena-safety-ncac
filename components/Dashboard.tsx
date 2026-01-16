'use client'
import { useEffect, useState, useMemo } from 'react';
import Swal from 'sweetalert2';
import { caseReport_NC, caseReport_AC } from '@/lib/caseReport';
import { sendErrorLog } from '@/lib/logError';
import {
  FilterSection,
  ViewSelector,
  PlaceholderView,
  FinanceView,
  DashboardView,
  TransportView
} from '@/components/ui/dashboard';

export const DashboardComponent = () => {
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedCenter, setSelectedCenter] = useState('all');
  const [selectedCaseType, setSelectedCaseType] = useState('all');
  const [ncData, setNcData] = useState<caseReport_NC[]>([]);
  const [acData, setAcData] = useState<caseReport_AC[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];


  useEffect(() => {
    const showWelcome = sessionStorage.getItem("showWelcome")
    if (showWelcome === "true") {
      Swal.fire({
        icon: 'success',
        title: 'ยินดีต้อนรับเข้าสู่ระบบ',
        text: '',
        draggable: true
      })

      sessionStorage.removeItem("showWelcome")
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {

    setLoading(true);
    try {
      let startDate: string;
      let endDate: string;

      if (selectedMonth === 'all') {

        startDate = `${selectedYear}-01-01`;
        endDate = `${selectedYear}-12-31`;
      } else {

        const monthNum = parseInt(selectedMonth);
        startDate = `${selectedYear}-${String(monthNum).padStart(2, '0')}-01`;
        endDate = new Date(selectedYear, monthNum, 0).toISOString().split('T')[0];
      }

      const [ncResponse, acResponse] = await Promise.all([
        fetch(`/api/dashboard/nc?start_date=${startDate}&end_date=${endDate}`,{method: 'GET', headers: { 'Content-Type': 'application/json' }}),
        fetch(`/api/dashboard/ac?start_date=${startDate}&end_date=${endDate}`,{method: 'GET', headers: { 'Content-Type': 'application/json' }})
      ]);

      if (ncResponse.ok && acResponse.ok) {
        const ncResult = await ncResponse.json();
        const acResult = await acResponse.json();
        setNcData((Array.isArray(ncResult) ? ncResult : []).map(item => ({
          ...item,
          type: 'NC' as const
        })));

        setAcData((Array.isArray(acResult) ? acResult : []).map((item: any) => ({
          ...item,
          type: 'AC' as const,
          record_date: item.record_date || item.record_date,
          incident_date: item.incident_date || item.incident_date,
          actual_price: (item.actual_price !== undefined && item.actual_price !== null) 
            ? item.actual_price 
            : (item.actual_goods_damage_value || 0) + (item.actual_vehicle_damage_value || 0),
          estimated_cost: (item.estimated_cost !== undefined && item.estimated_cost !== null)
            ? item.estimated_cost
            : (item.estimated_goods_damage_value || 0) + (item.estimated_vehicle_damage_value || 0),
          incident_cause: item.incident_cause || 'อุบัติเหตุ'
        })));
      }
      // console.log('NC - ',ncData)
      // console.log('AC - ',acData)
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      sendErrorLog('Dashboard/fetchData', error instanceof Error ? error : String(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchData();
  };

  // คำนวณข้อมูลเฉพาะเมื่อ activeView === 'dashboard'
  const dashboardData = useMemo(() => {
    if (activeView !== 'dashboard') {
      return null;
    }

    // คำนวณข้อมูลสำหรับ Summary Cards
    let filteredNcData = selectedCaseType === 'ac' ? [] : ncData;
    let filteredAcData = selectedCaseType === 'nc' ? [] : acData;

    // กรองตาม Center
    if (selectedCenter !== 'all') {
      filteredNcData = filteredNcData.filter(item => item.site_name === selectedCenter);
      filteredAcData = filteredAcData.filter(item => item.site_name === selectedCenter);
    }

    const allData = [...filteredNcData, ...filteredAcData];
    // console.log('allData', allData);
    const majorCount = allData.filter(item => item.priority === 'Major').length;
    const minorCount = allData.filter(item => item.priority === 'Minor').length;
    const crisisCount = allData.filter(item => item.priority === 'Crisis').length;
    const totalCount = allData.length;

    const ncMajor = filteredNcData.filter(item => item.priority === 'Major').length;
    const ncMinor = filteredNcData.filter(item => item.priority === 'Minor').length;
    const ncCrisis = filteredNcData.filter(item => item.priority === 'Crisis').length;

    const acMajor = filteredAcData.filter(item => item.priority === 'Major').length;
    const acMinor = filteredAcData.filter(item => item.priority === 'Minor').length;
    const acCrisis = filteredAcData.filter(item => item.priority === 'Crisis').length;

    const summaryStats = {
      majorCount,
      minorCount,
      crisisCount,
      totalCount,
      ncMajor,
      ncMinor,
      ncCrisis,
      acMajor,
      acMinor,
      acCrisis,
      ncTotal: filteredNcData.length,
      acTotal: filteredAcData.length
    };

    // สร้างข้อมูลสำหรับ Calendar Chart
    const dataByDate: { [key: string]: number } = {};
    allData.forEach((item: any) => {
      const date = item.record_date?.split('T')[0] || item.record_datetime?.split('T')[0];
      if (date) {
        dataByDate[date] = (dataByDate[date] || 0) + 1;
      }
    });

    const calendarData = Object.entries(dataByDate).map(([day, value]) => ({
      day,
      value
    }));

    // สร้างข้อมูลสำหรับ Pie Chart (NC)
    const ncPieData = summaryStats.ncTotal === 0 ? [] : [
      {
        id: 'Major',
        label: 'Major',
        value: summaryStats.ncMajor,
        color: '#ef4444'
      },
      {
        id: 'Minor',
        label: 'Minor',
        value: summaryStats.ncMinor,
        color: '#f59e0b'
      },
      {
        id: 'Crisis',
        label: 'Crisis',
        value: summaryStats.ncCrisis,
        color: '#8b5cf6'
      }
    ].filter(item => item.value > 0);

    // สร้างข้อมูลสำหรับ Pie Chart (AC)
    const acPieData = summaryStats.acTotal === 0 ? [] : [
      {
        id: 'Major',
        label: 'Major',
        value: summaryStats.acMajor,
        color: '#ef4444'
      },
      {
        id: 'Minor',
        label: 'Minor',
        value: summaryStats.acMinor,
        color: '#f59e0b'
      },
      {
        id: 'Crisis',
        label: 'Crisis',
        value: summaryStats.acCrisis,
        color: '#8b5cf6'
      }
    ].filter(item => item.value > 0);

    // สร้างข้อมูลสำหรับ Stacked Bar Chart (รายเดือน)
    const dataByMonth: { [key: string]: { Major: number; Minor: number; Crisis: number } } = {};
    allData.forEach((item: any) => {
      const date = item.record_date?.split('T')[0] || item.record_datetime?.split('T')[0];
      const monthKey = date ? new Date(date).toLocaleDateString('th-TH', { month: 'short', year: '2-digit' }) : null;
      if (monthKey && monthKey !== 'Invalid Date') {
        if (!dataByMonth[monthKey]) {
          dataByMonth[monthKey] = { Major: 0, Minor: 0, Crisis: 0 };
        }
        if (item.priority === 'Major') dataByMonth[monthKey].Major++;
        else if (item.priority === 'Minor') dataByMonth[monthKey].Minor++;
        else if (item.priority === 'Crisis') dataByMonth[monthKey].Crisis++;
      }
    });

    const stackedBarData = Object.entries(dataByMonth)
      .map(([month, values]) => ({
        date: month,
        ...values
      }))
      .sort((a, b) => {
        const monthA = monthNames.indexOf(a.date.split(' ')[0]);
        const monthB = monthNames.indexOf(b.date.split(' ')[0]);
        return monthA - monthB;
      });
      // console.log('stackedBarData', stackedBarData);
    // วิเคราะห์สาเหตุที่เกิดขึ้นบ่อยที่สุด
    const causeCounts: { [key: string]: number } = {};
    allData.forEach((item: any) => {
      const cause = item.incident_cause || 'ไม่ระบุ';
      causeCounts[cause] = (causeCounts[cause] || 0) + 1;
    });

    const topCauses = Object.entries(causeCounts)
      .map(([cause, count]) => ({
        cause,
        count,
        percentage: totalCount > 0 ? (count / totalCount) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      summaryStats,
      calendarData,
      ncPieData,
      acPieData,
      stackedBarData,
      topCauses
    };
  }, [activeView, ncData, acData, selectedCaseType, selectedCenter]);


  const financeData = useMemo(() => {
    if (activeView !== 'finance') {
      return null;
    }

    let filteredNcData = selectedCaseType === 'ac' ? [] : ncData;
    let filteredAcData = selectedCaseType === 'nc' ? [] : acData;

    // กรองตาม Center
    if (selectedCenter !== 'all') {
      filteredNcData = filteredNcData.filter(item => item.site_name === selectedCenter);
      filteredAcData = filteredAcData.filter(item => item.site_name === selectedCenter);
    }

    const allData = [...filteredNcData, ...filteredAcData];

    const centerCosts: { [key: string]: number } = {};
    allData.forEach((item: any) => {
      const centerName = item.site || item.site_name || 'ไม่ระบุ';
      const actualCost = item.actual_price || 0;

      if (!centerCosts[centerName]) {
        centerCosts[centerName] = 0;
      }
      centerCosts[centerName] += actualCost;
    });

    const totalActualCost = Object.values(centerCosts).reduce((sum, cost) => sum + cost, 0);

    const centerCostData = Object.entries(centerCosts).map(([center, cost], index) => {
      const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
      return {
        id: center,
        label: center,
        value: cost,
        percentage: totalActualCost > 0 ? (cost / totalActualCost) * 100 : 0,
        color: colors[index % colors.length]
      };
    }).sort((a, b) => b.value - a.value);

    // คำนวณค่าเสียหายตาม Priority
    const priorityCosts: { [key: string]: { actual: number; estimated: number } } = {
      'Major': { actual: 0, estimated: 0 },
      'Minor': { actual: 0, estimated: 0 },
      'Crisis': { actual: 0, estimated: 0 }
    };

    allData.forEach((item: any) => {
      const priority = item.priority || 'Minor';
      if (priorityCosts[priority]) {
        priorityCosts[priority].actual += item.actual_price || 0;
        priorityCosts[priority].estimated += item.estimated_cost || 0;
      }
    });

    // คำนวณค่าเสียหายรายเดือน
    const monthlyCosts: { [key: string]: { NC: number; AC: number } } = {};

    filteredNcData.forEach(item => {
      const date = new Date(item.record_date || '');
      const monthKey = date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
      if (!monthlyCosts[monthKey]) {
        monthlyCosts[monthKey] = { NC: 0, AC: 0 };
      }
      monthlyCosts[monthKey].NC += item.actual_price || 0;
    });

    filteredAcData.forEach((item: any) => {
      const date = new Date(item.record_date || '');
      const monthKey = date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
      if (!monthlyCosts[monthKey]) {
        monthlyCosts[monthKey] = { NC: 0, AC: 0 };
      }
      monthlyCosts[monthKey].AC += item.actual_price || 0;
    });

    const monthlyCostData = Object.entries(monthlyCosts)
      .map(([month, costs]) => ({
        month,
        NC: costs.NC,
        AC: costs.AC,
        total: costs.NC + costs.AC
      }))
      .sort((a, b) => {
        const monthA = monthNames.indexOf(a.month.split(' ')[0]);
        const monthB = monthNames.indexOf(b.month.split(' ')[0]);
        return monthA - monthB;
      });

    return {
      centerCosts: centerCostData,
      totalActualCost,
      monthlyCosts: monthlyCostData,
    };
  }, [activeView, ncData, acData, selectedCaseType, selectedCenter]);

  const transportData = useMemo(() => {
    if (activeView !== 'transport') {
      return null;
    }

    let filteredNcData = selectedCaseType === 'ac' ? [] : ncData;
    let filteredAcData = selectedCaseType === 'nc' ? [] : acData;

    // กรองตาม Center
    if (selectedCenter !== 'all') {
      filteredNcData = filteredNcData.filter(item => item.site_name === selectedCenter);
      filteredAcData = filteredAcData.filter(item => item.site_name === selectedCenter);
    }

    const allData = [...filteredNcData, ...filteredAcData];

    // คำนวณคนขับที่เกิดเคสมากที่สุด
    const driverCaseCounts: { [key: string]: { count: number; severity: string; name: string } } = {};
    allData.forEach((item: any) => {
      const driverId = item.driver_id || 'unknown';
      const driverName = item.driver || `คนขับ ${driverId}`;
      if (!driverCaseCounts[driverId]) {
        driverCaseCounts[driverId] = { count: 0, severity: 'Minor', name: driverName };
      }
      driverCaseCounts[driverId].count++;
      if (item.priority === 'Crisis') {
        driverCaseCounts[driverId].severity = 'Crisis';
      } else if (item.priority === 'Major' && driverCaseCounts[driverId].severity !== 'Crisis') {
        driverCaseCounts[driverId].severity = 'Major';
      }
    });

    const topDrivers = Object.entries(driverCaseCounts)
      .map(([id, data]) => ({
        name: data.name,
        caseCount: data.count,
        severity: data.severity
      }))
      .sort((a, b) => b.caseCount - a.caseCount)
      .slice(0, 5);

    // คำนวณลูกค้าที่เกิดเคสมากที่สุด
    const clientCaseCounts: { [key: string]: { count: number; cost: number; name: string } } = {};
    allData.forEach((item: any) => {
      const clientId = item.client_id?.toString() || 'unknown';
      const clientName = item.client || `ลูกค้า ${clientId}`;
      if (!clientCaseCounts[clientId]) {
        clientCaseCounts[clientId] = { count: 0, cost: 0, name: clientName };
      }
      clientCaseCounts[clientId].count++;
      clientCaseCounts[clientId].cost += item.actual_price || 0;
    });

    const topClients = Object.entries(clientCaseCounts)
      .map(([id, data]) => ({
        name: data.name,
        caseCount: data.count,
        cost: data.cost
      }))
      .sort((a, b) => b.caseCount - a.caseCount)
      .slice(0, 5);

    // คำนวณทะเบียนรถที่เกิดเคสมากที่สุด
    const vehicleCaseCounts: { [key: string]: { count: number; priority: string } } = {};
    allData.forEach((item: any) => {
      const truckNo = item.vehicle_truckno || 'ไม่ระบุ';
      if (truckNo !== 'ไม่ระบุ') {
        if (!vehicleCaseCounts[truckNo]) {
          vehicleCaseCounts[truckNo] = { count: 0, priority: 'Minor' };
        }
        vehicleCaseCounts[truckNo].count++;
        if (item.priority === 'Crisis') {
          vehicleCaseCounts[truckNo].priority = 'Crisis';
        } else if (item.priority === 'Major' && vehicleCaseCounts[truckNo].priority !== 'Crisis') {
          vehicleCaseCounts[truckNo].priority = 'Major';
        }
      }
    });

    const topVehicles = Object.entries(vehicleCaseCounts)
      .map(([plateNumber, data]) => ({
        plateNumber,
        caseCount: data.count,
        priority: data.priority
      }))
      .sort((a, b) => b.caseCount - a.caseCount)
      .slice(0, 5);

    // สถิติแอลกอฮอล์และสารเสพติด
    let alcoholCases = 0;
    let drugCases = 0;
    let normalCases = 0;

    allData.forEach((item: any) => {
      const cause = (item.incident_cause || '').toLowerCase();
      if (cause.includes('แอลกอฮอล์') || cause.includes('เมา') || cause.includes('ดื่ม')) {
        alcoholCases++;
      } else if (cause.includes('ยา') || cause.includes('สารเสพติด')) {
        drugCases++;
      } else {
        normalCases++;
      }
    });

    const alcoholDrugData = [
      { id: 'ปกติ', label: 'ปกติ', value: normalCases, color: '#10b981' },
      { id: 'แอลกอฮอล์', label: 'แอลกอฮอล์', value: alcoholCases, color: '#f59e0b' },
      { id: 'สารเสพติด', label: 'สารเสพติด', value: drugCases, color: '#ef4444' }
    ].filter(item => item.value > 0);

    // สถิติการบาดเจ็บ
    const injuryTypes: { [key: string]: { NC: number; AC: number } } = {};

    allData.forEach((item: any) => {
      const details = ((item.case_details || '') + ' ' + (item.description || '')).toLowerCase();
      let injuryType = 'อื่นๆ';

      if (details.includes('เสียชีวิต')) {
        injuryType = 'เสียชีวิต';
      } else if (details.includes('สาหัส')) {
        injuryType = 'บาดเจ็บสาหัส';
      } else if (details.includes('เล็กน้อย')) {
        injuryType = 'บาดเจ็บเล็กน้อย';
      } else if (details.includes('บาดเจ็บ')) {
        injuryType = 'บาดเจ็บทั่วไป';
      } else if (details.includes('ไม่มี') && details.includes('บาดเจ็บ')) {
        injuryType = 'ไม่มีบาดเจ็บ';
      }

      if (!injuryTypes[injuryType]) {
        injuryTypes[injuryType] = { NC: 0, AC: 0 };
      }

      if (item.type === 'NC') {
        injuryTypes[injuryType].NC++;
      } else {
        injuryTypes[injuryType].AC++;
      }
    });

    const injuryData = Object.entries(injuryTypes)
      .map(([type, counts]) => ({
        type,
        NC: counts.NC,
        AC: counts.AC
      }))
      .filter(item => item.NC > 0 || item.AC > 0);

    // วิเคราะห์ Performance คนขับ
    const allDriverIds = new Set<string>();
    allData.forEach((item: any) => {
      if (item.driver_id) allDriverIds.add(item.driver_id);
    });

    let excellent = 0;
    let good = 0;
    let warning = 0;
    let critical = 0;

    Object.entries(driverCaseCounts).forEach(([id, data]) => {
      if (data.severity === 'Crisis' || data.count > 5) {
        critical++;
      } else if (data.severity === 'Major' || data.count >= 3) {
        warning++;
      } else if (data.count >= 1) {
        good++;
      }
    });

    excellent = allDriverIds.size - (good + warning + critical);
    if (excellent < 0) excellent = 0;

    const driverPerformance = {
      excellent,
      good,
      warning,
      critical
    };

    return {
      topDrivers,
      topClients,
      topVehicles,
      alcoholDrugData,
      injuryData,
      driverPerformance
    };
  }, [activeView, ncData, acData, selectedCaseType, selectedCenter]);

  return (
    <div className="min-h-screen p-10 bg-gradient-to-br from-[#d1ffe1] to-indigo-100">
      <div className="space-y-6">


        {/* Filter Section */}
        <FilterSection
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          selectedCenter={selectedCenter}
          setSelectedCenter={setSelectedCenter}
          selectedCaseType={selectedCaseType}
          setSelectedCaseType={setSelectedCaseType}
          loading={loading}
          isCollapsed={isFilterCollapsed}
          setIsCollapsed={setIsFilterCollapsed}
          onSearch={handleSearch}
        />

        {/* View Selector */}
        <ViewSelector
          activeView={activeView}
          setActiveView={setActiveView}
        />

        {/* Dashboard View */}
        {activeView === 'dashboard' && dashboardData && (
          <DashboardView
            data={dashboardData}
            selectedCaseType={selectedCaseType}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        )}

        {/* Finance View */}
        {activeView === 'finance' && financeData && (
          <FinanceView data={financeData} />
        )}

        {/* Delivery View */}
        {activeView === 'transport' && (
          <TransportView data={""} />
        )}


      </div>
    </div>
  );
};