"use client";

import { useState, useEffect } from "react";
import {
  AlertCircle,
  Search,
  X,
  CheckCircle2,
  RefreshCw,
  MapPin,
  Camera,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";
import api from "@/lib/axios";
import axios from "axios";

interface Hub {
  id: string;
  name: string;
}

interface Order {
  id: string;
  tracking_number: string;
  sender_name: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  weight: number;
  cod_amount: number;
  current_status: string;
  created_at: string;
  pickup_hub: Hub;
  note?: string;
  delivery_image_url?: string;
}

export default function ExceptionsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Notifications & Modal states
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    issueType: "MÓP_MÉO",
    description: "",
    incident_image_url: "",
  });
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  const fetchOrders = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    else setIsLoading(true);
    setNotification(null);

    // Get current user hub to filter
    let currentHubId = "";
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          currentHubId = parsed.hub?.id || "";
        } catch {
          // Do nothing
        }
      }
    }

    try {
      const response = await api.get("/orders");
      const data = response.data?.data || response.data || [];

      if (Array.isArray(data)) {
        // Filter orders that belong to the coordinator's hub or are active
        const hubOrders = currentHubId
          ? data.filter((o: Order) => o.pickup_hub?.id === currentHubId)
          : data;
        setOrders(hubOrders);
        setIsDemoMode(false);
      } else {
        throw new Error("Dữ liệu đơn hàng không đúng định dạng");
      }
    } catch (error) {
      console.warn("Không kết nối được backend.", error);
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        setNotification({
          type: "error",
          message: "Bạn không có quyền truy cập thông tin xử lý ngoại lệ",
        });
      }
      setOrders([]);
      setIsDemoMode(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.receiver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.receiver_phone.includes(searchTerm);

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "EXCEPTION" && o.current_status === "EXCEPTION") ||
      (statusFilter === "NORMAL" && o.current_status !== "EXCEPTION");

    return matchesSearch && matchesStatus;
  });

  // Mở modal báo lỗi nhanh
  const openReportModal = (order: Order) => {
    setSelectedOrder(order);
    setFormData({
      issueType: "MÓP_MÉO",
      description: "",
      incident_image_url: "",
    });
    setIsReportModalOpen(true);
  };

  // Nộp báo cáo sự cố (PATCH /orders/:id/status)
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    if (!formData.description.trim()) {
      alert("Vui lòng mô tả chi tiết sự cố!");
      return;
    }

    setIsSubmitLoading(true);
    const incidentUrl =
      formData.incident_image_url.trim() ||
      "https://images.unsplash.com/photo-1595246140625-573b715d11dc?w=400"; // Mock image url
    const issueText = `[SỰ CỐ - ${formData.issueType}]: ${formData.description}`;

    if (isDemoMode) {
      setOrders(
        orders.map((o) =>
          o.id === selectedOrder.id
            ? {
                ...o,
                current_status: "EXCEPTION",
                note: issueText,
                delivery_image_url: incidentUrl,
              }
            : o,
        ),
      );
      setIsReportModalOpen(false);
      setNotification({
        type: "success",
        message: `Đã báo lỗi sự cố đơn hàng ${selectedOrder.tracking_number} thành công (Demo Mode)!`,
      });
      setIsSubmitLoading(false);
      return;
    }

    try {
      await api.patch(`/orders/${selectedOrder.id}/status`, {
        status: "EXCEPTION",
        note: issueText,
        incident_image_url: incidentUrl,
      });
      await fetchOrders();
      setIsReportModalOpen(false);
      setNotification({
        type: "success",
        message: `Báo cáo sự cố đơn hàng ${selectedOrder.tracking_number} thành công!`,
      });
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setNotification({
        type: "error",
        message: apiError.response?.data?.message || "Lỗi báo cáo sự cố!",
      });
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // Cho phép giải tỏa đơn hàng khi đã xử lý sự cố xong
  const handleResolveException = async (order: Order) => {
    const confirmResolve = window.confirm(
      `Xác nhận sự cố đơn hàng "${order.tracking_number}" đã được xử lý xong? Đơn hàng sẽ được chuyển lại về trạng thái AT_HUB để tiếp tục đi giao.`,
    );
    if (!confirmResolve) return;

    if (isDemoMode) {
      setOrders(
        orders.map((o) =>
          o.id === order.id ? { ...o, current_status: "AT_HUB" } : o,
        ),
      );
      setNotification({
        type: "success",
        message: `Đã giải tỏa đơn hàng ${order.tracking_number} thành công (Demo Mode)!`,
      });
      return;
    }

    try {
      await api.patch(`/orders/${order.id}/status`, {
        status: "AT_HUB",
        note: "Đã xử lý sự cố móp méo/rách tem. Cho phép thông quan đi tiếp.",
      });
      await fetchOrders();
      setNotification({
        type: "success",
        message: `Giải tỏa đơn hàng ${order.tracking_number} thành công!`,
      });
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setNotification({
        type: "error",
        message: apiError.response?.data?.message || "Lỗi giải tỏa đơn hàng!",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "EXCEPTION") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
          <AlertTriangle className="w-3 h-3" />
          Sự cố/Tạm giữ
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-150">
        Khả dụng
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Demo Warning */}
      {isDemoMode && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-start gap-3 shadow-sm text-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">
              Đang chạy ở chế độ giả lập (Demo Mode):
            </span>{" "}
            Kết nối cơ sở dữ liệu lỗi sự cố bưu cục được mô phỏng trên Client.
            Bạn có thể báo cáo hư hỏng hoặc mở khóa giải tỏa đơn bình thường.
          </div>
        </div>
      )}

      {/* Floating Notification */}
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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Báo Cáo Sự Cố & Xử Lý Ngoại Lệ (Exceptions)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Giam giữ hàng hóa móp méo, hư hỏng, thiếu tem mác tại bưu cục và
              báo cáo bộ phận xử lý
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchOrders(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl border border-slate-250 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Làm mới
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-2xl">
        {/* Search box */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-4 py-2.5 bg-white border border-slate-250 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
            placeholder="Tìm mã đơn hàng, tên hoặc SĐT người nhận..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {/* Status selector */}
        <select
          className="px-3 py-2.5 bg-white border border-slate-255 text-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">Tất cả kiện hàng tại bưu cục</option>
          <option value="EXCEPTION">Hàng lỗi sự cố / Tạm giữ</option>
          <option value="NORMAL">Hàng bình thường khả dụng</option>
        </select>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 text-sm font-medium">
              Đang tải danh sách hàng hóa...
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 text-slate-400">
              <ClipboardList className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Không tìm thấy kiện hàng nào
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Vui lòng kiểm tra lại từ khóa tìm kiếm hoặc bộ lọc trạng thái.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-150 bg-slate-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Mã đơn hàng</th>
                  <th className="px-6 py-4">Khách nhận & Địa chỉ</th>
                  <th className="px-6 py-4">Thông số</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4">Chi tiết sự cố</th>
                  <th className="px-6 py-4 text-right">Xử lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-sm">
                {filteredOrders.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/30 transition-colors ${item.current_status === "EXCEPTION" ? "bg-red-50/10" : ""}`}
                  >
                    {/* Column 1: Tracking code */}
                    <td className="px-6 py-4 font-semibold text-slate-900 font-mono text-xs">
                      {item.tracking_number}
                    </td>

                    {/* Column 2: Receiver Info */}
                    <td className="px-6 py-4 space-y-1">
                      <div>
                        <span className="font-semibold text-slate-800 mr-2">
                          {item.receiver_name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          SĐT: {item.receiver_phone}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-650 max-w-xs truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span
                          className="truncate"
                          title={item.receiver_address}
                        >
                          {item.receiver_address}
                        </span>
                      </div>
                    </td>

                    {/* Column 3: Metrics */}
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                      <div>Trọng lượng: {item.weight}kg</div>
                      <div className="text-[10px] text-slate-400">
                        COD: {item.cod_amount?.toLocaleString()}đ
                      </div>
                    </td>

                    {/* Column 4: Status badge */}
                    <td className="px-6 py-4">
                      {getStatusBadge(item.current_status)}
                    </td>

                    {/* Column 5: Incident description */}
                    <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                      {item.current_status === "EXCEPTION" ? (
                        <div className="space-y-1">
                          <span className="text-red-700 font-bold block">
                            {item.note}
                          </span>
                          {item.delivery_image_url && (
                            <a
                              href={item.delivery_image_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Camera className="w-3 h-3" /> Xem ảnh chụp hiện
                              trường
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">
                          Không có sự cố
                        </span>
                      )}
                    </td>

                    {/* Column 6: Actions */}
                    <td className="px-6 py-4 text-right">
                      {item.current_status === "EXCEPTION" ? (
                        <button
                          onClick={() => handleResolveException(item)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                          title="Giải tỏa đơn hàng"
                        >
                          Giải tỏa đơn
                        </button>
                      ) : (
                        <button
                          onClick={() => openReportModal(item)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                          title="Báo cáo hỏng hóc/sự cố"
                        >
                          Báo lỗi nhanh
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

      {/* REPORT EXCEPTION MODAL */}
      {isReportModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl relative overflow-hidden">
            <div className="p-6 border-b border-slate-150 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Báo cáo sự cố đơn {selectedOrder.tracking_number}
                </h2>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Đơn hàng sẽ chuyển sang trạng thái tạm giữ chờ xử lý sự cố
                </p>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="p-6 space-y-4">
              {/* Loại sự cố */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Loại sự cố phát sinh
                </label>
                <select
                  className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-250 text-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium"
                  value={formData.issueType}
                  onChange={(e) =>
                    setFormData({ ...formData, issueType: e.target.value })
                  }
                >
                  <option value="MÓP_MÉO">Kiện hàng móp méo, biến dạng</option>
                  <option value="RÁCH_TEM">
                    Rách tem mác, không quét được mã
                  </option>
                  <option value="THIẾU_HÀNG">
                    Bị rò rỉ, thiếu hụt khối lượng/linh kiện
                  </option>
                  <option value="SAI_ĐỊA_CHỈ">
                    Sai sót thông tin địa chỉ/người nhận
                  </option>
                </select>
              </div>

              {/* Mô tả chi tiết */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Mô tả tình trạng chi tiết
                </label>
                <textarea
                  required
                  rows={3}
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm resize-none placeholder:text-slate-405"
                  placeholder="Ví dụ: Vỏ hộp các-tông bị rách góc, rò rỉ chất lỏng nhẹ bên trong, cân nặng thực tế hụt 0.3kg."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              {/* Đường dẫn ảnh minh họa */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-slate-400" /> Đường dẫn
                  ảnh sự cố (Giả lập)
                </label>
                <input
                  type="text"
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm placeholder:text-slate-400"
                  placeholder="Để trống để tự động lấy ảnh giả lập..."
                  value={formData.incident_image_url}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      incident_image_url: e.target.value,
                    })
                  }
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-255 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {isSubmitLoading ? "Đang báo cáo..." : "Chốt báo lỗi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
