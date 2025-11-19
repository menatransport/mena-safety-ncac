"use client";
import { useState, useEffect, use } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { 
  LayoutDashboard,
  SquarePen,
  Database,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Bell
  } from "lucide-react";

const menuItems = [
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
  const [currentTime, setCurrentTime] = useState("");
  const [formsExpanded, setFormsExpanded] = useState(true); // ปรับเป็น true เพื่อขยายเมนู Forms เริ่มต้น
  const [recordsExpanded, setRecordsExpanded] = useState(true); // ปรับเป็น true เพื่อขยายเมนู Records เริ่มต้น
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();
  // const searchParams = useSearchParams();

  // Mobile breakpoint detection
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const storedUserData = localStorage.getItem("userData");
    if (storedUserData) {
      setUserInfo(JSON.parse(storedUserData));
    }
  }, []);
  
  useEffect(() => {
    // ดึง URL parameters หลังจาก component mount
    const params = new URLSearchParams(window.location.search);
    const currentDocId = params.get("doc");
    
    if (currentDocId) {
      setSidebarCollapsed(true);
      setSidebarHidden("hidden");
    }
  }, [pathname]); // เรียกใหม่เมื่อ pathname เปลี่ยน
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
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

  // useEffect(() => {
  //   const currentId = searchParams.get("doc");
  //   if (currentId) {
  //    setSidebarCollapsed(true);
  //    setSidebarHidden("hidden");
  //   }
  // }, [searchParams]);

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  const handleNavigation = (url: string) => {
    router.push(url);
    if (isMobile) {
      setMobileMenuOpen(false);
    }

  };

  const handleMobileToggle = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      
      {/* Mobile Overlay */}
      {isMobile && mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar - Fixed */}
      <div className={`${sidebarHidden} ${
        isMobile 
          ? `fixed inset-y-0 left-0 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} w-64 z-50 transition-transform duration-300 ease-in-out`
          : `${sidebarCollapsed ? 'w-16' : 'w-64'} fixed h-full z-30 transition-all duration-300`
      } bg-white shadow-lg border-r border-gray-200 flex-shrink-0`}>
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {(!sidebarCollapsed || isMobile) && (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                 <img src="/mena.png" alt="Logo" className="w-16 h-8 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-800 text-md">Mena Safety</h2>
                  <p className="text-gray-600 text-xs">ระบบจัดการเอกสาร NC/AC</p>
                </div>
              </div>
            )}
            
            <button
              onClick={handleMobileToggle}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {(sidebarCollapsed && !isMobile) || (isMobile && !mobileMenuOpen) ? (
                <Menu size={20} className="text-gray-600" />
              ) : (
                <X size={20} className="text-gray-600" />
              )}
            </button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          

          <div>
            <h3 className={`text-md font-bold text-gray-500 uppercase tracking-wider mb-3 ${(sidebarCollapsed && !isMobile) ? 'hidden' : ''}`}>
              เมนูหลัก
            </h3>
            <nav className="space-y-2">
  
            
              {menuItems.map((item) => (
                <button
                  key={item.title}
                  onClick={() => handleNavigation(item.url)}
                  className={`hidden w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                    isActive(item.url)
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                  <item.icon 
                    size={sidebarCollapsed && !isMobile ? 24 : 20}
                    className={`hover:rotate-45 hover:scale-110 ${isActive(item.url) ? "text-emerald-700" : "text-gray-600"}`}
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
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                >
                  <div className="flex items-center space-x-3">
                    <SquarePen size={sidebarCollapsed && !isMobile ? 24 : 20} className=" hover:rotate-45 hover:scale-110 text-gray-600" />
                    {(!sidebarCollapsed || isMobile) && (
                      <span className="font-bold">ฟอร์มรายงาน</span>
                    )}
                  </div>
                  {(!sidebarCollapsed || isMobile) && (
                    formsExpanded ? (
                      <ChevronDown size={16} className="text-gray-500" />
                    ) : (
                      <ChevronRight size={16} className="text-gray-500" />
                    )
                  )}
                </button>

                {/* Forms Submenu */}
                {formsExpanded && (!sidebarCollapsed || isMobile) && (
                  <div className="ml-6 mt-2 space-y-1">
                    {formMenuItems.map((item) => (
                      <button
                        key={item.title}
                        onClick={() => handleNavigation(item.url)}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-sm text-sm transition-all duration-200 ${
                          isActive(item.url)
                            ? 'bg-teal-100 text-teal-800 scale-105 border border-teal-200 shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                        }`}
                      >
                        <div className="w-2 h-2 rounded-full bg-gray-400"></div>
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
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                >
                  <div className="flex items-center space-x-3">
                    <Database size={sidebarCollapsed && !isMobile ? 24 : 20} className="hover:rotate-45 hover:scale-110 text-gray-600" />
                    {(!sidebarCollapsed || isMobile) && (
                      <span className="font-bold">ตารางข้อมูล</span>
                    )}
                  </div>
                  {(!sidebarCollapsed || isMobile) && (
                    recordsExpanded ? (
                      <ChevronDown size={16} className="text-gray-500" />
                    ) : (
                      <ChevronRight size={16} className="text-gray-500" />
                    )
                  )}
                </button>

                {/* Records Submenu */}
                {recordsExpanded && (!sidebarCollapsed || isMobile) && (
                  <div className="ml-6 mt-2 space-y-1">
                    {recordMenuItems.map((item) => (
                      <button
                        key={item.title}
                        onClick={() => handleNavigation(item.url)}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-sm text-sm transition-all duration-200 ${
                          isActive(item.url)
                            ? 'bg-teal-100 text-teal-800 scale-105 border border-teal-200 shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                        }`}
                      >
                        <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                        <span className="font-medium text-sm">{item.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* System Menu */}
          {/* <div>
            <h3 className={`text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 ${(sidebarCollapsed && !isMobile) ? 'hidden' : ''}`}>
              System
            </h3>
            <nav className="space-y-2">
              {systemMenuItems.map((item) => (
                <button
                  key={item.title}
                  onClick={() => handleNavigation(item.url)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    isActive(item.url)
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                  <item.icon 
                    size={sidebarCollapsed && !isMobile ? 24 : 20}
                    className={`hover:rotate-45 hover:scale-110 ${isActive(item.url) ? "text-emerald-700" : "text-gray-600"}`}
                  />
                  </div>
                  {(!sidebarCollapsed || isMobile) && (
                    <span className="font-medium">{item.title}</span>
                  )}
                </button>
              ))}
            </nav>
          </div> */}
        </div>

      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col ${
        isMobile 
          ? 'ml-0' 
          : sidebarCollapsed ? 'ml-16' : 'ml-64'
      } transition-all duration-300`}>
        
        {/* Mobile Menu Button - Only visible on mobile when menu is closed */}
        {isMobile && !mobileMenuOpen && (
          <button
            onClick={() => setMobileMenuOpen(true)}
            className={`${sidebarHidden} fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200 md:hidden`}
          >
            <Menu size={20} className="hover:rotate-45 hover:scale-110 text-gray-600" />
          </button>
        )}
        
        {/* Top Header Bar - Fixed */}
        <header className="bg-gradient-to-r from-white via-white to-white shadow-lg border-b border-emerald-200 p-3 md:p-4 fixed top-0 right-0 left-0 z-20 backdrop-blur-sm" 
                style={{marginLeft: isMobile ? '0px' : sidebarCollapsed ? '64px' : '256px'}}>
          <div className="flex items-center justify-between">
            
            {/* User Info - Mobile: Click to expand, Desktop: Always visible */}
            <div className={`flex-1 ${isMobile ? 'pl-12' : ''}`}>
              {isMobile ? (
                <div className="relative">
                  <button 
                    onClick={() => setShowUserInfo(!showUserInfo)}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-white/50 transition-all duration-200"
                  >
                    <div className={`w-8 h-8 bg-gradient-to-r ${userInfo?.employee_id % 2 === 0 ? 'from-blue-600 to-blue-700' : 'from-green-600 to-green-700'} rounded-full flex items-center justify-center shadow-sm`}>
                      <span className="text-white text-xs font-bold">{userInfo?.firstname.charAt(0)}{userInfo?.lastname.charAt(0)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-sm font-medium text-gray-800">{userInfo?.firstname} {userInfo?.lastname}</span>
                      <ChevronDown size={14} className={`text-gray-600 transition-transform duration-200 ${showUserInfo ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  
                  {/* Mobile User Info Dropdown */}
                  {showUserInfo && (
                    <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-80 z-30">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-full flex items-center justify-center shadow-sm">
                          <span className="text-white text-sm font-bold">{userInfo?.firstname.charAt(0)}{userInfo?.lastname.charAt(0)}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{userInfo?.firstname} {userInfo?.lastname}</h3>
                          <p className="text-sm text-emerald-600">{userInfo?.position}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">รหัสพนักงาน:</span>
                          <span className="font-medium text-gray-900">{userInfo?.employee_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">ฝ่าย:</span>
                          <span className="font-medium text-gray-900">{userInfo?.department}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">ระดับ:</span>
                          <span className="font-medium text-gray-900">{userInfo?.position_level_id}</span>
                        </div>
                      </div>
                      

                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 bg-gradient-to-r ${userInfo?.employee_id % 2 === 0 ? 'from-blue-600 to-blue-700' : 'from-green-600 to-green-700'} rounded-full flex items-center justify-center shadow-sm`}>
                    <span className="text-white text-sm font-bold">{userInfo?.firstname.charAt(0)}{userInfo?.lastname.charAt(0)}</span>
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">
                      {userInfo?.firstname} {userInfo?.lastname} <span className={`${userInfo?.employee_id % 2 === 0 ? 'text-blue-800' : 'text-green-800'}`}>{userInfo?.employee_id}</span>
                    </h1>
                    <p className="text-sm text-gray-600">
                      {userInfo?.position} • {userInfo?.department} • ระดับ {userInfo?.position_level_id}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Right Side Actions */}
            <div className="flex items-center space-x-2 md:space-x-4">
              
              {/* Time Display - Desktop only */}
              {!isMobile && (
                <div className="text-right mr-4">
                  <p className="text-xs text-gray-600">วันนี้</p>
                  <p className="text-sm font-medium text-gray-800">{new Date().toLocaleDateString('th-TH', { year: 'numeric' , month: 'long', day: 'numeric' })}</p>
                </div>
              )}
              
              {/* Weather Snowy */}
              <div className="flex items-center justify-center">
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
                      <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                      <feOffset dx="0" dy="4" result="offsetblur"/>
                      <feComponentTransfer>
                        <feFuncA type="linear" slope="0.05"/>
                      </feComponentTransfer>
                      <feMerge> 
                        <feMergeNode/>
                        <feMergeNode in="SourceGraphic"/> 
                      </feMerge>
                    </filter>
                  </defs>
                  <g filter="url(#blur)" id="snowy-1">
                    <g transform="translate(20,10)">
                      <g transform="translate(0,16) scale(1.2)">
                        <g className="am-weather-sun">
                          <g><line fill="none" stroke="orange" strokeLinecap="round" strokeWidth="2" transform="translate(0,9)" x1="0" x2="0" y1="0" y2="3"/></g>
                          <g transform="rotate(45)"><line fill="none" stroke="orange" strokeLinecap="round" strokeWidth="2" transform="translate(0,9)" x1="0" x2="0" y1="0" y2="3"/></g>
                          <g transform="rotate(90)"><line fill="none" stroke="orange" strokeLinecap="round" strokeWidth="2" transform="translate(0,9)" x1="0" x2="0" y1="0" y2="3"/></g>
                          <g transform="rotate(135)"><line fill="none" stroke="orange" strokeLinecap="round" strokeWidth="2" transform="translate(0,9)" x1="0" x2="0" y1="0" y2="3"/></g>
                          <g transform="rotate(180)"><line fill="none" stroke="orange" strokeLinecap="round" strokeWidth="2" transform="translate(0,9)" x1="0" x2="0" y1="0" y2="3"/></g>
                          <g transform="rotate(225)"><line fill="none" stroke="orange" strokeLinecap="round" strokeWidth="2" transform="translate(0,9)" x1="0" x2="0" y1="0" y2="3"/></g>
                          <g transform="rotate(270)"><line fill="none" stroke="orange" strokeLinecap="round" strokeWidth="2" transform="translate(0,9)" x1="0" x2="0" y1="0" y2="3"/></g>
                          <g transform="rotate(315)"><line fill="none" stroke="orange" strokeLinecap="round" strokeWidth="2" transform="translate(0,9)" x1="0" x2="0" y1="0" y2="3"/></g>
                        </g>
                        <circle cx="0" cy="0" fill="orange" r="5" stroke="orange" strokeWidth="2"/>
                      </g>
                      <g>
                        <path d="M47.7,35.4c0-4.6-3.7-8.2-8.2-8.2c-1,0-1.9,0.2-2.8,0.5c-0.3-3.4-3.1-6.2-6.6-6.2c-3.7,0-6.7,3-6.7,6.7c0,0.8,0.2,1.6,0.4,2.3c-0.3-0.1-0.7-0.1-1-0.1c-3.7,0-6.7,3-6.7,6.7c0,3.6,2.9,6.6,6.5,6.7l17.2,0C44.2,43.3,47.7,39.8,47.7,35.4z" fill="#57A0EE" stroke="white" strokeLinejoin="round" strokeWidth="1.5" transform="translate(-15,-5) scale(0.85)"/>
                      </g>
                    </g>
                    <g transform="translate(20,9)">
                      <g className="am-weather-snow-1">
                        <g transform="translate(7,28)">
                          <line fill="none" stroke="#57A0EE" strokeLinecap="round" strokeWidth="1.2" transform="translate(0,9) rotate(0)" x1="0" x2="0" y1="-2.5" y2="2.5"/>
                          <line fill="none" stroke="#57A0EE" strokeLinecap="round" strokeWidth="1" transform="translate(0,9) rotate(45)" x1="0" x2="0" y1="-2.5" y2="2.5"/>
                          <line fill="none" stroke="#57A0EE" strokeLinecap="round" strokeWidth="1" transform="translate(0,9) rotate(90)" x1="0" x2="0" y1="-2.5" y2="2.5"/>
                          <line fill="none" stroke="#57A0EE" strokeLinecap="round" strokeWidth="1" transform="translate(0,9) rotate(135)" x1="0" x2="0" y1="-2.5" y2="2.5"/>
                        </g>
                      </g>
                      <g className="am-weather-snow-2">
                        <g transform="translate(16,28)">
                          <line fill="none" stroke="#57A0EE" strokeLinecap="round" strokeWidth="1.2" transform="translate(0,9) rotate(0)" x1="0" x2="0" y1="-2.5" y2="2.5"/>
                          <line fill="none" stroke="#57A0EE" strokeLinecap="round" strokeWidth="1" transform="translate(0,9) rotate(45)" x1="0" x2="0" y1="-2.5" y2="2.5"/>
                          <line fill="none" stroke="#57A0EE" strokeLinecap="round" strokeWidth="1" transform="translate(0,9) rotate(90)" x1="0" x2="0" y1="-2.5" y2="2.5"/>
                          <line fill="none" stroke="#57A0EE" strokeLinecap="round" strokeWidth="1" transform="translate(0,9) rotate(135)" x1="0" x2="0" y1="-2.5" y2="2.5"/>
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
        <main className="flex-1 overflow-auto bg-gray-50 pt-16 md:pt-20">
          {children}
        </main>

      </div>
    </div>
  );
};




