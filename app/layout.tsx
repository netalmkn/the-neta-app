import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6366F1",
};

export const metadata: Metadata = {
  title: "Neta's Study App",
  description: "Track tasks, exams, study sessions and your schedule",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Study",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} antialiased`}>
        {children}
        <div className="lg:hidden">
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
