"use client";

import { useState } from "react";
import { X, ArrowRight, Eye } from "lucide-react";

// Mock Data
const mockAuditLogs = [
  {
    id: "1",
    action: "UPDATE",
    entityName: "Order",
    entityId: "ORD-123",
    oldValues: { status: "PENDING", weight: 2.5 },
    newValues: { status: "DISPATCHED", weight: 2.5 },
    userId: "U-1",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "2",
    action: "CREATE",
    entityName: "Hub",
    entityId: "HUB-HN-01",
    oldValues: null,
    newValues: { name: "Hà Nội Main Hub", capacity: 5000, isActive: true },
    userId: "U-2",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "3",
    action: "DELETE",
    entityName: "User",
    entityId: "U-999",
    oldValues: { role: "SHIPPER", isActive: false },
    newValues: null,
    userId: "U-1",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

// Helper to render Action Badges
const ActionBadge = ({ action }: { action: string }) => {
  switch (action) {
    case "CREATE":
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
          CREATE
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
  log: (typeof mockAuditLogs)[0] | null;
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
  const [selectedLog, setSelectedLog] = useState<
    (typeof mockAuditLogs)[0] | null
  >(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleViewDiff = (log: (typeof mockAuditLogs)[0]) => {
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
              {mockAuditLogs.map((log) => (
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
                  <td className="px-6 py-4 font-medium">{log.userId}</td>
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
              ))}
              {mockAuditLogs.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    Không có nhật ký nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DiffViewerModal
        isOpen={isModalOpen}
        onClose={closeModal}
        log={selectedLog}
      />
    </div>
  );
}
