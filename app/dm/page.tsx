"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useActiveCampaign } from "../components/CampaignShell";

/* ==========================================================================
   TYPES & DATA
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
  initiativeBonus?: number;
  dmNotes?: string;
};

type EncounterTemplate = {
  id: string;
  encounterName: string;
  location: string;
  monsters: {
    id: string;
    name: string;
    hp: number;
    ac: number;
    initiativeBonus: number;
    count: number;
    notes: string;
  }[];
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

const RACE_BONUSES: Record<string, Partial<Record<AbilityKey, number>>> = {
  Dragonborn: { str: 2, cha: 1 },
  Dwarf: { con: 2, wis: 1 },
  Elf: { dex: 2, int: 1 },
  WoodElf: { dex: 2, wis: 1 },
  Gnome: { int: 2, con: 1 },
  HalfElf: { cha: 2 },
  HalfOrc: { str: 2, con: 1 },
  Halfling: { dex: 2, cha: 1 },
  Human: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
  Tiefling: { cha: 2, int: 1 },
};

const DIFFICULTY_CLASSES = [
  { dc: "5", task: "Very Easy", example: "Notice a large sign, climb a knotted rope" },
  { dc: "10", task: "Easy", example: "Hear a loud conversation, recall common lore" },
  { dc: "15", task: "Medium", example: "Pick a simple lock, spot a hidden pouch" },
  { dc: "20", task: "Hard", example: "Track through rain, decipher complex code" },
  { dc: "25", task: "Very Hard", example: "Pick a master lock, recall ancient obscure history" },
  { dc: "30", task: "Nearly Impossible", example: "Leap across a 30ft chasm without magic" },
];

const COVER_RULES = [
  {
    type: "Half Cover (+2 AC / Dex Saves)",
    description: "Low wall, large furniture, another creature.",
  },
  {
    type: "Three-Quarter Cover (+5 AC / Dex Saves)",
    description: "Portcullis, arrow slit, thick tree trunk.",
  },
  {
    type: "Total Cover (Targeting Blocked)",
    description: "Completely concealed by an obstacle.",
  },
];

const inputCls =
  "rounded-lg border border-[#80643d] bg-[#211c17] px-3 py-2 text-white outline-none focus:border-[#e5bd70]";
const panelCls = "rounded-xl border border-[#80643d] bg-[#30271e] p-5";
const btnCls = "rounded-lg bg-[#80643d] px-4 py-2 font-bold text-white hover:bg-[#a17b45]";

const modOf = (score: number) => Math.floor(((score || 10) - 10) / 2);
const profBonus = (level: number) => Math.ceil((level || 1) / 4) + 1;
const abilityScore = (c: Character, key: AbilityKey) =>
  (c.abilities?.[key] || 10) + (RACE_BONUSES[c.race]?.[key] || 0);

/* ==========================================================================
   COMPONENT
   ========================================================================== */

export default function DmScreenPage() {
  const router = useRouter();
  const campaign = useActiveCampaign();

  const [confirmedDm, setConfirmedDm] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [cloudStatus, setCloudStatus] = useState("Connecting to cloud...");

  const [activeTab, setActiveTab] = useState<"prep" | "combat" | "party" | "rules">("prep");

  // Encounter Prep State
  const [encounters, setEncounters] = useState<EncounterTemplate[]>([]);
  const [newEncName, setNewEncName] = useState("");
  const [newEncLocation, setNewEncLocation] = useState("");
  const [newEncNotes, setNewEncNotes] = useState("");
  
  const [draftMonsters, setDraftMonsters] = useState<
    { id: string; name: string; hp: number; ac: number; initiativeBonus: number; count: number; notes: string }[]
  >([]);
  const [mName, setMName] = useState("");
  const [mHp, setMHp] = useState(15);
  const [mAc, setMAc] = useState(12);
  const [mInitBonus, setMInitBonus] = useState(2);
  const [mCount, setMCount] = useState(1);
  const [mNotes, setMNotes] = useState("");

  // Combat tracker
  const [combatants, setCombatants] = useState<LiveCombatant[]>([]);
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0);
  const [round, setRound] = useState(1);

  // Add ad-hoc enemy form
  const [newEnemyName, setNewEnemyName] = useState("");
  const [newEnemyHp, setNewEnemyHp] = useState(15);
  const [newEnemyAc, setNewEnemyAc] = useState(12);
  const [newEnemyInit, setNewEnemyInit] = useState(10);
  const [newEnemyNotes, setNewEnemyNotes] = useState("");

  useEffect(() => {
    let active = true;

    const loadCloudData = async () => {
      try {
        const { data, error } = await supabase
          .from("campaign_characters")
          .select("id, name, data")
          .eq("campaign_id", campaign.id)
          .order("name", { ascending: true });

        if (error) throw error;
        if (!active) return;

        const cloudCharacters: Character[] = (data || [])
          .map((row: { id: string; name: string; data: unknown }) => {
            const characterData = row.data as Character | null;
            if (!characterData) return null;
            return {
              ...characterData,
              id: row.id,
              name: characterData.name || row.name || "Unnamed Adventurer",
            };
          })
          .filter((character): character is Character => character !== null);

        setCharacters(cloudCharacters);
        setCloudStatus("Cloud synced");
      } catch (error) {
        console.error("Could not load characters from Supabase:", error);
        if (active) setCloudStatus("Cloud unavailable");
      } finally {
        if (active) setLoaded(true);
      }
    };

    try {
      const savedEnc = localStorage.getItem(`dnd-encounters-${campaign.id}`);
      if (savedEnc) setEncounters(JSON.parse(savedEnc));
    } catch {
      console.error("Could not load encounters");
    }

    const channel = supabase
      .channel(`dm-screen-${campaign.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campaign_characters" },
        () => {
          void loadCloudData();
        }
      )
      .subscribe();

    void loadCloudData();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [campaign.id]);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(`dnd-encounters-${campaign.id}`, JSON.stringify(encounters));
    }
  }, [encounters, loaded]);

  useEffect(() => {
    if (!loaded) return;
    setCombatants((prev) =>
      prev
        .filter((cmb) => !cmb.isPlayer || characters.some((c) => c.id === cmb.id))
        .map((cmb) => {
          if (!cmb.isPlayer) return cmb;
          const ch = characters.find((c) => c.id === cmb.id);
          if (!ch) return cmb;
          return {
            ...cmb,
            name: ch.name || cmb.name,
            hpCurrent: ch.hp?.current ?? cmb.hpCurrent,
            hpMax: ch.hp?.max ?? cmb.hpMax,
            ac: ch.ac || cmb.ac,
          };
        })
    );
  }, [characters, loaded]);

  const updateCharacter = (id: string, patch: Partial<Character>) => {
    const current = characters.find((character) => character.id === id);
    if (!current) return;

    const changed = { ...current, ...patch };
    setCharacters((prev) => prev.map((character) => (character.id === id ? changed : character)));
    setCloudStatus("Saving to cloud...");

    void supabase
      .from("campaign_characters")
      .upsert(
        {
          id: changed.id,
          campaign_id: campaign.id,
          name: changed.name || "Unnamed Adventurer",
          data: changed,
        },
        { onConflict: "id" }
      )
      .then(({ error }) => {
        if (error) {
          console.error("Could not save character to cloud:", error);
          setCloudStatus("Cloud save failed");
        } else {
          setCloudStatus("Cloud synced");
        }
      });
  };

  const addDraftMonster = () => {
    if (!mName.trim()) return;
    setDraftMonsters((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: mName.trim(),
        hp: Number(mHp) || 10,
        ac: Number(mAc) || 12,
        initiativeBonus: Number(mInitBonus) || 0,
        count: Number(mCount) || 1,
        notes: mNotes.trim(),
      },
    ]);
    setMName("");
    setMNotes("");
  };

  const saveEncounter = () => {
    if (!newEncName.trim()) return;
    const newEnc: EncounterTemplate = {
      id: crypto.randomUUID(),
      encounterName: newEncName.trim(),
      location: newEncLocation.trim(),
      monsters: draftMonsters,
      notes: newEncNotes.trim(),
    };
    setEncounters((prev) => [...prev, newEnc]);
    setNewEncName("");
    setNewEncLocation("");
    setNewEncNotes("");
    setDraftMonsters([]);
  };

  const deleteEncounter = (id: string) => {
    setEncounters((prev) => prev.filter((e) => e.id !== id));
  };

  const deployEncounterToCombat = (enc: EncounterTemplate) => {
    const spawned: LiveCombatant[] = [];
    enc.monsters.forEach((m) => {
      for (let i = 0; i < m.count; i++) {
        const suffix = m.count > 1 ? ` #${i + 1}` : "";
        spawned.push({
          id: crypto.randomUUID(),
          name: `${m.name}${suffix}`,
          initiative: Math.floor(Math.random() * 20) + 1 + m.initiativeBonus,
          hpCurrent: m.hp,
          hpMax: m.hp,
          ac: m.ac,
          isPlayer: false,
          notes: m.notes,
        });
      }
    });

    setCombatants((prev) => [...prev, ...spawned]);
    setActiveTab("combat");
  };

  const toCombatant = (c: Character): LiveCombatant => ({
    id: c.id,
    name: c.name || "Unnamed Adventurer",
    initiative: 10 + modOf(abilityScore(c, "dex")) + (c.initiativeBonus || 0),
    hpCurrent: c.hp?.current ?? 10,
    hpMax: c.hp?.max || 10,
    ac: c.ac || 10,
    isPlayer: true,
    notes: [c.race, c.className].filter(Boolean).join(" "),
  });

  const inCombat = (id: string) => combatants.some((x) => x.id === id);
  const availableCharacters = characters.filter((c) => !inCombat(c.id));

  const addCharacterToCombat = (c: Character) => {
    if (inCombat(c.id)) return;
    setCombatants((prev) => [...prev, toCombatant(c)]);
  };

  const addWholeParty = () => {
    if (availableCharacters.length === 0) return;
    setCombatants((prev) => [...prev, ...availableCharacters.map(toCombatant)]);
  };

  const addEnemyToCombat = () => {
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

  const updateCombatant = (id: string, patch: Partial<LiveCombatant>) => {
    const target = combatants.find((x) => x.id === id);
    if (!target) return;

    const next = { ...patch };
    if (next.hpCurrent !== undefined) {
      next.hpCurrent = Math.min(target.hpMax, Math.max(0, next.hpCurrent));
    }

    setCombatants((prev) => prev.map((x) => (x.id === id ? { ...x, ...next } : x)));

    if (target.isPlayer && next.hpCurrent !== undefined) {
      const ch = characters.find((c) => c.id === id);
      if (ch) updateCharacter(id, { hp: { ...ch.hp, current: next.hpCurrent } });
    }
  };

  const removeCombatant = (id: string) => {
    const removedIdx = combatants.findIndex((x) => x.id === id);
    if (removedIdx === -1) return;
    setCombatants((prev) => prev.filter((x) => x.id !== id));
    setCurrentTurnIdx((i) =>
      removedIdx < i ? i - 1 : Math.min(i, Math.max(0, combatants.length - 2))
    );
  };

  const cancelDmMode = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <main className="min-h-screen bg-[#211c17] p-4 text-[#e5bd70] md:p-8">
      {!loaded ? (
        <div className="p-8 text-[#e5bd70]">Loading DM Screen...</div>
      ) : !confirmedDm ? (
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-[#80643d] bg-[#30271e] p-7 text-center shadow-2xl">
            <div className="mb-4 text-5xl">👑</div>
            <h1 className="text-2xl font-bold">Are you sure you&apos;re the DM?</h1>
            <p className="mt-4 text-sm leading-6 text-[#b8a17d]">
              This area contains the Dungeon Master&apos;s tools, party information and private DM
              notes. Are you sure you want to enter DM Mode?
            </p>
            <div className="mt-7 flex flex-col-reverse justify-center gap-3 sm:flex-row">
              <button
                onClick={cancelDmMode}
                className="rounded-lg border border-[#80643d] px-5 py-3 font-bold text-[#b8a17d] transition hover:bg-[#211c17] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => setConfirmedDm(true)}
                className="rounded-lg bg-[#80643d] px-5 py-3 font-bold text-white transition hover:bg-[#a17b45]"
              >
                Yes, enter DM Mode
              </button>
            </div>
            <p className="mt-5 text-xs text-[#80643d]">
              This is just a confirmation. No password is required.
            </p>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#80643d]/40 pb-4">
            <div>
              <h1 className="text-3xl font-bold md:text-5xl">👑 Dungeon Master Screen</h1>
              <p className="text-sm text-[#b8a17d]">
                Encounter prep, live combat tracking, and party inspection for{" "}
                <b className="text-[#e5bd70]">{campaign.name}</b>.
                <span className="ml-2 text-xs text-[#e5bd70]">☁ {cloudStatus}</span>
              </p>
            </div>

            <button
              onClick={() => setConfirmedDm(false)}
              className="rounded-lg border border-[#80643d] px-4 py-2 text-sm font-bold text-[#b8a17d] hover:bg-[#30271e] hover:text-white"
            >
              Exit DM Mode
            </button>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: "prep", label: `🐉 Encounter Prep (${encounters.length})` },
              { id: "combat", label: `⚔️ Live Combat Pad (${combatants.length})` },
              { id: "party", label: `👥 Party Inspector (${characters.length})` },
              { id: "rules", label: "📖 Rules & DCs" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  activeTab === tab.id
                    ? "bg-[#80643d] text-white shadow-md"
                    : "bg-[#30271e] text-[#b8a17d] hover:bg-[#3b3024] hover:text-[#e5bd70]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ==================================================================
              ENCOUNTER PREP TAB
              ================================================================== */}
          {activeTab === "prep" && (
            <div className="space-y-6">
              <div className={`${panelCls} border-2 border-[#80643d] bg-[#282017] space-y-4`}>
                <h3 className="text-xl font-bold text-[#e5bd70]">Pre-Plan New Encounter</h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#b8a17d]">Encounter Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Goblin Ambush at River Pass"
                      value={newEncName}
                      onChange={(e) => setNewEncName(e.target.value)}
                      className={`${inputCls} w-full`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#b8a17d]">Location / Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Dense forest road, twilight"
                      value={newEncLocation}
                      onChange={(e) => setNewEncLocation(e.target.value)}
                      className={`${inputCls} w-full`}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-[#80643d]/60 bg-[#211c17] p-4 space-y-3">
                  <h4 className="font-bold text-sm text-amber-300">Add Monsters to Encounter</h4>
                  <div className="grid gap-3 sm:grid-cols-6 text-xs">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[10px] font-bold text-[#b8a17d]">Monster Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Goblin Archer"
                        value={mName}
                        onChange={(e) => setMName(e.target.value)}
                        className={`${inputCls} w-full`}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-[#b8a17d]">Count</label>
                      <input
                        type="number"
                        min={1}
                        value={mCount}
                        onChange={(e) => setMCount(Number(e.target.value))}
                        className={`${inputCls} w-full text-center`}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-[#b8a17d]">HP</label>
                      <input
                        type="number"
                        value={mHp}
                        onChange={(e) => setMHp(Number(e.target.value))}
                        className={`${inputCls} w-full text-center`}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-[#b8a17d]">AC</label>
                      <input
                        type="number"
                        value={mAc}
                        onChange={(e) => setMAc(Number(e.target.value))}
                        className={`${inputCls} w-full text-center`}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-[#b8a17d]">Init. Bonus</label>
                      <input
                        type="number"
                        value={mInitBonus}
                        onChange={(e) => setMInitBonus(Number(e.target.value))}
                        className={`${inputCls} w-full text-center`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="text"
                      placeholder="Attacks / Special notes (e.g., Shortbow +4 to hit)"
                      value={mNotes}
                      onChange={(e) => setMNotes(e.target.value)}
                      className={`${inputCls} flex-1 text-xs`}
                    />
                    <button onClick={addDraftMonster} className={`${btnCls} text-xs py-2`}>
                      + Add to Encounter
                    </button>
                  </div>
                </div>

                {draftMonsters.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-[#b8a17d]">Monsters in this Encounter Draft:</span>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {draftMonsters.map((dm) => (
                        <div key={dm.id} className="flex items-center justify-between rounded bg-[#211c17] p-2 text-xs border border-[#80643d]/40">
                          <div>
                            <span className="font-bold text-white">{dm.count}x {dm.name}</span>
                            <span className="block text-[10px] text-[#b8a17d]">HP: {dm.hp} | AC: {dm.ac} | Init +{dm.initiativeBonus}</span>
                          </div>
                          <button
                            onClick={() => setDraftMonsters((prev) => prev.filter((x) => x.id !== dm.id))}
                            className="text-red-400 hover:text-red-300 px-2"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={saveEncounter}
                    disabled={!newEncName.trim() || draftMonsters.length === 0}
                    className={`${btnCls} disabled:opacity-40`}
                  >
                    Save Encounter Template
                  </button>
                </div>
              </div>

              {/* Saved Encounters List */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold">Saved Encounters</h3>
                {encounters.length === 0 ? (
                  <div className={`${panelCls} py-8 text-center text-[#b8a17d]`}>
                    No encounters prepared yet. Build one above to organize your session prep!
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {encounters.map((enc) => (
                      <div key={enc.id} className={`${panelCls} space-y-3 flex flex-col justify-between`}>
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold text-lg text-white">{enc.encounterName}</h4>
                              {enc.location && <p className="text-xs text-[#b8a17d]">📍 {enc.location}</p>}
                            </div>
                            <button
                              onClick={() => deleteEncounter(enc.id)}
                              className="text-xs text-red-400 hover:text-red-300"
                            >
                              Delete
                            </button>
                          </div>

                          <div className="space-y-1 pt-1">
                            <span className="text-[10px] font-bold text-[#b8a17d] uppercase tracking-wider">Monsters:</span>
                            <div className="space-y-1">
                              {enc.monsters.map((m, idx) => (
                                <div key={idx} className="flex justify-between rounded bg-[#211c17] px-2.5 py-1 text-xs">
                                  <span className="font-bold text-white">{m.count}x {m.name}</span>
                                  <span className="text-[#b8a17d]">HP {m.hp} · AC {m.ac}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#80643d]/30 flex justify-end">
                          <button
                            onClick={() => deployEncounterToCombat(enc)}
                            className="rounded-lg bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
                          >
                            ⚔️ Deploy Encounter to Combat Pad
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================================
              COMBAT TAB
              ================================================================== */}
          {activeTab === "combat" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-lg border border-amber-600 bg-amber-900 px-4 py-2 font-mono font-bold text-amber-200">
                  Round {round}
                </span>
                <button onClick={nextTurn} className={btnCls}>
                  Next Turn ➔
                </button>
                <button
                  onClick={sortInitiative}
                  className="rounded-lg border border-[#80643d] px-3 py-2 text-xs font-bold hover:bg-[#30271e]"
                >
                  ⚡ Auto-Sort Initiative
                </button>
              </div>

              {/* Party members for this campaign */}
              <div className={panelCls}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-[#e5bd70]">Add party members to combat</h3>
                  <button
                    onClick={addWholeParty}
                    disabled={availableCharacters.length === 0}
                    className="rounded-lg border border-[#80643d] bg-[#211c17] px-4 py-2 text-xs font-bold text-[#e5bd70] hover:bg-[#3b3024] disabled:opacity-40"
                  >
                    📥 Add whole party
                  </button>
                </div>

                {characters.length === 0 ? (
                  <p className="text-sm text-[#b8a17d]">
                    No characters in this campaign yet. Have your players build theirs on the 👥
                    Characters page.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {characters.map((c) =>
                      inCombat(c.id) ? (
                        <span
                          key={c.id}
                          className="rounded-lg border border-[#80643d]/40 px-3 py-2 text-sm text-[#80643d]"
                        >
                          ✓ {c.name || "Unnamed"}
                        </span>
                      ) : (
                        <button
                          key={c.id}
                          onClick={() => addCharacterToCombat(c)}
                          className="rounded-lg border border-[#80643d] bg-[#211c17] px-3 py-2 text-left text-sm hover:border-[#e5bd70]"
                        >
                          <span className="font-bold text-white">+ {c.name || "Unnamed"}</span>
                          <span className="block text-xs text-[#b8a17d]">
                            Lvl {c.level} {c.className} · HP {c.hp?.current}/{c.hp?.max} · AC {c.ac}
                          </span>
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Add enemy */}
              <div className={`${panelCls} border-2 border-[#80643d] bg-[#282017]`}>
                <h3 className="mb-3 font-bold text-[#e5bd70]">Add Enemy / NPC to Combat Pad</h3>
                <div className="grid gap-3 sm:grid-cols-6">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-[11px] font-bold text-[#b8a17d]">Creature Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Goblin Chief, Bugbear"
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
                      className={`${inputCls} w-full text-center text-sm`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-[#b8a17d]">Max HP</label>
                    <input
                      type="number"
                      value={newEnemyHp}
                      onChange={(e) => setNewEnemyHp(Number(e.target.value))}
                      className={`${inputCls} w-full text-center text-sm`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-[#b8a17d]">Armor Class</label>
                    <input
                      type="number"
                      value={newEnemyAc}
                      onChange={(e) => setNewEnemyAc(Number(e.target.value))}
                      className={`${inputCls} w-full text-center text-sm`}
                    />
                  </div>
                  <div className="flex items-end">
                    <button onClick={addEnemyToCombat} className={`${btnCls} w-full py-2.5 text-sm`}>
                      + Add Enemy
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="mb-1 block text-[11px] font-bold text-[#b8a17d]">Enemy Notes (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Boss, resistant to fire..."
                    value={newEnemyNotes}
                    onChange={(e) => setNewEnemyNotes(e.target.value)}
                    className={`${inputCls} w-full text-sm`}
                  />
                </div>
              </div>

              {/* Initiative list */}
              <div className="space-y-3">
                {combatants.length === 0 ? (
                  <div className={`${panelCls} py-8 text-center text-[#b8a17d]`}>
                    No active combatants on pad. Deploy an encounter or add your party/enemies above.
                  </div>
                ) : (
                  combatants.map((cmb, idx) => {
                    const isCurrent = idx === currentTurnIdx;
                    return (
                      <div
                        key={cmb.id}
                        className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 transition-all ${
                          isCurrent
                            ? "border-amber-400 bg-[#3d2e1c] shadow-lg ring-2 ring-amber-500/50"
                            : cmb.isPlayer
                            ? "border-[#80643d] bg-[#30271e]"
                            : "border-red-900 bg-[#281b1b]"
                        }`}
                      >
                        <div className="flex min-w-[220px] items-center gap-4">
                          <div className="text-center">
                            <span className="block text-[10px] text-[#b8a17d]">INIT</span>
                            <input
                              type="number"
                              aria-label={`${cmb.name} initiative`}
                              value={cmb.initiative}
                              onChange={(e) =>
                                updateCombatant(cmb.id, { initiative: Number(e.target.value) })
                              }
                              className="h-9 w-14 rounded-lg border border-[#80643d] bg-[#211c17] text-center font-mono text-base font-bold text-white outline-none focus:border-[#e5bd70]"
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-lg font-bold text-white">{cmb.name}</h4>
                              <span
                                className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                                  cmb.isPlayer
                                    ? "border-blue-600 bg-blue-900 text-blue-200"
                                    : "border-red-700 bg-red-950 text-red-300"
                                }`}
                              >
                                {cmb.isPlayer ? "PLAYER" : "ENEMY"}
                              </span>
                              {isCurrent && <span className="text-xs font-bold text-amber-300">CURRENT TURN</span>}
                            </div>
                            <input
                              type="text"
                              value={cmb.notes}
                              onChange={(e) => updateCombatant(cmb.id, { notes: e.target.value })}
                              placeholder="Conditions or notes..."
                              className="mt-1 w-full border-b border-[#80643d]/40 bg-transparent text-xs text-[#b8a17d] outline-none focus:border-[#e5bd70]"
                            />
                          </div>
                        </div>

                        <div className="min-w-[60px] rounded-lg border border-[#80643d] bg-[#211c17] px-3 py-1.5 text-center">
                          <span className="block text-[10px] font-bold text-[#b8a17d]">ARMOR CLASS</span>
                          <span className="font-mono text-base font-bold text-white">{cmb.ac}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#80643d] bg-[#211c17] p-2">
                          <div>
                            <span className="block text-center text-[10px] font-bold text-[#b8a17d]">HIT POINTS</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={cmb.hpCurrent}
                                onChange={(e) =>
                                  updateCombatant(cmb.id, { hpCurrent: Number(e.target.value) })
                                }
                                className={`${inputCls} w-16 px-1 py-1 text-center text-sm font-bold`}
                              />
                              <span className="text-xs text-[#b8a17d]">/ {cmb.hpMax}</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => updateCombatant(cmb.id, { hpCurrent: cmb.hpCurrent - 5 })}
                              className="rounded border border-red-800 bg-red-950 px-1.5 py-0.5 text-[10px] font-bold text-red-300 hover:bg-red-900"
                            >
                              -5 HP
                            </button>
                            <button
                              onClick={() => updateCombatant(cmb.id, { hpCurrent: cmb.hpCurrent + 5 })}
                              className="rounded border border-green-800 bg-green-950 px-1.5 py-0.5 text-[10px] font-bold text-green-300 hover:bg-green-900"
                            >
                              +5 HP
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={() => removeCombatant(cmb.id)}
                          className="px-2 text-lg text-[#b8a17d] hover:text-red-400"
                          title="Remove from Combat"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ==================================================================
              PARTY INSPECTOR
              ================================================================== */}
          {activeTab === "party" && (
            <div className="space-y-6">
              {characters.length === 0 ? (
                <div className={`${panelCls} py-12 text-center text-[#b8a17d]`}>
                  No player characters found in this campaign. Have your players build characters on
                  the 👥 Characters page.
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {characters.map((c) => {
                    const pb = profBonus(c.level);
                    const wisMod = modOf(abilityScore(c, "wis"));
                    const intMod = modOf(abilityScore(c, "int"));

                    const percProf = c.skillProf?.Perception ?? 0;
                    const insProf = c.skillProf?.Insight ?? 0;
                    const invProf = c.skillProf?.Investigation ?? 0;

                    const passivePerception = 10 + wisMod + pb * percProf;
                    const passiveInsight = 10 + wisMod + pb * insProf;
                    const passiveInvestigation = 10 + intMod + pb * invProf;

                    const hpPct = c.hp?.max ? (c.hp.current / c.hp.max) * 100 : 0;

                    return (
                      <section
                        key={c.id}
                        className={`${panelCls} flex flex-col justify-between space-y-4`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2 border-b border-[#80643d]/30 pb-3">
                            <div>
                              <h2 className="text-2xl font-bold text-white">
                                {c.name || "Unnamed Adventurer"}
                              </h2>
                              <p className="text-xs text-[#b8a17d]">
                                Lvl {c.level} {c.race} {c.className}
                              </p>
                            </div>

                            <button
                              onClick={() => updateCharacter(c.id, { inspiration: !c.inspiration })}
                              className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                                c.inspiration
                                  ? "border-amber-400 bg-amber-900 text-amber-200"
                                  : "border-gray-600 bg-gray-800 text-gray-400 hover:border-amber-500"
                              }`}
                            >
                              {c.inspiration ? "✦ Inspired" : "Grant Inspiration"}
                            </button>
                          </div>

                          <div>
                            <div className="mb-1 flex justify-between text-xs font-bold">
                              <span>Hit Points</span>
                              <span>
                                {c.hp?.current}/{c.hp?.max}
                                {c.hp?.temp ? ` (+${c.hp.temp} Temp)` : ""}
                              </span>
                            </div>

                            <div className="h-3 overflow-hidden rounded-full bg-[#211c17]">
                              <div
                                className={`h-full transition-all ${
                                  hpPct > 50
                                    ? "bg-green-600"
                                    : hpPct > 25
                                    ? "bg-yellow-600"
                                    : "bg-red-700"
                                }`}
                                style={{ width: `${Math.max(0, Math.min(100, hpPct))}%` }}
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
                              className="rounded border border-red-800 bg-red-950 px-2 py-1 text-xs font-bold text-red-300 hover:bg-red-900"
                            >
                              -5 HP
                            </button>

                            <button
                              onClick={() =>
                                updateCharacter(c.id, {
                                  hp: {
                                    ...c.hp,
                                    current: Math.min(c.hp?.max || 10, (c.hp?.current || 0) + 5),
                                  },
                                })
                              }
                              className="rounded border border-green-800 bg-green-950 px-2 py-1 text-xs font-bold text-green-300 hover:bg-green-900"
                            >
                              +5 HP
                            </button>

                            <label className="ml-auto flex items-center gap-1 text-xs text-[#b8a17d]">
                              Set AC:
                              <input
                                type="number"
                                value={c.ac || 10}
                                onChange={(e) =>
                                  updateCharacter(c.id, { ac: Number(e.target.value) || 10 })
                                }
                                className={`${inputCls} w-14 px-1 py-0.5 text-center text-xs`}
                              />
                            </label>
                          </div>

                          <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
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
                                  className="rounded border border-red-700 bg-red-950 px-2 py-0.5 text-[10px] font-bold text-red-300"
                                >
                                  {cond}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="pt-2">
                          <label className="mb-1 block text-xs font-bold text-purple-300">
                            🔒 Secret DM Notes
                          </label>
                          <textarea
                            rows={3}
                            value={c.dmNotes || ""}
                            onChange={(e) => updateCharacter(c.id, { dmNotes: e.target.value })}
                            placeholder="Secret curse, plot hook, pending passive triggers..."
                            className={`${inputCls} w-full border-purple-800 bg-[#1c1524] font-mono text-xs`}
                          />
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================================================================
              RULES & DCS
              ================================================================== */}
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
                  {COVER_RULES.map((c) => (
                    <div
                      key={c.type}
                      className="rounded-lg border border-[#80643d]/60 bg-[#211c17] p-3"
                    >
                      <h4 className="mb-1 font-bold text-amber-300">{c.type}</h4>
                      <p className="text-[#b8a17d]">{c.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      )}
    </main>
  );
}