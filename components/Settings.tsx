'use client'
import React from 'react';
import { Settings, User, Shield, Database, Mail, Bell, Globe, HardDrive, Monitor } from 'lucide-react';

const SettingsPage = () => {
  return (
     <div className="p-6 space-y-6  bg-[#eef8ef] min-h-screen">

          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 text-black flex items-center justify-center">
              <Settings className='w-16 h-16' />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">ตั้งค่าระบบ</h1>
          <p className="text-gray-600">จัดการการตั้งค่าและกำหนดค่าระบบ</p>
            </div>
          </div>

        {/* Settings Grid */}
         <div className="max-w-9xl mx-4 space-y-6 p-8 rounded-xl ">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* User Settings */}
          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">ผู้ใช้งาน</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">จัดการข้อมูลผู้ใช้งานและสิทธิการเข้าถึง</p>
            <button className="w-full bg-blue-50 text-blue-700 py-2 px-4 rounded-lg hover:bg-blue-100 transition-colors font-medium">
              จัดการผู้ใช้งาน
            </button>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">ความปลอดภัย</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">ตั้งค่าความปลอดภัยและการเข้ารหัส</p>
            <button className="w-full bg-emerald-50 text-emerald-700 py-2 px-4 rounded-lg hover:bg-emerald-100 transition-colors font-medium">
              ตั้งค่าความปลอดภัย
            </button>
          </div>

          {/* Database Settings */}
          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">ฐานข้อมูล</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">จัดการข้อมูลหลัก</p>
            <button className="w-full bg-purple-50 text-purple-700 py-2 px-4 rounded-lg hover:bg-purple-100 transition-colors font-medium">
              ตั้งค่าฐานข้อมูล
            </button>
          </div>


        </div>
</div>
      </div>
  );
};

export default SettingsPage;