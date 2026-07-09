"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import {
  MapPin as MapPinIcon,
  Package,
  Navigation,
  CheckCircle,
} from "lucide-react";
import api from "@/lib/axios";

// Dynamically import Leaflet map component to prevent SSR errors
const TmsMap = dynamic(() => import("@/components/tms/TmsMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-slate-100 rounded-xl border border-slate-200">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Đang tải bản đồ...</p>
      </div>
    </div>
  ),
});

interface Order {
  id: string;
  status: string;
  customer: string;
  address: string;
  lat: number;
  lng: number;
  delivery_sequence: number | null;
}

interface VirtualShipment {
  shipperId?: string;
  orders: {
    tracking_number: string;
    customer_name: string;
    recipient_address: string;
    latitude: number;
    longitude: number;
    delivery_sequence: number;
  }[];
}

interface Hub {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface Shipper {
  id: string;
  name: string;
  status: string;
  lat: number;
  lng: number;
}

export default function TMSDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [virtualPlan, setVirtualPlan] = useState<VirtualShipment[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, hubsRes, usersRes] = await Promise.all([
          api.get("/orders"),
          api.get("/hubs"),
          api.get("/users"),
        ]);

        const ordersList = ordersRes.data?.data || ordersRes.data || [];
        const mappedOrders = ordersList.map(
          (o: {
            id: string;
            tracking_number: string;
            current_status: string;
            receiver_address: string;
            weight: number;
            volume: number;
            latitude: number;
            longitude: number;
            [key: string]: unknown;
          }) => ({
            id: o.tracking_number,
            status: o.current_status,
            customer: o.receiver_name,
            address: o.receiver_address,
            lat: 21.0285 + (Math.random() - 0.5) * 0.1, // Fallback if no geocode
            lng: 105.8542 + (Math.random() - 0.5) * 0.1, // Fallback if no geocode
            delivery_sequence: null,
          }),
        );
        setOrders(mappedOrders);

        const hubsList = hubsRes.data?.data || hubsRes.data || [];
        setHubs(
          hubsList.map(
            (h: {
              id: string;
              name: string;
              latitude: number;
              longitude: number;
              [key: string]: unknown;
            }) => ({
              id: h.id,
              name: h.name,
              lat: 21.0335 + (Math.random() - 0.5) * 0.1,
              lng: 105.7952 + (Math.random() - 0.5) * 0.1,
            }),
          ),
        );

        const usersList = usersRes.data?.data || usersRes.data || [];
        const shippersList = usersList.filter(
          (u: {
            id: string;
            full_name: string;
            phone_number: string;
            current_latitude: number;
            current_longitude: number;
            is_online: boolean;
            role: string;
            [key: string]: unknown;
          }) => u.role === "SHIPPER" && u.is_online,
        );
        setShippers(
          shippersList.map(
            (s: {
              id: string;
              full_name: string;
              phone_number: string;
              current_latitude: number;
              current_longitude: number;
              is_online: boolean;
              [key: string]: unknown;
            }) => ({
              id: s.id,
              name: s.full_name,
              status: s.is_online ? "ACTIVE" : "INACTIVE",
              lat: 21.03 + (Math.random() - 0.5) * 0.1,
              lng: 105.8 + (Math.random() - 0.5) * 0.1,
            }),
          ),
        );
      } catch (err) {
        console.error("Failed to fetch TMS data", err);
      }
    };
    fetchData();
  }, []);

  const handleAutoDispatch = async () => {
    setIsLoading(true);
    try {
      const res = await api.post("/tms/auto-dispatch");
      const { virtualShipments } = res.data;
      if (virtualShipments && virtualShipments.length > 0) {
        setVirtualPlan(virtualShipments);

        // Update orders list to show the virtual sequence
        const newOrders: Order[] = [];
        virtualShipments.forEach((vs: VirtualShipment) => {
          vs.orders.forEach((vo) => {
            newOrders.push({
              id: vo.tracking_number,
              status: "VIRTUAL",
              customer: vo.customer_name,
              address: vo.recipient_address,
              lat: vo.latitude,
              lng: vo.longitude,
              delivery_sequence: vo.delivery_sequence,
            });
          });
        });
        setOrders(newOrders);
      } else {
        alert(res.data.message || "Không có gợi ý điều phối");
      }
    } catch (error: unknown) {
      console.error("Auto dispatch failed", error);
      alert("Lỗi khi điều phối ảo!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDispatch = async () => {
    if (virtualPlan.length === 0) return;
    setIsConfirming(true);
    try {
      await api.post("/tms/confirm-dispatch", {
        virtualShipments: virtualPlan,
      });
      alert("Xác nhận điều phối thành công!");
      setVirtualPlan([]);
      // fetch real orders again here...
      setOrders(orders.map((o) => ({ ...o, status: "DISPATCHED" })));
    } catch (error: unknown) {
      console.error("Confirm dispatch failed", error);
      alert("Lỗi khi xác nhận điều phối!");
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Transportation Management System
          </h1>
          <p className="text-slate-500 mt-1">
            Điều phối và theo dõi tuyến đường vận chuyển
          </p>
        </div>
        <div className="flex gap-3">
          {virtualPlan.length > 0 && (
            <button
              onClick={handleConfirmDispatch}
              disabled={isConfirming}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isConfirming ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
              <span>Xác nhận Điều phối</span>
            </button>
          )}
          <button
            onClick={handleAutoDispatch}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Navigation className="w-5 h-5" />
            )}
            <span>Auto Dispatch (Gợi ý)</span>
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Left Panel - Orders List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col overflow-hidden">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-indigo-500" />
            Đơn hàng cần điều phối
          </h2>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {orders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:border-blue-200 hover:bg-blue-50/50 transition-colors group cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold text-slate-800">
                    {order.id}
                  </span>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      order.status === "DISPATCHED"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-2">{order.customer}</p>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPinIcon className="w-3.5 h-3.5" />
                  <span className="truncate">{order.address}</span>
                </div>
                {order.delivery_sequence && (
                  <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                      {order.delivery_sequence}
                    </div>
                    <span className="text-xs font-medium text-indigo-600">
                      Thứ tự giao hàng
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Map */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
          <TmsMap orders={orders} hubs={hubs} shippers={shippers} />
        </div>
      </div>
    </div>
  );
}
