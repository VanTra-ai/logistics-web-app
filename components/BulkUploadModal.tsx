import React, { useState, useRef } from "react";
import { X, Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import api from "@/lib/axios";

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface RowError {
  row: number;
  errors: string[];
}

export default function BulkUploadModal({
  isOpen,
  onClose,
  onSuccess,
}: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (selectedFile: File) => {
    setRowErrors([]);
    if (
      selectedFile.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      selectedFile.name.endsWith(".xlsx") ||
      selectedFile.name.endsWith(".xls")
    ) {
      setFile(selectedFile);
    } else {
      alert("Vui lòng chọn file Excel (.xlsx hoặc .xls)");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsLoading(true);
    setRowErrors([]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.post("/orders/customer/bulk-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Tải lên đơn hàng loạt thành công!");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const apiError = err as {
        response?: {
          status?: number;
          data?: {
            rowErrors?: RowError[];
            message?: string;
          };
        };
      };
      if (
        apiError.response?.status === 400 &&
        apiError.response?.data?.rowErrors
      ) {
        setRowErrors(apiError.response.data.rowErrors);
      } else {
        alert(
          apiError.response?.data?.message || "Lỗi khi tải lên đơn hàng loạt",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">
            Tạo đơn hàng loạt
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {!rowErrors.length ? (
            <div
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-300 hover:border-slate-400 bg-slate-50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx, .xls"
                className="hidden"
              />
              <FileSpreadsheet
                className={`w-12 h-12 mb-4 ${
                  isDragging ? "text-blue-500" : "text-slate-400"
                }`}
              />
              <h3 className="text-lg font-semibold text-slate-700 mb-1">
                {file ? file.name : "Kéo thả file Excel vào đây"}
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                hoặc click để chọn file từ máy tính
              </p>
              {file && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Xóa file
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">
                  Có lỗi xảy ra ở một số dòng trong file Excel:
                </span>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 uppercase">
                    <tr>
                      <th className="px-4 py-3 border-b border-slate-200 w-24">
                        Dòng
                      </th>
                      <th className="px-4 py-3 border-b border-slate-200">
                        Lỗi chi tiết
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {rowErrors.map((err, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-700">
                          {err.row}
                        </td>
                        <td className="px-4 py-3">
                          <ul className="list-disc list-inside text-red-600 space-y-1">
                            {err.errors.map((msg, i) => (
                              <li key={i}>{msg}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    setRowErrors([]);
                    setFile(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-lg transition-colors"
                >
                  Tải lại file khác
                </button>
              </div>
            </div>
          )}
        </div>

        {!rowErrors.length && (
          <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-all"
              disabled={isLoading}
            >
              Hủy
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || isLoading}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl flex items-center gap-2 transition-all shadow-md"
            >
              {isLoading ? (
                <>Đang xử lý...</>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Tải lên
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
