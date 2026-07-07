"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MapPin,
  Search,
  Plus,
  Trash2,
  BoxSelect,
  Boxes,
  AlertCircle,
  Inbox,
} from "lucide-react";
import api from "@/lib/axios";

interface Location {
  id: string;
  zone: string;
  aisle: string;
  shelf: string;
  bin: string;
  barcode: string;
  status: string;
  max_capacity: number;
  orders: unknown[];
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Filters
  const [zoneFilter, setZoneFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    zone: "",
    aisle: "",
    shelf: "",
    bin: "",
    max_capacity: 10,
  });

  const fetchLocations = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (zoneFilter !== "ALL") params.zone = zoneFilter;
      if (statusFilter !== "ALL") params.status = statusFilter;

      const response = await api.get("/locations", { params });
      setLocations(response.data);
    } catch (error) {
      console.error("Failed to fetch locations:", error);
      // Demo data
      setLocations([
        {
          id: "1",
          zone: "A",
          aisle: "01",
          shelf: "1",
          bin: "A",
          barcode: "LOC-A-01-1-A",
          status: "EMPTY",
          max_capacity: 10,
          orders: [],
        },
        {
          id: "2",
          zone: "A",
          aisle: "01",
          shelf: "1",
          bin: "B",
          barcode: "LOC-A-01-1-B",
          status: "OCCUPIED",
          max_capacity: 10,
          orders: [1, 2],
        },
        {
          id: "3",
          zone: "B",
          aisle: "02",
          shelf: "3",
          bin: "C",
          barcode: "LOC-B-02-3-C",
          status: "FULL",
          max_capacity: 5,
          orders: [1, 2, 3, 4, 5],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [zoneFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLocations();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchLocations]);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/locations", formData);
      showNotification("success", "Thêm vị trí thành công");
      setShowAddModal(false);
      setFormData({
        zone: "",
        aisle: "",
        shelf: "",
        bin: "",
        max_capacity: 10,
      });
      fetchLocations();
    } catch {
      showNotification("error", "Không thể thêm vị trí. Vui lòng thử lại.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xoá vị trí này?")) return;
    try {
      await api.delete(`/locations/${id}`);
      showNotification("success", "Đã xoá vị trí");
      fetchLocations();
    } catch {
      showNotification(
        "error",
        "Không thể xoá vị trí này. Có thể vị trí đang chứa hàng.",
      );
    }
  };

  const filteredLocations = locations.filter((loc) =>
    loc.barcode.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const stats = {
    total: locations.length,
    empty: locations.filter((l) => l.status === "EMPTY").length,
    occupied: locations.filter((l) => l.status === "OCCUPIED").length,
    full: locations.filter((l) => l.status === "FULL").length,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header & Notifications */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Vị trí Kệ hàng
          </h1>
          <p className="text-slate-500 mt-1">
            Quản lý không gian lưu trữ và sắp xếp đơn hàng trong kho.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
        >
          <Plus className="w-5 h-5" />
          Thêm vị trí
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-blue-200 transition-colors">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Tổng Vị Trí</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-green-200 transition-colors">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl group-hover:bg-green-100 transition-colors">
            <BoxSelect className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Trống (EMPTY)</p>
            <p className="text-2xl font-bold text-slate-900">{stats.empty}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-yellow-200 transition-colors">
          <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl group-hover:bg-yellow-100 transition-colors">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Đang chứa (OCCUPIED)
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {stats.occupied}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-red-200 transition-colors">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl group-hover:bg-red-100 transition-colors">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Đã đầy (FULL)</p>
            <p className="text-2xl font-bold text-slate-900">{stats.full}</p>
          </div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50">
          <div className="flex gap-3 w-full md:w-auto">
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Khu vực (Tất cả)</option>
              <option value="A">Zone A</option>
              <option value="B">Zone B</option>
              <option value="C">Zone C</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Trạng thái (Tất cả)</option>
              <option value="EMPTY">Trống</option>
              <option value="OCCUPIED">Đang chứa hàng</option>
              <option value="FULL">Đã đầy</option>
            </select>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo mã vạch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-medium">
                  Vị trí (Khu-Dãy-Tầng-Ngăn)
                </th>
                <th className="px-6 py-4 font-medium">Mã Vạch</th>
                <th className="px-6 py-4 font-medium">Trạng thái</th>
                <th className="px-6 py-4 font-medium">Sức chứa</th>
                <th className="px-6 py-4 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-4 bg-slate-100 rounded w-24"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-slate-100 rounded w-32"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 bg-slate-100 rounded-full w-20"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-slate-100 rounded w-16"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-8 bg-slate-100 rounded-lg w-8 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : filteredLocations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <MapPin className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">
                      Không tìm thấy vị trí nào
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLocations.map((loc) => (
                  <tr
                    key={loc.id}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {loc.zone} - {loc.aisle} - {loc.shelf} - {loc.bin}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 font-mono text-xs rounded-md border border-slate-200">
                        {loc.barcode}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          loc.status === "EMPTY"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : loc.status === "OCCUPIED"
                              ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                              : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        {loc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {loc.orders?.length || 0} / {loc.max_capacity} đơn
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(loc.id)}
                        disabled={loc.status !== "EMPTY"}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={
                          loc.status !== "EMPTY"
                            ? "Chỉ có thể xoá kệ trống"
                            : "Xoá vị trí"
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">
                Thêm vị trí kệ hàng
              </h2>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Khu vực (Zone)
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.zone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        zone: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="Vd: A"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Dãy (Aisle)
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.aisle}
                    onChange={(e) =>
                      setFormData({ ...formData, aisle: e.target.value })
                    }
                    placeholder="Vd: 01"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tầng (Shelf)
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.shelf}
                    onChange={(e) =>
                      setFormData({ ...formData, shelf: e.target.value })
                    }
                    placeholder="Vd: 1"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Ngăn (Bin)
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.bin}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bin: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="Vd: A"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Sức chứa tối đa (số đơn)
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  value={formData.max_capacity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_capacity: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                  Thêm vị trí
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
