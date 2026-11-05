"use client";

import { useState } from "react";

/* ==========================================================================
   TYPES & DATA
   ========================================================================== */

type SpellSchool = "Evocation" | "Abjuration" | "Conjuration" | "Divination" | "Enchantment" | "Evocation" | "Illusion" | "Necromancy" | "Transmutation";

type Spell = {
  id: string;
  name: string;
  level: number; // 0 = Cantrip
  school: SpellSchool;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  classes: string[];
  description: string;
  higherLevels?: string;
  isPrepared?: boolean;
};

const SAMPLE_SPELLS: Spell[] = [
  {
    id: "1",
    name: "Fireball",
    level: 3,
    school: "Evocation",
    castingTime: "1 action",
    range: "150 feet",
    components: "V, S, M (a tiny ball of bat guano and sulfur)",
    duration: "Instantaneous",
    classes: ["Wizard", "Sorcerer"],
    description:
      "A bright streak flashes from your pointing finger to a point you choose within range then blossoms with a low roar into an explosion of flame. Each creature in a 20-foot-radius sphere centered on that point must make a Dexterity saving throw. A target takes 8d6 fire damage on a failed save, or half as much damage on a successful one.",
    higherLevels: "When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d6 for each slot level above 3rd.",
    isPrepared: true,
  },
  {
    id: "2",
    name: "Shield",
    level: 1,
    school: "Abjuration",
    castingTime: "1 reaction, which you take when you are hit by an attack or targeted by the magic missile spell",
    range: "Self",
    components: "V, S",
    duration: "1 round",
    classes: ["Wizard", "Sorcerer"],
    description:
      "An invisible barrier of magical force appears and protects you. Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack, and you take no damage from magic missile.",
    isPrepared: true,
  },
  {
    id: "3",
    name: "Cure Wounds",
    level: 1,
    school: "Evocation",
    castingTime: "1 action",
    range: "Touch",
    components: "V, S",
    duration: "Instantaneous",
    classes: ["Cleric", "Druid", "Paladin", "Bard", "Ranger"],
    description:
      "A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier. This spell has no effect on undead or constructs.",
    higherLevels: "When you cast this spell using a spell slot of 2nd level or higher, the healing increases by 1d8 for each slot level above 1st.",
    isPrepared: false,
  },
  {
    id: "4",
    name: "Eldritch Blast",
    level: 0,
    school: "Evocation",
    castingTime: "1 action",
    range: "120 feet",
    components: "V, S",
    duration: "Instantaneous",
    classes: ["Warlock"],
    description:
      "A beam of crackling energy streaks toward a creature within range. Make a ranged spell attack against the target. On a hit, you deal 1d10 force damage.",
    isPrepared: true,
  },
  {
    id: "5",
    name: "Detect Magic",
    level: 1,
    school: "Divination",
    castingTime: "1 action",
    range: "Self",
    components: "V, S",
    duration: "Concentration, up to 10 minutes",
    classes: ["Wizard", "Cleric", "Druid", "Paladin", "Ranger", "Bard"],
    description:
      "For the duration, you sense the presence of magic within 30 feet of you. If you sense magic in this way, you can use your action to see a faint aura around any visible creature or object in the area that bears magic.",
    isPrepared: false,
  },
];

const inputCls =
  "rounded-lg border border-[#80643d] bg-[#211c17] px-3 py-2 text-white outline-none focus:border-[#e5bd70]";
const panelCls = "rounded-xl border border-[#80643d] bg-[#30271e] p-5 shadow-xl";
const btnCls = "rounded-lg bg-[#80643d] px-4 py-2 font-bold text-white hover:bg-[#a17b45] transition";

/* ==========================================================================
   COMPONENT
   ========================================================================== */

export default function SpellbookPage() {
  const [spells, setSpells] = useState<Spell[]>(SAMPLE_SPELLS);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClass, setFilterClass] = useState("All");
  const [filterLevel, setFilterLevel] = useState("All");
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(SAMPLE_SPELLS[0]);

  // New Spell Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLevel, setNewLevel] = useState(1);
  const [newSchool, setNewSchool] = useState<SpellSchool>("Evocation");
  const [newClass, setNewClass] = useState("Wizard");
  const [newCastingTime, setNewCastingTime] = useState("1 action");
  const [newRange, setNewRange] = useState("60 feet");
  const [newDesc, setNewDesc] = useState("");

  const handleAddSpell = () => {
    if (!newName.trim()) return;
    const customSpell: Spell = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      level: Number(newLevel),
      school: newSchool,
      castingTime: newCastingTime,
      range: newRange,
      components: "V, S",
      duration: "Instantaneous",
      classes: [newClass],
      description: newDesc.trim() || "Magical effect description...",
      isPrepared: false,
    };
    setSpells([customSpell, ...spells]);
    setSelectedSpell(customSpell);
    setNewName("");
    setNewDesc("");
    setShowAddModal(false);
  };

  const togglePrepared = (id: string) => {
    setSpells(
      spells.map((s) => (s.id === id ? { ...s, isPrepared: !s.isPrepared } : s))
    );
    if (selectedSpell?.id === id) {
      setSelectedSpell((prev) => (prev ? { ...prev, isPrepared: !prev.isPrepared } : null));
    }
  };

  const filteredSpells = spells.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.school.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = filterClass === "All" || s.classes.includes(filterClass);
    const matchesLevel =
      filterLevel === "All" ||
      (filterLevel === "0" && s.level === 0) ||
      (filterLevel !== "0" && s.level === Number(filterLevel));
    return matchesSearch && matchesClass && matchesLevel;
  });

  return (
    <main className="min-h-screen bg-[#211c17] p-4 text-[#e5bd70] md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#80643d]/40 pb-4">
          <div>
            <h1 className="text-4xl font-bold md:text-5xl">✨ Spellbook &amp; Rules Index</h1>
            <p className="text-sm text-[#b8a17d]">
              Search arcane incantations, manage prepared spells, and reference casting rules.
            </p>
          </div>
          <button onClick={() => setShowAddModal(true)} className={btnCls}>
            + Add Custom Spell
          </button>
        </div>

        {/* Filter Bar */}
        <div className={`${panelCls} flex flex-wrap items-center gap-4`}>
          <input
            type="text"
            placeholder="Search spells by name or effect..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${inputCls} flex-1 min-w-[240px]`}
          />

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#b8a17d]">Class:</span>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className={inputCls}
            >
              <option value="All">All Classes</option>
              <option value="Wizard">Wizard</option>
              <option value="Cleric">Cleric</option>
              <option value="Sorcerer">Sorcerer</option>
              <option value="Druid">Druid</option>
              <option value="Warlock">Warlock</option>
              <option value="Bard">Bard</option>
              <option value="Paladin">Paladin</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#b8a17d]">Level:</span>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className={inputCls}
            >
              <option value="All">All Levels</option>
              <option value="0">Cantrips (0)</option>
              <option value="1">1st Level</option>
              <option value="2">2nd Level</option>
              <option value="3">3rd Level</option>
              <option value="4">4th Level</option>
              <option value="5">5th Level</option>
            </select>
          </div>
        </div>

        {/* Main Split Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Spell List */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-[#b8a17d]">
              Spell Index ({filteredSpells.length})
            </h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredSpells.length === 0 ? (
                <div className={`${panelCls} text-center py-8 text-[#b8a17d] text-xs`}>
                  No spells match your search criteria.
                </div>
              ) : (
                filteredSpells.map((s) => {
                  const isSelected = selectedSpell?.id === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSpell(s)}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all ${
                        isSelected
                          ? "border-amber-400 bg-[#403121] shadow-md ring-1 ring-amber-400"
                          : "border-[#80643d] bg-[#30271e] hover:border-[#a17b45]"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white truncate text-base">{s.name}</h4>
                          {s.isPrepared && (
                            <span className="rounded bg-amber-950 border border-amber-600 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                              Prepared
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#b8a17d]">
                          {s.level === 0 ? "Cantrip" : `Level ${s.level}`} · {s.school}
                        </p>
                      </div>
                      <span className="font-mono text-xs text-[#80643d]">
                        {s.classes.join(", ")}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right/Center: Spell Detail Card */}
          <div className="lg:col-span-2 space-y-6">
            {selectedSpell ? (
              <section className={panelCls + " space-y-5"}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#80643d]/40 pb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-bold text-white">{selectedSpell.name}</h2>
                      <span className="rounded-lg bg-[#211c17] border border-[#80643d] px-3 py-1 text-xs font-bold text-amber-300">
                        {selectedSpell.level === 0 ? "Cantrip" : `Level ${selectedSpell.level} ${selectedSpell.school}`}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#b8a17d]">
                      Classes: <span className="font-semibold text-white">{selectedSpell.classes.join(", ")}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => togglePrepared(selectedSpell.id)}
                    className={`rounded-lg border px-4 py-2 font-bold text-xs transition ${
                      selectedSpell.isPrepared
                        ? "border-amber-500 bg-amber-950 text-amber-200"
                        : "border-[#80643d] bg-[#211c17] text-[#b8a17d] hover:text-white"
                    }`}
                  >
                    {selectedSpell.isPrepared ? "✨ Prepared Today" : "Prepare Spell"}
                  </button>
                </div>

                {/* Spell Meta Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-lg border border-[#80643d]/60 bg-[#211c17] p-2.5">
                    <span className="block text-[#b8a17d]">Casting Time</span>
                    <span className="font-bold text-white">{selectedSpell.castingTime}</span>
                  </div>
                  <div className="rounded-lg border border-[#80643d]/60 bg-[#211c17] p-2.5">
                    <span className="block text-[#b8a17d]">Range</span>
                    <span className="font-bold text-white">{selectedSpell.range}</span>
                  </div>
                  <div className="rounded-lg border border-[#80643d]/60 bg-[#211c17] p-2.5">
                    <span className="block text-[#b8a17d]">Components</span>
                    <span className="font-bold text-white">{selectedSpell.components}</span>
                  </div>
                  <div className="rounded-lg border border-[#80643d]/60 bg-[#211c17] p-2.5">
                    <span className="block text-[#b8a17d]">Duration</span>
                    <span className="font-bold text-white">{selectedSpell.duration}</span>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-3 text-sm leading-relaxed text-[#e8dcc4]">
                  <p>{selectedSpell.description}</p>
                  {selectedSpell.higherLevels && (
                    <div className="rounded-lg border border-amber-600/40 bg-[#3a2e1e] p-3 text-xs">
                      <strong className="text-amber-300 block mb-1">At Higher Levels:</strong>
                      {selectedSpell.higherLevels}
                    </div>
                  )}
                </div>
              </section>
            ) : (
              <section className={`${panelCls} text-center py-20`}>
                <span className="text-4xl mb-2 block">📖</span>
                <h3 className="text-lg font-bold">No Spell Selected</h3>
                <p className="text-xs text-[#b8a17d] mt-1">Select a spell from the index to view its incantation details.</p>
              </section>
            )}
          </div>
        </div>

        {/* Add Spell Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className={`${panelCls} w-full max-w-lg space-y-4 border-2 border-amber-600 bg-[#2b2118]`}>
              <div className="flex items-center justify-between border-b border-[#80643d]/40 pb-3">
                <h3 className="text-xl font-bold">Add Custom Spell</h3>
                <button onClick={() => setShowAddModal(false)} className="text-xs text-[#b8a17d] hover:text-white">✕</button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-[#b8a17d] mb-1">Spell Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Chaos Bolt"
                    className={`${inputCls} w-full text-sm`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#b8a17d] mb-1">Level</label>
                    <select
                      value={newLevel}
                      onChange={(e) => setNewLevel(Number(e.target.value))}
                      className={`${inputCls} w-full`}
                    >
                      <option value="0">Cantrip (0)</option>
                      <option value="1">1st Level</option>
                      <option value="2">2nd Level</option>
                      <option value="3">3rd Level</option>
                      <option value="4">4th Level</option>
                      <option value="5">5th Level</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-[#b8a17d] mb-1">School</label>
                    <select
                      value={newSchool}
                      onChange={(e) => setNewSchool(e.target.value as SpellSchool)}
                      className={`${inputCls} w-full`}
                    >
                      <option value="Evocation">Evocation</option>
                      <option value="Abjuration">Abjuration</option>
                      <option value="Conjuration">Conjuration</option>
                      <option value="Divination">Divination</option>
                      <option value="Enchantment">Enchantment</option>
                      <option value="Illusion">Illusion</option>
                      <option value="Necromancy">Necromancy</option>
                      <option value="Transmutation">Transmutation</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#b8a17d] mb-1">Casting Time</label>
                    <input
                      type="text"
                      value={newCastingTime}
                      onChange={(e) => setNewCastingTime(e.target.value)}
                      className={`${inputCls} w-full`}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#b8a17d] mb-1">Range</label>
                    <input
                      type="text"
                      value={newRange}
                      onChange={(e) => setNewRange(e.target.value)}
                      className={`${inputCls} w-full`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#b8a17d] mb-1">Description</label>
                  <textarea
                    rows={4}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Spell mechanics and damage..."
                    className={`${inputCls} w-full`}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="rounded-lg border border-[#80643d] px-4 py-2 font-bold text-[#b8a17d] hover:bg-[#30271e]"
                  >
                    Cancel
                  </button>
                  <button onClick={handleAddSpell} className={btnCls}>
                    Save Spell
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}