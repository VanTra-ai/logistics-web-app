"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Car,
  Plus,
  Search,
  Edit2,
  Trash2,
  ChevronDown,
  Bike,
  Truck,
  X,
  CheckCircle2,
  AlertCircle,
  Building2,
  User,
  Wrench,
} from "lucide-react";
import api from "@/lib/axios";
import Pagination from "@/components/Pagination";

interface Hub {
  id: string;
  name: string;
  hub_code?: string | null;
}

interface Shipper {
  id: string;
  full_name: string;
  phone_number: string;
  employee_code?: string | null;
  vehicle_number?: string | null;
  vehicle_type?: string | null;
  hub?: Hub | null;
}

interface Vehicle {
  id: string;
  license_plate: string;
  vehicle_type: string;
  capacity_weight: number;
  status: string;
  hub: Hub | null;
  assigned_shipper: Shipper | null;
  notes: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  ACTIVE: {
    label: "Sẵn sàng",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  ON_TRIP: {
    label: "Đang chạy",
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  MAINTENANCE: {
    label: "Bảo trì",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
};

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  BIKE: {
    label: "Xe máy",
    icon: <Bike className="w-4 h-4" />,
    color: "text-blue-600",
  },
  VAN: {
    label: "Xe bán tải",
    icon: <Car className="w-4 h-4" />,
    color: "text-purple-600",
  },
  TRUCK: {
    label: "Xe tải",
    icon: <Truck className="w-4 h-4" />,
    color: "text-orange-600",
  },
};

const emptyForm = {
  license_plate: "",
  vehicle_type: "BIKE",
  capacity_weight: 50,
  status: "ACTIVE",
  hub_id: "",
  assigned_shipper_id: "" as string | null,
  notes: "",
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [hubFilter, setHubFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 1, totalItems: 0 });
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [isSaving, setIsSaving] = useState(false);

  const showNotif = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (hubFilter) params.append("hub_id", hubFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (typeFilter) params.append("vehicle_type", typeFilter);
      if (search) params.append("search", search);
      params.append("page", page.toString());
      params.append("limit", "10");

      const [vRes, hRes, uRes] = await Promise.all([
        api.get(`/vehicles?${params.toString()}`),
        api.get("/hubs"),
        api.get("/users?role=SHIPPER&limit=200"),
      ]);
      setVehicles(vRes.data?.data || []);
      setMeta(vRes.data?.meta || { totalPages: 1, totalItems: 0 });
      const rawHubs = hRes.data?.data || [];
      setHubs(
        Array.isArray(rawHubs)
          ? rawHubs.filter(
              (h: { is_active?: boolean }) => h.is_active !== false,
            )
          : [],
      );
      setShippers(uRes.data?.data || []);
    } catch {
      showNotif("error", "Không thể tải dữ liệu phương tiện!");
    } finally {
      setIsLoading(false);
    }
  }, [hubFilter, statusFilter, typeFilter, search, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setIsModalOpen(true);
  };

  const openEdit = (v: Vehicle) => {
    setEditId(v.id);
    setForm({
      license_plate: v.license_plate,
      vehicle_type: v.vehicle_type,
      capacity_weight: v.capacity_weight,
      status: v.status,
      hub_id: v.hub?.id || "",
      assigned_shipper_id: v.assigned_shipper?.id || null,
      notes: v.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        license_plate: form.license_plate,
        vehicle_type: form.vehicle_type,
        capacity_weight: Number(form.capacity_weight),
        status: form.status,
        hub_id: form.hub_id || undefined,
        assigned_shipper_id: form.assigned_shipper_id || null,
        notes: form.notes || null,
      };

      if (editId) {
        await api.patch(`/vehicles/${editId}`, payload);
        showNotif("success", "Cập nhật phương tiện thành công!");
      } else {
        await api.post("/vehicles", payload);
        showNotif("success", "Tạo phương tiện thành công!");
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Lưu phương tiện thất bại!";
      showNotif("error", Array.isArray(message) ? message[0] : message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (v: Vehicle) => {
    if (
      !confirm(`Xóa xe ${v.license_plate}? Hành động này không thể hoàn tác.`)
    )
      return;
    try {
      await api.delete(`/vehicles/${v.id}`);
      showNotif("success", "Đã xóa phương tiện!");
      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Không thể xóa phương tiện!";
      showNotif("error", msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Car className="w-7 h-7 text-blue-600" />
            Quản lý Phương tiện
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Danh mục tài sản xe · {meta.totalItems} phương tiện
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Thêm phương tiện
        </button>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {notification.message}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            className="block w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl outline-none focus:border-blue-400 text-sm"
            placeholder="Tìm biển số xe..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="relative">
          <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            className="pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl outline-none text-sm appearance-none"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả loại xe</option>
            <option value="BIKE">Xe máy</option>
            <option value="VAN">Xe bán tải</option>
            <option value="TRUCK">Xe tải</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 border-[3px] border-slate-400 rounded-full" />
          <select
            className="pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl outline-none text-sm appearance-none"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            className="pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl outline-none text-sm appearance-none"
            value={hubFilter}
            onChange={(e) => {
              setHubFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả bưu cục</option>
            {hubs.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Car className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Chưa có phương tiện nào</p>
            <p className="text-sm mt-1">
              Thêm phương tiện hoặc điều chỉnh bộ lọc
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Biển số / Loại
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Tải trọng
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Bưu cục
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Tài xế gán
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {vehicles.map((v) => {
                const typeCfg = TYPE_CONFIG[v.vehicle_type] || TYPE_CONFIG.BIKE;
                const statusCfg =
                  STATUS_CONFIG[v.status] || STATUS_CONFIG.ACTIVE;
                return (
                  <tr
                    key={v.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={typeCfg.color}>{typeCfg.icon}</span>
                        <div>
                          <p className="font-mono font-bold text-slate-800">
                            {v.license_plate}
                          </p>
                          <p
                            className={`text-xs font-semibold ${typeCfg.color}`}
                          >
                            {typeCfg.label}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-semibold">
                      {v.capacity_weight}kg
                    </td>
                    <td className="px-4 py-3">
                      {v.hub ? (
                        <span className="text-slate-700">{v.hub.name}</span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">
                          Chưa gán kho
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {v.assigned_shipper ? (
                        <div>
                          <p className="font-semibold text-slate-700">
                            {v.assigned_shipper.full_name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {v.assigned_shipper.phone_number}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs">
                          Chưa gán tài xế
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${statusCfg.bg} ${statusCfg.text}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`}
                        />
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(v)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => void handleDelete(v)}
                          disabled={v.status === "ON_TRIP"}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && vehicles.length > 0 && (
        <Pagination
          currentPage={page}
          totalPages={meta.totalPages}
          totalItems={meta.totalItems}
          itemsPerPage={10}
          onPageChange={setPage}
        />
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[105] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={(e) => void handleSave(e)}>
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Car className="w-4 h-4 text-blue-600" />
                  {editId ? "Cập nhật phương tiện" : "Thêm phương tiện mới"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Biển số */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Biển số xe <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm font-mono font-bold tracking-wider"
                    placeholder="Ví dụ: 29C-123.45"
                    value={form.license_plate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        license_plate: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </div>

                {/* Loại xe */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Loại phương tiện
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["BIKE", "VAN", "TRUCK"] as const).map((t) => {
                      const cfg = TYPE_CONFIG[t];
                      return (
                        <label
                          key={t}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            form.vehicle_type === t
                              ? "border-blue-500 bg-blue-50"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="vtype"
                            className="hidden"
                            checked={form.vehicle_type === t}
                            onChange={() => {
                              const cap =
                                t === "BIKE" ? 50 : t === "VAN" ? 500 : 1000;
                              setForm({
                                ...form,
                                vehicle_type: t,
                                capacity_weight: cap,
                              });
                            }}
                          />
                          <span
                            className={
                              form.vehicle_type === t
                                ? "text-blue-600"
                                : "text-slate-400"
                            }
                          >
                            {cfg.icon}
                          </span>
                          <span
                            className={`text-xs font-bold ${
                              form.vehicle_type === t
                                ? "text-blue-800"
                                : "text-slate-600"
                            }`}
                          >
                            {cfg.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Tải trọng */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Tải trọng tối đa (kg)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm"
                    value={form.capacity_weight}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        capacity_weight: Number(e.target.value),
                      })
                    }
                  />
                </div>

                {/* Trạng thái */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Trạng thái
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["ACTIVE", "MAINTENANCE", "ON_TRIP"] as const).map(
                      (s) => {
                        const cfg = STATUS_CONFIG[s];
                        return (
                          <label
                            key={s}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all text-xs font-bold ${
                              form.status === s
                                ? `${cfg.bg} border-current ${cfg.text}`
                                : "border-slate-200 text-slate-500 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name="vstatus"
                              className="hidden"
                              checked={form.status === s}
                              onChange={() => setForm({ ...form, status: s })}
                            />
                            <div
                              className={`w-2 h-2 rounded-full ${cfg.dot}`}
                            />
                            {cfg.label}
                          </label>
                        );
                      },
                    )}
                  </div>
                </div>

                {/* Bưu cục */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    <Building2 className="inline w-3.5 h-3.5 mr-1" />
                    Bưu cục sở hữu
                  </label>
                  <select
                    className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl outline-none focus:border-blue-500 text-sm"
                    value={form.hub_id}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        hub_id: e.target.value,
                        assigned_shipper_id: null,
                      })
                    }
                  >
                    <option value="">-- Chưa gán bưu cục --</option>
                    {hubs.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tài xế */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    <User className="inline w-3.5 h-3.5 mr-1" />
                    Tài xế mặc định
                  </label>
                  <select
                    className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl outline-none focus:border-blue-500 text-sm disabled:bg-slate-100 disabled:opacity-50"
                    value={form.assigned_shipper_id || ""}
                    disabled={!form.hub_id}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        assigned_shipper_id: e.target.value || null,
                      })
                    }
                  >
                    <option value="">-- Chưa gán tài xế --</option>
                    {shippers
                      .filter((s) => s.hub?.id === form.hub_id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name} · {s.phone_number}
                        </option>
                      ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Khi gán tài xế, biển số xe sẽ tự động đồng bộ vào hồ sơ của
                    tài xế.
                  </p>
                </div>

                {/* Ghi chú */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    <Wrench className="inline w-3.5 h-3.5 mr-1" />
                    Ghi chú (tuỳ chọn)
                  </label>
                  <textarea
                    rows={2}
                    className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm resize-none"
                    placeholder="Ví dụ: Bảo dưỡng định kỳ tháng 8..."
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 p-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl cursor-pointer disabled:opacity-60"
                >
                  {isSaving
                    ? "Đang lưu..."
                    : editId
                      ? "Lưu thay đổi"
                      : "Thêm phương tiện"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
