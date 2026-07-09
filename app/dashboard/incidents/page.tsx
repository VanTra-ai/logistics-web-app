"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Package,
  User,
  Image as ImageIcon,
} from "lucide-react";

import { useEffect } from "react";
import api from "@/lib/axios";
import Pagination from "@/components/Pagination";

// Mock data replaced with real API
type IncidentStatus =
  | "PENDING"
  | "RESOLVED_REDELIVERY"
  | "RESOLVED_RETURN"
  | "RESOLVED_COMPENSATION"
  | "REJECTED";

interface Incident {
  id: string;
  created_at: string;
  order: { tracking_number: string };
  shipper?: { full_name: string };
  reason: string;
  description: string;
  proof_image_url: string;
  status: IncidentStatus;
}

export default function IncidentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null,
  );
  const [resolutionNotes, setResolutionNotes] = useState("");

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchIncidents = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(
          `/incidents?type=DELIVERY&page=${currentPage}&limit=${itemsPerPage}`
        );
        if (!isMounted) return;
        if (res.data?.meta) {
          setIncidents(res.data.data);
          setTotalPages(res.data.meta.totalPages);
          setTotalItems(res.data.meta.totalItems);
        } else {
          // Fallback if no meta
          const data = res.data?.data || res.data || [];
          setIncidents(Array.isArray(data) ? data : [data]);
          setTotalPages(1);
          setTotalItems(Array.isArray(data) ? data.length : 1);
        }
      } catch (err) {
        console.error("Failed to fetch incidents", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchIncidents();
    return () => {
      isMounted = false;
    };
  }, [currentPage]);

  const handleAction = (actionType: string) => {
    if (!selectedIncident) return;
    console.log(
      `Action: ${actionType} on incident ${selectedIncident.id} with notes: ${resolutionNotes}`,
    );
    // Real implementation would call API /incidents/:id/resolve
    setSelectedIncident(null);
    setResolutionNotes("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            Quản lý Sự cố & Ngoại lệ
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Theo dõi và xử lý các sự cố phát sinh trong quá trình giao nhận
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Tìm kiếm mã đơn, tên shipper..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-medium">
            <Filter className="w-4 h-4" />
            <span>Lọc</span>
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600 font-medium">
                <th className="py-4 px-6">Thời gian</th>
                <th className="py-4 px-6">Mã đơn hàng</th>
                <th className="py-4 px-6">Shipper</th>
                <th className="py-4 px-6">Lý do</th>
                <th className="py-4 px-6">Hình ảnh</th>
                <th className="py-4 px-6">Trạng thái</th>
                <th className="py-4 px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : incidents.length > 0 ? (
                incidents.map((incident) => (
                <tr
                  key={incident.id}
                  className="hover:bg-slate-50 transition-colors group cursor-pointer"
                  onClick={() => setSelectedIncident(incident)}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {new Date(incident.created_at).toLocaleString("vi-VN")}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 font-medium text-slate-900">
                      <Package className="w-4 h-4 text-blue-500" />
                      {incident.order?.tracking_number || "N/A"}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 text-slate-700">
                      <User className="w-4 h-4 text-slate-400" />
                      {incident.shipper?.full_name || "N/A"}
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
                      <span className="text-xs text-slate-400">Không có ảnh</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                        incident.status === "PENDING"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : incident.status === "REJECTED"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      {incident.status === "PENDING"
                        ? "Chờ xử lý"
                        : incident.status === "REJECTED"
                        ? "Từ chối"
                        : "Đã giải quyết"}
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
              ))
              ) : null}
              {!isLoading && incidents.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Không tìm thấy sự cố nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && totalPages > 1 && (
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

      {/* Modal / Drawer for Details */}
      {selectedIncident && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                Chi tiết sự cố{" "}
                <span className="text-slate-400 font-normal text-sm">
                  #{selectedIncident.id}
                </span>
              </h3>
              <button
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                onClick={() => {
                  setSelectedIncident(null);
                  setResolutionNotes("");
                }}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Thông tin chung
                    </label>
                    <div className="mt-2 space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-500 text-sm">
                          Mã đơn hàng
                        </span>
                        <span className="font-semibold text-slate-800">
                          {selectedIncident.order?.tracking_number}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-500 text-sm">Shipper</span>
                        <span className="font-medium text-slate-800">
                          {selectedIncident.shipper?.full_name}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-500 text-sm">
                          Thời gian báo cáo
                        </span>
                        <span className="text-slate-800">
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
                    <div className="mt-2 p-3 bg-red-50 text-red-800 rounded-lg text-sm border border-red-100">
                      {selectedIncident.reason}
                    </div>
                  </div>
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

              {/* Resolution Notes Input */}
              <div className="mt-6">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                  Ghi chú xử lý
                </label>
                <textarea
                  placeholder="Nhập ghi chú hoặc hướng giải quyết (bắt buộc đối với hoàn/đền bù)..."
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-h-[100px] resize-y"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                ></textarea>
              </div>
            </div>

            {/* Modal Footer (Actions) */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center gap-3 justify-end">
              <button
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm shadow-blue-600/20 flex items-center justify-center gap-2"
                onClick={() => handleAction("RETRY")}
              >
                <CheckCircle className="w-4 h-4" />
                Phê duyệt giao lại
              </button>

              <button
                className="w-full sm:w-auto px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium text-sm transition-colors shadow-sm shadow-orange-500/20 flex items-center justify-center gap-2"
                onClick={() => handleAction("RETURN")}
              >
                <AlertTriangle className="w-4 h-4" />
                Xác nhận hoàn hàng
              </button>

              <button
                className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm shadow-red-600/20 flex items-center justify-center gap-2"
                onClick={() => handleAction("COMPENSATE")}
              >
                <XCircle className="w-4 h-4" />
                Xác nhận đền bù / Hàng hỏng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
