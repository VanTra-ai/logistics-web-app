"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Package,
  Image as ImageIcon,
  Clock,
  RefreshCw,
} from "lucide-react";

import api from "@/lib/axios";
import Pagination from "@/components/Pagination";

// Types
type IncidentStatus =
  | "PENDING"
  | "RESOLVED_REDELIVERY"
  | "RESOLVED_RETURN"
  | "RESOLVED_COMPENSATION"
  | "REJECTED";

interface Incident {
  id: string;
  created_at: string;
  order: {
    tracking_number: string;
    pickup_hub?: { id: string; name: string };
  };
  shipper?: { full_name: string; phone_number?: string };
  resolvedBy?: { full_name: string };
  reason: string;
  description: string;
  proof_image_url: string;
  status: IncidentStatus;
  resolution_notes?: string;
}

export default function MyIncidentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null,
  );
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;
  const [isLoading, setIsLoading] = useState(false);

  const fetchMyIncidents = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        type: "DELIVERY",
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });
      if (searchTerm.trim()) {
        queryParams.append("search", searchTerm.trim());
      }

      const res = await api.get(`/incidents/my?${queryParams.toString()}`);
      if (res.data?.meta) {
        setIncidents(res.data.data);
        setTotalPages(res.data.meta.totalPages);
        setTotalItems(res.data.meta.totalItems);
      } else {
        const data = res.data?.data || res.data || [];
        setIncidents(Array.isArray(data) ? data : [data]);
        setTotalPages(1);
        setTotalItems(Array.isArray(data) ? data.length : 1);
      }
    } catch {
      // Fallback: try general incidents endpoint filtered by shipper
      try {
        const queryParams = new URLSearchParams({
          type: "DELIVERY",
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
        });
        if (searchTerm.trim()) {
          queryParams.append("search", searchTerm.trim());
        }
        const res = await api.get(`/incidents?${queryParams.toString()}`);
        if (res.data?.meta) {
          setIncidents(res.data.data);
          setTotalPages(res.data.meta.totalPages);
          setTotalItems(res.data.meta.totalItems);
        } else {
          const data = res.data?.data || res.data || [];
          setIncidents(Array.isArray(data) ? data : []);
          setTotalPages(1);
          setTotalItems(Array.isArray(data) ? data.length : 0);
        }
      } catch (err2) {
        console.error("Failed to fetch incidents", err2);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchMyIncidents();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchMyIncidents]);

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case "PENDING":
        return {
          label: "Chờ xét duyệt",
          class: "bg-amber-50 text-amber-700 border-amber-200",
          icon: Clock,
        };
      case "RESOLVED_REDELIVERY":
        return {
          label: "Đã duyệt: Giao lại",
          class: "bg-blue-50 text-blue-700 border-blue-200",
          icon: CheckCircle,
        };
      case "RESOLVED_RETURN":
        return {
          label: "Đã duyệt: Hoàn hàng",
          class: "bg-orange-50 text-orange-700 border-orange-200",
          icon: CheckCircle,
        };
      case "RESOLVED_COMPENSATION":
        return {
          label: "Đã duyệt: Đền bù",
          class: "bg-purple-50 text-purple-700 border-purple-200",
          icon: CheckCircle,
        };
      case "REJECTED":
        return {
          label: "Bị từ chối",
          class: "bg-red-50 text-red-700 border-red-200",
          icon: XCircle,
        };
      default:
        return {
          label: "Đã giải quyết",
          class: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: CheckCircle,
        };
    }
  };

  // Stats
  const pendingCount = incidents.filter((i) => i.status === "PENDING").length;
  const resolvedCount = incidents.filter(
    (i) =>
      i.status !== "PENDING" &&
      i.status !== "REJECTED",
  ).length;
  const rejectedCount = incidents.filter((i) => i.status === "REJECTED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            Sự cố đơn hàng của tôi
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Theo dõi trạng thái xét duyệt các sự cố bạn đã báo cáo
          </p>
        </div>
        <button
          onClick={() => void fetchMyIncidents()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">
                Chờ xét duyệt
              </p>
              <p className="text-2xl font-bold text-amber-600 mt-0.5">
                {pendingCount}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">
                Đã được duyệt
              </p>
              <p className="text-2xl font-bold text-emerald-600 mt-0.5">
                {resolvedCount}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Bị từ chối</p>
              <p className="text-2xl font-bold text-red-600 mt-0.5">
                {rejectedCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Tìm theo mã vận đơn, lý do sự cố..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Information Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold">Lưu ý về quy trình xét duyệt sự cố</p>
          <p className="mt-1 text-blue-700 text-xs">
            Sau khi bạn báo cáo sự cố, bưu cục sẽ xem xét và xét duyệt trong
            vòng 1-3 ngày làm việc. Bạn sẽ nhận được thông báo khi sự cố được
            xử lý. Các phương án giải quyết gồm: Giao lại, Hoàn hàng, hoặc Đền
            bù.
          </p>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600 font-medium">
                <th className="py-4 px-6">Thời gian báo cáo</th>
                <th className="py-4 px-6">Mã đơn hàng</th>
                <th className="py-4 px-6">Lý do sự cố</th>
                <th className="py-4 px-6">Hình ảnh</th>
                <th className="py-4 px-6">Trạng thái xét duyệt</th>
                <th className="py-4 px-6 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : incidents.length > 0 ? (
                incidents.map((incident) => {
                  const badge = getStatusBadge(incident.status);
                  const BadgeIcon = badge.icon;
                  return (
                    <tr
                      key={incident.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedIncident(incident)}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {new Date(incident.created_at).toLocaleString(
                            "vi-VN",
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 font-medium text-slate-900">
                          <Package className="w-4 h-4 text-blue-500" />
                          {incident.order?.tracking_number || "N/A"}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-slate-700 line-clamp-1">
                          {incident.reason}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {incident.proof_image_url ? (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={
                                incident.proof_image_url.startsWith("http")
                                  ? incident.proof_image_url
                                  : `${process.env.NEXT_PUBLIC_API_URL}${incident.proof_image_url}`
                              }
                              alt="Hình ảnh sự cố"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Không có ảnh
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badge.class}`}
                        >
                          <BadgeIcon className="w-3.5 h-3.5" />
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIncident(incident);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : null}
              {!isLoading && incidents.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium text-sm">
                      Bạn chưa có sự cố nào được ghi nhận.
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                      Báo cáo sự cố thông qua ứng dụng di động khi gặp vấn đề
                      trong quá trình giao hàng.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && totalItems > 0 && (
          <div className="p-4 border-t border-slate-200">
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

      {/* Detail Modal (Read-only for shippers) */}
      {selectedIncident && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                Chi tiết sự cố{" "}
                <span className="text-slate-400 font-normal text-sm">
                  #{selectedIncident.id.slice(0, 8)}
                </span>
              </h3>
              <button
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                onClick={() => setSelectedIncident(null)}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Status Banner */}
              <div
                className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                  selectedIncident.status === "PENDING"
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : selectedIncident.status === "REJECTED"
                      ? "bg-red-50 border-red-200 text-red-800"
                      : "bg-emerald-50 border-emerald-200 text-emerald-800"
                }`}
              >
                {selectedIncident.status === "PENDING" ? (
                  <Clock className="w-5 h-5 shrink-0" />
                ) : selectedIncident.status === "REJECTED" ? (
                  <XCircle className="w-5 h-5 shrink-0" />
                ) : (
                  <CheckCircle className="w-5 h-5 shrink-0" />
                )}
                <div>
                  <p className="font-semibold text-sm">
                    {getStatusBadge(selectedIncident.status).label}
                  </p>
                  {selectedIncident.resolvedBy?.full_name && (
                    <p className="text-xs opacity-70 mt-0.5">
                      Xử lý bởi: {selectedIncident.resolvedBy.full_name}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Thông tin sự cố
                    </label>
                    <div className="mt-2 space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-500 text-sm">Mã đơn</span>
                        <span className="font-semibold text-slate-800">
                          {selectedIncident.order?.tracking_number}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-500 text-sm">Bưu cục</span>
                        <span className="font-medium text-slate-800">
                          {selectedIncident.order?.pickup_hub?.name || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-500 text-sm">
                          Thời gian báo cáo
                        </span>
                        <span className="text-slate-800 text-xs">
                          {new Date(selectedIncident.created_at).toLocaleString(
                            "vi-VN",
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Lý do báo cáo
                    </label>
                    <div className="mt-2 p-3 bg-red-50 text-red-800 rounded-lg text-sm border border-red-100 font-medium">
                      {selectedIncident.reason}
                    </div>
                  </div>

                  {selectedIncident.description && (
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Mô tả chi tiết
                      </label>
                      <div className="mt-2 p-3 bg-slate-50 text-slate-700 rounded-lg text-sm border border-slate-100">
                        {selectedIncident.description}
                      </div>
                    </div>
                  )}
                </div>

                {/* Evidence Image */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                    Hình ảnh đính kèm
                  </label>
                  {selectedIncident.proof_image_url ? (
                    <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 aspect-video flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          selectedIncident.proof_image_url.startsWith("http")
                            ? selectedIncident.proof_image_url
                            : `${process.env.NEXT_PUBLIC_API_URL}${selectedIncident.proof_image_url}`
                        }
                        alt="Minh chứng"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 aspect-video flex flex-col items-center justify-center text-slate-400">
                      <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                      <span className="text-sm">Không có hình ảnh</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Resolution Notes (read-only) */}
              {selectedIncident.resolution_notes && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                    Ghi chú xử lý từ bưu cục
                  </label>
                  <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800">
                    {selectedIncident.resolution_notes}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-sm transition-colors cursor-pointer"
                onClick={() => setSelectedIncident(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
