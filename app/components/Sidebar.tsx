"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const baseNavigation = [
  { name: "Dashboard", icon: "🏠", href: "/" },
  { name: "DM Screen", icon: "👑", href: "/dm", dmOnly: true },
  { name: "Maps", icon: "🗺️", href: "/map" },
  { name: "Characters", icon: "👥", href: "/characters" },
  { name: "Creatures", icon: "🐉", href: "/creatures" },
  { name: "Inventory", icon: "🎒", href: "/inventory" },
  { name: "Quests", icon: "📜", href: "/quests" },
  { name: "Journal", icon: "📖", href: "/journal" },
  { name: "Settings", icon: "⚙️", href: "/settings" },
];

type SidebarProps = {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
};

export default function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const [isDm, setIsDm] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("dnd-dm-mode");
    if (saved === "true") setIsDm(true);
  }, []);

  const toggleDmMode = () => {
    const nextState = !isDm;
    setIsDm(nextState);
    localStorage.setItem("dnd-dm-mode", String(nextState));
    // Trigger window event so other pages can react instantly if needed
    window.dispatchEvent(new Event("storage"));
  };

  // Filter out DM-only links when in Player Mode
  const navigation = baseNavigation.filter((item) => !item.dmOnly || isDm);

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col overflow-y-auto border-r border-[#80643d] bg-[#211c17] p-3 text-[#e5bd70] transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Heading and collapse button */}
      <div className="mb-8 flex items-center justify-between gap-2">
        {!isCollapsed && (
          <h1 className="text-2xl font-bold">
            ⚔️ D&D Companion
          </h1>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="rounded-lg p-2 text-xl hover:bg-[#30271e]"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? "☰" : "←"}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-2">
        {navigation.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href + "/"));

          return (
            <Link
              key={item.name}
              href={item.href}
              title={isCollapsed ? item.name : ""}
              className={`flex items-center gap-3 rounded-lg px-3 py-4 text-lg transition ${
                active
                  ? "bg-[#59402b] font-bold text-white"
                  : "text-[#b8a17d] hover:bg-[#30271e] hover:text-white"
              } ${isCollapsed ? "justify-center" : ""}`}
            >
              <span className="text-xl">{item.icon}</span>

              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer Controls & DM Mode Switch */}
      <div className="mt-auto space-y-3 border-t border-[#80643d] pt-4">
        <button
          onClick={toggleDmMode}
          title={isDm ? "Switch to Player Mode" : "Switch to DM Mode"}
          className={`w-full rounded-lg border py-2.5 px-3 text-xs font-bold transition flex items-center gap-2 ${
            isDm
              ? "border-purple-500 bg-purple-950 text-purple-200 shadow-md shadow-purple-950/50"
              : "border-[#80643d] bg-[#30271e] text-[#b8a17d] hover:text-white hover:bg-[#3b3024]"
          } ${isCollapsed ? "justify-center px-1" : ""}`}
        >
          <span className="text-base">{isDm ? "👑" : "🛡️"}</span>
          {!isCollapsed && (
            <span className="truncate">
              {isDm ? "DM Mode: Active" : "Player Mode"}
            </span>
          )}
        </button>

        {!isCollapsed && (
          <div className="text-xs text-[#80643d]">
            Your D&D adventure starts here.
          </div>
        )}
      </div>
    </aside>
  );
}