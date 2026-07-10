"use client";

import { useState, useEffect } from "react";
import {
  Truck,
  Plus,
  MapPin,
  User,
  CheckCircle2,
  AlertCircle,
  X,
  Package,
  Layers,
  ArrowRight,
  TrendingUp,
  Download,
  Bike,
} from "lucide-react";
import api from "@/lib/axios";
import axios from "axios";

interface Hub {
  id: string;
  name: string;
}

interface Shipper {
  id: string;
  full_name: string;
  phone_number: string;
  vehicle_number?: string;
  vehicle_type?: string;
  current_shipment_status?: string | null;
  current_shipment_id?: string | null;
}

interface Order {
  id: string;
  tracking_number: string;
  weight: number;
  receiver_address: string;
  current_status: string;
  location?: { location_barcode: string } | null;
}

interface Shipment {
  id: string;
  vehicle_type: string;
  vehicle_number: string;
  status: string;
  created_at: string;
  shipper: Shipper;
  origin_hub: Hub;
  destination_hub: Hub | null;
  capacity_weight?: number;
  orders: Order[];
}

interface LoggedInUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  hub?: { id: string; name: string } | null;
}

export default function DispatchPage() {
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editShipmentId, setEditShipmentId] = useState<string | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(
    null,
  );

  // Form states
  const [createForm, setCreateForm] = useState({
    shipper_id: "",
    vehicle_type: "TRUCK",
    destination_hub_id: "",
    vehicle_number: "",
    capacity_weight: 1000,
  });
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  // Admin: Hub filter để xem toàn bộ hạm đội
  const [adminHubFilter, setAdminHubFilter] = useState<string>("");

  // Load initial data
  const loadData = async (overrideHubId?: string) => {
    setIsLoading(true);
    setNotification(null);

    // Get current user from localStorage
    let currentHubId: string | null = overrideHubId || null;
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser) as LoggedInUser;
          setCurrentUser((prev) => prev || parsed);
          // Admin dùng overrideHubId (filter), Coordinator dùng hub của mình
          if (!overrideHubId && parsed.hub?.id && parsed.role !== "ADMIN") {
            currentHubId = parsed.hub.id;
          }
        } catch {
          // Do nothing
        }
      }
    }

    try {
      // 1. Load hubs list
      const hubsRes = await api.get("/hubs");
      const hubsList = hubsRes.data?.data || hubsRes.data || [];
      if (Array.isArray(hubsList)) setHubs(hubsList);

      // 2. Load shippers list for dispatch
      if (currentHubId) {
        const usersRes = await api.get(
          `/users/dispatch-shippers?hubId=${currentHubId}`,
        );
        const shippersList = usersRes.data?.data || usersRes.data || [];
        if (Array.isArray(shippersList)) {
          setShippers(shippersList);
        }
      }

      // 3. Load shipments for this hub
      const shipmentsRes = currentHubId
        ? await api.get(`/hubs/${currentHubId}/shipments`)
        : await api.get("/shipments");
      const shipmentsList = shipmentsRes.data?.data || shipmentsRes.data || [];
      if (Array.isArray(shipmentsList)) setShipments(shipmentsList);

      // 4. Load orders currently AT_HUB to assign
      const ordersRes = await api.get("/orders?limit=1000");
      const ordersList = ordersRes.data?.data || ordersRes.data || [];
      if (Array.isArray(ordersList)) {
        const atHubOrders = ordersList.filter(
          (o: Order & { shipment?: unknown; pickup_hub?: { id: string } }) =>
            o.current_status === "AT_HUB" &&
            !o.shipment &&
            (!currentHubId || o.pickup_hub?.id === currentHubId),
        );
        setAvailableOrders(atHubOrders);
      }
    } catch (err) {
      console.warn("Lỗi kết nối API backend.", err);
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setNotification({
          type: "error",
          message: "Bạn không có quyền truy cập thông tin điều phối",
        });
      }
      setHubs([]);
      setShippers([]);
      setShipments([]);
      setAvailableOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportManifest = async (shipmentId: string) => {
    try {
      setNotification({ type: "success", message: "Đang tải biên bản..." });
      const res = await api.get(`/exports/orders?shipmentId=${shipmentId}`, {
        responseType: "blob",
      });
      const blobUrl = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `bien-ban-${shipmentId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      setNotification({
        type: "error",
        message: "Không thể xuất biên bản lúc này.",
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Admin: reload khi đổi filter hub
  useEffect(() => {
    if (currentUser?.role === "ADMIN") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadData(adminHubFilter || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminHubFilter]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Mở Modal Tạo Chuyến xe
  const openCreateModal = () => {
    setEditShipmentId(null);
    setCreateForm({
      shipper_id: shippers.length > 0 ? shippers[0].id : "",
      vehicle_type: "TRUCK",
      destination_hub_id: "",
      vehicle_number: "",
      capacity_weight: 1000,
    });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (shipment: Shipment) => {
    setEditShipmentId(shipment.id);
    setCreateForm({
      shipper_id: shipment.shipper.id,
      vehicle_type: shipment.vehicle_type,
      destination_hub_id: shipment.destination_hub?.id || "",
      vehicle_number: shipment.vehicle_number || "",
      capacity_weight: shipment.capacity_weight || 1000,
    });
    setIsCreateModalOpen(true);
  };

  const handleRemoveOrder = async (shipmentId: string, orderId: string) => {
    if (!window.confirm("Bỏ kiện hàng này khỏi chuyến xe?")) return;
    try {
      await api.delete(`/shipments/${shipmentId}/orders/${orderId}`);
      await loadData();
      setNotification({
        type: "success",
        message: "Đã dỡ kiện hàng xuống an toàn!",
      });
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setNotification({
        type: "error",
        message: apiError.response?.data?.message || "Lỗi khi gỡ kiện hàng!",
      });
    }
  };

  // Lưu Chuyến xe (POST /shipments hoặc PATCH /shipments/:id)
  const handleSaveShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.shipper_id || !createForm.vehicle_number.trim()) {
      setNotification({
        type: "error",
        message: "Vui lòng nhập biển số xe và chọn tài xế!",
      });
      return;
    }

    setIsSubmitLoading(true);
    const originId = currentUser?.hub?.id || "hub-1";

    try {
      const payload = {
        shipper_id: createForm.shipper_id,
        vehicle_type: createForm.vehicle_type,
        origin_hub_id: originId,
        destination_hub_id:
          createForm.vehicle_type === "TRUCK"
            ? createForm.destination_hub_id
            : undefined,
        vehicle_number: createForm.vehicle_number.toUpperCase(),
        capacity_weight: Number(createForm.capacity_weight),
      };

      if (editShipmentId) {
        await api.patch(`/shipments/${editShipmentId}`, payload);
        setNotification({
          type: "success",
          message: "Cập nhật thông tin chuyến xe thành công!",
        });
      } else {
        await api.post("/shipments", payload);
        setNotification({
          type: "success",
          message: "Tạo chuyến xe tải mới thành công!",
        });
      }

      await loadData();
      setIsCreateModalOpen(false);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setNotification({
        type: "error",
        message: apiError.response?.data?.message || "Lỗi lưu chuyến xe!",
      });
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // Mở Modal xếp đơn
  const openAssignModal = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setSelectedOrderIds([]);
    setIsAssignModalOpen(true);
  };

  // Xếp đơn hàng lên chuyến xe (PATCH /shipments/:id/orders)
  const handleAssignOrders = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment) return;
    if (selectedOrderIds.length === 0) {
      setNotification({
        type: "error",
        message: "Vui lòng chọn ít nhất một kiện hàng!",
      });
      return;
    }

    setIsSubmitLoading(true);

    try {
      await api.patch(`/shipments/${selectedShipment.id}/orders`, {
        order_ids: selectedOrderIds,
      });
      await loadData();
      setIsAssignModalOpen(false);
      setNotification({
        type: "success",
        message: "Xếp hàng lên xe tải hoàn tất!",
      });
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setNotification({
        type: "error",
        message: apiError.response?.data?.message || "Lỗi xếp hàng hóa lên xe!",
      });
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // Cho xe xuất bến (PATCH /shipments/:id/status -> status: IN_TRANSIT)
  const handleDispatchTruck = async (shipment: Shipment) => {
    if (!shipment.orders || shipment.orders.length === 0) {
      alert(
        "Không thể chốt xuất bến chuyến xe rỗng! Vui lòng xếp hàng lên xe trước.",
      );
      return;
    }

    const confirmDispatch = window.confirm(
      `Xác nhận chốt sổ hành trình và cho xe tải "${shipment.vehicle_number}" lăn bánh rời bến?`,
    );
    if (!confirmDispatch) return;

    try {
      await api.patch(`/shipments/${shipment.id}/status`, {
        status: "IN_TRANSIT",
      });
      await loadData();
      setNotification({
        type: "success",
        message: `Chốt chuyến xe ${shipment.vehicle_number} xuất bến thành công!`,
      });
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setNotification({
        type: "error",
        message: apiError.response?.data?.message || "Lỗi khi chốt chuyến xe!",
      });
    }
  };

  const handleCancelShipment = async (shipment: Shipment) => {
    const confirmCancel = window.confirm(
      `Xác nhận HỦY chuyến xe "${shipment.vehicle_number || shipment.id}"? Đơn hàng sẽ được giải phóng lại kho.`,
    );
    if (!confirmCancel) return;

    try {
      await api.patch(`/shipments/${shipment.id}/cancel`);
      await loadData();
      setNotification({
        type: "success",
        message: `Hủy chuyến xe thành công!`,
      });
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setNotification({
        type: "error",
        message: apiError.response?.data?.message || "Lỗi khi hủy chuyến xe!",
      });
    }
  };

  const getWeightSum = (orders?: Order[]) => {
    if (!orders) return 0;
    return orders.reduce((sum, o) => sum + Number(o.weight), 0);
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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Truck className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Điều Phối Phương Tiện (Fleet Dispatching)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Quản lý đội xe tải (luân chuyển) và xe máy (giao hàng chặng cuối)
            </p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tạo chuyến xe mới
        </button>
      </div>

      {/* Admin Hub Filter */}
      {currentUser?.role === "ADMIN" && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="text-xs font-bold text-slate-600 shrink-0">
            Giám sát Bưu cục:
          </span>
          <select
            className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-250 text-slate-700 rounded-xl outline-none focus:border-blue-500"
            value={adminHubFilter}
            onChange={(e) => setAdminHubFilter(e.target.value)}
          >
            <option value="">🌏 Toàn quốc — Xem tất cả chuyến xe</option>
            {hubs.map((h) => (
              <option key={h.id} value={h.id}>
                🏢 {h.name}
              </option>
            ))}
          </select>
          {adminHubFilter && (
            <span className="text-[10px] text-blue-600 font-semibold shrink-0">
              Đang lọc: {hubs.find((h) => h.id === adminHubFilter)?.name}
            </span>
          )}
        </div>
      )}

      {/* Grid of Shipments */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Active Shipments */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {isLoading ? (
            <div className="md:col-span-2 p-12 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 text-sm font-medium">
                Đang tải danh sách chuyến xe...
              </p>
            </div>
          ) : shipments.length === 0 ? (
            <div className="md:col-span-2 p-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
              <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">
                Chưa có chuyến xe nào được thiết lập
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Vui lòng click nút &quot;Tạo chuyến xe mới&quot; để bắt đầu xếp
                hàng và bàn giao.
              </p>
            </div>
          ) : (
            shipments.map((ship) => {
              const currentWeight = getWeightSum(ship.orders);
              const maxWeight = Number(ship.capacity_weight) || 1000;
              const fillRate = Math.min(
                Math.round((currentWeight / maxWeight) * 100),
                100,
              );

              return (
                <div
                  key={ship.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between"
                >
                  {/* Shipment Top info */}
                  <div className="p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {ship.vehicle_type === "BIKE" ? (
                            <Bike className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Truck className="w-5 h-5 text-blue-600" />
                          )}
                          <h3 className="text-md font-extrabold text-slate-800">
                            {ship.vehicle_number}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              ship.status === "PENDING"
                                ? "bg-slate-100 text-slate-700"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {ship.status === "PENDING"
                              ? "Chờ bốc hàng"
                              : "Đang di chuyển"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          ID chuyến: {ship.id}
                        </p>
                      </div>

                      {/* Dispatch quick button */}
                      {ship.status === "PENDING" && (
                        <button
                          onClick={() => handleDispatchTruck(ship)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          Cho xe xuất bến
                        </button>
                      )}
                    </div>

                    {/* Hub Route indicator */}
                    <div className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold">
                      <div className="flex items-center gap-1 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{ship.origin_hub.name}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <div className="flex items-center gap-1 text-blue-700">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>
                          {ship.destination_hub?.name ||
                            "Giao tận tay khách hàng"}
                        </span>
                      </div>
                    </div>

                    {/* Shipper info */}
                    <div className="flex items-center gap-2.5 text-xs">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                        <User className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800 block">
                          Tài xế: {ship.shipper.full_name}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          SĐT: {ship.shipper.phone_number}
                        </span>
                      </div>
                    </div>

                    {/* Shipment Capacity progress bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] text-slate-500 font-bold">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                          Tải trọng đã xếp:
                        </span>
                        <span
                          className={
                            fillRate >= 80
                              ? "text-emerald-600 font-extrabold"
                              : "text-blue-600 font-extrabold"
                          }
                        >
                          {currentWeight}kg / {maxWeight}kg ({fillRate}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-150 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${fillRate >= 80 ? "bg-emerald-500" : "bg-blue-500"}`}
                          style={{ width: `${fillRate}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Shipment bottom: orders list & action */}
                  <div className="border-t border-slate-150 bg-slate-50/50 p-4 flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Danh sách kiện hàng ({ship.orders?.length || 0})
                      </span>
                      {!ship.orders || ship.orders.length === 0 ? (
                        <span className="text-xs text-slate-400 italic block py-1">
                          Chưa có kiện hàng nào xếp trên xe.
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto py-1">
                          {(ship.orders || []).map((o) => (
                            <span
                              key={o.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono font-semibold text-slate-700"
                            >
                              <Package className="w-2.5 h-2.5 text-slate-400" />
                              {o.tracking_number} ({o.weight}kg)
                              {ship.status === "PENDING" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveOrder(ship.id, o.id);
                                  }}
                                  className="ml-0.5 p-0.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                  title="Gỡ kiện hàng khỏi xe"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {ship.status === "PENDING" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openAssignModal(ship)}
                          className="flex-1 py-2 bg-white hover:bg-slate-100 text-slate-750 border border-slate-250 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5 text-slate-500" />
                          Xếp thêm hàng
                        </button>
                        <button
                          onClick={() => openEditModal(ship)}
                          className="py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 font-bold text-xs rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                          title="Sửa thông tin chuyến"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleCancelShipment(ship)}
                          className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                          title="Hủy chuyến"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {(ship.orders?.length || 0) > 0 &&
                      ship.vehicle_type === "TRUCK" && (
                        <button
                          onClick={() => handleExportManifest(ship.id)}
                          className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-750 border border-emerald-250 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-600" />
                          Tải Biên Bản (Excel)
                        </button>
                      )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Available Shippers */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col h-[500px]">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4 border-b pb-3">
            <User className="w-4 h-4 text-blue-600" />
            Tài xế trực chiến
          </h2>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {(() => {
              const available = shippers.filter((s) => !s.current_shipment_id);

              if (available.length === 0) {
                return (
                  <p className="text-xs text-slate-400 italic text-center py-4">
                    Tất cả tài xế đang đi giao hàng hoặc không online.
                  </p>
                );
              }

              return available.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                  onClick={() => {
                    setCreateForm({
                      ...createForm,
                      shipper_id: s.id,
                      vehicle_type:
                        s.vehicle_type === "BIKE" ? "BIKE" : "TRUCK",
                      vehicle_number: s.vehicle_number || "",
                      capacity_weight: s.vehicle_type === "BIKE" ? 50 : 1000,
                      destination_hub_id: "",
                    });
                    setIsCreateModalOpen(true);
                  }}
                >
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                    {s.vehicle_type === "BIKE" ? (
                      <Bike className="w-4 h-4" />
                    ) : (
                      <Truck className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {s.full_name}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {s.phone_number} - Xe: {s.vehicle_number || "Chưa có"}
                    </p>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* MODAL 1: TẠO CHUYẾN XE MỚI */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl relative overflow-hidden">
            <form onSubmit={handleSaveShipment}>
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-800">
                  {editShipmentId
                    ? "Sửa Thông Tin Chuyến Xe"
                    : "Điều Phối Xe Mới"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Biển số xe */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Biển số xe tải
                  </label>
                  <input
                    type="text"
                    required
                    className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm placeholder:text-slate-400"
                    placeholder="Ví dụ: 29C-123.45"
                    value={createForm.vehicle_number}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        vehicle_number: e.target.value,
                      })
                    }
                  />
                </div>

                {/* Tài xế */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Chọn tài xế phụ trách
                  </label>
                  <select
                    required
                    className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-250 text-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium"
                    value={createForm.shipper_id}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        shipper_id: e.target.value,
                      })
                    }
                  >
                    <option value="">-- Chọn tài xế xe tải --</option>
                    {shippers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} ({s.phone_number})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Loại Phương tiện */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Loại phương tiện
                  </label>
                  <div className="flex gap-4">
                    <label
                      className={`flex items-center gap-2 flex-1 p-3 rounded-xl border cursor-pointer transition-colors ${createForm.vehicle_type === "BIKE" ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200"}`}
                    >
                      <input
                        type="radio"
                        name="vehicle_type"
                        className="hidden"
                        checked={createForm.vehicle_type === "BIKE"}
                        onChange={() =>
                          setCreateForm({
                            ...createForm,
                            vehicle_type: "BIKE",
                            capacity_weight: 50,
                            destination_hub_id: "",
                          })
                        }
                      />
                      <Bike
                        className={`w-5 h-5 ${createForm.vehicle_type === "BIKE" ? "text-blue-600" : "text-slate-400"}`}
                      />
                      <span
                        className={`text-sm font-bold ${createForm.vehicle_type === "BIKE" ? "text-blue-800" : "text-slate-600"}`}
                      >
                        Xe máy 🛵
                      </span>
                    </label>
                    <label
                      className={`flex items-center gap-2 flex-1 p-3 rounded-xl border cursor-pointer transition-colors ${createForm.vehicle_type === "TRUCK" ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200"}`}
                    >
                      <input
                        type="radio"
                        name="vehicle_type"
                        className="hidden"
                        checked={createForm.vehicle_type === "TRUCK"}
                        onChange={() =>
                          setCreateForm({
                            ...createForm,
                            vehicle_type: "TRUCK",
                            capacity_weight: 1000,
                          })
                        }
                      />
                      <Truck
                        className={`w-5 h-5 ${createForm.vehicle_type === "TRUCK" ? "text-blue-600" : "text-slate-400"}`}
                      />
                      <span
                        className={`text-sm font-bold ${createForm.vehicle_type === "TRUCK" ? "text-blue-800" : "text-slate-600"}`}
                      >
                        Xe tải 🚚
                      </span>
                    </label>
                  </div>
                </div>

                {/* Trạm đích */}
                {createForm.vehicle_type === "TRUCK" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Bưu cục cập bến tiếp theo (Đích)
                    </label>
                    <select
                      required
                      className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-250 text-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium"
                      value={createForm.destination_hub_id}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          destination_hub_id: e.target.value,
                        })
                      }
                    >
                      <option value="">-- Chọn bưu cục đích --</option>
                      {hubs
                        .filter((h) => h.id !== currentUser?.hub?.id)
                        .map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Tải trọng xe */}
                <div>
                  <label className="block text-xs font-bold text-slate-555 uppercase tracking-wider mb-2">
                    Tải trọng tối đa của xe (kg)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-semibold"
                    value={createForm.capacity_weight}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        capacity_weight: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-150">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2.5 border border-slate-255 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitLoading}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
                  >
                    {isSubmitLoading
                      ? "Đang lưu..."
                      : editShipmentId
                        ? "Cập nhật chuyến"
                        : "Tạo chuyến"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: XẾP ĐƠN HÀNG LÊN XE */}
      {isAssignModalOpen && selectedShipment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl relative overflow-hidden">
            <div className="p-6 border-b border-slate-150 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Xếp hàng lên xe {selectedShipment.vehicle_number}
                </h2>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Chọn các kiện hàng có sẵn tại kho bãi để xếp lên tải
                </p>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignOrders} className="p-6 space-y-4">
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {availableOrders.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-6">
                    Hiện không còn đơn hàng nào trống ở bưu cục này.
                  </p>
                ) : (
                  availableOrders.map((o) => (
                    <label
                      key={o.id}
                      className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl cursor-pointer transition-colors text-xs font-semibold text-slate-800"
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        checked={selectedOrderIds.includes(o.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrderIds([...selectedOrderIds, o.id]);
                          } else {
                            setSelectedOrderIds(
                              selectedOrderIds.filter((id) => id !== o.id),
                            );
                          }
                        }}
                      />
                      <div className="flex-1 space-y-0.5">
                        <span className="font-mono text-slate-900 block flex items-center gap-2">
                          {o.tracking_number} ({o.weight}kg)
                          {o.location ? (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-bold rounded uppercase">
                              Kệ: {o.location.location_barcode}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-bold rounded uppercase">
                              Chưa xếp kệ
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          Địa chỉ: {o.receiver_address}
                        </span>
                      </div>
                    </label>
                  ))
                )}
              </div>

              {selectedShipment && (
                <div className="pt-2">
                  {(() => {
                    const capacityWeight =
                      selectedShipment.capacity_weight || 99999;
                    const currentWeight = getWeightSum(selectedShipment.orders);
                    const additionalWeight = getWeightSum(
                      availableOrders.filter((o) =>
                        selectedOrderIds.includes(o.id),
                      ),
                    );
                    const totalWeight = currentWeight + additionalWeight;
                    const isOverloaded = totalWeight > capacityWeight;

                    return (
                      <div
                        className={`p-3 rounded-xl border text-xs font-semibold ${isOverloaded ? "bg-red-50 text-red-700 border-red-200" : "bg-slate-50 text-slate-700 border-slate-200"}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span>Tải trọng sau khi xếp:</span>
                          <span
                            className={
                              isOverloaded
                                ? "text-red-700 font-bold"
                                : "text-blue-700 font-bold"
                            }
                          >
                            {totalWeight} kg /{" "}
                            {capacityWeight === 99999
                              ? "Không giới hạn"
                              : `${capacityWeight} kg`}
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${isOverloaded ? "bg-red-600" : "bg-blue-600"}`}
                            style={{
                              width: `${Math.min((totalWeight / capacityWeight) * 100, 100)}%`,
                            }}
                          ></div>
                        </div>
                        {isOverloaded && (
                          <div className="mt-2 text-red-600 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Đã vượt quá tải trọng cho phép của xe!
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-255 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitLoading ||
                    availableOrders.length === 0 ||
                    (selectedShipment &&
                      getWeightSum(selectedShipment.orders) +
                        getWeightSum(
                          availableOrders.filter((o) =>
                            selectedOrderIds.includes(o.id),
                          ),
                        ) >
                        (selectedShipment.capacity_weight || 99999))
                  }
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {isSubmitLoading ? "Đang xếp..." : "Xác nhận xếp hàng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
