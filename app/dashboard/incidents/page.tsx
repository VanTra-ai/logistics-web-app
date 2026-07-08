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

// Mock data
type IncidentStatus = "PENDING" | "RESOLVED" | "REJECTED";

interface Incident {
  id: string;
  time: string;
  orderCode: string;
  shipperName: string;
  reason: string;
  imageUrl: string;
  status: IncidentStatus;
}

const mockIncidents: Incident[] = [
  {
    id: "INC-001",
    time: "2026-07-08 10:30",
    orderCode: "ORD-982374",
    shipperName: "Nguyễn Văn A",
    reason: "Khách hàng không nghe máy (Gọi 3 lần)",
    imageUrl: "https://via.placeholder.com/150",
    status: "PENDING",
  },
  {
    id: "INC-002",
    time: "2026-07-08 09:15",
    orderCode: "ORD-982375",
    shipperName: "Trần Thị B",
    reason: "Hàng bị móp méo trong quá trình vận chuyển",
    imageUrl: "https://via.placeholder.com/150",
    status: "PENDING",
  },
  {
    id: "INC-003",
    time: "2026-07-07 16:45",
    orderCode: "ORD-982376",
    shipperName: "Lê Văn C",
    reason: "Sai địa chỉ giao hàng",
    imageUrl: "https://via.placeholder.com/150",
    status: "PENDING",
  },
];

export default function IncidentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null,
  );
  const [resolutionNotes, setResolutionNotes] = useState("");

  const handleAction = (actionType: string) => {
    if (!selectedIncident) return;
    console.log(
      `Action: ${actionType} on incident ${selectedIncident.id} with notes: ${resolutionNotes}`,
    );
    // Handle action here...
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
              {mockIncidents.map((incident) => (
                <tr
                  key={incident.id}
                  className="hover:bg-slate-50 transition-colors group cursor-pointer"
                  onClick={() => setSelectedIncident(incident)}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {incident.time}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 font-medium text-slate-900">
                      <Package className="w-4 h-4 text-blue-500" />
                      {incident.orderCode}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 text-slate-700">
                      <User className="w-4 h-4 text-slate-400" />
                      {incident.shipperName}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-slate-700 line-clamp-1">
                      {incident.reason}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={incident.imageUrl}
                        alt="Hình ảnh sự cố"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Chờ xử lý
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
              ))}
              {mockIncidents.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Không tìm thấy sự cố nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
                          {selectedIncident.orderCode}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-500 text-sm">Shipper</span>
                        <span className="font-medium text-slate-800">
                          {selectedIncident.shipperName}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-500 text-sm">
                          Thời gian
                        </span>
                        <span className="text-slate-700">
                          {selectedIncident.time}
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
                    Hình ảnh xác thực
                  </label>
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-video flex items-center justify-center group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedIncident.imageUrl}
                      alt="Xác thực"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <button className="bg-white/90 backdrop-blur text-slate-800 p-2 rounded-lg shadow-sm font-medium text-sm flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" /> Xem ảnh lớn
                      </button>
                    </div>
                  </div>
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
