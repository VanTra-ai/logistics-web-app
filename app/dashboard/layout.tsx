"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Truck,
  Building2,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  User,
  Users,
  ScanLine,
  AlertCircle,
  MapPin,
  ClipboardList,
  AlertTriangle,
  Wallet,
  DollarSign,
} from "lucide-react";
import api from "@/lib/axios";
import { io } from "socket.io-client";

interface LoggedInUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  hub?: { id: string; name: string } | null;
}

interface NotificationItem {
  id?: string;
  title?: string;
  message?: string;
  type?: string;
  isRead?: boolean;
  createdAt?: string;
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

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [toastNotif, setToastNotif] = useState<string | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const getSidebarLinks = () => {
    if (!user) return [];

    const role = user.role?.toUpperCase() || "";

    // 1. ADMIN — Quản trị tổng hệ thống
    if (role === "ADMIN") {
      return [
        { name: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
        { name: "Quản lý Đơn hàng", href: "/dashboard/orders", icon: Package },
        { name: "Hệ thống Bưu cục", href: "/dashboard/hubs", icon: Building2 },
        { name: "Quản lý Nhân sự", href: "/dashboard/users", icon: Users },
        {
          name: "Quản lý Sự cố",
          href: "/dashboard/incidents",
          icon: AlertTriangle,
        },
        {
          name: "Khiếu nại (Tickets)",
          href: "/dashboard/tickets",
          icon: AlertCircle,
        },
        {
          name: "Ví / Đối soát",
          href: "/dashboard/finance/wallets",
          icon: Wallet,
        },
        {
          name: "Tài chính & Biểu phí",
          href: "/dashboard/finance",
          icon: DollarSign,
        },
        {
          name: "Nhật ký hệ thống",
          href: "/dashboard/audit-logs",
          icon: ClipboardList,
        },
      ];
    }

    // 2. HUB_COORDINATOR — Điều phối viên bưu cục
    if (role === "HUB_COORDINATOR") {
      return [
        {
          name: "Tổng quan Bưu cục",
          href: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          name: "Quản lý Đơn hàng",
          href: "/dashboard/orders",
          icon: Package,
        },
        { name: "Trạm xử lý đơn", href: "/dashboard/station", icon: ScanLine },
        {
          name: "Điều phối Chuyến xe",
          href: "/dashboard/dispatch",
          icon: Truck,
        },
        { name: "TMS Dashboard", href: "/dashboard/tms", icon: MapPin },
        {
          name: "Quản lý Sự cố",
          href: "/dashboard/incidents",
          icon: AlertTriangle,
        },
        {
          name: "Khiếu nại (Tickets)",
          href: "/dashboard/tickets",
          icon: AlertCircle,
        },
        {
          name: "Sự cố & Ngoại lệ",
          href: "/dashboard/exceptions",
          icon: AlertCircle,
        },
        {
          name: "Vị trí Kệ hàng",
          href: "/dashboard/locations",
          icon: MapPin,
        },
        { name: "Kiểm kê Kho", href: "/dashboard/audits", icon: ClipboardList },
      ];
    }

    // 3. SHIPPER — Tài xế giao hàng
    if (role === "SHIPPER") {
      return [
        { name: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
        {
          name: "Đơn hàng của tôi",
          href: "/dashboard/orders",
          icon: Package,
        },
        {
          name: "Ví của tôi",
          href: "/dashboard/finance/wallets",
          icon: Wallet,
        },
      ];
    }

    // 4. CUSTOMER — Chủ shop / Khách hàng gửi hàng
    if (role === "CUSTOMER") {
      return [
        {
          name: "Bảng điều khiển",
          href: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          name: "Quản lý Đơn hàng",
          href: "/dashboard/orders",
          icon: Package,
        },
        {
          name: "Hỗ trợ & Khiếu nại",
          href: "/dashboard/tickets",
          icon: AlertCircle,
        },
      ];
    }

    // Fallback: hiển thị tối thiểu cho các role chưa xác định
    return [{ name: "Tổng quan", href: "/dashboard", icon: LayoutDashboard }];
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

          // Verify actual role from backend to prevent role spoofing
          api
            .get("/users/profile")
            .then((res) => {
              const serverUser = res.data?.data || res.data;
              if (savedUser) {
                try {
                  const localUser = JSON.parse(savedUser);
                  if (localUser.role !== serverUser.role) {
                    console.warn("Role mismatch detected! Force logout.");
                    throw new Error("Role mismatch");
                  }
                  // Update user state with fresh data
                  setUser(serverUser);
                  localStorage.setItem("user", JSON.stringify(serverUser));
                } catch {
                  // Ignore
                }
              }
            })
            .catch(() => {
              // Token invalid or role spoofed
              localStorage.removeItem("token");
              localStorage.removeItem("refresh_token");
              localStorage.removeItem("user");
              router.push("/");
            });
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    if (!user) return;
    let isSubscribed = true;

    // Fetch initial notifications
    const fetchNotifications = async () => {
      try {
        const res = await api.get("/notifications");
        if (isSubscribed && res.data?.data) {
          const fetchedNotifs = res.data.data;
          setNotifications(fetchedNotifs);
          setUnreadCount(
            fetchedNotifs.filter((n: NotificationItem) => !n.isRead).length,
          );
        }
      } catch (error) {
        console.error("Lỗi lấy danh sách thông báo:", error);
      }
    };
    fetchNotifications();

    const token = localStorage.getItem("token");
    const socket = io(
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333",
      {
        auth: {
          token: token,
        },
        transports: ["websocket"],
      },
    );

    socket.on("new_notification", (data: NotificationItem) => {
      setNotifications((prev) => [data, ...prev]);
      setUnreadCount((prev) => prev + 1);
      setToastNotif(data.message || "Bạn có thông báo mới");
      setTimeout(() => setToastNotif(null), 3000);
    });

    return () => {
      isSubscribed = false;
      socket.disconnect();
    };
  }, [user]);

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
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 z-[100] shadow-sm relative">
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

          <div className="flex items-center gap-4 relative">
            <button
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors relative cursor-pointer"
              onClick={async () => {
                setShowNotifDropdown(!showNotifDropdown);
                if (unreadCount > 0) {
                  setUnreadCount(0);
                  try {
                    await api.patch("/notifications/mark-all-read");
                    setNotifications((prev) =>
                      prev.map((n) => ({ ...n, isRead: true })),
                    );
                  } catch (e) {
                    console.error("Failed to mark notifications as read", e);
                  }
                }
              }}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[1.25rem] h-5 px-1 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifDropdown && (
              <div className="absolute top-full right-14 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
                <div className="p-3 border-b border-slate-100 bg-slate-50 font-semibold text-slate-700 flex justify-between items-center">
                  Thông báo
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">
                      Không có thông báo mới
                    </div>
                  ) : (
                    notifications.map((n, i) => (
                      <div
                        key={i}
                        className="p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                      >
                        <p className="text-sm text-slate-800">
                          {n.message || "Thông báo mới"}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date().toLocaleTimeString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="h-8 w-px bg-slate-200 mx-2"></div>

            <div className="relative">
              <div
                className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 pr-3 rounded-full transition-colors"
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm select-none shadow-sm">
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

              {/* Profile Dropdown */}
              {showProfileDropdown && (
                <div className="absolute top-full mt-2 right-0 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-fadeIn origin-top-right">
                  <div className="px-4 py-3 border-b border-slate-100 md:hidden">
                    <p className="text-sm font-semibold text-slate-700 truncate">
                      {user?.full_name || "Thành viên"}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {user?.email || ""}
                    </p>
                  </div>

                  <Link
                    href="/dashboard/profile"
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-slate-700 transition-colors"
                    onClick={() => setShowProfileDropdown(false)}
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium">Hồ sơ cá nhân</span>
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-slate-700 transition-colors"
                    onClick={() => setShowProfileDropdown(false)}
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium">
                      Cài đặt hệ thống
                    </span>
                  </Link>
                  <div className="h-px bg-slate-100 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 text-red-600 transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-medium">Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {toastNotif && (
          <div className="fixed top-20 right-6 z-50 bg-blue-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 transition-all duration-300 transform translate-y-0 opacity-100">
            <Bell className="w-4 h-4" />
            <span className="text-sm font-medium">{toastNotif}</span>
            <button
              onClick={() => setToastNotif(null)}
              className="ml-2 hover:bg-blue-700 p-1 rounded-full"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

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
