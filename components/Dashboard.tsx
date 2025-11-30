'use client'
import { useEffect, useState, useMemo } from 'react';
import Swal from 'sweetalert2';
import { caseReport_NC, caseReport_AC } from '@/lib/caseReport';
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
  const [useMockData, setUseMockData] = useState(true); // เปิด MockData
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  // Mock Data สำหรับทดสอบ
  const generateMockData = () => {
    const mockNCData: caseReport_NC[] = [];
    const mockACData: caseReport_AC[] = [];

    const priorities = ['Minor', 'Major', 'Crisis'];
    const causes = ['สินค้าเสียหายระหว่างจัดส่ง- การจัดเรียงสินค้า',
      'สินค้าเสียหายระหว่างจัดส่ง- การโหลดสินค้า',
      'สินค้าเสียหายระหว่างจัดส่ง- อุณหภูมิมีปัญหา',
      'สินค้าเสียหายระหว่างจัดส่ง-จากการขับขี่',
      'สินค้าขาดส่ง-จากการตรวจนับ',
      'สินค้าขาดส่ง-จากการไม่ปฏิบัติตามขั้นตอนการทำงาน',
      'ปรับ-พจร. แต่ลูกค้าไม่ปรับ',
      'ค่าปรับ Driver App',
      'รถเสีย-ทำให้สินค้าเสียหาย',
      'ตก Ontime',
      'น้ำหนักขาด',
      'ส่งผิดหน่วยงาน',
      'อื่นๆ',
      'ค่าจัดเรียงสินค้าใหม่'];
    const sites = ['ลาดกระบัง', 'สระบุรี', 'บางประกง', 'ระยอง'];
    // สร้าง Mock NC Data
    for (let i = 0; i < 30; i++) {
      const randomDay = Math.floor(Math.random() * 28) + 1;
      const randomMonth = selectedMonth === 'all' ? Math.floor(Math.random() * 12) + 1 : parseInt(selectedMonth);
      const date = `${selectedYear}-${String(randomMonth).padStart(2, '0')}-${String(randomDay).padStart(2, '0')}`;

      mockNCData.push({
        document_no: `NC-2025-${String(i + 1).padStart(4, '0')}`,
        site_id: Math.floor(Math.random() * 4) + 1,
        department_id: 1,
        department: 'แผนกขนส่ง',
        client_id: 1,
        client: 'บริษัท ABC จำกัด',
        vehicle_id_head: 1,
        vehicle_head: 'ABC-1234',
        vehicle_id_tail: 1,
        vehicle_tail: 'DEF-5678',
        vehicle_truckno: `TRUCK-${i + 1}`,
        origin_id: 1,
        reporter: 'ผู้แจ้ง ' + (i + 1),
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        site: sites[Math.floor(Math.random() * sites.length)],
        driver_role: 'พนักงานขับรถ',
        driver: 'พจส. ' + (i + 1),
        driver_role_id: 1,
        driver_id: String(i + 1),
        incident_cause_id: Math.floor(Math.random() * 5) + 1,
        reporter_id: i + 1,
        record_date: date,
        incident_date: date,
        case_location: 'สถานที่เกิดเหตุ ' + (i + 1),
        incident_cause: causes[Math.floor(Math.random() * causes.length)],
        description: 'รายละเอียดเหตุการณ์ที่ ' + (i + 1),
        destination: 'จุดหมายปลายทาง ' + (i + 1),
        case_details: 'รายละเอียดเคส ' + (i + 1),
        estimated_cost: Math.random() * 100000,
        actual_price: Math.random() * 100000,
        attachments: '',
        casestatus: 'Open',
        products: [{
          product_id: 1,
          product_name: 'สินค้า',
          amount: 100,
          unit: 'ชิ้น'
        }],
        docs: [{
          warning_doc: '',
          warning_doc_no: '',
          warning_doc_remark: '',
          debt_doc: '',
          debt_doc_no: '',
          debt_doc_remark: '',
          customer_invoice: ''
        }]
      } as any);
    }

    // สร้าง Mock AC Data
    for (let i = 0; i < 25; i++) {
      const randomDay = Math.floor(Math.random() * 28) + 1;
      const randomMonth = selectedMonth === 'all' ? Math.floor(Math.random() * 12) + 1 : parseInt(selectedMonth);
      const date = `${selectedYear}-${String(randomMonth).padStart(2, '0')}-${String(randomDay).padStart(2, '0')}`;

      mockACData.push({
        document_no: `AC-2025-${String(i + 1).padStart(4, '0')}`,
        site_id: Math.floor(Math.random() * 4) + 1,
        department_id: 1,
        department: 'แผนกขนส่ง',
        client_id: 1,
        client: 'บริษัท XYZ จำกัด',
        vehicle_id_head: 1,
        vehicle_head: 'GHI-9012',
        vehicle_id_tail: 1,
        vehicle_tail: 'JKL-3456',
        vehicle_truckno: `TRUCK-AC-${i + 1}`,
        origin_id: 1,
        reporter: 'ผู้แจ้ง ' + (i + 1),
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        site: sites[Math.floor(Math.random() * sites.length)],
        driver_role: 'พนักงานขับรถ',
        driver: 'พจส. ' + (i + 1),
        driver_role_id: 1,
        driver_id: String(i + 1),
        incident_cause_id: Math.floor(Math.random() * 5) + 1,
        reporter_id: i + 1,
        record_date: date,
        incident_date: date,
        case_location: 'สถานที่เกิดเหตุ AC ' + (i + 1),
        incident_cause: causes[Math.floor(Math.random() * causes.length)],
        description: 'รายละเอียดเหตุการณ์ AC ที่ ' + (i + 1),
        destination: 'จุดหมายปลายทาง ' + (i + 1),
        case_details: 'รายละเอียดเคส AC ' + (i + 1),
        estimated_cost: Math.random() * 100000,
        actual_price: Math.random() * 100000,
        attachments: '',
        casestatus: 'Open',
        products: [{
          product_id: 1,
          product_name: 'สินค้า',
          amount: 100,
          unit: 'ชิ้น'
        }],
        docs: [{
          warning_doc: '',
          warning_doc_no: '',
          warning_doc_remark: '',
          debt_doc: '',
          debt_doc_no: '',
          debt_doc_remark: '',
          customer_invoice: ''
        }]
      } as any);
    }

    setNcData(mockNCData.map(item => ({ ...item, type: 'NC' as const })));
    setAcData(mockACData.map(item => ({ ...item, type: 'AC' as const })));
  };

  useEffect(() => {
    const showWelcome = sessionStorage.getItem("showWelcome")
    if (showWelcome === "true") {
      Swal.fire({
        icon: 'success',
        title: 'ยินดีต้อนรับเข้าสู่ระบบ',
        text: 'Mena-NCAC',
        draggable: true
      })

      sessionStorage.removeItem("showWelcome")
    }
  }, []);

  useEffect(() => {
    fetchData();
    console.log('Fetching data for:', selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (useMockData) {
      generateMockData();
    }
  }, [useMockData, selectedMonth, selectedYear]);

  const fetchData = async () => {
    if (useMockData) {
      generateMockData();
      return;
    }

    setLoading(true);
    try {
      let startDate: string;
      let endDate: string;

      if (selectedMonth === 'all') {
        // ดึงข้อมูลทั้งปี
        startDate = `${selectedYear}-01-01`;
        endDate = `${selectedYear}-12-31`;
      } else {
        // ดึงข้อมูลตามเดือนที่เลือก
        const monthNum = parseInt(selectedMonth);
        startDate = `${selectedYear}-${String(monthNum).padStart(2, '0')}-01`;
        endDate = new Date(selectedYear, monthNum, 0).toISOString().split('T')[0];
      }

      const [ncResponse, acResponse] = await Promise.all([
        fetch(`/api/document/nc?start_date=${startDate}&end_date=${endDate}`),
        fetch(`/api/document/ac?start_date=${startDate}&end_date=${endDate}`)
      ]);

      if (ncResponse.ok && acResponse.ok) {
        const ncResult = await ncResponse.json();
        const acResult = await acResponse.json();
        console.log('NC Data:', ncResult);
        console.log('AC Data:', acResult);
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
      filteredNcData = filteredNcData.filter(item => item.site === selectedCenter);
      filteredAcData = filteredAcData.filter(item => item.site_name === selectedCenter);
    }

    const allData = [...filteredNcData, ...filteredAcData];

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
      const date = item.incident_date?.split('T')[0];
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
      const date = new Date(item.incident_date?.split('T')[0] || '');
      const monthKey = date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
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
      filteredNcData = filteredNcData.filter(item => item.site === selectedCenter);
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
      const date = new Date(item.incident_date || '');
      const monthKey = date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
      if (!monthlyCosts[monthKey]) {
        monthlyCosts[monthKey] = { NC: 0, AC: 0 };
      }
      monthlyCosts[monthKey].NC += item.actual_price || 0;
    });

    filteredAcData.forEach((item: any) => {
      const date = new Date(item.incident_date || '');
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
      filteredNcData = filteredNcData.filter(item => item.site === selectedCenter);
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
    <div className="min-h-screen bg-gradient-to-br from-[#d1ffe1] to-indigo-100">
      <div className="p-6 space-y-6">
        {/* Header - Mock Data Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 bg-white rounded-xl shadow-md px-4 py-2 border border-gray-200">
            <span className="text-sm font-medium text-gray-700">Mock Data</span>
            <button
              onClick={() => setUseMockData(!useMockData)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useMockData ? 'bg-green-500' : 'bg-gray-300'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useMockData ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
            <span className={`text-xs font-semibold ${useMockData ? 'text-green-600' : 'text-gray-400'}`}>
              {useMockData ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>

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