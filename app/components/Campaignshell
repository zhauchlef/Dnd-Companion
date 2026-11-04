"use client";
 
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
 
export type Campaign = { id: string; name: string; code: string };
 
const CampaignContext = createContext<Campaign | null>(null);
 
/** Use inside any page to get the campaign the player is currently in. */
export function useActiveCampaign(): Campaign {
  const campaign = useContext(CampaignContext);
  if (!campaign) throw new Error("useActiveCampaign must be used inside CampaignShell");
  return campaign;
}
 
const LIST_KEY = "dnd-campaigns";
const ACTIVE_KEY = "dnd-active-campaign";
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid mix-ups
 
function makeCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}
 
const inputCls =
  "w-full rounded-lg border border-[#80643d] bg-[#211c17] px-4 py-3 text-white outline-none focus:border-[#e5bd70]";
const btnCls =
  "rounded-lg bg-[#80643d] px-5 py-3 font-bold text-white hover:bg-[#a17b45] disabled:opacity-50";
const panelCls = "rounded-xl border border-[#80643d] bg-[#30271e] p-5";
 
export default function CampaignShell({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState<Campaign[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
 
  // Load which campaigns this device has joined
  useEffect(() => {
    try {
      const list = localStorage.getItem(LIST_KEY);
      if (list) setSaved(JSON.parse(list));
      const active = localStorage.getItem(ACTIVE_KEY);
      if (active) setActiveId(active);
    } catch {
      console.error("Could not load saved campaigns");
    }
    setReady(true);
  }, []);
 
  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(LIST_KEY, JSON.stringify(saved));
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
    else localStorage.removeItem(ACTIVE_KEY);
  }, [saved, activeId, ready]);
 
  function remember(c: Campaign) {
    setSaved((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]));
    setActiveId(c.id);
    setError("");
  }
 
  async function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    setError("");
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error: err } = await supabase
        .from("campaigns")
        .insert({ name: newName.trim(), code: makeCode() })
        .select("id, name, code")
        .single();
      if (data) {
        remember(data as Campaign);
        setNewName("");
        break;
      }
      if (err && err.code !== "23505") {
        // 23505 = code already taken, so we just retry with a new one
        setError("Could not create the campaign. Have the Supabase tables been created?");
        break;
      }
    }
    setBusy(false);
  }
 
  async function joinCampaign(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setBusy(true);
    setError("");
    const { data, error: err } = await supabase
      .from("campaigns")
      .select("id, name, code")
      .eq("code", code)
      .maybeSingle();
    if (err) setError("Could not look that up. Check your connection.");
    else if (!data) setError("No campaign found with that code.");
    else {
      remember(data as Campaign);
      setJoinCode("");
    }
    setBusy(false);
  }
 
  function forget(id: string) {
    if (!window.confirm("Remove this campaign from this device? Its data stays saved online.")) return;
    setSaved((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  }
 
  const active = saved.find((c) => c.id === activeId) ?? null;
 
  if (!ready) return <div className="p-8 text-[#e5bd70]">Loading...</div>;
 
  /* ---------- Pick / create / join a campaign ---------- */
  if (!active) {
    return (
      <div className="p-4 text-[#e5bd70] md:p-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-2 text-3xl font-bold sm:text-5xl">Choose your campaign</h1>
          <p className="mb-8 text-lg text-[#b8a17d]">
            Each campaign has its own characters, so groups never see each other&apos;s stuff.
          </p>
 
          {saved.length > 0 && (
            <section className={`${panelCls} mb-6`}>
              <h2 className="mb-3 text-xl font-bold">Your campaigns</h2>
              <div className="space-y-2">
                {saved.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveId(c.id)}
                      className="min-w-0 flex-1 rounded-lg border border-[#80643d] bg-[#211c17] p-3 text-left hover:border-[#e5bd70]"
                    >
                      <span className="block truncate font-bold">🏰 {c.name}</span>
                      <span className="text-xs text-[#b8a17d]">Code {c.code}</span>
                    </button>
                    <button
                      onClick={() => forget(c.id)}
                      aria-label={`Remove ${c.name} from this device`}
                      className="px-2 text-[#b8a17d] hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
 
          <div className="grid gap-6 md:grid-cols-2">
            <form onSubmit={createCampaign} className={panelCls}>
              <h2 className="mb-3 text-xl font-bold">Start a new campaign</h2>
              <input
                className={`${inputCls} mb-3`}
                placeholder="Campaign name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <button type="submit" disabled={busy || !newName.trim()} className={btnCls}>
                Create
              </button>
            </form>
 
            <form onSubmit={joinCampaign} className={panelCls}>
              <h2 className="mb-3 text-xl font-bold">Join with a code</h2>
              <input
                className={`${inputCls} mb-3 uppercase tracking-widest`}
                placeholder="ABC123"
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
              />
              <button type="submit" disabled={busy || !joinCode.trim()} className={btnCls}>
                Join
              </button>
            </form>
          </div>
 
          {error && <p className="mt-4 text-red-400">{error}</p>}
        </div>
      </div>
    );
  }
 
  /* ---------- Inside a campaign ---------- */
  return (
    <CampaignContext.Provider value={active}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[#80643d] bg-[#30271e] px-4 py-2 text-sm text-[#e5bd70]">
        <span>
          🏰 <b>{active.name}</b>
        </span>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(active.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          title="Share this code so players can join"
          className="text-[#b8a17d] hover:text-white"
        >
          Code: {active.code} {copied ? "✓ copied" : "(copy)"}
        </button>
        <button
          onClick={() => setActiveId(null)}
          className="ml-auto text-[#b8a17d] underline hover:text-white"
        >
          Switch campaign
        </button>
      </div>
      {children}
    </CampaignContext.Provider>
  );
}