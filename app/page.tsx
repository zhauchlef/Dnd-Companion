"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const baseFeatures = [
  {
    name: "World Maps",
    description: "Explore continents, kingdoms, and interior submaps.",
    href: "/map",
    icon: "🗺️",
    dmOnly: false,
  },
  {
    name: "Journal",
    description: "See campaign notes, quest logs, and village lore.",
    href: "/journal",
    icon: "📜",
    dmOnly: false,
  },
  {
    name: "Characters",
    description: "Manage player characters, stats, and class trackers.",
    href: "/characters",
    icon: "⚔️",
    dmOnly: false,
  },
  {
    name: "DM Screen",
    description: "Live player overview, inspiration overrides, and secret notes.",
    href: "/dm",
    icon: "👑",
    dmOnly: true,
  },
];

export default function Home() {
  const [isDm, setIsDm] = useState(false);

  useEffect(() => {
    // Check localStorage on load and listen for updates from the sidebar toggle
    const checkDm = () => {
      const saved = localStorage.getItem("dnd-dm-mode");
      if (saved === "true") setIsDm(true);
      else setIsDm(false);
    };

    checkDm();
    window.addEventListener("storage", checkDm);
    return () => window.removeEventListener("storage", checkDm);
  }, []);

  const visibleFeatures = baseFeatures.filter((f) => !f.dmOnly || isDm);

  return (
    <main className="min-h-screen bg-[#141310] text-[#e8dcc4]">
      {/* Header without DM toggle button */}
      <header className="border-b border-[#80643d] bg-[#211c17] p-6">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold text-[#d6ad68]">
            🐉 Dungeon Companion
          </h1>
          <p className="mt-1 text-sm text-[#a99a80]">
            Your world. Your campaign. Your adventure.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <section className="mx-auto max-w-7xl p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">Campaign Dashboard</h2>
          <p className="text-[#a99a80]">
            {isDm
              ? "Welcome back, Dungeon Master. Secret controls unlocked via sidebar."
              : "Welcome adventurer. Select a module to begin."}
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {visibleFeatures.map((feature) => (
            <Link
              key={feature.name}
              href={feature.href}
              className={`rounded-xl border p-6 transition ${
                feature.dmOnly
                  ? "border-purple-800 bg-[#21162b] hover:border-purple-500 hover:bg-[#2e1d3d]"
                  : "border-[#80643d] bg-[#211c17] hover:border-[#d6ad68] hover:bg-[#30261b]"
              }`}
            >
              <div className="mb-4 text-4xl">{feature.icon}</div>

              <h3 className="mb-2 text-xl font-semibold text-[#d6ad68]">
                {feature.name}
              </h3>

              <p className="text-sm text-[#b9aa91]">{feature.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}