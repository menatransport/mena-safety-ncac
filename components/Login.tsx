"use client";
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { LordIcon } from './LordIcon';

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const router = useRouter();

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      alert('กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน');
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('กำลังเข้าสู่ระบบด้วย:', { username, password });
      
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
      console.log('Response data:', data);
      console.log('Token:', data.access_token);
      console.log('User:', data.user);
      if (data.access_token && data.user) {
        
          localStorage.setItem('authToken', data.access_token);
          localStorage.setItem('userData', JSON.stringify({ ...data.user, rememberMe , password }));
          setTimeout(() => {
            sessionStorage.setItem("showWelcome", "true")
            router.push("/overview");
            setIsLoading(false);
          }, 1000)

        } else {
          alert('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
          setIsLoading(false);
      }
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการเข้าสู่ระบบ:', error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
      setIsLoading(false);
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
            Mena Safety System Powered by Operations Support
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
              เข้าสู่ระบบ
            </h2>
            {/* <p className="text-gray-500 text-sm">ยินดีต้อนรับกลับมา</p> */}
          </div>
        {/* Login Form */}
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
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full opacity-0 peer-focus:opacity-100 transition-opacity"></div>
                </div>
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-gray-700 text-sm font-semibold">รหัสผ่าน</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-2 absolute right-1 top-1/2 transform -translate-y-1/2 transition-colors z-10"
                  title={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  <LordIcon 
                    src={"https://cdn.lordicon.com/vfczflna.json" }
                    trigger="hover"
                    colors="primary:#4285f4,secondary:#34a853"
                    style={{ width: '32px', height: '32px' , stroke: 'bold' }}
                  />
                </button>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-5 pr-4 py-4 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 font-medium"
                  placeholder="กรอกรหัสผ่าน"
                  required
                />
              </div>
              <div className="hidden text-xs text-gray-500 flex items-center space-x-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>รหัสผ่านควรมีความยาวอย่างน้อย 8 ตัวอักษร</span>
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
              <a href="#" className="text-emerald-600 hover:text-emerald-700 text-sm transition-colors font-medium hover:underline">
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
          </form>

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
                © 2025 Mena Safety • เวอร์ชัน *****
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