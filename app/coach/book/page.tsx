"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type SlotType = "normal" | "one_to_two";

interface SelectedSlot {
  time: string;
  type: SlotType;
}

export default function BookPage() {
  const timeSlots = [
    "07:00-08:00", "08:00-09:00", "09:00-10:00", "10:00-11:00",
    "11:00-12:00", "12:00-13:00", "13:00-14:00", "14:00-15:00",
    "15:00-16:00", "16:00-17:00", "17:00-18:00", "18:00-19:00",
    "19:00-20:00", "20:00-21:00", "21:00-22:00", "22:00-23:00",
    "23:00-24:00",
  ];

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const supabase = createClient();
  const router = useRouter();

  const toggleSlot = (time: string) => {
    setSelectedSlots((prev) => {
      const exists = prev.find((s) => s.time === time);
      if (exists) return prev.filter((s) => s.time !== time);
      return [...prev, { time, type: "normal" }];
    });
  };

  const changeSlotType = (time: string, type: SlotType) => {
    setSelectedSlots((prev) =>
      prev.map((s) => (s.time === time ? { ...s, type } : s))
    );
  };

  const totalClasses = selectedSlots.reduce(
    (sum, s) => sum + (s.type === "one_to_two" ? 1.5 : 1),
    0
  );

  const handleSubmit = async () => {
    if (!selectedDate || selectedSlots.length === 0) {
      setMessage("請選擇日期同至少一個時段");
      return;
    }

    setLoading(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("請先登入");
      setLoading(false);
      return;
    }

    // 檢查剩餘堂數
    const { data: profile } = await supabase
      .from("profiles")
      .select("class_balance")
      .eq("id", user.id)
      .single();

    if (!profile || profile.class_balance < totalClasses) {
      setMessage(`堂數不足！目前剩餘 ${profile?.class_balance || 0} 堂，需要 ${totalClasses} 堂`);
      setLoading(false);
      return;
    }

    // 逐個時段建立預約
    for (const slot of selectedSlots) {
      const [start, end] = slot.time.split("-");
      const classCost = slot.type === "one_to_two" ? 1.5 : 1;

      // 1. 插入 booking
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          coach_id: user.id,
          booking_date: selectedDate,
          start_time: start + ":00",
          end_time: end === "24:00" ? "24:00:00" : end + ":00",
          slot_type: slot.type,
          class_cost: classCost,
          status: "active",
        })
        .select()
        .single();

      if (bookingError) {
        setMessage("預約失敗：" + bookingError.message);
        setLoading(false);
        return;
      }

      // 2. 扣除堂數
      await supabase
        .from("profiles")
        .update({ class_balance: profile.class_balance - classCost })
        .eq("id", user.id);

      // 3. 寫入 transaction
      await supabase.from("class_transactions").insert({
        coach_id: user.id,
        change_amount: -classCost,
        reason: "booking",
        related_booking_id: booking.id,
        created_by: user.id,
      });

      // 更新本地 balance 供下一個 loop 使用
      profile.class_balance -= classCost;
    }

    setMessage(`成功預約 ${selectedSlots.length} 個時段，共扣除 ${totalClasses} 堂`);
    setSelectedSlots([]);
    setLoading(false);

    // 2秒後返主頁
    setTimeout(() => router.push("/coach"), 2000);
  };

  return (
    <main className="min-h-screen p-4 max-w-lg mx-auto pb-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">預約場地</h1>
        <Link href="/coach" className="text-sm text-blue-600">
          返回
        </Link>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">選擇日期</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-medium">選擇時段（可多選）</p>
          <p className="text-sm text-gray-500">已選 {selectedSlots.length} 個</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {timeSlots.map((slot) => {
            const isSelected = selectedSlots.some((s) => s.time === slot);
            return (
              <button
                key={slot}
                type="button"
                onClick={() => toggleSlot(slot)}
                className={`border rounded-lg py-3 text-sm transition ${
                  isSelected
                    ? "bg-blue-600 text-white border-blue-600"
                    : "hover:bg-blue-50 hover:border-blue-500"
                }`}
              >
                {slot}
              </button>
            );
          })}
        </div>
      </div>

      {selectedSlots.length > 0 && (
        <div className="mb-6 space-y-3">
          <p className="text-sm font-medium">已選時段設定</p>
          {selectedSlots.map((s) => (
            <div
              key={s.time}
              className="bg-white border rounded-lg p-3 flex items-center justify-between"
            >
              <span className="font-medium">{s.time}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => changeSlotType(s.time, "normal")}
                  className={`px-3 py-1 text-sm rounded-full border ${
                    s.type === "normal"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-gray-50"
                  }`}
                >
                  普通 (1)
                </button>
                <button
                  type="button"
                  onClick={() => changeSlotType(s.time, "one_to_two")}
                  className={`px-3 py-1 text-sm rounded-full border ${
                    s.type === "one_to_two"
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-gray-50"
                  }`}
                >
                  一對二 (1.5)
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {message && (
        <p className={`text-center mb-4 ${message.includes("成功") ? "text-green-600" : "text-red-500"}`}>
          {message}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !selectedDate || selectedSlots.length === 0}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium disabled:bg-gray-300"
      >
        {loading ? "處理中..." : `確認預約（扣 ${totalClasses || 0} 堂）`}
      </button>
    </main>
  );
}
