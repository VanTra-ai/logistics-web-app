"use client";

import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  DollarSign,
  Package,
  Wallet,
  TrendingUp,
  CheckCircle2,
  Clock,
  ChevronRight,
  Download,
} from "lucide-react";

// MOCK DATA
const kpiData = [
  {
    title: "Tổng Doanh Thu (P&L)",
    value: "1,250,000,000 ₫",
    trend: "+15.2%",
    trendUp: true,
    icon: DollarSign,
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    title: "COD Đang Chờ Đối Soát",
    value: "345,500,000 ₫",
    trend: "-2.5%",
    trendUp: false,
    icon: Wallet,
    color: "bg-amber-100 text-amber-600",
  },
  {
    title: "Tổng Đơn Hàng",
    value: "12,450",
    trend: "+8.4%",
    trendUp: true,
    icon: Package,
    color: "bg-blue-100 text-blue-600",
  },
  {
    title: "Tỷ Lệ Giao Thành Công",
    value: "94.2%",
    trend: "+1.2%",
    trendUp: true,
    icon: TrendingUp,
    color: "bg-purple-100 text-purple-600",
  },
];

const revenueData = [
  { name: "T2", revenue: 150, profit: 45 },
  { name: "T3", revenue: 230, profit: 70 },
  { name: "T4", revenue: 180, profit: 50 },
  { name: "T5", revenue: 290, profit: 90 },
  { name: "T6", revenue: 250, profit: 75 },
  { name: "T7", revenue: 340, profit: 110 },
  { name: "CN", revenue: 310, profit: 95 },
];

const deliveryRateData = [
  { name: "Thành Công", value: 85 },
  { name: "Thất Bại", value: 10 },
  { name: "Chờ Xử Lý", value: 5 },
];
const COLORS = ["#10b981", "#ef4444", "#f59e0b"];

const initialCodData = [
  {
    id: "SHP-1029",
    shipperName: "Nguyễn Văn A",
    ordersCount: 45,
    codAmount: 12500000,
    status: "PENDING_REMITTANCE",
    lastUpdated: "2023-10-25 14:30",
  },
  {
    id: "SHP-1030",
    shipperName: "Trần Thị B",
    ordersCount: 32,
    codAmount: 8400000,
    status: "PENDING_REMITTANCE",
    lastUpdated: "2023-10-25 15:15",
  },
  {
    id: "SHP-1031",
    shipperName: "Lê Văn C",
    ordersCount: 56,
    codAmount: 15600000,
    status: "PENDING_REMITTANCE",
    lastUpdated: "2023-10-25 16:00",
  },
  {
    id: "SHP-1032",
    shipperName: "Phạm Văn D",
    ordersCount: 28,
    codAmount: 7200000,
    status: "PENDING_REMITTANCE",
    lastUpdated: "2023-10-25 16:45",
  },
];

export default function ReportsPage() {
  const [codData, setCodData] = useState(initialCodData);

  const handleConfirmCollection = (id: string) => {
    setCodData((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "COLLECTED" } : item,
      ),
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Báo Cáo BI & Phân Tích
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi hiệu suất vận hành và dòng tiền tổng quan
          </p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium text-sm">
          <Download className="w-4 h-4" />
          Xuất Báo Cáo
        </button>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi, index) => (
          <div
            key={index}
            className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">
                  {kpi.title}
                </p>
                <h3 className="text-2xl font-bold text-slate-800">
                  {kpi.value}
                </h3>
              </div>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${kpi.color}`}
              >
                <kpi.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span
                className={`font-semibold ${
                  kpi.trendUp ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {kpi.trend}
              </span>
              <span className="text-slate-400 ml-2">so với tuần trước</span>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Doanh Thu & Lợi Nhuận (7 Ngày)
              </h3>
              <p className="text-sm text-slate-500">Đơn vị: Triệu VNĐ</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={revenueData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <RechartsTooltip
                  cursor={{ fill: "#f1f5f9" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ paddingTop: "20px" }}
                />
                <Bar
                  dataKey="revenue"
                  name="Doanh Thu"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  barSize={32}
                />
                <Bar
                  dataKey="profit"
                  name="Lợi Nhuận"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">
            Tỷ Lệ Giao Hàng
          </h3>
          <div className="h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deliveryRateData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {deliveryRateData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Inner Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-slate-800">85%</span>
              <span className="text-xs text-slate-500 font-medium">
                Thành công
              </span>
            </div>
          </div>
          {/* Custom Legend */}
          <div className="mt-6 space-y-3">
            {deliveryRateData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="text-sm font-medium text-slate-600">
                    {item.name}
                  </span>
                </div>
                <span className="text-sm font-bold text-slate-800">
                  {item.value}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Data Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Đối Soát COD Shipper
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Danh sách các khoản thu hộ (COD) cần đối soát với Shipper.
            </p>
          </div>
          <button className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center">
            Xem tất cả <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Mã Shipper</th>
                <th className="px-6 py-4 font-semibold">Tên Shipper</th>
                <th className="px-6 py-4 font-semibold text-center">Số Đơn</th>
                <th className="px-6 py-4 font-semibold text-right">
                  Tổng COD (VNĐ)
                </th>
                <th className="px-6 py-4 font-semibold text-center">
                  Trạng Thái
                </th>
                <th className="px-6 py-4 font-semibold text-center">
                  Hành Động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {codData.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-slate-800">
                    {row.id}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {row.shipperName}
                  </td>
                  <td className="px-6 py-4 text-center text-slate-600">
                    {row.ordersCount}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-800">
                    {row.codAmount.toLocaleString("vi-VN")} ₫
                  </td>
                  <td className="px-6 py-4 text-center">
                    {row.status === "PENDING_REMITTANCE" ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                        <Clock className="w-3 h-3 mr-1" />
                        Chờ thu
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Đã thu
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {row.status === "PENDING_REMITTANCE" ? (
                      <button
                        onClick={() => handleConfirmCollection(row.id)}
                        className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      >
                        Xác nhận đã thu
                      </button>
                    ) : (
                      <span className="text-slate-400 text-xs italic">
                        Hoàn tất
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {codData.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-slate-500"
                  >
                    Không có dữ liệu đối soát.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
