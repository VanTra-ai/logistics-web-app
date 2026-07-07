"use client";

import { useState, useEffect } from "react";
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Truck,
  MapPin,
  User,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  ClipboardList,
  Check,
  Layers,
  Printer,
} from "lucide-react";
import api from "@/lib/axios";

interface Hub {
  id: string;
  name: string;
  hub_code?: string | null;
}

interface Shipper {
  id: string;
  full_name: string;
  phone_number: string;
  employee_code?: string | null;
}

interface Order {
  id: string;
  tracking_number: string;
  sender_name: string;
  sender_phone: string;
  sender_address: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  weight: number;
  length?: number;
  width?: number;
  height?: number;
  cod_amount: number;
  cod_fee?: number;
  shipping_fee?: number;
  current_status: string;
  created_at: string;
  pickup_hub: Hub;
  note?: string;
  delivery_image_url?: string;
  cod_status: string;
  shipment?: {
    id: string;
    vehicle_number: string;
    shipment_code?: string | null;
  } | null;
}

interface Shipment {
  id: string;
  shipment_code?: string | null;
  vehicle_number: string;
  status: string;
  created_at: string;
  shipper: Shipper;
  origin_hub: Hub;
  destination_hub: Hub | null;
  capacity_weight?: number;
  orders: Order[];
}

export default function OrdersManagementPage() {
  const [currentUser, setCurrentUser] = useState<{
    role: string;
    hub?: Hub | null;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"ORDERS" | "SHIPMENTS">("ORDERS");

  // Lists
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [shippers, setShippers] = useState<Shipper[]>([]);

  // Loading & Modes
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Search & Filter
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [orderHubFilter, setOrderHubFilter] = useState("ALL");

  const [shipmentSearch, setShipmentSearch] = useState("");
  const [shipmentStatusFilter, setShipmentStatusFilter] = useState("ALL");

  // Modals
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null); // For detail or edit
  const [isOrderEditMode, setIsOrderEditMode] = useState(false);

  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(
    null,
  ); // For edit
  const [isShipmentEditMode, setIsShipmentEditMode] = useState(false);

  const [isAssignShipmentOpen, setIsAssignShipmentOpen] = useState(false);
  const [ordersToAssignIds, setOrdersToAssignIds] = useState<string[]>([]);
  const [assignShipmentId, setAssignShipmentId] = useState("");

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Form states - Order
  const [orderForm, setOrderForm] = useState({
    sender_name: "",
    sender_phone: "",
    sender_address: "",
    receiver_name: "",
    receiver_phone: "",
    receiver_address: "",
    weight: 1,
    length: 0,
    width: 0,
    height: 0,
    cod_amount: 0,
    note: "",
    pickup_hub_id: "",
  });

  // Form states - Shipment (Gom nhóm)
  const [shipmentForm, setShipmentForm] = useState({
    shipper_id: "",
    destination_hub_id: "",
    vehicle_number: "",
    capacity_weight: 1000,
  });
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  // Print Label Handler
  const handlePrintLabel = async (orderId: string) => {
    try {
      const res = await api.get(`/orders/${orderId}/label`, {
        responseType: "blob",
      });
      const blobUrl = URL.createObjectURL(res.data);
      window.open(blobUrl, "_blank");
    } catch (error) {
      console.error("Lỗi khi tải nhãn in:", error);
      setNotification({
        type: "error",
        message: "Không thể in nhãn vận đơn lúc này.",
      });
    }
  };

  // Load core data
  const loadCoreData = async (showSpinner = false) => {
    if (!showSpinner) setIsLoading(true);
    setNotification(null);

    // Get current user from localStorage
    let currentHubId = "";
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setCurrentUser(parsed);
          currentHubId = parsed.hub?.id || "";
        } catch {
          // Do nothing
        }
      }
    }

    try {
      // 1. Fetch Hubs
      const hubsRes = await api.get("/hubs");
      const hubsList = hubsRes.data?.data || hubsRes.data || [];
      if (Array.isArray(hubsList)) setHubs(hubsList);

      // 2. Fetch Users to filter shippers
      const usersRes = await api.get("/users");
      const usersList = usersRes.data?.data || usersRes.data || [];
      if (Array.isArray(usersList)) {
        const shipperUsers = usersList.filter(
          (u: { role: string }) => u.role === "SHIPPER",
        );
        setShippers(shipperUsers);
      }

      // 3. Fetch Orders
      const ordersRes = await api.get("/orders");
      const ordersList = ordersRes.data?.data || ordersRes.data || [];
      if (Array.isArray(ordersList)) setOrders(ordersList);

      // 4. Fetch Shipments
      // Fetch shipments of current hub if coordinator, otherwise fetch first hub / all
      const targetHubId = currentHubId || hubsList[0]?.id || "hub-1";
      try {
        const shipmentsRes = await api.get(`/hubs/${targetHubId}/shipments`);
        const shipmentsList =
          shipmentsRes.data?.data || shipmentsRes.data || [];
        if (Array.isArray(shipmentsList)) setShipments(shipmentsList);
      } catch {
        // Fallback to general get if specific hub-shipments endpoint fails
        setShipments([]);
      }

      setIsDemoMode(false);
    } catch (err) {
      console.warn("Lỗi kết nối API backend. Chuyển sang Demo Mode.", err);
      setIsDemoMode(true);

      // Fallbacks
      const mockHubs = [
        { id: "hub-1", name: "Bưu cục Cầu Giấy" },
        { id: "hub-2", name: "Bưu cục Quận 1" },
        { id: "hub-3", name: "Bưu cục Hải Phòng" },
        { id: "hub-4", name: "Bưu cục Đà Nẵng" },
      ];
      setHubs(mockHubs);

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

      const mockOrders: Order[] = [
        {
          id: "ord-1",
          tracking_number: "VN2026F3A21",
          sender_name: "Nguyễn Thị Hoa",
          sender_phone: "0911111111",
          sender_address: "Hoàn Kiếm, Hà Nội",
          receiver_name: "Lê Văn Tiến",
          receiver_phone: "0988888888",
          receiver_address: "Lê Lợi, Hải Phòng",
          weight: 2.5,
          cod_amount: 450000,
          current_status: "PENDING",
          created_at: "2026-07-01T08:00:00Z",
          pickup_hub: mockHubs[0],
          cod_status: "PENDING",
          shipment: null,
        },
        {
          id: "ord-2",
          tracking_number: "VN2026A4B92",
          sender_name: "Trần Văn Hùng",
          sender_phone: "0922222222",
          sender_address: "Cầu Giấy, Hà Nội",
          receiver_name: "Hoàng Văn Nam",
          receiver_phone: "0977777777",
          receiver_address: "Lạch Tray, Hải Phòng",
          weight: 5.0,
          cod_amount: 1500000,
          current_status: "AT_HUB",
          created_at: "2026-07-02T09:30:00Z",
          pickup_hub: mockHubs[0],
          cod_status: "PENDING",
          shipment: null,
        },
        {
          id: "ord-3",
          tracking_number: "VN2026D7C81",
          sender_name: "Phạm Minh Đức",
          sender_phone: "0933333333",
          sender_address: "Hai Bà Trưng, Hà Nội",
          receiver_name: "Nguyễn Tuấn Anh",
          receiver_phone: "0966666666",
          receiver_address: "Ngô Quyền, Hải Phòng",
          weight: 0.8,
          cod_amount: 0,
          current_status: "EXCEPTION",
          created_at: "2026-07-03T10:15:00Z",
          pickup_hub: mockHubs[0],
          cod_status: "PENDING",
          note: "Hàng bị móp méo rách tem mác nhẹ",
          shipment: null,
        },
        {
          id: "ord-4",
          tracking_number: "VN2026K9D12",
          sender_name: "Đỗ Văn Toàn",
          sender_phone: "0944444444",
          sender_address: "Thanh Xuân, Hà Nội",
          receiver_name: "Trịnh Quang Vinh",
          receiver_phone: "0955555555",
          receiver_address: "Quận 1, TP. HCM",
          weight: 1.2,
          cod_amount: 600000,
          current_status: "FINISHED",
          created_at: "2026-07-04T11:00:00Z",
          pickup_hub: mockHubs[0],
          cod_status: "REMITTED",
          shipment: { id: "ship-101", vehicle_number: "29C-888.88" },
        },
      ];
      setOrders(mockOrders);

      setShipments([
        {
          id: "ship-101",
          vehicle_number: "29C-888.88",
          status: "PENDING",
          created_at: new Date().toISOString(),
          shipper: mockShippers[0],
          origin_hub: mockHubs[0],
          destination_hub: mockHubs[2],
          orders: [mockOrders[3]],
        },
        {
          id: "ship-102",
          vehicle_number: "30E-999.99",
          status: "IN_TRANSIT",
          created_at: new Date().toISOString(),
          shipper: mockShippers[1],
          origin_hub: mockHubs[0],
          destination_hub: mockHubs[3],
          orders: [],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCoreData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Handle Order submit (Create/Update)
  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !orderForm.sender_name.trim() ||
      !orderForm.receiver_name.trim() ||
      !orderForm.pickup_hub_id
    ) {
      setNotification({
        type: "error",
        message: "Vui lòng nhập đầy đủ thông tin bắt buộc!",
      });
      return;
    }

    if (Number(orderForm.weight) <= 0 || Number(orderForm.weight) > 5000) {
      setNotification({
        type: "error",
        message: "Cân nặng phải lớn hơn 0 và nhỏ hơn 5000 kg!",
      });
      return;
    }

    if (
      Number(orderForm.cod_amount) < 0 ||
      Number(orderForm.cod_amount) > 500000000
    ) {
      setNotification({
        type: "error",
        message: "Tiền thu hộ COD phải từ 0đ đến tối đa 500,000,000đ!",
      });
      return;
    }

    if (
      Number(orderForm.length || 0) < 0 ||
      Number(orderForm.length || 0) > 500 ||
      Number(orderForm.width || 0) < 0 ||
      Number(orderForm.width || 0) > 500 ||
      Number(orderForm.height || 0) < 0 ||
      Number(orderForm.height || 0) > 500
    ) {
      setNotification({
        type: "error",
        message: "Kích thước chiều dài, rộng, cao phải từ 0 đến 500 cm!",
      });
      return;
    }

    setIsSubmitLoading(true);

    if (isDemoMode) {
      const selectedHub =
        hubs.find((h) => h.id === orderForm.pickup_hub_id) || hubs[0];
      if (isOrderEditMode && selectedOrder) {
        setOrders(
          orders.map((o) =>
            o.id === selectedOrder.id
              ? {
                  ...o,
                  sender_name: orderForm.sender_name,
                  sender_phone: orderForm.sender_phone,
                  sender_address: orderForm.sender_address,
                  receiver_name: orderForm.receiver_name,
                  receiver_phone: orderForm.receiver_phone,
                  receiver_address: orderForm.receiver_address,
                  weight: orderForm.weight,
                  cod_amount: orderForm.cod_amount,
                  note: orderForm.note,
                  pickup_hub: selectedHub,
                }
              : o,
          ),
        );
        setNotification({
          type: "success",
          message: "Cập nhật đơn hàng thành công (Demo Mode)!",
        });
      } else {
        const newOrd: Order = {
          id: `ord-${Date.now()}`,
          tracking_number: `VN2026${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
          sender_name: orderForm.sender_name,
          sender_phone: orderForm.sender_phone,
          sender_address: orderForm.sender_address,
          receiver_name: orderForm.receiver_name,
          receiver_phone: orderForm.receiver_phone,
          receiver_address: orderForm.receiver_address,
          weight: orderForm.weight,
          cod_amount: orderForm.cod_amount,
          current_status: "PENDING",
          created_at: new Date().toISOString(),
          pickup_hub: selectedHub,
          note: orderForm.note,
          cod_status: "PENDING",
          shipment: null,
        };
        setOrders([newOrd, ...orders]);
        setNotification({
          type: "success",
          message: "Tạo đơn hàng thành công (Demo Mode)!",
        });
      }
      setIsOrderModalOpen(false);
      setIsSubmitLoading(false);
      return;
    }

    try {
      if (isOrderEditMode && selectedOrder) {
        await api.patch(`/orders/${selectedOrder.id}`, {
          sender_name: orderForm.sender_name,
          sender_phone: orderForm.sender_phone,
          sender_address: orderForm.sender_address,
          receiver_name: orderForm.receiver_name,
          receiver_phone: orderForm.receiver_phone,
          receiver_address: orderForm.receiver_address,
          weight: Number(orderForm.weight),
          length: Number(orderForm.length),
          width: Number(orderForm.width),
          height: Number(orderForm.height),
          cod_amount: Number(orderForm.cod_amount),
          note: orderForm.note,
          pickup_hub_id: orderForm.pickup_hub_id,
        });
        setNotification({
          type: "success",
          message: "Cập nhật đơn hàng thành công!",
        });
      } else {
        await api.post("/orders", {
          sender_name: orderForm.sender_name,
          sender_phone: orderForm.sender_phone,
          sender_address: orderForm.sender_address,
          receiver_name: orderForm.receiver_name,
          receiver_phone: orderForm.receiver_phone,
          receiver_address: orderForm.receiver_address,
          weight: Number(orderForm.weight),
          length: Number(orderForm.length),
          width: Number(orderForm.width),
          height: Number(orderForm.height),
          cod_amount: Number(orderForm.cod_amount),
          note: orderForm.note,
          pickup_hub_id: orderForm.pickup_hub_id,
        });
        setNotification({
          type: "success",
          message: "Tạo đơn hàng thành công!",
        });
      }
      await loadCoreData();
      setIsOrderModalOpen(false);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setNotification({
        type: "error",
        message: apiError.response?.data?.message || "Lỗi xử lý đơn hàng!",
      });
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // Open create order modal
  const openCreateOrderModal = () => {
    setSelectedOrder(null);
    setIsOrderEditMode(false);
    setOrderForm({
      sender_name: "",
      sender_phone: "",
      sender_address: "",
      receiver_name: "",
      receiver_phone: "",
      receiver_address: "",
      weight: 1,
      length: 0,
      width: 0,
      height: 0,
      cod_amount: 0,
      note: "",
      pickup_hub_id: currentUser?.hub?.id || hubs[0]?.id || "",
    });
    setIsOrderModalOpen(true);
  };

  // Open edit order modal
  const openEditOrderModal = (order: Order) => {
    setSelectedOrder(order);
    setIsOrderEditMode(true);
    setOrderForm({
      sender_name: order.sender_name,
      sender_phone: order.sender_phone,
      sender_address: order.sender_address,
      receiver_name: order.receiver_name,
      receiver_phone: order.receiver_phone,
      receiver_address: order.receiver_address,
      weight: order.weight,
      length: order.length || 0,
      width: order.width || 0,
      height: order.height || 0,
      cod_amount: order.cod_amount,
      note: order.note || "",
      pickup_hub_id: order.pickup_hub.id,
    });
    setIsOrderModalOpen(true);
  };

  // Soft Delete order
  const handleDeleteOrder = async (orderId: string) => {
    const confirmDelete = window.confirm(
      "Bạn có chắc chắn muốn xóa đơn hàng này? Đơn hàng sẽ được chuyển vào thùng rác soft delete.",
    );
    if (!confirmDelete) return;

    if (isDemoMode) {
      setOrders(orders.filter((o) => o.id !== orderId));
      setNotification({
        type: "success",
        message: "Đã xóa đơn hàng thành công (Demo Mode)!",
      });
      return;
    }

    try {
      await api.delete(`/orders/${orderId}`);
      setNotification({ type: "success", message: "Xóa đơn hàng thành công!" });
      await loadCoreData();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setNotification({
        type: "error",
        message: apiError.response?.data?.message || "Lỗi xóa đơn hàng!",
      });
    }
  };

  // Quick order operations
  const handleQuickScanIn = async (trackingNum: string) => {
    if (isDemoMode) {
      setOrders(
        orders.map((o) =>
          o.tracking_number === trackingNum
            ? { ...o, current_status: "AT_HUB" }
            : o,
        ),
      );
      setNotification({
        type: "success",
        message: `Quét mã nhập kho ${trackingNum} thành công (Demo)!`,
      });
      return;
    }
    try {
      await api.post("/orders/scan-in", { tracking_numbers: [trackingNum] });
      setNotification({
        type: "success",
        message: `Đã nhập kho bưu cục vận đơn ${trackingNum}!`,
      });
      await loadCoreData();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setNotification({
        type: "error",
        message: apiError.response?.data?.message || "Lỗi nhập kho!",
      });
    }
  };

  const handleQuickScanOut = async (trackingNum: string, shipperId: string) => {
    if (isDemoMode) {
      setOrders(
        orders.map((o) =>
          o.tracking_number === trackingNum
            ? { ...o, current_status: "DELIVERING" }
            : o,
        ),
      );
      setNotification({
        type: "success",
        message: `Quét mã xuất kho giao shipper ${trackingNum} thành công (Demo)!`,
      });
      return;
    }
    try {
      await api.post("/orders/scan-out", {
        tracking_numbers: [trackingNum],
        shipper_id: shipperId,
      });
      setNotification({
        type: "success",
        message: `Đã xuất kho bàn giao shipper cho đơn ${trackingNum}!`,
      });
      await loadCoreData();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setNotification({
        type: "error",
        message: apiError.response?.data?.message || "Lỗi xuất kho!",
      });
    }
  };

  const handleQuickRetry = async (orderId: string) => {
    if (isDemoMode) {
      setOrders(
        orders.map((o) =>
          o.id === orderId
            ? { ...o, current_status: "AT_HUB", note: "Giao lại lần 2" }
            : o,
        ),
      );
      setNotification({
        type: "success",
        message: "Đã tạo lệnh giao lại thành công (Demo)!",
      });
      return;
    }
    try {
      await api.patch(`/orders/${orderId}/retry`, {
        note: "Yêu cầu giao lại từ điều phối viên",
      });
      setNotification({
        type: "success",
        message: "Đã cập nhật lệnh giao lại thành công!",
      });
      await loadCoreData();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setNotification({
        type: "error",
        message: apiError.response?.data?.message || "Lỗi giao lại!",
      });
    }
  };

  const handleQuickRts = async (orderId: string) => {
    if (isDemoMode) {
      setOrders(
        orders.map((o) =>
          o.id === orderId ? { ...o, current_status: "RETURN_TO_SENDER" } : o,
        ),
      );
      setNotification({
        type: "success",
        message: "Đã chốt chuyển hoàn thành công (Demo)!",
      });
      return;
    }
    try {
      await api.patch(`/orders/${orderId}/rts`, {
        reason: "Khách từ chối nhận hàng",
      });
      setNotification({
        type: "success",
        message: "Đã chốt hoàn trả đơn về cho người gửi!",
      });
      await loadCoreData();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setNotification({
        type: "error",
        message: apiError.response?.data?.message || "Lỗi chuyển hoàn!",
      });
    }
  };

  const handleQuickRemit = async (orderId: string) => {
    if (isDemoMode) {
      setOrders(
        orders.map((o) =>
          o.id === orderId ? { ...o, cod_status: "REMITTED" } : o,
        ),
      );
      setNotification({
        type: "success",
        message: "Đã đối soát quỹ COD thành công (Demo)!",
      });
      return;
    }
    try {
      await api.post("/orders/remit", { order_ids: [orderId] });
      setNotification({
        type: "success",
        message: "Đối soát nộp quỹ COD thành công!",
      });
      await loadCoreData();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setNotification({
        type: "error",
        message: apiError.response?.data?.message || "Lỗi đối soát!",
      });
    }
  };

  // Grouping (Gom nhóm) - Assign multiple orders to shipment
  const openAssignShipmentModal = (orderId?: string) => {
    if (orderId) {
      setOrdersToAssignIds([orderId]);
    } else {
      // Find checked orders from UI or lets them check inside modal
      setOrdersToAssignIds([]);
    }
    setAssignShipmentId(shipments.length > 0 ? shipments[0].id : "");
    setIsAssignShipmentOpen(true);
  };

  const handleAssignToShipmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignShipmentId || ordersToAssignIds.length === 0) {
      setNotification({
        type: "error",
        message: "Vui lòng chọn chuyến xe và ít nhất một đơn hàng!",
      });
      return;
    }

    setIsSubmitLoading(true);

    if (isDemoMode) {
      const shipmentToAssign = shipments.find((s) => s.id === assignShipmentId);
      const ordersToAssign = orders.filter((o) =>
        ordersToAssignIds.includes(o.id),
      );
      if (shipmentToAssign) {
        setShipments(
          shipments.map((s) =>
            s.id === assignShipmentId
              ? {
                  ...s,
                  orders: [...s.orders, ...ordersToAssign],
                }
              : s,
          ),
        );
        setOrders(
          orders.map((o) =>
            ordersToAssignIds.includes(o.id)
              ? {
                  ...o,
                  shipment: {
                    id: shipmentToAssign.id,
                    vehicle_number: shipmentToAssign.vehicle_number,
                  },
                }
              : o,
          ),
        );
        setNotification({
          type: "success",
          message: `Gom nhóm đơn hàng thành công (Demo)!`,
        });
      }
      setIsAssignShipmentOpen(false);
      setIsSubmitLoading(false);
      return;
    }

    try {
      await api.patch(`/shipments/${assignShipmentId}/orders`, {
        order_ids: ordersToAssignIds,
      });
      setNotification({
        type: "success",
        message: "Gom nhóm và xếp các đơn hàng lên xe thành công!",
      });
      await loadCoreData();
      setIsAssignShipmentOpen(false);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setNotification({
        type: "error",
        message: apiError.response?.data?.message || "Lỗi gom nhóm đơn hàng!",
      });
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // Create or Update Shipment
  const handleShipmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipmentForm.shipper_id || !shipmentForm.vehicle_number.trim()) {
      setNotification({
        type: "error",
        message: "Vui lòng điền đầy đủ biển số xe và tài xế!",
      });
      return;
    }

    setIsSubmitLoading(true);

    if (isDemoMode) {
      if (isShipmentEditMode && selectedShipment) {
        setShipments(
          shipments.map((s) =>
            s.id === selectedShipment.id
              ? {
                  ...s,
                  vehicle_number: shipmentForm.vehicle_number.toUpperCase(),
                  shipper:
                    shippers.find((sh) => sh.id === shipmentForm.shipper_id) ||
                    s.shipper,
                  destination_hub:
                    hubs.find(
                      (h) => h.id === shipmentForm.destination_hub_id,
                    ) || null,
                }
              : s,
          ),
        );
        setNotification({
          type: "success",
          message: "Sửa gom nhóm thành công (Demo Mode)!",
        });
      } else {
        const originId = currentUser?.hub?.id || hubs[0]?.id || "hub-1";
        const newShip: Shipment = {
          id: `ship-${Date.now()}`,
          vehicle_number: shipmentForm.vehicle_number.toUpperCase(),
          status: "PENDING",
          created_at: new Date().toISOString(),
          shipper:
            shippers.find((s) => s.id === shipmentForm.shipper_id) ||
            shippers[0],
          origin_hub: hubs.find((h) => h.id === originId) || hubs[0],
          destination_hub:
            hubs.find((h) => h.id === shipmentForm.destination_hub_id) || null,
          orders: [],
        };
        setShipments([newShip, ...shipments]);
        setNotification({
          type: "success",
          message: "Tạo gom nhóm chuyến xe mới thành công (Demo Mode)!",
        });
      }
      setIsShipmentModalOpen(false);
      setIsSubmitLoading(false);
      return;
    }

    try {
      if (isShipmentEditMode && selectedShipment) {
        await api.patch(`/shipments/${selectedShipment.id}`, {
          shipper_id: shipmentForm.shipper_id,
          vehicle_number: shipmentForm.vehicle_number.toUpperCase(),
          destination_hub_id: shipmentForm.destination_hub_id || null,
          capacity_weight: Number(shipmentForm.capacity_weight),
        });
        setNotification({
          type: "success",
          message: "Chỉnh sửa thông tin chuyến xe thành công!",
        });
      } else {
        const originId = currentUser?.hub?.id || hubs[0]?.id || "hub-1";
        await api.post("/shipments", {
          shipper_id: shipmentForm.shipper_id,
          origin_hub_id: originId,
          destination_hub_id: shipmentForm.destination_hub_id || undefined,
          vehicle_number: shipmentForm.vehicle_number.toUpperCase(),
          capacity_weight: Number(shipmentForm.capacity_weight),
        });
        setNotification({
          type: "success",
          message: "Tạo chuyến xe gom nhóm mới thành công!",
        });
      }
      await loadCoreData();
      setIsShipmentModalOpen(false);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setNotification({
        type: "error",
        message: apiError.response?.data?.message || "Lỗi xử lý chuyến xe!",
      });
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const openCreateShipmentModal = () => {
    setSelectedShipment(null);
    setIsShipmentEditMode(false);
    setShipmentForm({
      shipper_id: shippers.length > 0 ? shippers[0].id : "",
      destination_hub_id: "",
      vehicle_number: "",
      capacity_weight: 1000,
    });
    setIsShipmentModalOpen(true);
  };

  const openEditShipmentModal = (ship: Shipment) => {
    setSelectedShipment(ship);
    setIsShipmentEditMode(true);
    setShipmentForm({
      shipper_id: ship.shipper.id,
      destination_hub_id: ship.destination_hub?.id || "",
      vehicle_number: ship.vehicle_number,
      capacity_weight: Number(ship.capacity_weight) || 1000,
    });
    setIsShipmentModalOpen(true);
  };

  const handleDeleteShipment = async (shipmentId: string) => {
    const confirmDelete = window.confirm(
      "Bạn có chắc chắn muốn xóa gom nhóm này? Tất cả đơn hàng trên xe sẽ được giải phóng quay lại kho bãi.",
    );
    if (!confirmDelete) return;

    if (isDemoMode) {
      setShipments(shipments.filter((s) => s.id !== shipmentId));
      setOrders(
        orders.map((o) =>
          o.shipment?.id === shipmentId ? { ...o, shipment: null } : o,
        ),
      );
      setNotification({
        type: "success",
        message: "Đã xóa gom nhóm thành công (Demo Mode)!",
      });
      return;
    }

    try {
      await api.delete(`/shipments/${shipmentId}`);
      setNotification({
        type: "success",
        message: "Xóa chuyến xe gom nhóm thành công!",
      });
      await loadCoreData();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setNotification({
        type: "error",
        message: apiError.response?.data?.message || "Lỗi xóa chuyến xe!",
      });
    }
  };

  // Filter Logic
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.tracking_number.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.sender_name.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.receiver_name.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.receiver_phone.includes(orderSearch);

    const matchesStatus =
      orderStatusFilter === "ALL" || o.current_status === orderStatusFilter;
    const matchesHub =
      orderHubFilter === "ALL" || o.pickup_hub?.id === orderHubFilter;

    return matchesSearch && matchesStatus && matchesHub;
  });

  const filteredShipments = shipments.filter((s) => {
    const matchesSearch =
      s.vehicle_number.toLowerCase().includes(shipmentSearch.toLowerCase()) ||
      s.shipper.full_name.toLowerCase().includes(shipmentSearch.toLowerCase());

    const matchesStatus =
      shipmentStatusFilter === "ALL" || s.status === shipmentStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "AT_HUB":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "DELIVERING":
      case "IN_TRANSIT":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "FINISHED":
        return "bg-emerald-50 text-emerald-700 border-emerald-250";
      case "EXCEPTION":
        return "bg-red-50 text-red-700 border-red-205";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Chờ xử lý";
      case "AT_HUB":
        return "Đang lưu kho";
      case "DELIVERING":
        return "Đang giao khách";
      case "IN_TRANSIT":
        return "Đang trung chuyển";
      case "FINISHED":
        return "Thành công";
      case "EXCEPTION":
        return "Lỗi sự cố";
      default:
        return status;
    }
  };

  const getShipmentWeight = (ship: Shipment) => {
    return ship.orders.reduce((sum, o) => sum + Number(o.weight), 0);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Demo Warning */}
      {isDemoMode && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-start gap-3 shadow-sm text-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">
              Đang chạy ở chế độ giả lập (Demo Mode):
            </span>{" "}
            CSDL chính của Backend không kết nối được hoặc bị thiếu quyền. Hệ
            thống tự động chuyển sang mô phỏng vận hành.
          </div>
        </div>
      )}

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
            <Package className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Trung Tâm Điều Phối & Quản Lý Đơn Hàng
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Lập đơn hàng, quản lý quy trình phân phối, gom nhóm chuyến xe tải
              và chốt nộp tiền COD bưu cục
            </p>
          </div>
        </div>

        {/* Tab selector and Action */}
        <div className="flex items-center gap-3 self-end md:self-center">
          <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setActiveTab("ORDERS")}
              className={`px-4 py-2 font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "ORDERS"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Danh sách Đơn hàng
            </button>
            <button
              onClick={() => setActiveTab("SHIPMENTS")}
              className={`px-4 py-2 font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "SHIPMENTS"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Gom nhóm / Chuyến xe
            </button>
          </div>

          <button
            onClick={() => {
              if (activeTab === "ORDERS") openCreateOrderModal();
              else openCreateShipmentModal();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            {activeTab === "ORDERS" ? "Tạo đơn hàng mới" : "Tạo gom nhóm"}
          </button>
        </div>
      </div>

      {/* TAB 1: ORDERS */}
      {activeTab === "ORDERS" && (
        <div className="space-y-4">
          {/* Order Filters */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-xs"
                placeholder="Tìm mã vận đơn, người gửi, người nhận, số điện thoại..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap w-full md:w-auto gap-3 items-center">
              {/* Status filter */}
              <select
                className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold"
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PENDING">Chờ xử lý</option>
                <option value="AT_HUB">Đang lưu kho</option>
                <option value="DELIVERING">Đang giao khách</option>
                <option value="IN_TRANSIT">Đang trung chuyển</option>
                <option value="FINISHED">Giao thành công</option>
                <option value="EXCEPTION">Sự cố/Tạm giữ</option>
              </select>

              {/* Hub filter */}
              <select
                className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold"
                value={orderHubFilter}
                onChange={(e) => setOrderHubFilter(e.target.value)}
              >
                <option value="ALL">Tất cả bưu cục lấy hàng</option>
                {hubs.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 text-sm font-semibold">
                  Đang tải danh sách đơn hàng...
                </p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-16 text-center text-slate-400 space-y-2">
                <ClipboardList className="w-12 h-12 mx-auto text-slate-350" />
                <p className="text-sm font-bold text-slate-800">
                  Không tìm thấy đơn hàng nào
                </p>
                <p className="text-xs max-w-sm mx-auto text-slate-400">
                  Hãy thử nhập từ khóa tìm kiếm khác hoặc nhấn &quot;Tạo đơn
                  hàng mới&quot;.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-6 py-4">Mã Vận Đơn</th>
                      <th className="px-6 py-4">Người Gửi</th>
                      <th className="px-6 py-4">Người Nhận & Nơi Đến</th>
                      <th className="px-6 py-4">Thông số (kg / COD)</th>
                      <th className="px-6 py-4">Trạng thái đơn</th>
                      <th className="px-6 py-4">COD quỹ</th>
                      <th className="px-6 py-4 text-right">
                        Hành động vận hành / Quản lý
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredOrders.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        {/* Tracking number */}
                        <td className="px-6 py-4 font-mono font-bold text-slate-900">
                          {item.tracking_number}
                        </td>

                        {/* Sender */}
                        <td className="px-6 py-4 space-y-0.5">
                          <span className="font-semibold text-slate-800 block">
                            {item.sender_name}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {item.sender_phone}
                          </span>
                        </td>

                        {/* Receiver */}
                        <td className="px-6 py-4 space-y-0.5 max-w-xs">
                          <span className="font-semibold text-slate-800 block">
                            {item.receiver_name}
                          </span>
                          <span
                            className="text-[10px] text-slate-450 truncate block"
                            title={item.receiver_address}
                          >
                            {item.receiver_address}
                          </span>
                        </td>

                        <td className="px-6 py-4 space-y-0.5">
                          <span className="font-bold text-slate-700 block">
                            {item.weight} kg{" "}
                            {item.length && item.width && item.height
                              ? `(${item.length}x${item.width}x${item.height}cm)`
                              : ""}
                          </span>
                          <span className="text-[10px] text-blue-600 font-semibold block">
                            COD: {item.cod_amount?.toLocaleString()} đ{" "}
                            {item.cod_fee
                              ? `(Phí: ${Number(item.cod_fee).toLocaleString()} đ)`
                              : ""}
                          </span>
                          {item.shipping_fee && (
                            <span className="text-[10px] text-slate-550 font-bold block">
                              Ship: {Number(item.shipping_fee).toLocaleString()}{" "}
                              đ
                            </span>
                          )}
                        </td>

                        {/* Order status */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${getStatusStyle(item.current_status)}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {getStatusLabel(item.current_status)}
                          </span>
                        </td>

                        {/* COD Remit status */}
                        <td className="px-6 py-4">
                          {item.cod_amount > 0 ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.cod_status === "REMITTED"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {item.cod_status === "REMITTED"
                                ? "Đã đối soát"
                                : "Chờ nộp"}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">
                              Không COD
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right space-y-1.5">
                          {/* Operative Lifecycle Quick Buttons */}
                          <div className="flex items-center justify-end gap-1.5">
                            {item.current_status === "PENDING" && (
                              <button
                                onClick={() =>
                                  handleQuickScanIn(item.tracking_number)
                                }
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[10px] cursor-pointer"
                                title="Quét nhập kho bưu cục bãi lấy hàng"
                              >
                                Nhập kho bãi
                              </button>
                            )}

                            {item.current_status === "AT_HUB" && (
                              <>
                                <button
                                  onClick={() =>
                                    openAssignShipmentModal(item.id)
                                  }
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded text-[10px] cursor-pointer flex items-center gap-1"
                                >
                                  <Truck className="w-3 h-3" />
                                  Gom nhóm xe
                                </button>

                                {shippers.length > 0 && (
                                  <button
                                    onClick={() =>
                                      handleQuickScanOut(
                                        item.tracking_number,
                                        shippers[0].id,
                                      )
                                    }
                                    className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded text-[10px] cursor-pointer"
                                    title="Quét bàn giao shipper đi giao"
                                  >
                                    Bàn giao Shipper
                                  </button>
                                )}
                              </>
                            )}

                            {(item.current_status === "DELIVERING" ||
                              item.current_status === "EXCEPTION") && (
                              <>
                                <button
                                  onClick={() => handleQuickRetry(item.id)}
                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold rounded text-[10px] cursor-pointer"
                                >
                                  Giao lại
                                </button>
                                <button
                                  onClick={() => handleQuickRts(item.id)}
                                  className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold rounded text-[10px] cursor-pointer"
                                >
                                  Chuyển hoàn
                                </button>
                              </>
                            )}

                            {item.current_status === "FINISHED" &&
                              item.cod_status === "PENDING" &&
                              item.cod_amount > 0 && (
                                <button
                                  onClick={() => handleQuickRemit(item.id)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] cursor-pointer flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  Nộp quỹ COD
                                </button>
                              )}
                          </div>

                          {/* Detail / Edit / Delete buttons */}
                          <div className="flex items-center justify-end gap-1.5 text-slate-400">
                            <button
                              onClick={() => {
                                setSelectedOrder(item);
                                setIsDetailModalOpen(true);
                              }}
                              className="p-1 hover:text-slate-800 cursor-pointer"
                              title="Chi tiết đơn hàng"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePrintLabel(item.id)}
                              className="p-1 hover:text-blue-600 cursor-pointer"
                              title="In nhãn vận đơn"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {(item.current_status === "PENDING" ||
                              item.current_status === "AT_HUB") && (
                              <>
                                <button
                                  onClick={() => openEditOrderModal(item)}
                                  className="p-1 hover:text-blue-600 cursor-pointer"
                                  title="Chỉnh sửa đơn hàng"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteOrder(item.id)}
                                  className="p-1 hover:text-red-650 cursor-pointer"
                                  title="Xóa đơn hàng (soft delete)"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SHIPMENTS (Gom nhóm) */}
      {activeTab === "SHIPMENTS" && (
        <div className="space-y-4">
          {/* Shipment Filters */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-xs"
                placeholder="Tìm biển số xe hoặc tài xế..."
                value={shipmentSearch}
                onChange={(e) => setShipmentSearch(e.target.value)}
              />
            </div>

            <select
              className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold"
              value={shipmentStatusFilter}
              onChange={(e) => setShipmentStatusFilter(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái chuyến</option>
              <option value="PENDING">Chờ gom hàng (PENDING)</option>
              <option value="IN_TRANSIT">Đang di chuyển (IN_TRANSIT)</option>
              <option value="COMPLETED">Đã cập bến (COMPLETED)</option>
            </select>
          </div>

          {/* Shipment Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isLoading ? (
              <div className="md:col-span-2 p-16 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 text-sm font-semibold">
                  Đang tải danh sách gom nhóm...
                </p>
              </div>
            ) : filteredShipments.length === 0 ? (
              <div className="md:col-span-2 p-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800">
                  Chưa có gom nhóm chuyến xe nào được tạo
                </h3>
                <p className="text-xs text-slate-450 mt-1">
                  Hãy click &quot;Tạo gom nhóm&quot; để thiết lập xe chuyển hàng
                  liên bưu cục.
                </p>
              </div>
            ) : (
              filteredShipments.map((ship) => {
                const totalWeight = getShipmentWeight(ship);
                const maxWeight = Number(ship.capacity_weight) || 1000;
                const fillRate = Math.min(
                  Math.round((totalWeight / maxWeight) * 100),
                  100,
                );

                return (
                  <div
                    key={ship.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between"
                  >
                    <div className="p-5 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-md font-extrabold text-slate-800">
                              {ship.vehicle_number}
                            </h3>
                            {ship.shipment_code && (
                              <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50/50 px-2 py-0.5 rounded border border-blue-200">
                                {ship.shipment_code}
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                ship.status === "PENDING"
                                  ? "bg-slate-100 text-slate-700"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {ship.status}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                            Tạo ngày:{" "}
                            {new Date(ship.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Shipment Action Menu */}
                        {ship.status === "PENDING" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditShipmentModal(ship)}
                              className="p-1.5 bg-slate-105 hover:bg-slate-200 border border-slate-250 rounded-lg text-slate-650 cursor-pointer"
                              title="Sửa thông tin gom nhóm"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteShipment(ship.id)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-650 cursor-pointer"
                              title="Hủy/Xóa gom nhóm"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Hub route */}
                      <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{ship.origin_hub.name}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>
                          {ship.destination_hub?.name || "Địa chỉ khách"}
                        </span>
                      </div>

                      {/* Driver info */}
                      <div className="flex items-center gap-2.5 text-xs text-slate-650">
                        <User className="w-4 h-4 text-slate-400" />
                        <span>
                          Tài xế:{" "}
                          <strong className="text-slate-800">
                            {ship.shipper.full_name}
                          </strong>{" "}
                          ({ship.shipper.phone_number})
                        </span>
                      </div>

                      {/* Weight progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                          <span>Khối lượng đã xếp:</span>
                          <span
                            className={
                              fillRate >= 80
                                ? "text-emerald-600"
                                : "text-blue-600"
                            }
                          >
                            {totalWeight}kg / {maxWeight}kg ({fillRate}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-150 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${fillRate >= 80 ? "bg-emerald-500" : "bg-blue-500"}`}
                            style={{ width: `${fillRate}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Assigned orders */}
                    <div className="border-t border-slate-150 bg-slate-50/50 p-4 space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Các kiện hàng đã gom ({ship.orders.length})
                      </span>
                      {ship.orders.length === 0 ? (
                        <span className="text-xs text-slate-400 italic block py-1">
                          Không có kiện hàng nào.
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {ship.orders.map((o) => (
                            <span
                              key={o.id}
                              className="inline-block px-2 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-mono text-slate-700"
                            >
                              {o.tracking_number} ({o.weight}kg)
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: TẠO / SỬA ĐƠN HÀNG */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-2xl border border-slate-200 shadow-2xl relative overflow-hidden">
            <div className="p-6 border-b border-slate-150 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                {isOrderEditMode
                  ? `Chỉnh sửa đơn hàng ${selectedOrder?.tracking_number}`
                  : "Tạo lập đơn hàng mới"}
              </h2>
              <button
                onClick={() => setIsOrderModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleOrderSubmit}
              className="p-6 space-y-4 max-h-[75vh] overflow-y-auto"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sender card */}
                <div className="bg-slate-50/50 p-4 border border-slate-150 rounded-xl space-y-3">
                  <h3 className="text-xs font-extrabold text-blue-700 uppercase tracking-wider mb-2">
                    Thông tin Người gửi
                  </h3>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Họ tên
                    </label>
                    <input
                      type="text"
                      required
                      className="block w-full px-3 py-2 bg-white border border-slate-250 text-slate-800 text-xs rounded-lg focus:border-blue-500 outline-none"
                      value={orderForm.sender_name}
                      onChange={(e) =>
                        setOrderForm({
                          ...orderForm,
                          sender_name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      required
                      className="block w-full px-3 py-2 bg-white border border-slate-250 text-slate-800 text-xs rounded-lg focus:border-blue-500 outline-none"
                      value={orderForm.sender_phone}
                      onChange={(e) =>
                        setOrderForm({
                          ...orderForm,
                          sender_phone: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Địa chỉ
                    </label>
                    <textarea
                      required
                      rows={2}
                      className="block w-full px-3 py-2 bg-white border border-slate-250 text-slate-800 text-xs rounded-lg focus:border-blue-500 outline-none resize-none"
                      value={orderForm.sender_address}
                      onChange={(e) =>
                        setOrderForm({
                          ...orderForm,
                          sender_address: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                {/* Receiver card */}
                <div className="bg-slate-50/50 p-4 border border-slate-150 rounded-xl space-y-3">
                  <h3 className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider mb-2">
                    Thông tin Người nhận
                  </h3>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Họ tên
                    </label>
                    <input
                      type="text"
                      required
                      className="block w-full px-3 py-2 bg-white border border-slate-250 text-slate-800 text-xs rounded-lg focus:border-blue-500 outline-none"
                      value={orderForm.receiver_name}
                      onChange={(e) =>
                        setOrderForm({
                          ...orderForm,
                          receiver_name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      required
                      className="block w-full px-3 py-2 bg-white border border-slate-250 text-slate-800 text-xs rounded-lg focus:border-blue-500 outline-none"
                      value={orderForm.receiver_phone}
                      onChange={(e) =>
                        setOrderForm({
                          ...orderForm,
                          receiver_phone: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Địa chỉ
                    </label>
                    <textarea
                      required
                      rows={2}
                      className="block w-full px-3 py-2 bg-white border border-slate-250 text-slate-800 text-xs rounded-lg focus:border-blue-500 outline-none resize-none"
                      value={orderForm.receiver_address}
                      onChange={(e) =>
                        setOrderForm({
                          ...orderForm,
                          receiver_address: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Package parameters */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    Khối lượng (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-250 text-slate-800 text-xs rounded-lg outline-none focus:border-blue-500"
                    value={orderForm.weight}
                    onChange={(e) =>
                      setOrderForm({
                        ...orderForm,
                        weight: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    Tiền COD thu hộ (đ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-250 text-slate-800 text-xs rounded-lg outline-none focus:border-blue-500"
                    value={orderForm.cod_amount}
                    onChange={(e) =>
                      setOrderForm({
                        ...orderForm,
                        cod_amount: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    Bưu cục lấy hàng
                  </label>
                  <select
                    required
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-250 text-slate-700 text-xs rounded-lg outline-none"
                    value={orderForm.pickup_hub_id}
                    onChange={(e) =>
                      setOrderForm({
                        ...orderForm,
                        pickup_hub_id: e.target.value,
                      })
                    }
                  >
                    <option value="">-- Chọn bưu cục --</option>
                    {hubs.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Package Dimensions */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    Chiều Dài (cm)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-250 text-slate-800 text-xs rounded-lg outline-none focus:border-blue-500"
                    value={orderForm.length}
                    onChange={(e) =>
                      setOrderForm({
                        ...orderForm,
                        length: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    Chiều Rộng (cm)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-250 text-slate-800 text-xs rounded-lg outline-none focus:border-blue-500"
                    value={orderForm.width}
                    onChange={(e) =>
                      setOrderForm({
                        ...orderForm,
                        width: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    Chiều Cao (cm)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-250 text-slate-800 text-xs rounded-lg outline-none focus:border-blue-500"
                    value={orderForm.height}
                    onChange={(e) =>
                      setOrderForm({
                        ...orderForm,
                        height: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Ghi chú vận chuyển
                </label>
                <input
                  type="text"
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-250 text-slate-800 text-xs rounded-lg focus:border-blue-500 outline-none"
                  placeholder="Khách xem hàng, dễ vỡ..."
                  value={orderForm.note}
                  onChange={(e) =>
                    setOrderForm({ ...orderForm, note: e.target.value })
                  }
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="px-4 py-2 border border-slate-250 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitLoading}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitLoading ? "Đang xử lý..." : "Lưu đơn hàng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TẠO / SỬA GOM NHÓM (Shipment) */}
      {isShipmentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl relative overflow-hidden">
            <div className="p-6 border-b border-slate-150 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                {isShipmentEditMode
                  ? `Cấu hình lại chuyến xe ${selectedShipment?.vehicle_number}`
                  : "Tạo gom nhóm chuyến xe mới"}
              </h2>
              <button
                onClick={() => setIsShipmentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleShipmentSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Biển số xe
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 29C-888.88"
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-250 text-slate-800 text-xs rounded-xl focus:border-blue-500 outline-none"
                  value={shipmentForm.vehicle_number}
                  onChange={(e) =>
                    setShipmentForm({
                      ...shipmentForm,
                      vehicle_number: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Chọn Shipper phụ trách
                </label>
                <select
                  required
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-250 text-slate-700 text-xs rounded-xl outline-none"
                  value={shipmentForm.shipper_id}
                  onChange={(e) =>
                    setShipmentForm({
                      ...shipmentForm,
                      shipper_id: e.target.value,
                    })
                  }
                >
                  <option value="">-- Chọn tài xế --</option>
                  {shippers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.phone_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Trạm cập bến (Đích)
                </label>
                <select
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-250 text-slate-700 text-xs rounded-xl outline-none"
                  value={shipmentForm.destination_hub_id}
                  onChange={(e) =>
                    setShipmentForm({
                      ...shipmentForm,
                      destination_hub_id: e.target.value,
                    })
                  }
                >
                  <option value="">
                    -- Giao thẳng tới khách (Chặng cuối) --
                  </option>
                  {hubs
                    .filter((h) => h.id !== currentUser?.hub?.id)
                    .map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Tải trọng xe tối đa (kg)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-250 text-slate-800 text-xs rounded-xl outline-none"
                  value={shipmentForm.capacity_weight}
                  onChange={(e) =>
                    setShipmentForm({
                      ...shipmentForm,
                      capacity_weight: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setIsShipmentModalOpen(false)}
                  className="px-4 py-2 border border-slate-250 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitLoading}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitLoading ? "Đang xử lý..." : "Lưu chuyến xe"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: XẾP ĐƠN HÀNG VÀO GOM NHÓM (Shipment assignment) */}
      {isAssignShipmentOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl relative overflow-hidden">
            <div className="p-6 border-b border-slate-150 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-650" />
                Gom nhóm xếp đơn lên xe
              </h2>
              <button
                onClick={() => setIsAssignShipmentOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleAssignToShipmentSubmit}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Chọn chuyến xe tải / gom nhóm (PENDING)
                </label>
                <select
                  required
                  className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-250 text-slate-700 text-xs rounded-xl outline-none"
                  value={assignShipmentId}
                  onChange={(e) => setAssignShipmentId(e.target.value)}
                >
                  <option value="">-- Chọn chuyến xe tải --</option>
                  {shipments
                    .filter((s) => s.status === "PENDING")
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.vehicle_number} - {s.shipper.full_name} (Tới:{" "}
                        {s.destination_hub?.name || "Khách"})
                      </option>
                    ))}
                </select>
              </div>

              {shipments.filter((s) => s.status === "PENDING").length === 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-[10px] rounded-lg">
                  Không tìm thấy chuyến xe đang chờ nào. Vui lòng tạo một gom
                  nhóm chuyến xe trước.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setIsAssignShipmentOpen(false)}
                  className="px-4 py-2 border border-slate-255 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitLoading ||
                    shipments.filter((s) => s.status === "PENDING").length === 0
                  }
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  Xác nhận xếp lên xe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CHI TIẾT ĐƠN HÀNG */}
      {isDetailModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl relative overflow-hidden">
            <div className="p-6 border-b border-slate-150 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Chi tiết vận đơn
                </h2>
                <span className="font-mono text-xs text-slate-450 font-bold block mt-1">
                  {selectedOrder.tracking_number}
                </span>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs font-semibold">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-450 uppercase block">
                    Trạng thái
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border ${getStatusStyle(selectedOrder.current_status)}`}
                  >
                    {getStatusLabel(selectedOrder.current_status)}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-450 uppercase block">
                    COD
                  </span>
                  <span className="text-slate-800 font-bold block">
                    {selectedOrder.cod_amount?.toLocaleString()} đ (
                    {selectedOrder.cod_status})
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-150 pt-3 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-450 uppercase block">
                    Người gửi
                  </span>
                  <span className="text-slate-800 block">
                    {selectedOrder.sender_name}
                  </span>
                  <span className="text-slate-400 block">
                    {selectedOrder.sender_phone}
                  </span>
                  <span className="text-slate-550 block">
                    {selectedOrder.sender_address}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-450 uppercase block">
                    Người nhận
                  </span>
                  <span className="text-slate-800 block">
                    {selectedOrder.receiver_name}
                  </span>
                  <span className="text-slate-400 block">
                    {selectedOrder.receiver_phone}
                  </span>
                  <span className="text-slate-550 block">
                    {selectedOrder.receiver_address}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-150 pt-3 space-y-1">
                <span className="text-[10px] text-slate-450 uppercase block">
                  Bưu cục lấy hàng
                </span>
                <span className="text-slate-800 block">
                  {selectedOrder.pickup_hub?.name}
                </span>
              </div>

              {selectedOrder.shipment && (
                <div className="border-t border-slate-150 pt-3 space-y-1">
                  <span className="text-[10px] text-slate-450 uppercase block">
                    Chuyến xe / Gom nhóm
                  </span>
                  <span className="text-blue-750 block flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-blue-500" />
                    {selectedOrder.shipment.vehicle_number} (ID:{" "}
                    {selectedOrder.shipment.id})
                  </span>
                </div>
              )}

              {selectedOrder.note && (
                <div className="border-t border-slate-150 pt-3 space-y-1">
                  <span className="text-[10px] text-slate-450 uppercase block">
                    Ghi chú & Nhật ký
                  </span>
                  <span className="text-slate-700 block bg-slate-50 p-2.5 rounded-lg">
                    {selectedOrder.note}
                  </span>
                </div>
              )}

              {selectedOrder.delivery_image_url && (
                <div className="border-t border-slate-150 pt-3 space-y-1">
                  <span className="text-[10px] text-slate-450 uppercase block">
                    Ảnh sự cố / Ảnh giao hàng
                  </span>
                  <a
                    href={selectedOrder.delivery_image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline block mt-1"
                  >
                    Xem ảnh chụp chất lượng cao
                  </a>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-150 bg-slate-50/50 flex justify-end gap-3">
              <button
                onClick={() => handlePrintLabel(selectedOrder.id)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl cursor-pointer flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                In nhãn
              </button>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl cursor-pointer"
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
