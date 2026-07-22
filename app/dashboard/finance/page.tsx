"use client";

import { useState, useEffect } from "react";
import {
  Coins,
  Settings,
  Truck,
  Building2,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Scale,
  History,
  Store,
} from "lucide-react";
import api from "@/lib/axios";
import axios from "axios";

interface TariffConfig {
  base_price_distance: number;
  base_distance_limit: number;
  block_price_distance: number;
  surplus_weight_price: number;
  volumetric_divisor: number;
  cod_fee_percent: number;
  hub_commission_percent: number;
  shipper_payout_flat: number;
  shipper_payout_percent: number;
  shipper_pickup_payout: number;
  shipper_return_payout: number;
}

interface Hub {
  id: string;
  name: string;
}

interface AuditLog {
  id: string;
  changed_fields: Record<string, { old: string | number | null; new: string | number | null }>;
  changed_by?: { full_name: string };
  created_at: string;
}

export default function FinanceTariffPage() {
  const [activeTab, setActiveTab] = useState<
    "TARIFF" | "COMMISSION" | "AUDITS"
  >("TARIFF");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [hubs, setHubs] = useState<Hub[]>([]);
  const [selectedHubId, setSelectedHubId] = useState<string>("DEFAULT");
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [userRole, setUserRole] = useState<string>("HUB_COORDINATOR");

  const [config, setConfig] = useState<TariffConfig>({
    base_price_distance: 15000,
    base_distance_limit: 2,
    block_price_distance: 4000,
    surplus_weight_price: 5000,
    volumetric_divisor: 5000,
    cod_fee_percent: 1.0,
    hub_commission_percent: 15.0,
    shipper_payout_flat: 3500,
    shipper_payout_percent: 10.0,
    shipper_pickup_payout: 2500,
    shipper_return_payout: 2500,
  });

  useEffect(() => {
    const init = async () => {
      await Promise.resolve(); // Prevent synchronous setState warning
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          setUserRole(JSON.parse(userStr).role);
        } catch {}
      }
      try {
        const res = await api.get("/hubs");
        const data = res.data?.data || res.data || [];
        setHubs(Array.isArray(data) ? data.filter((h: { is_active?: boolean }) => h.is_active !== false) : []);
      } catch (err) {
        console.warn("Lỗi tải danh sách bưu cục.", err);
      }
    };
    init();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    setNotification(null);
    try {
      const query =
        selectedHubId === "DEFAULT" ? "" : `?hub_id=${selectedHubId}`;
      const [tariffRes, auditRes] = await Promise.all([
        api.get(`/finance/tariff${query}`),
        api.get(`/finance/tariff/audits${query}`),
      ]);

      if (tariffRes.data?.data) {
        setConfig(tariffRes.data.data);
      } else if (tariffRes.data) {
        setConfig(tariffRes.data);
      }

      const auditsData = auditRes.data?.data || auditRes.data || [];
      setAudits(Array.isArray(auditsData) ? auditsData : []);
    } catch (err) {
      console.warn("Lỗi tải cấu hình tài chính từ backend.", err);
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setNotification({
          type: "error",
          message: "Bạn không có quyền xem bảng giá và hoa hồng",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadConfig();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHubId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== "ADMIN") return;

    setIsSubmitLoading(true);
    setNotification(null);

    try {
      const query =
        selectedHubId === "DEFAULT" ? "" : `?hub_id=${selectedHubId}`;
      await api.patch(`/finance/tariff${query}`, {
        base_price_distance: Math.round(Number(config.base_price_distance)),
        base_distance_limit: Number(
          Number(config.base_distance_limit).toFixed(2),
        ),
        block_price_distance: Math.round(Number(config.block_price_distance)),
        surplus_weight_price: Math.round(Number(config.surplus_weight_price)),
        volumetric_divisor: Number(
          Number(config.volumetric_divisor).toFixed(2),
        ),
        cod_fee_percent: Number(Number(config.cod_fee_percent).toFixed(2)),
        hub_commission_percent: Number(
          Number(config.hub_commission_percent).toFixed(2),
        ),
        shipper_payout_flat: Math.round(Number(config.shipper_payout_flat)),
        shipper_payout_percent: Number(
          Number(config.shipper_payout_percent).toFixed(2),
        ),
        shipper_pickup_payout: Math.round(
          Number(config.shipper_pickup_payout || 2500),
        ),
        shipper_return_payout: Math.round(
          Number(config.shipper_return_payout || 2500),
        ),
      });
      setNotification({
        type: "success",
        message: "Đã lưu cấu hình tài chính & biểu phí thành công!",
      });
      loadConfig(); // Reload to get new audit logs
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setNotification({
        type: "error",
        message:
          apiError.response?.data?.message || "Lỗi lưu cấu hình tài chính!",
      });
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const isReadOnly = userRole !== "ADMIN";

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Floating Notification */}
      {notification && (
        <div
          className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 max-w-sm border transition-all duration-300 transform translate-y-0 ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-950 border-emerald-200"
              : "bg-red-50 text-red-950 border-red-200"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <p className="text-xs font-semibold leading-normal">
            {notification.message}
          </p>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 ml-auto cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Coins className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Dòng tiền & Biểu phí
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Định nghĩa bảng giá cước vận chuyển, phụ phí cồng kềnh, phí COD và
              tỷ lệ chia sẻ hoa hồng bưu cục đối tác
            </p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab("TARIFF")}
            className={`px-4 py-2 font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "TARIFF"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Biểu phí Vận chuyển
          </button>
          <button
            onClick={() => setActiveTab("COMMISSION")}
            className={`px-4 py-2 font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "COMMISSION"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Hoa hồng & Chiết khấu
          </button>
          <button
            onClick={() => setActiveTab("AUDITS")}
            className={`px-4 py-2 font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              activeTab === "AUDITS"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <History className="w-3.5 h-3.5" /> Lịch sử
          </button>
        </div>
      </div>

      {/* Franchise Pricing Selector */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 whitespace-nowrap">
          <Store className="w-4 h-4 text-blue-600" /> Chọn bảng giá:
        </div>
        <select
          className="w-full md:w-auto flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-medium"
          value={selectedHubId}
          onChange={(e) => setSelectedHubId(e.target.value)}
        >
          <option value="DEFAULT">Bảng giá chung (Mặc định hệ thống)</option>
          {hubs.map((hub) => (
            <option key={hub.id} value={hub.id}>
              Bảng giá riêng: {hub.name}
            </option>
          ))}
        </select>
        {isReadOnly && (
          <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 flex-shrink-0">
            Chỉ xem (Read-only)
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="p-16 text-center flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm font-semibold">
            Đang tải cấu hình tài chính...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* TAB 1: TARIFF MANAGEMENT */}
          {activeTab === "TARIFF" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Distance Pricing Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 md:col-span-2">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Scale className="w-4 h-4 text-blue-600" />
                  Bảng cước tính theo Khoảng cách / Khối lượng
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-550 mb-1.5 uppercase">
                      Giá cước cơ bản (Sàn)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        disabled={isReadOnly}
                        className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
                        value={config.base_price_distance}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            base_price_distance: Number(e.target.value),
                          })
                        }
                      />
                      <span className="absolute inset-y-0 right-4 flex items-center text-[10px] text-slate-400 font-bold">
                        VNĐ
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Số tiền tối thiểu khách phải trả cho chặng cơ bản.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-550 mb-1.5 uppercase">
                      Cự ly cơ bản (Giới hạn)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        disabled={isReadOnly}
                        className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
                        value={config.base_distance_limit}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            base_distance_limit: Number(e.target.value),
                          })
                        }
                      />
                      <span className="absolute inset-y-0 right-4 flex items-center text-[10px] text-slate-400 font-bold">
                        KM / KG
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Cự ly hoặc trọng lượng cơ bản được áp dụng mức giá sàn.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-550 mb-1.5 uppercase">
                      Đơn giá km tiếp theo
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        disabled={isReadOnly}
                        className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
                        value={config.block_price_distance}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            block_price_distance: Number(e.target.value),
                          })
                        }
                      />
                      <span className="absolute inset-y-0 right-4 flex items-center text-[10px] text-slate-400 font-bold">
                        VNĐ / KM
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Cộng thêm cho mỗi km vượt mức cơ bản.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-550 mb-1.5 uppercase">
                      Giá mỗi kg phụ trội
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        disabled={isReadOnly}
                        className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
                        value={config.surplus_weight_price || 5000}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            surplus_weight_price: Number(e.target.value),
                          })
                        }
                      />
                      <span className="absolute inset-y-0 right-4 flex items-center text-[10px] text-slate-400 font-bold">
                        VNĐ / KG
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Cộng thêm cho mỗi kg vượt mức cơ bản.
                    </p>
                  </div>
                </div>
              </div>

              {/* Side Info & Surcharges */}
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Settings className="w-4 h-4 text-indigo-650" />
                    Phụ phí & Quy đổi thể tích
                  </h2>

                  <div>
                    <label className="block text-xs font-bold text-slate-550 mb-1.5 uppercase">
                      Hệ số quy đổi thể tích
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        disabled={isReadOnly}
                        className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
                        value={config.volumetric_divisor || 5000}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            volumetric_divisor: Number(e.target.value),
                          })
                        }
                      />
                      <span className="absolute inset-y-0 right-4 flex items-center text-[10px] text-slate-400 font-bold">
                        DIVISOR
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-450 mt-1">
                      Ví dụ: 4000, 5000, 6000.
                    </p>
                  </div>

                  <div className="p-3.5 bg-blue-50/60 border border-blue-150 rounded-xl text-xs space-y-2 mt-2">
                    <div className="flex justify-between items-center text-[11px] font-extrabold text-blue-800 uppercase">
                      <span>Cơ chế Tính cước theo Thể tích Chuẩn</span>
                    </div>
                    <div className="font-mono text-xs text-blue-900 bg-white p-2.5 rounded-lg border border-blue-150 font-bold space-y-1">
                      <div>Quy đổi (kg) = (Dài × Rộng × Cao cm) / {config.volumetric_divisor || 5000}</div>
                      <div className="text-emerald-700 text-[11px]">Trọng lượng cước = MAX(Cân thực tế, Quy đổi)</div>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      💡 Người gửi/Tạo đơn <strong>không bắt buộc nhập Cân nặng thực tế</strong>. Nếu để trống, hệ thống tự động sử dụng Khối lượng quy đổi thể tích làm trọng lượng tính cước chính thức.
                    </p>
                  </div>

                  <div className="space-y-3.5 mt-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-550 mb-1.5 uppercase">
                        Tỷ lệ phí dịch vụ thu hộ COD
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={isReadOnly}
                          className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
                          value={config.cod_fee_percent}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              cod_fee_percent: Number(e.target.value),
                            })
                          }
                        />
                        <span className="absolute inset-y-0 right-4 flex items-center text-[10px] text-slate-400 font-bold">
                          %
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-450 mt-1">
                        Ví dụ: 1% giá trị thu hộ COD của đơn hàng.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMMISSION & PAYOUT */}
          {activeTab === "COMMISSION" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Franchise Commission */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  Hoa hồng chia sẻ cho Bưu cục Đối tác
                </h2>

                <div>
                  <label className="block text-xs font-bold text-slate-550 mb-1.5 uppercase">
                    Tỷ lệ chia sẻ doanh thu (Hub Commission)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.5"
                      disabled={isReadOnly}
                      className="flex-1 accent-emerald-600 disabled:opacity-70"
                      value={config.hub_commission_percent}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          hub_commission_percent: Number(e.target.value),
                        })
                      }
                    />
                    <div className="w-20 relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        disabled={isReadOnly}
                        className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs font-bold disabled:opacity-70"
                        value={config.hub_commission_percent}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            hub_commission_percent: Number(e.target.value),
                          })
                        }
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">
                        %
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-450 mt-2">
                    Phần trăm cước phí vận chuyển được ghi nhận doanh thu cho
                    bưu cục nhượng quyền quản lý đơn.
                  </p>
                </div>

                <div className="p-3.5 bg-emerald-50/50 border border-emerald-150 text-xs rounded-xl space-y-1.5 mt-4">
                  <span className="font-extrabold text-emerald-800 block uppercase text-[10px]">
                    Cơ chế ghi nhận doanh thu đối tác:
                  </span>
                  <p className="text-[10px] text-emerald-700 leading-normal">
                    Khi đơn hàng giao thành công, hoa hồng bưu cục đối tác được
                    tính bằng: <code>(Phí ship * Tỷ lệ hoa hồng) / 100</code> và
                    tự động cộng dồn trực tiếp vào Ví Điện Tử của điều phối bưu
                    cục lấy hàng.
                  </p>
                </div>
              </div>

              {/* Shipper Payout Config */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Truck className="w-4 h-4 text-blue-600" />
                  Chiết khấu thu nhập Tài xế (Shipper Payout)
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-550 mb-1.5 uppercase">
                      Chiết khấu cố định (Flat)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        disabled={isReadOnly}
                        className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
                        value={config.shipper_payout_flat}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            shipper_payout_flat: Number(e.target.value),
                          })
                        }
                      />
                      <span className="absolute inset-y-0 right-4 flex items-center text-[10px] text-slate-400 font-bold">
                        Đồng
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Cộng cố định cho mỗi đơn hàng shipper giao thành công.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-550 mb-1.5 uppercase">
                      Tỷ lệ theo phí ship (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        disabled={isReadOnly}
                        className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
                        value={config.shipper_payout_percent}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            shipper_payout_percent: Number(e.target.value),
                          })
                        }
                      />
                      <span className="absolute inset-y-0 right-4 flex items-center text-[10px] text-slate-400 font-bold">
                        %
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Trích phần trăm cước phí ship để trả thưởng cho shipper.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-550 mb-1.5 uppercase">
                      Thù lao Lấy hàng thành công
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        disabled={isReadOnly}
                        className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
                        value={config.shipper_pickup_payout || 2500}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            shipper_pickup_payout: Number(e.target.value),
                          })
                        }
                      />
                      <span className="absolute inset-y-0 right-4 flex items-center text-[10px] text-slate-400 font-bold">
                        VNĐ / Đơn
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Cộng vào ví khi lấy đơn từ Shop thành công và nhập kho.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-550 mb-1.5 uppercase">
                      Thù lao Trả hàng thành công
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        disabled={isReadOnly}
                        className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
                        value={config.shipper_return_payout || 2500}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            shipper_return_payout: Number(e.target.value),
                          })
                        }
                      />
                      <span className="absolute inset-y-0 right-4 flex items-center text-[10px] text-slate-400 font-bold">
                        VNĐ / Đơn
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Cộng vào ví khi giao hoàn trả hàng về Shop thành công.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-blue-50/50 border border-blue-150 text-xs rounded-xl space-y-1.5 mt-4">
                  <span className="font-extrabold text-blue-800 block uppercase text-[10px]">
                    Cơ chế ví thu nhập tài xế toàn diện:
                  </span>
                  <p className="text-[10px] text-blue-700 leading-relaxed">
                    - <strong>Giao thành công:</strong> Chiết khấu cố định + (% Phí ship).<br />
                    - <strong>Lấy thành công:</strong> Cộng thù lao lấy hàng ({config.shipper_pickup_payout?.toLocaleString("vi-VN") || "2.500"} ₫/đơn) khi nhập kho.<br />
                    - <strong>Trả thành công:</strong> Cộng thù lao hoàn trả ({config.shipper_return_payout?.toLocaleString("vi-VN") || "2.500"} ₫/đơn) khi bàn giao về Shop.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUDITS */}
          {activeTab === "AUDITS" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                <History className="w-5 h-5 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  Lịch sử thay đổi Biểu phí & Hoa hồng
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-5 py-3 border-b border-slate-200">
                        Thời gian
                      </th>
                      <th className="px-5 py-3 border-b border-slate-200">
                        Người thay đổi
                      </th>
                      <th className="px-5 py-3 border-b border-slate-200">
                        Bưu cục
                      </th>
                      <th className="px-5 py-3 border-b border-slate-200">
                        Chi tiết thay đổi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {audits.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-5 py-8 text-center text-slate-400 text-sm"
                        >
                          Chưa có lịch sử thay đổi nào.
                        </td>
                      </tr>
                    ) : (
                      audits.map((audit) => (
                        <tr
                          key={audit.id}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-5 py-3 text-slate-700 whitespace-nowrap">
                            {new Date(audit.created_at).toLocaleString("vi-VN")}
                          </td>
                          <td className="px-5 py-3 font-semibold text-blue-700">
                            {audit.changed_by?.full_name || "Hệ thống"}
                          </td>
                          <td className="px-5 py-3">
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-mono font-medium">
                              {selectedHubId === "DEFAULT"
                                ? "Mặc định"
                                : selectedHubId.substring(0, 8)}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="space-y-1.5">
                              {Object.entries(audit.changed_fields || {}).map(
                                ([key, value]) => (
                                  <div
                                    key={key}
                                    className="text-[11px] flex flex-wrap items-center gap-1.5"
                                  >
                                    <span className="font-semibold text-slate-600 w-32 truncate">
                                      {key}:
                                    </span>
                                    <span className="text-red-500 line-through decoration-red-300">
                                      {value.old}
                                    </span>
                                    <span className="text-slate-400">→</span>
                                    <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                                      {value.new}
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Form Actions */}
          {!isReadOnly && activeTab !== "AUDITS" && (
            <div className="flex justify-end gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm sticky bottom-4 z-10">
              <button
                type="button"
                onClick={loadConfig}
                className="px-4 py-2 border border-slate-250 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Tải lại
              </button>
              <button
                type="submit"
                disabled={isSubmitLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSubmitLoading
                  ? "Đang lưu cấu hình..."
                  : "Lưu cấu hình hệ thống"}
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
