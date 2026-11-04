TSX
"use client";
 
import { useEffect, useRef, useState } from "react";
import { supabase } from "../components/supabaseClient";
import { useActiveCampaign } from "../components/CampaignShell";
 
const ABILITIES = [
  { key: "str", label: "Strength" },
  { key: "dex", label: "Dexterity" },
  { key: "con", label: "Constitution" },
  { key: "int", label: "Intelligence" },
  { key: "wis", label: "Wisdom" },
  { key: "cha", label: "Charisma" },
] as const;
 
type AbilityKey = (typeof ABILITIES)[number]["key"];
 
const SKILLS: { name: string; ability: AbilityKey }[] = [
  { name: "Acrobatics", ability: "dex" },
  { name: "Animal Handling", ability: "wis" },
  { name: "Arcana", ability: "int" },
  { name: "Athletics", ability: "str" },
  { name: "Deception", ability: "cha" },
  { name: "History", ability: "int" },
  { name: "Insight", ability: "wis" },
  { name: "Intimidation", ability: "cha" },
  { name: "Investigation", ability: "int" },
  { name: "Medicine", ability: "wis" },
  { name: "Nature", ability: "int" },
  { name: "Perception", ability: "wis" },
  { name: "Performance", ability: "cha" },
  { name: "Persuasion", ability: "cha" },
  { name: "Religion", ability: "int" },
  { name: "Sleight of Hand", ability: "dex" },
  { name: "Stealth", ability: "dex" },
  { name: "Survival", ability: "wis" },
];
 
const CONDITIONS = [
  "Blinded", "Charmed", "Deafened", "Exhaustion", "Frightened", "Grappled",
  "Incapacitated", "Invisible", "Paralyzed", "Petrified", "Poisoned",
  "Prone", "Restrained", "Stunned", "Unconscious",
];
 
type Attack = { id: string; name: string; bonus: string; damage: string };
 
type Character = {
  id: string;
  name: string;
  race: string;
  className: string;
  level: number;
  background: string;
  alignment: string;
  abilities: Record<AbilityKey, number>;
  saveProf: Record<AbilityKey, boolean>;
  skillProf: Record<string, number>; // 0 none, 1 proficient, 2 expertise
  hp: { current: number; max: number; temp: number };
  ac: number;
  speed: number;
  initiativeBonus: number;
  inspiration: boolean;
  deathSaves: { successes: number; failures: number };
  conditions: string[];
  spellSlots: { max: number; used: number }[];
  attacks: Attack[];
  features: string;
  notes: string;
};
 
const newCharacter = (): Character => ({
  id: crypto.randomUUID(),
  name: "New adventurer",
  race: "",
  className: "",
  level: 1,
  background: "",
  alignment: "",
  abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  saveProf: { str: false, dex: false, con: false, int: false, wis: false, cha: false },
  skillProf: {},
  hp: { current: 10, max: 10, temp: 0 },
  ac: 10,
  speed: 30,
  initiativeBonus: 0,
  inspiration: false,
  deathSaves: { successes: 0, failures: 0 },
  conditions: [],
  spellSlots: Array.from({ length: 9 }, () => ({ max: 0, used: 0 })),
  attacks: [],
  features: "",
  notes: "",
});
 
const modOf = (score: number) => Math.floor((score - 10) / 2);
const profBonus = (level: number) => Math.ceil(level / 4) + 1;
const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
const num = (v: string) => Number(v) || 0;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
 
const inputCls =
  "rounded-lg border border-[#80643d] bg-[#211c17] px-3 py-2 text-white outline-none focus:border-[#e5bd70]";
const panelCls = "rounded-xl border border-[#80643d] bg-[#30271e] p-5";
const btnCls = "rounded-lg bg-[#80643d] px-4 py-2 font-bold text-white hover:bg-[#a17b45]";
 
function Pips({
  total,
  filled,
  onChange,
  label,
}: {
  total: number;
  filled: number;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`${label} ${i + 1}`}
          onClick={() => onChange(i + 1 === filled ? i : i + 1)}
          className={`h-5 w-5 rounded-full border-2 border-[#e5bd70] ${
            i < filled ? "bg-[#e5bd70]" : "bg-transparent"
          }`}
        />
      ))}
    </div>
  );
}
 
function hpColor(current: number, max: number) {
  const p = max > 0 ? current / max : 0;
  return p > 0.5 ? "bg-green-600" : p > 0.25 ? "bg-yellow-600" : "bg-red-700";
}
 
export default function CharactersPage() {
  const [chars, setChars] = useState<Character[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hpAmount, setHpAmount] = useState(1);
 
  const campaign = useActiveCampaign();
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
 
  // Load only this campaign's characters
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setSelectedId(null);
    supabase
      .from("characters")
      .select("data")
      .eq("campaign_id", campaign.id)
      .order("created_at")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("Could not load characters", error);
        else setChars((data ?? []).map((row) => row.data as Character));
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [campaign.id]);
 
  // Save a character (waits 0.6s after the last edit so typing isn't spammy)
  function persist(ch: Character) {
    clearTimeout(saveTimers.current[ch.id]);
    saveTimers.current[ch.id] = setTimeout(() => {
      supabase
        .from("characters")
        .upsert({
          id: ch.id,
          campaign_id: campaign.id,
          data: ch,
          updated_at: new Date().toISOString(),
        })
        .then(({ error }) => {
          if (error) console.error("Could not save character", error);
        });
    }, 600);
  }
 
  const c = chars.find((x) => x.id === selectedId);
 
  function update(patch: Partial<Character>) {
    if (!c) return;
    const next = { ...c, ...patch };
    setChars((prev) => prev.map((x) => (x.id === c.id ? next : x)));
    persist(next);
  }
 
  function addCharacter() {
    const created = newCharacter();
    setChars((prev) => [...prev, created]);
    setSelectedId(created.id);
    persist(created);
  }
 
  function deleteCharacter() {
    if (!c || !window.confirm(`Delete ${c.name}?`)) return;
    clearTimeout(saveTimers.current[c.id]);
    supabase
      .from("characters")
      .delete()
      .eq("id", c.id)
      .then(({ error }) => {
        if (error) console.error("Could not delete character", error);
      });
    setChars((prev) => prev.filter((x) => x.id !== c.id));
    setSelectedId(null);
  }
 
  function damage() {
    if (!c || hpAmount <= 0) return;
    const absorbed = Math.min(c.hp.temp, hpAmount);
    const rest = hpAmount - absorbed;
    update({
      hp: { ...c.hp, temp: c.hp.temp - absorbed, current: Math.max(0, c.hp.current - rest) },
    });
  }
 
  function heal() {
    if (!c || hpAmount <= 0) return;
    update({
      hp: { ...c.hp, current: Math.min(c.hp.max, c.hp.current + hpAmount) },
      deathSaves: { successes: 0, failures: 0 },
    });
  }
 
  if (!loaded) return <div className="bg-[#211c17] p-8 text-[#e5bd70]">Loading characters...</div>;
 
  /* ---------- Character list ---------- */
  if (!c) {
    return (
      <main className="bg-[#211c17] p-4 text-[#e5bd70] md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="mb-2 text-3xl font-bold sm:text-5xl">Characters</h1>
              <p className="text-lg text-[#b8a17d]">Your party, their stats and their stories.</p>
            </div>
            <button onClick={addCharacter} className={btnCls}>
              + New character
            </button>
          </div>
 
          {chars.length === 0 ? (
            <div className={`${panelCls} p-8 text-center`}>
              <p className="text-[#b8a17d]">No characters yet. Create your first adventurer.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {chars.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setSelectedId(ch.id)}
                  className="rounded-xl border border-[#80643d] bg-[#30271e] p-5 text-left hover:border-[#e5bd70]"
                >
                  <h2 className="truncate text-2xl font-bold">{ch.name || "Unnamed"}</h2>
                  <p className="mb-3 truncate text-sm text-[#b8a17d]">
                    Level {ch.level} {ch.race} {ch.className}
                  </p>
                  <div className="mb-2 h-3 overflow-hidden rounded-full bg-[#211c17]">
                    <div
                      className={`h-full ${hpColor(ch.hp.current, ch.hp.max)}`}
                      style={{ width: `${ch.hp.max ? (ch.hp.current / ch.hp.max) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-sm">
                    HP {ch.hp.current}/{ch.hp.max} · AC {ch.ac}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }
 
  /* ---------- Character sheet ---------- */
  const pb = profBonus(c.level);
  const skillBonus = (name: string, ability: AbilityKey) =>
    modOf(c.abilities[ability]) + pb * (c.skillProf[name] ?? 0);
  const passivePerception = 10 + skillBonus("Perception", "wis");
  const hpPct = c.hp.max ? (c.hp.current / c.hp.max) * 100 : 0;
 
  return (
    <main className="bg-[#211c17] p-4 text-[#e5bd70] md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setSelectedId(null)}
            className="rounded-lg border border-[#80643d] px-4 py-2 hover:bg-[#30271e]"
          >
            ← All characters
          </button>
          <button
            onClick={deleteCharacter}
            className="rounded-lg bg-red-900 px-4 py-2 text-sm text-white hover:bg-red-700"
          >
            Delete character
          </button>
        </div>
 
        {/* Header */}
        <section className={`${panelCls} mb-6`}>
          <input
            value={c.name}
            onChange={(e) => update({ name: e.target.value })}
            aria-label="Character name"
            className="mb-4 w-full bg-transparent text-2xl font-bold outline-none sm:text-4xl"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input
              className={inputCls}
              placeholder="Race"
              value={c.race}
              onChange={(e) => update({ race: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="Class"
              value={c.className}
              onChange={(e) => update({ className: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="Background"
              value={c.background}
              onChange={(e) => update({ background: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="Alignment"
              value={c.alignment}
              onChange={(e) => update({ alignment: e.target.value })}
            />
            <label className="flex items-center gap-2">
              <span className="text-sm text-[#b8a17d]">Level</span>
              <input
                type="number"
                min={1}
                max={20}
                className={`${inputCls} w-20`}
                value={c.level}
                onChange={(e) => update({ level: clamp(num(e.target.value), 1, 20) })}
              />
            </label>
          </div>
        </section>
 
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column: abilities, saves, skills */}
          <div className="space-y-6">
            <section className={panelCls}>
              <h2 className="mb-3 text-xl font-bold">Abilities</h2>
              <div className="grid grid-cols-3 gap-3">
                {ABILITIES.map((a) => (
                  <div
                    key={a.key}
                    className="rounded-lg border border-[#80643d] bg-[#211c17] p-2 text-center"
                  >
                    <p className="text-xs text-[#b8a17d]">{a.label.slice(0, 3)}</p>
                    <p className="text-2xl font-bold text-white">
                      {sign(modOf(c.abilities[a.key]))}
                    </p>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      aria-label={a.label}
                      value={c.abilities[a.key]}
                      onChange={(e) =>
                        update({
                          abilities: {
                            ...c.abilities,
                            [a.key]: clamp(num(e.target.value), 1, 30),
                          },
                        })
                      }
                      className="w-full rounded border border-[#80643d] bg-[#30271e] text-center text-white outline-none"
                    />
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm text-[#b8a17d]">
                Proficiency bonus {sign(pb)} · Passive Perception {passivePerception}
              </p>
            </section>
 
            <section className={panelCls}>
              <h2 className="mb-3 text-xl font-bold">Saving throws</h2>
              <ul className="space-y-1">
                {ABILITIES.map((a) => {
                  const prof = c.saveProf[a.key];
                  const bonus = modOf(c.abilities[a.key]) + (prof ? pb : 0);
                  return (
                    <li key={a.key}>
                      <button
                        onClick={() =>
                          update({ saveProf: { ...c.saveProf, [a.key]: !prof } })
                        }
                        className="flex w-full items-center gap-3 rounded px-1 py-1 text-left hover:bg-[#3b3024]"
                      >
                        <span className="w-4">{prof ? "●" : "○"}</span>
                        <span className="w-10 font-bold text-white">{sign(bonus)}</span>
                        <span>{a.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
 
            <section className={panelCls}>
              <h2 className="mb-1 text-xl font-bold">Skills</h2>
              <p className="mb-3 text-xs text-[#b8a17d]">
                Click to cycle: ○ none, ● proficient, ◆ expertise
              </p>
              <ul className="space-y-1">
                {SKILLS.map((s) => {
                  const level = c.skillProf[s.name] ?? 0;
                  return (
                    <li key={s.name}>
                      <button
                        onClick={() =>
                          update({ skillProf: { ...c.skillProf, [s.name]: (level + 1) % 3 } })
                        }
                        className="flex w-full items-center gap-3 rounded px-1 py-1 text-left hover:bg-[#3b3024]"
                      >
                        <span className="w-4">{["○", "●", "◆"][level]}</span>
                        <span className="w-10 font-bold text-white">
                          {sign(skillBonus(s.name, s.ability))}
                        </span>
                        <span>
                          {s.name}{" "}
                          <span className="text-xs text-[#b8a17d]">({s.ability})</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
 
          {/* Middle column: combat */}
          <div className="space-y-6">
            <section className={panelCls}>
              <h2 className="mb-3 text-xl font-bold">Combat</h2>
              <div className="mb-4 grid grid-cols-3 gap-3 text-center">
                <label className="rounded-lg border border-[#80643d] bg-[#211c17] p-2">
                  <span className="block text-xs text-[#b8a17d]">Armor Class</span>
                  <input
                    type="number"
                    value={c.ac}
                    onChange={(e) => update({ ac: num(e.target.value) })}
                    className="w-full bg-transparent text-center text-2xl font-bold text-white outline-none"
                  />
                </label>
                <div className="rounded-lg border border-[#80643d] bg-[#211c17] p-2">
                  <span className="block text-xs text-[#b8a17d]">Initiative</span>
                  <p className="text-2xl font-bold text-white">
                    {sign(modOf(c.abilities.dex) + c.initiativeBonus)}
                  </p>
                </div>
                <label className="rounded-lg border border-[#80643d] bg-[#211c17] p-2">
                  <span className="block text-xs text-[#b8a17d]">Speed</span>
                  <input
                    type="number"
                    value={c.speed}
                    onChange={(e) => update({ speed: num(e.target.value) })}
                    className="w-full bg-transparent text-center text-2xl font-bold text-white outline-none"
                  />
                </label>
              </div>
              <label className="mb-4 flex items-center gap-2 text-sm text-[#b8a17d]">
                Extra initiative bonus
                <input
                  type="number"
                  value={c.initiativeBonus}
                  onChange={(e) => update({ initiativeBonus: num(e.target.value) })}
                  className={`${inputCls} w-20`}
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={c.inspiration}
                  onChange={(e) => update({ inspiration: e.target.checked })}
                />
                Inspiration ✦
              </label>
            </section>
 
            <section className={panelCls}>
              <h2 className="mb-3 text-xl font-bold">Hit points</h2>
              <div className="mb-3 h-4 overflow-hidden rounded-full bg-[#211c17]">
                <div
                  className={`h-full transition-all ${hpColor(c.hp.current, c.hp.max)}`}
                  style={{ width: `${hpPct}%` }}
                />
              </div>
              <div className="mb-4 grid grid-cols-3 gap-3 text-center">
                <label>
                  <span className="block text-xs text-[#b8a17d]">Current</span>
                  <input
                    type="number"
                    value={c.hp.current}
                    onChange={(e) =>
                      update({
                        hp: { ...c.hp, current: clamp(num(e.target.value), 0, c.hp.max) },
                      })
                    }
                    className={`${inputCls} w-full text-center`}
                  />
                </label>
                <label>
                  <span className="block text-xs text-[#b8a17d]">Max</span>
                  <input
                    type="number"
                    value={c.hp.max}
                    onChange={(e) => {
                      const max = Math.max(1, num(e.target.value));
                      update({ hp: { ...c.hp, max, current: Math.min(c.hp.current, max) } });
                    }}
                    className={`${inputCls} w-full text-center`}
                  />
                </label>
                <label>
                  <span className="block text-xs text-[#b8a17d]">Temp</span>
                  <input
                    type="number"
                    value={c.hp.temp}
                    onChange={(e) =>
                      update({ hp: { ...c.hp, temp: Math.max(0, num(e.target.value)) } })
                    }
                    className={`${inputCls} w-full text-center`}
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={hpAmount}
                  onChange={(e) => setHpAmount(Math.max(0, num(e.target.value)))}
                  aria-label="Amount"
                  className={`${inputCls} w-24`}
                />
                <button onClick={damage} className="rounded-lg bg-red-900 px-4 py-2 font-bold text-white hover:bg-red-700">
                  Damage
                </button>
                <button onClick={heal} className="rounded-lg bg-green-800 px-4 py-2 font-bold text-white hover:bg-green-700">
                  Heal
                </button>
              </div>
              <p className="mt-2 text-xs text-[#b8a17d]">Damage uses up temp HP first.</p>
 
              {c.hp.current === 0 && (
                <div className="mt-4 rounded-lg border border-red-800 bg-[#211c17] p-3">
                  <p className="mb-2 font-bold">Down! Death saves</p>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm">Successes</span>
                    <Pips
                      total={3}
                      filled={c.deathSaves.successes}
                      label="Success"
                      onChange={(n) => update({ deathSaves: { ...c.deathSaves, successes: n } })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Failures</span>
                    <Pips
                      total={3}
                      filled={c.deathSaves.failures}
                      label="Failure"
                      onChange={(n) => update({ deathSaves: { ...c.deathSaves, failures: n } })}
                    />
                  </div>
                </div>
              )}
            </section>
 
            <section className={panelCls}>
              <h2 className="mb-3 text-xl font-bold">Conditions</h2>
              <div className="flex flex-wrap gap-2">
                {CONDITIONS.map((cond) => {
                  const on = c.conditions.includes(cond);
                  return (
                    <button
                      key={cond}
                      onClick={() =>
                        update({
                          conditions: on
                            ? c.conditions.filter((x) => x !== cond)
                            : [...c.conditions, cond],
                        })
                      }
                      className={`rounded-full border px-3 py-1 text-sm ${
                        on
                          ? "border-[#e5bd70] bg-[#59402b] font-bold text-white"
                          : "border-[#80643d] text-[#b8a17d] hover:bg-[#3b3024]"
                      }`}
                    >
                      {cond}
                    </button>
                  );
                })}
              </div>
            </section>
 
            <section className={panelCls}>
              <h2 className="mb-3 text-xl font-bold">Attacks</h2>
              {c.attacks.length === 0 && (
                <p className="mb-3 text-sm text-[#b8a17d]">No attacks yet.</p>
              )}
              <div className="space-y-2">
                {c.attacks.map((atk) => (
                  <div key={atk.id} className="flex gap-2">
                    {(["name", "bonus", "damage"] as const).map((field) => (
                      <input
                        key={field}
                        placeholder={field === "name" ? "Longsword" : field === "bonus" ? "+5" : "1d8+3"}
                        aria-label={`Attack ${field}`}
                        value={atk[field]}
                        onChange={(e) =>
                          update({
                            attacks: c.attacks.map((x) =>
                              x.id === atk.id ? { ...x, [field]: e.target.value } : x
                            ),
                          })
                        }
                        className={`${inputCls} min-w-0 ${field === "name" ? "flex-[2]" : "flex-1"}`}
                      />
                    ))}
                    <button
                      aria-label="Remove attack"
                      onClick={() => update({ attacks: c.attacks.filter((x) => x.id !== atk.id) })}
                      className="px-2 text-[#b8a17d] hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() =>
                  update({
                    attacks: [
                      ...c.attacks,
                      { id: crypto.randomUUID(), name: "", bonus: "", damage: "" },
                    ],
                  })
                }
                className={`${btnCls} mt-3`}
              >
                + Add attack
              </button>
            </section>
          </div>
 
          {/* Right column: spells, features, notes */}
          <div className="space-y-6">
            <section className={panelCls}>
              <h2 className="mb-1 text-xl font-bold">Spell slots</h2>
              <p className="mb-3 text-xs text-[#b8a17d]">
                Set the max for each level, then click a circle to mark a slot as used.
              </p>
              <ul className="space-y-2">
                {c.spellSlots.map((slot, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="w-12 text-sm">Lv {i + 1}</span>
                    <input
                      type="number"
                      min={0}
                      max={9}
                      aria-label={`Level ${i + 1} max slots`}
                      value={slot.max}
                      onChange={(e) => {
                        const max = clamp(num(e.target.value), 0, 9);
                        update({
                          spellSlots: c.spellSlots.map((s, j) =>
                            j === i ? { max, used: Math.min(s.used, max) } : s
                          ),
                        });
                      }}
                      className={`${inputCls} w-16 px-2 py-1`}
                    />
                    <Pips
                      total={slot.max}
                      filled={slot.used}
                      label={`Level ${i + 1} slot`}
                      onChange={(n) =>
                        update({
                          spellSlots: c.spellSlots.map((s, j) =>
                            j === i ? { ...s, used: n } : s
                          ),
                        })
                      }
                    />
                  </li>
                ))}
              </ul>
              <button
                onClick={() =>
                  update({ spellSlots: c.spellSlots.map((s) => ({ ...s, used: 0 })) })
                }
                className="mt-4 rounded-lg border border-[#80643d] px-4 py-2 hover:bg-[#3b3024]"
              >
                Long rest: restore all slots
              </button>
            </section>
 
            <section className={panelCls}>
              <h2 className="mb-3 text-xl font-bold">Features &amp; traits</h2>
              <textarea
                rows={7}
                value={c.features}
                onChange={(e) => update({ features: e.target.value })}
                placeholder="Class features, racial traits, feats..."
                className={`${inputCls} w-full`}
              />
            </section>
 
            <section className={panelCls}>
              <h2 className="mb-3 text-xl font-bold">Notes</h2>
              <textarea
                rows={7}
                value={c.notes}
                onChange={(e) => update({ notes: e.target.value })}
                placeholder="Backstory, bonds, flaws, session notes..."
                className={`${inputCls} w-full`}
              />
            </section>
          </div>
        </div>
 
        <p className="mt-8 text-xs text-[#80643d]">
          Characters are saved to your campaign online.
        </p>
      </div>
    </main>
  );
}
 