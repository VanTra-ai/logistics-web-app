import axios, { InternalAxiosRequestConfig } from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333",
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
  async (error) => {
    const originalRequest = error.config;

    if (error.response) {
      const status = error.response.status;

      // Xử lý khi Token hết hạn (401)
      if (status === 401 && !originalRequest._retry) {
        originalRequest._retry = true; // Đánh dấu đã thử lại để tránh lặp vô hạn

        if (typeof window !== "undefined") {
          const refreshToken = localStorage.getItem("refresh_token");

          if (refreshToken) {
            try {
              // Gọi API refresh token
              const response = await axios.post(
                `${api.defaults.baseURL}/auth/refresh`,
                { refresh_token: refreshToken },
              );

              const { access_token, refresh_token: new_refresh_token } =
                response.data?.data || response.data;

              // Lưu token mới
              localStorage.setItem("token", access_token);
              localStorage.setItem("refresh_token", new_refresh_token);

              // Cập nhật header cho request cũ và gửi lại
              originalRequest.headers.Authorization = `Bearer ${access_token}`;
              return api(originalRequest);
            } catch (refreshError) {
              console.warn(
                "[Axios Interceptor] Refresh token thất bại. Đang đăng xuất...",
              );
              localStorage.removeItem("token");
              localStorage.removeItem("refresh_token");
              localStorage.removeItem("user");
              window.location.href = "/";
              return Promise.reject(refreshError);
            }
          } else {
            console.warn(
              "[Axios Interceptor] Không có refresh token. Đang đăng xuất...",
            );
            localStorage.removeItem("token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("user");
            window.location.href = "/";
          }
        }
      }
    }
    // Ném lỗi để các file gọi API (như page.tsx) có thể bắt được qua try...catch
    return Promise.reject(error);
  },
);

export default api;
