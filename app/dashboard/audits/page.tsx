"use client";

import { useState, useEffect } from "react";
import {
  ClipboardList,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Check,
  X,
} from "lucide-react";
import api from "@/lib/axios";

interface AuditItem {
  id: string;
  location: { barcode: string };
  expected_tracking: string;
  scanned_tracking: string;
  status: string;
}

interface Audit {
  id: string;
  status: string;
  zone_filter: string | null;
  created_at: string;
  created_by: { fullname: string };
  items: AuditItem[];
}

export default function AuditsPage() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    zone_filter: "",
  });

  const fetchAudits = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/audits");
      setAudits(response.data);
    } catch (error) {
      console.error("Failed to fetch audits:", error);
      // Demo data
      setAudits([
        {
          id: "1",
          status: "IN_PROGRESS",
          zone_filter: "A",
          created_at: new Date().toISOString(),
          created_by: { fullname: "Admin" },
          items: [
            {
              id: "1",
              location: { barcode: "LOC-A-01-1-A" },
              expected_tracking: "TRK123",
              scanned_tracking: "TRK123",
              status: "MATCHED",
            },
            {
              id: "2",
              location: { barcode: "LOC-A-01-1-B" },
              expected_tracking: "TRK456",
              scanned_tracking: "",
              status: "MISSING",
            },
          ],
        },
        {
          id: "2",
          status: "DRAFT",
          zone_filter: null,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          created_by: { fullname: "Admin" },
          items: [],
        },
        {
          id: "3",
          status: "COMPLETED",
          zone_filter: "C",
          created_at: new Date(Date.now() - 172800000).toISOString(),
          created_by: { fullname: "Admin" },
          items: [
            {
              id: "3",
              location: { barcode: "LOC-C-02-1-A" },
              expected_tracking: "TRK789",
              scanned_tracking: "TRK789",
              status: "MATCHED",
            },
          ],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAudits();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/audits", {
        zone_filter: formData.zone_filter || undefined,
      });
      showNotification("success", "Tạo kỳ kiểm kê thành công");
      setShowAddModal(false);
      setFormData({ zone_filter: "" });
      fetchAudits();
    } catch {
      showNotification("error", "Không thể tạo kỳ kiểm kê.");
    }
  };

  const handleStart = async (id: string) => {
    try {
      await api.patch(`/audits/${id}/start`);
      showNotification("success", "Đã bắt đầu kiểm kê");
      fetchAudits();
    } catch {
      showNotification("error", "Lỗi khi bắt đầu kiểm kê");
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await api.patch(`/audits/${id}/complete`);
      showNotification("success", "Đã hoàn tất kỳ kiểm kê");
      fetchAudits();
    } catch {
      showNotification("error", "Lỗi khi hoàn tất kiểm kê");
    }
  };

  const stats = {
    total: audits.length,
    inProgress: audits.filter((a) => a.status === "IN_PROGRESS").length,
    completed: audits.filter((a) => a.status === "COMPLETED").length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full border border-slate-200">
            Bản nháp
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
            Đang thực hiện
          </span>
        );
      case "COMPLETED":
        return (
          <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full border border-green-200">
            Đã hoàn tất
          </span>
        );
      default:
        return null;
    }
  };

  const getItemStatusBadge = (status: string) => {
    switch (status) {
      case "MATCHED":
        return (
          <span className="flex items-center gap-1 text-green-600 font-medium">
            <Check className="w-4 h-4" /> Khớp
          </span>
        );
      case "MISSING":
        return (
          <span className="flex items-center gap-1 text-red-600 font-medium">
            <X className="w-4 h-4" /> Thiếu
          </span>
        );
      case "WRONG_LOCATION":
        return (
          <span className="flex items-center gap-1 text-yellow-600 font-medium">
            <AlertTriangle className="w-4 h-4" /> Sai vị trí
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Kiểm kê Kho
          </h1>
          <p className="text-slate-500 mt-1">
            Quản lý các đợt kiểm kê hàng hoá thực tế trên kệ.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
        >
          <Plus className="w-5 h-5" />
          Tạo kỳ kiểm kê
        </button>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2 ${notification.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}
        >
          <AlertCircle className="w-5 h-5" />
          <p className="font-medium">{notification.message}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-slate-300 transition-colors">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl group-hover:bg-slate-200 transition-colors">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Tổng kỳ kiểm kê
            </p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm flex items-center gap-4 group hover:border-blue-200 transition-colors">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-100 transition-colors">
            <Play className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Đang thực hiện</p>
            <p className="text-2xl font-bold text-blue-700">
              {stats.inProgress}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-green-100 shadow-sm flex items-center gap-4 group hover:border-green-200 transition-colors">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl group-hover:bg-green-100 transition-colors">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Đã hoàn tất</p>
            <p className="text-2xl font-bold text-green-700">
              {stats.completed}
            </p>
          </div>
        </div>
      </div>

      {/* Audits List */}
      <div className="space-y-4">
        {isLoading ? (
          [1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse"
            >
              <div className="h-6 bg-slate-100 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-slate-100 rounded w-1/2"></div>
            </div>
          ))
        ) : audits.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Chưa có kỳ kiểm kê nào</p>
          </div>
        ) : (
          audits.map((audit) => {
            const isExpanded = expandedId === audit.id;
            const matchedCount =
              audit.items?.filter((i) => i.status === "MATCHED").length || 0;
            const missingCount =
              audit.items?.filter((i) => i.status === "MISSING").length || 0;
            const wrongCount =
              audit.items?.filter((i) => i.status === "WRONG_LOCATION")
                .length || 0;

            return (
              <div
                key={audit.id}
                className={`bg-white rounded-2xl border transition-all shadow-sm ${isExpanded ? "border-blue-200 ring-4 ring-blue-50" : "border-slate-200 hover:border-blue-100"}`}
              >
                {/* Header Card */}
                <div
                  className="p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                  onClick={() => setExpandedId(isExpanded ? null : audit.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-500">
                      <ClipboardList className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-slate-900 text-lg">
                          Kiểm kê{" "}
                          {new Date(audit.created_at).toLocaleDateString(
                            "vi-VN",
                          )}
                        </h3>
                        {getStatusBadge(audit.status)}
                      </div>
                      <p className="text-sm text-slate-500 flex items-center gap-2">
                        <span>
                          Bởi:{" "}
                          <strong className="text-slate-700">
                            {audit.created_by?.fullname || "Admin"}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          Khu vực:{" "}
                          <strong className="text-slate-700">
                            {audit.zone_filter
                              ? `Zone ${audit.zone_filter}`
                              : "Toàn kho"}
                          </strong>
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {audit.items?.length > 0 && (
                      <div className="flex gap-3 text-sm">
                        <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2.5 py-1 rounded-lg border border-green-100">
                          <Check className="w-4 h-4" /> {matchedCount}
                        </span>
                        <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-100">
                          <X className="w-4 h-4" /> {missingCount}
                        </span>
                        <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded-lg border border-yellow-100">
                          <AlertCircle className="w-4 h-4" /> {wrongCount}
                        </span>
                      </div>
                    )}
                    <div className="text-slate-400 p-1 hover:bg-slate-100 rounded-lg">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-6 rounded-b-2xl animate-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold text-slate-700">
                        Chi tiết kiểm kê
                      </h4>
                      <div className="flex gap-2">
                        {audit.status === "DRAFT" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStart(audit.id);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                          >
                            Bắt đầu kiểm kê
                          </button>
                        )}
                        {audit.status === "IN_PROGRESS" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleComplete(audit.id);
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                          >
                            Hoàn tất
                          </button>
                        )}
                      </div>
                    </div>

                    {!audit.items || audit.items.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 bg-white rounded-xl border border-slate-200">
                        {audit.status === "DRAFT"
                          ? "Nhấn Bắt đầu và sử dụng App Mobile để quét mã"
                          : "Chưa có dữ liệu quét"}
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-3 font-medium">
                                Vị trí Kệ
                              </th>
                              <th className="px-4 py-3 font-medium">
                                Đơn hàng (Dự kiến)
                              </th>
                              <th className="px-4 py-3 font-medium">
                                Đơn hàng (Thực tế)
                              </th>
                              <th className="px-4 py-3 font-medium">Kết quả</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {audit.items.map((item) => (
                              <tr
                                key={item.id}
                                className="hover:bg-slate-50 transition-colors"
                              >
                                <td className="px-4 py-3">
                                  <span className="flex items-center gap-2 font-medium text-slate-700">
                                    <MapPin className="w-4 h-4 text-slate-400" />
                                    {item.location?.barcode}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                  {item.expected_tracking || "-"}
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                  {item.scanned_tracking || "-"}
                                </td>
                                <td className="px-4 py-3">
                                  {getItemStatusBadge(item.status)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">
                Tạo kỳ kiểm kê mới
              </h2>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Lọc theo Khu vực (Tuỳ chọn)
                </label>
                <select
                  value={formData.zone_filter}
                  onChange={(e) =>
                    setFormData({ ...formData, zone_filter: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Toàn bộ kho</option>
                  <option value="A">Zone A</option>
                  <option value="B">Zone B</option>
                  <option value="C">Zone C</option>
                </select>
                <p className="text-xs text-slate-500 mt-2">
                  Nếu chọn Toàn bộ kho, bạn sẽ phải kiểm kê tất cả các kệ.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-xl transition-colors"
                >
                  Tạo kỳ kiểm kê
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Icon cho sai vị trí
const AlertTriangle = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);
