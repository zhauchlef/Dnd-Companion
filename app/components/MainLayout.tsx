"use client";
 
import { useState } from "react";
import Sidebar from "./Sidebar";
import CampaignShell from "./CampaignShell";
 
export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false); // desktop only
  const [mobileOpen, setMobileOpen] = useState(false); // phone drawer
 
  return (
    <div className="min-h-screen bg-[#211c17]">
      {/* Phone top bar with menu button */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[#80643d] bg-[#211c17] px-4 py-3 text-[#e5bd70] md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg px-2 py-1 text-2xl hover:bg-[#30271e]"
          aria-label="Open menu"
        >
          ☰
        </button>
        <span className="text-xl font-bold">⚔️ D&D Companion</span>
      </header>
 
      {/* Dark backdrop behind the open drawer (phone only) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
 
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
 
      {/* No left padding on phones. On desktop it matches the sidebar width:
          w-64 open, w-16 collapsed */}
      <main
        className={`min-w-0 overflow-x-hidden transition-all duration-300 md:min-h-screen ${
          isCollapsed ? "md:pl-16" : "md:pl-64"
        }`}
      >
        <CampaignShell>{children}</CampaignShell>
      </main>
    </div>
  );
}
 