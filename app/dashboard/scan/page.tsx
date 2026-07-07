"use client";

import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import {
  QrCode,
  LogIn,
  LogOut,
  Package,
  User,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import api from "@/lib/axios";

interface Shipper {
  id: string;
  full_name: string;
  phone_number: string;
}

export default function ScanStationPage() {
  const [activeTab, setActiveTab] = useState<"SCAN_IN" | "SCAN_OUT">("SCAN_IN");
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [selectedShipperId, setSelectedShipperId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Fetch shippers
  useEffect(() => {
    const fetchShippers = async () => {
      try {
        const res = await api.get("/users");
        const usersList = res.data?.data || res.data || [];
        if (Array.isArray(usersList)) {
          const shipperUsers = usersList.filter(
            (u: { role: string }) => u.role === "SHIPPER",
          );
          setShippers(shipperUsers);
        }
      } catch (error) {
        console.error("Lỗi khi lấy danh sách shipper:", error);
      }
    };
    fetchShippers();
  }, []);

  // Initialize Scanner
  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false,
    );

    scannerRef.current.render(
      (decodedText) => {
        // Có thể mã QR là JSON hoặc chuỗi tracking_number thuần
        let trackingNumber = decodedText;
        try {
          const parsed = JSON.parse(decodedText);
          if (parsed.tn) trackingNumber = parsed.tn;
        } catch {
          // decodedText is not JSON, use it as is
        }

        setScannedCodes((prev) => {
          if (!prev.includes(trackingNumber)) {
            // Hiển thị âm thanh hoặc thông báo nhẹ khi quét thành công 1 mã
            return [trackingNumber, ...prev];
          }
          return prev;
        });
      },
      () => {
        // Ignore continuous scanning errors
      },
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  const handleProcess = async () => {
    if (scannedCodes.length === 0) {
      setNotification({
        type: "error",
        message: "Vui lòng quét ít nhất 1 mã vận đơn.",
      });
      return;
    }

    if (activeTab === "SCAN_OUT" && !selectedShipperId) {
      setNotification({
        type: "error",
        message: "Vui lòng chọn nhân viên giao hàng (Shipper).",
      });
      return;
    }

    setIsLoading(true);
    setNotification(null);

    try {
      if (activeTab === "SCAN_IN") {
        await api.post("/orders/scan-in", { tracking_numbers: scannedCodes });
        setNotification({
          type: "success",
          message: `Đã nhập kho thành công ${scannedCodes.length} đơn hàng!`,
        });
      } else {
        await api.post("/orders/scan-out", {
          tracking_numbers: scannedCodes,
          shipper_id: selectedShipperId,
        });
        setNotification({
          type: "success",
          message: `Đã xuất kho và bàn giao ${scannedCodes.length} đơn hàng cho Shipper!`,
        });
      }
      setScannedCodes([]); // Reset sau khi thành công
    } catch (error) {
      console.error(error);
      const apiError = error as { response?: { data?: { message?: string } } };
      setNotification({
        type: "error",
        message:
          apiError.response?.data?.message ||
          "Đã có lỗi xảy ra khi xử lý đơn hàng.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeCode = (code: string) => {
    setScannedCodes((prev) => prev.filter((c) => c !== code));
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <QrCode className="w-7 h-7 text-blue-600" />
            Trạm quét mã bưu cục
          </h1>
          <p className="text-slate-500 mt-1">
            Quét mã vạch hoặc mã QR trên nhãn dán để cập nhật trạng thái đơn
            hàng nhanh chóng.
          </p>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("SCAN_IN")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "SCAN_IN"
              ? "bg-white text-blue-700 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <LogIn className="w-4 h-4" />
          Nhập kho (Scan-In)
        </button>
        <button
          onClick={() => setActiveTab("SCAN_OUT")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "SCAN_OUT"
              ? "bg-white text-orange-600 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <LogOut className="w-4 h-4" />
          Xuất kho (Scan-Out)
        </button>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 ${
            notification.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="font-medium text-sm">{notification.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Scanner */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-slate-500" />
              Camera quét mã
            </h2>
          </div>
          <div className="p-4">
            <div
              id="qr-reader"
              className="w-full border-none rounded-xl overflow-hidden"
            ></div>
          </div>
        </div>

        {/* Right: List of scanned codes */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-slate-500" />
              Danh sách mã đã quét ({scannedCodes.length})
            </h2>
          </div>

          <div className="p-4 flex-1 overflow-y-auto max-h-[400px]">
            {scannedCodes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center space-y-3">
                <QrCode className="w-12 h-12 opacity-20" />
                <p className="text-sm">
                  Chưa có mã nào được quét.
                  <br />
                  Đưa camera vào sát mã vận đơn hoặc mã QR.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {scannedCodes.map((code) => (
                  <li
                    key={code}
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl"
                  >
                    <span className="font-mono text-sm font-semibold text-slate-700">
                      {code}
                    </span>
                    <button
                      onClick={() => removeCode(code)}
                      className="text-slate-400 hover:text-red-500 text-sm font-medium"
                    >
                      Xoá
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-4">
            {activeTab === "SCAN_OUT" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Chọn Shipper bàn giao
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="w-4 h-4 text-slate-400" />
                  </div>
                  <select
                    value={selectedShipperId}
                    onChange={(e) => setSelectedShipperId(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  >
                    <option value="">-- Chọn Shipper --</option>
                    {shippers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} ({s.phone_number})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <button
              onClick={handleProcess}
              disabled={
                isLoading ||
                scannedCodes.length === 0 ||
                (activeTab === "SCAN_OUT" && !selectedShipperId)
              }
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold rounded-xl transition-all"
            >
              {isLoading
                ? "Đang xử lý..."
                : activeTab === "SCAN_IN"
                  ? "Xác nhận nhập kho"
                  : "Xác nhận xuất kho"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
