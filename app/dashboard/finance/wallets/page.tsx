"use client";

import { useState, useEffect, useCallback } from "react";
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
  Calendar,
} from "lucide-react";
import api from "@/lib/axios";
import Pagination from "@/components/Pagination";

type WalletData = {
  id: string;
  cod_debt: number;
  income_balance: number;
  user?: {
    id: string;
    full_name: string;
    email?: string;
    hub?: { id: string; name: string };
  };
  transactions?: Transaction[];
};

type Transaction = {
  id: string;
  type:
    | "COD_DEPOSIT"
    | "INCOME"
    | "WITHDRAWAL"
    | "REMIT"
    | "COMMISSION_EARNED"
    | "COD_COLLECTED"
    | "HUB_COMMISSION_EARNED";
  amount: number;
  date?: string;
  created_at?: string;
  status: "SUCCESS" | "PENDING" | "FAILED" | "COMPLETED";
};

export default function WalletsPage() {
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHub, setSelectedHub] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [hubs, setHubs] = useState<{ id: string; name: string }[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<WalletData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [userRole, setUserRole] = useState("");

  const [remitAmount, setRemitAmount] = useState<number | string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Pagination states for wallets
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  // Pagination and state for transactions
  const [txPage, setTxPage] = useState(1);
  const [txTotalPages, setTxTotalPages] = useState(1);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isTxLoading, setIsTxLoading] = useState(false);

  // Fetch wallets from API on mount and when filters change
  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const savedUser = localStorage.getItem("user");
        const role = savedUser ? JSON.parse(savedUser).role : "";
        setUserRole(role);
        const endpoint = role === "SHIPPER" ? "/wallets/me" : "/wallets";

        let url = endpoint;
        if (role !== "SHIPPER") {
          const params = new URLSearchParams({
            page: currentPage.toString(),
            limit: itemsPerPage.toString(),
          });
          if (searchTerm) params.append("search", searchTerm);
          if (selectedHub !== "ALL") params.append("hubId", selectedHub);
          url = `${endpoint}?${params.toString()}`;
        }

        const res = await api.get(url);
        if (role === "SHIPPER") {
          const data = res.data?.data || res.data || [];
          const walletArr = Array.isArray(data) ? data : [data];
          setWallets(walletArr);
          if (walletArr.length > 0) {
            setSelectedWallet(walletArr[0]);
          }
        } else {
          setWallets(res.data?.data || []);
          if (res.data?.meta) {
            setTotalPages(res.data.meta.totalPages);
            setTotalItems(res.data.meta.totalItems);
          }
        }
      } catch (err) {
        console.error("Lỗi fetch ví:", err);
        setFetchError("Không thể tải danh sách ví. Vui lòng thử lại.");
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [currentPage, searchTerm, selectedHub]);

  // Fetch transactions when selectedWallet or txPage changes
  const fetchTransactions = useCallback(
    async (page = txPage, walletId = selectedWallet?.id) => {
      if (!walletId) return;
      setIsTxLoading(true);
      try {
        const url =
          userRole === "SHIPPER"
            ? `/wallets/me/transactions?page=${page}&limit=10`
            : `/wallets/${walletId}/transactions?page=${page}&limit=10`;
        const res = await api.get(url);
        setTransactions(res.data?.data || []);
        if (res.data?.meta) {
          setTxTotalPages(res.data.meta.totalPages);
        }
      } catch (err) {
        console.error("Lỗi fetch transactions:", err);
      } finally {
        setIsTxLoading(false);
      }
    },
    [txPage, selectedWallet?.id, userRole],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    const fetchHubs = async () => {
      try {
        const res = await api.get("/hubs");
        const data = res.data?.data || res.data || [];
        const rawHubs = Array.isArray(data) ? data : [data];
        setHubs(
          rawHubs.filter((h: { is_active?: boolean }) => h.is_active !== false),
        );
      } catch (err) {
        console.error("Lỗi fetch hubs:", err);
      }
    };
    fetchHubs();
  }, []);

  // Use the fetched wallets directly since filtering is on the backend
  const filteredWallets = wallets;

  // Filter transactions by date range
  const filteredTransactions = transactions.filter((tx) => {
    const rawDate = tx.date || tx.created_at;
    if (!rawDate) return true;
    const txDate = new Date(rawDate);
    if (dateFrom) {
      const fromD = new Date(dateFrom);
      fromD.setHours(0, 0, 0, 0);
      if (txDate < fromD) return false;
    }
    if (dateTo) {
      const toD = new Date(dateTo);
      toD.setHours(23, 59, 59, 999);
      if (txDate > toD) return false;
    }
    return true;
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
    setTxPage(1);
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
      if (userRole !== "SHIPPER") {
        const res = await api.post(
          `/wallets/shippers/${selectedWallet.user?.id}/remit`,
        );
        showToast(
          res.data?.message ||
            `Đã thu COD thành công từ ${selectedWallet.user?.full_name || "Shipper"}`,
          "success",
        );
      } else {
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
      }
      // Re-fetch to refresh balances
      const url =
        userRole === "SHIPPER"
          ? "/wallets/me"
          : `/wallets?page=${currentPage}&limit=${itemsPerPage}${searchTerm ? `&search=${searchTerm}` : ""}${selectedHub !== "ALL" ? `&hubId=${selectedHub}` : ""}`;
      const res2 = await api.get(url);
      const data = res2.data?.data || res2.data || [];
      const walletArr = Array.isArray(data) ? data : [data];
      setWallets(walletArr);

      // Update selected wallet if drawer is open
      if (selectedWallet) {
        const updated = walletArr.find(
          (w: WalletData) => w.id === selectedWallet.id,
        );
        if (updated) setSelectedWallet(updated);
        // Refresh transactions to show the new REMIT transaction
        fetchTransactions(1, selectedWallet.id);
        setTxPage(1);
      }
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
            Quản lý Ví & Nợ COD
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi công nợ COD và thu nhập của shipper
          </p>
        </div>
      </div>

      {userRole === "SHIPPER" && selectedWallet && (
        <div className="space-y-6 mt-6 animate-fadeIn">
          {/* Wallet Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm">
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <DollarSign className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Dư nợ COD
                </span>
              </div>
              <p className="text-2xl font-black text-red-700">
                {formatCurrency(selectedWallet.cod_debt)}
              </p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-600 mb-2">
                <Wallet className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Thu nhập
                </span>
              </div>
              <p className="text-2xl font-black text-emerald-700">
                {formatCurrency(selectedWallet.income_balance)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="lg:col-span-1">
              {/* Recent Transactions */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
                <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-500" />
                    Lịch sử giao dịch
                  </h3>
                  {/* Date Filter */}
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="bg-transparent text-slate-700 outline-none cursor-pointer"
                    />
                    <span className="text-slate-400">→</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="bg-transparent text-slate-700 outline-none cursor-pointer"
                    />
                    {(dateFrom || dateTo) && (
                      <button
                        onClick={() => {
                          setDateFrom("");
                          setDateTo("");
                        }}
                        className="text-slate-400 hover:text-red-500 ml-1 font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  <div className="space-y-2">
                    {isTxLoading ? (
                      <div className="flex items-center justify-center py-10 gap-2 text-slate-500">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Đang tải giao dịch...</span>
                      </div>
                    ) : filteredTransactions.length > 0 ? (
                      filteredTransactions.map((tx: Transaction) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                tx.type === "INCOME" ||
                                tx.type === "COMMISSION_EARNED" ||
                                tx.type === "HUB_COMMISSION_EARNED"
                                  ? "bg-emerald-100 text-emerald-600"
                                  : tx.type === "COD_DEPOSIT" ||
                                      tx.type === "REMIT"
                                    ? "bg-blue-100 text-blue-600"
                                    : tx.type === "COD_COLLECTED"
                                      ? "bg-amber-100 text-amber-600"
                                      : "bg-red-100 text-red-600"
                              }`}
                            >
                              {tx.type === "INCOME" ||
                              tx.type === "COMMISSION_EARNED" ||
                              tx.type === "HUB_COMMISSION_EARNED" ? (
                                <DollarSign className="w-5 h-5" />
                              ) : tx.type === "COD_DEPOSIT" ||
                                tx.type === "REMIT" ||
                                tx.type === "COD_COLLECTED" ? (
                                <ArrowRightLeft className="w-5 h-5" />
                              ) : (
                                <Wallet className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm">
                                {tx.type === "INCOME" ||
                                tx.type === "COMMISSION_EARNED" ||
                                tx.type === "HUB_COMMISSION_EARNED"
                                  ? "Cộng thu nhập"
                                  : tx.type === "COD_DEPOSIT" ||
                                      tx.type === "REMIT"
                                    ? "Thu tiền COD"
                                    : tx.type === "COD_COLLECTED"
                                      ? "Ghi nợ COD (tạm giữ)"
                                      : "Rút tiền"}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                                {tx.date
                                  ? new Date(
                                      new Date(tx.date).getTime() -
                                        new Date().getTimezoneOffset() * 60000,
                                    ).toLocaleString("vi-VN")
                                  : tx.created_at
                                    ? new Date(
                                        new Date(tx.created_at).getTime() -
                                          new Date().getTimezoneOffset() *
                                            60000,
                                      ).toLocaleString("vi-VN")
                                    : ""}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`font-bold ${
                                tx.type === "INCOME" ||
                                tx.type === "COMMISSION_EARNED" ||
                                tx.type === "HUB_COMMISSION_EARNED"
                                  ? "text-emerald-600"
                                  : tx.type === "COD_DEPOSIT" ||
                                      tx.type === "REMIT"
                                    ? "text-blue-600"
                                    : tx.type === "COD_COLLECTED"
                                      ? "text-amber-600"
                                      : "text-slate-700"
                              }`}
                            >
                              {tx.type === "INCOME" ||
                              tx.type === "COMMISSION_EARNED" ||
                              tx.type === "HUB_COMMISSION_EARNED" ||
                              tx.type === "COD_COLLECTED"
                                ? "+"
                                : "-"}
                              {formatCurrency(tx.amount)}
                            </p>
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mt-1 uppercase tracking-wider ${
                                !tx.status ||
                                tx.status === "SUCCESS" ||
                                tx.status === "COMPLETED"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : tx.status === "PENDING"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-red-50 text-red-700"
                              }`}
                            >
                              {!tx.status ||
                              tx.status === "SUCCESS" ||
                              tx.status === "COMPLETED"
                                ? "THÀNH CÔNG"
                                : tx.status === "PENDING"
                                  ? "ĐANG XỬ LÝ"
                                  : "THẤT BẠI"}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10 text-slate-500 text-sm">
                        Chưa có giao dịch nào
                      </div>
                    )}
                  </div>
                </div>
                {/* Transaction Pagination */}
                {txTotalPages > 1 && (
                  <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
                    <button
                      onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                      disabled={txPage === 1 || isTxLoading}
                      className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded disabled:opacity-50 text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                      Trước
                    </button>
                    <span className="text-sm text-slate-600 font-medium">
                      Trang {txPage} / {txTotalPages}
                    </span>
                    <button
                      onClick={() =>
                        setTxPage((p) => Math.min(txTotalPages, p + 1))
                      }
                      disabled={txPage === txTotalPages || isTxLoading}
                      className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded disabled:opacity-50 text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                      Sau
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {userRole !== "SHIPPER" && (
        <>
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row gap-4 w-full md:max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên tài xế..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                />
              </div>
              {userRole === "ADMIN" && (
                <select
                  className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold sm:min-w-[170px]"
                  value={selectedHub}
                  onChange={(e) => setSelectedHub(e.target.value)}
                >
                  <option value="ALL">Tất cả bưu cục</option>
                  {hubs.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Date Range Picker */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-xs shrink-0">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-500 font-medium">Lọc ngày:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-slate-700 font-semibold outline-none cursor-pointer"
              />
              <span className="text-slate-400">→</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-slate-700 font-semibold outline-none cursor-pointer"
              />
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="text-slate-400 hover:text-red-500 ml-1 font-bold"
                  title="Xóa bộ lọc ngày"
                >
                  ✕
                </button>
              )}
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
                      {userRole === "ADMIN" && (
                        <th className="px-6 py-4 font-medium">Bưu cục</th>
                      )}
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
                          {userRole === "ADMIN" && (
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {wallet.user?.hub?.name || "Chưa gắn kho"}
                              </span>
                            </td>
                          )}
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
                          colSpan={userRole === "ADMIN" ? 5 : 4}
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
            {!isLoading &&
              filteredWallets.length > 0 &&
              userRole !== "SHIPPER" && (
                <div className="p-4 border-t border-slate-200 flex justify-center bg-white z-10">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                  />
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
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-center">
                    <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center justify-center gap-2">
                      <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                      Xác nhận Thu COD tất tay
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Hệ thống sẽ quét tất cả các đơn hàng đã thu tiền của tài
                      xế này và gạch nợ tự động trong 1 click.
                    </p>
                    <button
                      onClick={handleRemitSubmit}
                      disabled={isSubmitting || selectedWallet.cod_debt <= 0}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        `Thu ${formatCurrency(selectedWallet.cod_debt)}`
                      )}
                    </button>
                  </div>

                  {/* Recent Transactions */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">
                      Lịch sử giao dịch gần đây
                    </h3>
                    <div className="space-y-3">
                      {isTxLoading ? (
                        <div className="py-4 text-center text-sm text-slate-500">
                          Đang tải...
                        </div>
                      ) : (transactions || []).length > 0 ? (
                        (transactions || []).map((tx: Transaction) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  tx.type === "COD_DEPOSIT" ||
                                  tx.type === "REMIT"
                                    ? "bg-blue-100 text-blue-600"
                                    : tx.type === "INCOME" ||
                                        tx.type === "COMMISSION_EARNED" ||
                                        tx.type === "HUB_COMMISSION_EARNED"
                                      ? "bg-emerald-100 text-emerald-600"
                                      : tx.type === "COD_COLLECTED"
                                        ? "bg-amber-100 text-amber-600"
                                        : "bg-orange-100 text-orange-600"
                                }`}
                              >
                                {tx.type === "COD_DEPOSIT" ||
                                tx.type === "REMIT" ||
                                tx.type === "COD_COLLECTED" ? (
                                  <ArrowRightLeft className="w-4 h-4" />
                                ) : (
                                  <Wallet className="w-4 h-4" />
                                )}
                              </div>
                              <div>
                                <p className="text-xs font-medium text-slate-800">
                                  {tx.type === "COD_DEPOSIT" ||
                                  tx.type === "REMIT"
                                    ? "Thu COD"
                                    : tx.type === "INCOME" ||
                                        tx.type === "COMMISSION_EARNED" ||
                                        tx.type === "HUB_COMMISSION_EARNED"
                                      ? "Cộng thu nhập"
                                      : tx.type === "COD_COLLECTED"
                                        ? "Ghi nợ COD (tạm giữ)"
                                        : "Rút tiền"}
                                </p>
                                <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3" />
                                  {tx.date
                                    ? new Date(
                                        new Date(tx.date).getTime() -
                                          new Date().getTimezoneOffset() *
                                            60000,
                                      ).toLocaleString("vi-VN")
                                    : tx.created_at
                                      ? new Date(
                                          new Date(tx.created_at).getTime() -
                                            new Date().getTimezoneOffset() *
                                              60000,
                                        ).toLocaleString("vi-VN")
                                      : ""}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p
                                className={`text-sm font-semibold ${tx.type === "COD_DEPOSIT" || tx.type === "REMIT" ? "text-blue-600" : tx.type === "COD_COLLECTED" ? "text-amber-600" : "text-emerald-600"}`}
                              >
                                {tx.type === "COD_DEPOSIT" ||
                                tx.type === "REMIT"
                                  ? "-"
                                  : "+"}
                                {formatCurrency(tx.amount)}
                              </p>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                                  !tx.status ||
                                  tx.status === "SUCCESS" ||
                                  tx.status === "COMPLETED"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : tx.status === "PENDING"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-red-100 text-red-700"
                                }`}
                              >
                                {!tx.status ||
                                tx.status === "SUCCESS" ||
                                tx.status === "COMPLETED"
                                  ? "Thành công"
                                  : tx.status === "PENDING"
                                    ? "Đang xử lý"
                                    : "Thất bại"}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-4">
                          Chưa có giao dịch nào.
                        </p>
                      )}
                    </div>
                    {/* Transaction Pagination Drawer */}
                    {txTotalPages > 1 && (
                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                        <button
                          onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                          disabled={txPage === 1 || isTxLoading}
                          className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded disabled:opacity-50 text-sm font-medium hover:bg-slate-50 transition-colors"
                        >
                          Trước
                        </button>
                        <span className="text-sm text-slate-600 font-medium">
                          Trang {txPage} / {txTotalPages}
                        </span>
                        <button
                          onClick={() =>
                            setTxPage((p) => Math.min(txTotalPages, p + 1))
                          }
                          disabled={txPage === txTotalPages || isTxLoading}
                          className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded disabled:opacity-50 text-sm font-medium hover:bg-slate-50 transition-colors"
                        >
                          Sau
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
