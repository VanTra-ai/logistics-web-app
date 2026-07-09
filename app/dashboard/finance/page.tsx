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
} from "lucide-react";
import api from "@/lib/axios";
import axios from "axios";

interface TariffConfig {
  base_price_distance: number;
  base_distance_limit: number;
  block_price_distance: number;
  cod_fee_percent: number;
  hub_commission_percent: number;
  shipper_payout_flat: number;
  shipper_payout_percent: number;
}

export default function FinanceTariffPage() {
  const [activeTab, setActiveTab] = useState<"TARIFF" | "COMMISSION">("TARIFF");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [config, setConfig] = useState<TariffConfig>({
    base_price_distance: 15000,
    base_distance_limit: 2,
    block_price_distance: 4000,
    cod_fee_percent: 1.0,
    hub_commission_percent: 15.0,
    shipper_payout_flat: 3500,
    shipper_payout_percent: 10.0,
  });

  const loadConfig = async () => {
    setIsLoading(true);
    setNotification(null);
    try {
      const res = await api.get("/finance/tariff");
      if (res.data?.data) {
        setConfig(res.data.data);
      } else if (res.data) {
        setConfig(res.data);
      }
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
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitLoading(true);
    setNotification(null);

    try {
      await api.patch("/finance/tariff", {
        base_price_distance: Math.round(Number(config.base_price_distance)),
        base_distance_limit: Number(
          Number(config.base_distance_limit).toFixed(2),
        ),
        block_price_distance: Math.round(Number(config.block_price_distance)),
        cod_fee_percent: Number(Number(config.cod_fee_percent).toFixed(2)),
        hub_commission_percent: Number(
          Number(config.hub_commission_percent).toFixed(2),
        ),
        shipper_payout_flat: Math.round(Number(config.shipper_payout_flat)),
        shipper_payout_percent: Number(
          Number(config.shipper_payout_percent).toFixed(2),
        ),
      });
      setNotification({
        type: "success",
        message: "Đã lưu cấu hình tài chính & biểu phí thành công!",
      });
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

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Demo Warning */}

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
              Quản Trị Dòng Tiền & Cấu Hình Biểu Phí
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Định nghĩa bảng giá cước vận chuyển, phụ phí cồng kềnh, phí COD và
              tỷ lệ chia sẻ hoa hồng bưu cục đối tác
            </p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab("TARIFF")}
            className={`px-4 py-2 font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "TARIFF"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Biểu phí Vận chuyển
          </button>
          <button
            onClick={() => setActiveTab("COMMISSION")}
            className={`px-4 py-2 font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "COMMISSION"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Hoa hồng & Chiết khấu
          </button>
        </div>
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
                        className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold"
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
                        className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold"
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

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-550 mb-1.5 uppercase">
                      Đơn giá km tiếp theo (Block)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold"
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
                      Đơn giá cộng thêm cho mỗi kilômét hoặc kilôgam vượt mức cơ
                      bản.
                    </p>
                  </div>
                </div>
              </div>

              {/* Side Info & Surcharges */}
              <div className="space-y-6">
                {/* Surcharges Card */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Settings className="w-4 h-4 text-indigo-650" />
                    Phụ phí & Quy đổi thể tích
                  </h2>

                  <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl text-xs space-y-2">
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-500">
                      <span>CÔNG THỨC QUY ĐỔI THỂ TÍCH</span>
                    </div>
                    <div className="font-mono text-xs text-indigo-750 bg-indigo-50/50 p-2.5 rounded-lg text-center font-bold">
                      (Dài x Rộng x Cao) / 5000
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Các đơn hàng cồng kềnh có khối lượng quy đổi lớn hơn cân
                      nặng thực tế sẽ được tính cước theo khối lượng quy đổi thể
                      tích này.
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-550 mb-1.5 uppercase">
                        Tỷ lệ phí dịch vụ thu hộ COD
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold"
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
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold"
                      value={config.hub_commission_percent}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          hub_commission_percent: Number(e.target.value),
                        })
                      }
                    />
                    <span className="absolute inset-y-0 right-4 flex items-center text-[10px] text-slate-400 font-bold">
                      %
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-450 mt-1">
                    Phần trăm cước phí vận chuyển được ghi nhận doanh thu cho
                    bưu cục nhượng quyền quản lý đơn.
                  </p>
                </div>

                <div className="p-3.5 bg-emerald-50/50 border border-emerald-150 text-xs rounded-xl space-y-1.5">
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
                        className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold"
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
                      Tỷ lệ theo phí ship (Percent)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold"
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

                <div className="p-3.5 bg-blue-50/50 border border-blue-150 text-xs rounded-xl space-y-1.5">
                  <span className="font-extrabold text-blue-800 block uppercase text-[10px]">
                    Cơ chế ví tiền tài xế:
                  </span>
                  <p className="text-[10px] text-blue-700 leading-normal">
                    Thu nhập shipper mỗi đơn hoàn thành ={" "}
                    <code>
                      Chiết khấu cố định + (Phí ship * Tỷ lệ phí ship) / 100
                    </code>
                    . Số dư khả dụng của tài xế sẽ cộng dồn tương ứng ngay sau
                    khi bấm hoàn tất đơn.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <button
              type="button"
              onClick={loadConfig}
              className="px-4 py-2 border border-slate-250 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Đặt lại
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
        </form>
      )}
    </div>
  );
}
