"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Truck,
  Building2,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  Users,
  ScanLine,
  AlertCircle,
  Coins,
} from "lucide-react";
import api from "@/lib/axios";

interface LoggedInUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  hub?: { id: string; name: string } | null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const getSidebarLinks = () => {
    if (!user) return [];
    if (user.role === "HUB_COORDINATOR") {
      return [
        {
          name: "Tổng quan Bưu cục",
          href: "/dashboard",
          icon: LayoutDashboard,
        },
        { name: "Trạm xử lý đơn", href: "/dashboard/station", icon: ScanLine },
        { name: "Quét Camera", href: "/dashboard/scan", icon: ScanLine },
        {
          name: "Điều phối Chuyến xe",
          href: "/dashboard/dispatch",
          icon: Truck,
        },
        {
          name: "Sự cố & Ngoại lệ",
          href: "/dashboard/exceptions",
          icon: AlertCircle,
        },
        { name: "Cài đặt", href: "/dashboard/settings", icon: Settings },
      ];
    }
    return [
      { name: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
      { name: "Quản lý Đơn hàng", href: "/dashboard/orders", icon: Package },
      { name: "Hệ thống Bưu cục", href: "/dashboard/hubs", icon: Building2 },
      { name: "Quản lý Nhân sự", href: "/dashboard/users", icon: Users },
      { name: "Quản lý Tài chính", href: "/dashboard/finance", icon: Coins },
      { name: "Báo cáo & SLA", href: "/dashboard/statistics", icon: BarChart3 },
      { name: "Cài đặt", href: "/dashboard/settings", icon: Settings },
    ];
  };

  const activeLinks = getSidebarLinks();

  useEffect(() => {
    // Kiểm tra tính hợp lệ của token
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        const savedUser = localStorage.getItem("user");

        if (!token) {
          // Nếu không có token, chuyển hướng về Login
          router.push("/");
        } else {
          setIsAuthorized(true);
          if (savedUser) {
            try {
              setUser(JSON.parse(savedUser));
            } catch (e) {
              console.error("Lỗi parse user từ localStorage:", e);
            }
          }
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [router]);

  const handleLogout = async () => {
    try {
      // Gọi API đăng xuất ở Backend để thu hồi Refresh Token
      await api.post("/auth/logout");
    } catch (e) {
      console.error("Lỗi khi gọi API đăng xuất ở backend:", e);
    } finally {
      // Dọn dẹp localStorage và đưa về Login trong mọi trường hợp
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      router.push("/");
      router.refresh();
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "US";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    const first = parts[0].charAt(0);
    const last = parts[parts.length - 1].charAt(0);
    return (first + last).toUpperCase();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "Quản trị viên";
      case "SHIPPER":
        return "Shipper";
      case "HUB_COORDINATOR":
        return "Điều phối viên";
      default:
        return "Thành viên";
    }
  };

  // Nếu chưa xác thực xong quyền truy cập, hiển thị màn hình tải tối giản
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#090D16] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-medium">
            Đang bảo mật kết nối...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 1. Sidebar (Menu bên trái) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Truck className="w-6 h-6 text-blue-500" />
            <span>WMS Pro</span>
          </div>
          {/* Nút đóng sidebar trên Mobile */}
          <button
            className="md:hidden text-slate-400 hover:text-white cursor-pointer"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {activeLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                    : "hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${isActive ? "text-white" : "text-slate-400"}`}
                />
                <span className="font-medium text-sm">{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Nút đăng xuất ở đáy Sidebar */}
        <div className="absolute bottom-0 w-full p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer text-left"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Content (Nội dung chính bên phải) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header trên cùng */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            {/* Nút mở sidebar trên Mobile */}
            <button
              className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-slate-800 hidden sm:block">
              Bảng điều khiển
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors relative cursor-pointer">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            <div className="h-8 w-px bg-slate-200 mx-2"></div>

            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm select-none">
                {getInitials(user?.full_name || "")}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-semibold text-slate-700 leading-tight">
                  {user?.full_name || "Thành viên"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {getRoleLabel(user?.role || "")}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Khu vực render nội dung các trang con (Orders, Hubs,...) */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Overlay mờ khi mở Sidebar trên Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}
