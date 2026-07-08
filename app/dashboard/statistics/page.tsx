import { BarChart3 } from "lucide-react";

export default function StatisticsPage() {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
          <BarChart3 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Báo cáo & SLA</h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi chất lượng dịch vụ vận chuyển và tỷ lệ đáp ứng
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
        <h3 className="text-lg font-semibold text-slate-700">
          Tính năng đang phát triển
        </h3>
        <p className="text-slate-500 mt-2">
          Biểu đồ thống kê SLA sẽ sớm được cập nhật trong phiên bản tiếp theo.
        </p>
      </div>
    </div>
  );
}
