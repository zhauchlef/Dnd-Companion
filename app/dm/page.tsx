"use client";

import { useEffect, useState } from "react";

/* ==========================================================================
   TYPES & STORAGE
   ========================================================================== */

type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

type Character = {
  id: string;
  name: string;
  race: string;
  className: string;
  level: number;
  hp: { current: number; max: number; temp: number };
  ac: number;
  speed: number;
  inspiration: boolean;
  abilities: Record<AbilityKey, number>;
  skillProf: Record<string, number>;
  conditions: string[];
  dmNotes?: string;
};

type PreparedMonster = {
  id: string;
  name: string;
  hp: number;
  ac: number;
  cr: string;
  attacks: string;
  notes: string;
};

type LiveCombatant = {
  id: string;
  name: string;
  initiative: number;
  hpCurrent: number;
  hpMax: number;
  ac: number;
  isPlayer: boolean;
  notes: string;
};

const DIFFICULTY_CLASSES = [
  { dc: "5", task: "Very Easy", example: "Notice a large sign, climb a knotted rope" },
  { dc: "10", task: "Easy", example: "Hear a loud conversation, recall common lore" },
  { dc: "15", task: "Medium", example: "Pick a simple lock, spot a hidden pouch" },
  { dc: "20", task: "Hard", example: "Track through rain, decipher complex code" },
  { dc: "25", task: "Very Hard", example: "Pick a master lock, recall ancient obscure history" },
  { dc: "30", task: "Nearly Impossible", example: "Leap across a 30ft chasm without magic" },
];

const SAMPLE_PREPARED_MONSTERS: PreparedMonster[] = [
  {
    id: "m1",
    name: "Goblin Boss",
    hp: 21,
    ac: 17,
    cr: "1 (200 XP)",
    attacks: "Scimitar: +4 to hit, reach 5ft. Hit: 5 (1d6 + 2) slashing damage.",
    notes: "Commands other goblins. Shield extra +2 AC.",
  },
  {
    id: "m2",
    name: "Bugbear",
    hp: 27,
    ac: 16,
    cr: "1 (200 XP)",
    attacks: "Morningstar: +4 to hit, reach 5ft. Hit: 11 (2d8 + 2) piercing damage.",
    notes: "Brute. Deals extra damage on surprise attacks.",
  },
];

const inputCls =
  "rounded-lg border border-[#80643d] bg-[#211c17] px-3 py-2 text-white outline-none focus:border-[#e5bd70]";
const panelCls = "rounded-xl border border-[#80643d] bg-[#30271e] p-5";
const btnCls = "rounded-lg bg-[#80643d] px-4 py-2 font-bold text-white hover:bg-[#a17b45]";

/* ==========================================================================
   COMPONENT
   ========================================================================== */

export default function DmScreenPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"prep" | "combat" | "party" | "rules">("prep");

  // Prepared Monsters State (Saved in Advance)
  const [preparedMonsters, setPreparedMonsters] = useState<PreparedMonster[]>(SAMPLE_PREPARED_MONSTERS);

  // New Monster Prep Form State
  const [prepName, setPrepName] = useState("");
  const [prepHp, setPrepHp] = useState(20);
  const [prepAc, setPrepAc] = useState(13);
  const [prepCr, setPrepCr] = useState("1/2");
  const [prepAttacks, setPrepAttacks] = useState("");
  const [prepNotes, setPrepNotes] = useState("");

  // Live Combat Tracker State
  const [combatants, setCombatants] = useState<LiveCombatant[]>([]);
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0);
  const [round, setRound] = useState(1);

  // Quick Ad-hoc Monster Add State
  const [newEnemyName, setNewEnemyName] = useState("");
  const [newEnemyHp, setNewEnemyHp] = useState(15);
  const [newEnemyAc, setNewEnemyAc] = useState(12);
  const [newEnemyInit, setNewEnemyInit] = useState(10);
  const [newEnemyNotes, setNewEnemyNotes] = useState("");

  useEffect(() => {
    try {
      const savedChars = localStorage.getItem("dnd-characters");
      if (savedChars) setCharacters(JSON.parse(savedChars));

      const savedPrep = localStorage.getItem("dnd-prepared-monsters");
      if (savedPrep) setPreparedMonsters(JSON.parse(savedPrep));
    } catch {
      console.error("Could not load DM data");
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem("dnd-prepared-monsters", JSON.stringify(preparedMonsters));
    }
  }, [preparedMonsters, loaded]);

  const updateCharacter = (id: string, patch: Partial<Character>) => {
    const updated = characters.map((c) => (c.id === id ? { ...c, ...patch } : c));
    setCharacters(updated);
    localStorage.setItem("dnd-characters", JSON.stringify(updated));
  };

  /* Helper Math */
  const modOf = (score: number) => Math.floor(((score || 10) - 10) / 2);
  const profBonus = (level: number) => Math.ceil((level || 1) / 4) + 1;

  /* Monster Prep Actions */
  const savePreparedMonster = () => {
    if (!prepName.trim()) return;
    const newMonster: PreparedMonster = {
      id: crypto.randomUUID(),
      name: prepName.trim(),
      hp: Number(prepHp) || 10,
      ac: Number(prepAc) || 10,
      cr: prepCr.trim() || "1",
      attacks: prepAttacks.trim(),
      notes: prepNotes.trim(),
    };
    setPreparedMonsters([...preparedMonsters, newMonster]);
    setPrepName("");
    setPrepAttacks("");
    setPrepNotes("");
  };

  const spawnMonsterToCombat = (monster: PreparedMonster) => {
    const activeEnemy: LiveCombatant = {
      id: crypto.randomUUID(),
      name: monster.name,
      initiative: Math.floor(Math.random() * 20) + 1 + 2, // Quick random init roll
      hpCurrent: monster.hp,
      hpMax: monster.hp,
      ac: monster.ac,
      isPlayer: false,
      notes: monster.notes || monster.attacks,
    };
    setCombatants((prev) => [...prev, activeEnemy]);
    setActiveTab("combat"); // Switch over to combat pad to see it spawned
  };

  /* Combat Pad Actions */
  const loadPartyIntoCombat = () => {
    const pcCombatants: LiveCombatant[] = characters.map((c) => ({
      id: c.id,
      name: c.name,
      initiative: 10 + modOf(c.abilities?.dex),
      hpCurrent: c.hp?.current || 10,
      hpMax: c.hp?.max || 10,
      ac: c.ac || 10,
      isPlayer: true,
      notes: `${c.race} ${c.className}`,
    }));
    setCombatants((prev) => [...prev.filter((x) => !x.isPlayer), ...pcCombatants]);
  };

  const addAdHocEnemy = () => {
    if (!newEnemyName.trim()) return;
    const enemy: LiveCombatant = {
      id: crypto.randomUUID(),
      name: newEnemyName.trim(),
      initiative: newEnemyInit,
      hpCurrent: newEnemyHp,
      hpMax: newEnemyHp,
      ac: newEnemyAc,
      isPlayer: false,
      notes: newEnemyNotes.trim(),
    };
    setCombatants((prev) => [...prev, enemy]);
    setNewEnemyName("");
    setNewEnemyNotes("");
  };

  const sortInitiative = () => {
    setCombatants((prev) => [...prev].sort((a, b) => b.initiative - a.initiative));
    setCurrentTurnIdx(0);
  };

  const nextTurn = () => {
    if (combatants.length === 0) return;
    if (currentTurnIdx + 1 >= combatants.length) {
      setCurrentTurnIdx(0);
      setRound((r) => r + 1);
    } else {
      setCurrentTurnIdx((i) => i + 1);
    }
  };

  if (!loaded) return <div className="bg-[#211c17] p-8 text-[#e5bd70]">Loading DM Screen...</div>;

  return (
    <main className="min-h-screen bg-[#211c17] p-4 text-[#e5bd70] md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#80643d]/40 pb-4">
          <div>
            <h1 className="text-4xl font-bold md:text-5xl">👑 Dungeon Master Screen</h1>
            <p className="text-sm text-[#b8a17d]">
              Pre-plan encounters, run live combat, inspect party stats, and reference rules.
            </p>
          </div>

          {/* Quick Tab Switcher */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: "prep", label: `🐉 Monster Lair (${preparedMonsters.length})` },
              { id: "combat", label: `⚔️ Live Combat Pad (${combatants.length})` },
              { id: "party", label: `👥 Party Inspector (${characters.length})` },
              { id: "rules", label: `📖 Rules & DCs` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`rounded-lg px-4 py-2 font-bold text-sm transition ${
                  activeTab === tab.id
                    ? "bg-[#80643d] text-white shadow-md"
                    : "bg-[#30271e] text-[#b8a17d] hover:bg-[#3b3024] hover:text-[#e5bd70]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ====================================================================
           TAB 1: MONSTER LAIR / ADVANCE PREP
           ==================================================================== */}
        {activeTab === "prep" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Monster Lair &amp; Encounter Prep</h2>
                <p className="text-xs text-[#b8a17d]">Create and save monster stats in advance. Spawn them directly into combat when encounters start.</p>
              </div>
            </div>

            {/* Create / Add Prepared Monster Form */}
            <div className={`${panelCls} border-2 border-[#80643d] bg-[#2b2118] space-y-3`}>
              <h3 className="font-bold text-amber-300">+ Pre-Plan New Monster / Villain</h3>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-[11px] font-bold text-[#b8a17d]">Monster Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Orc War Chief, Goblin Shaman"
                    value={prepName}
                    onChange={(e) => setPrepName(e.target.value)}
                    className={`${inputCls} w-full text-sm`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-[#b8a17d]">Hit Points (HP)</label>
                  <input
                    type="number"
                    value={prepHp}
                    onChange={(e) => setPrepHp(Number(e.target.value))}
                    className={`${inputCls} w-full text-sm text-center`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-[#b8a17d]">Armor Class (AC)</label>
                  <input
                    type="number"
                    value={prepAc}
                    onChange={(e) => setPrepAc(Number(e.target.value))}
                    className={`${inputCls} w-full text-sm text-center`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-[#b8a17d]">Challenge (CR)</label>
                  <input
                    type="text"
                    value={prepCr}
                    onChange={(e) => setPrepCr(e.target.value)}
                    placeholder="e.g. 2 (450 XP)"
                    className={`${inputCls} w-full text-sm text-center`}
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-[#b8a17d]">Attacks &amp; Actions</label>
                  <input
                    type="text"
                    value={prepAttacks}
                    onChange={(e) => setPrepAttacks(e.target.value)}
                    placeholder="Greataxe: +5 to hit, reach 5ft. Hit: 9 (1d12 + 3) slashing."
                    className={`${inputCls} w-full text-xs`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-[#b8a17d]">Tactical Notes / Traits</label>
                  <input
                    type="text"
                    value={prepNotes}
                    onChange={(e) => setPrepNotes(e.target.value)}
                    placeholder="Aggressive. Moves up to speed toward hostile creature."
                    className={`${inputCls} w-full text-xs`}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={savePreparedMonster} className={btnCls}>
                  Save to Monster Lair
                </button>
              </div>
            </div>

            {/* Prepared Monsters Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {preparedMonsters.map((m) => (
                <div key={m.id} className={`${panelCls} flex flex-col justify-between space-y-3 bg-[#282017]`}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-[#80643d]/30 pb-2">
                      <h4 className="font-bold text-lg text-white">{m.name}</h4>
                      <span className="rounded bg-red-950 border border-red-700 px-2 py-0.5 text-[10px] font-bold text-red-300">
                        CR {m.cr}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="rounded border border-[#80643d] bg-[#211c17] p-1.5">
                        <span className="block text-[10px] text-[#b8a17d]">HIT POINTS</span>
                        <span className="font-bold text-sm text-white">{m.hp} HP</span>
                      </div>
                      <div className="rounded border border-[#80643d] bg-[#211c17] p-1.5">
                        <span className="block text-[10px] text-[#b8a17d]">ARMOR CLASS</span>
                        <span className="font-bold text-sm text-white">{m.ac} AC</span>
                      </div>
                    </div>

                    {m.attacks && (
                      <p className="text-xs text-[#e8dcc4] font-mono bg-[#211c17] p-2 rounded border border-[#80643d]/30">
                        <strong>Attack:</strong> {m.attacks}
                      </p>
                    )}

                    {m.notes && (
                      <p className="text-xs text-[#b8a17d] italic">
                        {m.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#80643d]/30">
                    <button
                      onClick={() => spawnMonsterToCombat(m)}
                      className="flex-1 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
                    >
                      ⚔️ Spawn to Combat Pad
                    </button>
                    <button
                      onClick={() => setPreparedMonsters(preparedMonsters.filter((x) => x.id !== m.id))}
                      className="rounded-lg bg-red-950 border border-red-800 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-900 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ====================================================================
           TAB 2: LIVE COMBAT PAD
           ==================================================================== */}
        {activeTab === "combat" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-amber-900 border border-amber-600 px-4 py-2 font-mono font-bold text-amber-200">
                  Round {round}
                </span>
                <button onClick={nextTurn} className={btnCls}>
                  Next Turn ➔
                </button>
                <button onClick={sortInitiative} className="rounded-lg border border-[#80643d] px-3 py-2 text-xs font-bold hover:bg-[#30271e]">
                  ⚡ Auto-Sort Initiative
                </button>
              </div>

              <button onClick={loadPartyIntoCombat} className="rounded-lg border border-[#80643d] bg-[#211c17] px-4 py-2 text-xs font-bold text-[#e5bd70] hover:bg-[#3b3024]">
                📥 Import Party Characters
              </button>
            </div>

            {/* Quick Ad-hoc Monster Add Form */}
            <div className={`${panelCls} border-2 border-[#80643d] bg-[#282017]`}>
              <h3 className="mb-3 font-bold text-[#e5bd70]">Quick Add Enemy on the Fly</h3>
              <div className="grid gap-3 sm:grid-cols-6">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[11px] font-bold text-[#b8a17d]">Creature Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Stray Wolf"
                    value={newEnemyName}
                    onChange={(e) => setNewEnemyName(e.target.value)}
                    className={`${inputCls} w-full text-sm`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-[#b8a17d]">Initiative</label>
                  <input
                    type="number"
                    value={newEnemyInit}
                    onChange={(e) => setNewEnemyInit(Number(e.target.value))}
                    className={`${inputCls} w-full text-sm text-center`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-[#b8a17d]">Max HP</label>
                  <input
                    type="number"
                    value={newEnemyHp}
                    onChange={(e) => setNewEnemyHp(Number(e.target.value))}
                    className={`${inputCls} w-full text-sm text-center`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-[#b8a17d]">Armor Class</label>
                  <input
                    type="number"
                    value={newEnemyAc}
                    onChange={(e) => setNewEnemyAc(Number(e.target.value))}
                    className={`${inputCls} w-full text-sm text-center`}
                  />
                </div>
                <div className="flex items-end">
                  <button onClick={addAdHocEnemy} className={`${btnCls} w-full text-sm py-2.5`}>
                    + Add Enemy
                  </button>
                </div>
              </div>
            </div>

            {/* Initiative Turn Order List */}
            <div className="space-y-3">
              {combatants.length === 0 ? (
                <div className={`${panelCls} text-center py-8 text-[#b8a17d]`}>
                  No active combatants on pad. Spawn monsters from your <strong>Monster Lair</strong> tab or import party characters above.
                </div>
              ) : (
                combatants.map((cmb, idx) => {
                  const isCurrent = idx === currentTurnIdx;
                  return (
                    <div
                      key={cmb.id}
                      className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 transition-all ${
                        isCurrent
                          ? "border-amber-400 bg-[#3d2e1c] ring-2 ring-amber-500/50 shadow-lg"
                          : cmb.isPlayer
                          ? "border-[#80643d] bg-[#30271e]"
                          : "border-red-900 bg-[#281b1b]"
                      }`}
                    >
                      <div className="flex items-center gap-4 min-w-[220px]">
                        <div className="text-center">
                          <span className="block text-[10px] text-[#b8a17d]">INIT</span>
                          <span className="flex h-9 w-10 items-center justify-center rounded-lg bg-[#211c17] font-mono font-bold text-base border border-[#80643d]">
                            {cmb.initiative}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-lg text-white">{cmb.name}</h4>
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                cmb.isPlayer
                                  ? "bg-blue-900 text-blue-200 border border-blue-600"
                                  : "bg-red-950 text-red-300 border border-red-700"
                              }`}
                            >
                              {cmb.isPlayer ? "PLAYER" : "ENEMY"}
                            </span>
                          </div>
                          <input
                            type="text"
                            value={cmb.notes}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCombatants((prev) =>
                                prev.map((x) => (x.id === cmb.id ? { ...x, notes: val } : x))
                              );
                            }}
                            placeholder="Conditions or attacks"
                            className="mt-1 w-full bg-transparent text-xs text-[#b8a17d] outline-none border-b border-[#80643d]/40 focus:border-[#e5bd70]"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="rounded-lg border border-[#80643d] bg-[#211c17] px-3 py-1.5 text-center min-w-[60px]">
                          <span className="block text-[10px] text-[#b8a17d] font-bold">ARMOR CLASS</span>
                          <span className="font-mono font-bold text-base text-white">{cmb.ac}</span>
                        </div>

                        <div className="rounded-lg border border-[#80643d] bg-[#211c17] p-2 flex items-center gap-2">
                          <div>
                            <span className="block text-[10px] text-[#b8a17d] font-bold text-center">HIT POINTS</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={cmb.hpCurrent}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setCombatants((prev) =>
                                    prev.map((x) => (x.id === cmb.id ? { ...x, hpCurrent: val } : x))
                                  );
                                }}
                                className={`${inputCls} w-16 text-center font-bold px-1 py-1 text-sm`}
                              />
                              <span className="text-xs text-[#b8a17d]">/ {cmb.hpMax}</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() =>
                                setCombatants((prev) =>
                                  prev.map((x) =>
                                    x.id === cmb.id
                                      ? { ...x, hpCurrent: Math.max(0, x.hpCurrent - 5) }
                                      : x
                                  )
                                )
                              }
                              className="rounded bg-red-950 border border-red-800 px-1.5 py-0.5 text-[10px] font-bold text-red-300 hover:bg-red-900"
                              title="Take 5 Damage"
                            >
                              -5 HP
                            </button>
                            <button
                              onClick={() =>
                                setCombatants((prev) =>
                                  prev.map((x) =>
                                    x.id === cmb.id
                                      ? { ...x, hpCurrent: Math.min(x.hpMax, x.hpCurrent + 5) }
                                      : x
                                  )
                                )
                              }
                              className="rounded bg-green-950 border border-green-800 px-1.5 py-0.5 text-[10px] font-bold text-green-300 hover:bg-green-900"
                              title="Heal 5 HP"
                            >
                              +5 HP
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={() => setCombatants((prev) => prev.filter((x) => x.id !== cmb.id))}
                          className="px-2 text-[#b8a17d] hover:text-red-400 text-lg"
                          title="Remove from Combat"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ====================================================================
           TAB 3: PARTY INSPECTOR
           ==================================================================== */}
        {activeTab === "party" && (
          <div className="space-y-6">
            {characters.length === 0 ? (
              <div className={`${panelCls} text-center py-12 text-[#b8a17d]`}>
                No player characters found. Have your players build characters on the <strong>👥 Characters</strong> page.
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {characters.map((c) => {
                  const pb = profBonus(c.level);
                  const wisMod = modOf(c.abilities?.wis);
                  const intMod = modOf(c.abilities?.int);

                  const percProf = c.skillProf?.Perception ?? 0;
                  const insProf = c.skillProf?.Insight ?? 0;
                  const invProf = c.skillProf?.Investigation ?? 0;

                  const passivePerception = 10 + wisMod + pb * percProf;
                  const passiveInsight = 10 + wisMod + pb * insProf;
                  const passiveInvestigation = 10 + intMod + pb * invProf;

                  const hpPct = c.hp?.max ? (c.hp.current / c.hp.max) * 100 : 0;

                  return (
                    <section key={c.id} className={`${panelCls} flex flex-col justify-between space-y-4`}>
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2 border-b border-[#80643d]/30 pb-3">
                          <div>
                            <h2 className="text-2xl font-bold text-white">{c.name || "Unnamed Adventurer"}</h2>
                            <p className="text-xs text-[#b8a17d]">
                              Lvl {c.level} {c.race} {c.className}
                            </p>
                          </div>
                          <button
                            onClick={() => updateCharacter(c.id, { inspiration: !c.inspiration })}
                            className={`rounded-full px-3 py-1 text-xs font-bold border transition ${
                              c.inspiration
                                ? "border-amber-400 bg-amber-900 text-amber-200"
                                : "border-gray-600 bg-gray-800 text-gray-400 hover:border-amber-500"
                            }`}
                          >
                            {c.inspiration ? "✦ Inspired" : "Grant Inspiration"}
                          </button>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1 font-bold">
                            <span>Hit Points</span>
                            <span>
                              {c.hp?.current}/{c.hp?.max} {c.hp?.temp ? `(+${c.hp.temp} Temp)` : ""}
                            </span>
                          </div>
                          <div className="h-3 overflow-hidden rounded-full bg-[#211c17]">
                            <div
                              className={`h-full transition-all ${
                                hpPct > 50 ? "bg-green-600" : hpPct > 25 ? "bg-yellow-600" : "bg-red-700"
                              }`}
                              style={{ width: `${Math.min(100, hpPct)}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() =>
                              updateCharacter(c.id, {
                                hp: { ...c.hp, current: Math.max(0, (c.hp?.current || 0) - 5) },
                              })
                            }
                            className="rounded bg-red-950 border border-red-800 px-2 py-1 text-xs font-bold text-red-300 hover:bg-red-900"
                          >
                            -5 HP
                          </button>
                          <button
                            onClick={() =>
                              updateCharacter(c.id, {
                                hp: { ...c.hp, current: Math.min(c.hp?.max || 10, (c.hp?.current || 0) + 5) },
                              })
                            }
                            className="rounded bg-green-950 border border-green-800 px-2 py-1 text-xs font-bold text-green-300 hover:bg-green-900"
                          >
                            +5 HP
                          </button>
                          <label className="ml-auto flex items-center gap-1 text-xs text-[#b8a17d]">
                            Set AC:
                            <input
                              type="number"
                              value={c.ac || 10}
                              onChange={(e) => updateCharacter(c.id, { ac: Number(e.target.value) || 10 })}
                              className={`${inputCls} w-14 text-center px-1 py-0.5 text-xs`}
                            />
                          </label>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                          <div className="rounded-lg border border-[#80643d] bg-[#211c17] p-2">
                            <span className="block text-[10px] text-[#b8a17d]">Pass. Perc.</span>
                            <span className="text-base font-bold text-white">{passivePerception}</span>
                          </div>
                          <div className="rounded-lg border border-[#80643d] bg-[#211c17] p-2">
                            <span className="block text-[10px] text-[#b8a17d]">Pass. Insight</span>
                            <span className="text-base font-bold text-white">{passiveInsight}</span>
                          </div>
                          <div className="rounded-lg border border-[#80643d] bg-[#211c17] p-2">
                            <span className="block text-[10px] text-[#b8a17d]">Pass. Invest.</span>
                            <span className="text-base font-bold text-white">{passiveInvestigation}</span>
                          </div>
                        </div>

                        {c.conditions && c.conditions.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {c.conditions.map((cond) => (
                              <span
                                key={cond}
                                className="rounded bg-red-950 border border-red-700 px-2 py-0.5 text-[10px] font-bold text-red-300"
                              >
                                {cond}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-2">
                        <label className="mb-1 block text-xs font-bold text-purple-300">
                          🔒 Secret DM Notes (Private to DM)
                        </label>
                        <textarea
                          rows={3}
                          value={c.dmNotes || ""}
                          onChange={(e) => updateCharacter(c.id, { dmNotes: e.target.value })}
                          placeholder="Secret curse, plot hook, pending passive triggers..."
                          className={`${inputCls} w-full text-xs font-mono border-purple-800 bg-[#1c1524]`}
                        />
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
           TAB 4: RULES & DCS
           ==================================================================== */}
        {activeTab === "rules" && (
          <div className="grid gap-6 md:grid-cols-2">
            <section className={panelCls}>
              <h3 className="mb-3 text-xl font-bold">Difficulty Class (DC) Benchmarks</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#80643d] text-[#b8a17d]">
                      <th className="pb-2">DC</th>
                      <th className="pb-2">Difficulty</th>
                      <th className="pb-2">Example Challenge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#80643d]/30">
                    {DIFFICULTY_CLASSES.map((d) => (
                      <tr key={d.dc}>
                        <td className="py-2.5 font-mono font-bold text-amber-300">{d.dc}</td>
                        <td className="py-2.5 font-bold text-white">{d.task}</td>
                        <td className="py-2.5 text-[#b8a17d]">{d.example}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={panelCls}>
              <h3 className="mb-3 text-xl font-bold">Cover Rules</h3>
              <div className="space-y-3 text-xs">
                {DIFFICULTY_CLASSES.length > 0 && (
                  <div className="rounded-lg border border-[#80643d]/60 bg-[#211c17] p-3">
                    <h4 className="font-bold text-amber-300 mb-1">Half Cover (+2 AC / Dex Saves)</h4>
                    <p className="text-[#b8a17d]">Low wall, large furniture, another creature.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}