import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-3 bg-slate-50 text-slate-600 rounded-xl">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Cài đặt hệ thống</h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý các cấu hình chung của nền tảng WMS
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
        <h3 className="text-lg font-semibold text-slate-700">
          Tính năng đang phát triển
        </h3>
        <p className="text-slate-500 mt-2">
          Trang cài đặt sẽ sớm được cập nhật trong phiên bản tiếp theo.
        </p>
      </div>
    </div>
  );
}
