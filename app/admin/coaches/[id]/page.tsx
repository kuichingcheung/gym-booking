"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface CoachProfile {
  id: string;
  name: string | null;
  email?: string | null;
  class_balance: number | null;
}

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  slot_type: "normal" | "one_to_two";
  class_cost: number;
  status: "active" | "cancelled";
}

export default function CoachBookingsAdminPage() {
  const params = useParams<{ id: string }>();
  const coachId = params.id;
  const supabase = createClient();

  const [coach, setCoach] = useState<CoachProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!coachId) return;

      let { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, email, class_balance")
        .eq("id", coachId)
        .single();

      if (profileError) {
        const retry = await supabase
          .from("profiles")
          .select("id, name, class_balance")
          .eq("id", coachId)
          .single();

        if (retry.error || !retry.data) {
          setMessage("找不到此教練");
          setLoading(false);
          return;
        }

        setCoach({ ...retry.data, email: null });
      } else if (profile) {
        setCoach({
          id: profile.id,
          name: profile.name,
          email: profile.email ?? null,
          class_balance: profile.class_balance,
        });
      } else {
        setMessage("找不到此教練");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("coach_id", coachId)
        .order("booking_date", { ascending: false })
        .order("start_time", { ascending: false });

      if (error) {
        setMessage("載入訂場紀錄失敗：" + error.message);
      } else {
        setBookings(data || []);
      }
      setLoading(false);
    };

    load();
  }, [coachId]);

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
        <h1 className="text-2xl font-bold">訂場紀錄</h1>
        <Link href="/admin" className="text-sm text-blue-600 dark:text-blue-400">
          返回
        </Link>
      </div>

      {coach && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow p-4 mb-6">
          <p className="text-sm text-gray-500 dark:text-zinc-400">教練帳戶</p>
          <p className="font-medium break-all">
            {coach.email || coach.name || coach.id}
          </p>
          {coach.email && coach.name ? (
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
              {coach.name}
            </p>
          ) : null}
          <p className="text-sm mt-2">
            剩餘堂數：
            <span className="font-medium">{coach.class_balance ?? "--"}</span>
          </p>
        </div>
      )}

      {message && (
        <p className="text-center mb-4 text-red-500 dark:text-red-400">{message}</p>
      )}

      <div className="space-y-3">
        {bookings.length === 0 && !message && (
          <p className="text-gray-500 dark:text-zinc-400 text-center py-10">
            暫時未有訂場紀錄
          </p>
        )}

        {bookings.map((booking) => (
          <div
            key={booking.id}
            className={`bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 ${
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
                    ? "bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300"
                    : "bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {booking.status === "active" ? "有效" : "已取消"}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              {booking.slot_type === "one_to_two" ? "一對二" : "普通"}（{booking.class_cost} 堂）
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
