"use client";
import { useState } from "react";
import { DateTimePicker24h } from "./ui/datetime-picker";
import { SearchableSelect } from "./ui/searchable-select";

export const ACFormComponent = () => {
  const [formData, setFormData] = useState({
    alcohol_test: false,
    drug_test: false,
    product_damage: null // null, true (ใช่), false (ไม่)
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, type, checked, value } = e.target as HTMLInputElement;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleRadioChange = (name: string, value: boolean) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("AC Form submitted:", formData);
  };

  return (
    <>
      <div className="min-h-screen bg-[#eef8ef]">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center">
            <div
              id="printable-area"
              className="md:w-4xl sm:w-full mx-4 space-y-6 bg-white p-8 rounded-xl shadow-sm border border-gray-500"
            >
              <div className="text-center border-b border-gray-400 pb-4 mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  แบบรายงานอุบัติเหตุ
                </h2>
                <h3 className="text-lg text-gray-600">
                  AC Report Form
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                 <div className="mb-3 border-b border-gray-400 pb-4">
                    <label className="flex text-xs p-1 font-bold text-gray-800">
                      Part 1: Initial AC Reporting - Overview and key details
                    </label>
                    <label className="flex text-xs p-1  font-bold text-gray-800">
                      ส่วนที่ 1: รายงานอุบัติการณ์เบื้องต้น -
                      รายละเอียดเบื้องต้นของอุบัติการณ์ที่เกิดขึ้น
                    </label>
                  </div>

                {/*ข้อมูลเบื้องต้น */}
                  <div className="flex flex-col p-2 bg-gray-200 font-bold text-gray-800 font-bold mb-3 text-sm">
                    <h3>ข้อมูลเบื้องต้น</h3>
                    <p className="font-semibold text-xs text-gray-600">Basic Information</p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          เลขที่เอกสาร AC:
                        </label>
                        <input
                          type="text"
                          name="document_no_ac"
                          value="รอสร้างเลข"
                          disabled
                          className="w-full cursor-not-allowed text-sm font-bold text-blue-600 p-2 bg-gray-100 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          ศูนย์ปฏิบัติการ:
                        </label>
                        <SearchableSelect
                          options={[]}
                          value=""
                          onChange={() => {}}
                          placeholder="เลือกศูนย์ปฏิบัติการ"
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          ฝ่าย:
                        </label>
                        <SearchableSelect
                          options={[]}
                          value=""
                          onChange={() => {}}
                          placeholder="เลือกฝ่าย"
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          วันที่และเวลา แจ้งเหตุ:
                        </label>
                        <DateTimePicker24h
                          value={undefined}
                          onChange={() => {}}
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          วันที่และเวลา เกิดเหตุ:
                        </label>
                        <DateTimePicker24h
                          value={undefined}
                          onChange={() => {}}
                        />
                      </div>
                    </div>
                    <div className="mt-6">
                     <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          รายละเอียดเหตุการณ์:
                        </label>
                        <textarea
                          name="case_details"
                          onChange={handleInputChange}
                          rows={4}
                          maxLength={1000}
                          className="w-full text-sm p-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                        />
                      </div>
                      </div>
                  </div>
            
             
<div className="border-t border-gray-400 md:col-span-3"></div>
                {/*ข้อมูลการขนส่งและสถานที่ */}
                   <div className="flex flex-col p-2 bg-gray-200 font-bold text-gray-800 font-bold mb-3 text-sm">
                    <h3>ข้อมูลการขนส่งและสถานที่</h3>
                    <p className="font-semibold text-xs text-gray-600">Transportation and Location Information</p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          ลูกค้า:
                        </label>
                        <SearchableSelect
                          options={[]}
                          value=""
                          onChange={() => {}}
                          placeholder="เลือกลูกค้า"
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          ต้นทาง/แพล้น:
                        </label>
                        <SearchableSelect
                          options={[]}
                          value=""
                          onChange={() => {}}
                          placeholder="เลือกต้นทาง/แพล้น"
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          ปลายทาง:
                        </label>
                        <input
                          type="text"
                          name="destination"
                          onChange={handleInputChange}
                          className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          สถานที่เกิดเหตุ:
                        </label>
                        <input
                          type="text"
                          name="case_location"
                          onChange={handleInputChange}
                          className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          จังหวัด:
                        </label>
                        <SearchableSelect
                          options={[]}
                          value=""
                          onChange={() => {}}
                          placeholder="เลือกจังหวัด"
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          อำเภอ:
                        </label>
                        <SearchableSelect
                          options={[]}
                          value=""
                          onChange={() => {}}
                          placeholder="เลือกอำเภอ"
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          ตำบล:
                        </label>
                        <SearchableSelect
                          options={[]}
                          value=""
                          onChange={() => {}}
                          placeholder="เลือกตำบล"
                          className="w-full"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          พื้นที่สถานีตำรวจ:
                        </label>
                        <input
                          type="text"
                          name="police_station_area"
                          onChange={handleInputChange}
                          className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                        />
                      </div>
                    </div>
                  </div>
              
<div className="border-t border-gray-400 md:col-span-3"></div>
                {/*ข้อมูลรถและคนขับ */}
                   <div className="flex flex-col p-2 bg-gray-200 font-bold text-gray-800 font-bold mb-3 text-sm">
                    <h3>ข้อมูลพนักงานจัดส่ง</h3>
                    <p className="font-semibold text-xs text-gray-600">Delivery Personnel Information</p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          รหัสรถ:
                        </label>
                        <SearchableSelect
                          options={[]}
                          value=""
                          onChange={() => {}}
                          placeholder="เลือกรหัสรถ"
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          ทะเบียนรถหัว:
                        </label>
                        <SearchableSelect
                          options={[]}
                          value=""
                          onChange={() => {}}
                          placeholder="เลือกทะเบียนรถหัว"
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          ทะเบียนรถหาง:
                        </label>
                        <SearchableSelect
                          options={[]}
                          value=""
                          onChange={() => {}}
                          placeholder="เลือกทะเบียนรถหาง"
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          ประเภทคนขับ:
                        </label>
                        <SearchableSelect
                          options={[]}
                          value=""
                          onChange={() => {}}
                          placeholder="เลือกประเภทคนขับ"
                          className="w-full"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          ชื่อ-สกุลคนขับ:
                        </label>
                        <SearchableSelect
                          options={[]}
                          value=""
                          onChange={() => {}}
                          placeholder="เลือกชื่อ-สกุลคนขับ"
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
             

<div className="border-t border-gray-400 md:col-span-3"></div>
                {/*การตรวจแอลกอฮอล์และสารเสพติด */}
                   <div className="flex flex-col p-2 bg-gray-200 font-bold text-gray-800 font-bold mb-3 text-sm">
                    <h3>การตรวจแอลกอฮอล์และสารเสพติด</h3>
                    <p className="font-semibold text-xs text-gray-600">Alcohol & Drug Testing</p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-gray-700 font-medium mb-2 text-sm">
                            ตรวจแอลกอฮอล์:
                          </label>
                          <div className="flex items-center space-x-6">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="alcohol_test_radio"
                                checked={formData.alcohol_test === true}
                                onChange={() => handleRadioChange('alcohol_test', true)}
                                className="mr-2 h-4 w-4 text-blue-600"
                              />
                              <span className="text-sm">ตรวจ</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="alcohol_test_radio"
                                checked={formData.alcohol_test === false}
                                onChange={() => handleRadioChange('alcohol_test', false)}
                                className="mr-2 h-4 w-4 text-blue-600"
                              />
                              <span className="text-sm">ไม่ตรวจ</span>
                            </label>
                          </div>
                        </div>

                        {formData.alcohol_test && (
                          <div>
                            <label className="block text-gray-700 font-medium mb-1 text-sm">
                              ผลตรวจแอลกอฮอล์ (ml/%):
                            </label>
                            <input
                              type="text"
                              name="alcohol_test_result"
                              onChange={handleInputChange}
                              className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                              placeholder="กรอกผลการตรวจ"
                            />
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-gray-700 font-medium mb-2 text-sm">
                            ตรวจยาเสพติด:
                          </label>
                          <div className="flex items-center space-x-6">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="drug_test_radio"
                                checked={formData.drug_test === true}
                                onChange={() => handleRadioChange('drug_test', true)}
                                className="mr-2 h-4 w-4 text-blue-600"
                              />
                              <span className="text-sm">ตรวจ</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="drug_test_radio"
                                checked={formData.drug_test === false}
                                onChange={() => handleRadioChange('drug_test', false)}
                                className="mr-2 h-4 w-4 text-blue-600"
                              />
                              <span className="text-sm">ไม่ตรวจ</span>
                            </label>
                          </div>
                        </div>

                        {formData.drug_test && (
                          <div>
                            <label className="block text-gray-700 font-medium mb-1 text-sm">
                              ผลตรวจยาเสพติด (ml/%):
                            </label>
                            <input
                              type="text"
                              name="drug_test_result"
                              onChange={handleInputChange}
                              className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                              placeholder="กรอกผลการตรวจ"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
             
<div className="border-t border-gray-400 md:col-span-3"></div>
                {/* ความเสียหาย */}

                   <div className="flex flex-col p-2 bg-gray-200 font-bold text-gray-800 font-bold mb-3 text-sm">
                    <h3>ความเสียหาย</h3>
                    <p className="font-semibold text-xs text-gray-600">Damage Assessment</p>
                  </div>
                  <div className="p-6">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        <div className="space-y-4">
                          <div>
                            <label className="block text-gray-700 font-medium mb-2 text-sm">
                              สินค้าเสียหาย:
                            </label>
                            <div className="flex items-center space-x-6">
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name="product_damage_radio"
                                  checked={formData.product_damage === true}
                                  onChange={() => handleRadioChange('product_damage', true)}
                                  className="mr-2 h-4 w-4 text-blue-600"
                                />
                                <span className="text-sm">ใช่</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name="product_damage_radio"
                                  checked={formData.product_damage === false}
                                  onChange={() => handleRadioChange('product_damage', false)}
                                  className="mr-2 h-4 w-4 text-blue-600"
                                />
                                <span className="text-sm">ไม่</span>
                              </label>
                            </div>
                          </div>
                        </div>

                      </div>
{formData.product_damage === true && (
                      <div>
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            ความเสียหายรถ:
                          </label>
                          <textarea
                            name="truck_damage"
                            onChange={handleInputChange}
                            rows={3}
                            className="w-full text-sm p-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                            placeholder="อธิบายความเสียหายของรถ"
                          />
                      </div>
                       )}

                      {formData.product_damage === true && (
                        <div>
                          <label className="block text-gray-700 font-medium mb-1 text-sm">
                            รายละเอียดสินค้าเสียหาย:
                          </label>
                          <textarea
                            name="product_damage_details"
                            onChange={handleInputChange}
                            rows={3}
                            className="w-full text-sm p-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                            placeholder="อธิบายรายละเอียดความเสียหายของสินค้า"
                          />
                        </div>
                      )}
                    </div>
                  </div>

<div className="border-t border-gray-400 md:col-span-3"></div>
                {/* การบาดเจ็บ */}
                  <div className="flex flex-col p-2 bg-gray-200 font-bold text-gray-800 font-bold mb-3 text-sm">
                    <h3>อาการบาดเจ็บ และเสียชีวิต</h3>
                    <p className="font-semibold text-xs text-gray-600">Injury & Death Information</p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          ผู้บาดเจ็บไม่รักษาตัว:
                        </label>
                        <input
                          type="number"
                          name="injured_not_hospitalized"
                          min="0"
                          onChange={handleInputChange}
                          className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                          placeholder="จำนวนคน"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          ผู้บาดเจ็บรักษาตัว:
                        </label>
                        <input
                          type="number"
                          name="injured_hospitalized"
                          min="0"
                          onChange={handleInputChange}
                          className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                          placeholder="จำนวนคน"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          ผู้เสียชีวิต:
                        </label>
                        <input
                          type="number"
                          name="fatalities"
                          min="0"
                          onChange={handleInputChange}
                          className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                          placeholder="จำนวนคน"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-sm">
                        รายละเอียดการบาดเจ็บ:
                      </label>
                      <textarea
                        name="injury_description"
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full text-sm p-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                        placeholder="อธิบายรายละเอียดการบาดเจ็บ"
                      />
                    </div>
                  </div>
              
<div className="border-t border-gray-400 md:col-span-3"></div>
                {/* ข้อมูลคู่กรณี */}
                  <div className="flex flex-col p-2 bg-gray-200 font-bold text-gray-800 font-bold mb-3 text-sm">
                    <h3>ข้อมูลคู่กรณี และการเคลม</h3>
                    <p className="font-semibold text-xs text-gray-600">Other Party Information & Claim Officer Information</p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          ชื่อ-สกุลคู่กรณี:
                        </label>
                        <input
                          type="text"
                          name="other_party_full_name"
                          onChange={handleInputChange}
                          className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          ทะเบียนรถคู่กรณี:
                        </label>
                        <input
                          type="text"
                          name="other_party_vehicle_plate"
                          onChange={handleInputChange}
                          className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          ชื่อบริษัทคู่กรณี:
                        </label>
                        <input
                          type="text"
                          name="other_party_company_name"
                          onChange={handleInputChange}
                          className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          เบอร์โทรคู่กรณี:
                        </label>
                        <input
                          type="text"
                          name="other_party_phone"
                          onChange={handleInputChange}
                          className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          ชื่อบริษัทประกันคู่กรณี:
                        </label>
                        <input
                          type="text"
                          name="other_party_insurance_name"
                          onChange={handleInputChange}
                          className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          เลขที่เคลมคู่กรณี:
                        </label>
                        <input
                          type="text"
                          name="other_party_claim_no"
                          onChange={handleInputChange}
                          className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                        />
                      </div>

                       <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          ชื่อ-สกุล เจ้าหน้าที่เคลม:
                        </label>
                        <input
                          type="text"
                          name="claim_officer_full_name"
                          onChange={handleInputChange}
                          className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          เบอร์โทร เจ้าหน้าที่เคลม:
                        </label>
                        <input
                          type="text"
                          name="claim_officer_phone"
                          onChange={handleInputChange}
                          className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                        />
                      </div>

                    </div>
                  </div>
             

<div className="border-t border-gray-400 md:col-span-3"></div>
                {/*มูลค่าความเสียหาย */}
                  <div className="flex flex-col p-2 bg-gray-200 font-bold text-gray-800 font-bold mb-3 text-sm">
                    <h3>มูลค่าความเสียหาย</h3>
                    <p className="font-semibold text-xs text-gray-600">Damage Cost Assessment</p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          ประเมินค่าเสียหายสินค้า (บาท):
                        </label>
                        <input
                          type="number"
                          name="estimated_goods_damage_value"
                          min="0"
                          step="0.01"
                          onChange={handleInputChange}
                          className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          ประเมินค่าเสียหายรถ (บาท):
                        </label>
                        <input
                          type="number"
                          name="estimated_vehicle_damage_value"
                          min="0"
                          step="0.01"
                          onChange={handleInputChange}
                          className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          ค่าเสียหายสินค้าจริง (บาท):
                        </label>
                        <input
                          type="number"
                          name="actual_goods_damage_value"
                          min="0"
                          step="0.01"
                          onChange={handleInputChange}
                          className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">
                          ค่าเสียหายรถจริง (บาท):
                        </label>
                        <input
                          type="number"
                          name="actual_vehicle_damage_value"
                          min="0"
                          step="0.01"
                          onChange={handleInputChange}
                          className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
            

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                  >
                    บันทึกข้อมูล
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};