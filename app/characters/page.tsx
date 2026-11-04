"use client";

import { useEffect, useState } from "react";

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
type CustomTracker = { id: string; name: string; max: number; used: number };

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
  spellcastingAbility?: AbilityKey;
  spellsList?: string;
  spellSlots: { max: number; used: number }[];
  trackers?: CustomTracker[];
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
  spellcastingAbility: "int",
  spellsList: "",
  spellSlots: Array.from({ length: 9 }, () => ({ max: 0, used: 0 })),
  trackers: [
    { id: crypto.randomUUID(), name: "Rage / Feature", max: 2, used: 0 },
  ],
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

/* ==========================================================================
   RACES & CLASSES DATA TABLES
   ========================================================================== */

interface RaceData {
  name: string;
  speed: number;
  abilityBonuses: Partial<Record<AbilityKey, number>>;
  traits: string[];
}

interface ClassData {
  name: string;
  hitDie: number;
  savingThrows: AbilityKey[];
  defaultSpellcastingAbility?: AbilityKey;
  featuresByLevel: Record<number, string[]>;
  spellSlotsByLevel?: Record<number, number[]>;
}

export const RACES: Record<string, RaceData> = {
  Dragonborn: {
    name: "Dragonborn",
    speed: 30,
    abilityBonuses: { str: 2, cha: 1 },
    traits: ["Draconic Ancestry", "Breath Weapon", "Damage Resistance"],
  },
  Dwarf: {
    name: "Dwarf (Hill)",
    speed: 25,
    abilityBonuses: { con: 2, wis: 1 },
    traits: ["Darkvision (60ft)", "Dwarven Resilience", "Dwarven Toughness (+1 HP/lvl)", "Stonecunning"],
  },
  Elf: {
    name: "Elf (High)",
    speed: 30,
    abilityBonuses: { dex: 2, int: 1 },
    traits: ["Darkvision (60ft)", "Keen Senses", "Fey Ancestry", "Trance", "Bonus Cantrip"],
  },
  WoodElf: {
    name: "Elf (Wood)",
    speed: 35,
    abilityBonuses: { dex: 2, wis: 1 },
    traits: ["Darkvision (60ft)", "Keen Senses", "Fey Ancestry", "Trance", "Fleet of Foot", "Mask of the Wild"],
  },
  Gnome: {
    name: "Gnome (Rock)",
    speed: 25,
    abilityBonuses: { int: 2, con: 1 },
    traits: ["Darkvision (60ft)", "Gnome Cunning", "Artificer's Lore", "Tinker"],
  },
  HalfElf: {
    name: "Half-Elf",
    speed: 30,
    abilityBonuses: { cha: 2 },
    traits: ["Darkvision (60ft)", "Fey Ancestry", "Skill Versatility (+2 Skills)"],
  },
  HalfOrc: {
    name: "Half-Orc",
    speed: 30,
    abilityBonuses: { str: 2, con: 1 },
    traits: ["Darkvision (60ft)", "Menacing", "Relentless Endurance", "Savage Attacks"],
  },
  Halfling: {
    name: "Halfling (Lightfoot)",
    speed: 25,
    abilityBonuses: { dex: 2, cha: 1 },
    traits: ["Lucky", "Brave", "Halfling Nimbleness", "Naturally Stealthy"],
  },
  Human: {
    name: "Human",
    speed: 30,
    abilityBonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    traits: ["Extra Language"],
  },
  Tiefling: {
    name: "Tiefling",
    speed: 30,
    abilityBonuses: { cha: 2, int: 1 },
    traits: ["Darkvision (60ft)", "Hellish Resistance", "Infernal Legacy"],
  },
};

const FULL_CASTER = {
  1: [2,0,0,0,0,0,0,0,0], 2: [3,0,0,0,0,0,0,0,0], 3: [4,2,0,0,0,0,0,0,0], 4: [4,3,0,0,0,0,0,0,0],
  5: [4,3,2,0,0,0,0,0,0], 6: [4,3,3,0,0,0,0,0,0], 7: [4,3,3,1,0,0,0,0,0], 8: [4,3,3,2,0,0,0,0,0],
  9: [4,3,3,3,1,0,0,0,0], 10: [4,3,3,3,2,0,0,0,0], 11: [4,3,3,3,2,1,0,0,0], 12: [4,3,3,3,2,1,0,0,0],
  13: [4,3,3,3,2,1,1,0,0], 14: [4,3,3,3,2,1,1,0,0], 15: [4,3,3,3,2,1,1,1,0], 16: [4,3,3,3,2,1,1,1,0],
  17: [4,3,3,3,2,1,1,1,1], 18: [4,3,3,3,3,1,1,1,1], 19: [4,3,3,3,3,2,1,1,1], 20: [4,3,3,3,3,2,2,1,1],
};

const HALF_CASTER = {
  1: [0,0,0,0,0,0,0,0,0], 2: [2,0,0,0,0,0,0,0,0], 3: [3,0,0,0,0,0,0,0,0], 4: [3,0,0,0,0,0,0,0,0],
  5: [4,2,0,0,0,0,0,0,0], 6: [4,2,0,0,0,0,0,0,0], 7: [4,3,0,0,0,0,0,0,0], 8: [4,3,0,0,0,0,0,0,0],
  9: [4,3,2,0,0,0,0,0,0], 10: [4,3,2,0,0,0,0,0,0], 11: [4,3,3,0,0,0,0,0,0], 12: [4,3,3,0,0,0,0,0,0],
  13: [4,3,3,1,0,0,0,0,0], 14: [4,3,3,1,0,0,0,0,0], 15: [4,3,3,2,0,0,0,0,0], 16: [4,3,3,2,0,0,0,0,0],
  17: [4,3,3,3,1,0,0,0,0], 18: [4,3,3,3,1,0,0,0,0], 19: [4,3,3,3,2,0,0,0,0], 20: [4,3,3,3,2,0,0,0,0],
};

const ARTIFICER_SLOTS = {
  1: [2,0,0,0,0,0,0,0,0], 2: [2,0,0,0,0,0,0,0,0], 3: [3,0,0,0,0,0,0,0,0], 4: [3,0,0,0,0,0,0,0,0],
  5: [4,2,0,0,0,0,0,0,0], 6: [4,2,0,0,0,0,0,0,0], 7: [4,3,0,0,0,0,0,0,0], 8: [4,3,0,0,0,0,0,0,0],
  9: [4,3,2,0,0,0,0,0,0], 10: [4,3,2,0,0,0,0,0,0], 11: [4,3,3,0,0,0,0,0,0], 12: [4,3,3,0,0,0,0,0,0],
  13: [4,3,3,1,0,0,0,0,0], 14: [4,3,3,1,0,0,0,0,0], 15: [4,3,3,2,0,0,0,0,0], 16: [4,3,3,2,0,0,0,0,0],
  17: [4,3,3,3,1,0,0,0,0], 18: [4,3,3,3,1,0,0,0,0], 19: [4,3,3,3,2,0,0,0,0], 20: [4,3,3,3,2,0,0,0,0],
};

const WARLOCK_SLOTS = {
  1: [1,0,0,0,0,0,0,0,0], 2: [2,0,0,0,0,0,0,0,0], 3: [0,2,0,0,0,0,0,0,0], 4: [0,2,0,0,0,0,0,0,0],
  5: [0,0,2,0,0,0,0,0,0], 6: [0,0,2,0,0,0,0,0,0], 7: [0,0,0,2,0,0,0,0,0], 8: [0,0,0,2,0,0,0,0,0],
  9: [0,0,0,0,2,0,0,0,0], 10: [0,0,0,0,2,0,0,0,0], 11: [0,0,0,0,3,0,0,0,0], 12: [0,0,0,0,3,0,0,0,0],
  13: [0,0,0,0,3,0,0,0,0], 14: [0,0,0,0,3,0,0,0,0], 15: [0,0,0,0,3,0,0,0,0], 16: [0,0,0,0,3,0,0,0,0],
  17: [0,0,0,0,4,0,0,0,0], 18: [0,0,0,0,4,0,0,0,0], 19: [0,0,0,0,4,0,0,0,0], 20: [0,0,0,0,4,0,0,0,0],
};

export const CLASSES: Record<string, ClassData> = {
  Artificer: {
    name: "Artificer",
    hitDie: 8,
    savingThrows: ["con", "int"],
    defaultSpellcastingAbility: "int",
    spellSlotsByLevel: ARTIFICER_SLOTS,
    featuresByLevel: {
      1: ["Magical Tinkering", "Spellcasting"],
      2: ["Infuse Item (4 infusions)"],
      3: ["Artificer Specialist", "The Right Tool for the Job"],
      4: ["Ability Score Improvement"],
      5: ["Artificer Specialist Feature", "Extra Attack (Battle Smith/Armorer)"],
    },
  },
  Barbarian: {
    name: "Barbarian",
    hitDie: 12,
    savingThrows: ["str", "con"],
    featuresByLevel: {
      1: ["Rage", "Unarmored Defense"],
      2: ["Reckless Attack", "Danger Sense"],
      3: ["Primal Path"],
      4: ["Ability Score Improvement"],
      5: ["Extra Attack", "Fast Movement"],
    },
  },
  Bard: {
    name: "Bard",
    hitDie: 8,
    savingThrows: ["dex", "cha"],
    defaultSpellcastingAbility: "cha",
    spellSlotsByLevel: FULL_CASTER,
    featuresByLevel: {
      1: ["Spellcasting", "Bardic Inspiration (d6)"],
      2: ["Jack of All Trades", "Song of Rest (d6)"],
      3: ["Bard College", "Expertise"],
      4: ["Ability Score Improvement"],
      5: ["Font of Inspiration", "Bardic Inspiration (d8)"],
    },
  },
  Cleric: {
    name: "Cleric",
    hitDie: 8,
    savingThrows: ["wis", "cha"],
    defaultSpellcastingAbility: "wis",
    spellSlotsByLevel: FULL_CASTER,
    featuresByLevel: {
      1: ["Spellcasting", "Divine Domain"],
      2: ["Channel Divinity (1/rest)"],
      3: ["Level 2 Spells"],
      4: ["Ability Score Improvement"],
      5: ["Destroy Undead (CR 1/2)"],
    },
  },
  Druid: {
    name: "Druid",
    hitDie: 8,
    savingThrows: ["int", "wis"],
    defaultSpellcastingAbility: "wis",
    spellSlotsByLevel: FULL_CASTER,
    featuresByLevel: {
      1: ["Druidic", "Spellcasting"],
      2: ["Wild Shape", "Druid Circle"],
      3: ["Level 2 Spells"],
      4: ["Wild Shape Improvement", "Ability Score Improvement"],
      5: ["Level 3 Spells"],
    },
  },
  Fighter: {
    name: "Fighter",
    hitDie: 10,
    savingThrows: ["str", "con"],
    featuresByLevel: {
      1: ["Fighting Style", "Second Wind"],
      2: ["Action Surge (1 use)"],
      3: ["Martial Archetype"],
      4: ["Ability Score Improvement"],
      5: ["Extra Attack"],
    },
  },
  Monk: {
    name: "Monk",
    hitDie: 8,
    savingThrows: ["str", "dex"],
    featuresByLevel: {
      1: ["Unarmored Defense", "Martial Arts"],
      2: ["Ki Points", "Unarmored Movement"],
      3: ["Monastic Tradition", "Deflect Missiles"],
      4: ["Slow Fall", "Ability Score Improvement"],
      5: ["Extra Attack", "Stunning Strike"],
    },
  },
  Paladin: {
    name: "Paladin",
    hitDie: 10,
    savingThrows: ["wis", "cha"],
    defaultSpellcastingAbility: "cha",
    spellSlotsByLevel: HALF_CASTER,
    featuresByLevel: {
      1: ["Divine Sense", "Lay on Hands"],
      2: ["Fighting Style", "Spellcasting", "Divine Smite"],
      3: ["Sacred Oath", "Divine Health"],
      4: ["Ability Score Improvement"],
      5: ["Extra Attack"],
    },
  },
  Ranger: {
    name: "Ranger",
    hitDie: 10,
    savingThrows: ["str", "dex"],
    defaultSpellcastingAbility: "wis",
    spellSlotsByLevel: HALF_CASTER,
    featuresByLevel: {
      1: ["Favored Enemy", "Natural Explorer"],
      2: ["Fighting Style", "Spellcasting"],
      3: ["Ranger Archetype", "Primeval Awareness"],
      4: ["Ability Score Improvement"],
      5: ["Extra Attack"],
    },
  },
  Rogue: {
    name: "Rogue",
    hitDie: 8,
    savingThrows: ["dex", "int"],
    featuresByLevel: {
      1: ["Expertise", "Sneak Attack (1d6)", "Thieves' Cant"],
      2: ["Cunning Action"],
      3: ["Roguish Archetype", "Sneak Attack (2d6)"],
      4: ["Ability Score Improvement"],
      5: ["Uncanny Dodge", "Sneak Attack (3d6)"],
    },
  },
  Sorcerer: {
    name: "Sorcerer",
    hitDie: 6,
    savingThrows: ["con", "cha"],
    defaultSpellcastingAbility: "cha",
    spellSlotsByLevel: FULL_CASTER,
    featuresByLevel: {
      1: ["Spellcasting", "Sorcerous Origin"],
      2: ["Font of Magic (Sorcery Points)"],
      3: ["Metamagic (2 options)"],
      4: ["Ability Score Improvement"],
      5: ["Level 3 Spells"],
    },
  },
  Warlock: {
    name: "Warlock",
    hitDie: 8,
    savingThrows: ["wis", "cha"],
    defaultSpellcastingAbility: "cha",
    spellSlotsByLevel: WARLOCK_SLOTS,
    featuresByLevel: {
      1: ["Otherworldly Patron", "Pact Magic"],
      2: ["Eldritch Invocations (2 choices)"],
      3: ["Pact Boon"],
      4: ["Ability Score Improvement"],
      5: ["Eldritch Invocations (3 choices)"],
    },
  },
  Wizard: {
    name: "Wizard",
    hitDie: 6,
    savingThrows: ["int", "wis"],
    defaultSpellcastingAbility: "int",
    spellSlotsByLevel: FULL_CASTER,
    featuresByLevel: {
      1: ["Spellcasting", "Arcane Recovery"],
      2: ["Arcane Tradition"],
      3: ["Level 2 Spells"],
      4: ["Ability Score Improvement"],
      5: ["Level 3 Spells"],
    },
  },
};

export default function CharactersPage() {
  const [chars, setChars] = useState<Character[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hpAmount, setHpAmount] = useState(1);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dnd-characters");
      if (saved) setChars(JSON.parse(saved));
    } catch {
      console.error("Could not load characters");
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem("dnd-characters", JSON.stringify(chars));
  }, [chars, loaded]);

  const c = chars.find((x) => x.id === selectedId);

  function update(patch: Partial<Character>) {
    if (!c) return;
    setChars((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...patch } : x)));
  }

  function addCharacter() {
    const created = newCharacter();
    setChars((prev) => [...prev, created]);
    setSelectedId(created.id);
  }

  function deleteCharacter() {
    if (!c || !window.confirm(`Delete ${c.name}?`)) return;
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

  /* Rest Functions */
  function longRest() {
    if (!c) return;
    update({
      hp: { ...c.hp, current: c.hp.max, temp: 0 },
      deathSaves: { successes: 0, failures: 0 },
      spellSlots: c.spellSlots.map((s) => ({ ...s, used: 0 })),
      trackers: (c.trackers || []).map((t) => ({ ...t, used: 0 })),
    });
  }

  function shortRest() {
    if (!c) return;
    const input = window.prompt(
      `Short Rest: How many HP would you like to restore from rolling Hit Dice?\n(Max HP: ${c.hp.max}, Current: ${c.hp.current})`,
      "0"
    );
    if (input === null) return;
    const amount = Math.max(0, num(input));
    
    // Warlocks regain Pact Magic spell slots on short rest
    const updatedSpellSlots = c.className === "Warlock"
      ? c.spellSlots.map((s) => ({ ...s, used: 0 }))
      : c.spellSlots;

    update({
      hp: { ...c.hp, current: Math.min(c.hp.max, c.hp.current + amount) },
      spellSlots: updatedSpellSlots,
      trackers: (c.trackers || []).map((t) => ({ ...t, used: 0 })), // Resets custom trackers on short rest
    });
  }

  /* Custom Trackers Dynamic Helpers */
  const addTracker = () => {
    if (!c) return;
    const currentTrackers = c.trackers || [];
    update({
      trackers: [
        ...currentTrackers,
        { id: crypto.randomUUID(), name: "", max: 3, used: 0 },
      ],
    });
  };

  const updateTracker = (id: string, patch: Partial<CustomTracker>) => {
    if (!c) return;
    const currentTrackers = c.trackers || [];
    update({
      trackers: currentTrackers.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    });
  };

  const removeTracker = (id: string) => {
    if (!c) return;
    const currentTrackers = c.trackers || [];
    update({
      trackers: currentTrackers.filter((t) => t.id !== id),
    });
  };

  if (!loaded) return <div className="bg-[#211c17] p-8 text-[#e5bd70]">Loading characters...</div>;

  /* ---------- Character list ---------- */
  if (!c) {
    return (
      <main className="bg-[#211c17] p-4 text-[#e5bd70] md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="mb-2 text-5xl font-bold">Characters</h1>
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

  /* ---------- Dynamic Calculation Functions ---------- */

  const getAbilityScore = (key: AbilityKey) => {
    const base = c.abilities[key] || 10;
    const racialBonus = RACES[c.race]?.abilityBonuses[key] || 0;
    return base + racialBonus;
  };

  const pb = profBonus(c.level);
  const skillBonus = (name: string, ability: AbilityKey) =>
    modOf(getAbilityScore(ability)) + pb * (c.skillProf[name] ?? 0);
  const passivePerception = 10 + skillBonus("Perception", "wis");
  const hpPct = c.hp.max ? (c.hp.current / c.hp.max) * 100 : 0;

  /* Spell Proficiency & Attack Calculations */
  const activeSpellAbility = c.spellcastingAbility || CLASSES[c.className]?.defaultSpellcastingAbility || "int";
  const spellMod = modOf(getAbilityScore(activeSpellAbility));
  const spellSaveDC = 8 + pb + spellMod;
  const spellAttackBonus = pb + spellMod;

  const handleRaceChange = (raceKey: string) => {
    const raceData = RACES[raceKey];
    if (!raceData) {
      update({ race: raceKey });
      return;
    }

    const traitSummary = `Racial Traits (${raceData.name}): ${raceData.traits.join(", ")}`;
    const updatedFeatures = c.features
      ? `${traitSummary}\n\n${c.features.replace(/^Racial Traits \(.*?\):.*$(\n\n)?/m, "")}`
      : traitSummary;

    update({
      race: raceKey,
      speed: raceData.speed,
      features: updatedFeatures.trim(),
    });
  };

  const applyClassAndLevelUpdates = (className: string, targetLevel: number) => {
    const classData = CLASSES[className];
    const patch: Partial<Character> = { className, level: targetLevel };

    if (classData) {
      if (classData.defaultSpellcastingAbility) {
        patch.spellcastingAbility = classData.defaultSpellcastingAbility;
      }

      const newSaveProfs: Record<AbilityKey, boolean> = {
        str: false, dex: false, con: false, int: false, wis: false, cha: false,
      };
      classData.savingThrows.forEach((key) => {
        newSaveProfs[key] = true;
      });
      patch.saveProf = newSaveProfs;

      const conMod = modOf(getAbilityScore("con"));
      const isHillDwarf = c.race === "Dwarf" ? 1 : 0;
      const baseHpAtLv1 = classData.hitDie + conMod + isHillDwarf;
      const hpPerLevelAfter1 = Math.floor(classData.hitDie / 2) + 1 + conMod + isHillDwarf;
      const newMaxHp = Math.max(1, baseHpAtLv1 + (targetLevel - 1) * hpPerLevelAfter1);
      patch.hp = { ...c.hp, max: newMaxHp, current: newMaxHp };

      const classFeatures: string[] = [];
      for (let l = 1; l <= targetLevel; l++) {
        if (classData.featuresByLevel[l]) {
          classFeatures.push(...classData.featuresByLevel[l]);
        }
      }
      const classSummary = `Class Features (${classData.name}): ${classFeatures.join(", ")}`;
      const raceData = RACES[c.race];
      const raceSummary = raceData ? `Racial Traits (${raceData.name}): ${raceData.traits.join(", ")}` : "";
      patch.features = [raceSummary, classSummary].filter(Boolean).join("\n\n");

      if (classData.spellSlotsByLevel && classData.spellSlotsByLevel[targetLevel]) {
        const slotCounts = classData.spellSlotsByLevel[targetLevel];
        patch.spellSlots = slotCounts.map((max, idx) => ({
          max,
          used: Math.min(c.spellSlots[idx]?.used || 0, max),
        }));
      } else {
        patch.spellSlots = Array.from({ length: 9 }, () => ({ max: 0, used: 0 }));
      }
    }

    update(patch);
  };

  const trackersList = c.trackers || [];

  /* ---------- Selected Character View ---------- */

  return (
    <main className="min-h-screen bg-[#211c17] p-4 text-[#e5bd70] md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Navigation Bar */}
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

        {/* Header Section with Integrated Rest Buttons */}
        <section className={`${panelCls} mb-6`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-[#80643d]/40 pb-4">
            <input
              value={c.name}
              onChange={(e) => update({ name: e.target.value })}
              aria-label="Character name"
              className="w-full flex-1 bg-transparent text-4xl font-bold outline-none md:w-auto"
            />
            {/* Top Rest Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={shortRest}
                className="rounded-lg border border-[#80643d] bg-[#211c17] px-4 py-2 font-bold text-[#e5bd70] hover:bg-[#3b3024]"
              >
                ☕ Short Rest
              </button>
              <button
                onClick={longRest}
                className="rounded-lg border border-[#80643d] bg-[#80643d] px-4 py-2 font-bold text-white hover:bg-[#a17b45]"
              >
                ⛺ Long Rest
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <select
              className={inputCls}
              value={c.race}
              onChange={(e) => handleRaceChange(e.target.value)}
            >
              <option value="">Select Race</option>
              {Object.keys(RACES).map((key) => (
                <option key={key} value={key}>
                  {RACES[key].name}
                </option>
              ))}
            </select>

            <select
              className={inputCls}
              value={c.className}
              onChange={(e) => applyClassAndLevelUpdates(e.target.value, c.level)}
            >
              <option value="">Select Class</option>
              {Object.keys(CLASSES).map((key) => (
                <option key={key} value={key}>
                  {CLASSES[key].name}
                </option>
              ))}
            </select>

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
                onChange={(e) =>
                  applyClassAndLevelUpdates(c.className, clamp(num(e.target.value), 1, 20))
                }
              />
            </label>
          </div>
        </section>

        {/* Main Character Sheet Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Abilities, Saves, Skills */}
          <div className="space-y-6">
            <section className={panelCls}>
              <h2 className="mb-3 text-xl font-bold">Abilities</h2>
              <div className="grid grid-cols-3 gap-3">
                {ABILITIES.map((a) => {
                  const score = getAbilityScore(a.key);
                  const modifier = modOf(score);
                  const racialBonus = RACES[c.race]?.abilityBonuses[a.key] || 0;

                  return (
                    <div
                      key={a.key}
                      className="rounded-lg border border-[#80643d] bg-[#211c17] p-2 text-center"
                    >
                      <p className="text-xs text-[#b8a17d]">{a.label.slice(0, 3)}</p>
                      <p className="text-2xl font-bold text-white">
                        {sign(modifier)}
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
                      {racialBonus > 0 && (
                        <span className="block text-[10px] text-green-400">
                          +{racialBonus} race
                        </span>
                      )}
                    </div>
                  );
                })}
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
                  const bonus = modOf(getAbilityScore(a.key)) + (prof ? pb : 0);
                  return (
                    <li key={a.key}>
                      <button
                        onClick={() =>
                          update({
                            saveProf: { ...c.saveProf, [a.key]: !prof },
                          })
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
                          update({
                            skillProf: {
                              ...c.skillProf,
                              [s.name]: (level + 1) % 3,
                            },
                          })
                        }
                        className="flex w-full items-center gap-3 rounded px-1 py-1 text-left hover:bg-[#3b3024]"
                      >
                        <span className="w-4">{["○", "●", "◆"][level]}</span>
                        <span className="w-10 font-bold text-white">
                          {sign(skillBonus(s.name, s.ability))}
                        </span>
                        <span>
                          {s.name}{" "}
                          <span className="text-xs text-[#b8a17d]">
                            ({s.ability})
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          {/* Middle Column: Combat, HP, Conditions, Attacks */}
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
                    {sign(modOf(getAbilityScore("dex")) + c.initiativeBonus)}
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
              <label className="flex cursor-pointer items-center gap-2">
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
                  value={hpAmount || ""}
                  onChange={(e) => setHpAmount(Math.max(0, num(e.target.value)))}
                  placeholder="Amount"
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

          {/* Right Column: Custom Resources, Spells, Features, Notes */}
          <div className="space-y-6">
            {/* Custom Resource Trackers Box (Above Spellcasting) */}
            <section className={panelCls}>
              <h2 className="mb-1 text-xl font-bold">Class Trackers</h2>
              <p className="mb-3 text-xs text-[#b8a17d]">
                Track limited-use abilities like Rage, Bardic Inspiration, Ki, or Sorcery Points.
              </p>

              {trackersList.length === 0 && (
                <p className="mb-3 text-sm text-[#b8a17d]">No custom trackers added yet.</p>
              )}

              <div className="space-y-3">
                {trackersList.map((tr) => (
                  <div
                    key={tr.id}
                    className="rounded-lg border border-[#80643d]/60 bg-[#211c17] p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={tr.name}
                        placeholder="Ability (e.g. Rage, Ki Points)"
                        onChange={(e) => updateTracker(tr.id, { name: e.target.value })}
                        className={`${inputCls} min-w-0 flex-1 text-sm font-bold`}
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-[#b8a17d]">Max</span>
                        <input
                          type="number"
                          min={0}
                          max={20}
                          value={tr.max}
                          onChange={(e) => {
                            const max = clamp(num(e.target.value), 0, 20);
                            updateTracker(tr.id, {
                              max,
                              used: Math.min(tr.used, max),
                            });
                          }}
                          className={`${inputCls} w-14 text-center text-sm px-1 py-1`}
                        />
                      </div>
                      <button
                        onClick={() => removeTracker(tr.id)}
                        aria-label="Remove tracker"
                        className="px-1 text-[#b8a17d] hover:text-white"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#b8a17d]">Used:</span>
                      <Pips
                        total={tr.max}
                        filled={tr.used}
                        label={`${tr.name || "Resource"} used`}
                        onChange={(n) => updateTracker(tr.id, { used: n })}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={addTracker} className={`${btnCls} mt-3 w-full`}>
                + Add Custom Tracker
              </button>
            </section>

            {/* Spellcasting & Proficiency Panel */}
            <section className={panelCls}>
              <h2 className="mb-3 text-xl font-bold">Spellcasting</h2>
              
              <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-[#80643d] bg-[#211c17] p-2">
                  <span className="block text-[10px] text-[#b8a17d]">Spell Ability</span>
                  <select
                    className="w-full bg-transparent text-center font-bold text-white outline-none"
                    value={activeSpellAbility}
                    onChange={(e) => update({ spellcastingAbility: e.target.value as AbilityKey })}
                  >
                    {ABILITIES.map((a) => (
                      <option key={a.key} value={a.key} className="bg-[#211c17]">
                        {a.label.slice(0, 3).toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rounded-lg border border-[#80643d] bg-[#211c17] p-2">
                  <span className="block text-[10px] text-[#b8a17d]">Spell Save DC</span>
                  <p className="text-xl font-bold text-white">{spellSaveDC}</p>
                </div>
                <div className="rounded-lg border border-[#80643d] bg-[#211c17] p-2">
                  <span className="block text-[10px] text-[#b8a17d]">Attack Bonus</span>
                  <p className="text-xl font-bold text-white">{sign(spellAttackBonus)}</p>
                </div>
              </div>

              {/* Spells & Cantrips Text Area */}
              <div className="mb-4">
                <label className="mb-1 block text-sm font-bold text-[#e5bd70]">
                  Cantrips &amp; Spells
                </label>
                <textarea
                  rows={6}
                  value={c.spellsList ?? ""}
                  onChange={(e) => update({ spellsList: e.target.value })}
                  placeholder="Cantrips: Fire Bolt, Magical Tinkering&#10;&#10;Level 1: Cure Wounds, Shield of Faith..."
                  className={`${inputCls} w-full text-sm`}
                />
              </div>

              {/* Spell Slots Breakdown */}
              <p className="mb-2 text-xs font-bold text-[#b8a17d]">Spell Slots</p>
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
      </div>
    </main>
  );
}