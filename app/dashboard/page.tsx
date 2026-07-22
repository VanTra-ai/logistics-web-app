"use client";

import { useState, useEffect, useCallback } from "react";

import {
  Package,
  Truck,
  TrendingUp,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Wallet,
  DollarSign,
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
  kpi_group: string;
  total_count: number;
  details: { status: string; count: number }[];
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
    case "ASSIGNED":
      return "Đã phân công";
    case "PICKING":
      return "Đang lấy hàng";
    case "PICKED":
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
    case "FAILED":
      return "Giao thất bại";
    case "RETURN_TO_SENDER":
      return "Chờ hoàn trả";
    default:
      return status;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "Đang thu gom":
      return "#F59E0B";
    case "Đang vận hành":
      return "#3B82F6";
    case "Sự cố & Đang hoàn":
      return "#EF4444";
    case "Thành công":
      return "#10B981";
    case "Đã trả hàng":
      return "#8B5CF6";
    case "Đã hủy":
      return "#94A3B8";
    default:
      return "#64748B";
  }
}

function getStatusBgColor(status: string): string {
  switch (status) {
    case "Đang thu gom":
      return "bg-amber-500";
    case "Đang vận hành":
      return "bg-blue-500";
    case "Thành công":
      return "bg-emerald-500";
    case "Sự cố & Đang hoàn":
      return "bg-red-500";
    case "Đã trả hàng":
      return "bg-purple-500";
    case "Đã hủy":
      return "bg-slate-400";
    default:
      return "bg-slate-400";
  }
}

export default function DashboardPage() {
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [hubs, setHubs] = useState<{ id: string; name: string }[]>([]);
  const [selectedHub, setSelectedHub] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [statsData, setStatsData] = useState<OrderStatItem[]>([]);
  const [exceptionOrders, setExceptionOrders] = useState<OrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      api
        .get("/hubs")
        .then((res) => {
          const list = res.data?.data || res.data || [];
          setHubs(
            Array.isArray(list)
              ? list.filter(
                  (h: { is_active?: boolean }) => h.is_active !== false,
                )
              : [],
          );
        })
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
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (selectedHub && selectedHub !== "ALL")
        params.append("hubId", selectedHub);
      const response = await api.get(`/orders/statistics?${params.toString()}`);
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
          userRole === "CUSTOMER"
            ? "/orders/me"
            : "/orders?status=FAILED,RETURN_REQUESTED",
        );
        const ordData = ordersRes.data?.data || ordersRes.data || [];
        if (Array.isArray(ordData)) {
          ordData.sort(
            (a: OrderData, b: OrderData) =>
              new Date(b.created_at || "").getTime() -
              new Date(a.created_at || "").getTime(),
          );
          setExceptionOrders(ordData.slice(0, 5));
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
      if (user) fetchStatistics();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedHub, startDate, endDate]);

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
  const getStatusCount = (groupName: string) => {
    const item = statsData.find((s) => s.kpi_group === groupName);
    return item ? item.total_count : 0;
  };

  const totalOrders = statsData.reduce(
    (acc, curr) => acc + curr.total_count,
    0,
  );
  const finishedCount = getStatusCount("Thành công");
  const deliveringCount = getStatusCount("Đang vận hành");
  const pendingCount = getStatusCount("Đang thu gom");

  // LOGIC VẼ BIỂU ĐỒ TRÒN DONUT
  // Đường tròn bán kính r=50 -> Chu vi = 2 * pi * r = 314.16
  const donutRadius = 50;
  const donutCircumference = 2 * Math.PI * donutRadius; // 314.159
  const donutSlices = statsData.map((item, index) => {
    const count = item.total_count;
    const percentage = totalOrders > 0 ? count / totalOrders : 0;
    const strokeLength = percentage * donutCircumference;
    const strokeGap = donutCircumference - strokeLength;

    const accumulatedPercentageBefore = statsData
      .slice(0, index)
      .reduce(
        (sum, curr) =>
          sum + (totalOrders > 0 ? curr.total_count / totalOrders : 0),
        0,
      );

    const strokeOffset = accumulatedPercentageBefore * donutCircumference;

    return {
      kpi_group: item.kpi_group,
      count,
      percentage: (percentage * 100).toFixed(1),
      strokeLength,
      strokeGap,
      strokeOffset: -strokeOffset,
      color: getStatusColor(item.kpi_group),
      details: item.details,
    };
  });

  // LOGIC VẼ BIỂU ĐỒ CỘT (BAR CHART)
  const maxCount = Math.max(...statsData.map((s) => s.total_count), 1);
  const barChartHeight = 160;

  if (user?.role === "HUB_COORDINATOR") {
    return <CoordinatorDashboard user={user} />;
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
          <div className="flex flex-wrap items-center gap-3">
            {user?.role === "ADMIN" && (
              <>
                <select
                  value={selectedHub}
                  onChange={(e) => setSelectedHub(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="ALL">Toàn hệ thống</option>
                  {hubs.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500/50">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      Từ
                    </span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-transparent border-none text-sm font-medium outline-none text-slate-200 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                    />
                  </div>
                  <div className="w-px h-5 bg-slate-700" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      Đến
                    </span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-transparent border-none text-sm font-medium outline-none text-slate-200 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                    />
                  </div>
                </div>
              </>
            )}
            <button
              onClick={() => fetchStatistics(true)}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 font-medium text-sm rounded-xl transition-all active:scale-[0.98] cursor-pointer disabled:opacity-55"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Làm mới
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
                  Đơn đang vận chuyển
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
                  Đơn giao thành công
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
                  Đơn chờ lấy hàng
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
                  Tỷ lệ phân bổ trạng thái
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
                          key={slice.kpi_group}
                          cx="60"
                          cy="60"
                          r={donutRadius}
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth="12"
                          strokeDasharray={`${slice.strokeLength} ${slice.strokeGap}`}
                          strokeDashoffset={slice.strokeOffset}
                          transform="rotate(-90 60 60)"
                          className="transition-all duration-700 ease-out hover:stroke-[14px] cursor-pointer"
                        >
                          <title>
                            {slice.kpi_group}
                            {slice.details
                              ?.map(
                                (d: { status: string; count: number }) =>
                                  `- ${translateStatus(d.status)}: ${d.count}`,
                              )
                              .join("\n")}
                          </title>
                        </circle>
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

                <div className="space-y-3.5 w-full sm:w-auto">
                  {donutSlices.map((slice) => (
                    <div
                      key={slice.kpi_group}
                      className="flex items-center justify-between sm:justify-start gap-6 text-sm group relative"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-3.5 h-3.5 rounded-md ${getStatusBgColor(slice.kpi_group)}`}
                        />
                        <span className="font-semibold text-slate-700 w-32 truncate">
                          {slice.kpi_group}
                        </span>
                      </div>
                      <div className="text-right relative">
                        <span className="font-bold text-slate-800">
                          {slice.count}
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
                    const barHeight =
                      (item.total_count / maxCount) * barChartHeight;
                    return (
                      <div
                        key={item.kpi_group}
                        className="flex flex-col items-center group w-16 relative"
                      >
                        {/* Tooltip value */}
                        <div className="absolute -top-12 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] px-2 py-1 rounded font-bold pointer-events-none whitespace-pre shadow text-center min-w-max">
                          <div className="mb-1">
                            {item.kpi_group} ({item.total_count})
                          </div>
                          {item.details?.map(
                            (d: { status: string; count: number }) => (
                              <div key={d.status} className="font-normal">
                                - {translateStatus(d.status)}: {d.count}
                              </div>
                            ),
                          )}
                        </div>
                        {/* Bar */}
                        <div
                          className="w-8 rounded-t-lg transition-all duration-700 ease-out cursor-pointer hover:brightness-95"
                          style={{
                            height: `${Math.max(barHeight, 6)}px`,
                            backgroundColor: getStatusColor(item.kpi_group),
                            boxShadow: `0 4px 6px -1px ${getStatusColor(item.kpi_group)}20`,
                          }}
                        />
                        <span className="text-[10px] text-slate-400 font-bold mt-2 truncate w-full text-center">
                          {item.kpi_group}
                        </span>
                        <span className="text-xs font-extrabold text-slate-800 mt-0.5">
                          {item.total_count}
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
        <div>
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h2 className="text-lg font-bold text-red-600 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Cảnh báo sự cố (Exceptions)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Danh sách đơn hàng Giao thất bại hoặc Yêu cầu hoàn trả
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
                {exceptionOrders.map((order: OrderData) => (
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
                    <td className="px-6 py-4 text-slate-600">{order.weight}</td>
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
                      <button className="px-3 py-1.5 bg-red-50 hover:bg-red-600 hover:text-white text-red-700 text-xs font-semibold rounded-lg transition-all cursor-pointer">
                        Xử lý
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
            Hiển thị {Math.min(exceptionOrders.length, 5)} trên tổng số đơn hàng
            sự cố.
          </span>
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

interface ShipperShipment {
  id: string;
  tracking_number?: string;
  vehicle_type?: string;
  vehicle_number?: string;
  status: string;
  created_at: string;
  origin_hub?: { name: string };
  destination_hub?: { name: string };
  orders?: {
    id: string;
    tracking_number: string;
    receiver_name: string;
    receiver_address: string;
    cod_amount: number;
    current_status: string;
    delivery_sequence?: number;
    created_at?: string;
  }[];
}

interface ShipperWalletInfo {
  cod_debt: number;
  income_balance: number;
  transactions?: {
    id: string;
    type: string;
    amount: number;
    created_at?: string;
    date?: string;
    status?: string;
  }[];
}

function ShipperDashboard({
  user,
  onRefresh,
  isRefreshing,
}: ShipperDashboardProps) {
  const [shipments, setShipments] = useState<ShipperShipment[]>([]);
  const [wallet, setWallet] = useState<ShipperWalletInfo>({
    cod_debt: 0,
    income_balance: 0,
    transactions: [],
  });
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Date range filter state (Default 30 days)
  const today = new Date();
  const defaultFrom = new Date(today);
  defaultFrom.setDate(defaultFrom.getDate() - 30);
  const [dateFrom, setDateFrom] = useState(
    defaultFrom.toISOString().slice(0, 10),
  );
  const [dateTo, setDateTo] = useState(today.toISOString().slice(0, 10));

  const fetchShipperData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [shipRes, walletRes] = await Promise.allSettled([
        api.get("/shipments/me?limit=200"), // Endpoint chuẩn dành riêng cho SHIPPER
        api.get("/wallets/me"), // Endpoint ví dành riêng cho SHIPPER
      ]);

      if (shipRes.status === "fulfilled" && shipRes.value.data) {
        const rawData = shipRes.value.data.data || shipRes.value.data;
        if (Array.isArray(rawData)) {
          setShipments(rawData);
        }
      }

      if (walletRes.status === "fulfilled" && walletRes.value.data) {
        const w = walletRes.value.data.data || walletRes.value.data;
        if (w && typeof w === "object" && !Array.isArray(w)) {
          setWallet({
            cod_debt: Number(w.cod_debt) || 0,
            income_balance: Number(w.income_balance) || 0,
            transactions: w.transactions || [],
          });
        }
      }
    } catch (err) {
      console.warn("Lỗi tải dữ liệu tài xế:", err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchShipperData();
    }, 0);
    return () => clearTimeout(t);
  }, [fetchShipperData]);

  // Filter all orders by date range
  const allOrdersRaw = shipments.flatMap((s) =>
    (s.orders || []).map((o) => ({
      ...o,
      created_at: o.created_at || s.created_at,
    })),
  );

  const fromDate = new Date(dateFrom);
  fromDate.setHours(0, 0, 0, 0);
  const toDate = new Date(dateTo);
  toDate.setHours(23, 59, 59, 999);

  const allOrders = allOrdersRaw.filter((o) => {
    if (!o.created_at) return true;
    const d = new Date(o.created_at);
    return d >= fromDate && d <= toDate;
  });

  // 4 Status Groups
  const pendingOrders = allOrders.filter((o) =>
    ["PENDING", "AT_HUB", "READY_FOR_DISPATCH"].includes(
      o.current_status || "PENDING",
    ),
  );
  const deliveringOrders = allOrders.filter((o) =>
    ["IN_TRANSIT", "DELIVERING", "DISPATCHED", "PICKING", "RETURNING"].includes(
      o.current_status,
    ),
  );
  const successOrders = allOrders.filter((o) =>
    ["FINISHED", "DELIVERED", "COMPLETED"].includes(o.current_status),
  );
  const incidentOrders = allOrders.filter((o) =>
    [
      "FAILED",
      "RETURN_TO_SENDER",
      "DAMAGED_DESTROYED",
      "INCIDENT",
      "CANCELLED",
    ].includes(o.current_status),
  );

  const pendingCount = pendingOrders.length;
  const deliveringCount = deliveringOrders.length;
  const successCount = successOrders.length;
  const incidentCount = incidentOrders.length;

  const totalAssignedOrders = allOrders.length;
  const completionRate =
    totalAssignedOrders > 0
      ? Math.round((successCount / totalAssignedOrders) * 100)
      : 0;

  const activeShipment = shipments.find((s) => {
    const orders = s.orders || [];
    if (orders.length === 0) return false;
    const unFinished = orders.filter(
      (o) =>
        ![
          "FINISHED",
          "DELIVERED",
          "COMPLETED",
          "CANCELLED",
          "RETURN_TO_SENDER",
          "DAMAGED_DESTROYED",
        ].includes(o.current_status),
    );
    return (
      unFinished.length > 0 &&
      (s.status === "IN_TRANSIT" ||
        s.status === "DISPATCHED" ||
        s.status === "PENDING")
    );
  });

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  // Donut chart
  const shipperStatsData = [
    { label: "Chờ xử lý", count: pendingCount, color: "#F59E0B" },
    { label: "Đang giao", count: deliveringCount, color: "#3B82F6" },
    { label: "Thành công", count: successCount, color: "#10B981" },
    { label: "Sự cố", count: incidentCount, color: "#EF4444" },
  ];

  const donutRadius = 50;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let currentOffset = 0;
  const donutSlices = shipperStatsData.map((slice) => {
    const percentage =
      totalAssignedOrders > 0 ? slice.count / totalAssignedOrders : 0;
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

  // Build daily delivery line chart data for last 7 days in range
  const dayLabels: string[] = [];
  const dailyDelivered: number[] = [];
  const dailyAssigned: number[] = [];

  const rangeMs = toDate.getTime() - fromDate.getTime();
  const rangeDays = Math.min(
    Math.ceil(rangeMs / (1000 * 60 * 60 * 24)) + 1,
    14,
  );
  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(toDate);
    d.setDate(d.getDate() - i);
    const label = `${d.getDate()}/${d.getMonth() + 1}`;
    dayLabels.push(label);

    const dayStr = d.toISOString().slice(0, 10);
    const dayOrders = allOrdersRaw.filter(
      (o) => o.created_at && o.created_at.slice(0, 10) === dayStr,
    );
    dailyAssigned.push(dayOrders.length);
    dailyDelivered.push(
      dayOrders.filter((o) =>
        ["FINISHED", "DELIVERED"].includes(o.current_status),
      ).length,
    );
  }

  const maxLineVal = Math.max(...dailyAssigned, ...dailyDelivered, 1);
  const chartW = 340;
  const chartH = 120;
  const pad = 10;
  const innerW = chartW - pad * 2;
  const innerH = chartH - pad * 2;

  const toPoint = (val: number, idx: number) => {
    const x = pad + (idx / Math.max(dayLabels.length - 1, 1)) * innerW;
    const y = pad + innerH - (val / maxLineVal) * innerH;
    return `${x},${y}`;
  };

  const assignedPoints = dailyAssigned.map((v, i) => toPoint(v, i)).join(" ");
  const deliveredPoints = dailyDelivered.map((v, i) => toPoint(v, i)).join(" ");

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Đang trực ca giao hàng
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight mt-2">
              Chào tài xế, {user?.full_name || "Shipper"}! 👋
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm">
              Theo dõi chính xác ví thu hộ COD, thu nhập cá nhân và lộ trình đơn
              hàng.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            {/* Date Range Filter */}
            <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer"
              />
              <span className="text-slate-500 text-xs">→</span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom}
                max={today.toISOString().slice(0, 10)}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer"
              />
            </div>
            <button
              onClick={() => {
                onRefresh();
                fetchShipperData();
              }}
              disabled={isRefreshing || isLoadingData}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 shadow-md"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing || isLoadingData ? "animate-spin" : ""}`}
              />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Grid (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Nợ COD */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Nợ COD (Tiền đang giữ)
            </span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-800 font-mono tracking-tight">
              {isLoadingData ? (
                <span className="text-slate-300 animate-pulse">
                  Đang tải...
                </span>
              ) : (
                formatVND(wallet.cod_debt)
              )}
            </h3>
            <p className="text-[11px] text-amber-600 font-medium mt-1">
              Khớp dữ liệu ví đối soát bưu cục
            </p>
          </div>
        </div>

        {/* Card 2: Thu nhập tạm tính */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Thu nhập tạm tính
            </span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-emerald-600 font-mono tracking-tight">
              {isLoadingData ? (
                <span className="text-slate-300 animate-pulse">
                  Đang tải...
                </span>
              ) : (
                formatVND(wallet.income_balance)
              )}
            </h3>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">
              Hoa hồng + thưởng giao thành công
            </p>
          </div>
        </div>

        {/* Card 3: Tổng đơn phân công */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Đơn hàng trong kỳ
            </span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
              {totalAssignedOrders}{" "}
              <span className="text-xs font-medium text-slate-400">đơn</span>
            </h3>
            <p className="text-[11px] text-blue-600 font-medium mt-1">
              Trong khoảng thời gian đã chọn
            </p>
          </div>
        </div>

        {/* Card 4: Tỷ lệ hoàn thành */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Tỷ lệ giao thành công
            </span>
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
                {successCount} / {totalAssignedOrders}
              </h3>
              <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                {completionRate}%
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-purple-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Donut - Tỷ lệ trạng thái */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Tỷ lệ phân bổ trạng thái đơn hàng
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Phần trăm tổng đơn hàng theo 4 trạng thái vận hành
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around py-6 gap-6">
            <div className="relative w-40 h-40 shrink-0">
              <svg className="w-full h-full" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r={donutRadius}
                  fill="transparent"
                  stroke="#F1F5F9"
                  strokeWidth="12"
                />
                {totalAssignedOrders > 0 &&
                  donutSlices.map((slice) => (
                    <circle
                      key={slice.label}
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
                    >
                      <title>{`${slice.label}: ${slice.count} đơn (${slice.percentage}%)`}</title>
                    </circle>
                  ))}
              </svg>
              <div className="absolute inset-0 flex flex-col justify-center items-center">
                <span className="text-2xl font-black text-slate-800 tracking-tight">
                  {totalAssignedOrders}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Đơn hàng
                </span>
              </div>
            </div>

            <div className="space-y-3 w-full sm:w-auto">
              {shipperStatsData.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-6 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-md shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-semibold text-slate-700">
                      {item.label}
                    </span>
                  </div>
                  <div className="text-right font-bold text-slate-800">
                    {item.count}{" "}
                    <span className="text-[11px] font-normal text-slate-400">
                      (
                      {totalAssignedOrders > 0
                        ? ((item.count / totalAssignedOrders) * 100).toFixed(0)
                        : 0}
                      %)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 2: Line Chart - Tiến độ giao hàng từng ngày */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-800">
              Tiến độ giao hàng theo ngày
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Số đơn được phân công và giao thành công mỗi ngày trong kỳ
            </p>
          </div>

          <div className="flex-1 relative">
            {dayLabels.length > 0 ? (
              <svg
                viewBox={`0 0 ${chartW} ${chartH + 24}`}
                className="w-full"
                preserveAspectRatio="none"
              >
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                  const y = pad + innerH * (1 - frac);
                  return (
                    <line
                      key={frac}
                      x1={pad}
                      y1={y}
                      x2={chartW - pad}
                      y2={y}
                      stroke="#F1F5F9"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Assigned line (blue) */}
                <polyline
                  points={assignedPoints}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {/* Delivered line (green) */}
                <polyline
                  points={deliveredPoints}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {/* Dots - Assigned */}
                {dailyAssigned.map((v, i) => {
                  const [x, y] = toPoint(v, i).split(",").map(Number);
                  return (
                    <circle
                      key={`a-${i}`}
                      cx={x}
                      cy={y}
                      r="3"
                      fill="#3B82F6"
                      stroke="white"
                      strokeWidth="1.5"
                    >
                      <title>{`${dayLabels[i]}: ${v} đơn phân công`}</title>
                    </circle>
                  );
                })}
                {/* Dots - Delivered */}
                {dailyDelivered.map((v, i) => {
                  const [x, y] = toPoint(v, i).split(",").map(Number);
                  return (
                    <circle
                      key={`d-${i}`}
                      cx={x}
                      cy={y}
                      r="3"
                      fill="#10B981"
                      stroke="white"
                      strokeWidth="1.5"
                    >
                      <title>{`${dayLabels[i]}: ${v} đơn thành công`}</title>
                    </circle>
                  );
                })}

                {/* X axis labels */}
                {dayLabels.map((label, i) => {
                  const x =
                    pad + (i / Math.max(dayLabels.length - 1, 1)) * innerW;
                  return (
                    <text
                      key={label}
                      x={x}
                      y={chartH + 18}
                      textAnchor="middle"
                      fontSize="8"
                      fill="#94A3B8"
                    >
                      {label}
                    </text>
                  );
                })}
              </svg>
            ) : (
              <div className="flex items-center justify-center h-32 text-slate-400 text-xs">
                Không có dữ liệu trong khoảng thời gian này
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 mt-2 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 bg-blue-500 rounded" />
                <span className="text-slate-500">Đơn phân công</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 bg-emerald-500 rounded" />
                <span className="text-slate-500">Giao thành công</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Active Shipment & Orders List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Current Shipment */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <Truck className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-800">
                  Chuyến xe phân công hiện tại
                </h2>
              </div>
              {activeShipment && (
                <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                  {activeShipment.status}
                </span>
              )}
            </div>

            <div className="p-5">
              {activeShipment ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">
                        Mã chuyến xe
                      </span>
                      <span className="font-bold text-slate-800 font-mono text-sm">
                        {activeShipment.tracking_number ||
                          activeShipment.id.slice(0, 8)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">
                        Bưu cục xuất phát
                      </span>
                      <span className="font-semibold text-slate-700">
                        {activeShipment.origin_hub?.name || "Bưu cục Trung Tâm"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">
                        Bưu cục đích
                      </span>
                      <span className="font-semibold text-slate-700">
                        {activeShipment.destination_hub?.name ||
                          "Bưu cục Giao nhận 1"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">
                        Phương tiện
                      </span>
                      <span className="font-semibold text-slate-700">
                        {activeShipment.vehicle_number || "Xe máy / Tải nhẹ"}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="px-4 py-3">STT</th>
                          <th className="px-4 py-3">Mã đơn</th>
                          <th className="px-4 py-3">Người nhận & Địa chỉ</th>
                          <th className="px-4 py-3 text-right">Tiền COD</th>
                          <th className="px-4 py-3 text-center">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {(activeShipment.orders ?? []).map((ord, idx) => (
                          <tr
                            key={ord.id}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="px-4 py-3 font-bold text-blue-600">
                              #{ord.delivery_sequence || idx + 1}
                            </td>
                            <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                              {ord.tracking_number}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-800">
                                {ord.receiver_name}
                              </p>
                              <p className="text-slate-500 text-[11px] truncate max-w-xs">
                                {ord.receiver_address}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                              {formatVND(ord.cod_amount || 0)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  ["FINISHED", "DELIVERED"].includes(
                                    ord.current_status,
                                  )
                                    ? "bg-emerald-50 text-emerald-700"
                                    : [
                                          "FAILED",
                                          "RETURN_TO_SENDER",
                                          "DAMAGED_DESTROYED",
                                        ].includes(ord.current_status)
                                      ? "bg-red-50 text-red-700"
                                      : ord.current_status === "PENDING"
                                        ? "bg-amber-50 text-amber-700"
                                        : "bg-blue-50 text-blue-700"
                                }`}
                              >
                                {["FINISHED", "DELIVERED"].includes(
                                  ord.current_status,
                                )
                                  ? "Thành công"
                                  : ["FAILED", "RETURN_TO_SENDER"].includes(
                                        ord.current_status,
                                      )
                                    ? "Sự cố"
                                    : ord.current_status === "PENDING"
                                      ? "Chờ xử lý"
                                      : "Đang giao"}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {(activeShipment.orders ?? []).length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-4 py-8 text-center text-slate-400 text-xs"
                            >
                              Chưa có đơn hàng trong chuyến xe này
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 space-y-2">
                  <Truck className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-slate-500 text-xs font-medium">
                    Hiện không có chuyến xe giao hàng nào được gán.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg space-y-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                App Flutter Mobile Shipper
              </h3>
              <p className="text-blue-100 text-xs mt-1 leading-relaxed">
                Tối ưu hóa định tuyến GPS, mở trực tiếp bản đồ Google Maps và
                cập nhật trạng thái đơn hàng real-time.
              </p>
            </div>
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-semibold">
              <span>Trạng thái kết nối:</span>
              <span className="px-2 py-0.5 bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 rounded-md">
                Đã sẵn sàng
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Lối tắt quản lý
            </h3>
            <a
              href="/dashboard/finance/wallets"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 transition-colors text-xs font-semibold text-slate-700 group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Wallet className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
                <span>Xem chi tiết Ví & Đối soát COD</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
            </a>
            <a
              href="/dashboard/my-incidents"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-red-50 hover:text-red-600 transition-colors text-xs font-semibold text-slate-700 group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-slate-500 group-hover:text-red-600" />
                <span>Sự cố đơn hàng của tôi</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-red-600" />
            </a>
          </div>
        </div>
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
  const [orderStats, setOrderStats] = useState<OrderStatItem[]>([]);
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
        const [overRes, monRes, statsRes] = await Promise.all([
          api.get(`/statistics/hub/overview?hubId=${hubId}`),
          api.get(`/statistics/hub/shipment-monitor?hubId=${hubId}`),
          api.get(`/orders/statistics?hubId=${hubId}`),
        ]);
        setOverview(overRes.data.data);
        setMonitor(monRes.data.data);
        setOrderStats(statsRes.data?.data || statsRes.data || []);
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

  let donutSlices: {
    percentage: string;
    strokeLength: number;
    strokeGap: number;
    strokeOffset: number;
    status: string;
    count: number;
    color: string;
    label: string;
  }[] = [];
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

  // Calculate order stats donut
  const totalOrderStats = orderStats.reduce(
    (acc, item) => acc + item.total_count,
    0,
  );
  const orderDonutSlices = orderStats.reduce(
    (acc, item) => {
      const percentage =
        totalOrderStats > 0 ? item.total_count / totalOrderStats : 0;
      const strokeLength = percentage * donutCircumference;
      const strokeGap = donutCircumference - strokeLength;
      const offset = acc.currentOffset;

      acc.slices.push({
        kpi_group: item.kpi_group,
        count: item.total_count,
        percentage: (percentage * 100).toFixed(1),
        strokeLength,
        strokeGap,
        strokeOffset: offset,
        color: getStatusColor(item.kpi_group),
        details: item.details,
      });

      acc.currentOffset -= percentage * donutCircumference;
      return acc;
    },
    {
      slices: [] as {
        kpi_group: string;
        count: number;
        percentage: string;
        strokeLength: number;
        strokeGap: number;
        strokeOffset: number;
        color: string;
        details: { status: string; count: number }[];
      }[],
      currentOffset: 0,
    },
  ).slices;

  const maxOrderCount = Math.max(...orderStats.map((s) => s.total_count), 1);
  const barChartHeight = 160;

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

          {/* Order Stats Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Custom SVG Donut Chart Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Tỷ lệ phân bổ trạng thái
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Phần trăm phân bổ đơn hàng dựa trên trạng thái
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-around py-8 gap-8">
                {/* SVG Donut */}
                <div className="relative w-44 h-44">
                  <svg className="w-full h-full" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r={donutRadius}
                      fill="transparent"
                      stroke="#F1F5F9"
                      strokeWidth="12"
                    />
                    {totalOrderStats > 0 &&
                      orderDonutSlices.map((slice) => (
                        <circle
                          key={slice.kpi_group}
                          cx="60"
                          cy="60"
                          r={donutRadius}
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth="12"
                          strokeDasharray={`${slice.strokeLength} ${slice.strokeGap}`}
                          strokeDashoffset={slice.strokeOffset}
                          transform="rotate(-90 60 60)"
                          className="transition-all duration-700 ease-out hover:stroke-[14px] cursor-pointer"
                        >
                          <title>
                            {slice.kpi_group}
                            {slice.details
                              ?.map(
                                (d: { status: string; count: number }) =>
                                  `- ${translateStatus(d.status)}: ${d.count}`,
                              )
                              .join("\n")}
                          </title>
                        </circle>
                      ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col justify-center items-center">
                    <span className="text-2xl font-black text-slate-800 tracking-tight">
                      {totalOrderStats}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Đơn hàng
                    </span>
                  </div>
                </div>

                <div className="space-y-3.5 w-full sm:w-auto">
                  {orderDonutSlices.map((slice) => (
                    <div
                      key={slice.kpi_group}
                      className="flex items-center justify-between sm:justify-start gap-6 text-sm group relative"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-3.5 h-3.5 rounded-md ${getStatusBgColor(slice.kpi_group)}`}
                        />
                        <span className="font-semibold text-slate-700 w-32 truncate">
                          {slice.kpi_group}
                        </span>
                      </div>
                      <div className="text-right relative">
                        <span className="font-bold text-slate-800">
                          {slice.count}
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
              <div className="relative py-6">
                <div className="w-full h-48 flex items-end justify-around border-b border-slate-200 px-4">
                  {orderStats.map((item) => {
                    const barHeight =
                      (item.total_count / maxOrderCount) * barChartHeight;
                    return (
                      <div
                        key={item.kpi_group}
                        className="flex flex-col items-center group w-16 relative"
                      >
                        <div className="absolute -top-12 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] px-2 py-1 rounded font-bold pointer-events-none whitespace-pre shadow text-center min-w-max">
                          <div className="mb-1">
                            {item.kpi_group} ({item.total_count})
                          </div>
                          {item.details?.map(
                            (d: { status: string; count: number }) => (
                              <div key={d.status} className="font-normal">
                                - {translateStatus(d.status)}: {d.count}
                              </div>
                            ),
                          )}
                        </div>
                        <div
                          className="w-8 rounded-t-lg transition-all duration-700 ease-out cursor-pointer hover:brightness-95"
                          style={{
                            height: `${Math.max(barHeight, 6)}px`,
                            backgroundColor: getStatusColor(item.kpi_group),
                            boxShadow: `0 4px 6px -1px ${getStatusColor(item.kpi_group)}20`,
                          }}
                        />
                        <span className="text-[10px] text-slate-400 font-bold mt-2 truncate w-full text-center">
                          {item.kpi_group}
                        </span>
                        <span className="text-xs font-extrabold text-slate-800 mt-0.5">
                          {item.total_count}
                        </span>
                      </div>
                    );
                  })}
                </div>
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
