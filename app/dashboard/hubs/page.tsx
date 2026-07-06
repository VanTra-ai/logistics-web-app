"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  MapPin,
  Calendar,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import api from "@/lib/axios";
import axios from "axios";

interface Hub {
  id: string;
  hub_code?: string | null;
  name: string;
  address: string;
  is_active: boolean;
  created_at: string;
}

export default function HubsPage() {
  // Trạng thái danh sách & bộ lọc
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Trạng thái thông báo chung
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Trạng thái các Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedHub, setSelectedHub] = useState<Hub | null>(null);

  // Dữ liệu Form
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    is_active: true,
  });
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Gọi danh sách bưu cục khi khởi chạy
  const fetchHubs = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    else setIsLoading(true);
    setNotification(null);

    try {
      const response = await api.get("/hubs");
      // Dữ liệu thường có dạng { message: string, data: Hub[] } hoặc trực tiếp mảng Hub[]
      const data = response.data?.data || response.data || [];

      if (Array.isArray(data)) {
        setHubs(data);
        setIsDemoMode(false);
      } else {
        throw new Error("Dữ liệu bưu cục trả về không đúng định dạng");
      }
    } catch (error) {
      console.warn(
        "Không thể tải danh sách bưu cục từ server. Chuyển sang Demo Mode.",
        error,
      );
      // Dữ liệu giả lập (Demo Mode Fallback)
      setHubs([
        {
          id: "hub-1",
          name: "Bưu cục Cầu Giấy",
          address: "Số 15 Duy Tân, Dịch Vọng Hậu, Cầu Giấy, Hà Nội",
          is_active: true,
          created_at: "2026-06-01T08:00:00Z",
        },
        {
          id: "hub-2",
          name: "Bưu cục Quận 1",
          address: "218 Nguyễn Thị Minh Khai, Phường 6, Quận 1, TP. HCM",
          is_active: true,
          created_at: "2026-06-05T09:30:00Z",
        },
        {
          id: "hub-3",
          name: "Bưu cục Hải Phòng",
          address: "102 Lạch Tray, Ngô Quyền, Hải Phòng",
          is_active: true,
          created_at: "2026-06-10T10:15:00Z",
        },
        {
          id: "hub-4",
          name: "Bưu cục Đà Nẵng",
          address: "48 Chi Lăng, Hải Châu, Đà Nẵng",
          is_active: true,
          created_at: "2026-06-12T14:20:00Z",
        },
        {
          id: "hub-5",
          name: "Bưu cục Thủ Đức",
          address: "45 Võ Văn Ngân, Linh Chiểu, Thủ Đức, TP. HCM",
          is_active: false,
          created_at: "2026-06-15T11:00:00Z",
        },
      ]);
      setIsDemoMode(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHubs();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Xử lý ẩn thông báo sau 5 giây
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Tìm kiếm & Lọc bưu cục theo tên hoặc địa chỉ
  const filteredHubs = hubs.filter(
    (hub) =>
      hub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hub.address.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Mở Modal Thêm mới
  const openAddModal = () => {
    setFormData({ name: "", address: "", is_active: true });
    setFormError("");
    setIsAddModalOpen(true);
  };

  // Mở Modal Chỉnh sửa
  const openEditModal = (hub: Hub) => {
    setSelectedHub(hub);
    setFormData({
      name: hub.name,
      address: hub.address,
      is_active: hub.is_active,
    });
    setFormError("");
    setIsEditModalOpen(true);
  };

  // Tạo mới bưu cục (POST /hubs)
  const handleCreateHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.address.trim()) {
      setFormError("Tên bưu cục và địa chỉ không được để trống!");
      return;
    }

    setIsSubmitLoading(true);
    setFormError("");

    if (isDemoMode) {
      // Giả lập lưu trên Client
      const newHub: Hub = {
        id: `hub-${Date.now()}`,
        name: formData.name,
        address: formData.address,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      setHubs([newHub, ...hubs]);
      setIsAddModalOpen(false);
      setNotification({
        type: "success",
        message: "Đã thêm bưu cục mới thành công (Demo Mode)!",
      });
      setIsSubmitLoading(false);
      return;
    }

    try {
      const response = await api.post("/hubs", {
        name: formData.name,
        address: formData.address,
      });

      const createdHub = response.data?.data || response.data;
      if (createdHub) {
        setHubs([createdHub, ...hubs]);
        setIsAddModalOpen(false);
        setNotification({
          type: "success",
          message: "Tạo bưu cục mới thành công!",
        });
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setFormError(error.response?.data?.message || "Lỗi tạo bưu cục!");
      } else {
        setFormError("Không thể kết nối tới server.");
      }
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // Cập nhật bưu cục (PATCH /hubs/:id)
  const handleUpdateHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHub) return;
    if (!formData.name.trim() || !formData.address.trim()) {
      setFormError("Tên và địa chỉ không được để trống!");
      return;
    }

    setIsSubmitLoading(true);
    setFormError("");

    if (isDemoMode) {
      // Giả lập cập nhật trên Client
      setHubs(
        hubs.map((h) =>
          h.id === selectedHub.id
            ? {
                ...h,
                name: formData.name,
                address: formData.address,
                is_active: formData.is_active,
              }
            : h,
        ),
      );
      setIsEditModalOpen(false);
      setNotification({
        type: "success",
        message: "Cập nhật bưu cục thành công (Demo Mode)!",
      });
      setIsSubmitLoading(false);
      return;
    }

    try {
      const response = await api.patch(`/hubs/${selectedHub.id}`, {
        name: formData.name,
        address: formData.address,
        is_active: formData.is_active,
      });

      const updatedHub = response.data?.data || response.data;
      if (updatedHub) {
        setHubs(hubs.map((h) => (h.id === selectedHub.id ? updatedHub : h)));
        setIsEditModalOpen(false);
        setNotification({
          type: "success",
          message: "Cập nhật bưu cục thành công!",
        });
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setFormError(error.response?.data?.message || "Lỗi cập nhật bưu cục!");
      } else {
        setFormError("Không thể kết nối tới server.");
      }
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // Vô hiệu hóa/Đóng cửa bưu cục (DELETE /hubs/:id)
  const handleDeleteHub = async (hub: Hub) => {
    const confirmDelete = window.confirm(
      `Bạn có chắc chắn muốn đóng cửa bưu cục "${hub.name}" không? Hàng tồn kho của bưu cục phải bằng 0 mới thực hiện được.`,
    );
    if (!confirmDelete) return;

    if (isDemoMode) {
      // Giả lập kiểm tra nghiệp vụ trên Client:
      // Bưu cục Cầu Giấy (hub-1) hoặc Quận 1 (hub-2) được giả lập là có đơn hàng tồn kho
      if (hub.id === "hub-1" || hub.id === "hub-2") {
        setNotification({
          type: "error",
          message: `Không thể đóng cửa! Bưu cục ${hub.name} này vẫn còn đơn hàng đang tồn kho (Demo Check).`,
        });
      } else {
        setHubs(
          hubs.map((h) => (h.id === hub.id ? { ...h, is_active: false } : h)),
        );
        setNotification({
          type: "success",
          message: `Đã đóng cửa bưu cục ${hub.name} an toàn (Demo Mode)!`,
        });
      }
      return;
    }

    try {
      const response = await api.delete(`/hubs/${hub.id}`);
      const updatedHub = response.data?.data || response.data;

      // Xóa thành công hoặc vô hiệu hóa thành công
      if (updatedHub) {
        setHubs(
          hubs.map((h) => (h.id === hub.id ? { ...h, is_active: false } : h)),
        );
      } else {
        setHubs(
          hubs.map((h) => (h.id === hub.id ? { ...h, is_active: false } : h)),
        );
      }
      setNotification({
        type: "success",
        message: `Đã đóng cửa bưu cục "${hub.name}" an toàn!`,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setNotification({
          type: "error",
          message:
            error.response?.data?.message ||
            `Không thể đóng cửa bưu cục ${hub.name}!`,
        });
      } else {
        setNotification({
          type: "error",
          message: "Lỗi kết nối mạng, không thể xóa bưu cục.",
        });
      }
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Cảnh báo chế độ giả lập */}
      {isDemoMode && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold">
              Đang chạy ở chế độ giả lập (Demo Mode):
            </span>{" "}
            Hệ thống web app không kết nối được tới API Backend
            (`http://localhost:3333/hubs`). Các hành động Thêm/Sửa/Đóng cửa bưu
            cục sẽ chỉ mô phỏng trên Client.
          </div>
        </div>
      )}

      {/* Floating Notifications toast */}
      {notification && (
        <div
          className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 max-w-sm border transition-all duration-300 transform translate-y-0 ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-950 border-emerald-200"
              : "bg-red-50 text-red-950 border-red-200"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <p className="text-xs font-semibold leading-normal">
            {notification.message}
          </p>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 ml-auto cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Quản lý bưu cục (Hubs)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Quản lý và điều phối các kho hàng bưu cục trong mạng lưới
              logistics
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchHubs(true)}
            disabled={isRefreshing}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-250 transition-colors cursor-pointer disabled:opacity-50"
            title="Làm mới danh sách"
          >
            <RefreshCw
              className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-blue-900/10 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Thêm bưu cục
          </button>
        </div>
      </div>

      {/* Search & Statistics Overview */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-4 py-2.5 bg-white border border-slate-250 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
            placeholder="Tìm theo tên bưu cục hoặc địa chỉ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Counter quick metrics */}
        <div className="flex gap-4 text-xs font-semibold">
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
            <span className="text-slate-500">Tổng số:</span>
            <span className="text-slate-800 font-bold text-sm">
              {hubs.length}
            </span>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
            <span className="text-slate-500">Hoạt động:</span>
            <span className="text-emerald-600 font-bold text-sm">
              {hubs.filter((h) => h.is_active).length}
            </span>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 text-sm font-medium">
              Đang tải dữ liệu bưu cục...
            </p>
          </div>
        ) : filteredHubs.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 text-slate-400">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Không tìm thấy bưu cục nào
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Vui lòng kiểm tra lại từ khóa tìm kiếm hoặc thử thêm bưu cục mới
              vào hệ thống.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-150 bg-slate-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Tên bưu cục</th>
                  <th className="px-6 py-4">Địa chỉ bưu cục</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4">Ngày liên kết</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-sm">
                {filteredHubs.map((hub) => (
                  <tr
                    key={hub.id}
                    className="hover:bg-slate-50/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${hub.is_active ? "bg-emerald-500" : "bg-slate-400"}`}
                        />
                        <div>
                          <span className="block font-semibold text-slate-900">
                            {hub.name}
                          </span>
                          <span className="block text-[10px] text-blue-650 font-mono">
                            Mã: {hub.hub_code || "Chưa cấp"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs md:max-w-sm lg:max-w-md truncate">
                      <div
                        className="flex items-center gap-1.5"
                        title={hub.address}
                      >
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate">{hub.address}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          hub.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-250"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {hub.is_active ? "Hoạt động" : "Đã đóng cửa"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{formatDate(hub.created_at)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      <button
                        onClick={() => openEditModal(hub)}
                        className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                        title="Chỉnh sửa thông tin"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {hub.is_active && (
                        <button
                          onClick={() => handleDeleteHub(hub)}
                          className="p-1.5 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                          title="Đóng cửa bưu cục"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: THÊM BƯU CỤC MỚI */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl relative overflow-hidden">
            <div className="p-6 border-b border-slate-150 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">
                Thêm bưu cục mới
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateHub} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="font-semibold leading-normal">{formError}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Tên bưu cục
                </label>
                <input
                  type="text"
                  required
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm placeholder:text-slate-400"
                  placeholder="Ví dụ: Bưu cục Cầu Giấy"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Địa chỉ chi tiết
                </label>
                <textarea
                  required
                  rows={3}
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm placeholder:text-slate-400 resize-none"
                  placeholder="Ví dụ: Số 15 Duy Tân, Dịch Vọng Hậu, Cầu Giấy, Hà Nội"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-255 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-blue-900/10 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {isSubmitLoading ? "Đang lưu..." : "Lưu lại"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CHỈNH SỬA THÔNG TIN BƯU CỤC */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl relative overflow-hidden">
            <div className="p-6 border-b border-slate-150 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">
                Chỉnh sửa bưu cục
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateHub} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="font-semibold leading-normal">{formError}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Tên bưu cục
                </label>
                <input
                  type="text"
                  required
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Địa chỉ chi tiết
                </label>
                <textarea
                  required
                  rows={3}
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm resize-none"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>

              {/* Toggle Trạng thái hoạt động */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="block text-sm font-semibold text-slate-800">
                    Trạng thái hoạt động
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    Mở/Đóng để bật/tắt hoạt động giao nhận đơn
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, is_active: !formData.is_active })
                  }
                  className="text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  {formData.is_active ? (
                    <ToggleRight className="w-12 h-12" />
                  ) : (
                    <ToggleLeft className="w-12 h-12 text-slate-400" />
                  )}
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-255 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-blue-900/10 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {isSubmitLoading ? "Đang cập nhật..." : "Cập nhật"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
