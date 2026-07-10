"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Truck,
  TrendingUp,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import api from "@/lib/axios";
import axios from "axios";

// Định nghĩa kiểu dữ liệu User
interface LoggedInUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  hub?: { id: string; name: string } | null;
}

// Cấu trúc dữ liệu API thống kê đơn hàng
interface OrderStatItem {
  status: string;
  count: number;
}

interface OrderData {
  id: string;
  tracking_number?: string;
  receiver_name?: string;
  receiver_address?: string;
  weight?: string | number;
  current_status?: string;
  cod_amount?: number;
  created_at?: string;
}

// ─── File-scoped utility functions shared across all sub-components ──────────

function translateStatus(status: string): string {
  switch (status) {
    case "PENDING":
      return "Chờ xử lý";
    case "PICKED_UP":
      return "Đã lấy hàng";
    case "AT_HUB":
      return "Đã nhập kho";
    case "IN_TRANSIT":
      return "Đang vận chuyển";
    case "DELIVERING":
      return "Đang giao";
    case "FINISHED":
      return "Hoàn thành";
    case "RETURN_REQUESTED":
      return "Yêu cầu hoàn";
    case "RETURNING":
      return "Đang hoàn hàng";
    case "RETURNED":
      return "Đã hoàn hàng";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "PENDING":
      return "#F59E0B";
    case "DELIVERING":
      return "#3B82F6";
    case "FINISHED":
      return "#10B981";
    case "CANCELLED":
      return "#EF4444";
    default:
      return "#64748B";
  }
}

function getStatusBgColor(status: string): string {
  switch (status) {
    case "PENDING":
      return "bg-amber-500";
    case "DELIVERING":
      return "bg-blue-500";
    case "FINISHED":
      return "bg-emerald-500";
    case "CANCELLED":
      return "bg-red-500";
    default:
      return "bg-slate-500";
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [hubs, setHubs] = useState<{ id: string; name: string }[]>([]);
  const [selectedHub, setSelectedHub] = useState<string>("ALL");

  const [statsData, setStatsData] = useState<OrderStatItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      api
        .get("/hubs")
        .then((res) => setHubs(res.data?.data || res.data))
        .catch(() => {});
    }
  }, [user]);

  // Load thông tin người dùng từ localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch (e) {
            console.error("Lỗi parse thông tin user từ localStorage:", e);
          }
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Fetch dữ liệu thống kê từ API
  const fetchStatistics = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const response = await api.get("/orders/statistics");
      // Dữ liệu API trả về có dạng: { message: string, data: OrderStatItem[] } hoặc trực tiếp mảng
      const data = response.data?.data || response.data || [];

      if (Array.isArray(data) && data.length > 0) {
        setStatsData(data);
      } else {
        throw new Error("Dữ liệu thống kê không hợp lệ");
      }

      try {
        const savedUser = localStorage.getItem("user");
        const userRole = savedUser ? JSON.parse(savedUser).role : "";
        const ordersRes = await api.get(
          userRole === "CUSTOMER" ? "/orders/me" : "/orders",
        );
        const ordData = ordersRes.data?.data || ordersRes.data || [];
        if (Array.isArray(ordData)) {
          ordData.sort(
            (a: OrderData, b: OrderData) =>
              new Date(b.created_at || "").getTime() -
              new Date(a.created_at || "").getTime(),
          );
          setRecentOrders(ordData.slice(0, 5));
        }
      } catch (e) {
        console.warn("Lỗi fetch orders in dashboard", e);
      }
    } catch (error) {
      console.warn("Không kết nối được API /orders/statistics.", error);
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        // Có thể set một lỗi chung hoặc bỏ qua
      }
      setStatsData([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStatistics();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Thực hiện Đăng xuất gọi API POST /auth/logout
  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      console.error("Lỗi khi gọi API đăng xuất ở backend:", e);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      router.push("/");
      router.refresh();
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "Quản trị viên";
      case "SHIPPER":
        return "Shipper";
      case "HUB_COORDINATOR":
        return "Điều phối viên";
      default:
        return "Thành viên";
    }
  };

  // Tính toán các dữ liệu tổng hợp
  const getStatusCount = (status: string) => {
    const item = statsData.find((s) => s.status === status);
    return item ? item.count : 0;
  };

  const totalOrders = statsData.reduce((acc, curr) => acc + curr.count, 0);
  const finishedCount = getStatusCount("FINISHED");
  const deliveringCount = getStatusCount("DELIVERING");
  const pendingCount = getStatusCount("PENDING");

  // LOGIC VẼ BIỂU ĐỒ TRÒN DONUT
  // Đường tròn bán kính r=50 -> Chu vi = 2 * pi * r = 314.16
  const donutRadius = 50;
  const donutCircumference = 2 * Math.PI * donutRadius; // 314.159
  const donutSlices = statsData.map((item, index) => {
    const count = item.count;
    const percentage = totalOrders > 0 ? count / totalOrders : 0;
    const strokeLength = percentage * donutCircumference;
    const strokeGap = donutCircumference - strokeLength;

    const accumulatedPercentageBefore = statsData
      .slice(0, index)
      .reduce(
        (sum, curr) => sum + (totalOrders > 0 ? curr.count / totalOrders : 0),
        0,
      );

    const strokeOffset = accumulatedPercentageBefore * donutCircumference;

    return {
      status: item.status,
      count,
      percentage: (percentage * 100).toFixed(1),
      strokeLength,
      strokeGap,
      strokeOffset: -strokeOffset,
      color: getStatusColor(item.status),
    };
  });

  // LOGIC VẼ BIỂU ĐỒ CỘT (BAR CHART)
  const maxCount = Math.max(...statsData.map((s) => s.count), 1);
  const barChartHeight = 160;

  if (user?.role === "HUB_COORDINATOR") {
    return <CoordinatorDashboard user={user} />;
  }

  if (user?.role === "ADMIN" && selectedHub !== "ALL") {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 gap-4">
          <div>
            <h2 className="font-bold text-slate-800">Chế độ xem Bưu cục</h2>
            <p className="text-xs text-slate-500">
              Bạn đang xem số liệu chi tiết của một bưu cục cụ thể
            </p>
          </div>
          <select
            value={selectedHub}
            onChange={(e) => setSelectedHub(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50"
          >
            <option value="ALL">← Trở về Tổng quan hệ thống</option>
            {hubs.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
        <CoordinatorDashboard
          user={user}
          adminSelectedHubId={selectedHub}
          adminSelectedHubName={hubs.find((h) => h.id === selectedHub)?.name}
        />
      </div>
    );
  }

  if (user?.role === "SHIPPER") {
    return (
      <ShipperDashboard
        user={user}
        onRefresh={() => fetchStatistics(true)}
        isRefreshing={isRefreshing}
      />
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Admin Hub Selector */}
      {user?.role === "ADMIN" && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 gap-4">
          <div>
            <h2 className="font-bold text-slate-800">
              Bảng điều khiển Tổng Quan
            </h2>
            <p className="text-xs text-slate-500">
              Số liệu trên toàn bộ hệ thống
            </p>
          </div>
          <select
            value={selectedHub}
            onChange={(e) => setSelectedHub(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50"
          >
            <option value="ALL">Toàn hệ thống</option>
            {hubs.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 to-blue-950 rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-lg">
        {/* Decorative ambient light */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Chào mừng trở lại, {user?.full_name || "Thành viên"}!
            </h1>
            <p className="text-slate-400 mt-2 text-sm sm:text-base max-w-xl">
              Hệ thống vận hành WMS Pro đang hoạt động ổn định. Bạn đăng nhập
              với vai trò{" "}
              <span className="text-blue-400 font-semibold">
                {getRoleLabel(user?.role || "")}
              </span>
              .
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => fetchStatistics(true)}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 font-medium text-sm rounded-xl transition-all active:scale-[0.98] cursor-pointer disabled:opacity-55"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Làm mới số liệu
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-650 hover:bg-red-700 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-red-950/20 active:scale-[0.98] cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      {/* Loading state indicator */}
      {isLoading ? (
        <div className="min-h-[300px] flex flex-col justify-center items-center gap-4 bg-white rounded-2xl border border-slate-200 p-12">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm font-medium">
            Đang đồng bộ số liệu đơn hàng động...
          </p>
        </div>
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Orders Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group hover:-translate-y-0.5">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-slate-100 text-slate-600 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-all">
                  <Package className="w-6 h-6" />
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +12.4%
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
                  {totalOrders}
                </h3>
                <p className="text-slate-500 text-sm font-medium mt-1">
                  Tổng đơn liên kết
                </p>
              </div>
            </div>

            {/* Delivering Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group hover:-translate-y-0.5">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Truck className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                  Đang giao hàng
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
                  {deliveringCount}
                </h3>
                <p className="text-slate-500 text-sm font-medium mt-1">
                  Đơn đang giao (Delivering)
                </p>
              </div>
            </div>

            {/* Finished Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group hover:-translate-y-0.5">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                  Thành công
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
                  {finishedCount}
                </h3>
                <p className="text-slate-500 text-sm font-medium mt-1">
                  Đơn thành công (Finished)
                </p>
              </div>
            </div>

            {/* Pending Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group hover:-translate-y-0.5">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-all">
                  <Clock className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                  Chờ điều phối
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
                  {pendingCount}
                </h3>
                <p className="text-slate-500 text-sm font-medium mt-1">
                  Đơn chờ đi lấy (Pending)
                </p>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Custom SVG Donut Chart Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Tỷ lệ phân bổ trạng thái đơn
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Phần trăm phân bổ đơn hàng dựa trên trạng thái
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-around py-8 gap-8">
                {/* SVG Donut */}
                <div className="relative w-44 h-44">
                  <svg className="w-full h-full" viewBox="0 0 120 120">
                    {/* Background circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r={donutRadius}
                      fill="transparent"
                      stroke="#F1F5F9"
                      strokeWidth="12"
                    />
                    {/* Render slices */}
                    {totalOrders > 0 &&
                      donutSlices.map((slice) => (
                        <circle
                          key={slice.status}
                          cx="60"
                          cy="60"
                          r={donutRadius}
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth="12"
                          strokeDasharray={`${slice.strokeLength} ${slice.strokeGap}`}
                          strokeDashoffset={slice.strokeOffset}
                          transform="rotate(-90 60 60)"
                          className="transition-all duration-700 ease-out"
                        />
                      ))}
                  </svg>
                  {/* Central Text */}
                  <div className="absolute inset-0 flex flex-col justify-center items-center">
                    <span className="text-2xl font-black text-slate-800 tracking-tight">
                      {totalOrders}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Đơn hàng
                    </span>
                  </div>
                </div>

                {/* Donut Legend */}
                <div className="space-y-3.5 w-full sm:w-auto">
                  {donutSlices.map((slice) => (
                    <div
                      key={slice.status}
                      className="flex items-center justify-between sm:justify-start gap-6 text-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-3.5 h-3.5 rounded-md ${getStatusBgColor(slice.status)}`}
                        />
                        <span className="font-semibold text-slate-700 w-24">
                          {translateStatus(slice.status)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-800">
                          {slice.count} đơn
                        </span>
                        <span className="text-xs text-slate-400 ml-2 font-medium">
                          ({slice.percentage}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom SVG Bar Chart Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Số lượng đơn hàng chi tiết
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Biểu đồ so sánh cột giữa các trạng thái chính
                </p>
              </div>

              {/* SVG Bar Chart */}
              <div className="relative py-6">
                <div className="w-full h-48 flex items-end justify-around border-b border-slate-200 px-4">
                  {statsData.map((item) => {
                    const barHeight = (item.count / maxCount) * barChartHeight;
                    return (
                      <div
                        key={item.status}
                        className="flex flex-col items-center group w-16 relative"
                      >
                        {/* Tooltip value */}
                        <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded font-bold pointer-events-none whitespace-nowrap shadow">
                          {item.count} đơn
                        </div>
                        {/* Bar */}
                        <div
                          className="w-8 rounded-t-lg transition-all duration-700 ease-out cursor-pointer hover:brightness-95"
                          style={{
                            height: `${Math.max(barHeight, 6)}px`,
                            backgroundColor: getStatusColor(item.status),
                            boxShadow: `0 4px 6px -1px ${getStatusColor(item.status)}20`,
                          }}
                        />
                        <span className="text-[10px] text-slate-400 font-bold mt-2 truncate w-full text-center">
                          {translateStatus(item.status)}
                        </span>
                        <span className="text-xs font-extrabold text-slate-800 mt-0.5">
                          {item.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Grid Section: Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Orders (2/3 width) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Đơn hàng mới nhận
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Danh sách đơn hàng đang chờ điều phối chuyến xe
                </p>
              </div>
              <button className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 transition-colors">
                Xem tất cả
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/30 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Mã Đơn</th>
                    <th className="px-6 py-4">Khách Hàng</th>
                    <th className="px-6 py-4">Nơi Đến</th>
                    <th className="px-6 py-4">Khối Lượng</th>
                    <th className="px-6 py-4">Trạng Thái</th>
                    <th className="px-6 py-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {recentOrders.map((order: OrderData) => (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900 font-mono">
                        {order.tracking_number || order.id.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {order.receiver_name || "—"}
                      </td>
                      <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                        {order.receiver_address || "—"}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {order.weight}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            order.current_status === "PENDING"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : order.current_status === "PICKED_UP"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : order.current_status === "IN_TRANSIT"
                                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              order.current_status === "PENDING"
                                ? "bg-amber-500"
                                : order.current_status === "PICKED_UP"
                                  ? "bg-blue-500"
                                  : order.current_status === "IN_TRANSIT"
                                    ? "bg-purple-500"
                                    : "bg-emerald-500"
                            }`}
                          />
                          {translateStatus(order.current_status || "PENDING")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="px-3 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-semibold rounded-lg transition-all cursor-pointer">
                          Điều phối
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="p-4 border-t border-slate-100 bg-slate-50/20 text-center">
            <span className="text-xs text-slate-400">
              Hiển thị 5 trên tổng số 14 đơn hàng chờ điều phối.
            </span>
          </div>
        </div>

        {/* Right Column: Active Feed & Notifications (1/3 width) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Hoạt động bưu cục
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Nhật ký vận hành bưu cục thời gian thực
            </p>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-150">
            {recentOrders.length > 0 ? (
              recentOrders.slice(0, 4).map((ord) => (
                <div key={ord.id} className="relative">
                  <span
                    className={`absolute -left-[22px] top-1.5 p-1 text-white rounded-full ring-4 ring-white ${getStatusBgColor(ord.current_status || "PENDING")}`}
                  >
                    {ord.current_status === "FINISHED" ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : ord.current_status === "IN_TRANSIT" ||
                      ord.current_status === "DELIVERING" ? (
                      <Truck className="w-3 h-3" />
                    ) : ord.current_status === "CANCELLED" ? (
                      <AlertTriangle className="w-3 h-3" />
                    ) : (
                      <Clock className="w-3 h-3" />
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {translateStatus(ord.current_status || "PENDING")}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Đơn hàng #{ord.tracking_number || ord.id.slice(0, 8)} gửi
                      tới {ord.receiver_address || "khách hàng"}.
                    </p>
                    <span className="text-[10px] text-slate-400 mt-2 block font-medium">
                      {new Date(ord.created_at || new Date()).toLocaleString(
                        "vi-VN",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                        },
                      )}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">
                Chưa có hoạt động nào gần đây.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// COMPONENT DASHBOARD DÀNH RIÊNG CHO TÀI XẾ (SHIPPER)
interface ShipperDashboardProps {
  user: LoggedInUser | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

function ShipperDashboard({
  user,
  onRefresh,
  isRefreshing,
}: ShipperDashboardProps) {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 border border-slate-800 shadow-lg">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">
              Tài xế: {user?.full_name}
            </h1>
            <p className="text-slate-400 mt-1 text-xs">
              Chúc bạn vạn dặm bình an! Vui lòng mở App Mobile để nhận chuyến xe
              tự động.
            </p>
          </div>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Làm mới
          </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-3">
        <Truck className="w-12 h-12 text-slate-400 mx-auto" />
        <h3 className="text-sm font-bold text-slate-750">
          Vui lòng sử dụng Ứng dụng di động
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Phần dành cho tài xế shipper được thiết kế để thao tác chủ yếu trên
          ứng dụng Flutter Mobile nhằm tối ưu hóa chức năng định vị và dẫn đường
          Google Maps.
        </p>
      </div>
    </div>
  );
}

// COMPONENT DASHBOARD DÀNH RIÊNG CHO NHÂN VIÊN ĐIỀU PHỐI (HUB COORDINATOR)
interface CoordinatorDashboardProps {
  user: LoggedInUser | null;
  adminSelectedHubId?: string;
  adminSelectedHubName?: string;
}

interface HubOverview {
  total: number;
  waiting_putaway: number;
  waiting_dispatch: number;
  sla_overdue: number;
  delivering: number;
  locations: {
    empty_slots: number;
    occupied_slots: number;
    full_slots: number;
    total: number;
  };
}

interface HubMonitorShipment {
  id: string;
  vehicle_type: string;
  vehicle_number?: string;
  tracking_number?: string;
  status: string;
  created_at: string;
  shipper?: { full_name: string; phone?: string };
  origin_hub?: { name: string };
  destination_hub?: { name: string };
}

interface HubMonitor {
  inbound: HubMonitorShipment[];
  outbound: HubMonitorShipment[];
}

function CoordinatorDashboard({
  user,
  adminSelectedHubId,
  adminSelectedHubName,
}: CoordinatorDashboardProps) {
  const [overview, setOverview] = useState<HubOverview | null>(null);
  const [monitor, setMonitor] = useState<HubMonitor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const hubId = adminSelectedHubId || user?.hub?.id;
  const hubName =
    adminSelectedHubName || user?.hub?.name || "Bưu cục chưa xác định";

  const fetchHubData = useCallback(
    async (isRef = false) => {
      if (!hubId) return;
      await Promise.resolve();
      if (isRef) setIsRefreshing(true);
      else setIsLoading(true);
      try {
        const [overRes, monRes] = await Promise.all([
          api.get(`/statistics/hub/overview?hubId=${hubId}`),
          api.get(`/statistics/hub/shipment-monitor?hubId=${hubId}`),
        ]);
        setOverview(overRes.data.data);
        setMonitor(monRes.data.data);
      } catch (e) {
        console.warn("Failed to fetch hub data", e);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [hubId],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHubData();
  }, [fetchHubData]);

  if (!hubId) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-3">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
        <h3 className="text-sm font-bold text-slate-750">
          Không thể tải dữ liệu bưu cục
        </h3>
        <p className="text-xs text-slate-500">
          Vui lòng kiểm tra lại tài khoản hoặc chọn một bưu cục để xem.
        </p>
      </div>
    );
  }

  // Calculate donut slices for locations (Warehouse Occupancy)
  const donutRadius = 50;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const totalLoc = overview?.locations?.total || 0;

  let donutSlices: { percentage: string; strokeLength: number; strokeGap: number; strokeOffset: number; status: string; count: number; color: string; label: string; }[] = [];
  if (totalLoc > 0) {
    const slices = [
      {
        status: "EMPTY",
        count: overview?.locations.empty_slots || 0,
        color: "#3B82F6",
        label: "Trống",
      },
      {
        status: "OCCUPIED",
        count: overview?.locations.occupied_slots || 0,
        color: "#F59E0B",
        label: "Đang chứa",
      },
      {
        status: "FULL",
        count: overview?.locations.full_slots || 0,
        color: "#EF4444",
        label: "Đã đầy",
      },
    ];

    let currentOffset = 0;
    donutSlices = slices.map((slice) => {
      const percentage = slice.count / totalLoc;
      const strokeLength = percentage * donutCircumference;
      const strokeGap = donutCircumference - strokeLength;
      const offset = currentOffset;
      currentOffset -= percentage * donutCircumference;
      return {
        ...slice,
        percentage: (percentage * 100).toFixed(1),
        strokeLength,
        strokeGap,
        strokeOffset: offset,
      };
    });
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-950 to-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-lg">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Trạm điều phối: {hubName}
            </h1>
            <p className="text-slate-400 mt-1.5 text-xs sm:text-sm">
              Xin chào,{" "}
              <span className="text-white font-semibold">
                {user?.full_name}
              </span>
              . Bạn đang xem dữ liệu vận hành bưu cục.
            </p>
          </div>
          <button
            onClick={() => fetchHubData(true)}
            disabled={isRefreshing || isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
            />{" "}
            Làm mới
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="min-h-[200px] flex justify-center items-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-medium">
                  Đang tồn kho (AT_HUB)
                </span>
                <span className="text-xl font-bold text-slate-800">
                  {overview?.waiting_putaway || 0} đơn
                </span>
              </div>
            </div>
            {/* Metric 2 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-medium">
                  Chờ lấy (PENDING)
                </span>
                <span className="text-xl font-bold text-slate-800">
                  {overview?.waiting_dispatch || 0} đơn
                </span>
              </div>
            </div>
            {/* Metric 3 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-medium">
                  Đang giao (DELIVERING)
                </span>
                <span className="text-xl font-bold text-slate-800">
                  {overview?.delivering || 0} đơn
                </span>
              </div>
            </div>
            {/* Metric 4 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-medium">
                  Đọng quá hạn SLA
                </span>
                <span className="text-xl font-bold text-red-600">
                  {overview?.sla_overdue || 0} đơn
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Warehouse Occupancy Chart */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col items-center">
              <h2 className="text-sm font-bold text-slate-800 mb-6 w-full text-left">
                Năng suất Kệ hàng
              </h2>
              {totalLoc === 0 ? (
                <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
                  <Package className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-700">
                    Chưa có dữ liệu Kệ hàng
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Bưu cục này chưa được thiết lập vị trí kệ hàng.
                  </p>
                </div>
              ) : (
                <div className="relative w-44 h-44 mb-6">
                  <svg className="w-full h-full" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r={donutRadius}
                      fill="transparent"
                      stroke="#F1F5F9"
                      strokeWidth="12"
                    />
                    {donutSlices.map((slice) => (
                      <circle
                        key={slice.status}
                        cx="60"
                        cy="60"
                        r={donutRadius}
                        fill="transparent"
                        stroke={slice.color}
                        strokeWidth="12"
                        strokeDasharray={`${slice.strokeLength} ${slice.strokeGap}`}
                        strokeDashoffset={slice.strokeOffset}
                        transform="rotate(-90 60 60)"
                        className="transition-all duration-700 ease-out"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col justify-center items-center">
                    <span className="text-2xl font-black text-slate-800 tracking-tight">
                      {totalLoc}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Vị trí
                    </span>
                  </div>
                </div>
              )}
              {totalLoc > 0 && (
                <div className="w-full space-y-3">
                  {donutSlices.map((slice) => (
                    <div
                      key={slice.status}
                      className="flex justify-between items-center text-xs font-semibold text-slate-700"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3 h-3 rounded-full`}
                          style={{ backgroundColor: slice.color }}
                        />
                        {slice.label}
                      </div>
                      <span>
                        {slice.count} vị trí ({slice.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shipments List */}
            <div className="lg:col-span-2 space-y-6">
              {/* Inbound */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />{" "}
                    Xe đang đến bến (Inbound)
                  </h2>
                </div>
                <div className="space-y-3">
                  {monitor?.inbound?.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                      Không có xe tải nào đang tới bưu cục.
                    </p>
                  ) : null}
                  {monitor?.inbound?.map((ship: HubMonitorShipment) => (
                    <div
                      key={ship.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center"
                    >
                      <div>
                        <div className="font-bold text-slate-800 text-sm mb-0.5">
                          {ship.vehicle_number}{" "}
                          <span className="px-1.5 py-0.5 ml-1 bg-blue-100 text-blue-800 font-semibold rounded text-[10px]">
                            {ship.status}
                          </span>
                        </div>
                        <div className="text-slate-500">
                          Từ:{" "}
                          <span className="font-semibold text-slate-700">
                            {ship.origin_hub?.name}
                          </span>{" "}
                          • Tài xế: {ship.shipper?.full_name}
                        </div>
                      </div>
                      <div className="text-right text-slate-500">
                        {new Date(ship.created_at).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Outbound */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />{" "}
                    Xe chuẩn bị xuất bến (Outbound)
                  </h2>
                </div>
                <div className="space-y-3">
                  {monitor?.outbound?.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                      Không có chuyến xe nào đang gom hàng.
                    </p>
                  ) : null}
                  {monitor?.outbound?.map((ship: HubMonitorShipment) => (
                    <div
                      key={ship.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center"
                    >
                      <div>
                        <div className="font-bold text-slate-800 text-sm mb-0.5">
                          {ship.vehicle_number || "Chưa điều phối"}{" "}
                          <span className="px-1.5 py-0.5 ml-1 bg-slate-200 text-slate-700 font-semibold rounded text-[10px]">
                            {ship.status}
                          </span>
                        </div>
                        <div className="text-slate-500">
                          Đến:{" "}
                          <span className="font-semibold text-slate-700">
                            {ship.destination_hub?.name || "Giao khách"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-slate-500">
                        {new Date(ship.created_at).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
