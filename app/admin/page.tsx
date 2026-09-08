"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Coach {
  id: string;
  name: string;
  class_balance: number;
}

export default function AdminPage() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedCoach, setSelectedCoach] = useState("");
  const [amount, setAmount] = useState("");
  const [adjustMode, setAdjustMode] = useState<"add" | "deduct">("add");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const supabase = createClient();
  const router = useRouter();

  const fetchCoaches = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, class_balance")
      .eq("role", "coach")
      .order("name");

    console.log("fetchCoaches data:", data);
    console.log("fetchCoaches error:", error);

    if (error) {
      setMessage("載入教練列表失敗：" + error.message);
      return;
    }
    if (data) {
      setCoaches([...data]); // 強制新陣列觸發更新
    }
  };

  useEffect(() => {
    fetchCoaches();
  }, []);

  const handleAdjustClasses = async () => {
    if (!selectedCoach || !amount || Number(amount) <= 0) {
      setMessage("請選擇教練並輸入有效堂數");
      return;
    }

    setLoading(true);
    setMessage("");

    const absAmount = Number(amount);
    const changeAmount = adjustMode === "add" ? absAmount : -absAmount;

    const { data: profile } = await supabase
      .from("profiles")
      .select("class_balance")
      .eq("id", selectedCoach)
      .single();

    if (!profile) {
      setMessage("找不到教練");
      setLoading(false);
      return;
    }

    if (adjustMode === "deduct" && profile.class_balance < absAmount) {
      setMessage(
        `堂數不足，目前剩餘 ${profile.class_balance} 堂，不能減少 ${absAmount} 堂`
      );
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ class_balance: profile.class_balance + changeAmount })
      .eq("id", selectedCoach);

    if (updateError) {
      setMessage("更新失敗：" + updateError.message);
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("class_transactions").insert({
      coach_id: selectedCoach,
      change_amount: changeAmount,
      reason: adjustMode === "add" ? "admin_add" : "admin_deduct",
      created_by: user?.id,
      note:
        adjustMode === "add"
          ? `管理員增加 ${absAmount} 堂`
          : `管理員減少 ${absAmount} 堂`,
    });

    setMessage(
      adjustMode === "add"
        ? `成功為教練增加 ${absAmount} 堂`
        : `成功為教練減少 ${absAmount} 堂`
    );
    setAmount("");
    setSelectedCoach("");
    await fetchCoaches();
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <main className="min-h-screen p-4 max-w-lg mx-auto pb-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">管理員主頁</h1>
        <button onClick={handleLogout} className="text-sm text-red-500 dark:text-red-400">
          登出
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow p-4 mb-6 space-y-4">
        <h2 className="font-bold text-lg">調整教練堂數</h2>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAdjustMode("add")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
              adjustMode === "add"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-600"
            }`}
          >
            增加
          </button>
          <button
            type="button"
            onClick={() => setAdjustMode("deduct")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
              adjustMode === "deduct"
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-600"
            }`}
          >
            減少
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-800 dark:text-zinc-200">選擇教練</label>
          <select
            value={selectedCoach}
            onChange={(e) => setSelectedCoach(e.target.value)}
            className="w-full border border-gray-300 dark:border-zinc-600 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
          >
            <option value="">-- 請選擇 --</option>
            {coaches.map((coach) => (
              <option key={coach.id} value={coach.id}>
                {coach.name || coach.id.slice(0, 8)} （目前 {coach.class_balance} 堂）
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-800 dark:text-zinc-200">
            {adjustMode === "add" ? "增加堂數" : "減少堂數"}
          </label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-gray-300 dark:border-zinc-600 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
            placeholder="例如 10 或 1.5"
          />
        </div>

        {message && (
          <p className={`text-sm ${message.includes("成功") ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
            {message}
          </p>
        )}

        <button
          onClick={handleAdjustClasses}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium disabled:bg-gray-400 dark:disabled:bg-zinc-600"
        >
          {loading
            ? "處理中..."
            : adjustMode === "add"
              ? "確認增加"
              : "確認減少"}
        </button>
      </div>

      <Link href="/admin/usage">
        <button className="w-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-100 py-3 rounded-lg font-medium mb-6">
          查看使用率
        </button>
      </Link>

      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow p-4">
        <h2 className="font-bold text-lg mb-3">教練列表</h2>
        <div className="space-y-2">
          {coaches.map((coach) => (
            <div key={coach.id} className="flex justify-between border-b border-gray-200 dark:border-zinc-700 py-2">
              <span>{coach.name || "未命名"}</span>
              <span className="font-medium">{coach.class_balance} 堂</span>
            </div>
          ))}
          {coaches.length === 0 && (
            <p className="text-gray-500 dark:text-zinc-400 text-sm">暫時未有教練</p>
          )}
        </div>
      </div>
    </main>
  );
}
