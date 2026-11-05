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

type JournalData = {
  notes?: CampaignNote[];
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
};

const inputCls =
  "rounded-lg border border-[#80643d] bg-[#211c17] px-3 py-2 text-white outline-none focus:border-[#e5bd70]";
const panelCls = "rounded-xl border border-[#80643d] bg-[#30271e] p-5 shadow-xl";
const btnCls = "rounded-lg bg-[#80643d] px-4 py-2 font-bold text-white hover:bg-[#a17b45] transition";

/* ==========================================================================
   COMPONENT
   ========================================================================== */

export default function CampaignJournalPage() {
  const [data, setData] = useState<JournalData>(INITIAL_DATA);
  const [loaded, setLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dnd-campaign-journal");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.notes) setData(parsed);
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

  const addCampaignNote = () => {
    const newEntry: CampaignNote = {
      id: crypto.randomUUID(),
      title: "New Campaign Note",
      category: "General",
      updatedAt: new Date().toISOString().split("T")[0],
      content: "",
      keyPoints: "",
    };
    setData({ notes: [newEntry, ...notesList] });
  };

  return (
    <main className="min-h-screen bg-[#211c17] p-4 text-[#e5bd70] md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#80643d]/40 pb-4">
          <div>
            <h1 className="text-4xl font-bold md:text-5xl">Campaign Journal</h1>
            <p className="text-sm text-[#b8a17d]">Organize lore, village details, factions, and session notes.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search journal notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${inputCls} w-full md:w-64`}
            />
            <button onClick={addCampaignNote} className={btnCls}>
              + Add Note
            </button>
          </div>
        </div>

        {/* Notes List */}
        <div className="space-y-6">
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
                          notes: notesList.map((x) => (x.id === n.id ? { ...x, title: e.target.value } : x)),
                        })
                      }
                      placeholder="Note Title"
                      className={`${inputCls} flex-1 text-xl font-bold`}
                    />
                    <input
                      value={n.category}
                      onChange={(e) =>
                        setData({
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
                          notes: notesList.map((x) => (x.id === n.id ? { ...x, updatedAt: e.target.value } : x)),
                        })
                      }
                      className={`${inputCls} text-sm`}
                    />
                    <button
                      onClick={() =>
                        setData({ notes: notesList.filter((x) => x.id !== n.id) })
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
                      rows={5}
                      value={n.content}
                      onChange={(e) =>
                        setData({
                          notes: notesList.map((x) =>
                            x.id === n.id ? { ...x, content: e.target.value } : x
                          ),
                        })
                      }
                      placeholder="Write detailed notes regarding this person, village, faction..."
                      className={`${inputCls} w-full text-sm`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#b8a17d]">📌 Key Takeaways / Secrets</label>
                    <textarea
                      rows={5}
                      value={n.keyPoints}
                      onChange={(e) =>
                        setData({
                          notes: notesList.map((x) =>
                            x.id === n.id ? { ...x, keyPoints: e.target.value } : x
                          ),
                        })
                      }
                      placeholder="Bullet points, rumors, secret motives..."
                      className={`${inputCls} w-full text-sm font-mono`}
                    />
                  </div>
                </div>
              </section>
            ))}
        </div>
      </div>
    </main>
  );
}