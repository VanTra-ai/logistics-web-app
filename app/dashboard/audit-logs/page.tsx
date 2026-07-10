"use client";

import { useState, useEffect } from "react";
import { X, ArrowRight, Eye, RefreshCw } from "lucide-react";
import api from "@/lib/axios";
import Pagination from "@/components/Pagination";

// Interface
interface AuditLog {
  id: string;
  action: string;
  entityName: string;
  entityId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  userId: string;
  user?: { full_name: string; email: string } | null;
  createdAt: string;
}

// Helper to render Action Badges
const ActionBadge = ({ action }: { action: string }) => {
  switch (action) {
    case "INSERT":
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
          INSERT
        </span>
      );
    case "UPDATE":
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 border border-blue-200">
          UPDATE
        </span>
      );
    case "DELETE":
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700 border border-red-200">
          DELETE
        </span>
      );
    default:
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          {action}
        </span>
      );
  }
};

// Modal Component for Diff Viewer
const DiffViewerModal = ({
  isOpen,
  onClose,
  log,
}: {
  isOpen: boolean;
  onClose: () => void;
  log: AuditLog | null;
}) => {
  if (!isOpen || !log) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Chi tiết thay đổi
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Bản ghi: <span className="font-semibold">{log.entityName}</span> (
              {log.entityId})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Old Values */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 font-semibold text-slate-700 text-sm">
                Dữ liệu cũ
              </div>
              <div className="p-4 overflow-x-auto">
                {log.oldValues ? (
                  <pre className="text-sm text-slate-600 font-mono">
                    {JSON.stringify(log.oldValues, null, 2)}
                  </pre>
                ) : (
                  <div className="text-sm text-slate-400 italic py-4 text-center">
                    Không có (Bản ghi mới tạo)
                  </div>
                )}
              </div>
            </div>

            {/* New Values */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 font-semibold text-blue-800 text-sm flex items-center gap-2">
                <ArrowRight className="w-4 h-4" />
                Dữ liệu mới
              </div>
              <div className="p-4 overflow-x-auto">
                {log.newValues ? (
                  <pre className="text-sm text-slate-600 font-mono">
                    {JSON.stringify(log.newValues, null, 2)}
                  </pre>
                ) : (
                  <div className="text-sm text-slate-400 italic py-4 text-center">
                    Không có (Bản ghi đã xóa)
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [actionFilter, setActionFilter] = useState("ALL");
  const [searchUser, setSearchUser] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  const fetchLogs = async (page = 1, isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        action: actionFilter,
        searchUser: searchUser,
        startDate: startDate,
        endDate: endDate,
      });
      const res = await api.get(`/audit-logs?${queryParams.toString()}`);
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data)) setLogs(data);

      const meta = res.data?.meta;
      if (meta) {
        setTotalPages(meta.totalPages);
        setTotalItems(meta.totalItems);
      }
    } catch (error) {
      console.warn("Failed to fetch audit logs", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        fetchLogs(1);
      } else {
        setCurrentPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter, searchUser, startDate, endDate]);

  useEffect(() => {
    const timer = setTimeout(() => fetchLogs(currentPage), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const handleViewDiff = (log: AuditLog) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedLog(null), 200); // clear after animation
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Nhật ký Hệ thống
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi mọi thay đổi dữ liệu trong hệ thống (Audit Logs)
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-500 font-medium">
            Tổng số:{" "}
            <span className="font-bold text-slate-800">{totalItems}</span>
          </div>
          <button
            onClick={() => fetchLogs(currentPage, true)}
            disabled={isRefreshing}
            className="p-2 bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Làm mới"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
          <input
            type="text"
            placeholder="Tìm người thao tác..."
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-full sm:max-w-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
          />
          <select
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="ALL">Tất cả hành động</option>
            <option value="INSERT">INSERT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Thời gian</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Hành động</th>
                <th className="px-6 py-4">Bảng dữ liệu</th>
                <th className="px-6 py-4">ID bản ghi</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-slate-500 text-sm">
                        Đang tải nhật ký...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    Không có nhật ký nào.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-6 py-4">
                      {new Date(log.createdAt).toLocaleString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {log.user ? (
                        <div>
                          <div className="text-slate-800">
                            {log.user.full_name}
                          </div>
                          <div className="text-xs text-slate-500 font-normal">
                            {log.user.email}
                          </div>
                        </div>
                      ) : log.userId ? (
                        <div className="text-slate-400 italic text-xs">
                          ID: {log.userId}
                        </div>
                      ) : (
                        <div className="text-slate-400 italic text-xs">
                          Hệ thống
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs px-2 py-1 bg-slate-100 rounded text-slate-600">
                        {log.entityName}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {log.entityId}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleViewDiff(log)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium rounded-lg transition-colors text-xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Xem Diff
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && logs.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      <DiffViewerModal
        isOpen={isModalOpen}
        onClose={closeModal}
        log={selectedLog}
      />
    </div>
  );
}
