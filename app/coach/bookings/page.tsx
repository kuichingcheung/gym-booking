"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  slot_type: "normal" | "one_to_two";
  class_cost: number;
  status: "active" | "cancelled";
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const supabase = createClient();
  const router = useRouter();

  const fetchBookings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("coach_id", user.id)
      .order("booking_date", { ascending: false })
      .order("start_time", { ascending: false });

    if (error) {
      setMessage("載入失敗：" + error.message);
    } else {
      setBookings(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancel = async (booking: Booking) => {
    if (!confirm(`確定取消 ${booking.booking_date} ${booking.start_time.slice(0,5)} 的預約？\n將退回 ${booking.class_cost} 堂`)) {
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. 更新 booking status
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", booking.id);

    if (updateError) {
      setMessage("取消失敗：" + updateError.message);
      return;
    }

    // 2. 退回堂數
    const { data: profile } = await supabase
      .from("profiles")
      .select("class_balance")
      .eq("id", user.id)
      .single();

    if (profile) {
      await supabase
        .from("profiles")
        .update({ class_balance: profile.class_balance + booking.class_cost })
        .eq("id", user.id);
    }

    // 3. 寫入 transaction
    await supabase.from("class_transactions").insert({
      coach_id: user.id,
      change_amount: booking.class_cost,
      reason: "cancel",
      related_booking_id: booking.id,
      created_by: user.id,
      note: "取消預約退回",
    });

    setMessage("已取消預約，堂數已退回");
    fetchBookings();
  };

  if (loading) {
    return (
      <main className="min-h-screen p-4 max-w-lg mx-auto">
        <p>載入中...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 max-w-lg mx-auto pb-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">我的預約</h1>
        <Link href="/coach" className="text-sm text-blue-600">
          返回
        </Link>
      </div>

      {message && (
        <p className="text-center mb-4 text-green-600">{message}</p>
      )}

      <div className="space-y-3">
        {bookings.length === 0 && (
          <p className="text-gray-500 text-center py-10">暫時未有預約紀錄</p>
        )}

        {bookings.map((booking) => (
          <div
            key={booking.id}
            className={`bg-white border rounded-xl p-4 ${
              booking.status === "cancelled" ? "opacity-60" : ""
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium">{booking.booking_date}</p>
                <p className="text-lg">
                  {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  booking.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {booking.status === "active" ? "有效" : "已取消"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                {booking.slot_type === "one_to_two" ? "一對二" : "普通"}（{booking.class_cost} 堂）
              </span>

              {booking.status === "active" && (
                <button
                  onClick={() => handleCancel(booking)}
                  className="text-sm text-red-500 font-medium"
                >
                  取消預約
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
