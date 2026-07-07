"use client";

import { useState, useEffect } from "react";
import {
  Package,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import api from "@/lib/axios";

interface Material {
  id: string;
  name: string;
  price: number;
  stock: number;
  status: string;
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    stock: 0,
  });

  const fetchMaterials = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/materials");
      setMaterials(response.data);
    } catch (error) {
      console.error("Failed to fetch materials:", error);
      setMaterials([
        {
          id: "1",
          name: "Thùng carton nhỏ",
          price: 5000,
          stock: 150,
          status: "ACTIVE",
        },
        {
          id: "2",
          name: "Băng keo trong",
          price: 12000,
          stock: 45,
          status: "ACTIVE",
        },
        {
          id: "3",
          name: "Màng bọc xốp nổ",
          price: 35000,
          stock: 0,
          status: "ACTIVE",
        },
        {
          id: "4",
          name: "Thùng gỗ pallet",
          price: 150000,
          stock: 5,
          status: "INACTIVE",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMaterials();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleOpenModal = (material?: Material) => {
    if (material) {
      setEditingId(material.id);
      setFormData({
        name: material.name,
        price: material.price,
        stock: material.stock,
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", price: 0, stock: 0 });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.patch(`/materials/${editingId}`, formData);
        showNotification("success", "Cập nhật vật tư thành công");
      } else {
        await api.post("/materials", formData);
        showNotification("success", "Thêm vật tư thành công");
      }
      setShowModal(false);
      fetchMaterials();
    } catch {
      showNotification("error", "Có lỗi xảy ra. Vui lòng thử lại.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn vô hiệu hoá vật tư này?")) return;
    try {
      await api.delete(`/materials/${id}`);
      showNotification("success", "Đã vô hiệu hoá vật tư");
      fetchMaterials();
    } catch {
      showNotification("error", "Không thể xoá vật tư này.");
    }
  };

  const stats = {
    totalTypes: materials.length,
    totalValue: materials.reduce((sum, m) => sum + m.stock * m.price, 0),
    outOfStock: materials.filter((m) => m.stock === 0 && m.status === "ACTIVE")
      .length,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Quản lý Vật tư Đóng gói
          </h1>
          <p className="text-slate-500 mt-1">
            Theo dõi tồn kho và điều chỉnh giá trị các loại vật tư đóng gói.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
        >
          <Plus className="w-5 h-5" />
          Thêm vật tư
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-blue-200 transition-colors">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-100 transition-colors">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Tổng loại vật tư
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {stats.totalTypes}
            </p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl shadow-sm text-white flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-white/20 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-100">
              Tổng giá trị tồn kho
            </p>
            <p className="text-2xl font-bold">
              {formatCurrency(stats.totalValue)}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-red-200 transition-colors">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl group-hover:bg-red-100 transition-colors">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Hết hàng (Stock = 0)
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {stats.outOfStock}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-medium">Tên Vật Tư</th>
                <th className="px-6 py-4 font-medium">Đơn Giá</th>
                <th className="px-6 py-4 font-medium">Tồn Kho</th>
                <th className="px-6 py-4 font-medium">Trạng thái</th>
                <th className="px-6 py-4 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-4 bg-slate-100 rounded w-48"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-slate-100 rounded w-24"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-slate-100 rounded w-16"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 bg-slate-100 rounded-full w-20"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-8 bg-slate-100 rounded-lg w-16 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : materials.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">
                      Chưa có dữ liệu vật tư
                    </p>
                  </td>
                </tr>
              ) : (
                materials.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                        <Package className="w-4 h-4" />
                      </div>
                      {item.name}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {formatCurrency(item.price)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`font-medium ${item.stock === 0 ? "text-red-600" : "text-slate-700"}`}
                      >
                        {item.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          item.status === "ACTIVE"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={item.status !== "ACTIVE"}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={
                            item.status !== "ACTIVE"
                              ? "Đã vô hiệu hoá"
                              : "Vô hiệu hoá"
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900">
                {editingId ? "Cập nhật vật tư" : "Thêm vật tư mới"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tên vật tư
                </label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Vd: Thùng carton cỡ lớn"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Đơn giá (VNĐ)
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tồn kho ban đầu
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stock: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
                >
                  {editingId ? "Cập nhật" : "Thêm mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
