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
  PackageOpen,
  RotateCcw,
  ShoppingBag,
  Eye,
  History,
  Search,
  FileText,
} from "lucide-react";
import api from "@/lib/axios";
import axios from "axios";
import Pagination from "@/components/Pagination";

// ─── Types ─────────────────────────────────────────────────────────────────
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
  sender_address: string;
  sender_province_code?: string;
  sender_ward_code?: string;
  sender_street?: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  receiver_province_code?: string;
  receiver_ward_code?: string;
  receiver_street?: string;
  weight: number;
  cod_amount: number;
  shipping_fee: number;
  current_status: string;
  created_at: string;
  pickup_hub?: { id: string; name: string };
  shipment?: { id: string; shipment_code?: string; vehicle_number?: string };
  location?: { location_barcode: string } | null;
}

interface Shipment {
  id: string;
  shipment_code?: string;
  vehicle_type: string;
  vehicle_number: string;
  capacity_weight: number;
  status: string;
  type: string;
  created_at: string;
  origin_hub: Hub;
  destination_hub?: Hub;
  shipper: Shipper;
  orders: Order[];
}

interface Vehicle {
  id: string;
  license_plate: string;
  vehicle_type: string;
  capacity_weight: number;
  status: string;
  assigned_shipper?: Shipper | null;
  hub?: { id: string; name: string } | null;
}

interface LoggedInUser {
  id: string;
  full_name: string;
  role: string;
  hub?: { id: string; name: string } | null;
}

// ─── Constants ─────────────────────────────────────────────────────────────
type TabType = "DELIVERY" | "PICKUP" | "RETURN" | "HISTORY";

const TAB_CONFIG: Record<
  TabType,
  {
    label: string;
    icon: React.ReactNode;
    color: string;
    bgActive: string;
    borderActive: string;
    textActive: string;
    badge: string;
    badgeBg: string;
    orderStatuses: string[];
    manifestTitle: string;
    signLabel: string;
  }
> = {
  DELIVERY: {
    label: "Giao Hàng",
    icon: <Truck className="w-4 h-4" />,
    color: "emerald",
    bgActive: "bg-emerald-600",
    borderActive: "border-emerald-600",
    textActive: "text-emerald-600",
    badge: "🟢",
    badgeBg: "bg-emerald-100 text-emerald-800",
    orderStatuses: ["AT_HUB"],
    manifestTitle: "BIÊN BẢN GIAO HÀNG",
    signLabel: "Người nhận (Khách hàng)",
  },
  PICKUP: {
    label: "Lấy Hàng",
    icon: <ShoppingBag className="w-4 h-4" />,
    color: "blue",
    bgActive: "bg-blue-600",
    borderActive: "border-blue-600",
    textActive: "text-blue-600",
    badge: "🔵",
    badgeBg: "bg-blue-100 text-blue-800",
    orderStatuses: ["PENDING"],
    manifestTitle: "BIÊN BẢN LẤY HÀNG",
    signLabel: "Người giao (Shop/Khách hàng)",
  },
  RETURN: {
    label: "Trả Hàng",
    icon: <RotateCcw className="w-4 h-4" />,
    color: "amber",
    bgActive: "bg-amber-500",
    borderActive: "border-amber-500",
    textActive: "text-amber-600",
    badge: "🟠",
    badgeBg: "bg-amber-100 text-amber-800",
    orderStatuses: ["RETURN_TO_SENDER"],
    manifestTitle: "BIÊN BẢN HOÀN HÀNG",
    signLabel: "Người nhận (Chủ shop/Người gửi)",
  },
  HISTORY: {
    label: "Lịch Sử Điều Phối",
    icon: <History className="w-4 h-4" />,
    color: "purple",
    bgActive: "bg-purple-600",
    borderActive: "border-purple-600",
    textActive: "text-purple-600",
    badge: "📜",
    badgeBg: "bg-purple-100 text-purple-800",
    orderStatuses: [],
    manifestTitle: "LỊCH SỬ ĐIỀU PHỐI",
    signLabel: "",
  },
};

// ─── Component ─────────────────────────────────────────────────────────────
export default function DispatchPage() {
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);

  const [activeTab, setActiveTab] = useState<TabType>("DELIVERY");
  const [historySearch, setHistorySearch] = useState("");
  const [historyTypeFilter, setHistoryTypeFilter] = useState("ALL");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("ALL");
  const [historyPage, setHistoryPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editShipmentId, setEditShipmentId] = useState<string | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(
    null,
  );
  const [viewShipment, setViewShipment] = useState<Shipment | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    shipper_id: "",
    vehicle_type: "BIKE",
    type: "DELIVERY" as TabType,
    destination_hub_id: "",
    vehicle_number: "",
    vehicle_id: "", // ID trong Vehicle master
    capacity_weight: 50,
  });
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  // Assign modal filters
  const [assignSearch, setAssignSearch] = useState("");
  const [assignAreaFilter, setAssignAreaFilter] = useState("");

  const [adminHubFilter, setAdminHubFilter] = useState<string>("");

  // ─── Derived Data ──────────────────────────────────────────────────────
  const tabConfig = TAB_CONFIG[activeTab];

  const activeShipments = shipments.filter(
    (s) =>
      s.type === activeTab &&
      s.status !== "COMPLETED" &&
      s.status !== "CANCELLED",
  );

  const availableOrders = allOrders.filter((o) =>
    tabConfig.orderStatuses.includes(o.current_status),
  );

  // ─── Data Loading ──────────────────────────────────────────────────────
  const loadData = async (overrideHubId?: string) => {
    setIsLoading(true);
    setNotification(null);

    let currentHubId: string | null = overrideHubId || null;
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser) as LoggedInUser;
          setCurrentUser((prev) => prev || parsed);
          if (!overrideHubId && parsed.hub?.id) {
            currentHubId = parsed.hub.id;
          }
        } catch {
          // Do nothing
        }
      }
    }

    try {
      const hubsRes = await api.get("/hubs");
      const hubsList = hubsRes.data?.data || hubsRes.data || [];
      if (Array.isArray(hubsList)) {
        setHubs(hubsList.filter((h: { is_active?: boolean }) => h.is_active !== false));
      }

      const shippersUrl = currentHubId
        ? `/users/dispatch-shippers?hubId=${currentHubId}`
        : `/users/dispatch-shippers`;
      const usersRes = await api.get(shippersUrl);
      const shippersList = usersRes.data?.data || usersRes.data || [];
      if (Array.isArray(shippersList)) setShippers(shippersList);

      const vehiclesUrl = currentHubId
        ? `/vehicles?hub_id=${currentHubId}&status=ACTIVE&limit=200`
        : `/vehicles?status=ACTIVE&limit=200`;
      const vehiclesRes = await api.get(vehiclesUrl);
      const vehiclesList = vehiclesRes.data?.data || [];
      if (Array.isArray(vehiclesList)) setVehicles(vehiclesList);

      const shipmentsRes = currentHubId
        ? await api.get(`/hubs/${currentHubId}/shipments`)
        : await api.get("/shipments");
      const shipmentsList = shipmentsRes.data?.data || shipmentsRes.data || [];
      if (Array.isArray(shipmentsList)) {
        setShipments(shipmentsList);
      }

      // Load all orders needed for all tabs
      const ordersRes = await api.get("/orders?limit=1000");
      const ordersList = ordersRes.data?.data || ordersRes.data || [];
      if (Array.isArray(ordersList)) {
        // Filter: no shipment assigned, belongs to this hub
        const eligibleOrders = ordersList.filter(
          (o: Order & { shipment?: unknown }) =>
            !o.shipment && (!currentHubId || o.pickup_hub?.id === currentHubId),
        );
        setAllOrders(eligibleOrders);
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
      setAllOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Export/Print ──────────────────────────────────────────────────────
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

  const handlePrintManifest = (shipment: Shipment) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const cfg = TAB_CONFIG[shipment.type as TabType] || TAB_CONFIG.DELIVERY;
    const isReturn = shipment.type === "RETURN";
    const isPickup = shipment.type === "PICKUP";

    const html = `
      <html>
        <head>
          <title>${cfg.manifestTitle} - ${shipment.vehicle_number}</title>
          <style>
            body { font-family: 'Times New Roman', serif; padding: 20px; line-height: 1.5; font-size: 14px; }
            h1 { text-align: center; font-size: 20px; text-transform: uppercase; margin-bottom: 5px; }
            h2 { text-align: center; font-size: 16px; margin-top: 0; margin-bottom: 20px; font-weight: normal; }
            .type-badge { text-align: center; font-size: 13px; font-weight: bold; padding: 4px 12px; border-radius: 4px; display: inline-block; margin-bottom: 10px; background: ${isReturn ? "#fef3c7" : isPickup ? "#dbeafe" : "#d1fae5"}; color: ${isReturn ? "#92400e" : isPickup ? "#1e40af" : "#065f46"}; border: 1px solid ${isReturn ? "#fcd34d" : isPickup ? "#93c5fd" : "#6ee7b7"}; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; text-align: center; margin-top: 50px; }
            .signatures p { font-weight: bold; margin-bottom: 80px; }
          </style>
        </head>
        <body>
          <h1>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h1>
          <h2>Độc lập - Tự do - Hạnh phúc</h2>
          <div style="text-align:center">
            <span class="type-badge">${cfg.badge} Loại chuyến xe: ${cfg.label.toUpperCase()}</span>
          </div>
          <h1 style="margin-top: 16px;">${cfg.manifestTitle}</h1>
          
          <div class="info-grid">
            <div><strong>Mã chuyến xe:</strong> ${shipment.shipment_code || shipment.id}</div>
            <div><strong>Ngày xuất bến:</strong> ${new Date().toLocaleDateString("vi-VN")}</div>
            <div><strong>Phương tiện:</strong> ${shipment.vehicle_type === "TRUCK" ? "Xe tải 🚚" : "Xe máy 🛵"} - ${shipment.vehicle_number}</div>
            <div><strong>Tài xế phụ trách:</strong> ${shipment.shipper?.full_name || ""} (${shipment.shipper?.phone_number || ""})</div>
            <div><strong>Nơi xuất phát:</strong> ${shipment.origin_hub?.name || ""}</div>
            <div><strong>Nơi đến:</strong> ${shipment.destination_hub?.name || (isPickup ? "Tuyến lấy hàng" : isReturn ? "Trả về người gửi" : "Tuyến giao hàng chặng cuối")}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th width="5%">STT</th>
                <th width="20%">Mã vận đơn</th>
                <th width="15%">Khối lượng (kg)</th>
                <th width="40%">${isPickup ? "Địa chỉ lấy hàng" : isReturn ? "Địa chỉ trả hàng" : "Địa chỉ nhận"}</th>
                <th width="20%">${isReturn || isPickup ? "Ghi chú" : "Tiền thu hộ (COD)"}</th>
              </tr>
            </thead>
            <tbody>
              ${(shipment.orders || [])
                .map(
                  (o, index) => `
                <tr>
                  <td style="text-align:center">${index + 1}</td>
                  <td>${o.tracking_number}</td>
                  <td style="text-align:right">${o.weight}</td>
                  <td>${isPickup ? o.sender_address || "" : o.receiver_address || ""}</td>
                  <td style="text-align:right">${isReturn || isPickup ? "" : new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(o.cod_amount || 0))}</td>
                </tr>
              `,
                )
                .join("")}
              <tr>
                <td colspan="2" style="text-align:center; font-weight:bold">TỔNG CỘNG</td>
                <td style="text-align:right; font-weight:bold">${shipment.orders?.reduce((sum, o) => sum + Number(o.weight || 0), 0) || 0} kg</td>
                <td></td>
                <td style="text-align:right; font-weight:bold">${isReturn || isPickup ? `${shipment.orders?.length || 0} kiện` : new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(shipment.orders?.reduce((sum, o) => sum + Number(o.cod_amount || 0), 0) || 0)}</td>
              </tr>
            </tbody>
          </table>

          <div class="signatures">
            <div>
              <p>Người giao (Thủ kho)</p>
              <span>(Ký, ghi rõ họ tên)</span>
            </div>
            <div>
              <p>${cfg.signLabel}</p>
              <span>(Ký, ghi rõ họ tên)</span>
            </div>
          </div>
          
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (currentUser?.role === "ADMIN") {
      const timer = setTimeout(() => {
        loadData(adminHubFilter || undefined);
      }, 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminHubFilter]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // ─── Modal Handlers ────────────────────────────────────────────────────
  const openCreateModal = (forceTab?: TabType) => {
    const tab = forceTab || activeTab;
    setEditShipmentId(null);

    // Tìm những xe đang rảnh (status === ACTIVE) tại kho hiện tại
    const freeVehicles = vehicles.filter((v) => v.status === "ACTIVE");
    const firstVehicle = freeVehicles.length > 0 ? freeVehicles[0] : null;

    const initialShipperId =
      firstVehicle?.assigned_shipper?.id ||
      (shippers.length > 0 ? shippers[0].id : "");

    const initialVehicleType =
      (firstVehicle?.vehicle_type as "BIKE" | "TRUCK") ||
      (tab === "PICKUP" ? "BIKE" : "BIKE");

    setCreateForm({
      shipper_id: initialShipperId,
      vehicle_type: initialVehicleType,
      type: tab,
      destination_hub_id: "",
      vehicle_number: firstVehicle?.license_plate || "",
      vehicle_id: firstVehicle?.id || "",
      capacity_weight:
        firstVehicle?.capacity_weight || (initialVehicleType === "TRUCK" ? 1000 : 50),
    });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (shipment: Shipment) => {
    setEditShipmentId(shipment.id);
    setCreateForm({
      shipper_id: shipment.shipper.id,
      vehicle_type: shipment.vehicle_type,
      type: (shipment.type || "DELIVERY") as TabType,
      destination_hub_id: shipment.destination_hub?.id || "",
      vehicle_number: shipment.vehicle_number || "",
      vehicle_id: "",
      capacity_weight: shipment.capacity_weight || 50,
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

  const handleSaveShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasVehicle =
      createForm.vehicle_id || createForm.vehicle_number.trim();
    if (!createForm.shipper_id || !hasVehicle) {
      setNotification({
        type: "error",
        message: "Vui lòng chọn xe và chọn tài xế!",
      });
      return;
    }
    setIsSubmitLoading(true);
    const originId = currentUser?.hub?.id || "";

    try {
      const payload = {
        shipper_id: createForm.shipper_id,
        vehicle_type: createForm.vehicle_type,
        type: createForm.type,
        origin_hub_id: originId,
        destination_hub_id:
          createForm.vehicle_type === "TRUCK"
            ? createForm.destination_hub_id
            : undefined,
        vehicle_number: createForm.vehicle_number.toUpperCase() || undefined,
        vehicle_id: createForm.vehicle_id || undefined,
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
          message: `Tạo chuyến xe ${TAB_CONFIG[createForm.type].label} thành công!`,
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

  const openAssignModal = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setSelectedOrderIds([]);
    setIsAssignModalOpen(true);
  };

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
        message: "Xếp hàng lên xe hoàn tất!",
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

  const handleDispatchTruck = async (shipment: Shipment) => {
    if (!shipment.orders || shipment.orders.length === 0) {
      alert(
        "Không thể xuất bến chuyến xe rỗng! Vui lòng xếp hàng lên xe trước.",
      );
      return;
    }
    const cfg = TAB_CONFIG[shipment.type as TabType] || TAB_CONFIG.DELIVERY;
    const confirmMsg = `Xác nhận cho xe "${shipment.vehicle_number}" [${cfg.label.toUpperCase()}] xuất bến với ${shipment.orders.length} kiện hàng?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.patch(`/shipments/${shipment.id}/status`, {
        status: "IN_TRANSIT",
      });
      await loadData();
      setNotification({
        type: "success",
        message: `Chuyến ${cfg.label} ${shipment.vehicle_number} xuất bến thành công!`,
      });
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setNotification({
        type: "error",
        message:
          apiError.response?.data?.message || "Lỗi khi xuất bến chuyến xe!",
      });
    }
  };

  const handleCancelShipment = async (shipment: Shipment) => {
    if (
      !window.confirm(
        `Xác nhận HỦY chuyến xe "${shipment.vehicle_number}"? Đơn hàng sẽ được giải phóng lại.`,
      )
    )
      return;
    try {
      await api.patch(`/shipments/${shipment.id}/cancel`);
      await loadData();
      setNotification({
        type: "success",
        message: "Hủy chuyến xe thành công!",
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

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Floating Notification */}
      {notification && (
        <div
          className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 max-w-sm border transition-all duration-300 ${
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
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Điều Phối Phương Tiện
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Quản lý 3 luồng: Lấy hàng · Giao hàng · Trả hàng
            </p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => setActiveTab("HISTORY")}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-all border border-slate-200 cursor-pointer"
          >
            <History className="w-4 h-4 text-purple-600" />
            Lịch sử điều phối
          </button>
          <button
            onClick={() => openCreateModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tạo chuyến xe mới
          </button>
        </div>
      </div>

      {/* Admin Hub Filter */}
      {currentUser?.role === "ADMIN" && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="text-xs font-bold text-slate-600 shrink-0">
            Giám sát Bưu cục:
          </span>
          <select
            className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl outline-none focus:border-blue-500 cursor-pointer"
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
        </div>
      )}

      {/* ─── 4-Tab Navigation ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {(["DELIVERY", "PICKUP", "RETURN", "HISTORY"] as TabType[]).map(
            (tab) => {
              const cfg = TAB_CONFIG[tab];
              const isActive = activeTab === tab;
              const count =
                tab === "HISTORY"
                  ? shipments.filter(
                      (s) =>
                        s.status === "COMPLETED" || s.status === "CANCELLED",
                    ).length
                  : shipments.filter(
                      (s) =>
                        s.type === tab &&
                        s.status !== "COMPLETED" &&
                        s.status !== "CANCELLED",
                    ).length;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3.5 px-4 text-sm font-bold transition-all border-b-2 cursor-pointer ${
                    isActive
                      ? `${cfg.textActive} ${cfg.borderActive} bg-slate-50`
                      : "text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {cfg.icon}
                  <span>
                    {cfg.badge} {cfg.label}
                  </span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        isActive ? cfg.badgeBg : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            },
          )}
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {isLoading ? (
            <div className="py-16 text-center flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-500 text-sm">Đang tải dữ liệu...</p>
            </div>
          ) : activeTab === "HISTORY" ? (
            <div className="space-y-5">
              {/* Filter & Search Bar */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Tìm theo mã chuyến xe, biển số, tên shipper..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={historySearch}
                    onChange={(e) => {
                      setHistorySearch(e.target.value);
                      setHistoryPage(1);
                    }}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Type Filter */}
                  <select
                    className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                    value={historyTypeFilter}
                    onChange={(e) => {
                      setHistoryTypeFilter(e.target.value);
                      setHistoryPage(1);
                    }}
                  >
                    <option value="ALL">Tất cả loại chuyến</option>
                    <option value="DELIVERY">🟢 Giao hàng</option>
                    <option value="PICKUP">🔵 Lấy hàng</option>
                    <option value="RETURN">🟠 Trả hàng</option>
                  </select>

                  {/* Status Filter */}
                  <select
                    className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                    value={historyStatusFilter}
                    onChange={(e) => {
                      setHistoryStatusFilter(e.target.value);
                      setHistoryPage(1);
                    }}
                  >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="COMPLETED">✅ Đã hoàn thành</option>
                    <option value="CANCELLED">❌ Đã hủy</option>
                    <option value="IN_TRANSIT">🚚 Đang vận chuyển</option>
                    <option value="PENDING">⏳ Chờ xuất bến</option>
                  </select>
                </div>
              </div>

              {/* Summary statistics */}
              {(() => {
                const filteredHistory = shipments.filter((s) => {
                  const searchLower = historySearch.trim().toLowerCase();
                  const codeMatch = s.shipment_code
                    ?.toLowerCase()
                    .includes(searchLower);
                  const idMatch = s.id.toLowerCase().includes(searchLower);
                  const vehicleMatch = s.vehicle_number
                    ?.toLowerCase()
                    .includes(searchLower);
                  const shipperMatch = s.shipper?.full_name
                    ?.toLowerCase()
                    .includes(searchLower);
                  const searchPass =
                    !searchLower ||
                    codeMatch ||
                    idMatch ||
                    vehicleMatch ||
                    shipperMatch;
                  const typePass =
                    historyTypeFilter === "ALL" || s.type === historyTypeFilter;
                  const statusPass =
                    historyStatusFilter === "ALL" ||
                    s.status === historyStatusFilter;
                  const hubPass =
                    !adminHubFilter ||
                    s.origin_hub?.id === adminHubFilter ||
                    s.destination_hub?.id === adminHubFilter;
                  return searchPass && typePass && statusPass && hubPass;
                });

                const historyItemsPerPage = 10;
                const historyTotalPages =
                  Math.ceil(filteredHistory.length / historyItemsPerPage) || 1;
                const paginatedHistory = filteredHistory.slice(
                  (historyPage - 1) * historyItemsPerPage,
                  historyPage * historyItemsPerPage,
                );

                return (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
                        <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
                          Tổng số chuyến
                        </span>
                        <span className="text-lg font-black text-purple-900">
                          {filteredHistory.length}
                        </span>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                          Đã hoàn thành
                        </span>
                        <span className="text-lg font-black text-emerald-900">
                          {
                            filteredHistory.filter(
                              (s) => s.status === "COMPLETED",
                            ).length
                          }
                        </span>
                      </div>
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                          Đang di chuyển
                        </span>
                        <span className="text-lg font-black text-blue-900">
                          {
                            filteredHistory.filter(
                              (s) => s.status === "IN_TRANSIT",
                            ).length
                          }
                        </span>
                      </div>
                      <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">
                          Đã hủy
                        </span>
                        <span className="text-lg font-black text-red-900">
                          {
                            filteredHistory.filter(
                              (s) => s.status === "CANCELLED",
                            ).length
                          }
                        </span>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-bold uppercase tracking-wider">
                              <th className="py-3 px-4">
                                Mã chuyến xe / Thời gian
                              </th>
                              <th className="py-3 px-4">Loại chuyến</th>
                              <th className="py-3 px-4">Tài xế phụ trách</th>
                              <th className="py-3 px-4">Phương tiện</th>
                              <th className="py-3 px-4">Bưu cục (Nơi đi → Nơi đến)</th>
                              <th className="py-3 px-4">Đơn hàng / Tải trọng</th>
                              <th className="py-3 px-4">Trạng thái</th>
                              <th className="py-3 px-4 text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {paginatedHistory.length > 0 ? (
                              paginatedHistory.map((ship) => {
                                const cfg =
                                  TAB_CONFIG[ship.type as TabType] ||
                                  TAB_CONFIG.DELIVERY;
                                const totalWeight = getWeightSum(ship.orders);
                                const orderCount = ship.orders?.length || 0;
                                return (
                                  <tr
                                    key={ship.id}
                                    className="hover:bg-slate-50 transition-colors"
                                  >
                                    <td className="py-3 px-4">
                                      <div className="font-extrabold text-slate-900">
                                        {ship.shipment_code ||
                                          ship.id.slice(0, 8)}
                                      </div>
                                      <div className="text-[10px] text-slate-400">
                                        {new Date(
                                          ship.created_at,
                                        ).toLocaleString("vi-VN")}
                                      </div>
                                    </td>
                                    <td className="py-3 px-4">
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${cfg.badgeBg}`}
                                      >
                                        {cfg.badge} {cfg.label}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 font-semibold text-slate-800">
                                      {ship.shipper?.full_name || "N/A"}
                                      {ship.shipper?.phone_number && (
                                        <span className="block text-[10px] font-normal text-slate-400">
                                          {ship.shipper.phone_number}
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="font-bold text-slate-800 flex items-center gap-1">
                                        {ship.vehicle_type === "BIKE" ? (
                                          <Bike className="w-3.5 h-3.5 text-blue-500" />
                                        ) : (
                                          <Truck className="w-3.5 h-3.5 text-blue-500" />
                                        )}
                                        {ship.vehicle_number}
                                      </div>
                                      <span className="text-[10px] text-slate-400 uppercase">
                                        {ship.vehicle_type}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-1 font-medium text-slate-700">
                                        <span>
                                          {ship.origin_hub?.name || "Hub gốc"}
                                        </span>
                                        {ship.destination_hub && (
                                          <>
                                            <ArrowRight className="w-3 h-3 text-slate-400" />
                                            <span>
                                              {ship.destination_hub.name}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 font-medium text-slate-700">
                                      <div>{orderCount} kiện hàng</div>
                                      <div className="text-[10px] text-slate-400">
                                        {totalWeight.toFixed(1)} /{" "}
                                        {ship.capacity_weight || 1000} kg
                                      </div>
                                    </td>
                                    <td className="py-3 px-4">
                                      <span
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                          ship.status === "COMPLETED"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : ship.status === "CANCELLED"
                                              ? "bg-red-50 text-red-700 border-red-200"
                                              : ship.status === "IN_TRANSIT"
                                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                                : "bg-amber-50 text-amber-700 border-amber-200"
                                        }`}
                                      >
                                        {ship.status === "COMPLETED" &&
                                          "✅ Đã hoàn thành"}
                                        {ship.status === "CANCELLED" &&
                                          "❌ Đã hủy"}
                                        {ship.status === "IN_TRANSIT" &&
                                          "🚚 Đang vận chuyển"}
                                        {ship.status === "PENDING" &&
                                          "⏳ Chờ xuất bến"}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <button
                                          title="Xem chi tiết kiện hàng"
                                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                          onClick={() =>
                                            setViewShipment(ship)
                                          }
                                        >
                                          <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                          title="In biên bản"
                                          className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                                          onClick={() =>
                                            handlePrintManifest(ship)
                                          }
                                        >
                                          <FileText className="w-4 h-4" />
                                        </button>
                                        <button
                                          title="Xuất Excel"
                                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                          onClick={() =>
                                            handleExportManifest(ship.id)
                                          }
                                        >
                                          <Download className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td
                                  colSpan={8}
                                  className="py-12 text-center text-slate-400"
                                >
                                  Không tìm thấy chuyến xe nào trong lịch sử.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Pagination */}
                    <Pagination
                      currentPage={historyPage}
                      totalPages={historyTotalPages}
                      totalItems={filteredHistory.length}
                      itemsPerPage={historyItemsPerPage}
                      onPageChange={setHistoryPage}
                    />
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
              {/* Left: Shipment Cards */}
              <div className="lg:col-span-3">
                {activeShipments.length === 0 ? (
                  <div className="py-16 text-center bg-slate-50 rounded-xl border border-slate-200">
                    <PackageOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-slate-700">
                      Chưa có chuyến xe {tabConfig.label}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Nhấn &quot;Tạo chuyến xe mới&quot; để bắt đầu
                    </p>
                    <button
                      onClick={() => openCreateModal(activeTab)}
                      className={`mt-4 px-4 py-2 text-white text-xs font-semibold rounded-lg ${tabConfig.bgActive} hover:opacity-90 cursor-pointer`}
                    >
                      <Plus className="w-3.5 h-3.5 inline mr-1" />
                      Tạo chuyến {tabConfig.label}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeShipments.map((ship) => {
                      const currentWeight = getWeightSum(ship.orders);
                      const maxWeight = Number(ship.capacity_weight) || 1000;
                      const fillRate = Math.min(
                        Math.round((currentWeight / maxWeight) * 100),
                        100,
                      );
                      const cfg =
                        TAB_CONFIG[ship.type as TabType] || TAB_CONFIG.DELIVERY;

                      return (
                        <div
                          key={ship.id}
                          className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
                        >
                          <div className="p-4 space-y-3">
                            {/* Header Row */}
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {ship.vehicle_type === "BIKE" ? (
                                    <Bike className="w-4 h-4 text-blue-600" />
                                  ) : (
                                    <Truck className="w-4 h-4 text-blue-600" />
                                  )}
                                  <h3 className="text-sm font-extrabold text-slate-800">
                                    {ship.vehicle_number}
                                  </h3>
                                  {/* Type badge */}
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${cfg.badgeBg}`}
                                  >
                                    {cfg.badge} {cfg.label}
                                  </span>
                                  {/* Status badge */}
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      ship.status === "PENDING"
                                        ? "bg-slate-100 text-slate-600"
                                        : "bg-blue-100 text-blue-700"
                                    }`}
                                  >
                                    {ship.status === "PENDING"
                                      ? "Chờ bốc hàng"
                                      : "Đang di chuyển"}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {ship.shipment_code || ship.id.slice(0, 8)}
                                </p>
                              </div>
                              {ship.status === "PENDING" && (
                                <button
                                  onClick={() => handleDispatchTruck(ship)}
                                  className={`px-3 py-1.5 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer ${cfg.bgActive} hover:opacity-90`}
                                >
                                  Xuất bến
                                </button>
                              )}
                            </div>

                            {/* Route */}
                            <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold">
                              <div className="flex items-center gap-1 text-slate-600">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>
                                  {ship.origin_hub?.name || "Bưu cục xuất phát"}
                                </span>
                              </div>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <div className="flex items-center gap-1 text-blue-700">
                                <MapPin className="w-3 h-3" />
                                <span>
                                  {ship.destination_hub?.name ||
                                    (activeTab === "PICKUP"
                                      ? "Tuyến lấy hàng"
                                      : activeTab === "RETURN"
                                        ? "Trả về người gửi"
                                        : "Giao tận tay")}
                                </span>
                              </div>
                            </div>

                            {/* Shipper */}
                            <div className="flex items-center gap-2 text-xs">
                              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                <User className="w-3.5 h-3.5 text-slate-500" />
                              </div>
                              <div>
                                <span className="font-semibold text-slate-800 block">
                                  {ship.shipper?.full_name || "Chưa phân công"}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {ship.shipper?.phone_number || ""}
                                </span>
                              </div>
                            </div>

                            {/* Weight bar */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] text-slate-500 font-semibold">
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3" /> Tải trọng:
                                </span>
                                <span
                                  className={
                                    fillRate >= 80
                                      ? "text-emerald-600 font-extrabold"
                                      : "text-blue-600 font-extrabold"
                                  }
                                >
                                  {currentWeight}kg / {maxWeight}kg ({fillRate}
                                  %)
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-500 ${fillRate >= 80 ? "bg-emerald-500" : "bg-blue-500"}`}
                                  style={{ width: `${fillRate}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Orders List */}
                          <div className="border-t border-slate-100 bg-slate-50/60 p-3 flex flex-col gap-2.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Kiện hàng ({ship.orders?.length || 0})
                            </span>
                            {!ship.orders || ship.orders.length === 0 ? (
                              <span className="text-xs text-slate-400 italic">
                                Chưa có kiện hàng.
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 max-h-14 overflow-y-auto">
                                {ship.orders.map((o) => (
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
                                        className="ml-0.5 text-slate-300 hover:text-red-500 cursor-pointer"
                                      >
                                        <X className="w-2.5 h-2.5" />
                                      </button>
                                    )}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Action buttons */}
                            {ship.status === "PENDING" ? (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => openAssignModal(ship)}
                                  className="flex-1 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Layers className="w-3 h-3" /> Xếp hàng
                                </button>
                                <button
                                  onClick={() => openEditModal(ship)}
                                  className="py-1.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 font-bold text-xs rounded-lg cursor-pointer"
                                >
                                  Sửa
                                </button>
                                <button
                                  onClick={() => handleCancelShipment(ship)}
                                  className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs rounded-lg cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => setViewShipment(ship)}
                                  className="flex-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" /> Xem chi tiết
                                </button>
                              </div>
                            )}

                            {(ship.orders?.length || 0) > 0 && (
                              <div className="flex gap-1.5">
                                {ship.vehicle_type === "TRUCK" && (
                                  <button
                                    onClick={() =>
                                      handleExportManifest(ship.id)
                                    }
                                    className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <Download className="w-3 h-3" /> Excel
                                  </button>
                                )}
                                <button
                                  onClick={() => handlePrintManifest(ship)}
                                  className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <MapPin className="w-3 h-3" /> In biên bản
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

              {/* Right Column: Available Orders + Shippers */}
              <div className="flex flex-col gap-4">
                {/* Available Orders for this tab */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <h2 className="text-xs font-bold text-slate-700 flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                    <Package className="w-3.5 h-3.5 text-blue-500" />
                    Đơn chờ {tabConfig.label}
                    <span className="ml-auto text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {availableOrders.length}
                    </span>
                  </h2>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto">
                    {availableOrders.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-4">
                        Không có đơn nào cần {tabConfig.label.toLowerCase()}.
                      </p>
                    ) : (
                      availableOrders.slice(0, 20).map((o) => (
                        <div
                          key={o.id}
                          className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px]"
                        >
                          <span className="font-mono font-semibold text-slate-700 truncate">
                            {o.tracking_number}
                          </span>
                          <span className="text-slate-400 ml-2 shrink-0">
                            {o.weight}kg
                          </span>
                        </div>
                      ))
                    )}
                    {availableOrders.length > 20 && (
                      <p className="text-[10px] text-slate-400 text-center pt-1">
                        ... và {availableOrders.length - 20} đơn khác
                      </p>
                    )}
                  </div>
                </div>

                {/* Available Shippers */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <h2 className="text-xs font-bold text-slate-700 flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    Tài xế trực chiến
                  </h2>
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {(() => {
                      const available = shippers.filter(
                        (s) => !s.current_shipment_id,
                      );
                      if (available.length === 0) {
                        return (
                          <p className="text-xs text-slate-400 italic text-center py-4">
                            Tất cả tài xế đang bận.
                          </p>
                        );
                      }
                      return available.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-100 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          onClick={() => {
                            setCreateForm({
                              ...createForm,
                              shipper_id: s.id,
                              vehicle_type:
                                s.vehicle_type === "BIKE" ? "BIKE" : "TRUCK",
                              vehicle_number: s.vehicle_number || "",
                              capacity_weight:
                                s.vehicle_type === "BIKE" ? 50 : 1000,
                              type: activeTab,
                            });
                            setIsCreateModalOpen(true);
                          }}
                        >
                          <div className="w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                            {s.vehicle_type === "BIKE" ? (
                              <Bike className="w-3.5 h-3.5" />
                            ) : (
                              <Truck className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {s.full_name}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {s.phone_number} ·{" "}
                              {s.vehicle_number || "Chưa có xe"}
                            </p>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── MODAL: Tạo/Sửa Chuyến xe ───────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl relative overflow-hidden">
            <form onSubmit={handleSaveShipment}>
              {/* Modal header with type color */}
              <div
                className={`flex items-center justify-between p-5 border-b border-slate-100 ${
                  createForm.type === "PICKUP"
                    ? "bg-blue-50"
                    : createForm.type === "RETURN"
                      ? "bg-amber-50"
                      : "bg-emerald-50"
                }`}
              >
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {editShipmentId ? "Sửa Chuyến Xe" : "Tạo Chuyến Xe Mới"}
                  </h3>
                  <p
                    className={`text-xs font-semibold mt-0.5 ${TAB_CONFIG[createForm.type].textActive}`}
                  >
                    {TAB_CONFIG[createForm.type].badge} Chuyến{" "}
                    {TAB_CONFIG[createForm.type].label}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Loại chuyến xe */}
                {!editShipmentId && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Loại chuyến xe
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["DELIVERY", "PICKUP", "RETURN"] as TabType[]).map(
                        (t) => {
                          const cfg = TAB_CONFIG[t];
                          return (
                            <label
                              key={t}
                              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                createForm.type === t
                                  ? `${cfg.borderActive} bg-slate-50`
                                  : "border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              <input
                                type="radio"
                                name="shipment_type"
                                className="hidden"
                                checked={createForm.type === t}
                                onChange={() =>
                                  setCreateForm({ ...createForm, type: t })
                                }
                              />
                              <span className="text-lg">
                                {cfg.badge.split(" ")[0]}
                              </span>
                              <span
                                className={`text-[11px] font-bold ${
                                  createForm.type === t
                                    ? cfg.textActive
                                    : "text-slate-600"
                                }`}
                              >
                                {cfg.label}
                              </span>
                            </label>
                          );
                        },
                      )}
                    </div>
                  </div>
                )}

                {/* Chọn xe — Vehicle picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Chọn phương tiện (Xe đang rảnh)
                  </label>
                  {vehicles.length > 0 ? (
                    <>
                      <select
                        className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl outline-none focus:border-blue-500 text-sm"
                        value={createForm.vehicle_id}
                        onChange={(e) => {
                          const vid = e.target.value;
                          const v = vehicles.find((x) => x.id === vid);
                          if (v) {
                            setCreateForm({
                              ...createForm,
                              vehicle_id: v.id,
                              vehicle_number: v.license_plate,
                              vehicle_type: v.vehicle_type as "BIKE" | "TRUCK",
                              capacity_weight: v.capacity_weight,
                              shipper_id:
                                v.assigned_shipper?.id || createForm.shipper_id,
                              destination_hub_id:
                                v.vehicle_type !== "TRUCK"
                                  ? ""
                                  : createForm.destination_hub_id,
                            });
                          } else {
                            setCreateForm({
                              ...createForm,
                              vehicle_id: "",
                              vehicle_number: "",
                            });
                          }
                        }}
                      >
                        <option value="">-- Chọn xe đang rảnh từ danh sách --</option>
                        {vehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            🚗 {v.license_plate} ·{" "}
                            {v.vehicle_type === "BIKE"
                              ? "Xe máy 🛵"
                              : v.vehicle_type === "TRUCK"
                                ? "Xe tải 🚚"
                                : "Xe bán tải"}{" "}
                            · {v.capacity_weight}kg
                            {v.assigned_shipper
                              ? ` · TX: ${v.assigned_shipper.full_name}`
                              : " (Chưa có TX)"}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        Chỉ hiển thị các xe đang rảnh thuộc bưu cục hiện tại. Khi chọn xe, thông tin biển số, loại xe và tài xế sẽ tự động điền.
                      </p>
                    </>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
                      <p className="text-xs text-amber-700 font-medium">
                        Chưa có xe đang rảnh nào tại kho này. Bạn có thể nhập biển số thủ công bên dưới.
                      </p>
                    </div>
                  )}
                </div>

                {/* Biển số xe (fallback hoặc override) */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Biển số xe{" "}
                    {createForm.vehicle_id ? "(từ danh mục)" : "(nhập tay)"}
                  </label>
                  <input
                    type="text"
                    required={!createForm.vehicle_id}
                    disabled={!!createForm.vehicle_id}
                    className={`block w-full px-3.5 py-2.5 border rounded-xl outline-none text-sm ${
                      createForm.vehicle_id
                        ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed font-semibold"
                        : "bg-slate-50 border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    }`}
                    placeholder="Ví dụ: 29C-123.45"
                    value={createForm.vehicle_number}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        vehicle_number: e.target.value,
                        vehicle_id: "",
                      })
                    }
                  />
                </div>

                {/* Tài xế */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Chọn tài xế phụ trách
                  </label>
                  {(() => {
                    const selV = vehicles.find((x) => x.id === createForm.vehicle_id);
                    const assignedS = selV?.assigned_shipper;
                    const options = [...shippers];
                    if (assignedS && !options.some((s) => s.id === assignedS.id)) {
                      options.unshift({
                        id: assignedS.id,
                        full_name: assignedS.full_name,
                        phone_number: assignedS.phone_number || "",
                      });
                    }
                    return (
                      <>
                        <select
                          required
                          className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl outline-none focus:border-blue-500 text-sm"
                          value={createForm.shipper_id}
                          onChange={(e) =>
                            setCreateForm({
                              ...createForm,
                              shipper_id: e.target.value,
                            })
                          }
                        >
                          <option value="">-- Chọn tài xế --</option>
                          {options.map((s) => (
                            <option key={s.id} value={s.id}>
                              👤 {s.full_name} ({s.phone_number})
                            </option>
                          ))}
                        </select>
                        {assignedS && createForm.shipper_id === assignedS.id && (
                          <p className="text-[11px] text-emerald-600 mt-1.5 font-semibold flex items-center gap-1">
                            ✓ Tài xế {assignedS.full_name} đã tự động điền theo xe {selV?.license_plate}.
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Loại phương tiện */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Loại phương tiện
                  </label>
                  <div className="flex gap-3">
                    {(["BIKE", "TRUCK"] as const).map((v) => (
                      <label
                        key={v}
                        className={`flex items-center gap-2 flex-1 p-3 rounded-xl border cursor-pointer transition-colors ${
                          createForm.vehicle_type === v
                            ? "bg-blue-50 border-blue-200"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name="vehicle_type"
                          className="hidden"
                          checked={createForm.vehicle_type === v}
                          onChange={() =>
                            setCreateForm({
                              ...createForm,
                              vehicle_type: v,
                              capacity_weight: v === "BIKE" ? 50 : 1000,
                              destination_hub_id: "",
                            })
                          }
                        />
                        {v === "BIKE" ? (
                          <Bike
                            className={`w-4 h-4 ${createForm.vehicle_type === v ? "text-blue-600" : "text-slate-400"}`}
                          />
                        ) : (
                          <Truck
                            className={`w-4 h-4 ${createForm.vehicle_type === v ? "text-blue-600" : "text-slate-400"}`}
                          />
                        )}
                        <span
                          className={`text-sm font-bold ${createForm.vehicle_type === v ? "text-blue-800" : "text-slate-600"}`}
                        >
                          {v === "BIKE" ? "Xe máy 🛵" : "Xe tải 🚚"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Trạm đích (chỉ TRUCK) */}
                {createForm.vehicle_type === "TRUCK" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Bưu cục đích
                    </label>
                    <select
                      required
                      className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl outline-none focus:border-blue-500 text-sm"
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

                {/* Tải trọng */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Tải trọng tối đa (kg)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl outline-none focus:border-blue-500 text-sm"
                    value={createForm.capacity_weight}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        capacity_weight: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-3 p-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitLoading}
                  className={`flex-1 py-2.5 text-white font-semibold text-sm rounded-xl cursor-pointer disabled:opacity-60 ${TAB_CONFIG[createForm.type].bgActive} hover:opacity-90`}
                >
                  {isSubmitLoading
                    ? "Đang lưu..."
                    : editShipmentId
                      ? "Lưu thay đổi"
                      : `Tạo chuyến ${TAB_CONFIG[createForm.type].label}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: Xếp đơn hàng lên xe ─────────────────────────────── */}
      {isAssignModalOpen &&
        selectedShipment &&
        (() => {
          const addressField =
            activeTab === "PICKUP" || activeTab === "RETURN"
              ? "sender_address"
              : "receiver_address";

          // Normalize area strings to handle manual typing inconsistencies
          const normalizeArea = (text: string) => {
            const t = text.trim().toLowerCase();
            if (
              t.includes("hcm") ||
              t.includes("hồ chí minh") ||
              t.includes("ho chi minh")
            )
              return "Hồ Chí Minh";
            if (
              t.includes("hn") ||
              t.includes("hà nội") ||
              t.includes("ha noi")
            )
              return "Hà Nội";
            if (t.includes("đà nẵng") || t.includes("da nang"))
              return "Đà Nẵng";
            // uppercase first letter of each word as fallback
            return t.replace(/(^\w{1})|(\s+\w{1})/g, (letter) =>
              letter.toUpperCase(),
            );
          };

          // Extract area from order, using structured fields first, fallback to regex/parsing
          const extractArea = (o: Order) => {
            if (activeTab === "PICKUP" || activeTab === "RETURN") {
              if (o.sender_ward_code && o.sender_province_code) {
                // Parse out from structured if possible, but actually we only have code in order object
                // (unless backend sends name, which it doesn't yet). So we rely on the full address string
                // which is assembled as "street, ward, province".
                const parts = (o.sender_address || "")
                  .split(",")
                  .map((s) => s.trim());
                if (parts.length >= 2)
                  return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
              }
              return extractAreaFromStr(o.sender_address);
            } else {
              if (o.receiver_ward_code && o.receiver_province_code) {
                const parts = (o.receiver_address || "")
                  .split(",")
                  .map((s) => s.trim());
                if (parts.length >= 2)
                  return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
              }
              return extractAreaFromStr(o.receiver_address);
            }
          };

          const extractAreaFromStr = (addr: string | undefined) => {
            if (!addr) return "Không có địa chỉ";
            const parts = addr.split(",").map((s) => s.trim());
            if (parts.length === 0) return "Khác";
            let province = parts[parts.length - 1];
            const district = parts.length >= 2 ? parts[parts.length - 2] : "";
            province = normalizeArea(province);
            return district ? `${district}, ${province}` : province;
          };

          // All unique areas
          const allAreas = Array.from(
            new Set(availableOrders.map((o) => extractArea(o))),
          ).sort();

          // Filter orders by search + area
          const filteredOrders = availableOrders.filter((o) => {
            const addr = (o[addressField as keyof Order] as string) || "";
            const matchSearch =
              !assignSearch ||
              o.tracking_number
                .toLowerCase()
                .includes(assignSearch.toLowerCase()) ||
              addr.toLowerCase().includes(assignSearch.toLowerCase());
            const matchArea =
              !assignAreaFilter || extractArea(o) === assignAreaFilter;
            return matchSearch && matchArea;
          });

          // Group by area for display
          const grouped: Record<string, Order[]> = {};
          filteredOrders.forEach((o) => {
            const area = extractArea(o);
            if (!grouped[area]) grouped[area] = [];
            grouped[area].push(o);
          });

          const toggleAreaAll = (area: string, orders: Order[]) => {
            const areaIds = orders.map((o) => o.id);
            const allChecked = areaIds.every((id) =>
              selectedOrderIds.includes(id),
            );
            if (allChecked) {
              setSelectedOrderIds((prev) =>
                prev.filter((id) => !areaIds.includes(id)),
              );
            } else {
              setSelectedOrderIds((prev) => {
                let currentWeight = prev.reduce((sum, id) => {
                  const order = availableOrders.find((o) => o.id === id);
                  return sum + (order?.weight || 0);
                }, 0);
                const capacity = selectedShipment.capacity_weight || 50; // Default capacity 50kg
                const newIds = [...prev];
                let limitReached = false;

                for (const order of orders) {
                  if (!prev.includes(order.id)) {
                    if (currentWeight + order.weight <= capacity) {
                      newIds.push(order.id);
                      currentWeight += order.weight;
                    } else {
                      limitReached = true;
                    }
                  }
                }

                if (limitReached) {
                  setNotification({
                    type: "warning",
                    message: `Đã đạt giới hạn tải trọng xe (${capacity}kg). Chỉ tự động chọn được một phần số đơn!`,
                  });
                }
                return newIds;
              });
            }
          };

          const selectAll = () => {
            setSelectedOrderIds(() => {
              let currentWeight = 0;
              const capacity = selectedShipment.capacity_weight || 50;
              const newIds: string[] = [];
              let limitReached = false;

              for (const order of filteredOrders) {
                if (currentWeight + order.weight <= capacity) {
                  newIds.push(order.id);
                  currentWeight += order.weight;
                } else {
                  limitReached = true;
                }
              }

              if (limitReached) {
                setNotification({
                  type: "warning",
                  message: `Đã đạt giới hạn tải trọng xe (${capacity}kg). Chỉ tự động chọn được một phần số đơn!`,
                });
              }
              return newIds;
            });
          };
          const clearAll = () => setSelectedOrderIds([]);

          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[105] flex items-center justify-center p-4 animate-fadeIn">
              <div className="bg-white rounded-2xl w-full max-w-xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh]">
                <form
                  onSubmit={handleAssignOrders}
                  className="flex flex-col min-h-0"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
                    <div>
                      <h3 className="text-base font-bold text-slate-800">
                        Xếp hàng — Chuyến{" "}
                        {
                          (
                            TAB_CONFIG[selectedShipment.type as TabType] ||
                            TAB_CONFIG.DELIVERY
                          ).label
                        }
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Xe: {selectedShipment.vehicle_number} · Tài xế:{" "}
                        {selectedShipment.shipper.full_name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAssignModalOpen(false);
                        setAssignSearch("");
                        setAssignAreaFilter("");
                      }}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Search + Filter bar */}
                  <div className="px-5 pt-4 pb-3 border-b border-slate-100 space-y-2.5 shrink-0">
                    {/* Search */}
                    <div className="relative">
                      <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-4.35-4.35M16.65 11a6.65 6.65 0 11-13.3 0 6.65 6.65 0 0113.3 0z"
                        />
                      </svg>
                      <input
                        type="text"
                        placeholder="Tìm mã vận đơn hoặc địa chỉ..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:bg-white transition-colors"
                        value={assignSearch}
                        onChange={(e) => setAssignSearch(e.target.value)}
                      />
                      {assignSearch && (
                        <button
                          type="button"
                          onClick={() => setAssignSearch("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Area filter chips */}
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setAssignAreaFilter("")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                          !assignAreaFilter
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-slate-600 border-slate-200 hover:border-blue-400"
                        }`}
                      >
                        Tất cả ({availableOrders.length})
                      </button>
                      {allAreas.map((area) => {
                        const cnt = availableOrders.filter(
                          (o) => extractArea(o) === area,
                        ).length;
                        return (
                          <button
                            key={area}
                            type="button"
                            onClick={() =>
                              setAssignAreaFilter(
                                assignAreaFilter === area ? "" : area,
                              )
                            }
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                              assignAreaFilter === area
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-slate-600 border-slate-200 hover:border-blue-400"
                            }`}
                          >
                            📍 {area} ({cnt})
                          </button>
                        );
                      })}
                    </div>

                    {/* Select all/clear row */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        Hiển thị <strong>{filteredOrders.length}</strong> /{" "}
                        {availableOrders.length} đơn
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={selectAll}
                          disabled={filteredOrders.length === 0}
                          className="text-[11px] text-blue-600 font-bold hover:underline cursor-pointer disabled:opacity-40"
                        >
                          Chọn tất cả{assignAreaFilter ? " khu vực này" : ""}
                        </button>
                        {selectedOrderIds.length > 0 && (
                          <>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={clearAll}
                              className="text-[11px] text-slate-500 font-bold hover:underline cursor-pointer"
                            >
                              Bỏ chọn hết
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Order list - grouped by area */}
                  <div className="overflow-y-auto flex-1 min-h-0 p-5 pt-3">
                    {filteredOrders.length === 0 ? (
                      <div className="py-10 text-center text-sm text-slate-400">
                        {assignSearch || assignAreaFilter
                          ? "Không tìm thấy đơn hàng phù hợp."
                          : `Không có đơn hàng để xếp lên chuyến ${tabConfig.label}.`}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(grouped).map(([area, orders]) => {
                          const areaIds = orders.map((o) => o.id);
                          const allAreaChecked = areaIds.every((id) =>
                            selectedOrderIds.includes(id),
                          );
                          const someAreaChecked = areaIds.some((id) =>
                            selectedOrderIds.includes(id),
                          );
                          return (
                            <div key={area}>
                              {/* Area header */}
                              <div className="flex items-center gap-2 mb-2">
                                <button
                                  type="button"
                                  onClick={() => toggleAreaAll(area, orders)}
                                  className={`flex items-center gap-2 flex-1 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer ${
                                    allAreaChecked
                                      ? "bg-blue-50 border-blue-200 text-blue-700"
                                      : someAreaChecked
                                        ? "bg-amber-50 border-amber-200 text-amber-700"
                                        : "bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-300"
                                  }`}
                                >
                                  <span className="text-sm">📍</span>
                                  <span className="flex-1 text-left truncate">
                                    {area}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                                      allAreaChecked
                                        ? "bg-blue-200 text-blue-800"
                                        : "bg-slate-200 text-slate-600"
                                    }`}
                                  >
                                    {
                                      areaIds.filter((id) =>
                                        selectedOrderIds.includes(id),
                                      ).length
                                    }
                                    /{orders.length}
                                  </span>
                                  <span className="text-[10px] font-normal opacity-70">
                                    {allAreaChecked
                                      ? "✓ Đã chọn hết"
                                      : "Chọn cả nhóm"}
                                  </span>
                                </button>
                              </div>

                              {/* Orders in area */}
                              <div className="space-y-1 ml-2">
                                {orders.map((o) => {
                                  const checked = selectedOrderIds.includes(
                                    o.id,
                                  );
                                  return (
                                    <label
                                      key={o.id}
                                      className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                                        checked
                                          ? "bg-blue-50 border-blue-200"
                                          : "bg-white border-slate-200 hover:bg-slate-50"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-blue-600 cursor-pointer"
                                        checked={checked}
                                        onChange={() =>
                                          setSelectedOrderIds((prev) => {
                                            if (checked) {
                                              return prev.filter(
                                                (id) => id !== o.id,
                                              );
                                            } else {
                                              const currentWeight = prev.reduce(
                                                (sum, id) => {
                                                  const order =
                                                    availableOrders.find(
                                                      (ord) => ord.id === id,
                                                    );
                                                  return (
                                                    sum + (order?.weight || 0)
                                                  );
                                                },
                                                0,
                                              );
                                              const capacity =
                                                selectedShipment.capacity_weight ||
                                                50;

                                              if (
                                                currentWeight + o.weight >
                                                capacity
                                              ) {
                                                setNotification({
                                                  type: "error",
                                                  message: `Không thể thêm đơn này. Vượt quá giới hạn tải trọng xe (${capacity}kg)!`,
                                                });
                                                return prev;
                                              }
                                              return [...prev, o.id];
                                            }
                                          })
                                        }
                                      />
                                      <div className="flex-1 min-w-0">
                                        <span className="font-mono font-semibold text-sm text-slate-800">
                                          {o.tracking_number}
                                        </span>
                                        <span className="text-[11px] text-slate-500 block truncate">
                                          {(o[
                                            addressField as keyof Order
                                          ] as string) || ""}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {o.location && (
                                          <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.5 rounded font-mono">
                                            {o.location.location_barcode}
                                          </span>
                                        )}
                                        <span className="text-xs font-bold text-slate-500">
                                          {o.weight}kg
                                        </span>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-5 border-t border-slate-100 shrink-0">
                    {selectedOrderIds.length > 0 && (
                      <div className="mb-3 px-3 py-2 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
                        <span className="text-xs font-semibold text-blue-700">
                          ✓ Đã chọn {selectedOrderIds.length} kiện
                        </span>
                        <span className="text-xs font-bold text-blue-600">
                          {availableOrders
                            .filter((o) => selectedOrderIds.includes(o.id))
                            .reduce((s, o) => s + Number(o.weight), 0)
                            .toFixed(1)}{" "}
                          kg
                        </span>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAssignModalOpen(false);
                          setAssignSearch("");
                          setAssignAreaFilter("");
                        }}
                        className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={
                          isSubmitLoading || selectedOrderIds.length === 0
                        }
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl cursor-pointer disabled:opacity-60"
                      >
                        {isSubmitLoading
                          ? "Đang xếp..."
                          : `Xếp ${selectedOrderIds.length} kiện lên xe`}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}
      {/* ─── MODAL: Xem chi tiết chuyến xe ─────────────────────────────── */}
      {viewShipment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[105] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 shadow-2xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Chi tiết chuyến xe{" "}
                  {viewShipment.shipment_code ||
                    viewShipment.id.substring(0, 8).toUpperCase()}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 flex gap-2">
                  <span>Xe: {viewShipment.vehicle_number}</span>
                  <span>·</span>
                  <span>Tài xế: {viewShipment.shipper.full_name}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewShipment(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="text-xs text-slate-500">
                  Trạng thái:{" "}
                  <span className="font-bold text-blue-600">
                    {viewShipment.status === "IN_TRANSIT"
                      ? "Đang chạy"
                      : viewShipment.status}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-700">
                  {viewShipment.orders.reduce((sum, o) => sum + o.weight, 0)}kg
                  / {viewShipment.capacity_weight || 50}kg
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3">
                  Danh sách {viewShipment.orders.length} đơn hàng
                </h4>
                <div className="space-y-2">
                  {viewShipment.orders.map((o) => {
                    const addressField =
                      viewShipment.type === "PICKUP" ||
                      viewShipment.type === "RETURN"
                        ? "sender_address"
                        : "receiver_address";
                    return (
                      <div
                        key={o.id}
                        className="flex gap-3 p-3 border border-slate-100 rounded-xl bg-white shadow-sm"
                      >
                        <Package className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between">
                            <span className="font-mono font-bold text-sm text-slate-800">
                              {o.tracking_number}
                            </span>
                            <span className="text-xs font-bold text-slate-500">
                              {o.weight}kg
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                            {(o[addressField as keyof Order] as string) ||
                              "Không có địa chỉ"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setViewShipment(null)}
                className="py-2 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
