import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "おはようルーティン",
  description: "朝のニュース＆資産ダイジェスト",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
