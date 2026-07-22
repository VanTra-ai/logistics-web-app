"use client";

import { useState, useEffect } from "react";
import {
  X,
  Mail,
  KeyRound,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import api from "@/lib/axios";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
  onSuccessReset?: (email: string) => void;
}

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  defaultEmail = "",
  onSuccessReset,
}: ForgotPasswordModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState(defaultEmail);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => {
        setEmail(defaultEmail);
        setStep(1);
        setOtp(["", "", "", "", "", ""]);
        setNewPassword("");
        setConfirmPassword("");
        setErrorMessage("");
        setSuccessMessage("");
      }, 0);
      return () => clearTimeout(t);
    }
  }, [isOpen, defaultEmail]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  if (!isOpen) return null;

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email) {
      setErrorMessage("Vui lòng nhập địa chỉ Email!");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await api.post("/auth/forgot-password", { email });
      const devOtp = res.data?.otp;
      setSuccessMessage(
        res.data?.message || "Mã OTP 6 số đã được gửi đến Email của bạn!",
      );
      if (devOtp) {
        setSuccessMessage(`Mã OTP đã được gửi! (Mã thử nghiệm Dev: ${devOtp})`);
      }
      setStep(2);
      setTimer(60);
      setCanResend(false);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setErrorMessage(
        errorObj.response?.data?.message ||
          "Không thể gửi mã OTP. Vui lòng kiểm tra lại Email!",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otp.join("");
    if (fullOtp.length !== 6) {
      setErrorMessage("Vui lòng nhập đủ 6 số OTP!");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");

    try {
      await api.post("/auth/verify-otp", { email, otp: fullOtp });
      setSuccessMessage("Mã OTP hợp lệ! Vui lòng nhập mật khẩu mới.");
      setStep(3);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setErrorMessage(
        errorObj.response?.data?.message || "Mã OTP không chính xác!",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErrorMessage("Mật khẩu mới phải có ít nhất 6 ký tự!");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Mật khẩu xác nhận không khớp!");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const fullOtp = otp.join("");
      const res = await api.post("/auth/reset-password-otp", {
        email,
        otp: fullOtp,
        newPassword,
      });

      setSuccessMessage(
        res.data?.message ||
          "Đặt lại mật khẩu thành công! Đang chuyển về đăng nhập...",
      );
      setTimeout(() => {
        if (onSuccessReset) onSuccessReset(email);
        onClose();
      }, 1800);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setErrorMessage(
        errorObj.response?.data?.message || "Không thể đổi mật khẩu lúc này.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-slate-100">
        {/* Glow Background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mb-3">
            {step === 1 && <Mail className="w-6 h-6" />}
            {step === 2 && <KeyRound className="w-6 h-6" />}
            {step === 3 && <Lock className="w-6 h-6" />}
          </div>
          <h2 className="text-xl font-bold text-white">Quên Mật Khẩu</h2>
          <p className="text-xs text-slate-400 mt-1">
            {step === 1 && "Nhập Email để nhận mã xác thực OTP 6 số"}
            {step === 2 && `Mã OTP đã gửi đến: ${email}`}
            {step === 3 && "Tạo mật khẩu mới cho tài khoản của bạn"}
          </p>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-500/30 text-red-300 rounded-xl flex items-start gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 rounded-xl flex items-start gap-2.5 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* STEP 1: Enter Email */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Địa chỉ Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="nhanvien@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Gửi mã OTP <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Enter 6-digit OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="flex justify-center gap-2">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-input-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="w-11 h-13 text-center text-xl font-mono font-bold bg-slate-950 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>
                {timer > 0 ? (
                  `Gửi lại mã sau (${timer}s)`
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRequestOtp()}
                    disabled={!canResend || isLoading}
                    className="text-blue-400 hover:underline cursor-pointer font-medium"
                  >
                    Gửi lại mã OTP
                  </button>
                )}
              </span>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-slate-500 hover:text-slate-300"
              >
                Đổi Email khác
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                "Xác nhận mã OTP"
              )}
            </button>
          </form>
        )}

        {/* STEP 3: Reset Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Mật khẩu mới
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Xác nhận mật khẩu mới
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                "Hoàn tất & Đặt lại mật khẩu"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
