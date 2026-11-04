"use client";
import { useEffect, useState } from "react";

/* ==========================================================================
   TYPES & STORAGE
   ========================================================================== */

type CampaignNote = {
  id: string;
  title: string;
  category: string;
  updatedAt: string;
  content: string;
  keyPoints: string;
};

type NPC = {
  id: string;
  name: string;
  role: string;
  location: string;
  disposition: "Ally" | "Neutral" | "Hostile" | "Unknown";
  notes: string;
};

type LocationNote = {
  id: string;
  name: string;
  region: string;
  description: string;
  pointsOfInterest: string;
};

type QuestStatus = "Active" | "Completed" | "Failed";

type Quest = {
  id: string;
  title: string;
  givenBy: string;
  reward: string;
  status: QuestStatus;
  description: string;
};

type JournalData = {
  notes?: CampaignNote[];
  npcs?: NPC[];
  quests?: Quest[];
  locations?: LocationNote[];
};

const INITIAL_DATA: JournalData = {
  notes: [
    {
      id: "1",
      title: "King Alden III & The Royal Court",
      category: "Royalty / Politics",
      updatedAt: "2026-11-01",
      content:
        "King Alden rules from Highcrown Castle. He is growing paranoid after the disappearance of his younger brother, Lord Roderick. Tensions are high between the Crown and the Merchant's Guild.",
      keyPoints:
        "• Suspicious of magic users\n• Deep in debt to the Iron Bank\n• Secretly seeking alliance with Northern Clans",
    },
    {
      id: "2",
      title: "Village of Oakhaven",
      category: "Settlements",
      updatedAt: "2026-11-03",
      content:
        "A quiet farming community on the edge of the Whispering Woods. Known for their herbal medicine and yearly harvest festival.",
      keyPoints:
        "• Local tavern: The Sleeping Stag\n• Elder Miriam knows forest shortcuts\n• Unexplained livestock losses last full moon",
    },
  ],
  npcs: [
    {
      id: "1",
      name: "Gundren Rockseeker",
      role: "Dwarven Patron & Merchant",
      location: "Neverwinter",
      disposition: "Ally",
      notes: "Hired us to transport supplies.",
    },
  ],
  locations: [
    {
      id: "1",
      name: "Cragmaw Hideout",
      region: "Sword Coast",
      description: "A cave system hidden behind a small waterfall.",
      pointsOfInterest: "Goblin guard post, natural chimney in cavern.",
    },
  ],
};

const inputCls =
  "rounded-lg border border-[#80643d] bg-[#211c17] px-3 py-2 text-white outline-none focus:border-[#e5bd70]";
const panelCls = "rounded-xl border border-[#80643d] bg-[#30271e] p-5";
const btnCls = "rounded-lg bg-[#80643d] px-4 py-2 font-bold text-white hover:bg-[#a17b45]";

/* ==========================================================================
   COMPONENT
   ========================================================================== */

export default function CampaignJournalPage() {
  const [data, setData] = useState<JournalData>(INITIAL_DATA);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"notes" | "npcs" | "quests" | "locations">("notes");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dnd-campaign-journal");
      if (saved) {
        const parsed = JSON.parse(saved);
        setData({
          notes: parsed.notes || INITIAL_DATA.notes,
          npcs: parsed.npcs || INITIAL_DATA.npcs,
          quests: parsed.quests || INITIAL_DATA.quests,
          locations: parsed.locations || INITIAL_DATA.locations,
        });
      }
    } catch {
      console.error("Could not load campaign journal");
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem("dnd-campaign-journal", JSON.stringify(data));
  }, [data, loaded]);

  if (!loaded) return <div className="bg-[#211c17] p-8 text-[#e5bd70]">Loading campaign journal...</div>;

  const notesList = data.notes || [];
  const npcsList = data.npcs || [];
  const questsList = data.quests || [];
  const locationsList = data.locations || [];

  /* Helper Updaters */
  const addCampaignNote = () => {
    const newEntry: CampaignNote = {
      id: crypto.randomUUID(),
      title: "New Campaign Note",
      category: "General",
      updatedAt: new Date().toISOString().split("T")[0],
      content: "",
      keyPoints: "",
    };
    setData({ ...data, notes: [newEntry, ...notesList] });
  };

  const addNPC = () => {
    const newNPC: NPC = {
      id: crypto.randomUUID(),
      name: "New NPC",
      role: "Contact",
      location: "Town",
      disposition: "Neutral",
      notes: "",
    };
    setData({ ...data, npcs: [newNPC, ...npcsList] });
  };

  const addQuest = () => {
    const newQuest: Quest = {
      id: crypto.randomUUID(),
      title: "New Quest",
      givenBy: "",
      reward: "",
      status: "Active",
      description: "",
    };
    setData({ ...data, quests: [newQuest, ...questsList] });
  };

  const addLocation = () => {
    const newLoc: LocationNote = {
      id: crypto.randomUUID(),
      name: "New Landmark",
      region: "",
      description: "",
      pointsOfInterest: "",
    };
    setData({ ...data, locations: [newLoc, ...locationsList] });
  };

  /* Disposition Badges */
  const dispBadge = (disp: NPC["disposition"]) => {
    switch (disp) {
      case "Ally":
        return "bg-green-900 border-green-600 text-green-200";
      case "Hostile":
        return "bg-red-900 border-red-600 text-red-200";
      case "Neutral":
        return "bg-yellow-900 border-yellow-600 text-yellow-200";
      default:
        return "bg-gray-800 border-gray-600 text-gray-300";
    }
  };

  /* Quest Status Badges */
  const questBadge = (st: QuestStatus) => {
    switch (st) {
      case "Active":
        return "bg-amber-900 border-amber-500 text-amber-200";
      case "Completed":
        return "bg-green-900 border-green-600 text-green-200";
      case "Failed":
        return "bg-red-950 border-red-700 text-red-300 line-through opacity-75";
    }
  };

  return (
    <main className="min-h-screen bg-[#211c17] p-4 text-[#e5bd70] md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold md:text-5xl">Campaign Journal</h1>
            <p className="text-sm text-[#b8a17d]">Organize lore, village details, royals, key NPCs, and quests.</p>
          </div>
          <input
            type="text"
            placeholder="Search campaign notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${inputCls} w-full md:w-64`}
          />
        </div>

        {/* Tab Selection */}
        <div className="mb-6 flex flex-wrap gap-2 border-b border-[#80643d]/40 pb-3">
          {(
            [
              { id: "notes", label: `📜 Campaign Notes (${notesList.length})` },
              { id: "npcs", label: `👤 NPC Codex (${npcsList.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-4 py-2 font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-[#80643d] text-white shadow-md"
                  : "bg-[#30271e] text-[#b8a17d] hover:bg-[#3b3024] hover:text-[#e5bd70]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ====================================================================
           TAB 1: CAMPAIGN NOTES
           ==================================================================== */}
        {activeTab === "notes" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Campaign Notes &amp; Lore</h2>
              <button onClick={addCampaignNote} className={btnCls}>
                + Add Campaign Note
              </button>
            </div>

            {notesList
              .filter(
                (n) =>
                  n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  n.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  n.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  n.keyPoints.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((n) => (
                <section key={n.id} className={panelCls}>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#80643d]/30 pb-3">
                    <div className="flex flex-1 items-center gap-3 min-w-[250px]">
                      <input
                        value={n.title}
                        onChange={(e) =>
                          setData({
                            ...data,
                            notes: notesList.map((x) => (x.id === n.id ? { ...x, title: e.target.value } : x)),
                          })
                        }
                        placeholder="Note Title (e.g., King Alden, Oakhaven)"
                        className={`${inputCls} flex-1 text-xl font-bold`}
                      />
                      <input
                        value={n.category}
                        onChange={(e) =>
                          setData({
                            ...data,
                            notes: notesList.map((x) => (x.id === n.id ? { ...x, category: e.target.value } : x)),
                          })
                        }
                        placeholder="Category / Tag"
                        className={`${inputCls} w-36 text-xs font-semibold`}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={n.updatedAt}
                        onChange={(e) =>
                          setData({
                            ...data,
                            notes: notesList.map((x) => (x.id === n.id ? { ...x, updatedAt: e.target.value } : x)),
                          })
                        }
                        className={`${inputCls} text-sm`}
                      />
                      <button
                        onClick={() =>
                          setData({ ...data, notes: notesList.filter((x) => x.id !== n.id) })
                        }
                        className="px-2 text-[#b8a17d] hover:text-red-400"
                        title="Delete Note"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-bold text-[#b8a17d]">Detailed Notes &amp; Description</label>
                      <textarea
                        rows={6}
                        value={n.content}
                        onChange={(e) =>
                          setData({
                            ...data,
                            notes: notesList.map((x) =>
                              x.id === n.id ? { ...x, content: e.target.value } : x
                            ),
                          })
                        }
                        placeholder="Write detailed notes regarding this person, village, faction, or historical event..."
                        className={`${inputCls} w-full text-sm`}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-[#b8a17d]">📌 Key Takeaways / Quick Secrets</label>
                      <textarea
                        rows={6}
                        value={n.keyPoints}
                        onChange={(e) =>
                          setData({
                            ...data,
                            notes: notesList.map((x) =>
                              x.id === n.id ? { ...x, keyPoints: e.target.value } : x
                            ),
                          })
                        }
                        placeholder="Bullet points, rumors, secret motives, notable locations..."
                        className={`${inputCls} w-full text-sm font-mono`}
                      />
                    </div>
                  </div>
                </section>
              ))}
          </div>
        )}

        {/* ====================================================================
           TAB 2: NPC CODEX
           ==================================================================== */}
        {activeTab === "npcs" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Non-Player Characters</h2>
              <button onClick={addNPC} className={btnCls}>
                + Add NPC
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {npcsList
                .filter(
                  (n) =>
                    n.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    n.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    n.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    n.notes.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((n) => (
                  <div key={n.id} className={`${panelCls} flex flex-col justify-between space-y-3`}>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          value={n.name}
                          onChange={(e) =>
                            setData({
                              ...data,
                              npcs: npcsList.map((x) => (x.id === n.id ? { ...x, name: e.target.value } : x)),
                            })
                          }
                          placeholder="NPC Name"
                          className={`${inputCls} w-full font-bold text-lg`}
                        />
                        <button
                          onClick={() => setData({ ...data, npcs: npcsList.filter((x) => x.id !== n.id) })}
                          className="px-2 text-[#b8a17d] hover:text-red-400"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={n.role}
                          onChange={(e) =>
                            setData({
                              ...data,
                              npcs: npcsList.map((x) => (x.id === n.id ? { ...x, role: e.target.value } : x)),
                            })
                          }
                          placeholder="Role/Title"
                          className={`${inputCls} text-xs`}
                        />
                        <input
                          value={n.location}
                          onChange={(e) =>
                            setData({
                              ...data,
                              npcs: npcsList.map((x) => (x.id === n.id ? { ...x, location: e.target.value } : x)),
                            })
                          }
                          placeholder="Location"
                          className={`${inputCls} text-xs`}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-[#b8a17d]">Disposition:</span>
                        <select
                          value={n.disposition}
                          onChange={(e) =>
                            setData({
                              ...data,
                              npcs: npcsList.map((x) =>
                                x.id === n.id ? { ...x, disposition: e.target.value as NPC["disposition"] } : x
                              ),
                            })
                          }
                          className={`rounded border px-2 py-1 text-xs font-bold outline-none ${dispBadge(
                            n.disposition
                          )}`}
                        >
                          <option value="Ally" className="bg-[#211c17] text-green-400">
                            Ally
                          </option>
                          <option value="Neutral" className="bg-[#211c17] text-yellow-400">
                            Neutral
                          </option>
                          <option value="Hostile" className="bg-[#211c17] text-red-400">
                            Hostile
                          </option>
                          <option value="Unknown" className="bg-[#211c17] text-gray-400">
                            Unknown
                          </option>
                        </select>
                      </div>

                      <textarea
                        rows={4}
                        value={n.notes}
                        onChange={(e) =>
                          setData({
                            ...data,
                            npcs: npcsList.map((x) => (x.id === n.id ? { ...x, notes: e.target.value } : x)),
                          })
                        }
                        placeholder="Personality, secrets, background notes..."
                        className={`${inputCls} w-full text-xs`}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
        </div>
    </main>
  );
}