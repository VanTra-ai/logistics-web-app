"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/axios";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { DollarSign, Package, TrendingUp, Download, Medal } from "lucide-react";

// Types
interface PnlData {
  date: string;
  revenue: number;
  costs: number;
  profit: number;
}

interface ShipperData {
  rank?: number;
  id: string;
  shipperCode: string;
  name: string;
  hubName: string;
  total_orders: number;
  successful_orders: number;
  success_rate: number;
  revenue: number;
}

interface HubData {
  name: string;
  scan_in: number;
  scan_out: number;
  backlog: number;
  throughput: number;
  capacity_utilization: number;
  exception_rate: number;
}

interface PnlByHubData {
  date: string;
  hubName: string;
  revenue: number;
  material_costs: number;
  profit: number;
}

export default function ReportsPage() {
  const [pnlData, setPnlData] = useState<PnlData[]>([]);
  const [shipperData, setShipperData] = useState<ShipperData[]>([]);
  const [hubData, setHubData] = useState<HubData[]>([]);
  const [pnlByHubData, setPnlByHubData] = useState<PnlByHubData[]>([]);
  const [shipperPage, setShipperPage] = useState(1);
  const [shipperMeta, setShipperMeta] = useState<{
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  }>({
    totalItems: 0,
    itemCount: 0,
    itemsPerPage: 10,
    totalPages: 1,
    currentPage: 1,
  });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
        const query = startDate || endDate ? `?${params.toString()}` : "";
        const shipperQuery = `${query ? query + "&" : "?"}page=${shipperPage}&limit=10`;

        const [pnlRes, shipperRes, hubRes, pnlByHubRes] = await Promise.all([
          api.get(`/reports/pnl${query}`),
          api.get(`/reports/shipper-kpi${shipperQuery}`),
          api.get(`/reports/warehouse-kpi${query}`),
          api.get(`/reports/pnl-by-hub${query}`),
        ]);

        if (pnlRes.data) setPnlData(pnlRes.data);
        if (shipperRes.data?.data) {
          setShipperData(shipperRes.data.data);
          setShipperMeta(shipperRes.data.meta);
        } else if (Array.isArray(shipperRes.data)) {
          setShipperData(shipperRes.data);
        }
        if (hubRes.data) setHubData(hubRes.data);
        if (pnlByHubRes.data) setPnlByHubData(pnlByHubRes.data);
      } catch (error) {
        console.error("Lỗi lấy dữ liệu Báo cáo BI", error);
      }
    };

    fetchData();
  }, [startDate, endDate, shipperPage]);

  const exportReport = () => {
    let csv = "\uFEFF"; // UTF-8 BOM cho Excel mở tiếng Việt không lỗi font

    // KHỐI 1: P&L THEO BƯU CỤC
    csv += "=== KHOI 1: BÁO CÁO TÀI CHÍNH P&L THEO BƯU CỤC ===\n";
    csv +=
      "Ngay,Buu Cuc,Doanh Thu (VND),Phi Vat Tu (VND),Loi Nhuan Gop (VND)\n";
    pnlByHubData.forEach((row) => {
      csv += `${row.date},${row.hubName},${row.revenue},${row.material_costs},${row.profit}\n`;
    });
    csv += "\n\n";

    // KHỐI 2: LƯU LƯỢNG & TỒN KHO BƯU CỤC
    csv += "=== KHOI 2: BÁO CÁO LƯU LƯỢNG & TỒN KHO BƯU CỤC ===\n";
    csv +=
      "Buu Cuc,Scan-In (Nhap Kho),Scan-Out (Xuat Kho),Ton Kho (Backlog),Tong Luu Luong\n";
    hubData.forEach((row) => {
      csv += `${row.name},${row.scan_in},${row.scan_out},${row.backlog},${row.throughput}\n`;
    });
    csv += "\n\n";

    // KHỐI 3: XẾP HẠNG SHIPPER THEO DOANH THU
    csv += "=== KHOI 3: BẢNG XẾP HẠNG SHIPPER THEO DOANH THU ===\n";
    csv +=
      "Hang,Ma Shipper,Ho Va Ten,Thuoc Buu Cuc,So Don HT,Ty Le Thanh Cong (%),Doanh Thu (VND)\n";
    shipperData.forEach((row, idx) => {
      csv += `${idx + 1},${row.shipperCode},${row.name},${row.hubName},${row.successful_orders},${row.success_rate.toFixed(1)},${row.revenue}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Bao_Cao_BI_Tong_Hop_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // KPIs
  const totalRevenue = pnlData.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalProfit = pnlData.reduce((acc, curr) => acc + curr.profit, 0);
  const totalThroughput = hubData.reduce(
    (acc, curr) => acc + curr.throughput,
    0,
  );

  const kpiCards = [
    {
      title: "Tổng Doanh Thu",
      value: `${totalRevenue.toLocaleString("vi-VN")} ₫`,
      icon: DollarSign,
      color: "bg-blue-100 text-blue-600",
    },
    {
      title: "Lợi Nhuận Gộp (P&L)",
      value: `${totalProfit.toLocaleString("vi-VN")} ₫`,
      icon: TrendingUp,
      color: "bg-emerald-100 text-emerald-600",
    },
    {
      title: "Lưu Lượng Kho (Throughput)",
      value: `${totalThroughput.toLocaleString("vi-VN")} Đơn`,
      icon: Package,
      color: "bg-purple-100 text-purple-600",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Báo cáo & Phân tích BI
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi hiệu suất vận hành và dòng tiền tổng quan
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
            <span className="text-sm text-slate-500">Từ:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm outline-none bg-transparent text-slate-700"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
            <span className="text-sm text-slate-500">Đến:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm outline-none bg-transparent text-slate-700"
            />
          </div>
          <button
            onClick={exportReport}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium text-sm"
          >
            <Download className="w-4 h-4" />
            Xuất Báo Cáo Tài Chính
          </button>
        </div>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((kpi, index) => (
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
          </div>
        ))}
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 gap-6">
        {/* Line Chart: P&L */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800">
              Doanh Thu & Lợi Nhuận Gộp (P&L)
            </h3>
            <p className="text-sm text-slate-500">
              Xu hướng doanh thu và lợi nhuận thực tế theo ngày
            </p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={pnlData}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <RechartsTooltip
                  cursor={{ stroke: "#e2e8f0", strokeWidth: 2 }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) =>
                    Number(value || 0).toLocaleString("vi-VN") + " ₫"
                  }
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ paddingTop: "20px" }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  name="Doanh Thu"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="profit"
                  name="Lợi Nhuận"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grouped Bar Chart: Hub Performance */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800">
              Lưu Lượng Bưu Cục (Hub Throughput)
            </h3>
            <p className="text-sm text-slate-500">
              Tổng quan năng lực nhập xuất (Scan-in & Scan-out) tại các Hub
            </p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={hubData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
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
                  dataKey="scan_in"
                  name="Scan-In (Nhập kho)"
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="scan_out"
                  name="Scan-Out (Xuất kho)"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="backlog"
                  name="Tồn kho (Backlog)"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Leaderboard */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Bảng Xếp Hạng & Báo Cáo Hiệu Suất Shipper
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Đánh giá toàn bộ hiệu suất và doanh thu mang lại từ Shipper.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold text-center w-16">
                  Hạng
                </th>
                <th className="px-6 py-4 font-semibold">Mã Shipper</th>
                <th className="px-6 py-4 font-semibold">Họ và Tên</th>
                <th className="px-6 py-4 font-semibold">Kho</th>
                <th className="px-6 py-4 font-semibold text-center">
                  Số Đơn HT
                </th>
                <th className="px-6 py-4 font-semibold text-center">
                  Tỷ Lệ Thành Công
                </th>
                <th className="px-6 py-4 font-semibold text-right">
                  Doanh Thu
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {shipperData.map((row, idx) => {
                const displayRank = row.rank || idx + 1;
                return (
                  <tr
                    key={row.id}
                    className={`transition-colors hover:bg-slate-50/50`}
                  >
                    <td className="px-6 py-4 font-bold text-center">
                      {displayRank === 1 ? (
                        <Medal className="w-5 h-5 mx-auto text-amber-500" />
                      ) : displayRank === 2 ? (
                        <Medal className="w-5 h-5 mx-auto text-slate-400" />
                      ) : displayRank === 3 ? (
                        <Medal className="w-5 h-5 mx-auto text-amber-700" />
                      ) : (
                        <span className="text-slate-400">#{displayRank}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                      {row.shipperCode}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {row.name}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                        {row.hubName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-slate-700">
                      {row.successful_orders}
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-emerald-600">
                      {row.success_rate.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-800">
                      {row.revenue.toLocaleString("vi-VN")} ₫
                    </td>
                  </tr>
                );
              })}
              {shipperData.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-slate-500"
                  >
                    Không có dữ liệu đánh giá.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {shipperMeta.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Hiển thị {shipperData.length} trên tổng số{" "}
              {shipperMeta.totalItems} Shipper
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={shipperPage <= 1}
                onClick={() => setShipperPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-slate-600"
              >
                Trang trước
              </button>
              <span className="font-semibold text-slate-700">
                Trang {shipperMeta.currentPage} / {shipperMeta.totalPages}
              </span>
              <button
                disabled={shipperPage >= shipperMeta.totalPages}
                onClick={() =>
                  setShipperPage((p) => Math.min(shipperMeta.totalPages, p + 1))
                }
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-slate-600"
              >
                Trang sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
