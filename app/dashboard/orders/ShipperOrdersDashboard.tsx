"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Truck,
  Package,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  Upload,
  X,
  User,
  Phone,
  ScanLine,
  Map,
  RefreshCw,
} from "lucide-react";
import api from "@/lib/axios";
import axios from "axios";
import { Html5QrcodeScanner } from "html5-qrcode";
import Pagination from "@/components/Pagination";

interface Hub {
  id: string;
  name: string;
}

interface Order {
  id: string;
  tracking_number: string;
  sender_name: string;
  sender_phone?: string;
  sender_address?: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  weight: number;
  cod_amount: number;
  current_status: string;
  note?: string;
  created_at?: string;
}

interface Shipment {
  id: string;
  shipment_code?: string;
  vehicle_type: string;
  vehicle_number?: string;
  status: string;
  type: "PICKUP" | "DELIVERY" | "RETURN";
  origin_hub: Hub;
  destination_hub: Hub | null;
  orders: Order[];
  created_at?: string;
}

export default function ShipperOrdersDashboard() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedShipmentId, setExpandedShipmentId] = useState<string | null>(
    null,
  );

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [date, setDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const limit = 10;
  const [activeTab, setActiveTab] = useState<"PICKUP" | "DELIVERY" | "RETURN">(
    "DELIVERY",
  );

  // Stats
  const [totalOrders, setTotalOrders] = useState(0);

  // Scanner
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Modals
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  // Form states
  const [deliveryImage, setDeliveryImage] = useState<File | null>(null);
  const [deliveryImagePreview, setDeliveryImagePreview] = useState<
    string | null
  >(null);
  const [failedReason, setFailedReason] = useState("");
  const [failedNote, setFailedNote] = useState("");
  const [failedImage, setFailedImage] = useState<File | null>(null);
  const [failedImagePreview, setFailedImagePreview] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    try {
      const shipmentsRes = await api.get(
        `/shipments/me?page=${page}&limit=${limit}&date=${date}`,
      );

      const fetchedShipments = shipmentsRes.data?.data || [];
      setShipments(fetchedShipments);
      setTotalPages(shipmentsRes.data?.meta?.totalPages || 1);
      setTotalItems(shipmentsRes.data?.meta?.totalItems || 0);

      let ordersCount = 0;
      fetchedShipments.forEach((s: Shipment) => {
        ordersCount += s.orders?.length || 0;
      });

      setTotalOrders(ordersCount);
    } catch (e) {
      console.error("Failed to fetch data", e);
    } finally {
      setLoading(false);
    }
  }, [page, date]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchShipments();
  }, [fetchShipments]);

  // Handle Scanner
  useEffect(() => {
    if (isScannerOpen) {
      // Delay initialization slightly to ensure modal is rendered
      const timer = setTimeout(() => {
        scannerRef.current = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: 250 },
          false,
        );
        scannerRef.current.render(
          (decodedText) => {
            // Find order
            let foundOrder: Order | null = null;
            let foundShipmentId: string | null = null;

            for (const s of shipments) {
              const o = s.orders.find((o) => o.tracking_number === decodedText);
              if (o) {
                foundOrder = o;
                foundShipmentId = s.id;
                break;
              }
            }

            if (foundOrder && foundShipmentId) {
              scannerRef.current?.clear();
              setIsScannerOpen(false);
              setExpandedShipmentId(foundShipmentId);
              setSelectedOrder(foundOrder);

              // Scroll to the order element after a small delay
              setTimeout(() => {
                const el = document.getElementById(`order-${foundOrder!.id}`);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                  el.classList.add("ring-2", "ring-blue-500", "bg-blue-50");
                  setTimeout(() => {
                    el.classList.remove(
                      "ring-2",
                      "ring-blue-500",
                      "bg-blue-50",
                    );
                  }, 2000);
                }

                // Open complete modal directly if it's currently delivering/picking
                if (
                  foundOrder!.current_status === "DELIVERING" ||
                  foundOrder!.current_status === "PICKING" ||
                  foundOrder!.current_status === "RETURNING"
                ) {
                  setShowCompleteModal(true);
                } else {
                  alert(
                    `Đơn hàng ${decodedText} đang ở trạng thái: ${foundOrder!.current_status}`,
                  );
                }
              }, 300);
            } else {
              alert(
                `Không tìm thấy đơn hàng ${decodedText} trong danh sách hiện tại!`,
              );
            }
          },
          () => {
            // ignore
          },
        );
      }, 200);
      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(console.error);
        }
      };
    }
  }, [isScannerOpen, shipments]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDeliveryImage(file);
      setDeliveryImagePreview(URL.createObjectURL(file));
    }
  };

  const handleFailedImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFailedImage(file);
      setFailedImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCompleteOrder = async () => {
    if (!selectedOrder) return;
    if (!deliveryImage) {
      alert("Vui lòng tải lên ảnh xác nhận giao hàng!");
      return;
    }

    setIsSubmitting(true);
    try {
      const fakeUrl = deliveryImagePreview || "https://fakeimg.pl/300/";

      await api.patch(`/orders/${selectedOrder.id}/complete`, {
        delivery_image_url: fakeUrl,
        lat: 0,
        long: 0,
        note: "Đã giao thành công (Web App)",
      });

      alert("Xác nhận giao hàng thành công!");
      setShowCompleteModal(false);
      setDeliveryImage(null);
      setDeliveryImagePreview(null);
      void fetchShipments();
    } catch (e) {
      if (axios.isAxiosError(e)) {
        alert(e.response?.data?.message || "Lỗi khi hoàn thành đơn hàng");
      } else {
        alert("Lỗi khi hoàn thành đơn hàng");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFailedOrder = async () => {
    if (!selectedOrder) return;
    if (!failedReason) {
      alert("Vui lòng chọn lý do thất bại!");
      return;
    }

    if (failedReason === "Lý do khác" && !failedNote.trim()) {
      alert("Vui lòng nhập chi tiết lý do khác!");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalNote =
        failedReason === "Lý do khác"
          ? failedNote
          : failedNote.trim()
            ? `${failedReason} - ${failedNote}`
            : failedReason;

      await api.patch(`/orders/${selectedOrder.id}/status`, {
        status: "FAILED",
        note: finalNote,
      });

      const formData = new FormData();
      formData.append("orderId", selectedOrder.id);
      formData.append("reason", failedReason);
      formData.append("description", finalNote);
      if (failedImage) {
        formData.append("proof_image", failedImage);
      }

      await api.post("/incidents", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert("Đã báo cáo giao hàng thất bại!");
      setShowFailedModal(false);
      setFailedReason("");
      setFailedNote("");
      setFailedImage(null);
      setFailedImagePreview(null);
      void fetchShipments();
    } catch (e) {
      if (axios.isAxiosError(e)) {
        alert(e.response?.data?.message || "Lỗi khi báo cáo thất bại");
      } else {
        alert("Lỗi khi báo cáo thất bại");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredShipments = shipments.filter((s) => s.type === activeTab);

  return (
    <div className="max-w-xl md:max-w-4xl mx-auto space-y-6 pb-20">
      {/* Banner & Stats */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">Xin chào, Đối tác!</h1>
            <p className="text-blue-100 text-sm mt-1">
              Chúc bạn một ngày làm việc an toàn.
            </p>
          </div>
          <button
            onClick={() => void fetchShipments()}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4">
          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm inline-block min-w-[120px]">
            <p className="text-blue-100 text-xs font-medium uppercase mb-1">
              Tổng đơn
            </p>
            <p className="text-2xl font-black">{totalOrders}</p>
          </div>
        </div>
      </div>

      {/* Date Filter & Tabs */}
      <div className="space-y-4 sticky top-0 z-10 bg-slate-50/80 backdrop-blur-md py-2 border-b border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <div className="flex bg-slate-200/60 p-1 rounded-xl w-full">
            {(["PICKUP", "DELIVERY", "RETURN"] as const).map((tab) => {
              const labels = {
                PICKUP: "LẤY HÀNG",
                DELIVERY: "GIAO HÀNG",
                RETURN: "TRẢ HÀNG",
              };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${
                    activeTab === tab
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredShipments.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">
            Không có chuyến xe nào
          </h3>
          <p className="text-slate-500 mt-2 text-sm">
            Bạn không có chuyến{" "}
            {activeTab === "PICKUP"
              ? "lấy"
              : activeTab === "DELIVERY"
                ? "giao"
                : "trả"}{" "}
            hàng nào trong ngày {date}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredShipments.map((shipment) => {
            const isExpanded = expandedShipmentId === shipment.id;
            const validOrders = shipment.orders.filter(
              (o) =>
                o.current_status !== "CANCELLED" &&
                o.current_status !== "RETURN_TO_SENDER",
            );
            const completedOrders = validOrders.filter(
              (o) =>
                o.current_status === "FINISHED" ||
                o.current_status === "FAILED",
            );
            const progress =
              validOrders.length > 0
                ? Math.round(
                    (completedOrders.length / validOrders.length) * 100,
                  )
                : 0;

            const totalCod = validOrders.reduce(
              (sum, o) => sum + Number(o.cod_amount || 0),
              0,
            );

            return (
              <div
                key={shipment.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
              >
                {/* Header Card */}
                <div
                  className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() =>
                    setExpandedShipmentId(isExpanded ? null : shipment.id)
                  }
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          {shipment.shipment_code || "Chuyến xe"}
                          {shipment.created_at && (
                            <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(shipment.created_at).toLocaleDateString(
                                "vi-VN",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {shipment.origin_hub?.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider">
                        {shipment.status === "PENDING"
                          ? "Chờ chạy"
                          : shipment.status === "IN_TRANSIT"
                            ? "Đang chạy"
                            : "Hoàn thành"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex-1">
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">
                        Tiến độ ({completedOrders.length}/{validOrders.length})
                      </p>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-right pl-4 border-l border-slate-200">
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">
                        Tổng Thu Hộ
                      </p>
                      <p className="text-sm font-black text-slate-800">
                        {totalCod.toLocaleString("vi-VN")}đ
                      </p>
                    </div>
                  </div>
                </div>

                {/* Expanded Orders List */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50 p-3 md:p-5">
                    {validOrders.length === 0 ? (
                      <p className="text-sm text-slate-500 italic text-center py-4">
                        Không có đơn hàng nào hợp lệ.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {validOrders.map((order) => {
                          const contactName =
                            activeTab === "PICKUP"
                              ? order.sender_name
                              : order.receiver_name;
                          const contactPhone =
                            activeTab === "PICKUP"
                              ? order.sender_phone
                              : order.receiver_phone;
                          const contactAddress =
                            activeTab === "PICKUP"
                              ? order.sender_address
                              : order.receiver_address;

                          return (
                            <div
                              key={order.id}
                              id={`order-${order.id}`}
                              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all"
                            >
                              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
                                <div>
                                  <span className="font-black text-slate-800 text-lg mr-2">
                                    {order.tracking_number}
                                  </span>
                                  {order.created_at && (
                                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                                      <Clock className="w-3 h-3" />
                                      {new Date(
                                        order.created_at,
                                      ).toLocaleDateString("vi-VN", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                      })}
                                    </span>
                                  )}
                                </div>
                                <span
                                  className={`text-xs font-bold px-2 py-1 rounded ${
                                    order.current_status === "FINISHED"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : order.current_status === "FAILED"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  {order.current_status}
                                </span>
                              </div>

                              <div className="mb-4">
                                <p className="text-sm text-slate-800 font-bold flex items-center gap-2 mb-1">
                                  <User className="w-4 h-4 text-slate-400" />
                                  {contactName}
                                </p>
                                <p className="text-sm text-slate-600 flex items-start gap-2">
                                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />
                                  <span className="line-clamp-2">
                                    {contactAddress}
                                  </span>
                                </p>
                              </div>

                              {/* Action Buttons for Mobile */}
                              <div className="flex gap-2 mb-4">
                                {contactPhone && (
                                  <a
                                    href={`tel:${contactPhone}`}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors"
                                  >
                                    <Phone className="w-4 h-4" />
                                    Gọi điện
                                  </a>
                                )}
                                {contactAddress && (
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contactAddress)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors"
                                  >
                                    <Map className="w-4 h-4" />
                                    Dẫn đường
                                  </a>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedOrder(order);
                                  }}
                                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
                                >
                                  <Clock className="w-4 h-4" />
                                  Lịch sử
                                </button>
                              </div>

                              <div className="flex items-center justify-between mt-4">
                                <div className="flex flex-col">
                                  {order.cod_amount > 0 && (
                                    <span className="text-sm font-black text-orange-600">
                                      Thu hộ:{" "}
                                      {Number(order.cod_amount).toLocaleString(
                                        "vi-VN",
                                      )}
                                      đ
                                    </span>
                                  )}
                                  <span className="text-xs text-slate-500 font-medium">
                                    Nặng: {order.weight}kg
                                  </span>
                                </div>

                                {shipment.status === "IN_TRANSIT" &&
                                  (order.current_status === "DELIVERING" ||
                                    order.current_status === "PICKING" ||
                                    order.current_status === "RETURNING") && (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => {
                                          setSelectedOrder(order);
                                          setShowFailedModal(true);
                                        }}
                                        className="w-10 h-10 flex items-center justify-center bg-red-100 text-red-600 hover:bg-red-200 rounded-full transition-colors"
                                        title="Thất bại"
                                      >
                                        <AlertCircle className="w-5 h-5" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedOrder(order);
                                          setShowCompleteModal(true);
                                        }}
                                        className="w-10 h-10 flex items-center justify-center bg-emerald-500 text-white hover:bg-emerald-600 rounded-full transition-colors shadow-md shadow-emerald-500/30"
                                        title="Thành công"
                                      >
                                        <CheckCircle2 className="w-5 h-5" />
                                      </button>
                                    </div>
                                  )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={limit}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Floating Action Button for Scanner */}
      <button
        onClick={() => setIsScannerOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all z-40"
      >
        <ScanLine className="w-6 h-6" />
      </button>

      {/* Scanner Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden relative">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-blue-600" />
                Quét mã vận đơn
              </h3>
              <button
                onClick={() => setIsScannerOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4">
              <div
                id="qr-reader"
                className="w-full overflow-hidden rounded-xl bg-slate-100"
              ></div>
              <p className="text-center text-xs text-slate-500 mt-4">
                Hướng camera vào mã vạch trên kiện hàng để quét nhanh.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hoàn Thành */}
      {showCompleteModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-emerald-50">
              <h3 className="text-lg font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Xác nhận thành công
              </h3>
              <button
                onClick={() => {
                  setShowCompleteModal(false);
                  setDeliveryImage(null);
                  setDeliveryImagePreview(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Mã đơn hàng
                </p>
                <p className="text-xl font-black text-slate-800">
                  {selectedOrder.tracking_number}
                </p>
              </div>
              {selectedOrder.cod_amount > 0 && (
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                  <p className="text-xs font-bold text-orange-800 uppercase tracking-wider mb-1">
                    Số tiền cần thu
                  </p>
                  <p className="text-3xl font-black text-orange-600">
                    {Number(selectedOrder.cod_amount).toLocaleString("vi-VN")}đ
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Ảnh xác nhận (Bắt buộc)
                </label>
                {deliveryImagePreview ? (
                  <div className="relative border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={deliveryImagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover"
                    />
                    <button
                      onClick={() => {
                        setDeliveryImage(null);
                        setDeliveryImagePreview(null);
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-blue-300 transition-colors group">
                    <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-blue-600">
                      Chụp ảnh minh chứng
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button
                className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-bold"
                onClick={() => {
                  setShowCompleteModal(false);
                  setDeliveryImage(null);
                  setDeliveryImagePreview(null);
                }}
              >
                Hủy
              </button>
              <button
                className="flex-1 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-bold shadow-md shadow-emerald-500/20 disabled:opacity-50"
                onClick={handleCompleteOrder}
                disabled={isSubmitting || !deliveryImage}
              >
                {isSubmitting ? "Đang xử lý..." : "Xác nhận xong"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sự Cố */}
      {showFailedModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-red-50 sticky top-0 z-10">
              <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Báo cáo thất bại
              </h3>
              <button
                onClick={() => {
                  setShowFailedModal(false);
                  setFailedReason("");
                  setFailedNote("");
                  setFailedImage(null);
                  setFailedImagePreview(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Mã đơn hàng
                </p>
                <p className="text-xl font-black text-slate-800">
                  {selectedOrder.tracking_number}
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Lý do thất bại (Bắt buộc)
                </label>
                <select
                  value={failedReason}
                  onChange={(e) => setFailedReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                >
                  <option value="">-- Chọn lý do --</option>
                  <option value="Khách hàng không nghe máy">
                    Khách hàng không nghe máy
                  </option>
                  <option value="Khách hàng từ chối nhận hàng">
                    Khách hàng từ chối nhận hàng
                  </option>
                  <option value="Sai địa chỉ / Không tìm thấy địa chỉ">
                    Sai địa chỉ / Không tìm thấy địa chỉ
                  </option>
                  <option value="Khách hàng hẹn ngày giao lại">
                    Khách hàng hẹn ngày giao lại
                  </option>
                  <option value="Hàng hóa bị hư hỏng / bể vỡ">
                    Hàng hóa bị hư hỏng / bể vỡ
                  </option>
                  <option value="Lý do khác">Lý do khác</option>
                </select>
              </div>

              {(failedReason || failedNote) && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    {failedReason === "Lý do khác"
                      ? "Chi tiết lý do (Bắt buộc)"
                      : "Ghi chú thêm (Tùy chọn)"}
                  </label>
                  <textarea
                    value={failedNote}
                    onChange={(e) => setFailedNote(e.target.value)}
                    placeholder={
                      failedReason === "Lý do khác"
                        ? "Nhập lý do thất bại thực tế..."
                        : "Nhập ghi chú thêm nếu cần..."
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-h-[80px]"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Ảnh minh chứng (Tùy chọn)
                </label>
                {failedImagePreview ? (
                  <div className="relative border border-slate-200 rounded-xl overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={failedImagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover"
                    />
                    <button
                      onClick={() => {
                        setFailedImage(null);
                        setFailedImagePreview(null);
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors group">
                    <div className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-bold text-red-600">
                      Chụp ảnh minh chứng
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleFailedImageChange}
                    />
                  </label>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 sticky bottom-0">
              <button
                className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-bold"
                onClick={() => {
                  setShowFailedModal(false);
                  setFailedReason("");
                  setFailedNote("");
                  setFailedImage(null);
                  setFailedImagePreview(null);
                }}
              >
                Hủy
              </button>
              <button
                className="flex-1 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold shadow-md shadow-red-500/20 disabled:opacity-50"
                onClick={handleFailedOrder}
                disabled={isSubmitting || !failedReason}
              >
                {isSubmitting ? "Đang xử lý..." : "Xác nhận thất bại"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
