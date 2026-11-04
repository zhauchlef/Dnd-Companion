"use client";
 
import { useState } from "react";
import Sidebar from "./Sidebar";
 
export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
 
  return (
    <div className="min-h-screen bg-[#211c17]">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
 
      {/* Left padding matches the sidebar width: w-64 open, w-20 collapsed */}
      <main
        className={`min-h-screen transition-all duration-300 ${
          isCollapsed ? "pl-20" : "pl-64"
        }`}
      >
        {children}
      </main>
    </div>
  );
}