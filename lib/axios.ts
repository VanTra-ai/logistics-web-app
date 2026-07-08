import axios, { InternalAxiosRequestConfig } from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Thêm Response Interceptor để xử lý lỗi 401 / 403 tập trung
api.interceptors.response.use(
  (response) => {
    // Nếu request thành công, trả về response nguyên vẹn
    return response;
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;
      // Xử lý khi Token hết hạn (401)
      if (status === 401) {
        if (typeof window !== "undefined") {
          console.warn(`[Axios Interceptor] Lỗi ${status}. Đang đăng xuất...`);
          // Xóa toàn bộ dữ liệu phiên đăng nhập
          localStorage.removeItem("token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("user");

          // Chuyển hướng người dùng về trang đăng nhập
          window.location.href = "/";
        }
      }
    }
    // Ném lỗi để các file gọi API (như page.tsx) có thể bắt được qua try...catch
    return Promise.reject(error);
  },
);

export default api;
