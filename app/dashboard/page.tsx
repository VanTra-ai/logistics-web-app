"use client";

import { useState, useEffect } from "react";
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

const mockRecentOrders = [
  {
    id: "ORD-9481",
    customer: "Nguyễn Văn A",
    destination: "Bưu cục Cầu Giấy",
    weight: "4.5 kg",
    status: "PENDING",
    time: "10 phút trước",
  },
  {
    id: "ORD-9482",
    customer: "Trần Thị B",
    destination: "Bưu cục Quận 1",
    weight: "12.0 kg",
    status: "PICKED_UP",
    time: "25 phút trước",
  },
  {
    id: "ORD-9483",
    customer: "Lê Hoàng C",
    destination: "Bưu cục Hải Phòng",
    weight: "1.2 kg",
    status: "PENDING",
    time: "1 giờ trước",
  },
  {
    id: "ORD-9484",
    customer: "Phạm Minh D",
    destination: "Bưu cục Đà Nẵng",
    weight: "25.8 kg",
    status: "IN_TRANSIT",
    time: "2 giờ trước",
  },
  {
    id: "ORD-9485",
    customer: "Đỗ Thanh E",
    destination: "Bưu cục Thủ Đức",
    weight: "8.1 kg",
    status: "DELIVERED",
    time: "3 giờ trước",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<LoggedInUser | null>(null);

  // Các trạng thái dữ liệu thống kê
  const [statsData, setStatsData] = useState<OrderStatItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
        setIsDemoMode(false);
      } else {
        throw new Error("Dữ liệu thống kê không hợp lệ");
      }
    } catch (error) {
      console.warn(
        "Không kết nối được API /orders/statistics. Sử dụng dữ liệu giả lập.",
        error,
      );
      // Fallback sang dữ liệu giả lập (Demo Mode)
      setStatsData([
        { status: "PENDING", count: 320 },
        { status: "DELIVERING", count: 450 },
        { status: "FINISHED", count: 420 },
        { status: "CANCELLED", count: 58 },
      ]);
      setIsDemoMode(true);
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

  // Quy đổi tên trạng thái sang Tiếng Việt
  const translateStatus = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Chờ xử lý";
      case "DELIVERING":
        return "Đang giao";
      case "FINISHED":
        return "Hoàn thành";
      case "CANCELLED":
        return "Đã hủy";
      default:
        return status;
    }
  };

  // Màu sắc tương ứng cho các trạng thái
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "#F59E0B"; // Amber
      case "DELIVERING":
        return "#3B82F6"; // Blue
      case "FINISHED":
        return "#10B981"; // Emerald
      case "CANCELLED":
        return "#EF4444"; // Red
      default:
        return "#64748B"; // Slate
    }
  };

  const getStatusBgColor = (status: string) => {
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
  };

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
    return (
      <CoordinatorDashboard
        user={user}
        isDemoMode={isDemoMode}
        onRefresh={() => fetchStatistics(true)}
        isRefreshing={isRefreshing}
      />
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Fallback Warning Alert for Demo Mode */}
      {isDemoMode && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold">
              Đang chạy ở chế độ giả lập (Demo Mode):
            </span>{" "}
            Không kết nối được tới API thống kê đơn hàng của Backend
            (`http://localhost:3333/orders/statistics`). Dưới đây là thông số
            giả lập để hỗ trợ xem trước UI.
          </div>
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
                  {mockRecentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {order.id}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {order.customer}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {order.destination}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {order.weight}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            order.status === "PENDING"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : order.status === "PICKED_UP"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : order.status === "IN_TRANSIT"
                                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              order.status === "PENDING"
                                ? "bg-amber-500"
                                : order.status === "PICKED_UP"
                                  ? "bg-blue-500"
                                  : order.status === "IN_TRANSIT"
                                    ? "bg-purple-500"
                                    : "bg-emerald-500"
                            }`}
                          />
                          {order.status === "PENDING"
                            ? "Chờ xử lý"
                            : order.status === "PICKED_UP"
                              ? "Đã lấy"
                              : order.status === "IN_TRANSIT"
                                ? "Đang giao"
                                : "Thành công"}
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
            {/* Feed 1 */}
            <div className="relative">
              <span className="absolute -left-[22px] top-1.5 p-1 bg-amber-500 text-white rounded-full ring-4 ring-white">
                <Clock className="w-3 h-3" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Cảnh báo trễ chuyến xe
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chuyến xe #SHIP-298 đi Hải Phòng trễ 15 phút do thời tiết.
                </p>
                <span className="text-[10px] text-slate-400 mt-2 block font-medium">
                  5 phút trước
                </span>
              </div>
            </div>

            {/* Feed 2 */}
            <div className="relative">
              <span className="absolute -left-[22px] top-1.5 p-1 bg-emerald-500 text-white rounded-full ring-4 ring-white">
                <CheckCircle2 className="w-3 h-3" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Giao hàng thành công
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Shipper Nguyễn Hoàng Nam đã hoàn thành đơn hàng #ORD-9428.
                </p>
                <span className="text-[10px] text-slate-400 mt-2 block font-medium">
                  20 phút trước
                </span>
              </div>
            </div>

            {/* Feed 3 */}
            <div className="relative">
              <span className="absolute -left-[22px] top-1.5 p-1 bg-blue-500 text-white rounded-full ring-4 ring-white">
                <Truck className="w-3 h-3" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Khởi hành chuyến xe
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tài xế Vũ Văn Bách đã xuất bến tuyến Cầu Giấy - Hà Đông.
                </p>
                <span className="text-[10px] text-slate-400 mt-2 block font-medium">
                  45 phút trước
                </span>
              </div>
            </div>

            {/* Feed 4 */}
            <div className="relative">
              <span className="absolute -left-[22px] top-1.5 p-1 bg-red-500 text-white rounded-full ring-4 ring-white">
                <AlertTriangle className="w-3 h-3" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Báo lỗi sự cố
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Yêu cầu hỗ trợ kỹ thuật tại Bưu cục Hải Phòng: Hỏng máy quét
                  mã vạch.
                </p>
                <span className="text-[10px] text-slate-400 mt-2 block font-medium">
                  1 giờ trước
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// COMPONENT DASHBOARD DÀNH RIÊNG CHO NHÂN VIÊN ĐIỀU PHỐI (HUB COORDINATOR)
interface CoordinatorDashboardProps {
  user: LoggedInUser | null;
  isDemoMode: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

function CoordinatorDashboard({
  user,
  isDemoMode,
  onRefresh,
  isRefreshing,
}: CoordinatorDashboardProps) {
  // Trạng thái cục bộ cho bưu cục
  const hubName = user?.hub?.name || "Bưu cục Cầu Giấy";

  // Dữ liệu giả lập thời gian thực cho bưu cục
  const localMetrics = {
    trucksWaiting: 3,
    sortingPending: 18,
    slaOverdue: 2,
    totalAtHub: 45,
  };

  const outboundShipments = [
    {
      id: "ship-101",
      driver: "Nguyễn Hoàng Nam",
      phone: "0912345678",
      vehicle: "29C-888.88",
      dest: "Bưu cục Hải Phòng",
      time: "21:30",
      fill: 85,
      status: "PENDING",
    },
    {
      id: "ship-102",
      driver: "Vũ Văn Bách",
      phone: "0945678901",
      vehicle: "30E-999.99",
      dest: "Bưu cục Đà Nẵng",
      time: "23:00",
      fill: 40,
      status: "PENDING",
    },
  ];

  const inboundShipments = [
    {
      id: "ship-201",
      driver: "Trần Văn Luận",
      vehicle: "15C-123.45",
      origin: "Bưu cục Hải Phòng",
      eta: "21:15",
      status: "IN_TRANSIT",
    },
    {
      id: "ship-202",
      driver: "Lê Minh Tuấn",
      vehicle: "51D-543.21",
      origin: "Bưu cục Quận 1",
      eta: "22:45",
      status: "IN_TRANSIT",
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Demo Warning */}
      {isDemoMode && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-start gap-3 shadow-sm text-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Đang hiển thị dữ liệu giám sát:</span>{" "}
            Thống kê hoạt động dựa trên thông số cục bộ của{" "}
            <span className="font-bold">{hubName}</span>.
          </div>
        </div>
      )}

      {/* Banner chào mừng */}
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
              . Bạn đang trực điều hành ca làm việc tại bưu cục.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* Grid chỉ số thời gian thực */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block font-medium">
              Xe chờ bốc dỡ
            </span>
            <span className="text-xl font-bold text-slate-800">
              {localMetrics.trucksWaiting} chuyến
            </span>
          </div>
        </div>
        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block font-medium">
              Cần phân loại
            </span>
            <span className="text-xl font-bold text-slate-800">
              {localMetrics.sortingPending} đơn
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
              Tổng tồn kho bãi
            </span>
            <span className="text-xl font-bold text-slate-800">
              {localMetrics.totalAtHub} kiện
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
              {localMetrics.slaOverdue} đơn
            </span>
          </div>
        </div>
      </div>

      {/* Timeline Xe tải Inbound & Outbound */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inbound timeline */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              Chuyến xe đang đến bến (Inbound)
            </h2>
            <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
              Thời gian thực
            </span>
          </div>

          <div className="space-y-3">
            {inboundShipments.map((ship) => (
              <div
                key={ship.id}
                className="p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl transition-all flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">
                      {ship.vehicle}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-semibold rounded text-[10px] uppercase">
                      {ship.status}
                    </span>
                  </div>
                  <div className="text-slate-500 font-medium">
                    Từ: <span className="text-slate-800 font-bold">{ship.origin}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Tài xế: {ship.driver}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block font-medium">
                    Dự kiến cập bến
                  </span>
                  <span className="text-sm font-bold text-blue-600 block mt-0.5">
                    {ship.eta}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Outbound timeline */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Chuyến xe chuẩn bị xuất phát (Outbound)
            </h2>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
              Đang đóng hàng
            </span>
          </div>

          <div className="space-y-3">
            {outboundShipments.map((ship) => (
              <div
                key={ship.id}
                className="p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl transition-all space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">
                      {ship.vehicle}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 font-semibold rounded text-[10px] uppercase">
                      {ship.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 font-medium mr-1.5">
                      Xuất phát:
                    </span>
                    <span className="font-bold text-slate-800">{ship.time}</span>
                  </div>
                </div>
                <div className="text-slate-500 font-medium">
                  Đến: <span className="text-slate-800 font-bold">{ship.dest}</span>
                </div>

                {/* Tỉ lệ lấp đầy xe */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                    <span>Tỉ lệ đóng hàng:</span>
                    <span
                      className={
                        ship.fill >= 80
                          ? "text-emerald-600 font-bold"
                          : "text-blue-600 font-bold"
                      }
                    >
                      {ship.fill}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${ship.fill >= 80 ? "bg-emerald-500" : "bg-blue-500"}`}
                      style={{ width: `${ship.fill}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
