"use client";
import { useState, useCallback, useEffect } from "react";
import {
  X,
  Eye,
  EyeOff,
  FileText,
  ExternalLink,
  Trash,
  Plus,
  Check,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Swal from "sweetalert2";
import { sendErrorLog } from '@/lib/logError';
import {
  CategoryFiles,
  DocumentCategory,
  DocumentInfo,
  DOC_STATUS,
  FileWithId,
  HOVER_PREVIEW_SIZE,
  countAttached,
  countRequired,
  countTotalFiles,
  formatFileSize,
  canSkipCategory,
  getAcceptTypes,
  getCategoriesByCase,
  getCategory,
  getDepartmentLabel,
  getDocNoKey,
  groupCategoriesByDepartment,
  isImageCategory,
  isMultipleCategory,
  isImageFile,
  isPdfFile,
  isSkipped,
  reindexDocNos,
  resolveDocStatus,
} from "@/lib/attachment";

interface FileUploadProps {
  onFilesChange?: (files: CategoryFiles) => void;
  existingFiles?: CategoryFiles;
  case: string;
  onChangedocs?: (docs: DocumentInfo) => void;
  docs?: DocumentInfo;
  reporterDepartment?: string;
  /** ข้อความเตือนสีแดงท้ายหัวข้อ เช่น เงื่อนไขก่อนบันทึก */
  requiredNote?: string;
}

export const FileUpload = ({
  onFilesChange,
  existingFiles = {},
  case: caseType,
  onChangedocs,
  docs = {},
  reporterDepartment,
  requiredNote,
}: FileUploadProps) => {
  const [attachedFiles, setAttachedFiles] =
    useState<CategoryFiles>(existingFiles);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<FileWithId | null>(null);
  const [hoverPreview, setHoverPreview] = useState<{
    url: string;
    name: string;
    top: number;
    left: number;
  } | null>(null);
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo>(docs);
  // ฝ่ายที่กำลังเปิดดูรายการเอกสารที่ระบุว่าไม่ต้องแนบ
  const [openSkipList, setOpenSkipList] = useState<string | null>(null);

  const getFilteredCategories = useCallback(
    () => getCategoriesByCase(caseType),
    [caseType]
  );

  const setSkipped = (categoryValue: string, skip: boolean) => {
    const updated = {
      ...documentInfo,
      [categoryValue]: skip ? DOC_STATUS.skipped : DOC_STATUS.missing,
    };
    setDocumentInfo(updated);
    onChangedocs?.(updated);
  };

  // อัปเดตสถานะเอกสารอัตโนมัติจากไฟล์ที่แนบ (คงค่า "ไม่ต้องแนบ" ที่ผู้ใช้เลือกไว้)
  useEffect(() => {
    const updated: DocumentInfo = { ...documentInfo };
    let hasChanges = false;

    getFilteredCategories().forEach((doc) => {
      const hasFile = (attachedFiles[doc.value]?.length ?? 0) > 0;
      const status = resolveDocStatus(hasFile, updated[doc.value]);
      if (updated[doc.value] !== status) {
        updated[doc.value] = status;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setDocumentInfo(updated);
      onChangedocs?.(updated);
    }
  }, [attachedFiles, caseType]);

  const handleFilesChange = useCallback(
    (newFiles: CategoryFiles) => {
      setAttachedFiles(newFiles);
      onFilesChange?.(newFiles);
    },
    [onFilesChange]
  );

  const addFiles = (category: string, files: File[]) => {
    if (files.length === 0) return;

    const isMultiple = isMultipleCategory(category);
    const current = attachedFiles[category] ?? [];

    if (!isMultiple && current.length > 0) {
      Swal.fire({
        icon: "info",
        title: "แนบได้ 1 ไฟล์",
        text: "เอกสารนี้แนบได้ไฟล์เดียว หากต้องการเปลี่ยน กรุณาลบไฟล์เดิมก่อน",
        timer: 2200,
        showConfirmButton: false,
      });
      return;
    }

    const accepted = isMultiple ? files : files.slice(0, 1);

    const newFiles = accepted.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      url: URL.createObjectURL(file),
      category,
      uploadDate: new Date(),
      updateData: "new",
    }));

    handleFilesChange({
      ...attachedFiles,
      [category]: [...current, ...newFiles],
    });
  };

  const handleDrop = (category: string) => (event: React.DragEvent) => {
    event.preventDefault();
    setDragOverCategory(null);
    addFiles(category, Array.from(event.dataTransfer.files));
  };

  const handleDragOver = (category: string) => (event: React.DragEvent) => {
    event.preventDefault();
    setDragOverCategory(category);
  };

  const handleDragLeave = () => setDragOverCategory(null);

  const removeFile = async (category: string, fileId: string) => {
    const fileToRemove = attachedFiles[category]?.find((f) => f.id === fileId);
    if (!fileToRemove) return;

    setHoverPreview(null);
    const isExistingFile = fileToRemove.updateData === "existing";

    if (isExistingFile) {
      const result = await Swal.fire({
        title: 'ยืนยันการลบไฟล์',
        text: `คุณแน่ใจหรือไม่ว่าต้องการลบไฟล์ "${fileToRemove.file.name}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'ใช่, ลบไฟล์นี้',
        cancelButtonText: 'ยกเลิก'
      });
      if (!result.isConfirmed) return;
    }

    URL.revokeObjectURL(fileToRemove.url);
    const removedIndex = attachedFiles[category].findIndex((f) => f.id === fileId);
    const updatedFiles = { ...attachedFiles };
    updatedFiles[category] = updatedFiles[category].filter((f) => f.id !== fileId);

    // เอกสารที่มีเลขที่รายไฟล์ ต้องเลื่อนเลขขึ้นตามไฟล์ที่เหลือ
    const config = getCategory(category);
    if (config?.no && config.multiple) {
      const updatedDocInfo = reindexDocNos(documentInfo, category, removedIndex);
      setDocumentInfo(updatedDocInfo);
      onChangedocs?.(updatedDocInfo);
    }

    if (updatedFiles[category].length === 0) {
      delete updatedFiles[category];
    }
    handleFilesChange(updatedFiles);

    if (isExistingFile) {
      try {
        const res = await fetch('/api/attachment', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: fileToRemove.id }),
        });

        Swal.fire(res.ok ? 'ลบไฟล์สำเร็จ' : 'เกิดข้อผิดพลาด',
          res.ok ? `ไฟล์ "${fileToRemove.file.name}" ถูกลบเรียบร้อยแล้ว.` : `ไม่สามารถลบไฟล์ได้ โปรดลองอีกครั้ง.`,
          res.ok ? 'success' : 'error');

        if (!res.ok) sendErrorLog('FileUpload/removeFile', `Failed to delete: ${fileToRemove.id}`);
      } catch (error) {
        sendErrorLog('FileUpload/removeFile', error instanceof Error ? error : String(error));
      }
    }
  };

  const groupedCategories = groupCategoriesByDepartment(
    getFilteredCategories()
  );

  const totalCategories = countRequired(getFilteredCategories(), documentInfo);
  const totalCompleted = countAttached(getFilteredCategories(), attachedFiles);

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


            ${(fileItem.file.type === "application/pdf") || (fileItem.file.type === "image/jpeg") || (fileItem.file.type === "image/png")
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

  const openFile = (fileItem: FileWithId) => {
    setHoverPreview(null);
    if (isImageFile(fileItem.file)) {
      setPreviewFile(fileItem);
    } else {
      handleOpenDocument(fileItem);
    }
  };

  // รูปทั้งหมดในเอกสารเดียวกัน ใช้เลื่อนดูรูปถัดไป/ก่อนหน้าตอนเปิดเต็มจอ
  const previewSiblings = previewFile
    ? (attachedFiles[previewFile.category] ?? []).filter((item) =>
      isImageFile(item.file)
    )
    : [];
  const previewIndex = previewFile
    ? previewSiblings.findIndex((item) => item.id === previewFile.id)
    : -1;

  const stepPreview = (step: number) => {
    if (previewSiblings.length < 2 || previewIndex < 0) return;
    const nextIndex =
      (previewIndex + step + previewSiblings.length) % previewSiblings.length;
    setPreviewFile(previewSiblings[nextIndex]);
  };

  // คีย์ลัดตอนเปิดรูปเต็มจอ: ←/→ เลื่อนรูป, Esc ปิด
  useEffect(() => {
    if (!previewFile) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewFile(null);
      if (event.key === "ArrowLeft") stepPreview(-1);
      if (event.key === "ArrowRight") stepPreview(1);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // ขยายรูปเมื่อนำเมาส์ชี้ โดยวางไว้ด้านที่มีพื้นที่ว่างพอ
  const showHoverPreview = (fileItem: FileWithId, event: React.MouseEvent) => {
    if (!isImageFile(fileItem.file)) return;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const fitsRight =
      rect.right + HOVER_PREVIEW_SIZE + 16 < window.innerWidth;
    const left = fitsRight
      ? rect.right + 12
      : Math.max(12, rect.left - HOVER_PREVIEW_SIZE - 12);
    const top = Math.min(
      Math.max(12, rect.top + rect.height / 2 - HOVER_PREVIEW_SIZE / 2),
      Math.max(12, window.innerHeight - HOVER_PREVIEW_SIZE - 12)
    );

    setHoverPreview({ url: fileItem.url, name: fileItem.file.name, top, left });
  };

  const handleChanges = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;

    const updatedDocInfo = { ...documentInfo, [id]: value } as DocumentInfo;
    setDocumentInfo(updatedDocInfo);
    onChangedocs?.(updatedDocInfo);
  };

  // ปุ่มแนบไฟล์ (แบบแถบเต็มความกว้าง และแบบช่องรูป)
  const renderAddButton = (
    category: DocumentCategory,
    variant: "block" | "tile"
  ) => {
    const isDragging = dragOverCategory === category.value;

    return (
      <label
        onDrop={handleDrop(category.value)}
        onDragOver={handleDragOver(category.value)}
        onDragLeave={handleDragLeave}
        className={`flex cursor-pointer items-center justify-center gap-1.5 border border-dashed text-gray-500 transition-colors hover:border-gray-500 hover:text-gray-700 ${isDragging ? "border-gray-600 bg-gray-100 text-gray-700" : "border-gray-300"
          } ${variant === "tile"
            ? "h-[72px] w-full flex-col rounded-sm"
            : "h-9 w-full rounded-sm"
          }`}
      >
        <Plus className="h-4 w-4" />
        <span className="text-xs">
          {variant === "tile" ? "เพิ่มรูป" : "แนบไฟล์ หรือลากไฟล์มาวาง"}
        </span>
        <input
          type="file"
          className="hidden"
          accept={getAcceptTypes(category.value)}
          multiple={!!category.multiple}
          onChange={(e) => {
            addFiles(category.value, Array.from(e.target.files || []));
            e.target.value = "";
          }}
        />
      </label>
    );
  };

  // ไอคอนแทนไฟล์ที่ไม่ใช่รูป — PDF ใช้ไอคอนเฉพาะ นอกนั้นใช้ไอคอนเอกสารทั่วไป
  const renderFileIcon = (fileItem: FileWithId, sizeClass: string) =>
    isPdfFile(fileItem.file) ? (
      <img
        src="/icon-pdf.svg"
        alt="PDF"
        draggable={false}
        className={`${sizeClass} object-contain`}
      />
    ) : (
      <FileText className={`${sizeClass} text-gray-400`} />
    );

  // ช่องรูป (ใช้กับรูปเหตุการณ์) — ชี้เมาส์เพื่อขยาย คลิกเพื่อดูเต็มจอ
  const renderFileTile = (fileItem: FileWithId) => (
    <div
      key={fileItem.id}
      className="group relative h-[72px] overflow-hidden rounded-sm border border-gray-200 bg-gray-50"
      onMouseEnter={(e) => showHoverPreview(fileItem, e)}
      onMouseLeave={() => setHoverPreview(null)}
    >
      {isImageFile(fileItem.file) ? (
        <img
          src={fileItem.url}
          alt={fileItem.file.name}
          className="h-full w-full cursor-zoom-in object-cover"
          onClick={() => openFile(fileItem)}
        />
      ) : (
        <div
          className="flex h-full w-full cursor-pointer items-center justify-center"
          onClick={() => openFile(fileItem)}
        >
          {renderFileIcon(fileItem, "h-12 w-12")}
        </div>
      )}
      <button
        type="button"
        onClick={() => removeFile(fileItem.category, fileItem.id)}
        className="absolute right-0.5 top-0.5 rounded-sm bg-white/90 p-0.5 text-gray-500 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
        title="ลบไฟล์"
      >
        <Trash className="h-2.5 w-2.5" />
      </button>
    </div>
  );

  // แถวไฟล์ของเอกสาร (พร้อมช่องเลขที่เอกสารรายไฟล์ ถ้ามี)
  const renderFileRow = (fileItem: FileWithId, docNoKey?: string) => (
    <div key={fileItem.id} className="flex items-center gap-3">
      <div
        onClick={() => openFile(fileItem)}
        onMouseEnter={(e) => showHoverPreview(fileItem, e)}
        onMouseLeave={() => setHoverPreview(null)}
        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-sm border border-gray-200 bg-gray-50"
        title="ดูไฟล์"
      >
        {isImageFile(fileItem.file) ? (
          <img
            src={fileItem.url}
            alt={fileItem.file.name}
            className="h-full w-full object-cover"
          />
        ) : (
          renderFileIcon(fileItem, "h-7 w-7")
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-xs text-gray-800"
          title={fileItem.file.name}
        >
          {fileItem.file.name}
        </p>
        <p className="text-[11px] text-gray-400">
          {formatFileSize(fileItem.file.size)}
        </p>
      </div>
      {docNoKey && (
        <div className="flex shrink-0 items-center gap-2">
          <label htmlFor={docNoKey} className="text-xs text-gray-500">
            เลขที่
          </label>
          <input
            type="text"
            id={docNoKey}
            value={documentInfo[docNoKey] || ""}
            onChange={handleChanges}
            placeholder="ระบุถ้ามี"
            className="w-32 border-b border-gray-300 bg-transparent px-1 py-1 text-xs text-black placeholder-gray-400 focus:border-gray-700 focus:outline-none"
          />
        </div>
      )}
      {/* <button
        type="button"
        onClick={() => openFile(fileItem)}
        className="rounded-sm p-1 text-gray-500 hover:text-gray-900"
        title="ดูไฟล์"
      >
        {isImageFile(fileItem.file) ? (
          <Eye className="h-4 w-4" />
        ) : (
          <ExternalLink className="h-4 w-4" />
        )}
      </button> */}
      <button
        type="button"
        onClick={() => removeFile(fileItem.category, fileItem.id)}
        className="rounded-sm p-1 text-gray-500 hover:text-red-600"
        title="ลบไฟล์"
      >
        <Trash className="h-4 w-4" />
      </button>
    </div>
  );

  const renderDocumentRow = (category: DocumentCategory) => {
    const files = attachedFiles[category.value] ?? [];
    const isMulti = isMultipleCategory(category.value);
    const isDone = files.length > 0;
    const canAdd = isMulti || files.length === 0;
    const isImageGrid = isImageCategory(category.value);

    const canSkip = canSkipCategory(
      category.value,
      caseType,
      attachedFiles,
      documentInfo
    );

    return (
      <div
        key={category.value}
        className="grid gap-2 py-4 sm:grid-cols-[15rem_1fr] sm:gap-8"
      >
        {/* ชื่อเอกสาร + สถานะ */}
        <div>
          <p className="text-sm font-medium text-gray-900">
            {category.label}
            {category.required && <span className="text-red-500"> *</span>}
          </p>

          {isDone ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-700">
              <Check className="h-3.5 w-3.5" />
              แนบแล้ว
            </p>
          ) : (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
              {canSkip && (
                <button
                  type="button"
                  onClick={() => setSkipped(category.value, true)}
                  className="inline-flex items-center gap-1 text-[11px] text-gray-400 underline-offset-2 hover:text-gray-700 hover:underline"
                  title="ซ่อนรายการนี้ออกจากหน้าจอ"
                >
                  <EyeOff className="h-3 w-3" />
                  ไม่ต้องแนบ
                </button>
              )}
            </p>
          )}
        </div>

        {/* ไฟล์แนบ */}
        <div className="space-y-2">
          {isImageGrid ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {files.map((fileItem) => renderFileTile(fileItem))}
              {canAdd && renderAddButton(category, "tile")}
            </div>
          ) : (
            <>
              {files.map((fileItem, index) =>
                renderFileRow(
                  fileItem,
                  category.no
                    ? isMulti
                      ? getDocNoKey(category.value, index)
                      : `${category.value}_no`
                    : undefined
                )
              )}
              {canAdd && renderAddButton(category, "block")}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* หัวข้อหลัก */}
      <div className="flex flex-wrap items-end justify-between gap-2 bg-gray-200 p-2 text-sm font-bold text-gray-800">
        <div className="flex flex-col">
          <h3>
            แนบเอกสาร{" "}
            {requiredNote && (
              <span className="text-[12px] font-normal text-red-500">
                ({requiredNote})
              </span>
            )}
          </h3>
          <p className="text-xs font-semibold text-gray-600">
            Document Attachments
          </p>
        </div>
        <p className="shrink-0 text-xs font-normal text-gray-600">
          แนบครบ {totalCompleted}/{totalCategories} รายการ · รวม{" "}
          {countTotalFiles(attachedFiles)} ไฟล์
        </p>
      </div>

      {/* รายการเอกสารแยกตามฝ่าย */}
      {Object.entries(groupedCategories).map(([department, categories]) => {
        // เอกสารบังคับแนบซ่อนไม่ได้ นอกนั้นซ่อนได้ถ้าระบุว่า "ไม่ต้องแนบ"
        const visible = categories.filter(
          (cat) => cat.required || !isSkipped(documentInfo, cat.value)
        );
        const skippedList = categories.filter((cat) => !visible.includes(cat));
        const done = countAttached(categories, attachedFiles);
        const isListOpen = openSkipList === department;

        return (
          <section key={department}>
            <div className="flex items-baseline justify-between gap-3 border-b border-gray-300 pb-1.5">
              <h4 className="text-base font-semibold text-gray-900">
                {getDepartmentLabel(department, reporterDepartment)}
              </h4>
              <div className="flex shrink-0 items-center gap-3">
                {skippedList.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSkipList(isListOpen ? null : department)
                    }
                    className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[11px] transition-colors ${isListOpen
                      ? "border-gray-700 bg-gray-800 text-white"
                      : "border-gray-300 text-gray-500 hover:border-gray-500 hover:text-gray-800"
                      }`}
                    title="เอกสารที่ระบุว่าไม่ต้องแนบ"
                  >
                    <EyeOff className="h-3 w-3" />
                    {skippedList.length}
                  </button>
                )}
                <span className="text-xs text-gray-500">
                  {done}/{visible.length} รายการ
                </span>
              </div>
            </div>

            {/* รายการที่ซ่อนไว้ — กดเพื่อนำกลับมาแนบ */}
            {isListOpen && skippedList.length > 0 && (
              <div className="mt-2 border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="mb-1.5 text-[11px] text-gray-500">
                  เอกสารที่ระบุว่าไม่ต้องแนบ
                </p>
                <ul className="space-y-1">
                  {skippedList.map((cat) => (
                    <li
                      key={cat.value}
                      className="flex items-center justify-between gap-3 text-xs text-gray-600"
                    >
                      <span>{cat.label}</span>
                      <button
                        type="button"
                        onClick={() => setSkipped(cat.value, false)}
                        className="inline-flex shrink-0 items-center gap-1 text-[11px] text-gray-500 underline-offset-2 hover:text-gray-900 hover:underline"
                      >
                        <RotateCcw className="h-3 w-3" />
                        นำกลับมาแนบ
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="divide-y divide-gray-100">
              {visible.map((category) => renderDocumentRow(category))}
            </div>
          </section>
        );
      })}

      {/* รูปขยายเมื่อนำเมาส์ชี้ */}
      {hoverPreview && (
        <div
          className="pointer-events-none fixed z-40 rounded-sm border border-gray-300 bg-white p-1 shadow-xl"
          style={{ top: hoverPreview.top, left: hoverPreview.left }}
        >
          <img
            src={hoverPreview.url}
            alt={hoverPreview.name}
            style={{
              maxWidth: HOVER_PREVIEW_SIZE,
              maxHeight: HOVER_PREVIEW_SIZE,
            }}
            className="object-contain"
          />
        </div>
      )}

      {/* ดูรูปเต็มจอ (เลื่อนดูรูปอื่นในเอกสารเดียวกันได้) */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            style={{ animation: 'scaleIn 0.2s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewFile(null)}
              className="absolute -right-4 -top-4 z-50 rounded-full bg-gray-900 p-2 text-white shadow-lg hover:bg-black"
              title="ปิด (Esc)"
            >
              <X className="h-5 w-5" />
            </button>

            {previewSiblings.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => stepPreview(-1)}
                  title="รูปก่อนหน้า (←)"
                  className="absolute left-2 top-1/2 z-50 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/80"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={() => stepPreview(1)}
                  title="รูปถัดไป (→)"
                  className="absolute right-2 top-1/2 z-50 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/80"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <img
              src={previewFile.url}
              alt="Preview"
              className="max-h-[85vh] max-w-[85vw] rounded-sm object-contain shadow-2xl"
            />
            <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-3 bg-black/70 p-3 text-white">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{previewFile.file.name}</p>
                <p className="text-xs text-gray-300">{formatFileSize(previewFile.file.size)}</p>
              </div>
              {previewSiblings.length > 1 && (
                <p className="shrink-0 text-xs text-gray-300">
                  {previewIndex + 1} / {previewSiblings.length}
                </p>
              )}
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
