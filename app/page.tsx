"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  LogIn,
  Truck,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Cpu,
} from "lucide-react";
import axios from "axios";
import api from "@/lib/axios";
import ForgotPasswordModal from "@/components/ForgotPasswordModal";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      const token =
        response.data?.access_token ||
        response.data?.token ||
        response.data?.data?.access_token;

      const refreshToken = response.data?.refresh_token;
      const user = response.data?.user;

      if (token) {
        // Lưu trữ thông tin đăng nhập vào localStorage
        localStorage.setItem("token", token);
        if (refreshToken) {
          localStorage.setItem("refresh_token", refreshToken);
        }
        if (user) {
          localStorage.setItem("user", JSON.stringify(user));
        }

        // Chuyển hướng nhanh đến Dashboard
        router.push("/dashboard");
        router.refresh();
      } else {
        setErrorMessage(
          "Không tìm thấy Access Token trong dữ liệu phản hồi từ máy chủ.",
        );
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(
          error.response?.data?.message || "Sai tài khoản hoặc mật khẩu!",
        );
      } else {
        setErrorMessage(
          "Lỗi kết nối hệ thống. Vui lòng kiểm tra lại kết nối mạng!",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] flex items-center justify-center font-sans overflow-hidden relative">
      {/* Background Neon Glowing Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-950/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full min-h-screen flex lg:flex-row flex-col">
        {/* Left Side: Brand Visual Section (Desktop only) */}
        <div className="hidden lg:flex lg:w-7/12 relative flex-col justify-between p-12 overflow-hidden border-r border-slate-800/40">
          {/* Background Image with Overlay */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-10000 hover:scale-105"
            style={{ backgroundImage: `url('/logistics_hero.png')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-[#070A12] via-[#090D16]/90 to-[#0A1A2E]/70" />

          {/* Logo/Header */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Truck className="text-slate-950 w-5 h-5 font-bold" />
            </div>
            <span className="text-xl font-bold text-white tracking-wider">
              WMS PRO
            </span>
            <span className="px-2 py-0.5 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 rounded-md">
              V2.6
            </span>
          </div>

          {/* Main Hero Slogan */}
          <div className="relative z-10 max-w-xl my-auto">
            <h1 className="text-4xl font-extrabold text-white leading-tight mb-6 bg-gradient-to-r from-white via-slate-100 to-blue-200 bg-clip-text text-transparent">
              Hệ thống Điều hành Kho bãi & Vận tải Toàn diện
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed mb-8">
              Quản lý luồng hàng hóa, tối ưu hóa chuyến xe, giám sát hiệu suất
              thời gian thực với giải pháp định tuyến thông minh.
            </p>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-800/60">
              <div>
                <p className="text-2xl font-bold text-emerald-400">99.8%</p>
                <p className="text-xs text-slate-500 mt-1">
                  Độ chính xác vị trí
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-400">30%</p>
                <p className="text-xs text-slate-500 mt-1">
                  Giảm chi phí vận hành
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-400">&lt; 15s</p>
                <p className="text-xs text-slate-500 mt-1">
                  Thời gian xử lý đơn
                </p>
              </div>
            </div>
          </div>

          {/* Footer branding */}
          <div className="relative z-10 flex items-center justify-between text-xs text-slate-500">
            <span>
              © 2026 VanTra-ai Logistics Systems. All rights reserved.
            </span>
            <div className="flex gap-4">
              <span className="hover:text-slate-400 cursor-pointer transition-colors">
                Điều khoản
              </span>
              <span className="hover:text-slate-400 cursor-pointer transition-colors">
                Bảo mật
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Glassmorphism Login Form */}
        <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 lg:px-16 z-10">
          <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-8 shadow-2xl shadow-black/40 relative overflow-hidden">
            {/* Form Glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="text-center mb-8">
              <div className="lg:hidden mx-auto w-12 h-12 bg-gradient-to-br from-blue-600 to-emerald-400 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/10">
                <Truck className="text-slate-950 w-6 h-6" />
              </div>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                Hệ thống WMS Pro
              </h2>
              <p className="text-slate-400 mt-2 text-sm">
                Đăng nhập tài khoản nội bộ để tiếp tục vận hành
              </p>
            </div>

            {errorMessage && (
              <div className="mb-6 p-4 bg-red-950/40 border border-red-500/20 text-red-200 rounded-2xl flex items-start gap-3 animate-shake">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs font-medium leading-relaxed">
                  {errorMessage}
                </p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Email / Tài khoản
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    type="email"
                    required
                    className="block w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all text-sm group-hover:border-slate-700 placeholder:text-slate-600"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Mật khẩu
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(true)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium cursor-pointer"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="block w-full pl-11 pr-12 py-3 bg-slate-950/80 border border-slate-800 text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all text-sm group-hover:border-slate-700 placeholder:text-slate-600"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    className="h-4 w-4 bg-slate-950 border-slate-800 text-blue-600 focus:ring-blue-500 rounded cursor-pointer"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-xs text-slate-400 cursor-pointer select-none"
                  >
                    Duy trì đăng nhập
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-semibold text-slate-950 bg-gradient-to-r from-blue-500 to-emerald-400 hover:from-blue-600 hover:to-emerald-500 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-lg shadow-blue-500/10 cursor-pointer"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Đang xác thực hệ thống...</span>
                  </div>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2 stroke-[2.5]" />
                    Đăng nhập hệ thống
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-800/60 flex flex-col gap-3 text-center">
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Môi trường vận hành được bảo mật SSL 256-bit</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <Cpu className="w-4 h-4 text-blue-400" />
                <span>Server Node: API Core-3333</span>
              </div>
            </div>
          </div>

          <p className="mt-8 text-xs text-slate-600 text-center max-w-sm leading-relaxed">
            Hệ thống quản lý nội bộ dành riêng cho nhân sự của WMS Pro. Nghiêm
            cấm mọi hành vi truy cập và phát tán thông tin trái phép.
          </p>
        </div>
      </div>

      {/* Modal Quên Mật Khẩu */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        defaultEmail={email}
        onSuccessReset={(resetEmail) => {
          setEmail(resetEmail);
          setPassword("");
        }}
      />
    </div>
  );
}
