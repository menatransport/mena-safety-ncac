"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Swal from "sweetalert2";
import { useUiTheme } from "@/lib/useUiTheme";
import {
  LayoutDashboard,
  SquarePen,
  Database,
  Settings,
  ArrowLeft,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
  Home,
  Menu,
  X,
  Bell,
  LogOut
} from "lucide-react";

const menuItems = [
  {
    title: "หน้าหลัก",
    url: "/home",
    icon: Home
  },
  {
    title: "ภาพรวมระบบ",
    url: "/overview",
    icon: LayoutDashboard
  }
];

const formMenuItems = [
  {
    title: "สร้างรายงาน NC",
    url: "/nc-form",
    icon: SquarePen
  },
  {
    title: "สร้างรายงาน AC",
    url: "/ac-form",
    icon: SquarePen
  }
];

const recordMenuItems = [
  {
    title: "ข้อมูล NC",
    url: "/nc-records",
    icon: Database
  },
  {
    title: "ข้อมูล AC",
    url: "/ac-records",
    icon: Database
  }
];

const systemMenuItems = [
  {
    title: "Setting",
    url: "/settings",
    icon: Settings
  }
];

interface NavComponentProps {
  children?: React.ReactNode;
}

export const NavComponent: React.FC<NavComponentProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formsExpanded, setFormsExpanded] = useState(false); // ปรับเป็น true เพื่อขยายเมนู Forms เริ่มต้น
  const [recordsExpanded, setRecordsExpanded] = useState(false); // ปรับเป็น true เพื่อขยายเมนู Records เริ่มต้น
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const { theme, isDark, toggleTheme } = useUiTheme();
  const router = useRouter();
  const pathname = usePathname();
  const isSidebarHidden = sidebarHidden === "hidden";


  useEffect(() => {
    const storedUserData = localStorage.getItem("userData");
    if (storedUserData) {
      setUserInfo(JSON.parse(storedUserData));
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const currentDocId = params.get("doc");
    const pathname = (window.location.pathname).split("/").slice(1)[0]
    // console.log("Current pathname:", pathname);
    if (currentDocId || pathname === "trainer-app") {
      setSidebarCollapsed(true);
      setSidebarHidden("hidden");
    }
  }, [pathname]);

  // Mobile detection - sidebar is closed by default on mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Close mobile menu when resizing to desktop
      if (!mobile) {
        setMobileMenuOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);


  useEffect(() => {
    const currentPath = pathname;
    if (formMenuItems.some(item => item.url === currentPath)) {
      setFormsExpanded(true);
    }
    if (recordMenuItems.some(item => item.url === currentPath)) {
      setRecordsExpanded(true);
    }
  }, [pathname]);

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  const handleNavigation = (url: string) => {
    router.push(url);
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Logout',
      text: 'คุณต้องการออกจากระบบหรือไม่?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ออกจากระบบ',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: false,
      customClass: {
        popup: 'rounded-xl',
        title: 'text-gray-800',
        confirmButton: 'rounded-lg',
        cancelButton: 'rounded-lg'
      }
    });

    if (result.isConfirmed) {
      const rememberMe = localStorage.getItem("userData") ? JSON.parse(localStorage.getItem("userData") || "{}").rememberMe : false;
      // console.log('rememberMe : ', rememberMe);
      if (!rememberMe) {
        localStorage.removeItem("userData");
      }
      localStorage.removeItem("authToken");
      await signOut({ callbackUrl: '/login' });
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-br from-slate-800 via-slate-700 to-[#3d5578]" : "bg-gradient-to-br from-white via-gray-100 to-gray-200"} flex`}>

      {/* Mobile Overlay */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Fixed */}
      <div className={`${sidebarHidden} ${isMobile
        ? `fixed inset-y-0 left-0 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} w-64 z-50 transition-transform duration-300 ease-in-out`
        : `${sidebarCollapsed ? 'w-16' : 'w-64'} fixed h-full z-30 transition-all duration-300`
        } ${isDark ? 'bg-slate-900/90 border-white/10' : 'bg-white/95 border-slate-200/70'} backdrop-blur-xl border-r flex-shrink-0`}>

        {/* Header */}
        <div className={`p-4 border-b ${isDark ? 'border-white/10 bg-gradient-to-r from-white/5 to-transparent' : 'border-slate-200/70 bg-gradient-to-r from-emerald-50/70 to-white/80'}`}>
          <div className="flex items-center justify-between">
            {(!sidebarCollapsed || isMobile) && (
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${isDark ? 'bg-white/10 border-white/20' : 'bg-white border-slate-200'}`}>
                  <img src="/mena.png" alt="Logo" className="w-16 h-8 text-white drop-shadow-sm" />
                </div>
                <div>
                  <h2 className={`font-bold ${isDark ? "text-white" : "text-gray-800"} text-md tracking-tight`}>MENA NCAC</h2>
                  <p className={`text-xs font-medium ${isDark ? "text-cyan-300" : "text-gray-500"}`}>ระบบจัดการเอกสาร NC/AC</p>
                </div>
              </div>
            )}

            {/* Desktop: Toggle sidebar, Mobile: Close button only */}
            {isMobile ? (
              <button
                onClick={() => setMobileMenuOpen(false)}
                className={`p-2 rounded-xl transition-all duration-300 group ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
              >
                <X size={20} className={`${isDark ? 'text-white/50 group-hover:text-white' : 'text-slate-500 group-hover:text-slate-900'} transition-colors`} />
              </button>
            ) : (
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={`p-2 rounded-xl transition-all duration-300 group ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
              >
                {sidebarCollapsed ? (
                  <Menu size={20} className={`${isDark ? 'text-white/50 group-hover:text-white' : 'text-slate-500 group-hover:text-slate-900'} transition-colors`} />
                ) : (
                  <X size={20} className={`${isDark ? 'text-white/50 group-hover:text-white' : 'text-slate-500 group-hover:text-slate-900'} transition-colors`} />
                )}
              </button>
            )}
          </div>
        </div>

        <div className="p-4 space-y-6">


          <div>
            <h3 className={`text-xs font-bold uppercase tracking-widest mb-3 ${(sidebarCollapsed && !isMobile) ? 'hidden' : ''} ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
              เมนูหลัก
            </h3>
            <nav className="space-y-1.5">


              {menuItems.map((item) => (
                <button
                  key={item.title}
                  onClick={() => handleNavigation(item.url)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-300 group ${isActive(item.url)
                    ? (isDark ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-lg shadow-indigo-500/30 scale-[1.02]' : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 scale-[1.02]')
                    : (isDark ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800')
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon
                      size={sidebarCollapsed && !isMobile ? 24 : 20}
                      className={`transition-all duration-300 group-hover:scale-110 ${isActive(item.url) ? "text-white" : (isDark ? "text-white/40 group-hover:text-white" : "text-slate-500 group-hover:text-emerald-600")}`}
                    />
                  </div>
                  {(!sidebarCollapsed || isMobile) && (
                    <span className="font-medium">{item.title}</span>
                  )}
                </button>
              ))}

              {/* Forms Group */}
              <div>
                <button
                  onClick={() => {
                    if (sidebarCollapsed && !isMobile) {
                      setSidebarCollapsed(false);
                      setFormsExpanded(true);
                    } else {
                      setFormsExpanded(!formsExpanded);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-300 group ${isDark ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'}`}
                >
                  <div className="flex items-center space-x-3">
                    <SquarePen size={sidebarCollapsed && !isMobile ? 24 : 20} className={`transition-all duration-300 group-hover:scale-110 ${isDark ? 'text-white/40 group-hover:text-white' : 'text-slate-500 group-hover:text-emerald-600'}`} />
                    {(!sidebarCollapsed || isMobile) && (
                      <span className="font-semibold">ฟอร์มรายงาน</span>
                    )}
                  </div>
                  {(!sidebarCollapsed || isMobile) && (
                    formsExpanded ? (
                      <ChevronDown size={16} className={`transition-transform duration-300 ${isDark ? 'text-white/30' : 'text-slate-400'}`} />
                    ) : (
                      <ChevronRight size={16} className={`transition-transform duration-300 ${isDark ? 'text-white/30' : 'text-slate-400'}`} />
                    )
                  )}
                </button>

                {/* Forms Submenu */}
                {formsExpanded && (!sidebarCollapsed || isMobile) && (
                  <div className={`ml-6 mt-1.5 space-y-1 border-l-2 pl-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    {formMenuItems.map((item) => (
                      <button
                        key={item.title}
                        onClick={() => handleNavigation(item.url)}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-all duration-300 ${isActive(item.url)
                          ? (isDark ? 'bg-indigo-500/20 text-indigo-300 font-semibold border-l-2 border-indigo-400 -ml-[13px] pl-[23px]' : 'bg-emerald-50 text-emerald-700 font-semibold border-l-2 border-emerald-500 -ml-[13px] pl-[23px]')
                          : (isDark ? 'text-white/40 hover:bg-white/10 hover:text-white cursor-pointer' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 cursor-pointer')
                          }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full transition-colors ${isActive(item.url) ? (isDark ? 'bg-indigo-400' : 'bg-emerald-500') : (isDark ? 'bg-white/20' : 'bg-slate-300')}`}></span>
                        <span className="font-medium text-sm">{item.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Records Group */}
              <div>
                <button
                  onClick={() => {
                    if (sidebarCollapsed && !isMobile) {
                      setSidebarCollapsed(false);
                      setRecordsExpanded(true);
                    } else {
                      setRecordsExpanded(!recordsExpanded);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-300 group ${isDark ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'}`}
                >
                  <div className="flex items-center space-x-3">
                    <Database size={sidebarCollapsed && !isMobile ? 24 : 20} className={`transition-all duration-300 group-hover:scale-110 ${isDark ? 'text-white/40 group-hover:text-white' : 'text-slate-500 group-hover:text-emerald-600'}`} />
                    {(!sidebarCollapsed || isMobile) && (
                      <span className="font-semibold">ตารางข้อมูล</span>
                    )}
                  </div>
                  {(!sidebarCollapsed || isMobile) && (
                    recordsExpanded ? (
                      <ChevronDown size={16} className={`transition-transform duration-300 ${isDark ? 'text-white/30' : 'text-slate-400'}`} />
                    ) : (
                      <ChevronRight size={16} className={`transition-transform duration-300 ${isDark ? 'text-white/30' : 'text-slate-400'}`} />
                    )
                  )}
                </button>

                {/* Records Submenu */}
                {recordsExpanded && (!sidebarCollapsed || isMobile) && (
                  <div className={`ml-6 mt-1.5 space-y-1 border-l-2 pl-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    {recordMenuItems.map((item) => (
                      <button
                        key={item.title}
                        onClick={() => handleNavigation(item.url)}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-all duration-300 ${isActive(item.url)
                          ? (isDark ? 'bg-indigo-500/20 text-indigo-300 font-semibold border-l-2 border-indigo-400 -ml-[13px] pl-[23px]' : 'bg-emerald-50 text-emerald-700 font-semibold border-l-2 border-emerald-500 -ml-[13px] pl-[23px]')
                          : (isDark ? 'text-white/40 hover:bg-white/10 hover:text-white cursor-pointer' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 cursor-pointer')
                          }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full transition-colors ${isActive(item.url) ? (isDark ? 'bg-indigo-400' : 'bg-emerald-500') : (isDark ? 'bg-white/20' : 'bg-slate-300')}`}></span>
                        <span className="font-medium text-sm">{item.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </nav>
          </div>

          <div className="absolute bottom-4 left-0 right-0 px-4">
            <button
              onClick={handleLogout}
              className={`w-full cursor-pointer flex items-center ${sidebarCollapsed && !isMobile ? 'justify-center' : 'space-x-3'} px-3 py-3 rounded-xl transition-all duration-300 group ${isDark ? 'text-red-400 hover:bg-red-500/20 hover:text-red-300' : 'text-red-600 hover:bg-red-50 hover:text-red-700'}`}
            >
              <LogOut
                size={sidebarCollapsed && !isMobile ? 22 : 20}
                className="transition-all duration-300 group-hover:-translate-x-1 group-hover:scale-110"
              />
              {(!sidebarCollapsed || isMobile) && (
                <span className="font-semibold text-sm">ออกจากระบบ</span>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col ${isMobile
        ? 'ml-0 w-full'
        : isSidebarHidden ? 'ml-0' : sidebarCollapsed ? 'ml-16' : 'ml-64'
        } transition-all duration-300`}>

        {/* Mobile Menu Button - Always visible on mobile */}
        {isMobile && (
          <button
            onClick={() => setMobileMenuOpen(true)}
            className={`${sidebarHidden} ${mobileMenuOpen ? 'hidden' : ''} fixed top-4 left-4 z-50 p-2.5 backdrop-blur-sm rounded-xl shadow-lg border hover:scale-105 transition-all duration-300 active:scale-95 ${isDark ? 'bg-slate-800/90 border-white/10 hover:bg-white/10' : 'bg-white/95 border-slate-200/70 hover:bg-slate-50'}`}
          >
            <Menu size={22} className={isDark ? "text-white/70" : "text-emerald-600"} />
          </button>
        )}

        {/* Top Header Bar - Fixed */}
        <header className={`${isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white/90 border-slate-200/70'} backdrop-blur-xl border-b p-3 md:p-4 fixed top-0 right-0 left-0 z-20`}
          style={{ marginLeft: isMobile ? '0px' : isSidebarHidden ? '0px' : sidebarCollapsed ? '64px' : '256px' }}>
          <div className="flex items-center justify-between">

            {isSidebarHidden && (
              <button
                onClick={() => handleNavigation('/home')}
                className={`mr-2 inline-flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm transition-all duration-300 hover:-translate-x-0.5 hover:shadow-md cursor-pointer ${isDark ? 'border-white/10 bg-white/5 text-white/70 hover:bg-indigo-500 hover:text-white hover:border-indigo-400' : 'border-slate-200/70 bg-white text-slate-600 hover:bg-blue-600 hover:text-white'}`}
                aria-label="Go back"
              >
                <ArrowLeft size={18} />
              </button>
            )}

            {/* User Info - Mobile: Click to expand, Desktop: Always visible */}
            <div className={`flex-1 ${isMobile && !isSidebarHidden ? 'pl-14' : ''}`}>
              {isMobile ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserInfo(!showUserInfo)}
                    className={`flex items-center space-x-2 p-1.5 rounded-xl transition-all duration-300 ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
                  >
                    {userInfo?.image_url ? (
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm overflow-hidden border border-white/10">
                        <img
                          src={userInfo.image_url}
                          alt={`${userInfo?.firstname} ${userInfo?.lastname}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = `<span class="${isDark ? 'text-white' : 'text-slate-900'} text-[10px] font-bold">${userInfo?.username?.charAt(0).toUpperCase()}${userInfo?.username?.charAt(userInfo?.username?.length - 1).toUpperCase()}</span>`;
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                        <span className={`${isDark ? 'text-white' : 'text-slate-900'} text-[10px] font-bold`}>{userInfo?.username?.charAt(0).toUpperCase()}{userInfo?.username?.charAt(userInfo?.username?.length - 1).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <span className={`text-xs font-semibold max-w-[100px] truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{userInfo?.firstname}</span>
                      <ChevronDown size={12} className={`${isDark ? 'text-white/40' : 'text-slate-400'} transition-transform duration-300 ${showUserInfo ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {/* Mobile User Info Dropdown */}
                  {showUserInfo && (
                    <div className={`absolute top-full left-0 mt-2 backdrop-blur-xl rounded-xl shadow-xl border p-3 w-64 z-[99999] animate-scale-in ${isDark ? 'bg-slate-900/95 border-white/10' : 'bg-white/95 border-slate-200/70'}`}>
                      <div className={`flex items-center space-x-3 mb-3 pb-3 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                        {userInfo?.image_url ? (
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md overflow-hidden border border-white/10">
                            <img
                              src={userInfo.image_url}
                              alt={`${userInfo?.firstname} ${userInfo?.lastname}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML = `<span class="${isDark ? 'text-white' : 'text-slate-900'} text-xs font-bold">${userInfo?.username?.charAt(0).toUpperCase()}${userInfo?.username?.charAt(userInfo?.username?.length - 1).toUpperCase()}</span>`;
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                            <span className={`${isDark ? 'text-white' : 'text-slate-900'} text-xs font-bold`}>{userInfo?.username?.charAt(0).toUpperCase()}{userInfo?.username?.charAt(userInfo?.username?.length - 1).toUpperCase()}</span>
                          </div>
                        )}
                        <div>
                          <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{userInfo?.firstname} {userInfo?.lastname}</h3>
                          <p className={`text-xs font-medium ${isDark ? 'text-cyan-300' : 'text-emerald-600'}`}>{userInfo?.position}</p>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between py-1">
                          <span className={isDark ? 'text-white/40' : 'text-slate-500'}>รหัส:</span>
                          <span className={`font-semibold ${isDark ? 'text-white/80' : 'text-slate-800'}`}>{userInfo?.employee_id}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className={isDark ? 'text-white/40' : 'text-slate-500'}>ฝ่าย:</span>
                          <span className={`font-semibold text-right max-w-[120px] truncate ${isDark ? 'text-white/80' : 'text-slate-800'}`}>{userInfo?.department}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className={isDark ? 'text-white/40' : 'text-slate-500'}>ระดับ:</span>
                          <span className={`font-semibold ${isDark ? 'text-white/80' : 'text-slate-800'}`}>{userInfo?.position_level_id}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  {userInfo?.image_url ? (
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 overflow-hidden border border-white/10">
                      <img
                        src={userInfo.image_url}
                        alt={`${userInfo?.firstname} ${userInfo?.lastname}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML = `<span class="${isDark ? 'text-white' : 'text-slate-900'} text-sm font-bold">${userInfo?.username?.charAt(0).toUpperCase()}${userInfo?.username?.charAt(userInfo?.username?.length - 1).toUpperCase()}</span>`;
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                      <span className={`${isDark ? 'text-white' : 'text-slate-900'} text-sm font-bold`}>{userInfo?.username?.charAt(0).toUpperCase()}{userInfo?.username?.charAt(userInfo?.username?.length - 1).toUpperCase()}</span>
                    </div>
                  )}
                  <div>
                    <h1 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {userInfo?.firstname} {userInfo?.lastname} <span className={isDark ? 'text-cyan-300 font-semibold' : 'text-emerald-600 font-semibold'}>{userInfo?.employee_id}</span>
                    </h1>
                    <p className={`text-sm font-medium ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                      {userInfo?.position} • {userInfo?.department} • ระดับ {userInfo?.position_level_id}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-2 md:space-x-4">
              <button
                onClick={toggleTheme}
                className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-all duration-300 hover:-translate-y-0.5 ${isDark ? 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white' : 'border-slate-200/70 bg-white text-slate-700 hover:bg-slate-50'}`}
                title="สลับธีม"
              >
                {isDark ? <Moon size={14} /> : <Sun size={14} />}
                {isDark ? "Dark" : "Light"}
              </button>

              {/* Time Display - Desktop only */}
              {!isMobile && (
                <div className={`text-right mr-4 px-4 py-2 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200/70'}`}>
                  <p className={`text-xs font-medium ${isDark ? 'text-white/40' : 'text-slate-500'}`}>วันนี้</p>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white/80' : 'text-slate-800'}`}>{new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              )}

              {/* Weather Snowy */}
              <div className={`flex items-center justify-center ${isMobile ? 'scale-75' : ''}`}>
                <style jsx>{`
                  @keyframes am-weather-sun {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }

                  @keyframes am-weather-snow {
                    0% { transform: translateX(0) translateY(0); }
                    33.33% { transform: translateX(-1.2px) translateY(2px); }
                    66.66% { transform: translateX(1.4px) translateY(4px); opacity: 1; }
                    100% { transform: translateX(-1.6px) translateY(6px); opacity: 0; }
                  }

                  .am-weather-sun {
                    animation: am-weather-sun 9s linear infinite;
                  }

                  .am-weather-snow-1 {
                    animation: am-weather-snow 2s linear infinite;
                  }

                  .am-weather-snow-2 {
                    animation: am-weather-snow 2s linear infinite;
                    animation-delay: 1.2s;
                  }
                `}</style>
                <svg xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" version="1.1" width="64" height="64" viewBox="0 0 64 64">
                  <defs>
                    <filter id="blur" width="200%" height="200%">
                      <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                      <feOffset dx="0" dy="4" result="offsetblur" />
                      <feComponentTransfer>
                        <feFuncA type="linear" slope="0.05" />
                      </feComponentTransfer>
                      <feMerge>
                        <feMergeNode />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <g filter="url(#blur)" id="snowy-1">
                    <g transform="translate(20,10)">
                      <g transform="translate(0,16) scale(1.2)">
                        <g className="am-weather-sun">
                          <g><line fill="none" stroke="orange" strokeLinecap="round" strokeWidth="2" transform="translate(0,9)" x1="0" x2="0" y1="0" y2="3" /></g>
                          <g transform="rotate(45)"><line fill="none" stroke="orange" strokeLinecap="round" strokeWidth="2" transform="translate(0,9)" x1="0" x2="0" y1="0" y2="3" /></g>
                          <g transform="rotate(90)"><line fill="none" stroke="orange" strokeLinecap="round" strokeWidth="2" transform="translate(0,9)" x1="0" x2="0" y1="0" y2="3" /></g>
                          <g transform="rotate(135)"><line fill="none" stroke="orange" strokeLinecap="round" strokeWidth="2" transform="translate(0,9)" x1="0" x2="0" y1="0" y2="3" /></g>
                          <g transform="rotate(180)"><line fill="none" stroke="orange" strokeLinecap="round" strokeWidth="2" transform="translate(0,9)" x1="0" x2="0" y1="0" y2="3" /></g>
                          <g transform="rotate(225)"><line fill="none" stroke="orange" strokeLinecap="round" strokeWidth="2" transform="translate(0,9)" x1="0" x2="0" y1="0" y2="3" /></g>
                          <g transform="rotate(270)"><line fill="none" stroke="orange" strokeLinecap="round" strokeWidth="2" transform="translate(0,9)" x1="0" x2="0" y1="0" y2="3" /></g>
                          <g transform="rotate(315)"><line fill="none" stroke="orange" strokeLinecap="round" strokeWidth="2" transform="translate(0,9)" x1="0" x2="0" y1="0" y2="3" /></g>
                        </g>
                        <circle cx="0" cy="0" fill="orange" r="5" stroke="orange" strokeWidth="2" />
                      </g>
                      <g>
                        <path d="M47.7,35.4c0-4.6-3.7-8.2-8.2-8.2c-1,0-1.9,0.2-2.8,0.5c-0.3-3.4-3.1-6.2-6.6-6.2c-3.7,0-6.7,3-6.7,6.7c0,0.8,0.2,1.6,0.4,2.3c-0.3-0.1-0.7-0.1-1-0.1c-3.7,0-6.7,3-6.7,6.7c0,3.6,2.9,6.6,6.5,6.7l17.2,0C44.2,43.3,47.7,39.8,47.7,35.4z" fill="#57A0EE" stroke="white" strokeLinejoin="round" strokeWidth="1.5" transform="translate(-15,-5) scale(0.85)" />
                      </g>
                    </g>
                    <g transform="translate(20,9)">
                      <g className="am-weather-snow-1">
                        <g transform="translate(7,28)">
                          <line fill="none" stroke="#57A0EE" strokeLinecap="round" strokeWidth="1.2" transform="translate(0,9) rotate(0)" x1="0" x2="0" y1="-2.5" y2="2.5" />
                          <line fill="none" stroke="#57A0EE" strokeLinecap="round" strokeWidth="1" transform="translate(0,9) rotate(45)" x1="0" x2="0" y1="-2.5" y2="2.5" />
                          <line fill="none" stroke="#57A0EE" strokeLinecap="round" strokeWidth="1" transform="translate(0,9) rotate(90)" x1="0" x2="0" y1="-2.5" y2="2.5" />
                          <line fill="none" stroke="#57A0EE" strokeLinecap="round" strokeWidth="1" transform="translate(0,9) rotate(135)" x1="0" x2="0" y1="-2.5" y2="2.5" />
                        </g>
                      </g>
                      <g className="am-weather-snow-2">
                        <g transform="translate(16,28)">
                          <line fill="none" stroke="#57A0EE" strokeLinecap="round" strokeWidth="1.2" transform="translate(0,9) rotate(0)" x1="0" x2="0" y1="-2.5" y2="2.5" />
                          <line fill="none" stroke="#57A0EE" strokeLinecap="round" strokeWidth="1" transform="translate(0,9) rotate(45)" x1="0" x2="0" y1="-2.5" y2="2.5" />
                          <line fill="none" stroke="#57A0EE" strokeLinecap="round" strokeWidth="1" transform="translate(0,9) rotate(90)" x1="0" x2="0" y1="-2.5" y2="2.5" />
                          <line fill="none" stroke="#57A0EE" strokeLinecap="round" strokeWidth="1" transform="translate(0,9) rotate(135)" x1="0" x2="0" y1="-2.5" y2="2.5" />
                        </g>
                      </g>
                    </g>
                  </g>
                </svg>
              </div>


            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className={`flex-1 overflow-auto pt-16 md:pt-20 ${isDark ? '' : 'bg-slate-50/70'}`}>
          {children}
        </main>

      </div>
    </div>
  );
};




