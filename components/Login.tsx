"use client";
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { LordIcon } from './LordIcon';
import { useDropdownStore , handleFetchData } from '../lib/dropdownlist';
import { SearchableSelect } from "./ui/searchable-select";
import Swal from "sweetalert2";
import { sendErrorLog } from "@/lib/logError";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [guideMode, setGuideMode] = useState<"guide" | "test">("guide");
  const [showRegister, setShowRegister] = useState(false);
  const [registerData, setRegisterData] = useState({
    firstname: "",
    lastname: "",
    firstname_th: "",
    lastname_th: "",
    employee_id: "",
    department_id: "",
    site_id: "",
    position_id: "",
    username: "",
    password: ""
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [usernameConfirmed, setUsernameConfirmed] = useState(false);
  const [passwordConfirmed, setPasswordConfirmed] = useState(false);
  const router = useRouter();
  const { fetchDropdownData, departments, sites, positions } = useDropdownStore();

  useEffect(() => {
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      const userData = JSON.parse(storedUserData);
      if(userData.rememberMe) {
        setUsername(userData.username || "");
        setPassword(userData.password || "");
        setRememberMe(true);
      }
    }
  }, []);

  // Load dropdown data for registration
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        await fetchDropdownData();
      } catch (error) {
        console.error('Error loading dropdown data:', error);
      }
    };

    loadDropdownData();
  }, [fetchDropdownData]);

  // Auto-generate username when firstname and lastname change
  useEffect(() => {
    if (registerData.firstname && registerData.lastname) {
      const username = `${registerData.firstname.toLowerCase()}.${registerData.lastname.toLowerCase().charAt(0)}`;
      setRegisterData(prev => ({
        ...prev,
        username: username
      }));
    }
  }, [registerData.firstname, registerData.lastname]);

  // Auto-generate password when employee_id changes
  useEffect(() => {
    if (registerData.employee_id && registerData.employee_id.length >= 4) {
      const lastFourDigits = registerData.employee_id.slice(-4);
      const password = `Mnt@${lastFourDigits}`;
      setRegisterData(prev => ({
        ...prev,
        password: password
      }));
    }
  }, [registerData.employee_id]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน',
        confirmButtonText: 'ตกลง',
      });
      return;
    }
    
    setIsLoading(true);
    
    try {   
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: username, 
          password: password
        }),
      });
      
      const data = await res.json();
      if (data.access_token && data.user) {
        localStorage.setItem('authToken', data.access_token);
        localStorage.setItem('userData', JSON.stringify({ ...data.user, rememberMe , password }));
        
        fetchDropdownData();
        setTimeout(() => {
          sessionStorage.setItem("showWelcome", "true")
          router.push("/overview");
        }, 3000)
      } else {
        sendErrorLog("Login/handleLogin", `Login failed for user: ${username} ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง`);
        Swal.fire({
          icon: 'error',
          title: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง',
          text: 'กรุณาลองใหม่อีกครั้ง',
          confirmButtonText: 'ตกลง',
        });
        setIsLoading(false);
      }
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการเข้าสู่ระบบ:', error);
      sendErrorLog("Login/handleLogin", error instanceof Error ? error : String(error));
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
        text: 'กรุณาลองใหม่อีกครั้ง',
        confirmButtonText: 'ตกลง',
      });
      setIsLoading(false);
    } 
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!registerData.firstname || !registerData.lastname || !registerData.employee_id || 
        !registerData.department_id || !registerData.site_id || !registerData.position_id ||
        !registerData.username || !registerData.password) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
        confirmButtonText: 'ตกลง',
      });
      return;
    }

    if (!usernameConfirmed || !passwordConfirmed) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณายืนยันชื่อผู้ใช้งานและรหัสผ่าน',
        text: 'คลิกปุ่ม "ยืนยัน" ทั้งชื่อผู้ใช้งานและรหัสผ่านก่อนลงทะเบียน',
        confirmButtonText: 'ตกลง',
      });
      return;
    }

    if (registerData.password.length < 6) {
      Swal.fire({
        icon: 'warning',
        title: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร',
        confirmButtonText: 'ตกลง',
      });
      return;
    }
    
    setRegisterLoading(true);
    
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstname: registerData.firstname_th,
          lastname: registerData.lastname_th,
          employee_id: registerData.employee_id,
          department_id: parseInt(registerData.department_id),
          site_id: parseInt(registerData.site_id),
          position_id: parseInt(registerData.position_id),
          username: registerData.username,
          password: registerData.password
        }),
      });
      
      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'ลงทะเบียนสำเร็จ',
          text: 'กรุณาเข้าสู่ระบบด้วยบัญชีใหม่ของคุณ',
          confirmButtonText: 'ตกลง',
        }).then(() => {
          // setShowRegister(false);
          // setUsernameConfirmed(false);
          // setPasswordConfirmed(false);
          // setRegisterData({
          //   firstname: "",
          //   lastname: "",
          //   employee_id: "",
          //   department_id: "",
          //   site_id: "",
          //   position_id: "",
          //   username: "",
          //   password: ""
          // });
        });
      } else {
        sendErrorLog("Login/handleRegister", `Registration failed: ${data.message || 'Unknown error'}`);
        Swal.fire({
          icon: 'error',
          title: 'การลงทะเบียนไม่สำเร็จ',
          text: data.message || 'กรุณาลองใหม่อีกครั้ง',
          confirmButtonText: 'ตกลง',
        });
      }
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการลงทะเบียน:', error);
      sendErrorLog("Login/handleRegister", error instanceof Error ? error : String(error));
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
        text: 'กรุณาลองใหม่อีกครั้ง',
        confirmButtonText: 'ตกลง',
      });
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleRegisterInputChange = (field: string, value: string) => {
    setRegisterData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Reset confirmation when values change
    if (field === 'username') {
      setUsernameConfirmed(false);
    }
    if (field === 'password') {
      setPasswordConfirmed(false);
    }
  };

  const confirmUsername = () => {
    if (registerData.username.trim()) {
      setUsernameConfirmed(true);
    }
  };

  const confirmPassword = () => {
    if (registerData.password.trim() && registerData.password.length >= 6) {
      setPasswordConfirmed(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-green-100 to-emerald-300 flex items-center justify-center p-6">
      {/* Main Content */}
      <div className="w-full max-w-md mt-5">
        {/* Logo section */}
        <div className="text-center mb-2">
          <div
            className={`inline-flex items-center justify-center w-50 h-25 bg-gradient-to-br from-white-400 to-white-500 rounded-2xl mb-4  transform transition-all duration-700 ease-out ${
              isVisible ? "scale-100 rotate-0" : "scale-0 rotate-45"
            }`}
          >
            <img src="/mena.png" alt="Logo" className="w-40 h-25" />
          </div>
          <h1
            className={`text-2xl font-bold text-gray-800 mb-1 transform transition-all duration-700 ease-out delay-200 ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-4 opacity-0"
            }`}
          >
            ระบบจัดการเอกสาร NC/AC
          </h1>
          <p
            className={`text-gray-800 text-sm transform transition-all duration-700 ease-out delay-300 ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-4 opacity-0"
            }`}
          >
            MENA NCAC System Powered by Operations Support
          </p>
        </div>
        
        {/* Login Card */}
        <div
          className={`bg-white rounded-3xl shadow-xl p-5 backdrop-blur-sm bg-opacity-95 transform transition-all duration-700 ease-out delay-400 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="text-center mb-3">
            <h2 className="text-xl font-semibold text-gray-800 mb-1">
              {showRegister ? 'ลงทะเบียนผู้ใช้ใหม่' : 'เข้าสู่ระบบ'}
            </h2>
           
          </div>
          
          {/* Login/Register Form */}
          {!showRegister ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Username Field */}
              <div className="space-y-2">
                <label className="text-gray-700 text-sm font-semibold">ชื่อผู้ใช้งาน</label>
                <div className="relative">
                  <div className="p-2 absolute right-1 top-1/2 transform -translate-y-1/2 z-10">
                    <LordIcon 
                      src="https://cdn.lordicon.com/dxjqoygy.json"
                      trigger="hover"
                      colors="primary:#4285f4,secondary:#34a853"
                      style={{ width: '32px', height: '32px' , stroke: 'bold' }}
                    />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-5 pr-4 py-4 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 font-medium"
                    placeholder="กรอกชื่อผู้ใช้งาน"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-gray-700 text-sm font-semibold">รหัสผ่าน</label>
                <div className="relative">
                  <div className="p-2 absolute right-1 top-1/2 transform -translate-y-1/2 z-10" onClick={() => setShowPassword(!showPassword)} title={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>
                    <LordIcon 
                      src={"https://cdn.lordicon.com/vfczflna.json" }
                      trigger="hover"
                      colors="primary:#4285f4,secondary:#34a853"
                      style={{ width: '32px', height: '32px' , stroke: 'bold' }}
                    />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-5 pr-4 py-4 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 font-medium"
                    placeholder="กรอกรหัสผ่าน"
                    required
                  />
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-6 h-6 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                      rememberMe 
                        ? 'bg-emerald-500 border-emerald-500 shadow-sm' 
                        : 'border-gray-300 group-hover:border-emerald-500 bg-white'
                    }`}>
                      {rememberMe && (
                        <LordIcon 
                          src="https://cdn.lordicon.com/oqdmuxru.json"
                          trigger="in"
                          colors="primary:#ffffff"
                          style={{ width: '22px', height: '20px' , stroke: 'bold' }}
                        />
                      )}
                    </div>
                  </div>
                  <span className="text-gray-700 text-sm select-none font-medium">จดจำการเข้าสู่ระบบ</span>
                </label>
                <a href="https://mail.google.com/mail/?view=cm&to=kittaboon.l@menatransport.co.th&cc=patcharapan.p@menatransport.co.th,narongkorn.a@menatransport.co.th&su=MENA-NCAC แจ้งลืมรหัสผ่าน&body=สวัสดีครับ/ค่ะ%0A%0Aฉันต้องการขอรีเซ็ตรหัสผ่านสำหรับระบบ MENA-NCAC%0A%0Aชื่อ-นามสกุล: %0Aรหัสพนักงาน (6800XX) : %0A%0Aขอบคุณครับ/ค่ะ" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 text-sm transition-colors font-medium hover:underline">
                  ลืมรหัสผ่าน?
                </a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-4 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center space-x-2 ${
                  isLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 active:scale-98 shadow-lg hover:shadow-xl'
                }`}
              >
                {isLoading ? (
                  <>
                    <LordIcon 
                      src="https://cdn.lordicon.com/xjovhxra.json"
                      trigger="loop"
                      colors="primary:#ffffff"
                      style={{ width: '24px', height: '24px' }}
                    />
                    <span>กำลังดำเนินการ...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    <span>เข้าสู่ระบบ</span>
                  </>
                )}
              </button>
              
              <div className="text-center mt-4">
                <span className="text-gray-600 text-sm">ยังไม่มีบัญชี? </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowRegister(true);
                    fetchDropdownData();
                  }}
                  className="text-emerald-600 hover:text-emerald-700 text-sm font-medium hover:underline transition-colors"
                >
                  ลงทะเบียนใหม่
                </button>
              </div>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-gray-700 text-xs font-semibold">ชื่อจริง (ภาษาอังกฤษ)</label>
                  <input
                    type="text"
                    value={registerData.firstname}
                    onChange={(e) => handleRegisterInputChange('firstname', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#cfe5d0] focus:border-[#cfe5d0] transition-all duration-200 text-sm"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-gray-700 text-xs font-semibold">นามสกุล (ภาษาอังกฤษ)</label>
                  <input
                    type="text"
                    value={registerData.lastname}
                    onChange={(e) => handleRegisterInputChange('lastname', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#cfe5d0] focus:border-[#cfe5d0] transition-all duration-200 text-sm"
                    required
                  />
                </div>
                {/* firstname_lastname_TH */}
                <div className="space-y-1">
                  <label className="text-gray-700 text-xs font-semibold">ชื่อจริง (ภาษาไทย)</label>
                  <input
                    type="text"
                    value={registerData.firstname_th}
                    onChange={(e) => handleRegisterInputChange('firstname_th', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#cfe5d0] focus:border-[#cfe5d0] transition-all duration-200 text-sm"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-gray-700 text-xs font-semibold">นามสกุล (ภาษาไทย)</label>
                  <input
                    type="text"
                    value={registerData.lastname_th}
                    onChange={(e) => handleRegisterInputChange('lastname_th', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#cfe5d0] focus:border-[#cfe5d0] transition-all duration-200 text-sm"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-gray-700 text-xs font-semibold">รหัสพนักงาน <span className="text-gray-400 text-xs" >(6800XX)</span> </label>
                <input
                  type="number"
                  value={registerData.employee_id}
                  onChange={(e) => handleRegisterInputChange('employee_id', String(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#cfe5d0] focus:border-[#cfe5d0] transition-all duration-200 text-sm"
                  required
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-gray-700 text-xs font-semibold">สำนักงาน/ศูนย์ปฏิบัติการ</label>
                <SearchableSelect
                  value={registerData.site_id}
                  onChange={(value) => handleRegisterInputChange('site_id', String(value))}
                  options={[
                    { value: "", label: "" },
                    ...(sites?.map((site) => ({
                      value: site.site_id.toString(),
                      label: site.site_name_th
                    })) || [])
                  ]}
                  className="w-full px-3 py-2 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#cfe5d0] focus:border-[#cfe5d0] transition-all duration-200 text-sm"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-gray-700 text-xs font-semibold">ฝ่าย</label>
                <SearchableSelect
                  value={registerData.department_id}
                  onChange={(value) => handleRegisterInputChange('department_id', String(value))}
                  options={[
                    { value: "", label: "" },
                    ...(departments?.map((dept) => ({
                      value: dept.department_id.toString(),
                      label: dept.department_name_th
                    })) || [])
                  ]}
                  className="w-full px-3 py-2 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#cfe5d0] focus:border-[#cfe5d0] transition-all duration-200 text-sm"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-gray-700 text-xs font-semibold">ตำแหน่ง</label>
                <SearchableSelect
                  value={registerData.position_id}
                  onChange={(value) => handleRegisterInputChange('position_id', String(value))}
                  onClick={() => { fetchDropdownData(); }}
                  options={[
                    { value: "", label: "" },
                    ...(positions?.map((pos) => ({
                      value: pos.position_id.toString(),
                      label: pos.position_name_th
                    })) || [])
                  ]}
                  className="w-full px-3 py-2 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#cfe5d0] focus:border-[#cfe5d0] transition-all duration-200 text-sm"
                />
              </div>
              
              <div className="border-t pt-3 space-y-3">
                <div className="space-y-1">
                  <label className="text-gray-700 text-xs font-semibold">ชื่อผู้ใช้งาน</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={registerData.username}
                      onChange={(e) => handleRegisterInputChange('username', e.target.value)}
                      className={`w-full border rounded-md px-3 py-2 pr-20 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-200 text-sm ${
                        usernameConfirmed 
                          ? 'border-green-300 bg-green-50 focus:ring-green-200 focus:border-green-300'
                          : 'border-gray-300 focus:ring-[#cfe5d0] focus:border-[#cfe5d0]'
                      }`}
                      required
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      {!usernameConfirmed ? (
                        <button 
                          type="button" 
                          onClick={confirmUsername}
                          disabled={!registerData.username.trim()}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            registerData.username.trim() 
                              ? 'text-blue-600 bg-blue-50 hover:bg-blue-100 cursor-pointer'
                              : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                          }`}
                        >
                          ยืนยัน
                        </button>
                      ) : (
                        <div className="flex items-center space-x-1 text-green-600 bg-green-50 px-2 py-1 rounded">
                          <LordIcon 
                            src="https://cdn.lordicon.com/oqdmuxru.json"
                            trigger="in"
                            colors="primary:#16a34a"
                            style={{ width: '14px', height: '14px' }}
                          />
                          <span className="text-xs">ยืนยันแล้ว</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-gray-700 text-xs font-semibold">รหัสผ่าน</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={registerData.password}
                      onChange={(e) => handleRegisterInputChange('password', e.target.value)}
                      className={`w-full border rounded-md px-3 py-2 pr-20 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-200 text-sm ${
                        passwordConfirmed 
                          ? 'border-green-300 bg-green-50 focus:ring-green-200 focus:border-green-300'
                          : 'border-gray-300 focus:ring-[#cfe5d0] focus:border-[#cfe5d0]'
                      }`}
                      required
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      {!passwordConfirmed ? (
                        <button 
                          type="button" 
                          onClick={confirmPassword}
                          disabled={!registerData.password.trim() || registerData.password.length < 6}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            registerData.password.trim() && registerData.password.length >= 6
                              ? 'text-blue-600 bg-blue-50 hover:bg-blue-100 cursor-pointer'
                              : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                          }`}
                        >
                          ยืนยัน
                        </button>
                      ) : (
                        <div className="flex items-center space-x-1 text-green-600 bg-green-50 px-2 py-1 rounded">
                          <LordIcon 
                            src="https://cdn.lordicon.com/oqdmuxru.json"
                            trigger="in"
                            colors="primary:#16a34a"
                            style={{ width: '14px', height: '14px' }}
                          />
                          <span className="text-xs">ยืนยันแล้ว</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRegister(false);
                    setUsernameConfirmed(false);
                    setPasswordConfirmed(false);
                    setRegisterData({
                      firstname: "",
                      lastname: "",
                      firstname_th: "",
                      lastname_th: "",
                      employee_id: "",
                      department_id: "",
                      site_id: "",
                      position_id: "",
                      username: "",
                      password: ""
                    });
                  }}
                  className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium text-sm"
                >
                  ยกเลิก
                </button>
                
                <button
                  type="submit"
                  disabled={registerLoading}
                  className={`flex-1 py-3 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center space-x-2 text-sm ${
                    registerLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 active:scale-98 shadow-lg hover:shadow-xl'
                  }`}
                >
                  {registerLoading ? (
                    <>
                      <LordIcon 
                        src="https://cdn.lordicon.com/xjovhxra.json"
                        trigger="loop"
                        colors="primary:#ffffff"
                        style={{ width: '20px', height: '20px' }}
                      />
                      <span>กำลังลงทะเบียน...</span>
                    </>
                  ) : (
                    <>
                      <LordIcon 
                        src="https://cdn.lordicon.com/jvucoldz.json"
                        trigger="hover"
                        colors="primary:#ffffff"
                        style={{ width: '20px', height: '20px' }}
                      />
                      <span>ลงทะเบียน</span>
                    </>
                  )}
                </button>
              </div>
              
              <div className="text-center mt-4">
                <span className="text-gray-600 text-sm">มีบัญชีอยู่แล้ว? </span>
                <button
                  type="button"
                  onClick={() => setShowRegister(false)}
                  className="text-emerald-600 hover:text-emerald-700 text-sm font-medium hover:underline transition-colors"
                >
                  เข้าสู่ระบบ
                </button>
              </div>
            </form>
          )}

          <div className="hidden relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">หรือเข้าสู่ระบบด้วย</span>
            </div>
          </div>

          <div className="hidden space-y-3">
            <button className="w-full py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center space-x-3 font-medium">
              <LordIcon 
                src="https://cdn.lordicon.com/uewqxptr.json"
                trigger="hover"
                colors="primary:#4285f4,secondary:#34a853,tertiary:#ea4335,quaternary:#fbbc05"
                style={{ width: '24px', height: '24px' }}
              />
              <span>Google Workspace</span>
            </button>
          </div>

          <div className="mt-5">
            {/* Footer */}
            <div className="text-center space-y-2">
              <p className="text-gray-400 text-xs">
                © 2025 MENA NCAC • V.1.2.0
              </p>
              <div className="hidden justify-center space-x-4 text-xs">
                <a href="#" className="text-gray-500 hover:text-emerald-600 transition-colors">นโยบายความเป็นส่วนตัว</a>
                <span className="text-gray-300">•</span>
                <a href="#" className="text-gray-500 hover:text-emerald-600 transition-colors">เงื่อนไขการใช้งาน</a>
                <span className="text-gray-300">•</span>
                <a href="#" className="text-gray-500 hover:text-emerald-600 transition-colors">ช่วยเหลือ</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}