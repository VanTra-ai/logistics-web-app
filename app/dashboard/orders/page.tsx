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
  ClipboardList,
  Check,
  Layers,
  Printer,
  Upload,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import api from "@/lib/axios";
import axios from "axios";
import BulkUploadModal from "@/components/BulkUploadModal";
import Pagination from "@/components/Pagination";
import ShipperOrdersDashboard from "./ShipperOrdersDashboard";
import AddressInput from "@/app/components/AddressInput";

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
  location?: {
    id: string;
    zone: string;
    aisle: string;
    shelf: string;
    bin: string;
    barcode: string;
  } | null;
  shipment?: {
    id: string;
    vehicle_number: string;
    shipment_code?: string | null;
    shipper?: {
      id: string;
      full_name: string;
      phone_number: string;
      vehicle_number?: string | null;
      vehicle_type?: string | null;
    } | null;
  } | null;
}

interface Shipment {
  id: string;
  shipment_code?: string | null;
  vehicle_number: string;
  vehicle_type?: string;
  status: string;
  type: string; // PICKUP | DELIVERY | RETURN
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

  // Lists
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [tariff, setTariff] = useState<{
    base_price_distance: number;
    base_distance_limit: number;
    block_price_distance: number;
    surplus_weight_price: number;
    volumetric_divisor: number;
    cod_fee_percent: number;
  } | null>(null);

  // Loading & Modes
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Search & Filter
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [orderHubFilter, setOrderHubFilter] = useState("ALL");

  // Import/Export States
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);
  const [excelImportFile, setExcelImportFile] = useState<File | null>(null);
  const [excelImportErrors, setExcelImportErrors] = useState<string[]>([]);
  const [exportDate, setExportDate] = useState<string>("");
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);

  // Modals
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null); // For detail or edit
  const [isOrderEditMode, setIsOrderEditMode] = useState(false);

  const [isAssignShipmentOpen, setIsAssignShipmentOpen] = useState(false);
  const [ordersToAssignIds, setOrdersToAssignIds] = useState<string[]>([]);
  const [assignShipmentId, setAssignShipmentId] = useState("");

  const [isAssignShipperModalOpen, setIsAssignShipperModalOpen] =
    useState(false);
  const [orderToAssignShipper, setOrderToAssignShipper] = useState("");
  const [selectedShipperId, setSelectedShipperId] = useState("");

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [trackingHistory, setTrackingHistory] = useState<
    {
      status: string;
      created_at: string;
      operator?: { full_name: string; role: string };
      note?: string;
      lat?: number;
      long?: number;
      image_url?: string;
    }[]
  >([]);

  useEffect(() => {
    if (isDetailModalOpen && selectedOrder?.id) {
      api
        .get(`/trackings/${selectedOrder.id}`)
        .then((res) => setTrackingHistory(res.data.data || []))
        .catch((err) => console.error("Lỗi tải lịch sử giao hàng:", err));
    }
  }, [isDetailModalOpen, selectedOrder]);

  // Putaway (Xếp kệ) modal states
  const [isPutawayModalOpen, setIsPutawayModalOpen] = useState(false);
  const [putawayOrderId, setPutawayOrderId] = useState("");
  const [putawayOrderTracking, setPutawayOrderTracking] = useState("");
  const [putawayOrderHubId, setPutawayOrderHubId] = useState("");
  const [putawayBarcode, setPutawayBarcode] = useState("");
  const [isPutawayLoading, setIsPutawayLoading] = useState(false);
  const [availableLocations, setAvailableLocations] = useState<
    {
      id: string;
      zone: string;
      aisle: string;
      shelf: string;
      bin: string;
      barcode: string;
      orders?: { id: string }[];
      max_capacity: number;
    }[]
  >([]);

  useEffect(() => {
    if (isPutawayModalOpen) {
      let url = "/locations?limit=500";
      if (putawayOrderHubId) {
        url += `&hubId=${putawayOrderHubId}`;
      }
      api
        .get(url)
        .then((res) => {
          let locs = res.data.data || [];
          locs = locs.filter((l: { status: string }) => l.status !== "FULL");
          locs.sort(
            (
              a: { orders?: { id: string }[] },
              b: { orders?: { id: string }[] },
            ) => {
              const countA = a.orders?.length || 0;
              const countB = b.orders?.length || 0;
              return countA - countB;
            },
          );
          setAvailableLocations(locs);
        })
        .catch((err) => console.error(err));
    }
  }, [isPutawayModalOpen, putawayOrderHubId]);

  // Form states - Order
  const [orderForm, setOrderForm] = useState({
    sender_name: "",
    sender_phone: "",
    sender_address: "",
    sender_province_code: "",
    sender_ward_code: "",
    sender_street: "",

    receiver_name: "",
    receiver_phone: "",
    receiver_address: "",
    receiver_province_code: "",
    receiver_ward_code: "",
    receiver_street: "",
    weight: 1,
    length: 0,
    width: 0,
    height: 0,
    cod_amount: 0,
    note: "",
    pickup_hub_id: "",
  });

  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  // Re-fetch tariff when pickup hub changes
  useEffect(() => {
    if (orderForm.pickup_hub_id) {
      api
        .get(`/finance/tariff?hub_id=${orderForm.pickup_hub_id}`)
        .then((res) => {
          const data = res.data?.data || res.data;
          if (data) setTariff(data);
        })
        .catch((err) => console.warn("Lỗi tải tariff của bưu cục", err));
    }
  }, [orderForm.pickup_hub_id]);

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

  const handleExcelImport = async () => {
    if (!excelImportFile) return;
    setIsSubmitLoading(true);
    setExcelImportErrors([]);
    try {
      const formData = new FormData();
      formData.append("file", excelImportFile);
      const res = await api.post("/orders/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setNotification({ type: "success", message: res.data.message });
      setIsExcelImportModalOpen(false);
      setExcelImportFile(null);
      await loadCoreData(currentPage);
    } catch (err: unknown) {
      const apiError = err as {
        response?: { data?: { message?: string; errors?: string[] } };
      };
      if (apiError.response?.data?.errors) {
        setExcelImportErrors(apiError.response.data.errors);
      } else {
        setNotification({
          type: "error",
          message:
            apiError.response?.data?.message || "Lỗi khi import file Excel",
        });
      }
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleExcelExport = async () => {
    try {
      setIsLoading(true);
      const query = exportDate ? `?date=${exportDate}` : "";
      const res = await api.get(`/exports/orders${query}`, {
        responseType: "blob",
      });
      const blobUrl = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `bao-cao-don-hang-${exportDate || "all"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      setNotification({
        type: "error",
        message: "Không thể xuất báo cáo lúc này.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load core data
  const loadCoreData = async (page = 1, showSpinner = false) => {
    if (!showSpinner) setIsLoading(true);
    setNotification(null);

    // Get current user from localStorage
    let currentHubId = "";
    let parsedUser: {
      role: string;
      hub?: { id: string; name: string } | null;
    } | null = null;
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        try {
          parsedUser = JSON.parse(savedUser);
          setCurrentUser(parsedUser);
          currentHubId = parsedUser?.hub?.id || "";
        } catch {
          // Do nothing
        }
      }
    }

    try {
      // 1. Fetch Hubs
      const hubsRes = await api.get("/hubs");
      const hubsList = hubsRes.data?.data || hubsRes.data || [];
      if (Array.isArray(hubsList)) {
        setHubs(hubsList.filter((h: { is_active?: boolean }) => h.is_active !== false));
      }

      // 2. Fetch Users to filter shippers (Only if not SHIPPER)
      if (parsedUser?.role !== "SHIPPER") {
        try {
          const usersRes = await api.get("/users");
          const usersList = usersRes.data?.data || usersRes.data || [];
          if (Array.isArray(usersList)) {
            const shipperUsers = usersList.filter(
              (u: { role: string }) => u.role === "SHIPPER",
            );
            setShippers(shipperUsers);
          }
        } catch {
          console.warn("Failed to fetch users");
        }
      }

      // 3. Fetch Orders
      let url = `/orders?page=${page}&limit=${itemsPerPage}`;
      if (orderStatusFilter && orderStatusFilter !== "ALL") {
        url += `&status=${orderStatusFilter}`;
      }
      if (orderHubFilter && orderHubFilter !== "ALL") {
        url += `&hubId=${orderHubFilter}`;
      }
      if (orderSearch) {
        url += `&search=${encodeURIComponent(orderSearch)}`;
      }
      const ordersRes = await api.get(url);
      const ordersList = ordersRes.data?.data || ordersRes.data || [];
      if (Array.isArray(ordersList)) setOrders(ordersList);

      const meta = ordersRes.data?.meta;
      if (meta) {
        setTotalPages(meta.totalPages);
        setTotalItems(meta.totalItems);
      }

      // 4. Fetch Shipments (only for ADMIN/HUB_COORDINATOR)
      if (parsedUser?.role !== "SHIPPER") {
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

        // 5. Fetch Tariff
        try {
          const tariffRes = await api.get("/finance/tariff");
          const tariffData = tariffRes.data?.data || tariffRes.data;
          if (tariffData) setTariff(tariffData);
        } catch {
          console.warn("Could not load tariff for estimate.");
        }
      }
    } catch (err) {
      console.warn("Lỗi kết nối API backend.", err);
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setNotification({
          type: "error",
          message: "Bạn không có quyền xem thông tin này",
        });
      }
      setHubs([]);
      setShippers([]);
      setOrders([]);
      setShipments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCoreData(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        loadCoreData(1);
      } else {
        setCurrentPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderStatusFilter, orderHubFilter, orderSearch]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (currentUser?.role === "SHIPPER") {
    return <ShipperOrdersDashboard />;
  }

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

    const formLength = Number(orderForm.length) || 0;
    const formWidth = Number(orderForm.width) || 0;
    const formHeight = Number(orderForm.height) || 0;
    const formDivisor = Number(tariff?.volumetric_divisor) || 5000;
    const formBulkWeight =
      formDivisor > 0 ? (formLength * formWidth * formHeight) / formDivisor : 0;
    const formRawWeight = Number(orderForm.weight) || 0;
    const formChargeableWeight = Math.max(formRawWeight, formBulkWeight);

    if (formChargeableWeight <= 0 || formChargeableWeight > 5000) {
      setNotification({
        type: "error",
        message:
          "Vui lòng nhập Cân nặng thực tế hoặc Kích thước (Dài x Rộng x Cao) hợp lệ!",
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

    const payload = {
      sender_name: orderForm.sender_name,
      sender_phone: orderForm.sender_phone,
      sender_address: orderForm.sender_address,
      sender_province_code: orderForm.sender_province_code,
      sender_ward_code: orderForm.sender_ward_code,
      sender_street: orderForm.sender_street,
      receiver_name: orderForm.receiver_name,
      receiver_phone: orderForm.receiver_phone,
      receiver_address: orderForm.receiver_address,
      receiver_province_code: orderForm.receiver_province_code,
      receiver_ward_code: orderForm.receiver_ward_code,
      receiver_street: orderForm.receiver_street,
      weight: Number(orderForm.weight),
      length: Number(orderForm.length),
      width: Number(orderForm.width),
      height: Number(orderForm.height),
      cod_amount: Number(orderForm.cod_amount),
      note: orderForm.note,
      pickup_hub_id: orderForm.pickup_hub_id,
    };

    try {
      if (isOrderEditMode && selectedOrder) {
        await api.patch(`/orders/${selectedOrder.id}`, payload);
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
      await loadCoreData(currentPage);
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
      sender_province_code: "",
      sender_ward_code: "",
      sender_street: "",
      receiver_name: "",
      receiver_phone: "",
      receiver_address: "",
      receiver_province_code: "",
      receiver_ward_code: "",
      receiver_street: "",
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
      sender_province_code: order.sender_province_code || "",
      sender_ward_code: order.sender_ward_code || "",
      sender_street: order.sender_street || "",
      receiver_name: order.receiver_name,
      receiver_phone: order.receiver_phone,
      receiver_address: order.receiver_address,
      receiver_province_code: order.receiver_province_code || "",
      receiver_ward_code: order.receiver_ward_code || "",
      receiver_street: order.receiver_street || "",
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

    try {
      await api.delete(`/orders/${orderId}`);
      setNotification({ type: "success", message: "Xóa đơn hàng thành công!" });
      await loadCoreData(currentPage);
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
    try {
      await api.post("/orders/scan-in", { tracking_numbers: [trackingNum] });
      setNotification({
        type: "success",
        message: `Đã nhập kho bưu cục vận đơn ${trackingNum}!`,
      });
      await loadCoreData(currentPage);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setNotification({
        type: "error",
        message: apiError.response?.data?.message || "Lỗi nhập kho!",
      });
    }
  };

  const handleQuickRetry = async (orderId: string) => {
    try {
      await api.patch(`/orders/${orderId}/retry`, {
        note: "Yêu cầu giao lại từ điều phối viên",
      });
      setNotification({
        type: "success",
        message: "Đã cập nhật lệnh giao lại thành công!",
      });
      await loadCoreData(currentPage);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setNotification({
        type: "error",
        message: apiError.response?.data?.message || "Lỗi giao lại!",
      });
    }
  };

  const handleQuickRts = async (orderId: string) => {
    try {
      await api.patch(`/orders/${orderId}/rts`, {
        reason: "Khách từ chối nhận hàng",
      });
      setNotification({
        type: "success",
        message: "Đã chốt hoàn trả đơn về cho người gửi!",
      });
      await loadCoreData(currentPage);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setNotification({
        type: "error",
        message: apiError.response?.data?.message || "Lỗi chuyển hoàn!",
      });
    }
  };

  const handleQuickRemit = async (orderId: string) => {
    try {
      await api.post("/orders/remit", { order_ids: [orderId] });
      setNotification({
        type: "success",
        message: "Đối soát nộp quỹ COD thành công!",
      });
      await loadCoreData(currentPage);
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

    try {
      await api.patch(`/shipments/${assignShipmentId}/orders`, {
        order_ids: ordersToAssignIds,
      });
      setNotification({
        type: "success",
        message: "Gom nhóm và xếp các đơn hàng lên xe thành công!",
      });
      await loadCoreData(currentPage);
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

  const handleAssignShipperSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderToAssignShipper || !selectedShipperId) return;
    setIsSubmitLoading(true);
    try {
      await api.patch(`/orders/${orderToAssignShipper}/assign`, {
        shipper_id: selectedShipperId,
      });
      setNotification({ type: "success", message: "Gán Shipper thành công!" });
      setIsAssignShipperModalOpen(false);
      await loadCoreData(currentPage);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setNotification({
        type: "error",
        message: apiError.response?.data?.message || "Lỗi khi gán Shipper.",
      });
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // Filter Logic (Now handled by backend)
  const filteredOrders = orders;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "AT_HUB":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "DELIVERING":
      case "IN_TRANSIT":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "DELIVERED":
      case "FINISHED":
        return "bg-emerald-50 text-emerald-700 border-emerald-250";
      case "FAILED":
      case "DAMAGED_DESTROYED":
        return "bg-red-50 text-red-700 border-red-205";
      case "RETURNING":
      case "RETURNED":
      case "RETURN_TO_SENDER":
        return "bg-orange-50 text-orange-700 border-orange-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Chờ lấy";
      case "ASSIGNED":
        return "Đã điều phối";
      case "PICKING":
        return "Đang đi lấy";
      case "PICKED":
        return "Đã lấy hàng";
      case "AT_HUB":
        return "Lưu kho bãi";
      case "IN_TRANSIT":
        return "Đã đóng bao/Lên tải";
      case "DELIVERING":
        return "Đang giao khách";
      case "DELIVERED":
      case "FINISHED":
        return "Giao thành công";
      case "FAILED":
        return "Sự cố/Giao thất bại";
      case "CANCELLED":
        return "Đã hủy đơn";
      case "RETURNING":
      case "RETURN_TO_SENDER":
        return "Chuyển hoàn";
      case "RETURNED":
        return "Đã trả hàng";
      case "DAMAGED_DESTROYED":
        return "Hàng hỏng / Đền bù";
      default:
        return status;
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

        {/* Actions */}
        <div className="flex items-center gap-3 self-end md:self-center">
          <button
            onClick={() => {
              setIsExcelImportModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-xl cursor-pointer transition-all border border-emerald-200"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Nhập Excel tạo đơn
          </button>

          <button
            onClick={() => {
              openCreateOrderModal();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Tạo đơn hàng mới
          </button>
        </div>
      </div>

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
              placeholder="Tìm mã vận đơn, người gửi, địa chỉ (Quận, Phường...)"
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
              <option value="PENDING">Chờ lấy</option>
              <option value="ASSIGNED">Đã điều phối</option>
              <option value="PICKING">Đang đi lấy</option>
              <option value="PICKED">Đã lấy hàng</option>
              <option value="AT_HUB">Lưu kho bãi</option>
              <option value="IN_TRANSIT">Đã đóng bao/Lên tải</option>
              <option value="DELIVERING">Đang giao khách</option>
              <option value="FINISHED">Giao thành công</option>
              <option value="FAILED">Sự cố/Giao thất bại</option>
              <option value="RETURNING">Chuyển hoàn</option>
              <option value="RETURNED">Đã trả hàng</option>
              <option value="CANCELLED">Đã hủy đơn</option>
            </select>

            {/* Hub filter (Hidden for Hub Coordinators) */}
            {currentUser?.role !== "HUB_COORDINATOR" && (
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
            )}
          </div>
        </div>

        {/* Export / Filters */}
        <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm mt-4">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="date"
              value={exportDate}
              onChange={(e) => setExportDate(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleExcelExport}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-slate-500" />
              Xuất Báo cáo
            </button>
          </div>
          <div className="flex-1"></div>
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
                Hãy thử nhập từ khóa tìm kiếm khác hoặc nhấn &quot;Tạo đơn hàng
                mới&quot;.
              </p>
            </div>
          ) : (
            <>
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
                        <td className="px-6 py-4">
                          <span className="font-mono font-bold text-slate-900 block">
                            {item.tracking_number}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-1">
                            {currentUser?.role === "ADMIN" ? (
                              <>
                                <MapPin className="w-3 h-3 text-blue-500" />
                                {item.pickup_hub?.name || "N/A"}
                              </>
                            ) : (
                              <>
                                <Layers className="w-3 h-3 text-blue-500" />
                                {item.location
                                  ? `Khu ${item.location.zone} - Kệ ${item.location.aisle}-${item.location.shelf}-${item.location.bin}`
                                  : "Chưa xếp kệ"}
                              </>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium block mt-1">
                            {new Date(item.created_at).toLocaleDateString(
                              "vi-VN",
                            )}
                          </span>
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
                          {currentUser && currentUser.role !== "SHIPPER" && (
                            <div className="flex items-center justify-end gap-1.5">
                              {item.current_status === "PENDING" && (
                                <>
                                  <button
                                    onClick={() => {
                                      setOrderToAssignShipper(item.id);
                                      setSelectedShipperId(
                                        shippers.length > 0
                                          ? shippers[0].id
                                          : "",
                                      );
                                      setIsAssignShipperModalOpen(true);
                                    }}
                                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold rounded text-[10px] cursor-pointer"
                                    title="Gán tài xế đi lấy hàng"
                                  >
                                    Gán Shipper đi lấy
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleQuickScanIn(item.tracking_number)
                                    }
                                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[10px] cursor-pointer"
                                    title="Quét nhập kho bưu cục bãi lấy hàng"
                                  >
                                    Nhập kho bãi
                                  </button>
                                </>
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
                                  {(currentUser?.role === "HUB_COORDINATOR" ||
                                    currentUser?.role === "ADMIN") && (
                                    <button
                                      onClick={() => {
                                        setPutawayOrderId(item.id);
                                        setPutawayOrderTracking(
                                          item.tracking_number,
                                        );
                                        setPutawayOrderHubId(
                                          item.pickup_hub?.id || "",
                                        );
                                        setPutawayBarcode("");
                                        setIsPutawayModalOpen(true);
                                      }}
                                      className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-bold rounded text-[10px] cursor-pointer flex items-center gap-1"
                                    >
                                      <MapPin className="w-3 h-3" />
                                      Xếp kệ
                                    </button>
                                  )}
                                </>
                              )}

                              {item.current_status === "FAILED" && (
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
                          )}

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
                              item.current_status === "AT_HUB") &&
                              !item.shipment && (
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
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      </div>

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
                  <AddressInput
                    label="Địa chỉ"
                    value={{
                      province_code: orderForm.sender_province_code,
                      ward_code: orderForm.sender_ward_code,
                      street: orderForm.sender_street,
                      full_address: orderForm.sender_address,
                    }}
                    onChange={(val) =>
                      setOrderForm({
                        ...orderForm,
                        sender_province_code: val.province_code || "",
                        sender_ward_code: val.ward_code || "",
                        sender_street: val.street || "",
                        sender_address: val.full_address || "",
                      })
                    }
                  />
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
                  <AddressInput
                    label="Địa chỉ"
                    value={{
                      province_code: orderForm.receiver_province_code,
                      ward_code: orderForm.receiver_ward_code,
                      street: orderForm.receiver_street,
                      full_address: orderForm.receiver_address,
                    }}
                    onChange={(val) =>
                      setOrderForm({
                        ...orderForm,
                        receiver_province_code: val.province_code || "",
                        receiver_ward_code: val.ward_code || "",
                        receiver_street: val.street || "",
                        receiver_address: val.full_address || "",
                      })
                    }
                  />
                </div>
              </div>

              {/* Package parameters */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    Cân nặng thực tế (kg){" "}
                    <span className="text-slate-400 font-normal">
                      (Tùy chọn)
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Tự động tính từ thể tích"
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-250 text-slate-800 text-xs rounded-lg outline-none focus:border-blue-500"
                    value={orderForm.weight || ""}
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
                    {currentUser?.role === "HUB_COORDINATOR" && (
                      <span className="ml-2 text-blue-500 font-normal">
                        (Tự động theo bưu cục của bạn)
                      </span>
                    )}
                  </label>
                  <select
                    required
                    disabled={currentUser?.role === "HUB_COORDINATOR"}
                    className={`block w-full px-3 py-2 bg-slate-50 border border-slate-250 text-slate-700 text-xs rounded-lg outline-none ${
                      currentUser?.role === "HUB_COORDINATOR"
                        ? "opacity-70 cursor-not-allowed bg-slate-100"
                        : ""
                    }`}
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

              {/* Fee Estimate & Volumetric Calculation Detail */}
              <div className="bg-blue-50/50 p-4 border border-blue-100 rounded-xl space-y-2">
                {(() => {
                  let fee = 0;
                  const length = Number(orderForm.length) || 0;
                  const width = Number(orderForm.width) || 0;
                  const height = Number(orderForm.height) || 0;
                  const divisor = Number(tariff?.volumetric_divisor) || 5000;
                  const bulkWeight =
                    divisor > 0 ? (length * width * height) / divisor : 0;
                  const rawWeight = Number(orderForm.weight) || 0;
                  const chargeableWeight = Math.max(rawWeight, bulkWeight);

                  if (tariff) {
                    const distance = 5;
                    const extraDistance = Math.max(
                      0,
                      distance - Number(tariff.base_distance_limit || 2),
                    );
                    const baseShippingPrice =
                      Number(tariff.base_price_distance || 0) +
                      extraDistance * Number(tariff.block_price_distance || 0);

                    const surplusPrice =
                      Number(tariff.surplus_weight_price) || 5000;
                    const weightFee =
                      baseShippingPrice +
                      Math.max(0, chargeableWeight - 2) * surplusPrice;

                    const codFeePercent = Number(tariff.cod_fee_percent) || 0;
                    const codFee =
                      ((Number(orderForm.cod_amount) || 0) * codFeePercent) /
                      100;

                    fee = weightFee + codFee;
                  }
                  return (
                    <>
                      <div className="flex flex-col sm:flex-row justify-between text-xs gap-1 border-b border-blue-100/60 pb-2">
                        <div className="text-slate-600 font-medium">
                          Quy đổi thể tích (D×R×C/{divisor}):{" "}
                          <span className="font-bold text-blue-800 font-mono">
                            {bulkWeight.toFixed(2)} kg
                          </span>
                        </div>
                        <div className="text-slate-600 font-medium">
                          Trọng lượng tính cước:{" "}
                          <span className="font-extrabold text-blue-900 font-mono bg-blue-100/80 px-1.5 py-0.5 rounded">
                            {chargeableWeight.toFixed(2)} kg
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm pt-1">
                        <span className="font-bold text-slate-700">
                          Phí vận chuyển & thu hộ dự kiến:
                        </span>
                        <span className="font-extrabold text-blue-700 text-base">
                          {fee > 0
                            ? new Intl.NumberFormat("vi-VN", {
                                style: "currency",
                                currency: "VND",
                              }).format(fee)
                            : "0 ₫"}
                        </span>
                      </div>
                    </>
                  );
                })()}
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

      {/* ASSIGN SHIPPER MODAL */}
      {isAssignShipperModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <User className="w-6 h-6 text-amber-500" />
                  Gán Shipper Đi Lấy Hàng
                </h2>
                <button
                  onClick={() => setIsAssignShipperModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleAssignShipperSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Chọn tài xế (Shipper)
                  </label>
                  <select
                    required
                    value={selectedShipperId}
                    onChange={(e) => setSelectedShipperId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium text-slate-700"
                  >
                    <option value="" disabled>
                      -- Vui lòng chọn Shipper --
                    </option>
                    {shippers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} ({s.phone_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAssignShipperModalOpen(false)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitLoading || !selectedShipperId}
                    className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {isSubmitLoading ? "Đang xử lý..." : "Xác nhận gán"}
                  </button>
                </div>
              </form>
            </div>
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

              {/* Thông tin Shipper khi đơn đã được gán vận chuyển */}
              {selectedOrder.shipment?.shipper &&
                ["ASSIGNED", "PICKING", "DELIVERING", "IN_TRANSIT"].includes(
                  selectedOrder.current_status,
                ) && (
                  <div className="border-t border-slate-150 pt-3 rounded-xl bg-blue-50/60 p-3 space-y-2">
                    <span className="text-[10px] text-blue-600 uppercase font-bold block flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Thông tin vận chuyển
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9px] text-slate-450 uppercase block">
                          Tên Shipper
                        </span>
                        <span className="text-slate-800 font-semibold block">
                          {selectedOrder.shipment.shipper.full_name}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-450 uppercase block">
                          Số điện thoại
                        </span>
                        <span className="text-slate-700 block">
                          {selectedOrder.shipment.shipper.phone_number}
                        </span>
                      </div>
                      {selectedOrder.shipment.shipper.vehicle_number && (
                        <div>
                          <span className="text-[9px] text-slate-450 uppercase block">
                            Biển số xe
                          </span>
                          <span className="font-mono text-slate-800 font-bold block">
                            {selectedOrder.shipment.shipper.vehicle_number}
                          </span>
                        </div>
                      )}
                      {selectedOrder.shipment.shipper.vehicle_type && (
                        <div>
                          <span className="text-[9px] text-slate-450 uppercase block">
                            Loại xe
                          </span>
                          <span className="text-slate-700 block">
                            {selectedOrder.shipment.shipper.vehicle_type ===
                            "BIKE"
                              ? "🛵 Xe máy"
                              : "🚚 Xe tải"}
                          </span>
                        </div>
                      )}
                    </div>
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

              {/* Lịch sử đơn hàng (Timeline) */}
              {trackingHistory.length > 0 && (
                <div className="border-t border-slate-150 pt-3">
                  <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block mb-4">
                    Nhật ký hành trình
                  </span>
                  <div className="relative pl-3 space-y-4 before:absolute before:inset-y-0 before:left-[17px] before:w-0.5 before:bg-slate-200">
                    {trackingHistory.map((history, idx) => {
                      const isFirst = idx === 0; // Most recent (since it's sorted DESC)
                      const isStatusFailed =
                        history.status === "FAILED" ||
                        history.status === "RETURN_TO_SENDER" ||
                        history.status === "CANCELLED";
                      const isStatusSuccess =
                        history.status === "FINISHED" ||
                        history.status === "DELIVERED";

                      let dotColor = "bg-slate-300 border-white";
                      if (isFirst) {
                        if (isStatusSuccess)
                          dotColor = "bg-emerald-500 border-emerald-100";
                        else if (isStatusFailed)
                          dotColor = "bg-red-500 border-red-100";
                        else dotColor = "bg-blue-500 border-blue-100";
                      } else {
                        if (isStatusSuccess)
                          dotColor = "bg-emerald-400 border-white";
                        else if (isStatusFailed)
                          dotColor = "bg-red-400 border-white";
                        else dotColor = "bg-blue-400 border-white";
                      }

                      return (
                        <div key={idx} className="relative pl-8">
                          {/* Timeline Dot */}
                          <div
                            className={`absolute left-[-2px] top-1 w-3.5 h-3.5 rounded-full border-2 ${dotColor} shadow-sm z-10`}
                          ></div>

                          {/* Content */}
                          <div className="flex flex-col gap-0.5">
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                {getStatusLabel(history.status)}
                              </span>
                              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {new Date(history.created_at).toLocaleString(
                                  "vi-VN",
                                )}
                              </span>
                            </div>

                            {/* Operator info */}
                            <span className="text-[10px] font-medium text-slate-500">
                              Thực hiện bởi:{" "}
                              {history.operator
                                ? `${history.operator.full_name} (${history.operator.role})`
                                : "Hệ thống"}
                            </span>

                            {history.note && (
                              <div className="mt-1.5 text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 leading-relaxed">
                                {history.note}
                              </div>
                            )}

                            {history.image_url && (
                              <a
                                href={history.image_url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-block text-[10px] text-blue-600 hover:underline"
                              >
                                📎 Xem ảnh đính kèm
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
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

      {/* PUTAWAY MODAL — X\u1ebfp k\u1ec7 h\u00e0ng */}
      {isPutawayModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-slate-200 shadow-2xl">
            <div className="p-5 border-b border-slate-150 flex justify-between items-center bg-teal-50/50">
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-teal-600" />
                  Xếp kệ hàng
                </h2>
                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  Đơn: {putawayOrderTracking}
                </p>
              </div>
              <button
                onClick={() => setIsPutawayModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Mã vạch vị trí kệ (Barcode)
                </label>
                <input
                  list="locations-list"
                  type="text"
                  autoFocus
                  placeholder="Ví dụ: LOC-A-01-1-A"
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 text-slate-800 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-sm font-mono"
                  value={putawayBarcode}
                  onChange={(e) =>
                    setPutawayBarcode(e.target.value.toUpperCase())
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && putawayBarcode.trim()) {
                      e.preventDefault();
                      (async () => {
                        setIsPutawayLoading(true);
                        try {
                          await api.patch(`/orders/${putawayOrderId}/putaway`, {
                            barcode: putawayBarcode.trim(),
                          });
                          setIsPutawayModalOpen(false);
                          setNotification({
                            type: "success",
                            message: `Đã xếp đơn ${putawayOrderTracking} vào vị trí ${putawayBarcode}!`,
                          });
                          await loadCoreData(currentPage);
                        } catch (err) {
                          if (axios.isAxiosError(err)) {
                            setNotification({
                              type: "error",
                              message:
                                err.response?.data?.message || "Lỗi xếp kệ!",
                            });
                          }
                          setIsPutawayModalOpen(false);
                        } finally {
                          setIsPutawayLoading(false);
                        }
                      })();
                    }
                  }}
                />
                <datalist id="locations-list">
                  {availableLocations.map((loc) => {
                    const currentOrders = loc.orders?.length || 0;
                    return (
                      <option key={loc.id} value={loc.barcode}>
                        {`Khu ${loc.zone} - Kệ ${loc.aisle}-${loc.shelf}-${loc.bin} (${currentOrders}/${loc.max_capacity})`}
                      </option>
                    );
                  })}
                </datalist>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Nhập mã barcode của kệ (hoặc chọn từ danh sách trống) và nhấn
                  Enter để xác nhận
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsPutawayModalOpen(false)}
                  className="px-4 py-2 border border-slate-255 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  disabled={!putawayBarcode.trim() || isPutawayLoading}
                  onClick={async () => {
                    setIsPutawayLoading(true);
                    try {
                      await api.patch(`/orders/${putawayOrderId}/putaway`, {
                        barcode: putawayBarcode.trim(),
                      });
                      setIsPutawayModalOpen(false);
                      setNotification({
                        type: "success",
                        message: `Đã xếp đơn ${putawayOrderTracking} vào vị trí ${putawayBarcode}!`,
                      });
                      await loadCoreData(currentPage);
                    } catch (err) {
                      if (axios.isAxiosError(err)) {
                        setNotification({
                          type: "error",
                          message: err.response?.data?.message || "Lỗi xếp kệ!",
                        });
                      }
                      setIsPutawayModalOpen(false);
                    } finally {
                      setIsPutawayLoading(false);
                    }
                  }}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {isPutawayLoading ? "Đang xếp..." : "Xác nhận Xếp kệ"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {isExcelImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slideUp">
            <div className="p-5 border-b border-slate-150 bg-slate-50/50 flex items-center justify-between">
              <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                Nhập Đơn hàng từ Excel
              </h2>
              <button
                onClick={() => {
                  setIsExcelImportModalOpen(false);
                  setExcelImportFile(null);
                  setExcelImportErrors([]);
                }}
                className="p-1 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50">
                <input
                  type="file"
                  accept=".xlsx"
                  id="excel-file"
                  className="hidden"
                  onChange={(e) =>
                    setExcelImportFile(e.target.files?.[0] || null)
                  }
                />
                <label
                  htmlFor="excel-file"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="w-8 h-8 text-slate-400" />
                  <span className="text-sm font-semibold text-blue-600">
                    {excelImportFile
                      ? excelImportFile.name
                      : "Chọn file Excel (.xlsx)"}
                  </span>
                  <span className="text-xs text-slate-500">
                    Hỗ trợ các file chuẩn mẫu với định dạng đuôi .xlsx
                  </span>
                </label>
              </div>

              {excelImportErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-h-48 overflow-y-auto">
                  <h3 className="text-red-800 text-sm font-bold flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    Lỗi xác thực dữ liệu (File đã bị Rollback)
                  </h3>
                  <ul className="text-xs text-red-700 space-y-1 list-disc pl-4">
                    {excelImportErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-150 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsExcelImportModalOpen(false);
                  setExcelImportFile(null);
                  setExcelImportErrors([]);
                }}
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleExcelImport}
                disabled={!excelImportFile || isSubmitLoading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl cursor-pointer flex items-center gap-2"
              >
                {isSubmitLoading ? (
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Xác nhận Import
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={isBulkUploadModalOpen}
        onClose={() => setIsBulkUploadModalOpen(false)}
        onSuccess={() => {
          loadCoreData(currentPage);
        }}
      />
    </div>
  );
}
