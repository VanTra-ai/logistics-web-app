"use client";

import { useState, useEffect } from "react";
import {
  Wallet,
  Search,
  ArrowRightLeft,
  DollarSign,
  X,
  CheckCircle,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import api from "@/lib/axios";

type WalletData = {
  id: string;
  cod_debt: number;
  income_balance: number;
  user?: { id: string; full_name: string; email?: string };
  transactions?: Transaction[];
};

type Transaction = {
  id: string;
  type: "COD_DEPOSIT" | "INCOME" | "WITHDRAWAL";
  amount: number;
  date: string;
  status: "SUCCESS" | "PENDING" | "FAILED";
};

export default function WalletsPage() {
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWallet, setSelectedWallet] = useState<WalletData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [remitAmount, setRemitAmount] = useState<number | string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Fetch wallets from API on mount
  useEffect(() => {
    const fetchWallets = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const savedUser = localStorage.getItem("user");
        const role = savedUser ? JSON.parse(savedUser).role : "";
        const endpoint = role === "SHIPPER" ? "/wallets/me" : "/wallets";
        const res = await api.get(endpoint);
        const data = res.data?.data || res.data || [];
        setWallets(Array.isArray(data) ? data : [data]);
      } catch (err) {
        console.error("Lỗi fetch ví:", err);
        setFetchError("Không thể tải danh sách ví. Vui lòng thử lại.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchWallets();
  }, []);

  const filteredWallets = wallets.filter((w) => {
    const name = w.user?.full_name || "";
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const openDrawer = (wallet: WalletData) => {
    setSelectedWallet(wallet);
    setRemitAmount(wallet.cod_debt);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedWallet(null);
  };

  const handleRemitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWallet) return;

    const amount = Number(remitAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast("Vui lòng nhập số tiền hợp lệ", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/wallets/requests", {
        walletId: selectedWallet.id,
        amount,
        type: "COD_DEPOSIT",
        note: `Nộp COD ${formatCurrency(amount)}`,
      });
      showToast(
        `Đã gửi yêu cầu nộp COD ${formatCurrency(amount)} cho tài xế ${selectedWallet.user?.full_name || "Shipper"}`,
        "success",
      );
      closeDrawer();
      // Re-fetch to refresh balances
      const res = await api.get("/wallets");
      const data = res.data?.data || res.data || [];
      setWallets(Array.isArray(data) ? data : [data]);
    } catch (err) {
      console.error("Lỗi nộp COD:", err);
      showToast("Có lỗi xảy ra. Vui lòng thử lại.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white animate-in slide-in-from-top-2 ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <X className="w-5 h-5" />
          )}
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-blue-600" />
            Quản lý Ví tài xế
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi công nợ COD và thu nhập của shipper
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên tài xế..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Đang tải danh sách ví...</span>
          </div>
        ) : fetchError ? (
          <div className="flex items-center justify-center py-16 gap-3 text-red-500">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{fetchError}</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                  <th className="px-6 py-4 font-medium">Tên Tài xế</th>
                  <th className="px-6 py-4 font-medium text-right">
                    Dư nợ COD
                  </th>
                  <th className="px-6 py-4 font-medium text-right">
                    Số dư Thu nhập
                  </th>
                  <th className="px-6 py-4 font-medium text-center">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWallets.length > 0 ? (
                  filteredWallets.map((wallet) => (
                    <tr
                      key={wallet.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      onClick={() => openDrawer(wallet)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs">
                            {(wallet.user?.full_name || "?").charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 text-sm group-hover:text-blue-600 transition-colors">
                              {wallet.user?.full_name || "Tài xế"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {wallet.user?.email ||
                                `ID: ${wallet.id.slice(0, 8)}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`font-semibold ${wallet.cod_debt > 0 ? "text-red-600" : "text-slate-600"}`}
                        >
                          {formatCurrency(wallet.cod_debt)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-semibold text-emerald-600">
                          {formatCurrency(wallet.income_balance)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDrawer(wallet);
                          }}
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-slate-500"
                    >
                      Không tìm thấy tài xế nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer */}
      {isDrawerOpen && selectedWallet && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/50 z-40 transition-opacity"
            onClick={closeDrawer}
          />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 bg-white">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Chi tiết Ví
                </h2>
                <p className="text-sm text-slate-500">
                  {selectedWallet.user?.full_name || "Shipper"}
                </p>
              </div>
              <button
                onClick={closeDrawer}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8">
              {/* Wallet Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                  <div className="flex items-center gap-2 text-red-600 mb-2">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Dư nợ COD
                    </span>
                  </div>
                  <p className="text-xl font-bold text-red-700">
                    {formatCurrency(selectedWallet.cod_debt)}
                  </p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-2 text-emerald-600 mb-2">
                    <Wallet className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Thu nhập
                    </span>
                  </div>
                  <p className="text-xl font-bold text-emerald-700">
                    {formatCurrency(selectedWallet.income_balance)}
                  </p>
                </div>
              </div>

              {/* Remit Form */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                  Xác nhận nộp COD
                </h3>
                <form onSubmit={handleRemitSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Số tiền nộp (VND)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-400">₫</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={remitAmount}
                        onChange={(e) => setRemitAmount(e.target.value)}
                        className="block w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
                        placeholder="Nhập số tiền..."
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={
                      isSubmitting || !remitAmount || Number(remitAmount) <= 0
                    }
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "Xác nhận nộp"
                    )}
                  </button>
                </form>
              </div>

              {/* Recent Transactions */}
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">
                  Lịch sử giao dịch gần đây
                </h3>
                <div className="space-y-3">
                  {(selectedWallet?.transactions || []).length > 0 ? (
                    (selectedWallet?.transactions || []).map(
                      (tx: Transaction) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                tx.type === "COD_DEPOSIT"
                                  ? "bg-blue-100 text-blue-600"
                                  : tx.type === "INCOME"
                                    ? "bg-emerald-100 text-emerald-600"
                                    : "bg-orange-100 text-orange-600"
                              }`}
                            >
                              {tx.type === "COD_DEPOSIT" ? (
                                <ArrowRightLeft className="w-4 h-4" />
                              ) : (
                                <Wallet className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-800">
                                {tx.type === "COD_DEPOSIT"
                                  ? "Nộp COD"
                                  : tx.type === "INCOME"
                                    ? "Cộng thu nhập"
                                    : "Rút tiền"}
                              </p>
                              <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                {tx.date}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-sm font-semibold ${tx.type === "COD_DEPOSIT" ? "text-blue-600" : "text-emerald-600"}`}
                            >
                              {tx.type === "COD_DEPOSIT" ? "-" : "+"}
                              {formatCurrency(tx.amount)}
                            </p>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                                tx.status === "SUCCESS"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : tx.status === "PENDING"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-red-100 text-red-700"
                              }`}
                            >
                              {tx.status === "SUCCESS"
                                ? "Thành công"
                                : tx.status === "PENDING"
                                  ? "Đang xử lý"
                                  : "Thất bại"}
                            </span>
                          </div>
                        </div>
                      ),
                    )
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-4">
                      Chưa có giao dịch nào.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
