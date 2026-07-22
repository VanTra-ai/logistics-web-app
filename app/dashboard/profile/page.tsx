"use client";

import { useState, useEffect } from "react";
import {
  User,
  Lock,
  Save,
  Edit2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import api from "@/lib/axios";
import AddressInput from "@/app/components/AddressInput";

interface UserProfile {
  email?: string;
  full_name?: string;
  phone_number?: string;
  address?: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    fullName: "",
    phone_number: "",
    address: "",
  });

  const [addressVal, setAddressVal] = useState<{
    province_code?: string;
    province_name?: string;
    ward_code?: string;
    ward_name?: string;
    street?: string;
    full_address?: string;
  }>({});

  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/users/profile");
      setProfile(res.data);
      const addr = res.data.address || "";
      setFormData({
        fullName: res.data.full_name || "",
        phone_number: res.data.phone_number || "",
        address: addr,
      });
      setAddressVal({ full_address: addr });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch("/users/profile", formData);
      setMessage({ type: "success", text: "Cập nhật thông tin thành công!" });
      setIsEditing(false);
      fetchProfile();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setMessage({
        type: "error",
        text: apiError.response?.data?.message || "Cập nhật thất bại",
      });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "Mật khẩu xác nhận không khớp!",
      });
      return;
    }

    try {
      await api.patch("/users/change-password", {
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordMessage({ type: "success", text: "Đổi mật khẩu thành công!" });
      setPasswordData({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setTimeout(() => setPasswordMessage(null), 3000);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setPasswordMessage({
        type: "error",
        text: apiError.response?.data?.message || "Đổi mật khẩu thất bại",
      });
    }
  };

  if (loading)
    return (
      <div className="w-full h-[500px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Đang tải thông tin...</p>
        </div>
      </div>
    );

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto">
      <div className="flex items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
          <User className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Hồ sơ cá nhân</h1>
          <p className="text-xs text-slate-500 mt-1">
            Xem và thay đổi thông tin tài khoản của bạn
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Thông tin cá nhân */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-fit">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <User className="w-5 h-5 text-slate-500" />
              Thông tin chung
            </h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
            >
              <Edit2 className="w-4 h-4" />
              {isEditing ? "Hủy" : "Chỉnh sửa"}
            </button>
          </div>

          <form onSubmit={handleUpdateProfile} className="p-6 space-y-5">
            {message && (
              <div
                className={`p-3 rounded-xl flex items-center gap-2 text-sm ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
              >
                {message.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                {message.text}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <input
                type="text"
                value={profile?.email || ""}
                disabled
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Họ và tên
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                disabled={!isEditing}
                className={`w-full px-4 py-2.5 border rounded-xl outline-none transition-all ${isEditing ? "border-blue-300 focus:ring-2 focus:ring-blue-100 bg-white" : "border-slate-200 bg-slate-50 text-slate-600"}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Số điện thoại
              </label>
              <input
                type="text"
                value={formData.phone_number}
                onChange={(e) =>
                  setFormData({ ...formData, phone_number: e.target.value })
                }
                disabled={!isEditing}
                className={`w-full px-4 py-2.5 border rounded-xl outline-none transition-all ${isEditing ? "border-blue-300 focus:ring-2 focus:ring-blue-100 bg-white" : "border-slate-200 bg-slate-50 text-slate-600"}`}
              />
            </div>

            <div>
              {isEditing ? (
                <AddressInput
                  label="Địa chỉ"
                  value={addressVal}
                  onChange={(val) => {
                    setAddressVal(val);
                    setFormData((prev) => ({
                      ...prev,
                      address: val.full_address || "",
                    }));
                  }}
                />
              ) : (
                <>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Địa chỉ
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    disabled
                    className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 text-slate-600 rounded-xl outline-none"
                  />
                </>
              )}
            </div>

            {isEditing && (
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-6 shadow-sm"
              >
                <Save className="w-5 h-5" />
                Lưu thay đổi
              </button>
            )}
          </form>
        </div>

        {/* Đổi mật khẩu */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-fit">
          <div className="p-5 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Lock className="w-5 h-5 text-slate-500" />
              Đổi mật khẩu
            </h3>
          </div>

          <form onSubmit={handleChangePassword} className="p-6 space-y-5">
            {passwordMessage && (
              <div
                className={`p-3 rounded-xl flex items-center gap-2 text-sm ${passwordMessage.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
              >
                {passwordMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                {passwordMessage.text}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Mật khẩu hiện tại
              </label>
              <input
                type="password"
                required
                value={passwordData.oldPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    oldPassword: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Mật khẩu mới
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    newPassword: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Xác nhận mật khẩu mới
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    confirmPassword: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 rounded-xl transition-colors mt-6 shadow-sm"
            >
              Cập nhật mật khẩu
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
