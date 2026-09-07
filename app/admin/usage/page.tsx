"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface UsageItem {
  time: string;
  count: number;
}

export default function UsagePage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [usage, setUsage] = useState<UsageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const timeSlots = [
    "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
    "19:00", "20:00", "21:00", "22:00", "23:00",
  ];

  const fetchUsage = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("bookings")
      .select("start_time")
      .eq("booking_date", date)
      .eq("status", "active");

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    // 統計每個時段數量
    const countMap: Record<string, number> = {};
    timeSlots.forEach((t) => (countMap[t] = 0));

    data?.forEach((b) => {
      const hour = b.start_time.slice(0, 5); // "10:00:00" → "10:00"
      if (countMap[hour] !== undefined) {
        countMap[hour] += 1;
      }
    });

    const result = timeSlots.map((t) => ({
      time: `${t}-${String(Number(t.slice(0, 2)) + 1).padStart(2, "0")}:00`,
      count: countMap[t],
    }));

    setUsage(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsage();
  }, [date]);

  return (
    <main className="min-h-screen p-4 max-w-lg mx-auto pb-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">使用率</h1>
        <Link href="/admin" className="text-sm text-blue-600">
          返回
        </Link>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">選擇日期</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        />
      </div>

      {loading ? (
        <p>載入中...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="grid grid-cols-2 bg-gray-100 font-medium text-sm">
            <div className="p-3">時段</div>
            <div className="p-3 text-right">預約數量</div>
          </div>
          {usage.map((item) => (
            <div
              key={item.time}
              className="grid grid-cols-2 border-t text-sm"
            >
              <div className="p-3">{item.time}</div>
              <div className="p-3 text-right font-medium">
                {item.count > 0 ? (
                  <span className="text-blue-600">{item.count}</span>
                ) : (
                  <span className="text-gray-400">0</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
