"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Swal from "sweetalert2";
import { useUiTheme } from "@/lib/useUiTheme";
import { MASTER_CONFIGS } from "@/lib/masterData";
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
  LogOut,
  Layers
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

const masterMenuItems = MASTER_CONFIGS.map((item) => ({
  title: item.label,
  url: `/master-data/${item.storeKey}`,
  icon: Layers
}));

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
  const [masterExpanded, setMasterExpanded] = useState(false); // ปรับเป็น true เพื่อขยายเมนู Master Data เริ่มต้น
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
    if (currentPath?.startsWith("/master-data")) {
      setMasterExpanded(true);
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
        : `${sidebarCollapsed ? 'w-16' : 'w-64'} fixed inset-y-0 left-0 z-30 transition-all duration-300`
        } ${isDark ? 'bg-slate-900/90 border-white/10' : 'bg-white/95 border-slate-200/70'} backdrop-blur-xl border-r flex-shrink-0 flex flex-col h-screen overflow-hidden`}>

        {/* Header */}
        <div className={`flex-shrink-0 p-4 border-b ${isDark ? 'border-white/10 bg-gradient-to-r from-white/5 to-transparent' : 'border-slate-200/70 bg-gradient-to-r from-emerald-50/70 to-white/80'}`}>
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

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-6">


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
              {/* Master Data Group */}
              <div>
                <button
                  onClick={() => {
                    if (sidebarCollapsed && !isMobile) {
                      setSidebarCollapsed(false);
                      setMasterExpanded(true);
                    } else {
                      setMasterExpanded(!masterExpanded);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-300 group ${isDark ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'}`}
                >
                  <div className="flex items-center space-x-3">
                    <Layers size={sidebarCollapsed && !isMobile ? 24 : 20} className={`transition-all duration-300 group-hover:scale-110 ${isDark ? 'text-white/40 group-hover:text-white' : 'text-slate-500 group-hover:text-emerald-600'}`} />
                    {(!sidebarCollapsed || isMobile) && (
                      <span className="font-semibold">Master Data</span>
                    )}
                  </div>
                  {(!sidebarCollapsed || isMobile) && (
                    masterExpanded ? (
                      <ChevronDown size={16} className={`transition-transform duration-300 ${isDark ? 'text-white/30' : 'text-slate-400'}`} />
                    ) : (
                      <ChevronRight size={16} className={`transition-transform duration-300 ${isDark ? 'text-white/30' : 'text-slate-400'}`} />
                    )
                  )}
                </button>

                {/* Master Data Submenu */}
                {masterExpanded && (!sidebarCollapsed || isMobile) && (
                  <div className={`ml-6 mt-1.5 space-y-1 border-l-2 pl-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    {masterMenuItems.map((item) => (
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

        </div>

        <div className={`flex-shrink-0 border-t p-4 ${isDark ? 'border-white/10' : 'border-slate-200/70'}`}>
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

      {/* Main Content Area */}
      <div className={`flex-1 min-w-0 flex flex-col ${isMobile
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
                onClick={() => {
                  if (pathname.startsWith('/trainer-app/')) {
                    router.back();
                  } else {
                    handleNavigation('/home');
                  }
                }}
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

              {/* Emergency Siren Logo */}
              <div className={`flex items-center justify-center ${isMobile ? 'scale-75' : ''}`}>
                <style jsx>{`
                  @keyframes siren-flash {
                    0%, 100% { opacity: 1; filter: drop-shadow(0 0 2px #ef4444); }
                    50% { opacity: 0.55; filter: drop-shadow(0 0 10px #ef4444); }
                  }
                  @keyframes siren-beam-left {
                    0%, 100% { opacity: 0; transform: translateX(0) scaleX(0.6); }
                    50% { opacity: 0.8; transform: translateX(-2px) scaleX(1); }
                  }
                  @keyframes siren-beam-right {
                    0%, 100% { opacity: 0.8; transform: translateX(2px) scaleX(1); }
                    50% { opacity: 0; transform: translateX(0) scaleX(0.6); }
                  }
                  @keyframes siren-ring {
                    0% { opacity: 0.6; transform: scale(0.6); }
                    100% { opacity: 0; transform: scale(1.4); }
                  }
                  .siren-dome { animation: siren-flash 0.9s ease-in-out infinite; transform-origin: center; }
                  .siren-beam-l { animation: siren-beam-left 1.4s ease-in-out infinite; transform-origin: 32px 22px; }
                  .siren-beam-r { animation: siren-beam-right 1.4s ease-in-out infinite; transform-origin: 32px 22px; }
                  .siren-ring { animation: siren-ring 1.6s ease-out infinite; transform-origin: 32px 22px; }
                  .siren-ring-2 { animation: siren-ring 1.6s ease-out infinite; animation-delay: 0.6s; transform-origin: 32px 22px; }
                `}</style>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 64 64"
                  fill="none"
                  aria-label="Emergency Siren"
                >
                  {/* Pulse rings */}
                  <circle className="siren-ring" cx="32" cy="22" r="14" stroke="#ef4444" strokeWidth="1.5" fill="none" />
                  <circle className="siren-ring-2" cx="32" cy="22" r="14" stroke="#ef4444" strokeWidth="1.5" fill="none" />

                  {/* Light beams */}
                  <path className="siren-beam-l" d="M18 22 L8 16 L8 28 Z" fill="#ef4444" fillOpacity="0.45" />
                  <path className="siren-beam-r" d="M46 22 L56 16 L56 28 Z" fill="#ef4444" fillOpacity="0.45" />

                  {/* Base */}
                  <rect x="14" y="44" width="36" height="8" rx="2" fill={isDark ? "#475569" : "#334155"} />
                  <rect x="18" y="38" width="28" height="8" rx="1.5" fill={isDark ? "#64748b" : "#475569"} />

                  {/* Dome (siren light) */}
                  <g className="siren-dome">
                    <path d="M20 38 Q20 20 32 20 Q44 20 44 38 Z" fill="#ef4444" />
                    <path d="M24 36 Q24 24 32 24" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />
                  </g>

                  {/* Top knob */}
                  <circle cx="32" cy="18" r="2" fill={isDark ? "#94a3b8" : "#64748b"} />
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




