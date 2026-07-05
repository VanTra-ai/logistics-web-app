"use client";

import { useState, useEffect } from "react";
import { 
  Package, 
  Truck, 
  Building2, 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  AlertTriangle 
} from "lucide-react";

// Định nghĩa kiểu dữ liệu User
interface LoggedInUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

// Mock data cho danh sách đơn hàng mới cần điều phối
const mockRecentOrders = [
  { id: "ORD-9481", customer: "Nguyễn Văn A", destination: "Bưu cục Cầu Giấy", weight: "4.5 kg", status: "PENDING", time: "10 phút trước" },
  { id: "ORD-9482", customer: "Trần Thị B", destination: "Bưu cục Quận 1", weight: "12.0 kg", status: "PICKED_UP", time: "25 phút trước" },
  { id: "ORD-9483", customer: "Lê Hoàng C", destination: "Bưu cục Hải Phòng", weight: "1.2 kg", status: "PENDING", time: "1 giờ trước" },
  { id: "ORD-9484", customer: "Phạm Minh D", destination: "Bưu cục Đà Nẵng", weight: "25.8 kg", status: "IN_TRANSIT", time: "2 giờ trước" },
  { id: "ORD-9485", customer: "Đỗ Thanh E", destination: "Bưu cục Thủ Đức", weight: "8.1 kg", status: "DELIVERED", time: "3 giờ trước" },
];

export default function DashboardPage() {
  const [user, setUser] = useState<LoggedInUser | null>(null);

  useEffect(() => {
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
  }, []);

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
              Hệ thống vận hành WMS Pro đang hoạt động ổn định. Bạn đăng nhập với vai trò{" "}
              <span className="text-blue-400 font-semibold">{getRoleLabel(user?.role || "")}</span>.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-blue-900/20 active:scale-[0.98] cursor-pointer">
              <Plus className="w-4 h-4" />
              Tạo đơn hàng mới
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 font-medium text-sm rounded-xl transition-all active:scale-[0.98] cursor-pointer">
              <Truck className="w-4 h-4" />
              Tạo chuyến xe mới
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1 */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group hover:-translate-y-0.5">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
              <Package className="w-6 h-6" />
            </div>
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
              <TrendingUp className="w-3.5 h-3.5" />
              +12.4%
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">1,248</h3>
            <p className="text-slate-500 text-sm font-medium mt-1">Đơn hàng đang xử lý</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group hover:-translate-y-0.5">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <Truck className="w-6 h-6" />
            </div>
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
              <TrendingUp className="w-3.5 h-3.5" />
              +5.2%
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">42 Chuyến</h3>
            <p className="text-slate-500 text-sm font-medium mt-1">Xe đang vận chuyển</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group hover:-translate-y-0.5">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <Building2 className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
              Ổn định
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">18 Bưu cục</h3>
            <p className="text-slate-500 text-sm font-medium mt-1">Hệ thống kho vận hành</p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group hover:-translate-y-0.5">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-all">
              <BarChart3 className="w-6 h-6" />
            </div>
            <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-md">
              <TrendingDown className="w-3.5 h-3.5" />
              -0.3%
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">98.4%</h3>
            <p className="text-slate-500 text-sm font-medium mt-1">Tỷ lệ giao hàng SLA</p>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Orders (2/3 width) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Đơn hàng mới nhận</h2>
                <p className="text-xs text-slate-500 mt-1">Danh sách đơn hàng đang chờ điều phối chuyến xe</p>
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
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">{order.id}</td>
                      <td className="px-6 py-4 text-slate-700">{order.customer}</td>
                      <td className="px-6 py-4 text-slate-600">{order.destination}</td>
                      <td className="px-6 py-4 text-slate-600">{order.weight}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          order.status === "PENDING" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                          order.status === "PICKED_UP" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                          order.status === "IN_TRANSIT" ? "bg-purple-50 text-purple-700 border border-purple-200" :
                          "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            order.status === "PENDING" ? "bg-amber-500" :
                            order.status === "PICKED_UP" ? "bg-blue-500" :
                            order.status === "IN_TRANSIT" ? "bg-purple-500" :
                            "bg-emerald-500"
                          }`} />
                          {order.status === "PENDING" ? "Chờ xử lý" :
                           order.status === "PICKED_UP" ? "Đã lấy" :
                           order.status === "IN_TRANSIT" ? "Đang giao" : "Thành công"}
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
            <span className="text-xs text-slate-400">Hiển thị 5 trên tổng số 14 đơn hàng chờ điều phối.</span>
          </div>
        </div>

        {/* Right Column: Active Feed & Notifications (1/3 width) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Hoạt động bưu cục</h2>
            <p className="text-xs text-slate-500 mt-1">Nhật ký vận hành bưu cục thời gian thực</p>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-150">
            {/* Feed 1 */}
            <div className="relative">
              <span className="absolute -left-[22px] top-1.5 p-1 bg-amber-500 text-white rounded-full ring-4 ring-white">
                <Clock className="w-3 h-3" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Cảnh báo trễ chuyến xe</p>
                <p className="text-xs text-slate-500 mt-0.5">Chuyến xe #SHIP-298 đi Hải Phòng trễ 15 phút do thời tiết.</p>
                <span className="text-[10px] text-slate-400 mt-2 block font-medium">5 phút trước</span>
              </div>
            </div>

            {/* Feed 2 */}
            <div className="relative">
              <span className="absolute -left-[22px] top-1.5 p-1 bg-emerald-500 text-white rounded-full ring-4 ring-white">
                <CheckCircle2 className="w-3 h-3" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Giao hàng thành công</p>
                <p className="text-xs text-slate-500 mt-0.5">Shipper Nguyễn Hoàng Nam đã hoàn thành đơn hàng #ORD-9428.</p>
                <span className="text-[10px] text-slate-400 mt-2 block font-medium">20 phút trước</span>
              </div>
            </div>

            {/* Feed 3 */}
            <div className="relative">
              <span className="absolute -left-[22px] top-1.5 p-1 bg-blue-500 text-white rounded-full ring-4 ring-white">
                <Truck className="w-3 h-3" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Khởi hành chuyến xe</p>
                <p className="text-xs text-slate-500 mt-0.5">Tài xế Vũ Văn Bách đã xuất bến tuyến Cầu Giấy - Hà Đông.</p>
                <span className="text-[10px] text-slate-400 mt-2 block font-medium">45 phút trước</span>
              </div>
            </div>

            {/* Feed 4 */}
            <div className="relative">
              <span className="absolute -left-[22px] top-1.5 p-1 bg-red-500 text-white rounded-full ring-4 ring-white">
                <AlertTriangle className="w-3 h-3" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Báo lỗi sự cố</p>
                <p className="text-xs text-slate-500 mt-0.5">Yêu cầu hỗ trợ kỹ thuật tại Bưu cục Hải Phòng: Hỏng máy quét mã vạch.</p>
                <span className="text-[10px] text-slate-400 mt-2 block font-medium">1 giờ trước</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
