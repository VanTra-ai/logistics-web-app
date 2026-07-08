"use client";

import { useState, useEffect } from "react";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

const hubIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const shipperIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
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

interface TmsMapProps {
  orders: Order[];
  hubs: Hub[];
  shippers: Shipper[];
}

export default function TmsMap({ orders, hubs, shippers }: TmsMapProps) {
  // Center map around Hanoi
  const defaultCenter: [number, number] = [21.0285, 105.8542];

  // Sort orders by delivery sequence to draw polyline
  const sequencedOrders = [...orders]
    .filter((o) => o.delivery_sequence !== null && o.status === "DISPATCHED")
    .sort((a, b) => a.delivery_sequence! - b.delivery_sequence!);

  const routeCoordinates = sequencedOrders.map(
    (o) => [o.lat, o.lng] as [number, number],
  );

  const [mapId, setMapId] = useState<string>("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMapId(`map-${Date.now()}-${Math.random()}`);
  }, []);

  if (!mapId) return null;

  return (
    <div className="w-full h-full min-h-[500px] z-0 rounded-xl overflow-hidden">
      <MapContainer
        key={mapId}
        center={defaultCenter}
        zoom={13}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Hubs */}
        {hubs.map((hub) => (
          <Marker key={hub.id} position={[hub.lat, hub.lng]} icon={hubIcon}>
            <Popup>
              <div className="font-semibold text-slate-800">{hub.name}</div>
              <div className="text-xs text-slate-500">Hub / Bưu cục</div>
            </Popup>
          </Marker>
        ))}

        {/* Shippers */}
        {shippers.map((shipper) => (
          <Marker
            key={shipper.id}
            position={[shipper.lat, shipper.lng]}
            icon={shipperIcon}
          >
            <Popup>
              <div className="font-semibold text-slate-800">{shipper.name}</div>
              <div className="text-xs text-slate-500">
                Trạng thái: {shipper.status}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Orders */}
        {orders.map((order) => (
          <Marker
            key={order.id}
            position={[order.lat, order.lng]}
            icon={defaultIcon}
          >
            <Popup>
              <div className="font-semibold text-slate-800">{order.id}</div>
              <div className="text-sm">{order.customer}</div>
              <div className="text-xs text-slate-500">{order.address}</div>
              {order.delivery_sequence && (
                <div className="mt-1 inline-block px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-md font-medium">
                  Sequence: {order.delivery_sequence}
                </div>
              )}
            </Popup>
          </Marker>
        ))}

        {/* Route Polyline */}
        {routeCoordinates.length > 1 && (
          <Polyline
            positions={routeCoordinates}
            pathOptions={{
              color: "#6366f1",
              weight: 4,
              dashArray: "8, 8",
              lineJoin: "round",
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
