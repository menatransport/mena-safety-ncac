"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LordIcon } from './LordIcon';
import { signIn, getSession } from "next-auth/react";
import { useDropdownStore } from '../lib/dropdownlist';
import Swal from "sweetalert2";
import { sendErrorLog } from "@/lib/logError";
import Loading from "@/components/loading";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { fetchDropdownData } = useDropdownStore();

  useEffect(() => {
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      const userData = JSON.parse(storedUserData);
      if (userData.rememberMe) {
        setUsername(userData.username || "");
        setPassword(userData.password || "");
        setRememberMe(true);
      }
    }
  }, []);

  const processLogin = async (body: object): Promise<boolean> => {

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    
      const data = await res.json();
        // console.log("Login data :", data);
      if (data.access_token && data.user) {
        localStorage.setItem('authToken', data.access_token);
        localStorage.setItem('userData', JSON.stringify({ ...data.user, rememberMe, password }));

        fetchDropdownData();
  
        setTimeout(() => {
          sessionStorage.setItem("showWelcome", "true")
          router.push("/overview");
        }, 3000)

        return true;
      } else {
        sendErrorLog("Login/handleLogin", `Login failed for user ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง`);
        Swal.fire({
          icon: 'error',
          title: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง',
          text: 'กรุณาลองใหม่อีกครั้ง',
          confirmButtonText: 'ตกลง',
        });
        setIsLoading(false);
        return false;
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
      return false;
    }
  };

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

    await processLogin({ username, password });
  }

  useEffect(() => {

    if (searchParams.get('google') !== 'true') return;

    const checkGoogleSession = async () => {
      const session = await getSession() as any;
      if (session?.id_token) {
        await processLogin({ id_token: session.id_token });
      }
    };
    checkGoogleSession();
  }, [searchParams]);


  const handleAuthengoogle = () => {
    setIsLoading(true);
    signIn('google', { callbackUrl: '/login?google=true' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-green-100 to-emerald-300 flex items-center justify-center p-6">
      {isLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <Loading />
        </div>
      )}
      <div className="w-full max-w-md mt-5">
        {/* Logo section */}
        <div className="text-center mb-2">
          <div
            className={`inline-flex items-center justify-center w-50 h-25 bg-gradient-to-br from-white-400 to-white-500 rounded-2xl mb-4  transform transition-all duration-700 ease-out ${isVisible ? "scale-100 rotate-0" : "scale-0 rotate-45"
              }`}
          >
            <img src="/mena.png" alt="Logo" className="w-40 h-25" />
          </div>
          <h1
            className={`text-2xl font-bold text-gray-800 mb-1 transform transition-all duration-700 ease-out delay-200 ${isVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
              }`}
          >
            ระบบจัดการเอกสาร NC/AC
          </h1>
          <p
            className={`text-gray-800 text-sm transform transition-all duration-700 ease-out delay-300 ${isVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
              }`}
          >
            MENA NCAC System Powered by Operations Support
          </p>
        </div>

        {/* Login Card */}
        <div
          className={`bg-white rounded-3xl shadow-xl p-5 backdrop-blur-sm bg-opacity-95 transform transition-all duration-700 ease-out delay-400 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
        >
          <div className="text-center mb-3">
            <h2 className="text-xl font-semibold text-gray-800 mb-1">
              เข้าสู่ระบบ
            </h2>
          </div>

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
                    style={{ width: '32px', height: '32px', stroke: 'bold' }}
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
                    src={"https://cdn.lordicon.com/vfczflna.json"}
                    trigger="hover"
                    colors="primary:#4285f4,secondary:#34a853"
                    style={{ width: '32px', height: '32px', stroke: 'bold' }}
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
                  <div className={`w-6 h-6 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${rememberMe
                    ? 'bg-emerald-500 border-emerald-500 shadow-sm'
                    : 'border-gray-300 group-hover:border-emerald-500 bg-white'
                    }`}>
                    {rememberMe && (
                      <LordIcon
                        src="https://cdn.lordicon.com/oqdmuxru.json"
                        trigger="in"
                        colors="primary:#ffffff"
                        style={{ width: '22px', height: '20px', stroke: 'bold' }}
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
              className={`w-full cursor-pointer py-4 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center space-x-2 ${isLoading
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

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">หรือ</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-center mb-2 bg-white">
              <button type="button" onClick={handleAuthengoogle} className="flex justify-center items-center w-full cursor-pointer bg-white border border-gray-300 rounded-lg shadow-md px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                <svg className="h-6 w-6 mr-2" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" width="800px" height="800px" viewBox="-0.5 0 48 48" version="1.1"> <title>Google-color</title> <desc>Created with Sketch.</desc> <defs> </defs> <g id="Icons" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd"> <g id="Color-" transform="translate(-401.000000, -860.000000)"> <g id="Google" transform="translate(401.000000, 860.000000)"> <path d="M9.82727273,24 C9.82727273,22.4757333 10.0804318,21.0144 10.5322727,19.6437333 L2.62345455,13.6042667 C1.08206818,16.7338667 0.213636364,20.2602667 0.213636364,24 C0.213636364,27.7365333 1.081,31.2608 2.62025,34.3882667 L10.5247955,28.3370667 C10.0772273,26.9728 9.82727273,25.5168 9.82727273,24" id="Fill-1" fill="#FBBC05"> </path> <path d="M23.7136364,10.1333333 C27.025,10.1333333 30.0159091,11.3066667 32.3659091,13.2266667 L39.2022727,6.4 C35.0363636,2.77333333 29.6954545,0.533333333 23.7136364,0.533333333 C14.4268636,0.533333333 6.44540909,5.84426667 2.62345455,13.6042667 L10.5322727,19.6437333 C12.3545909,14.112 17.5491591,10.1333333 23.7136364,10.1333333" id="Fill-2" fill="#EB4335"> </path> <path d="M23.7136364,37.8666667 C17.5491591,37.8666667 12.3545909,33.888 10.5322727,28.3562667 L2.62345455,34.3946667 C6.44540909,42.1557333 14.4268636,47.4666667 23.7136364,47.4666667 C29.4455,47.4666667 34.9177955,45.4314667 39.0249545,41.6181333 L31.5177727,35.8144 C29.3995682,37.1488 26.7323182,37.8666667 23.7136364,37.8666667" id="Fill-3" fill="#34A853"> </path> <path d="M46.1454545,24 C46.1454545,22.6133333 45.9318182,21.12 45.6113636,19.7333333 L23.7136364,19.7333333 L23.7136364,28.8 L36.3181818,28.8 C35.6879545,31.8912 33.9724545,34.2677333 31.5177727,35.8144 L39.0249545,41.6181333 C43.3393409,37.6138667 46.1454545,31.6490667 46.1454545,24" id="Fill-4" fill="#4285F4"> </path> </g> </g> </g> </svg>
                <span>Continue with Google</span>
              </button>
            </div>
          </div>

          
        </div>
        <div className="mt-5">
            {/* Footer */}
            <div className="text-center space-y-2">
              <p className="text-gray-700 text-xs">
                © 2025 MENA NCAC • V.1.4.0 
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
  );
}