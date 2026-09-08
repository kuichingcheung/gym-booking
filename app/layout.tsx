import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "健身室預約系統",
  description: "教練租場登記堂數",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-HK">
      <body className="bg-gray-50 text-gray-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        {children}
      </body>
    </html>
  );
}
