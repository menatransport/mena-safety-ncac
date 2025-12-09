"use client";
import { useState, useCallback, useEffect } from "react";
import {
  Upload,
  X,
  Eye,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Trash,
} from "lucide-react";

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
interface DocumentInfo {
  [key: string]: string;
}

interface FileUploadProps {
  onFilesChange?: (files: CategoryFiles) => void;
  existingFiles?: CategoryFiles;
  case: string;
  onChangedocs?: (docs: DocumentInfo) => void;
  docs?: DocumentInfo;
}

const DOCUMENT_CATEGORIES = [
  // ฝ่ายจัดส่ง (Delivery Department)
  {
    value: "event_img",
    label: "รูปเหตุการณ์",
    department: "📄ตามฝ่ายผู้บันทึกเคส",
    case: "all",
    no: false,
    icon: ImageIcon,
  },
  {
    value: "warning_doc",
    label: "ใบเตือน",
    department: "🚨Safety",
    case: "all",
    no: true,
    icon: FileText,
  },
  {
    value: "record_doc",
    label: "บันทึกประจำวัน",
    department: "📄ตามฝ่ายผู้บันทึกเคส",
    case: "ac",
    no: false,
    icon: FileText,
  },

  // ฝ่ายความปลอดภัย (Safety Department)
  {
    value: "medical_doc",
    label: "ใบรับรองแพทย์",
    department: "📄ตามฝ่ายผู้บันทึกเคส",
    case: "ac",
    no: true,
    icon: FileText,
  },
  {
    value: "Insurance_claim_doc",
    label: "ใบเคลมจากประกัน",
    department: "ℹ️Compliance",
    case: "all",
    no: true,
    icon: FileText,
  },
  {
    value: "legal_doc",
    label: "เอกสารคดีความ",
    department: "ℹ️Compliance",
    case: "ac",
    no: false,
    icon: FileText,
  },

  {
    value: "writeoff_doc",
    label: "ใบตัดจำหน่าย",
    department: "📄ตามฝ่ายผู้บันทึกเคส",
    case: "all",
    no: false,
    icon: FileText,
  },

  {
    value: "debt_doc",
    label: "ใบรับสภาพหนี้",
    department: "📄ตามฝ่ายผู้บันทึกเคส",
    case: "all",
    no: true,
    icon: FileText,
  },
  {
    value: "quotation_doc",
    label: "ใบเสนอราคา",
    department: "📄ตามฝ่ายผู้บันทึกเคส",
    case: "ac",
    no: true,
    icon: FileText,
  },
  {
    value: "customer_invoice",
    label: "ใบแจ้งหนี้ลูกค้า",
    department: "📄ตามฝ่ายผู้บันทึกเคส",
    case: "all",
    no: true,
    icon: FileText,
  },
  {
    value: "damage_payment",
    label: "หลักฐานการชำระค่าเสียหาย",
    department: "💼บัญชี",
    case: "all",
    no: true,
    icon: FileText,
  },
  {
    value: "account_attachment_sell",
    label: "เอกสารแนบทางบัญชี > ขายสินค้า",
    department: "💼บัญชี",
    case: "all",
    no: false,
    icon: FileText,
  },
  {
    value: "account_attachment_insurance",
    label: "เอกสารแนบทางบัญชี > ประกัน",
    department: "💼บัญชี",
    case: "all",
    no: false,
    icon: FileText,
  },
  {
    value: "account_attachment_pjs_pay",
    label: "เอกสารแนบทางบัญชี > พจส. จ่าย",
    department: "💼บัญชี",
    case: "all",
    no: false,
    icon: FileText,
  },
  {
    value: "account_attachment_company_pay",
    label: "เอกสารแนบทางบัญชี > บริษัทจ่ายลูกค้า",
    department: "💼บัญชี",
    case: "all",
    no: false,
    icon: FileText,
  },
  {
    value: "investigate_report",
    label: "รายงานการสอบสวน",
    department: "🚨Safety",
    case: "ac",
    no: false,
    icon: FileText,
  },
];

const DEPARTMENTS = [
  { value: "📄ตามฝ่ายผู้บันทึกเคส", label: "📄ตามฝ่ายผู้บันทึกเคส", color: " text-gray-800" },
  {
    value: "🚨Safety",
    label: "🚨Safety",
    color: " text-red-800",
  },
  { value: "ℹ️Compliance", label: "ℹ️Compliance", color: " text-blue-800" },
  { value: "💼บัญชี", label: "💼ฝ่ายบัญชี", color: " text-yellow-800" },
];

export const FileUpload = ({
  onFilesChange,
  existingFiles = {},
  case: caseType,
  onChangedocs,
  docs = {},
}: FileUploadProps) => {
  const [attachedFiles, setAttachedFiles] =
    useState<CategoryFiles>(existingFiles);
  const [dragOver, setDragOver] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(
    DOCUMENT_CATEGORIES[0].value
  );
  const [previewFile, setPreviewFile] = useState<FileWithId | null>(null);
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo>(docs);

  // ตั้งค่า default สำหรับเอกสารทั้งหมดที่ยังไม่มีข้อมูล
  useEffect(() => {
    const filteredCategories = DOCUMENT_CATEGORIES.filter(
      (category) => category.case === caseType || category.case === "all"
    );

    const defaultDocInfo: DocumentInfo = { ...documentInfo };
    let hasChanges = false;

    filteredCategories.forEach((doc) => {
      // ตั้งค่าเริ่มต้น "มี" ถ้ายังไม่มีข้อมูล
      if (!defaultDocInfo[doc.value]) {
        defaultDocInfo[doc.value] = "มี";
        hasChanges = true;
      }

      // ตั้งค่า remark เป็นค่าว่างถ้ายังไม่มี
      if (!defaultDocInfo[`${doc.value}_remark`]) {
        defaultDocInfo[`${doc.value}_remark`] = "";
        hasChanges = true;
      }

      // ตั้งค่า number เป็นค่าว่างถ้ามี no และยังไม่มีข้อมูล
      if (doc.no && !defaultDocInfo[`${doc.value}_no`]) {
        defaultDocInfo[`${doc.value}_no`] = "";
        hasChanges = true;
      }
    });

    // อัปเดตเฉพาะเมื่อมีการเปลี่ยนแปลง
    if (hasChanges) {
      setDocumentInfo(defaultDocInfo);
      onChangedocs?.(defaultDocInfo);
    }
  }, [caseType]); // เรียกใช้เมื่อ caseType เปลี่ยน

  const handleFilesChange = useCallback(
    (newFiles: CategoryFiles) => {
      setAttachedFiles(newFiles);
      onFilesChange?.(newFiles);
    },
    [onFilesChange]
  );

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {

    if (!selectedCategory) {
      alert("กรุณาเลือกชื่อเอกสารก่อนอัปโหลดไฟล์");
      return;
    }

    const newFiles = files.map((file) => ({
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
    updatedFiles[selectedCategory] = [
      ...updatedFiles[selectedCategory],
      ...newFiles,
    ];

    handleFilesChange(updatedFiles);

    // อัปเดต documentInfo เป็น "มี" เมื่อมีการแนบไฟล์
    const updatedDocInfo = { ...documentInfo, [selectedCategory]: "มี" };
    setDocumentInfo(updatedDocInfo);
    onChangedocs?.(updatedDocInfo);
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

    const updatedFiles = { ...attachedFiles };
    if (updatedFiles[category]) {
      const fileToRemove = updatedFiles[category].find((f) => f.id === fileId);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.url);
      }
      updatedFiles[category] = updatedFiles[category].filter(
        (f) => f.id !== fileId
      );

      if (updatedFiles[category].length === 0) {
        delete updatedFiles[category];
        // อัปเดต documentInfo เป็น "ไม่มี" เมื่อลบไฟล์สุดท้ายออก
        const updatedDocInfo = { ...documentInfo, [category]: "" };
        setDocumentInfo(updatedDocInfo);
        onChangedocs?.(updatedDocInfo);
      }
    }
    handleFilesChange(updatedFiles);
  };

  const getTotalFileCount = () => {
    return Object.values(attachedFiles).reduce(
      (total, files) => total + files.length,
      0
    );
  };

  const isImageFile = (file: File) => {
    return file.type.startsWith("image/");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getCategoryLabel = (categoryValue: string) => {
    return (
      DOCUMENT_CATEGORIES.find((cat) => cat.value === categoryValue)?.label ||
      categoryValue
    );
  };

  const getCategoryDepartment = (categoryValue: string) => {
    return (
      DOCUMENT_CATEGORIES.find((cat) => cat.value === categoryValue)
        ?.department || ""
    );
  };

  const getDepartmentColor = (department: string) => {
    return (
      DEPARTMENTS.find((dept) => dept.value === department)?.color ||
      "bg-gray-100 text-gray-800"
    );
  };

  const getGroupedCategories = () => {
    const grouped: { [key: string]: typeof DOCUMENT_CATEGORIES } = {};

    // กรองเฉพาะ category ที่ตรงกับ case หรือ case เป็น "all"
    const filteredCategories = DOCUMENT_CATEGORIES.filter(
      (category) => category.case === caseType || category.case === "all"
    );

    filteredCategories.forEach((category) => {
      const dept = category.department;
      if (!grouped[dept]) {
        grouped[dept] = [];
      }
      grouped[dept].push(category);
    });

    return grouped;
  };

  // ฟังก์ชันหาเอกสารที่ยังไม่ได้อัปโหลด
  const getMissingDocuments = () => {
    const filteredCategories = DOCUMENT_CATEGORIES.filter(
      (category) => category.case === caseType || category.case === "all"
    );
    return filteredCategories.filter((category) => {
      // ถ้ายังไม่มีไฟล์ในหมวดนี้เลย หรือมีแต่เป็นอาร์เรย์ว่าง
      return (
        !attachedFiles[category.value] ||
        attachedFiles[category.value].length === 0
      );
    });
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

  const getSortedFiles = () => {
    const allFiles: Array<{ category: string; fileItem: FileWithId }> = [];

    Object.entries(attachedFiles).forEach(([category, files]) => {
      files.forEach((fileItem) => {
        allFiles.push({ category, fileItem });
      });
    });

    return allFiles.sort((a, b) => a.category.localeCompare(b.category));
  };

  const handleOpenPreview = (fileItem: FileWithId, event: React.MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setPreviewPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    });
    setPreviewFile(fileItem);
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
      
           
            ${
              (fileItem.file.type === "application/pdf") || (fileItem.file.type === "image/jpeg") || (fileItem.file.type === "image/png")
                ? `<embed src="${fileItem.url}" type="application/pdf" class="document-viewer" />`
                : `<div style="text-align: center; padding: 50px;">
                <p>ไม่สามารถแสดงตัวอย่างไฟล์ชื่อนี้ได้</p>
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

  const handleChanges = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    console.log("Handling doc change for id:", id, "with value:", value);

    const updatedDocInfo = { ...documentInfo, [id]: value } as DocumentInfo;
    setDocumentInfo(updatedDocInfo);
    onChangedocs?.(updatedDocInfo);
  };

  return (
    <div className="space-y-6">
      {/* Category Selection */}
   
        <div className="flex flex-row space-y-1">
          <div className="w-1/2">
            <label className="block text-gray-700 font-medium mb-2 text-sm">
              ชื่อเอกสาร:
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black disabled:bg-gray-100"
            >
              <option value="">-- เลือกชื่อเอกสาร --</option>
              {Object.entries(getGroupedCategories()).map(
                ([department, categories]) => (
                  <optgroup
                    key={department}
                    label={`${
                      DEPARTMENTS.find((dept) => dept.value === department)
                        ?.label || department
                    }`}
                  >
                    {categories.map((category) => (
                      <option key={category.value} value={category.value}>
                        💠{category.label}
                      </option>
                    ))}
                  </optgroup>
                )
              )}
            </select>
          </div>
          {/* <div className="w-1/2 ml-4">
        <label className="block text-gray-700 font-medium mb-2 text-sm">
          เลขที่เอกสาร (ถ้ามี):
        </label>
          <input 
            type="text" 
            id={selectedCategory+"_no"} 
            onChange={handleChanges} 
            className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black disabled:bg-gray-100"
          />
        </div> */}
        </div>
    

      {/* File Upload Area */}
    
        <div
          className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
            dragOver
              ? "border-green-500 bg-green-50"
              : "border-gray-400 bg-gray-50 hover:border-gray-500"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="text-center">
            <Upload
              className={`mx-auto h-12 w-12 "text-gray-400"
              `}
            />
            <p className="mt-2 text-sm text-gray-600">
                 ลากและวางไฟล์ที่นี่ หรือ
            </p>
            <label
              className={`mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-600 bg-gray-100 hover:bg-gray-200 cursor-pointer"
              `}
            >
              เลือกไฟล์
              <input
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx"
                multiple
                onChange={handleFileSelect}
              />
            </label>
            <p className="mt-2 text-xs text-gray-500">
              รองรับไฟล์ภาพ, PDF (สูงสุด 10MB ต่อไฟล์)
            </p>
          </div>
        </div>
    

      {/* Attached Files Display */}
      {Object.keys(attachedFiles).length > 0 && (
        <div className="space-y-4">
          {Object.keys(attachedFiles).length > 0 && (
            <>
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
                          ชื่อเอกสาร
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                          ฝ่าย
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                          เลขที่เอกสาร
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
                            <div
                              className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer"
                              onClick={(e) =>
                                isImageFile(fileItem.file)
                                  ? handleOpenPreview(fileItem, e)
                                  : handleOpenDocument(fileItem)
                              }
                              title={
                                isImageFile(fileItem.file)
                                  ? "คลิกเพื่อดูรูปภาพขนาดใหญ่"
                                  : "คลิกเพื่อเปิดเอกสาร"
                              }
                            >
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
                              <div
                                className="text-xs font-medium text-gray-900 max-w-32 truncate"
                                title={fileItem.file.name}
                              >
                                {fileItem.file.name}
                              </div>
                              <div
                                className="text-[10px] font-medium text-gray-500 max-w-24 truncate"
                                title={formatDT(
                                  fileItem.uploadDate.toISOString()
                                )}
                              >
                                {formatDT(fileItem.uploadDate.toISOString())}
                              </div>
                              <div
                                className="text-[10px] font-medium text-gray-500 max-w-24 truncate"
                                title={fileItem.file.type}
                              >
                                {fileItem.file.type || "ไม่ทราบชื่อ"}
                              </div>
                            </div>
                          </td>

                          <td className="px-3 py-3 whitespace-nowrap">
                            <span
                              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 max-w-24 truncate"
                              title={getCategoryLabel(fileItem.category)}
                            >
                              {getCategoryLabel(fileItem.category)}
                            </span>
                          </td>

                          <td className="px-3 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center py-1 rounded-md text-xs font-medium ${getDepartmentColor(
                                getCategoryDepartment(fileItem.category)
                              )}`}
                            >
                              {getCategoryDepartment(fileItem.category)}
                            </span>
                          </td>

                          <td  key={fileItem.id} className="px-2 py-3 whitespace-nowrap text-xs text-gray-500">
                            <input
                              type="text"
                              id={fileItem.category + "_no"}
                              value={
                                documentInfo[`${fileItem.category}_no`] || ""
                              }
                              onChange={handleChanges}
                              placeholder="เลขที่เอกสาร"
                              className={`${
                                DOCUMENT_CATEGORIES.find(
                                  (val) => val.value === fileItem.category
                                )?.no
                                  ? ""
                                  : "hidden"
                              } w-full text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black disabled:bg-gray-100`}
                            />
                          </td>

                          <td className="px-3 py-3 whitespace-nowrap text-xs font-medium">
                            <div className="flex items-center justify-center space-x-2">
                              {/* ปุ่มดูไฟล์ */}
                                <div
                                  onClick={(e) =>
                                    isImageFile(fileItem.file)
                                      ? handleOpenPreview(fileItem, e)
                                      : handleOpenDocument(fileItem)
                                  }
                                  className="text-blue-600 hover:text-blue-800 cursor-pointer hover:bg-blue-50 p-1 rounded-md transition-colors"
                                  title={
                                    isImageFile(fileItem.file)
                                      ? "ดูรูปภาพ"
                                      : "เปิดเอกสาร"
                                  }
                                >
                                  {isImageFile(fileItem.file) ? (
                                    <Eye className="w-4 h-4" />
                                  ) : (
                                    <ExternalLink className="w-4 h-4" />
                                  )}
                                </div>

                                <div
                                  onClick={() =>
                                    removeFile(fileItem.category, fileItem.id)
                                  }
                                  className="text-red-600 hover:text-red-800 hover:bg-red-100 bg-red-50 hover:scale-110 cursor-pointer p-1 rounded-md transition-colors"
                                  title="ลบไฟล์"
                                >
                                  <Trash className="w-4 h-4" />
                                </div>
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
            </>
          )}

          {/* Missing Documents Table Hidden  */}
          {getMissingDocuments().length > 0 && (
            <>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-2 text-left font-semibold text-xs text-red-700 uppercase tracking-wider"
                        >
                          เอกสารแนบที่ขาด
                        </td>
                        <td
                          colSpan={1}
                          className="px-3 py-2 text-center text-xs text-gray-700 uppercase tracking-wider"
                        >
                          ต้องมีเอกสารแนบหรือไม่
                        </td>
                        <td
                          colSpan={2}
                          className="px-3 py-2 text-center text-xs text-gray-700 uppercase tracking-wider"
                        >
                          หมายเหตุ
                        </td>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getMissingDocuments().map((doc, index) => (
                        <tr key={doc.value} className="hover:bg-red-50">
                          <td
                            colSpan={4}
                            className="px-4 py-3 bg-gray-50 text-gray-700 text-xs font-medium"
                          >
                            <div className="flex items-start">
                              <span className="mr-2">{index + 1}.</span>
                              <span>{doc.label}</span>
                            </div>
                          </td>
                          <td
                            colSpan={1}
                            className="px-2 py-3 bg-white text-center border-l border-gray-200"
                          >
                            <select
                              id={doc.value}
                              value={documentInfo[doc.value] || "มี"}
                              onChange={handleChanges}
                              className="w-1/2 text-xs font-medium p-2 border border-gray-300 rounded bg-white text-center focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black disabled:bg-gray-100"
                            >
                              <option value="มี">มี</option>
                              <option value="ไม่มี">ไม่มี</option>
                            </select>
                          </td>
                          <td colSpan={2} className="px-4 py-3 bg-white">
                            <input
                              type="text"
                              id={`${doc.value}_remark`}
                              value={documentInfo[`${doc.value}_remark`] || ""}
                              onChange={handleChanges}
                              placeholder=" ไม่บังคับ"
                              className="w-full text-xs p-2 font-medium border border-gray-300 rounded bg-white focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none text-black disabled:bg-gray-100"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center"
          // onClick={() => setPreviewFile(null)}
        >
          <div 
            className="relative max-w-[90vw] max-h-[90vh]"
            style={{
              animation: 'scaleIn 0.2s ease-out'
            }}
          >
            <button
              onClick={() => setPreviewFile(null)}
              className="absolute -top-4 -right-4 z-50 p-2 bg-red-600 rounded-full text-white hover:bg-red-700 shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewFile.url}
              alt="Preview"
              className="max-h-[85vh] max-w-[85vw] rounded-lg shadow-2xl object-contain"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-3 rounded-b-lg">
              <p className="text-sm font-medium truncate">{previewFile.file.name}</p>
              <p className="text-xs text-gray-300">{formatFileSize(previewFile.file.size)}</p>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
