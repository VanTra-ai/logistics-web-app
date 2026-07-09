"use client";

import { useState, useEffect, useCallback } from "react";
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

import Pagination from "@/components/Pagination";

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

type IncidentStatus =
  | "PENDING"
  | "RESOLVED_REDELIVERY"
  | "RESOLVED_RETURN"
  | "RESOLVED_COMPENSATION"
  | "REJECTED";

interface Incident {
  id: string;
  created_at: string;
  order: Order;
  shipper?: { full_name: string };
  reason: string;
  description: string;
  proof_image_url: string;
  status: IncidentStatus;
}

export default function ExceptionsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  // Notifications & Modal states
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const fetchIncidents = useCallback(
    async (showRefreshIndicator = false) => {
      if (showRefreshIndicator) setIsRefreshing(true);
      else setIsLoading(true);
      setNotification(null);

      try {
        const response = await api.get(
          `/incidents?type=WAREHOUSE&page=${currentPage}&limit=${itemsPerPage}`,
        );
        if (response.data?.meta) {
          setIncidents(response.data.data);
          setTotalPages(response.data.meta.totalPages);
          setTotalItems(response.data.meta.totalItems);
        } else {
          const data = response.data?.data || response.data || [];
          setIncidents(Array.isArray(data) ? data : [data]);
          setTotalPages(1);
          setTotalItems(Array.isArray(data) ? data.length : 1);
        }
      } catch (error) {
        console.warn("Không kết nối được backend.", error);
        if (axios.isAxiosError(error) && error.response?.status === 403) {
          setNotification({
            type: "error",
            message: "Bạn không có quyền truy cập thông tin xử lý ngoại lệ",
          });
        }
        setIncidents([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentPage],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIncidents();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchIncidents]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const filteredIncidents = incidents.filter((incident) => {
    const o = incident.order;
    if (!o) return false;
    const matchesSearch =
      o.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.receiver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.receiver_phone.includes(searchTerm);

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "PENDING" && incident.status === "PENDING") ||
      (statusFilter === "RESOLVED" && incident.status !== "PENDING");

    return matchesSearch && matchesStatus;
  });

  // Cho phép giải tỏa đơn hàng khi đã xử lý sự cố xong
  const handleResolveException = async (incident: Incident) => {
    const order = incident.order;
    const confirmResolve = window.confirm(
      `Xác nhận sự cố đơn hàng "${order?.tracking_number}" đã được xử lý xong? Đơn hàng sẽ được chuyển lại về trạng thái AT_HUB để tiếp tục đi giao.`,
    );
    if (!confirmResolve) return;

    try {
      await api.patch(`/incidents/${incident.id}/resolve`, {
        action: "REDELIVERY",
        resolution_notes: "Đã xử lý sự cố móp méo/rách tem tại kho.",
      });
      await fetchIncidents();
      setNotification({
        type: "success",
        message: `Giải tỏa đơn hàng ${order?.tracking_number} thành công!`,
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
    if (status === "FAILED") {
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
          onClick={() => fetchIncidents(true)}
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
          <option value="PENDING">Chờ xử lý</option>
          <option value="RESOLVED">Đã giải quyết</option>
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
        ) : filteredIncidents.length === 0 ? (
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
                {filteredIncidents.map((incident) => (
                  <tr
                    key={incident.id}
                    className={`hover:bg-slate-50/30 transition-colors ${incident.status === "PENDING" ? "bg-red-50/10" : ""}`}
                  >
                    {/* Column 1: Tracking code */}
                    <td className="px-6 py-4 font-semibold text-slate-900 font-mono text-xs">
                      {incident.order?.tracking_number}
                    </td>

                    {/* Column 2: Receiver Info */}
                    <td className="px-6 py-4 space-y-1">
                      <div>
                        <span className="font-semibold text-slate-800 mr-2">
                          {incident.order?.receiver_name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          SĐT: {incident.order?.receiver_phone}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-650 max-w-xs truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span
                          className="truncate"
                          title={incident.order?.receiver_address}
                        >
                          {incident.order?.receiver_address}
                        </span>
                      </div>
                    </td>

                    {/* Column 3: Metrics */}
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                      <div>Trọng lượng: {incident.order?.weight}kg</div>
                      <div className="text-[10px] text-slate-400">
                        COD: {incident.order?.cod_amount?.toLocaleString()}đ
                      </div>
                    </td>

                    {/* Column 4: Status badge */}
                    <td className="px-6 py-4">
                      {getStatusBadge(
                        incident.status === "PENDING" ? "FAILED" : "NORMAL",
                      )}
                    </td>

                    {/* Column 5: Incident description */}
                    <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                      {incident.status === "PENDING" ||
                      incident.status.startsWith("RESOLVED") ? (
                        <div className="space-y-1">
                          <span className="text-red-700 font-bold block">
                            {incident.description || incident.reason}
                          </span>
                          {incident.proof_image_url && (
                            <a
                              href={
                                incident.proof_image_url.startsWith("http")
                                  ? incident.proof_image_url
                                  : `${process.env.NEXT_PUBLIC_API_URL}${incident.proof_image_url}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Camera className="w-3 h-3" /> Xem ảnh minh chứng
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
                      {incident.status === "PENDING" ? (
                        <button
                          onClick={() => handleResolveException(incident)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                          title="Giải tỏa đơn hàng"
                        >
                          Giải tỏa đơn
                        </button>
                      ) : (
                        <span className="text-emerald-600 text-xs font-semibold">
                          Đã giải quyết
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {!isLoading && totalPages > 1 && (
        <div className="flex justify-end pt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
