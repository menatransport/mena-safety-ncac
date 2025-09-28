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
    title: "Overview",
    url: "/overview",
    icon: LayoutDashboard
  }
];

const formMenuItems = [
  {
    title: "NC Form",
    url: "/nc-form",
    icon: SquarePen
  },
  {
    title: "AC Form",
    url: "/ac-form",
    icon: SquarePen
  }
];

const recordMenuItems = [
  {
    title: "NC Records",
    url: "/nc-records",
    icon: Database
  },
  {
    title: "AC Records",
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
  const [formsExpanded, setFormsExpanded] = useState(false);
  const [recordsExpanded, setRecordsExpanded] = useState(false);
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
    console.log("Document ID from URL:", currentDocId);
    
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
            <h3 className={`text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 ${(sidebarCollapsed && !isMobile) ? 'hidden' : ''}`}>
              Menu
            </h3>
            <nav className="space-y-2">
  
            
              {menuItems.map((item) => (
                <button
                  key={item.title}
                  onClick={() => handleNavigation(item.url)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
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
                      <span className="font-medium">Forms</span>
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
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                          isActive(item.url)
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                        }`}
                      >
                        <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                        <span className="font-medium">{item.title}</span>
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
                      <span className="font-medium">Records</span>
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
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                          isActive(item.url)
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                        }`}
                      >
                        <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                        <span className="font-medium">{item.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* System Menu */}
          <div>
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
          </div>
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
        <header className="bg-gradient-to-r from-white via-emerald-50 to-emerald-100 shadow-lg border-b border-emerald-200 p-3 md:p-4 fixed top-0 right-0 left-0 z-20 backdrop-blur-sm" 
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
                    <div className="w-8 h-8 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-full flex items-center justify-center shadow-sm">
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
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-white text-sm font-bold">{userInfo?.firstname.charAt(0)}{userInfo?.lastname.charAt(0)}</span>
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">
                      {userInfo?.firstname} {userInfo?.lastname} <span className="text-emerald-600">{userInfo?.employee_id}</span>
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
              
              {/* Notifications */}
              <div className="relative">
                <button className="relative p-2 hover:bg-white/60 rounded-xl transition-all duration-200 group">
                  <Bell size={isMobile ? 22 : 24} className="text-gray-700 group-hover:text-emerald-600 transition-colors" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-red-600 rounded-full text-xs text-white flex items-center justify-center font-medium shadow-sm animate-pulse">
                    3
                  </span>
                </button>
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




