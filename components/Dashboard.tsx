'use client'
import { useRouter } from 'next/navigation';
import { LordIcon } from './LordIcon';
import { 
LayoutDashboard
} from 'lucide-react';
import { useEffect } from 'react';
import Swal from 'sweetalert2'

export const DashboardComponent = () => {
  const router = useRouter();

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
  }, [])

  return (
    <div className="p-6 space-y-6  bg-[#eef8ef] min-h-screen">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 text-black flex items-center justify-center">
              <LayoutDashboard className='w-16 h-16' />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Overview</h1>
              <p className="text-gray-600">ภาพรวมของระบบ</p>
            </div>
          </div>
 

      <div className="hidden max-w-9xl mx-4 space-y-6 bg-white p-16 rounded-xl shadow-sm">
     
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: "TOTAL NC CASE", value: "50", icon: "wloilxuq.json" },
            { title: "TOTAL AC CASE", value: "50", icon: "wloilxuq.json" },
            { title: "TOTAL NC PENDING", value: "10", icon: "wloilxuq.json" },
            { title: "TOTAL AC PENDING", value: "10", icon: "wloilxuq.json" },
          ].map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-800 mt-1">{stat.value}</p>
                </div>
                <LordIcon 
                  src={`https://cdn.lordicon.com/${stat.icon}`}
                  trigger="hover"
                  colors="primary:#10b981,secondary:#047857"
                  style={{ width: '40px', height: '40px' }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="hidden bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "New NC Report", icon: "wloilxuq.json", route: "/nc-form", bgColor: "bg-emerald-50", textColor: "text-emerald-700" },
              { title: "New AC Report", icon: "lecprnjb.json", route: "/ac-form", bgColor: "bg-blue-50", textColor: "text-blue-700" },
              { title: "View NC Records", icon: "xjovhxra.json", route: "/nc-records", bgColor: "bg-purple-50", textColor: "text-purple-700" },
              { title: "View AC Records", icon: "oqdmuxru.json", route: "/ac-records", bgColor: "bg-orange-50", textColor: "text-orange-700" }
            ].map((action, index) => (
              <button
                key={index}
                onClick={() => router.push(action.route)}
                className={`${action.bgColor} ${action.textColor} p-4 rounded-lg hover:shadow-md transition-all duration-200 group`}
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <LordIcon 
                    src={`https://cdn.lordicon.com/${action.icon}`}
                    trigger="hover"
                    colors="primary:#10b981,secondary:#047857"
                    style={{ width: '32px', height: '32px' }}
                  />
                  <span className="font-medium text-sm">{action.title}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Activities</h2>
          <div className="space-y-4">
            {[
              { type: "NC CASE", id: "NC-2024-001", status: "Pending", time: "2 hours ago", severity: "High" },
              { type: "AC CASE", id: "AC-2024-015", status: "Completed", time: "5 hours ago", severity: "Medium" },
              { type: "NC CASE", id: "NC-2024-002", status: "Completed", time: "1 day ago", severity: "Low" },
              { type: "AC CASE", id: "AC-2024-016", status: "Pending", time: "2 days ago", severity: "High" }
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    activity.severity === 'High' ? 'bg-red-500' :
                    activity.severity === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  <div>
                    <p className="font-medium text-gray-800">{activity.type} : 🆔 {activity.id}</p>
                    <p className="text-sm text-gray-600">Status: {activity.status}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">{activity.time}</p>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    activity.severity === 'High' ? 'bg-red-100 text-red-800' :
                    activity.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {activity.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};