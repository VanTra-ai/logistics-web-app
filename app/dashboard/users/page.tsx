"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Search,
  Plus,
  Edit2,
  UserX,
  UserCheck,
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  MapPin,
  Mail,
  Phone,
  Shield,
  Building,
  Lock,
} from "lucide-react";
import api from "@/lib/axios";
import axios from "axios";
import Pagination from "@/components/Pagination";

interface Hub {
  id: string;
  name: string;
}

interface User {
  id: string;
  employee_code?: string | null;
  email: string;
  phone_number: string;
  address?: string;
  full_name: string;
  role: "ADMIN" | "SHIPPER" | "HUB_COORDINATOR" | "CUSTOMER";
  status: string;
  created_at: string;
  hub?: Hub | null;
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  // Modals & Notifications
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    email: "",
    phone_number: "",
    password: "",
    fullName: "",
    role: "SHIPPER" as "ADMIN" | "SHIPPER" | "HUB_COORDINATOR" | "CUSTOMER",
    hubId: "",
    status: "ACTIVE",
  });
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchHubsList = async () => {
    try {
      const response = await api.get("/hubs");
      const data = response.data?.data || response.data || [];
      if (Array.isArray(data)) {
        setHubs(data);
      }
    } catch (e) {
      console.warn("Không load được danh sách bưu cục cho dropdown.", e);
      setHubs([
        { id: "hub-1", name: "Bưu cục Cầu Giấy" },
        { id: "hub-2", name: "Bưu cục Quận 1" },
        { id: "hub-3", name: "Bưu cục Hải Phòng" },
        { id: "hub-4", name: "Bưu cục Đà Nẵng" },
      ]);
    }
  };

  const fetchUsers = async (page = 1, showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    else setIsLoading(true);
    setNotification(null);

    try {
      const response = await api.get(
        `/users?page=${page}&limit=${itemsPerPage}`,
      );
      const data = response.data?.data || response.data || [];
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        throw new Error("Dữ liệu nhân viên trả về không đúng định dạng");
      }

      const meta = response.data?.meta;
      if (meta) {
        setTotalPages(meta.totalPages);
        setTotalItems(meta.totalItems);
      }
    } catch (error) {
      console.warn("Không tải được danh sách nhân viên từ backend.", error);
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        setNotification({
          type: "error",
          message: "Bạn không có quyền xem danh sách nhân viên",
        });
      }
      setUsers([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(currentPage), 0);
    return () => clearTimeout(timer);
  }, [currentPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHubsList();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Bộ lọc tìm kiếm
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone_number.includes(searchTerm);

    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Modal actions
  const openAddModal = () => {
    setFormData({
      email: "",
      phone_number: "",
      password: "",
      fullName: "",
      role: "SHIPPER",
      hubId: "",
      status: "ACTIVE",
    });
    setFormError("");
    setIsAddModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      phone_number: user.phone_number,
      password: "", // Không hiển thị mật khẩu cũ
      fullName: user.full_name,
      role: user.role,
      hubId: user.hub?.id || "",
      status: user.status,
    });
    setFormError("");
    setIsEditModalOpen(true);
  };

  // Thêm nhân viên (POST /users/internal)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.email.trim() ||
      !formData.phone_number.trim() ||
      !formData.fullName.trim() ||
      !formData.password.trim()
    ) {
      setFormError("Vui lòng nhập đầy đủ các trường thông tin bắt buộc!");
      return;
    }
    if (formData.password.length < 6) {
      setFormError("Mật khẩu phải dài tối thiểu 6 ký tự!");
      return;
    }
    if (
      (formData.role === "HUB_COORDINATOR" || formData.role === "SHIPPER") &&
      !formData.hubId
    ) {
      setFormError(
        `Vui lòng chọn bưu cục cho vai trò ${formData.role === "SHIPPER" ? "Shipper" : "Điều phối viên"}!`,
      );
      return;
    }

    setIsSubmitLoading(true);
    setFormError("");

    const payload = {
      email: formData.email,
      phone_number: formData.phone_number,
      password: formData.password,
      fullName: formData.fullName,
      role: formData.role,
      ...(formData.hubId ? { hubId: formData.hubId } : {}),
    };

    try {
      const response = await api.post("/users/internal", payload);
      const createdUser = response.data?.data || response.data;
      if (createdUser) {
        // Tải lại danh sách để đồng bộ quan hệ bưu cục
        await fetchUsers(currentPage);
        setIsAddModalOpen(false);
        setNotification({
          type: "success",
          message: "Đã thêm nhân viên nội bộ thành công!",
        });
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setFormError(
          err.response?.data?.message || "Lỗi thêm nhân viên nội bộ!",
        );
      } else {
        setFormError("Không thể kết nối đến server.");
      }
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // Cập nhật nhân viên (PATCH /users/:id)
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!formData.phone_number.trim() || !formData.fullName.trim()) {
      setFormError("Tên hiển thị và số điện thoại không được để trống!");
      return;
    }
    if (
      (formData.role === "HUB_COORDINATOR" || formData.role === "SHIPPER") &&
      !formData.hubId
    ) {
      setFormError(
        `Vui lòng chọn bưu cục cho vai trò ${formData.role === "SHIPPER" ? "Shipper" : "Điều phối viên"}!`,
      );
      return;
    }

    setIsSubmitLoading(true);
    setFormError("");

    const payload = {
      fullName: formData.fullName,
      phone_number: formData.phone_number,
      role: formData.role,
      status: formData.status,
      hubId: formData.hubId || null,
    };

    try {
      const response = await api.patch(`/users/${selectedUser.id}`, payload);
      const updated = response.data?.data || response.data;
      if (updated) {
        await fetchUsers(currentPage);
        setIsEditModalOpen(false);
        setNotification({
          type: "success",
          message: "Cập nhật thông tin nhân viên thành công!",
        });
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setFormError(err.response?.data?.message || "Lỗi cập nhật nhân viên!");
      } else {
        setFormError("Không thể kết nối đến server.");
      }
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // Ngưng hoạt động (DELETE /users/:id)
  const handleDeactivateUser = async (user: User) => {
    const confirmDeactivate = window.confirm(
      `Bạn có chắc chắn muốn ngưng kích hoạt tài khoản của "${user.full_name}"? Nhân viên này sẽ không thể đăng nhập vào hệ thống.`,
    );
    if (!confirmDeactivate) return;

    try {
      await api.delete(`/users/${user.id}`);
      setUsers(
        users.map((u) => (u.id === user.id ? { ...u, status: "INACTIVE" } : u)),
      );
      setNotification({
        type: "success",
        message: `Đã ngừng kích hoạt tài khoản nhân viên "${user.full_name}" thành công!`,
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setNotification({
          type: "error",
          message:
            err.response?.data?.message || "Lỗi ngừng kích hoạt tài khoản!",
        });
      } else {
        setNotification({ type: "error", message: "Lỗi kết nối mạng." });
      }
    }
  };

  // Kích hoạt lại tài khoản nhân viên (PATCH /users/:id với status ACTIVE)
  const handleActivateUser = async (user: User) => {
    try {
      await api.patch(`/users/${user.id}`, { status: "ACTIVE" });
      setUsers(
        users.map((u) => (u.id === user.id ? { ...u, status: "ACTIVE" } : u)),
      );
      setNotification({
        type: "success",
        message: `Đã kích hoạt lại tài khoản "${user.full_name}" thành công!`,
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setNotification({
          type: "error",
          message:
            err.response?.data?.message || "Lỗi kích hoạt lại tài khoản!",
        });
      } else {
        setNotification({ type: "error", message: "Lỗi kết nối mạng." });
      }
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "Quản trị viên";
      case "SHIPPER":
        return "Shipper giao hàng";
      case "HUB_COORDINATOR":
        return "Điều phối viên";
      case "CUSTOMER":
        return "Khách hàng";
      default:
        return role;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "SHIPPER":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "HUB_COORDINATOR":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Cảnh báo chế độ giả lập */}

      {/* Floating Notifications toast */}
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

      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Quản lý nhân viên
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Phân quyền, gán bưu cục trực thuộc và quản lý trạng thái tài khoản
              nhân sự nội bộ
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchUsers(currentPage, true)}
            disabled={isRefreshing}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-250 transition-colors cursor-pointer disabled:opacity-50"
            title="Làm mới danh sách"
          >
            <RefreshCw
              className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-blue-900/10 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Thêm nhân viên
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search & Role selection */}
        <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-2xl">
          {/* Search box */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-4 py-2.5 bg-white border border-slate-250 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
              placeholder="Tìm theo tên, email, số điện thoại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {/* Role selector dropdown */}
          <select
            className="px-3 py-2.5 bg-white border border-slate-250 text-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="ALL">Tất cả vai trò</option>
            <option value="ADMIN">Quản trị viên (Admin)</option>
            <option value="SHIPPER">Shipper giao hàng</option>
            <option value="HUB_COORDINATOR">Điều phối viên bưu cục</option>
            <option value="CUSTOMER">Khách hàng</option>
          </select>
        </div>

        {/* Total counts */}
        <div className="flex gap-3 text-xs font-semibold">
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
            <span className="text-slate-500">Tổng số:</span>
            <span className="text-slate-800 font-bold text-sm">
              {totalItems}
            </span>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
            <span className="text-slate-500">Nhân viên hoạt động:</span>
            <span className="text-emerald-600 font-bold text-sm">
              {
                users.filter(
                  (u) => u.role !== "CUSTOMER" && u.status === "ACTIVE",
                ).length
              }
            </span>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 text-sm font-medium">
              Đang tải dữ liệu nhân viên...
            </p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 text-slate-400">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Không tìm thấy tài khoản nào
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Vui lòng điều chỉnh lại từ khóa tìm kiếm hoặc vai trò lọc.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-150 bg-slate-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Nhân sự</th>
                  <th className="px-6 py-4">Liên hệ</th>
                  <th className="px-6 py-4">Vai trò</th>
                  <th className="px-6 py-4">Bưu cục trực thuộc</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-sm">
                {filteredUsers.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/30 transition-colors"
                  >
                    {/* Column 1: Avatar & Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 font-extrabold flex items-center justify-center shadow-inner">
                          {item.full_name
                            .trim()
                            .split(" ")
                            .pop()
                            ?.substring(0, 2)
                            .toUpperCase() || "US"}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block">
                            {item.full_name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium block">
                            Mã:{" "}
                            <strong className="text-blue-600">
                              {item.employee_code || "Chưa cấp"}
                            </strong>{" "}
                            | Ngày tham gia: {formatDate(item.created_at)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Column 2: Email & Phone */}
                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{item.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{item.phone_number}</span>
                      </div>
                    </td>

                    {/* Column 3: Role badge */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeClass(item.role)}`}
                      >
                        <Shield className="w-3 h-3 stroke-[2.5]" />
                        {getRoleLabel(item.role)}
                      </span>
                    </td>

                    {/* Column 4: Associated Hub */}
                    <td className="px-6 py-4">
                      {item.hub ? (
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="font-medium">{item.hub.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">
                          Không trực thuộc
                        </span>
                      )}
                    </td>

                    {/* Column 5: Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          item.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-250"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${item.status === "ACTIVE" ? "bg-emerald-500" : "bg-red-500"}`}
                        />
                        {item.status === "ACTIVE"
                          ? "Hoạt động"
                          : "Ngưng hoạt động"}
                      </span>
                    </td>

                    {/* Column 6: Actions */}
                    <td className="px-6 py-4 text-right space-x-1">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                        title="Chỉnh sửa tài khoản"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {item.status === "ACTIVE" ? (
                        <button
                          onClick={() => handleDeactivateUser(item)}
                          className="p-1.5 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                          title="Khóa tài khoản"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivateUser(item)}
                          className="p-1.5 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded-lg transition-colors cursor-pointer"
                          title="Kích hoạt lại tài khoản"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && filteredUsers.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* MODAL 1: THÊM NHÂN VIÊN MỚI */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl relative overflow-hidden">
            <div className="p-6 border-b border-slate-150 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Thêm nhân viên nội bộ
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateUser}
              className="p-6 space-y-4 max-h-[75vh] overflow-y-auto"
            >
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="font-semibold leading-normal">{formError}</p>
                </div>
              )}

              {/* Tên nhân viên */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Họ và tên nhân viên
                </label>
                <input
                  type="text"
                  required
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm placeholder:text-slate-400"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> Email liên kết
                </label>
                <input
                  type="email"
                  required
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm placeholder:text-slate-400"
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              {/* Số điện thoại */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> Số điện thoại
                </label>
                <input
                  type="text"
                  required
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm placeholder:text-slate-400"
                  placeholder="Ví dụ: 0912345678"
                  value={formData.phone_number}
                  onChange={(e) =>
                    setFormData({ ...formData, phone_number: e.target.value })
                  }
                />
              </div>

              {/* Mật khẩu */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-slate-400" /> Mật khẩu khởi
                  tạo
                </label>
                <input
                  type="password"
                  required
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm placeholder:text-slate-400"
                  placeholder="Tối thiểu 6 ký tự"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>

              {/* Vai trò */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-slate-400" /> Vai trò phân
                  quyền
                </label>
                <select
                  className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-250 text-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as User["role"],
                    })
                  }
                >
                  <option value="SHIPPER">Shipper giao hàng (SHIPPER)</option>
                  <option value="HUB_COORDINATOR">
                    Điều phối viên bưu cục (HUB_COORDINATOR)
                  </option>
                  <option value="ADMIN">Quản trị hệ thống (ADMIN)</option>
                </select>
              </div>

              {/* Bưu cục trực thuộc (Chỉ hiện nếu vai trò là SHIPPER hoặc HUB_COORDINATOR) */}
              {(formData.role === "SHIPPER" ||
                formData.role === "HUB_COORDINATOR") && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-slate-400" /> Bưu cục
                    trực thuộc
                  </label>
                  <select
                    className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-250 text-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium"
                    value={formData.hubId}
                    onChange={(e) =>
                      setFormData({ ...formData, hubId: e.target.value })
                    }
                  >
                    <option value="">-- Chọn bưu cục trực thuộc --</option>
                    {hubs.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-255 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-blue-900/10 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {isSubmitLoading ? "Đang lưu..." : "Lưu lại"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CHỈNH SỬA THÔNG TIN NHÂN VIÊN */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl relative overflow-hidden">
            <div className="p-6 border-b border-slate-150 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                Chỉnh sửa tài khoản nhân viên
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleUpdateUser}
              className="p-6 space-y-4 max-h-[75vh] overflow-y-auto"
            >
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="font-semibold leading-normal">{formError}</p>
                </div>
              )}

              {/* Tên hiển thị */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Họ và tên
                </label>
                <input
                  type="text"
                  required
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                />
              </div>

              {/* Email (Read-only) */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Email (Không thể thay đổi)
                </label>
                <input
                  type="email"
                  disabled
                  className="block w-full px-3.5 py-2.5 bg-slate-150 border border-slate-200 text-slate-500 rounded-xl text-sm cursor-not-allowed"
                  value={formData.email}
                />
              </div>

              {/* Số điện thoại */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> Số điện thoại
                </label>
                <input
                  type="text"
                  required
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                  value={formData.phone_number}
                  onChange={(e) =>
                    setFormData({ ...formData, phone_number: e.target.value })
                  }
                />
              </div>

              {/* Vai trò */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-slate-400" /> Vai trò phân
                  quyền
                </label>
                <select
                  className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-250 text-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as User["role"],
                    })
                  }
                >
                  <option value="SHIPPER">Shipper giao hàng (SHIPPER)</option>
                  <option value="HUB_COORDINATOR">
                    Điều phối viên bưu cục (HUB_COORDINATOR)
                  </option>
                  <option value="ADMIN">Quản trị hệ thống (ADMIN)</option>
                  <option value="CUSTOMER">Khách hàng (CUSTOMER)</option>
                </select>
              </div>

              {/* Bưu cục trực thuộc */}
              {(formData.role === "SHIPPER" ||
                formData.role === "HUB_COORDINATOR") && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-slate-400" /> Bưu cục
                    trực thuộc
                  </label>
                  <select
                    className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-250 text-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium"
                    value={formData.hubId}
                    onChange={(e) =>
                      setFormData({ ...formData, hubId: e.target.value })
                    }
                  >
                    <option value="">-- Chọn bưu cục trực thuộc --</option>
                    {hubs.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Trạng thái hoạt động */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Trạng thái tài khoản
                </label>
                <select
                  className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-250 text-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                >
                  <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                  <option value="INACTIVE">Ngưng hoạt động (INACTIVE)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-255 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-blue-900/10 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {isSubmitLoading ? "Đang lưu..." : "Cập nhật"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
