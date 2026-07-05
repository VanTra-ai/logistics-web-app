"use client";

import { useState, useEffect, useRef } from "react";
import {
  Scan,
  ArrowLeftRight,
  UserCheck,
  Building,
  CheckCircle2,
  AlertCircle,
  Camera,
  CornerDownLeft,
  Volume2,
} from "lucide-react";
import api from "@/lib/axios";

interface LoggedInUser {
  id: string;
  role: string;
  hub?: { id: string; name: string } | null;
}

interface Shipper {
  id: string;
  full_name: string;
  phone_number: string;
}

export default function StationPage() {
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(null);
  const [scanMode, setScanMode] = useState<"INBOUND" | "OUTBOUND">("INBOUND");
  const [trackingInput, setTrackingInput] = useState("");
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [selectedShipperId, setSelectedShipperId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Trạng thái phản hồi quét
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    title: string;
    message: string;
    timestamp: string;
  } | null>(null);
  const [flashColor, setFlashColor] = useState<"GREEN" | "RED" | null>(null);

  // Trạng thái giả lập AI Camera Scan
  const [isAiScanning, setIsAiScanning] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load user & shippers
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
          try {
            setCurrentUser(JSON.parse(savedUser) as LoggedInUser);
          } catch {
            // Do nothing
          }
        }
      }

      // Load shippers
      const loadShippers = async () => {
        try {
          const response = await api.get("/users");
          const usersList = response.data?.data || response.data || [];
          if (Array.isArray(usersList)) {
            const filteredShippers = usersList.filter(
              (u: { role: string }) => u.role === "SHIPPER",
            );
            setShippers(filteredShippers);
            if (filteredShippers.length > 0) {
              setSelectedShipperId(filteredShippers[0].id);
            }
          }
        } catch {
          // Fallback mock shippers
          const mockShippers = [
            {
              id: "shipper-1",
              full_name: "Nguyễn Hoàng Nam",
              phone_number: "0912345678",
            },
            {
              id: "shipper-2",
              full_name: "Vũ Văn Bách",
              phone_number: "0945678901",
            },
            {
              id: "shipper-3",
              full_name: "Trần Văn Luận",
              phone_number: "0934567890",
            },
          ];
          setShippers(mockShippers);
          setSelectedShipperId(mockShippers[0].id);
        }
      };

      loadShippers();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Tự động focus ô nhập liệu
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [scanMode, scanResult]);

  // Xử lý quét mã vận đơn
  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trackingNum = trackingInput.trim().toUpperCase();
    if (!trackingNum) return;

    setIsLoading(true);
    setTrackingInput("");
    setScanResult(null);
    setFlashColor(null);

    // Chế độ DEMO FALLBACK
    const isDemo =
      !process.env.NEXT_PUBLIC_API_URL ||
      currentUser?.role !== "HUB_COORDINATOR";

    if (scanMode === "INBOUND") {
      if (isDemo) {
        setTimeout(() => {
          setFlashColor("GREEN");
          setScanResult({
            success: true,
            title: "NHẬP KHO THÀNH CÔNG (DEMO)",
            message: `Kiện hàng ${trackingNum} đã được ghi nhận nhập kho tại ${currentUser?.hub?.name || "Bưu cục Cầu Giấy"}. Phân loại kệ lưu trữ: KỆ PHÍA BẮC (Tuyến Tỉnh).`,
            timestamp: new Date().toLocaleTimeString(),
          });
          setIsLoading(false);
        }, 600);
        return;
      }

      try {
        await api.post("/orders/scan-in", {
          tracking_numbers: [trackingNum],
        });
        setFlashColor("GREEN");
        setScanResult({
          success: true,
          title: "NHẬP KHO THÀNH CÔNG",
          message: `Vận đơn ${trackingNum} đã nhập kho thành công. Ghi nhận nhật ký: Nhập kho tại ${currentUser?.hub?.name || "Bưu cục"}.`,
          timestamp: new Date().toLocaleTimeString(),
        });
      } catch (err: unknown) {
        const apiError = err as { response?: { data?: { message?: string } } };
        setFlashColor("RED");
        setScanResult({
          success: false,
          title: "NHẬP KHO THẤT BẠI",
          message:
            apiError.response?.data?.message ||
            `Lỗi không xác định khi quét đơn ${trackingNum}.`,
          timestamp: new Date().toLocaleTimeString(),
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      // OUTBOUND
      if (!selectedShipperId) {
        setFlashColor("RED");
        setScanResult({
          success: false,
          title: "THIẾU THÔNG TIN",
          message: "Vui lòng chọn tài xế giao hàng trước khi quét xuất kho!",
          timestamp: new Date().toLocaleTimeString(),
        });
        setIsLoading(false);
        return;
      }

      const shipperName =
        shippers.find((s) => s.id === selectedShipperId)?.full_name || "Tài xế";

      if (isDemo) {
        setTimeout(() => {
          setFlashColor("GREEN");
          setScanResult({
            success: true,
            title: "BÀN GIAO SHIPPER THÀNH CÔNG (DEMO)",
            message: `Kiện hàng ${trackingNum} đã xuất kho bãi và bàn giao cho Shipper: ${shipperName}. Trạng thái chuyển thành: DELIVERING (Đang giao hàng).`,
            timestamp: new Date().toLocaleTimeString(),
          });
          setIsLoading(false);
        }, 600);
        return;
      }

      try {
        await api.post("/orders/scan-out", {
          tracking_numbers: [trackingNum],
          shipper_id: selectedShipperId,
        });
        setFlashColor("GREEN");
        setScanResult({
          success: true,
          title: "BÀN GIAO THÀNH CÔNG",
          message: `Vận đơn ${trackingNum} đã xuất bến và bàn giao cho tài xế ${shipperName} giao hàng.`,
          timestamp: new Date().toLocaleTimeString(),
        });
      } catch (err: unknown) {
        const apiError = err as { response?: { data?: { message?: string } } };
        setFlashColor("RED");
        setScanResult({
          success: false,
          title: "XUẤT KHO THẤT BẠI",
          message:
            apiError.response?.data?.message ||
            `Lỗi bàn giao tài xế đối với đơn hàng ${trackingNum}.`,
          timestamp: new Date().toLocaleTimeString(),
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Giả lập AI Camera quét thông minh
  const startAiScanSimulation = () => {
    if (isAiScanning) return;
    setIsAiScanning(true);
    setScanResult(null);
    setFlashColor(null);

    // Tạo mã ngẫu nhiên dạng ORD-xxxx
    const randCode = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    setTimeout(() => {
      setIsAiScanning(false);
      setTrackingInput(randCode);
      // Gọi submit trực tiếp bằng mock trigger
      setFlashColor("GREEN");
      setScanResult({
        success: true,
        title: `AI SCANNER: PHÁT HIỆN KIỆN HÀNG (${scanMode === "INBOUND" ? "NHẬP KHO" : "BÀN GIAO"})`,
        message: `Mã vận đơn ${randCode} đã được nhận diện qua AI Camera. Trọng lượng quét thực tế: ${Math.floor(2 + Math.random() * 10)} kg. Trạng thái phân loại: ĐẠT SLA.`,
        timestamp: new Date().toLocaleTimeString(),
      });
    }, 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
      {/* Screen flash indicator */}
      {flashColor && (
        <div
          className={`fixed inset-x-0 top-0 h-2.5 z-50 transition-all ${
            flashColor === "GREEN"
              ? "bg-emerald-500 shadow-md shadow-emerald-500/20"
              : "bg-red-500 shadow-md shadow-red-500/20"
          }`}
        />
      )}

      {/* Main Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Scan className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Trạm Quét & Phân Loại Đơn Hàng
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Sử dụng máy quét cầm tay hoặc camera AI để xử lý dòng hàng hóa
              Inbound/Outbound
            </p>
          </div>
        </div>

        {/* Scan Mode Toggle buttons */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => {
              setScanMode("INBOUND");
              setScanResult(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              scanMode === "INBOUND"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            Nhập kho (Inbound)
          </button>
          <button
            onClick={() => {
              setScanMode("OUTBOUND");
              setScanResult(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              scanMode === "OUTBOUND"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Bàn giao Shipper (Outbound)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left Side: Scanner Camera AI mock & Input Form */}
        <div className="md:col-span-2 space-y-6">
          {/* Scan console panel */}
          <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-xl space-y-6 relative overflow-hidden">
            {/* Background scanner line effect */}
            {isAiScanning && (
              <div className="absolute inset-0 bg-blue-500/5 animate-pulse flex flex-col justify-between pointer-events-none">
                <div className="w-full h-0.5 bg-blue-400 animate-scannerLine shadow-[0_0_8px_rgba(96,165,250,1)]" />
              </div>
            )}

            <div className="flex justify-between items-center text-xs text-slate-400 font-bold tracking-wider uppercase">
              <span>Trạng thái máy quét</span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Sẵn sàng quét
              </span>
            </div>

            {/* Simulated camera scanning box */}
            <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
              {isAiScanning ? (
                <div className="text-center space-y-3">
                  <Camera className="w-12 h-12 text-blue-400 animate-bounce mx-auto" />
                  <p className="text-sm font-semibold tracking-wider text-blue-300">
                    AI ĐANG QUÉT KIỆN HÀNG...
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Phân tích nhãn vạch barcode & kích thước bằng OpenCV
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-2.5 text-slate-500">
                  <Scan className="w-10 h-10 mx-auto text-slate-700" />
                  <p className="text-xs">
                    Đưa mã vạch trước camera hoặc nhập bằng form bên dưới
                  </p>
                  <button
                    onClick={startAiScanSimulation}
                    className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-900/40 border border-blue-800 hover:bg-blue-800 hover:text-white text-blue-400 font-bold text-[11px] rounded-xl transition-all cursor-pointer mt-3"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Kích hoạt quét AI (Camera Simulator)
                  </button>
                </div>
              )}
            </div>

            {/* Scan form */}
            <form onSubmit={handleScanSubmit} className="space-y-4">
              {scanMode === "OUTBOUND" && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Chọn Shipper nhận hàng
                  </label>
                  <div className="flex gap-2">
                    <div className="p-3 bg-slate-850 rounded-xl text-slate-400 border border-slate-800 flex items-center justify-center">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <select
                      className="block w-full px-3.5 py-2.5 bg-slate-850 border border-slate-800 text-white rounded-xl outline-none focus:border-blue-500 text-sm font-medium"
                      value={selectedShipperId}
                      onChange={(e) => setSelectedShipperId(e.target.value)}
                    >
                      {shippers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name} ({s.phone_number})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Mã vận đơn (Barcode)
                </label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    className="block w-full pl-4 pr-16 py-3.5 bg-slate-950 border border-slate-800 text-white rounded-xl outline-none focus:border-blue-500 font-mono tracking-widest text-lg focus:ring-1 focus:ring-blue-500/20"
                    placeholder="Ví dụ: ORD-1002"
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    disabled={isLoading}
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer"
                    >
                      <CornerDownLeft className="w-3.5 h-3.5" />
                      ENTER
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right Side: Scan feedback screen */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-full flex flex-col justify-between min-h-[400px]">
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center justify-between">
                <span>Kết quả quét mới nhất</span>
                <Volume2 className="w-4 h-4 text-slate-400" />
              </h2>

              {scanResult ? (
                <div className="space-y-5 animate-scaleUp">
                  <div className="text-center py-4">
                    {scanResult.success ? (
                      <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
                    ) : (
                      <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
                    )}
                    <h3
                      className={`text-md font-extrabold mt-3 tracking-wide ${scanResult.success ? "text-emerald-600" : "text-red-600"}`}
                    >
                      {scanResult.title}
                    </h3>
                  </div>

                  <div
                    className={`p-4 rounded-2xl border text-xs font-semibold leading-relaxed ${
                      scanResult.success
                        ? "bg-emerald-50 text-emerald-950 border-emerald-100"
                        : "bg-red-50 text-red-950 border-red-100"
                    }`}
                  >
                    {scanResult.message}
                  </div>

                  <div className="text-[10px] text-slate-400 font-bold text-right">
                    Quét lúc: {scanResult.timestamp}
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center text-slate-400 space-y-2">
                  <Scan className="w-12 h-12 text-slate-200 mx-auto" />
                  <p className="text-xs font-medium">
                    Chưa có kiện hàng nào được quét
                  </p>
                  <p className="text-[10px] max-w-[200px] mx-auto text-slate-400">
                    Kết quả phân loại, hướng luân chuyển kiện hàng sẽ hiển thị
                    trực quan tại đây.
                  </p>
                </div>
              )}
            </div>

            {/* Quick action: Clear result */}
            {scanResult && (
              <button
                onClick={() => {
                  setScanResult(null);
                  setFlashColor(null);
                }}
                className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Xóa màn hình kết quả
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
