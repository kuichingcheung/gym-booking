"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function CoachPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email || "");

      const { data } = await supabase
        .from("profiles")
        .select("class_balance")
        .eq("id", user.id)
        .single();

      if (data) {
        setBalance(data.class_balance);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <main className="min-h-screen p-4 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">教練主頁</h1>
        <button onClick={handleLogout} className="text-sm text-red-500 dark:text-red-400">
          登出
        </button>
      </div>

      <p className="text-gray-600 dark:text-zinc-400 mb-4 break-all">
        登入帳戶：{email || "--"}
      </p>

      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow p-4 mb-6">
        <p className="text-sm text-gray-500 dark:text-zinc-400">剩餘堂數</p>
        <p className="text-3xl font-bold">
          {balance === null ? "--" : balance}
        </p>
      </div>

      <div className="space-y-3">
        <Link href="/coach/book">
          <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium">
            預約場地
          </button>
        </Link>
        <Link href="/coach/bookings">
          <button className="w-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-100 py-3 rounded-lg font-medium">
            我的預約
          </button>
        </Link>
      </div>
    </main>
  );
}
