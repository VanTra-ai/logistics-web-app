"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { MapPin as MapPinIcon, Package, Navigation } from "lucide-react";

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
  const [orders, setOrders] = useState<Order[]>([
    {
      id: "ORD-001",
      status: "DISPATCHED",
      customer: "Nguyễn Văn A",
      address: "123 P. Lê Lợi",
      lat: 21.0285,
      lng: 105.8542,
      delivery_sequence: 1,
    },
    {
      id: "ORD-002",
      status: "DISPATCHED",
      customer: "Trần Thị B",
      address: "45 P. Hai Bà Trưng",
      lat: 21.0245,
      lng: 105.8492,
      delivery_sequence: 2,
    },
    {
      id: "ORD-003",
      status: "PENDING",
      customer: "Lê Văn C",
      address: "89 P. Quang Trung",
      lat: 21.0315,
      lng: 105.8422,
      delivery_sequence: null,
    },
  ]);
  const [hubs] = useState<Hub[]>([
    { id: "HUB-HN1", name: "Bưu cục Cầu Giấy", lat: 21.0335, lng: 105.7952 },
  ]);
  const [shippers] = useState<Shipper[]>([
    {
      id: "SHIP-01",
      name: "Phạm Văn D",
      status: "ACTIVE",
      lat: 21.03,
      lng: 105.8,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleAutoDispatch = async () => {
    setIsLoading(true);
    try {
      // POST /tms/auto-dispatch
      // await api.post('/tms/auto-dispatch');

      // Mocking successful dispatch
      setTimeout(() => {
        setOrders((prev) =>
          prev.map((o) => ({
            ...o,
            status: "DISPATCHED",
            delivery_sequence:
              o.delivery_sequence || Math.floor(Math.random() * 5) + 3,
          })),
        );
        setIsLoading(false);
      }, 1500);
    } catch (error) {
      console.error("Auto dispatch failed", error);
      setIsLoading(false);
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
          <span>Auto Dispatch</span>
        </button>
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
