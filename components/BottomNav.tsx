"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/page-1", label: "Page 1", icon: "📄" },
  { href: "/page-2", label: "Page 2", icon: "📋" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-gray-200 bg-white pb-safe">
      {tabs.map(({ href, label, icon }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
              isActive ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <span className="text-xl leading-none">{icon}</span>
            <span className={isActive ? "font-bold" : ""}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
