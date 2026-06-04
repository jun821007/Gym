import type { Metadata, Viewport } from "next";
import { Noto_Sans_TC, Press_Start_2P } from "next/font/google";
import "./globals.css";

const noto = Noto_Sans_TC({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
});

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#12121f",
};

export const metadata: Metadata = {
  title: "身體管理",
  description: "手機健康管理 — 體態、訓練、飲食",
  applicationName: "身體管理",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "身體管理",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className={`${noto.variable} ${pressStart.variable} h-full`}>
      <body className="h-full overflow-hidden antialiased">{children}</body>
    </html>
  );
}
