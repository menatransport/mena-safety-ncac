"use client";
import { useState, useCallback } from "react";
import { Upload, X, Eye, FileText, Image as ImageIcon, ExternalLink } from "lucide-react";

interface FileWithId {
  id: string;
  file: File;
  url: string;
  updateData: string;
  category: string;
  uploadDate: Date;
}

interface CategoryFiles {
  [key: string]: FileWithId[];
}

interface FileUploadProps {
  onFilesChange?: (files: CategoryFiles) => void;
  disabled?: boolean;
  existingFiles?: CategoryFiles;
}

const DOCUMENT_CATEGORIES = [
  // ฝ่ายจัดส่ง (Delivery Department)
  { value: "incident_photos", label: "รูปเหตุการณ์", department: "🚚จัดส่ง", icon: ImageIcon },
  { value: "warning_notice", label: "ใบเตือน", department: "🚚จัดส่ง", icon: FileText },
  { value: "daily_record", label: "บันทึกประจำวัน", department: "🚚จัดส่ง", icon: FileText },
  
  // ฝ่ายความปลอดภัย (Safety Department)
  { value: "medical_certificate", label: "ใบรับรองแพทย์", department: "🚨ความปลอดภัย", icon: FileText },
  { value: "insurance_claim", label: "ใบเคลมจากประกัน", department: "🚨ความปลอดภัย", icon: FileText },
  { value: "legal_document", label: "ใบคดีความ", department: "🚨ความปลอดภัย", icon: FileText },
  
  // ฝ่ายยานยนต์ (Vehicle Department)
  { value: "disposal_document", label: "ใบตัดจำหน่าย", department: "🔧ยานยนต์", icon: FileText },

  // ฝ่ายบัญชี (Accounting Department)
  { value: "debt_acknowledgment", label: "ใบรับสภาพหนี้", department: "💼บัญชี", icon: FileText },
  { value: "quotation", label: "ใบเสนอราคา", department: "💼บัญชี", icon: FileText },
  { value: "customer_invoice", label: "ใบแจ้งหนี้ลูกค้า", department: "💼บัญชี", icon: FileText },
  { value: "payment_evidence", label: "หลักฐานการชำระค่าเสียหาย", department: "💼บัญชี", icon: FileText },
];

const DEPARTMENTS = [
  { value: "🚚จัดส่ง", label: "🚚ฝ่ายจัดส่ง", color: " text-green-800" },
  { value: "🚨ความปลอดภัย", label: "🚨ฝ่ายความปลอดภัย", color: " text-red-800" },
  { value: "🔧ยานยนต์", label: "🔧ฝ่ายยานยนต์", color: " text-blue-800" },
  { value: "💼บัญชี", label: "💼ฝ่ายบัญชี", color: " text-yellow-800" },
];

export const FileUpload = ({ onFilesChange, disabled = false, existingFiles = {} }: FileUploadProps) => {
  const [attachedFiles, setAttachedFiles] = useState<CategoryFiles>(existingFiles);
  const [dragOver, setDragOver] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(DOCUMENT_CATEGORIES[0].value);
  const [previewFile, setPreviewFile] = useState<FileWithId | null>(null);

  const handleFilesChange = useCallback((newFiles: CategoryFiles) => {
    setAttachedFiles(newFiles);
    onFilesChange?.(newFiles);
  }, [onFilesChange]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    if (disabled) return;
    
    if (!selectedCategory) {
      alert('กรุณาเลือกประเภทเอกสารก่อนอัปโหลดไฟล์');
      return;
    }

    const newFiles = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      url: URL.createObjectURL(file),
      category: selectedCategory,
      uploadDate: new Date(),
      updateData: "new",
    }));

    const updatedFiles = { ...attachedFiles };
    if (!updatedFiles[selectedCategory]) {
      updatedFiles[selectedCategory] = [];
    }
    updatedFiles[selectedCategory] = [...updatedFiles[selectedCategory], ...newFiles];

    handleFilesChange(updatedFiles);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    
    const files = Array.from(event.dataTransfer.files);
    handleFiles(files);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const removeFile = (category: string, fileId: string) => {
    if (disabled) return;

    const updatedFiles = { ...attachedFiles };
    if (updatedFiles[category]) {
      const fileToRemove = updatedFiles[category].find(f => f.id === fileId);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.url);
      }
      updatedFiles[category] = updatedFiles[category].filter(f => f.id !== fileId);
      
      if (updatedFiles[category].length === 0) {
        delete updatedFiles[category];
      }
    }
    handleFilesChange(updatedFiles);
  };

  const getTotalFileCount = () => {
    return Object.values(attachedFiles).reduce((total, files) => total + files.length, 0);
  };

  const isImageFile = (file: File) => {
    return file.type.startsWith('image/');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryLabel = (categoryValue: string) => {
    return DOCUMENT_CATEGORIES.find(cat => cat.value === categoryValue)?.label || categoryValue;
  };

  const getCategoryDepartment = (categoryValue: string) => {
    return DOCUMENT_CATEGORIES.find(cat => cat.value === categoryValue)?.department || "";
  };

  const getDepartmentColor = (department: string) => {
    return DEPARTMENTS.find(dept => dept.value === department)?.color || "bg-gray-100 text-gray-800";
  };

  const getGroupedCategories = () => {
    const grouped: { [key: string]: typeof DOCUMENT_CATEGORIES } = {};
    
    DOCUMENT_CATEGORIES.forEach(category => {
      const dept = category.department;
      if (!grouped[dept]) {
        grouped[dept] = [];
      }
      grouped[dept].push(category);
    });
    
    return grouped;
  };
  const formatDT = (dateTimeString?: string) => {
    if (!dateTimeString) return "";
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return dateTimeString;

    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Intl.DateTimeFormat("en-GB", options).format(date);
  };
//   const getCategoryShortLabel = (categoryValue: string) => {
//     const shortLabels: { [key: string]: string } = {
//       documents: "เอกสาร",
//       incident_photos: "รูปเหตุการณ์",
//       warning_notice: "ใบเตือน",
//       debt_acknowledgment: "ใบรับหนี้",
//       quotation: "ใบเสนอราคา",
//       customer_invoice: "ใบแจ้งหนี้",
//       insurance_claim: "เคลมประกัน",
//       daily_record: "บันทึกประจำวัน",
//       medical_certificate: "ใบรับรองแพทย์",
//       disposal_document: "ใบตัดจำหน่าย",
//       payment_evidence: "หลักฐานชำระ",
//       legal_document: "เอกสารคดี",
//     };
//     return shortLabels[categoryValue] || categoryValue;
//   };

  // Sort files by category
  const getSortedFiles = () => {
    const allFiles: Array<{ category: string; fileItem: FileWithId }> = [];
    
    Object.entries(attachedFiles).forEach(([category, files]) => {
      files.forEach(fileItem => {
        allFiles.push({ category, fileItem });
      });
    });

    // Sort by category value (alphabetically)
    return allFiles.sort((a, b) => a.category.localeCompare(b.category));
  };

  const handleOpenDocument = (fileItem: FileWithId) => {
    // เปิดไฟล์ในหน้าใหม่
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${fileItem.file.name}</title>
          <style>
            body { margin: 0;font-family: Arial, sans-serif; }
            .container { max-width: 100%; margin: 0 auto; }
            .header { border-bottom: 1px solid #ccc; }
            .document-viewer { width: 100%; height: calc(115vh - 100px); border: none; }
            .file-info { background: #f5f5f5; padding: 10px; border-radius: 5px; }
          </style>
        </head>
        <body>
      
           
            ${fileItem.file.type === 'application/pdf' ? 
              `<embed src="${fileItem.url}" type="application/pdf" class="document-viewer" />` :
              `<div style="text-align: center; padding: 50px;">
                <p>ไม่สามารถแสดงตัวอย่างไฟล์ประเภทนี้ได้</p>
                <a href="${fileItem.url}" download="${fileItem.file.name}" 
                   style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                   ดาวน์โหลดไฟล์
                </a>
              </div>`
            }
        
        </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  return (
    <div className="space-y-6">
      {/* Category Selection */}
      {!disabled && (<div>
        <label className="block text-gray-700 font-medium mb-2 text-sm">
          ประเภทเอกสาร:
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          disabled={disabled}
          className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black disabled:bg-gray-100"
        >
          <option value="">-- เลือกประเภทเอกสาร --</option>
          {Object.entries(getGroupedCategories()).map(([department, categories]) => (
            <optgroup key={department} label={`${DEPARTMENTS.find(dept => dept.value === department)?.label || department}`}>
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                        💠{category.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      )}

      {/* File Upload Area */}
      {!disabled && (<div
        className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragOver
            ? "border-green-500 bg-green-50"
            : disabled
            ? "border-gray-300 bg-gray-50"
            : "border-gray-400 bg-gray-50 hover:border-gray-500"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="text-center">
          <Upload className={`mx-auto h-12 w-12 ${disabled ? 'text-gray-300' : 'text-gray-400'}`} />
          <p className="mt-2 text-sm text-gray-600">
            {disabled ? 'ไม่สามารถอัปโหลดไฟล์ได้' : 'ลากและวางไฟล์ที่นี่ หรือ'}
          </p>
          <label className={`mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md ${
            disabled 
              ? 'text-gray-400 bg-gray-100 cursor-not-allowed' 
              : 'text-gray-600 bg-gray-100 hover:bg-gray-200 cursor-pointer'
          }`}>
            เลือกไฟล์
            <input
              type="file"
              className="hidden"
              accept="image/*,.pdf,.doc,.docx"
              multiple
              onChange={handleFileSelect}
              disabled={disabled}
            />
          </label>
          <p className="mt-2 text-xs text-gray-500">
            รองรับไฟล์ภาพ, PDF (สูงสุด 10MB ต่อไฟล์)
          </p>
        </div>
      </div>
      )}

      {/* Attached Files Display */}
      {Object.keys(attachedFiles).length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-800">ไฟล์ที่แนบ:</h4>
          
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      ตัวอย่าง
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      ชื่อไฟล์
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      ประเภท
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      ฝ่าย
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      วันที่อัปโหลด
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getSortedFiles().map(({ category, fileItem }) => (
                    <tr key={fileItem.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer"
                             onClick={() => isImageFile(fileItem.file) ? setPreviewFile(fileItem) : handleOpenDocument(fileItem)}
                             title={isImageFile(fileItem.file) ? "คลิกเพื่อดูรูปภาพขนาดใหญ่" : "คลิกเพื่อเปิดเอกสาร"}>
                          {isImageFile(fileItem.file) ? (
                            <img
                              src={fileItem.url}
                              alt={fileItem.file.name}
                              className="w-full h-full object-cover hover:scale-110 transition-transform"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center">
                              <FileText className="w-6 h-6 text-gray-400 mb-1" />
                              <ExternalLink className="w-3 h-3 text-blue-500" />
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-xs font-medium text-gray-900 max-w-32 truncate" title={fileItem.file.name}>
                            {fileItem.file.name}
                          </div>
                          <div className="text-xs font-medium text-gray-500 max-w-24 truncate" title={fileItem.file.type}>
                            {fileItem.file.type || 'ไม่ทราบประเภท'}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 max-w-24 truncate"
                              title={getCategoryLabel(fileItem.category)}>
                          {getCategoryLabel(fileItem.category)}
                        </span>
                      </td>
                      
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center py-1 rounded-md text-xs font-medium ${getDepartmentColor(getCategoryDepartment(fileItem.category))}`}>
                          {getCategoryDepartment(fileItem.category)}
                        </span>
                      </td>
                      
                      <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-500">
                        {formatDT(fileItem.uploadDate.toISOString())}
                      </td>
                      
                      <td className="px-3 py-3 whitespace-nowrap text-xs font-medium">
                        <div className="flex items-center space-x-2">
                          {/* ปุ่มดูไฟล์ */}
                          {disabled && (<div
                            onClick={() => isImageFile(fileItem.file) ? setPreviewFile(fileItem) : handleOpenDocument(fileItem)}
                            className="text-blue-600 hover:text-blue-800 cursor-pointer hover:bg-blue-50 p-1 rounded-md transition-colors"
                            title={isImageFile(fileItem.file) ? "ดูรูปภาพ" : "เปิดเอกสาร"}
                          >
                            {isImageFile(fileItem.file) ? <Eye className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                          </div>
                        )}
                      
                          {/* ปุ่มลบไฟล์ - แสดงเฉพาะเมื่อไม่ disabled */}
                          {!disabled && (
                            <div
                              onClick={() => removeFile(fileItem.category, fileItem.id)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded-md transition-colors"
                              title="ลบไฟล์"
                            >
                              <X className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Summary Footer */}
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>รวมทั้งหมด {getTotalFileCount()} ไฟล์</span>
                
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
         <div 
            className="fixed inset-0 backdrop-blur-sm bg-opacity-75 z-60 flex items-center justify-center"
            onClick={() => setPreviewFile(null)}
          >
            <div className="max-w-4xl max-h-4xl p-4 relative">
              <button
                onClick={() => setPreviewFile(null)}
                className="absolute top-2 right-2 z-70 p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
               <img
                  src={previewFile.url}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain"
               
                />
            </div>
          </div>
      )}
    </div>
  );
};