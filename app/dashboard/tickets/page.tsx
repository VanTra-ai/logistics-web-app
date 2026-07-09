/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  User,
  Package,
  Calendar,
  X,
} from "lucide-react";
import api from "@/lib/axios";
import Pagination from "@/components/Pagination";

interface Ticket {
  id: string;
  issue_type: string;
  description: string;
  status: string;
  created_at: string;
  evidence_images: string[];
  customer: { id: string; full_name: string; phone_number: string };
  order?: { id: string; tracking_number: string };
}

interface TicketComment {
  id: string;
  message: string;
  created_at: string;
  is_staff: boolean;
  user: { id: string; full_name: string; role: string };
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  // Chat UI state
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    role: string;
  } | null>(null);

  const fetchTickets = async (roleOverride?: string) => {
    setIsLoading(true);
    try {
      const userStr = localStorage.getItem("user");
      let role = roleOverride || "";
      if (!roleOverride && userStr) {
        try {
          role = JSON.parse(userStr).role;
        } catch {}
      }
      
      const endpoint = role === "CUSTOMER" ? "/tickets/me" : "/tickets";
      
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", itemsPerPage.toString());
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (searchTerm) params.append("search", searchTerm);

      const res = await api.get(`${endpoint}?${params.toString()}`);
      
      if (res.data?.meta) {
        setTickets(res.data.data);
        setTotalPages(res.data.meta.totalPages);
        setTotalItems(res.data.meta.totalItems);
      } else {
        const data = res.data?.data || res.data || [];
        setTickets(Array.isArray(data) ? data : []);
        setTotalPages(1);
        setTotalItems(Array.isArray(data) ? data.length : 0);
      }
    } catch (err) {
      console.warn("Lỗi fetch tickets", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentUser(parsed);
      } catch {}
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter, searchTerm]);

  const fetchComments = async (ticketId: string) => {
    try {
      const res = await api.get(`/tickets/${ticketId}/comments`);
      const data = res.data?.data || res.data || [];
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Lỗi fetch comments", err);
    }
  };

  const openTicketChat = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setComments([]);
    fetchComments(ticket.id);
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !selectedTicket) return;
    setIsSending(true);
    try {
      await api.post(`/tickets/${selectedTicket.id}/comments`, {
        message: commentInput,
        attachments: [],
      });
      setCommentInput("");
      fetchComments(selectedTicket.id);
    } catch {
      alert("Lỗi khi gửi bình luận!");
    } finally {
      setIsSending(false);
    }
  };

  const handleResolveTicket = async (status: string) => {
    if (!selectedTicket) return;
    try {
      await api.patch(`/tickets/${selectedTicket.id}/resolve`, {
        status: status,
        admin_response: "Đã xử lý thông qua hệ thống Chat.",
      });
      alert("Đã cập nhật trạng thái khiếu nại!");
      fetchTickets();
      setSelectedTicket(null);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      alert(apiError.response?.data?.message || "Lỗi cập nhật trạng thái");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5" /> Mở
          </span>
        );
      case "RESOLVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5" /> Đã giải quyết
          </span>
        );
      case "CLOSED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Đã đóng
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3.5 h-3.5" /> {status}
          </span>
        );
    }
  };

  // Note: filtering by search term and status is now done on the backend.
  // We keep filteredTickets = tickets for rendering.
  const filteredTickets = tickets;

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6 animate-fadeIn">
      {/* Left List */}
      <div
        className={`w-full ${selectedTicket ? "hidden md:flex md:w-1/3" : "flex"} flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden`}
      >
        <div className="p-4 border-b border-slate-100 space-y-4 bg-slate-50">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" /> Hỗ trợ & Khiếu
            nại
          </h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Tìm mã đơn hàng, khách hàng..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {["ALL", "OPEN", "RESOLVED", "CLOSED"].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatusFilter(s);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === s
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {s === "ALL" ? "Tất cả" : s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Đang tải...
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Không tìm thấy khiếu nại.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => openTicketChat(t)}
                  className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                    selectedTicket?.id === t.id ? "bg-blue-50/50" : ""
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-sm text-slate-900 truncate">
                      {t.issue_type}
                    </span>
                    {getStatusBadge(t.status)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-mono text-slate-700">
                      <Package className="w-3.5 h-3.5" />
                      {t.order?.tracking_number || "N/A"}
                    </span>
                    <span className="flex items-center gap-1 truncate">
                      <User className="w-3.5 h-3.5" />
                      {t.customer?.full_name}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(t.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {!isLoading && totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex justify-center bg-white z-10">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Right Chat Area */}
      {selectedTicket ? (
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center shadow-sm z-10">
            <div className="flex items-center gap-3">
              <button
                className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-full"
                onClick={() => setSelectedTicket(null)}
              >
                <X className="w-5 h-5" />
              </button>
              <div>
                <h2 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                  {selectedTicket.issue_type}
                  {getStatusBadge(selectedTicket.status)}
                </h2>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span className="font-mono font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {selectedTicket.order?.tracking_number || "Không có mã đơn"}
                  </span>
                  <span>Khách: {selectedTicket.customer?.full_name}</span>
                </div>
              </div>
            </div>
            {currentUser?.role !== "CUSTOMER" &&
              selectedTicket.status === "OPEN" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleResolveTicket("RESOLVED")}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Đóng (Đã GQ)
                  </button>
                </div>
              )}
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 space-y-6">
            {/* Original Issue */}
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-bold text-slate-700">
                    {selectedTicket.customer?.full_name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(selectedTicket.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="bg-white border border-slate-200 text-slate-800 p-3 rounded-2xl rounded-tl-none shadow-sm text-sm">
                  <p className="whitespace-pre-wrap">
                    {selectedTicket.description}
                  </p>
                  {selectedTicket.evidence_images &&
                    selectedTicket.evidence_images.length > 0 && (
                      <div className="mt-3 flex gap-2 flex-wrap">
                        {selectedTicket.evidence_images.map((img, idx) => {
                          return (
                            <img
                              key={idx}
                              src={img}
                              alt="Bằng chứng"
                              className="h-20 rounded-lg border border-slate-200 object-cover"
                            />
                          );
                        })}
                      </div>
                    )}
                </div>
              </div>
            </div>

            {/* Comments Thread */}
            {comments.map((comment) => {
              const isMe = currentUser?.id === comment.user.id;
              return (
                <div
                  key={comment.id}
                  className={`flex gap-3 max-w-[85%] ${isMe ? "ml-auto flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${comment.is_staff ? "bg-blue-100" : "bg-slate-200"}`}
                  >
                    {comment.is_staff ? (
                      <span className="text-xs font-bold text-blue-700 border-2 border-blue-500 rounded-full w-full h-full flex items-center justify-center">
                        QTV
                      </span>
                    ) : (
                      <User className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                  <div
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-baseline gap-2 mb-1">
                      <span
                        className={`text-xs font-bold ${comment.is_staff ? "text-blue-700" : "text-slate-700"}`}
                      >
                        {comment.user.full_name} {comment.is_staff && "(Admin)"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div
                      className={`p-3 rounded-2xl shadow-sm text-sm ${
                        isMe
                          ? "bg-blue-600 text-white rounded-tr-none"
                          : comment.is_staff
                            ? "bg-blue-50 border border-blue-100 text-slate-800 rounded-tl-none"
                            : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{comment.message}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chat Input */}
          {selectedTicket.status !== "CLOSED" &&
            selectedTicket.status !== "RESOLVED" && (
              <div className="p-4 bg-white border-t border-slate-100">
                <form onSubmit={handleSendComment} className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Nhập tin nhắn..."
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={isSending || !commentInput.trim()}
                    className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    <Send className="w-5 h-5 ml-1" />
                  </button>
                </form>
              </div>
            )}
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-200 border-dashed">
          <div className="text-center text-slate-400 space-y-2">
            <MessageSquare className="w-12 h-12 mx-auto text-slate-300" />
            <p className="font-medium text-slate-500">
              Chọn khiếu nại để xem và trao đổi
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
