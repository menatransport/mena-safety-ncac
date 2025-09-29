'use client'
import { useState, useEffect } from 'react'
import { Eye, X, Upload } from 'lucide-react'
import { LordIcon } from './LordIcon';

interface FileWithId {
  id: string;
  file: File;
  url: string;
}

interface CategoryFiles {
  [key: string]: FileWithId[];
}

export const Picture = ({ 
  display, 
  onSaveFiles,
  initialFiles = {}
}: { 
  display: (value: boolean) => void;
  onSaveFiles?: (files: CategoryFiles) => void;
  initialFiles?: CategoryFiles;
}) => {
  const [files, setFiles] = useState<CategoryFiles>(initialFiles);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const categories = [
    'รูปทั่วไป',
    'เอกสารใบเตือน',
    'เอกสารใบรับสภาพหนี้',
    'เอกสารใบแจ้งหนี้ลูกค้า',
    'เอกสารการเคลมจากประกัน',
    'เอกสารการตัดจำหน่าย',
    'หลักฐานการชำระค่าเสียหาย',
  ];

  useEffect(() => {
    // ปิด scrollbar เมื่อ component mount
    document.body.style.overflow = 'hidden';
    
    // คืนค่า scrollbar เมื่อ component unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // อัปเดต files เมื่อได้รับ initialFiles ใหม่
  useEffect(() => {
    setFiles(initialFiles);
  }, [initialFiles]);

  const handleCancel = () => {
    console.log('Cancel clicked');
    display(false)
  };

  // คำนวณจำนวนไฟล์ทั้งหมด
  const getTotalFiles = () => {
    return Object.values(files).reduce((total, categoryFiles) => total + categoryFiles.length, 0);
  };

  const handleDragOver = (e: React.DragEvent, category: string) => {
    e.preventDefault();
    setDragOver(category);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
  };

  const handleDrop = (e: React.DragEvent, category: string) => {
    e.preventDefault();
    setDragOver(null);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFileUpload(droppedFiles, category);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, category: string) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleFileUpload(selectedFiles, category);
  };

  const handleFileUpload = (newFiles: File[], category: string) => {
    const currentFiles = files[category] || [];
    
    // Check if adding new files would exceed limit
    if (currentFiles.length + newFiles.length > 5) {
      alert(`สามารถแนบไฟล์ได้สูงสุด 5 ไฟล์ต่อหมวดหมู่`);
      return;
    }

    const validFiles = newFiles.filter(file => 
      file.type.startsWith('image/') || file.type === 'application/pdf'
    );

    if (validFiles.length !== newFiles.length) {
      alert('รองรับเฉพาะไฟล์รูปภาพและ PDF เท่านั้น');
    }

    const filesWithId = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      url: URL.createObjectURL(file)
    }));

    setFiles(prev => ({
      ...prev,
      [category]: [...currentFiles, ...filesWithId]
    }));
  };

  const removeFile = (category: string, fileId: string) => {
    // ลบ object URL เพื่อป้องกัน memory leak
    const fileToRemove = files[category]?.find(f => f.id === fileId);
    if (fileToRemove) {
      URL.revokeObjectURL(fileToRemove.url);
    }
    
    setFiles(prev => ({
      ...prev,
      [category]: prev[category]?.filter(f => f.id !== fileId) || []
    }));
  };

  const handleSave = () => {
    // ส่งข้อมูลไฟล์ทั้งหมดกลับไปยัง parent component
    console.log('Saved files:', files);
    
    const totalFiles = getTotalFiles();
    
    if (totalFiles === 0) {
      alert('กรุณาแนบไฟล์อย่างน้อย 1 ไฟล์');
      return;
    }
    
    // ส่งข้อมูลไฟล์กลับไป parent component
    if (onSaveFiles) {
      onSaveFiles(files);
    }
    
    // ปิด modal
    display(false);
  };

  const viewImage = (url: string) => {
    setPreviewImage(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/50 overflow-hidden">
      <div className="bg-white max-w-4xl w-full mx-4 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Fixed Header with Icon */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <LordIcon
              src="https://cdn.lordicon.com/wsaaegar.json"
              trigger="loop"
              colors="primary:#121331,secondary:#08a88a"
              style={{ width: '56px', height: '56px', cursor: 'pointer' }}
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">แนบรูปและเอกสาร</h1>
              <p className="text-sm text-gray-500">รายละเอียดเพิ่มเติมเกี่ยวกับภาพ</p>
            </div>
          </div>
        </div>
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {categories.map((category) => (
              <div key={category} className="rounded-lg p-4">
                <h3 className="text-md font-bold text-gray-700 mb-3">{category}</h3>
                
                {/* Drop Zone */}
                <div
                  className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                    dragOver === category
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={(e) => handleDragOver(e, category)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, category)}
                >
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      ลากและวางไฟล์ที่นี่ หรือ
                    </p>
                    <label className="mt-2 cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200">
                      เลือกไฟล์
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        multiple
                        onChange={(e) => handleFileSelect(e, category)}
                      />
                    </label>
                  </div>
                </div>

                {/* File List */}
                {files[category] && files[category].length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {files[category].map((fileItem) => (
                      <div key={fileItem.id} className="relative group">
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                          {fileItem.file.type.startsWith('image/') ? (
                            <img
                              src={fileItem.url}
                              alt={fileItem.file.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <span className="text-xs text-gray-600 text-center p-2">
                                {fileItem.file.name}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="absolute inset-0 backdrop-blur-sm bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-2">
                          <button
                            onClick={() => viewImage(fileItem.url)}
                            className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeFile(category, fileItem.id)}
                            className="p-2 bg-white rounded-full text-red-600 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* File Name */}
                        <p className="mt-1 text-xs text-gray-600 truncate">
                          {fileItem.file.name}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Preview Modal */}
        {previewImage && (
          <div 
            className="fixed inset-0 backdrop-blur-sm bg-opacity-75 z-60 flex items-center justify-center"
            onClick={() => setPreviewImage(null)}
          >
            <div className="max-w-4xl max-h-4xl p-4">
              <img
                src={previewImage}
                alt="Preview"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>
        )}

        {/* Fixed Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button 
            onClick={handleCancel}
            className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700"
          >
            ยกเลิก
          </button>
          {getTotalFiles() > 0 && (
            <button 
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              ตกลง
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

