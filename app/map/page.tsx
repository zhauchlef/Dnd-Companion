"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { uploadMap } from "@/lib/mapStorage";
import { supabase } from "@/lib/supabase";

/* TYPES */

type PinCategory =
  | "city"
  | "dungeon"
  | "tavern"
  | "quest"
  | "hazard"
  | "landmark";

type MapPin = {
  id: string;
  title: string;
  category: PinCategory;
  x: number;
  y: number;
  description: string;
  secrets?: string;
  targetSubmapId?: string;
};

type SavedMap = {
  id: string;
  name: string;
  url: string;
  storagePath?: string;
  parentMapId?: string | null;
  pins: MapPin[];
};

type MapAppState = {
  activeMapId: string;
  maps: SavedMap[];
};

type MapDatabaseRow = {
  id: string;
  name: string;
  image_path: string | null;
  image_url: string | null;
  parent_map_id: string | null;
  pins: MapPin[];
};

/* DEFAULT MAPS */

const DEFAULT_MAPS: SavedMap[] = [
  {
    id: "1",
    name: "World map",
    parentMapId: null,
    url: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=1600&auto=format&fit=crop",
    pins: [
      {
        id: "p1",
        title: "Highcrown Capital",
        category: "city",
        x: 35,
        y: 42,
        description: "Seat of King Alden III. Protected by granite walls.",
        secrets: "Underground catacombs contain royal vaults.",
        targetSubmapId: "2",
      },
      {
        id: "p2",
        title: "Cragmaw Hideout",
        category: "dungeon",
        x: 58,
        y: 65,
        description: "Shadowy cave hidden behind a small waterfall.",
        secrets: "Natural chimney leads straight to the chieftain's lair.",
      },
    ],
  },
  {
    id: "2",
    name: "Highcrown Town Square",
    parentMapId: "1",
    url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1600&auto=format&fit=crop",
    pins: [
      {
        id: "p3",
        title: "The Sleeping Stag Tavern",
        category: "tavern",
        x: 45,
        y: 52,
        description: "Local tavern in Highcrown. Cozy atmosphere.",
        targetSubmapId: "3",
      },
    ],
  },
  {
    id: "3",
    name: "Sleeping Stag - Ground Floor",
    parentMapId: "2",
    url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1600&auto=format&fit=crop",
    pins: [],
  },
];

const INITIAL_STATE: MapAppState = {
  activeMapId: "1",
  maps: DEFAULT_MAPS,
};

/* CATEGORY STYLING */

const CATEGORY_COLORS: Record<
  PinCategory,
  { bg: string; icon: string; label: string }
> = {
  city: {
    bg: "bg-blue-600 border-blue-400",
    icon: "🏰",
    label: "City / Settlement",
  },
  dungeon: {
    bg: "bg-red-700 border-red-500",
    icon: "💀",
    label: "Dungeon / Cave",
  },
  tavern: {
    bg: "bg-amber-600 border-amber-400",
    icon: "🍺",
    label: "Tavern / Shop",
  },
  quest: {
    bg: "bg-purple-600 border-purple-400",
    icon: "📜",
    label: "Quest Hub",
  },
  hazard: {
    bg: "bg-yellow-600 border-yellow-400",
    icon: "⚠️",
    label: "Hazard / Danger",
  },
  landmark: {
    bg: "bg-emerald-600 border-emerald-400",
    icon: "📍",
    label: "Landmark / Other",
  },
};

const inputCls =
  "rounded-lg border border-[#80643d] bg-[#211c17] px-3 py-2 text-white outline-none focus:border-[#e5bd70]";

const panelCls =
  "rounded-xl border border-[#80643d] bg-[#30271e] p-5";

const btnCls =
  "rounded-lg bg-[#80643d] px-4 py-2 font-bold text-white hover:bg-[#a17b45]";

/* SUPABASE IMAGE HELPERS */

async function getSignedMapUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("world-maps")
    .createSignedUrl(path, 60 * 60 * 24 * 7);

  if (error) {
    throw new Error(error.message);
  }

  return data.signedUrl;
}

/* CONVERT MAPS TO AND FROM DATABASE ROWS */

function mapToDatabaseRow(map: SavedMap): MapDatabaseRow {
  return {
    id: map.id,
    name: map.name,
    image_path: map.storagePath || null,
    image_url: map.storagePath ? null : map.url || null,
    parent_map_id: map.parentMapId || null,
    pins: map.pins || [],
  };
}

async function databaseRowToMap(row: MapDatabaseRow): Promise<SavedMap> {
  let url = row.image_url || "";

  if (row.image_path) {
    try {
      url = await getSignedMapUrl(row.image_path);
    } catch (error) {
      console.warn(`Could not refresh image for ${row.name}:`, error);
      url = "";
    }
  }

  return {
    id: row.id,
    name: row.name,
    url,
    storagePath: row.image_path || undefined,
    parentMapId: row.parent_map_id,
    pins: Array.isArray(row.pins) ? row.pins : [],
  };
}

export default function WorldMapPage() {
  const [appState, setAppState] = useState<MapAppState>(INITIAL_STATE);
  const [loaded, setLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Connecting to shared campaign...");

  const [newMapName, setNewMapName] = useState("");
  const [newParentMapId, setNewParentMapId] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  const [isPlacingMarker, setIsPlacingMarker] = useState(false);
  const [markerName, setMarkerName] = useState("");
  const [markerCategory, setMarkerCategory] =
    useState<PinCategory>("landmark");
  const [markerDesc, setMarkerDesc] = useState("");
  const [markerTargetSubmap, setMarkerTargetSubmap] = useState("");

  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMountedRef = useRef(true);

  /* SAVE ONE MAP TO SUPABASE */

  async function saveMapToCloud(map: SavedMap) {
    const { error } = await supabase
      .from("campaign_maps")
      .upsert(mapToDatabaseRow(map), {
        onConflict: "id",
      });

    if (error) {
      console.error("Could not save map to Supabase:", error);
      throw error;
    }
  }

  /* LOAD MAPS FROM SUPABASE */

  async function fetchCloudMaps(): Promise<SavedMap[]> {
    const { data, error } = await supabase
      .from("campaign_maps")
      .select("id, name, image_path, image_url, parent_map_id, pins");

    if (error) {
      throw error;
    }

    const rows = (data || []) as MapDatabaseRow[];

    return Promise.all(rows.map(databaseRowToMap));
  }

  /* INITIAL LOAD AND LOCAL DATA MIGRATION */

  useEffect(() => {
    let active = true;

    async function loadMaps() {
      try {
        const { data, error } = await supabase
          .from("campaign_maps")
          .select("id, name, image_path, image_url, parent_map_id, pins");

        if (error) {
          throw error;
        }

        let rows = (data || []) as MapDatabaseRow[];

        /*
         * If Supabase is empty, import the existing browser maps.
         * The localStorage copy is not deleted.
         */

        if (rows.length === 0) {
          let mapsToImport: SavedMap[] = INITIAL_STATE.maps;

          const saved = localStorage.getItem("dnd-world-map-app");

          if (saved) {
            try {
              const parsed = JSON.parse(saved) as MapAppState;

              if (Array.isArray(parsed.maps) && parsed.maps.length > 0) {
                mapsToImport = parsed.maps;
              }
            } catch (error) {
              console.error("Could not read existing local maps:", error);
            }
          }

          const { error: importError } = await supabase
            .from("campaign_maps")
            .upsert(mapsToImport.map(mapToDatabaseRow), {
              onConflict: "id",
              ignoreDuplicates: true,
            });

          if (importError) {
            throw importError;
          }

          const refreshed = await supabase
            .from("campaign_maps")
            .select("id, name, image_path, image_url, parent_map_id, pins");

          if (refreshed.error) {
            throw refreshed.error;
          }

          rows = (refreshed.data || []) as MapDatabaseRow[];
        }

        const cloudMaps = await Promise.all(rows.map(databaseRowToMap));

        if (!active) return;

        if (cloudMaps.length > 0) {
          setAppState((previous) => ({
            activeMapId: cloudMaps.some(
              (map) => map.id === previous.activeMapId
            )
              ? previous.activeMapId
              : cloudMaps[0].id,
            maps: cloudMaps,
          }));
        }

        setSyncStatus("Connected to shared campaign");
      } catch (error) {
        console.error("Could not load shared maps:", error);

        /*
         * If cloud loading fails, preserve and display local data.
         * Do not overwrite the local backup with an empty state.
         */

        try {
          const saved = localStorage.getItem("dnd-world-map-app");

          if (saved) {
            const parsed = JSON.parse(saved) as MapAppState;

            if (Array.isArray(parsed.maps) && parsed.maps.length > 0) {
              if (active) setAppState(parsed);
            }
          }
        } catch (localError) {
          console.error("Could not load local map backup:", localError);
        }

        if (active) {
          setSyncStatus("Cloud connection failed — using local data");
        }
      } finally {
        if (active) setLoaded(true);
      }
    }

    loadMaps();

    return () => {
      active = false;
    };
  }, []);

  /* REALTIME UPDATES FROM OTHER VISITORS */

  useEffect(() => {
    if (!loaded) return;

    let active = true;

    const channel = supabase
      .channel("shared-campaign-maps")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "campaign_maps",
        },
        async () => {
          try {
            const cloudMaps = await fetchCloudMaps();

            if (!active) return;

            setAppState((previous) => ({
              activeMapId: cloudMaps.some(
                (map) => map.id === previous.activeMapId
              )
                ? previous.activeMapId
                : cloudMaps[0]?.id || "",
              maps: cloudMaps,
            }));

            setSyncStatus("Connected to shared campaign");
          } catch (error) {
            console.error("Could not refresh shared maps:", error);
            setSyncStatus("Could not refresh shared maps");
          }
        }
      )
      .subscribe((status) => {
        if (!active) return;

        if (status === "SUBSCRIBED") {
          setSyncStatus("Connected to shared campaign");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setSyncStatus("Live updates disconnected");
        }
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [loaded]);

  /* SAVE A LOCAL BACKUP */

  useEffect(() => {
    if (!loaded) return;

    try {
      localStorage.setItem(
        "dnd-world-map-app",
        JSON.stringify(appState)
      );
    } catch (error) {
      console.error("Could not save local map backup:", error);
    }
  }, [appState, loaded]);

  /* CLEAN UP MOUNT STATE */

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  if (!loaded) {
    return (
      <div className="bg-[#211c17] p-8 text-[#e5bd70]">
        Loading shared maps...
      </div>
    );
  }

  const currentMap =
    appState.maps.find((m) => m.id === appState.activeMapId) ||
    appState.maps[0];

  if (!currentMap) {
    return (
      <div className="bg-[#211c17] p-8 text-white">
        No maps found. Try refreshing the page.
      </div>
    );
  }

  const parentMap = currentMap.parentMapId
    ? appState.maps.find((m) => m.id === currentMap.parentMapId)
    : null;

  const childSubmaps = appState.maps.filter(
    (m) => m.parentMapId === currentMap.id
  );

  /* UPLOAD MAP DIRECTLY TO SUPABASE */

  const handleUploadMap = async () => {
    if (!newMapName.trim()) {
      setUploadStatus("Please enter a name for your map.");
      return;
    }

    if (!selectedFile) {
      setUploadStatus("Please choose an image first.");
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setUploadStatus("Your image is larger than 50 MB.");
      return;
    }

    try {
      setUploading(true);
      setUploadStatus("Uploading image to Supabase...");

      const result = await uploadMap(selectedFile);
      const signedUrl = await getSignedMapUrl(result.path);

      const newMap: SavedMap = {
        id: result.id,
        name: newMapName.trim(),
        url: signedUrl,
        storagePath: result.path,
        parentMapId: newParentMapId || null,
        pins: [],
      };

      await saveMapToCloud(newMap);

      setAppState((previous) => ({
        ...previous,
        activeMapId: newMap.id,
        maps: [...previous.maps, newMap],
      }));

      setNewMapName("");
      setNewParentMapId("");
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setUploadStatus("Map uploaded and shared successfully!");
    } catch (error) {
      console.error("Map upload failed:", error);

      setUploadStatus(
        error instanceof Error ? error.message : "Upload failed."
      );
    } finally {
      setUploading(false);
    }
  };

  /* DELETE MAP */

  const deleteMap = async (id: string) => {
    if (appState.maps.length <= 1) {
      alert("You must keep at least one map in your library.");
      return;
    }

    if (
      !window.confirm(
        "Delete this map? Any linked submaps will become top-level maps."
      )
    ) {
      return;
    }

    const filtered = appState.maps
      .filter((m) => m.id !== id)
      .map((m) =>
        m.parentMapId === id ? { ...m, parentMapId: null } : m
      );

    try {
      /*
       * Save child maps after removing their parent link,
       * then delete the selected map from the database.
       */

      const changedChildren = filtered.filter(
        (map) => map.parentMapId === null &&
          appState.maps.some(
            (oldMap) =>
              oldMap.id === map.id && oldMap.parentMapId === id
          )
      );

      for (const child of changedChildren) {
        await saveMapToCloud(child);
      }

      const { error } = await supabase
        .from("campaign_maps")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setAppState((previous) => ({
        ...previous,
        activeMapId: filtered[0].id,
        maps: filtered,
      }));

      setSelectedPin(null);
    } catch (error) {
      console.error("Could not delete map:", error);
      alert("Could not delete the map from the shared campaign.");
    }
  };

  /* PAN AND ZOOM */

  const handleZoom = (delta: number) => {
    setScale((previous) =>
      Math.min(3.5, Math.max(0.6, previous + delta))
    );
  };

  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (isPlacingMarker) return;

    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  /* PLACE MARKER */

  const handleMapClick = async (e: MouseEvent<HTMLDivElement>) => {
    if (!isPlacingMarker || !mapContainerRef.current) return;

    const rect = mapContainerRef.current.getBoundingClientRect();

    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    const newPin: MapPin = {
      id: crypto.randomUUID(),
      title: markerName.trim() || "New Location",
      category: markerCategory,
      x: Math.max(0, Math.min(100, Math.round(clickX))),
      y: Math.max(0, Math.min(100, Math.round(clickY))),
      description: markerDesc.trim() || "Location details...",
      targetSubmapId: markerTargetSubmap || undefined,
    };

    const updatedMap: SavedMap = {
      ...currentMap,
      pins: [...currentMap.pins, newPin],
    };

    try {
      await saveMapToCloud(updatedMap);

      setAppState((previous) => ({
        ...previous,
        maps: previous.maps.map((map) =>
          map.id === currentMap.id ? updatedMap : map
        ),
      }));

      setSelectedPin(newPin);
      setIsPlacingMarker(false);
      setMarkerName("");
      setMarkerDesc("");
      setMarkerTargetSubmap("");
    } catch (error) {
      console.error("Could not save marker:", error);
      alert("Could not save this marker to the shared campaign.");
    }
  };

  /* EDIT MARKER */

  const updateSelectedPin = (patch: Partial<MapPin>) => {
    if (!selectedPin) return;

    const updatedPin = { ...selectedPin, ...patch };

    const updatedMap: SavedMap = {
      ...currentMap,
      pins: currentMap.pins.map((pin) =>
        pin.id === selectedPin.id ? updatedPin : pin
      ),
    };

    setSelectedPin(updatedPin);

    setAppState((previous) => ({
      ...previous,
      maps: previous.maps.map((map) =>
        map.id === currentMap.id ? updatedMap : map
      ),
    }));

    void saveMapToCloud(updatedMap).catch((error) => {
      console.error("Could not save marker changes:", error);
      setSyncStatus("Could not save marker changes");
    });
  };

  /* DELETE MARKER */

  const deleteSelectedPin = async () => {
    if (!selectedPin) return;

    const updatedMap: SavedMap = {
      ...currentMap,
      pins: currentMap.pins.filter(
        (pin) => pin.id !== selectedPin.id
      ),
    };

    try {
      await saveMapToCloud(updatedMap);

      setAppState((previous) => ({
        ...previous,
        maps: previous.maps.map((map) =>
          map.id === currentMap.id ? updatedMap : map
        ),
      }));

      setSelectedPin(null);
    } catch (error) {
      console.error("Could not delete marker:", error);
      alert("Could not delete this marker from the shared campaign.");
    }
  };

  return (
    <main className="min-h-screen bg-[#211c17] p-4 text-[#e5bd70] md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* PAGE TITLE */}

        <div>
          <h1 className="text-4xl font-bold md:text-5xl">
            World Atlas & Submap Viewer
          </h1>
          <p className="text-sm text-[#b8a17d]">
            Link interior houses, towns, and local maps as submaps of your overworld.
          </p>
          <p className="mt-2 text-xs text-[#b8a17d]">
            Shared campaign status: {syncStatus}
          </p>
        </div>

        {/* UPLOAD NEW MAP */}

        <section className={panelCls}>
          <h2 className="mb-3 text-2xl font-bold">
            Upload a new map / submap
          </h2>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <input
              type="text"
              value={newMapName}
              onChange={(e) => setNewMapName(e.target.value)}
              placeholder="Map name (e.g. Blacksmith Shop)"
              className={inputCls}
            />

            <select
              value={newParentMapId}
              onChange={(e) => setNewParentMapId(e.target.value)}
              className={inputCls}
            >
              <option value="">Top-Level Map (No Parent)</option>
              {appState.maps.map((m) => (
                <option key={m.id} value={m.id}>
                  ↳ Submap of: {m.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-[#80643d] bg-[#211c17] px-4 py-2 font-bold text-sm text-[#b8a17d] hover:bg-[#30271e]"
            >
              📷 Choose File
            </button>

            <button
              onClick={handleUploadMap}
              disabled={uploading}
              className={`${btnCls} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {uploading ? "Uploading..." : "Upload map image"}
            </button>
          </div>

          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            ref={fileInputRef}
            onChange={(e) =>
              setSelectedFile(e.target.files?.[0] || null)
            }
            className="hidden"
          />

          {selectedFile && (
            <p className="mt-3 text-sm text-[#b8a17d]">
              Selected: {selectedFile.name} (
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
            </p>
          )}

          {uploadStatus && (
            <p className="mt-3 text-sm text-[#e5bd70]">
              {uploadStatus}
            </p>
          )}
        </section>

        {/* MAP LIBRARY */}

        <section className={panelCls}>
          <h2 className="mb-4 text-2xl font-bold">
            Map Library ({appState.maps.length})
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {appState.maps.map((m) => {
              const isActive = m.id === currentMap.id;

              const parent = m.parentMapId
                ? appState.maps.find(
                    (p) => p.id === m.parentMapId
                  )
                : null;

              return (
                <div
                  key={m.id}
                  onClick={() => {
                    setAppState((previous) => ({
                      ...previous,
                      activeMapId: m.id,
                    }));
                    setSelectedPin(null);
                  }}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all ${
                    isActive
                      ? "border-[#e5bd70] bg-[#3b3024] shadow-md"
                      : "border-[#80643d] bg-[#211c17] hover:border-[#a17b45]"
                  }`}
                >
                  <div className="truncate pr-2">
                    <h3 className="font-bold text-lg text-white truncate">
                      {m.parentMapId ? "🏚️ Submap: " : "🗺️ "}
                      {m.name}
                    </h3>
                    <p className="text-xs text-[#b8a17d]">
                      {m.pins.length} markers
                      {parent ? ` · Parent: ${parent.name}` : ""}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteMap(m.id);
                    }}
                    className="rounded-lg bg-red-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* ACTIVE MAP HEADER */}

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              {parentMap && (
                <button
                  onClick={() => {
                    setAppState((previous) => ({
                      ...previous,
                      activeMapId: parentMap.id,
                    }));
                    setSelectedPin(null);
                  }}
                  className="mb-1 block text-xs font-bold text-[#e5bd70] hover:underline"
                >
                  ← Return to Parent Map ({parentMap.name})
                </button>
              )}

              <h2 className="text-3xl font-bold">
                {currentMap.name}
              </h2>
            </div>

            {!isPlacingMarker ? (
              <button
                onClick={() => setIsPlacingMarker(true)}
                className="rounded-lg bg-[#80643d] px-5 py-2.5 font-bold text-white hover:bg-[#a17b45]"
              >
                + Add Marker
              </button>
            ) : (
              <button
                onClick={() => setIsPlacingMarker(false)}
                className="rounded-lg bg-red-800 px-5 py-2.5 font-bold text-white hover:bg-red-700"
              >
                Cancel placing marker
              </button>
            )}
          </div>

          {/* SUBMAPS */}

          {childSubmaps.length > 0 && (
            <div className="rounded-xl border border-[#80643d]/60 bg-[#2b221a] p-3">
              <span className="mb-2 block text-xs font-bold text-[#b8a17d]">
                🏠 Connected Submaps / Interior Rooms ({childSubmaps.length}):
              </span>

              <div className="flex flex-wrap gap-2">
                {childSubmaps.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => {
                      setAppState((previous) => ({
                        ...previous,
                        activeMapId: sub.id,
                      }));
                      setSelectedPin(null);
                    }}
                    className="rounded-lg border border-[#80643d] bg-[#211c17] px-3 py-1.5 text-xs font-bold text-[#e5bd70] hover:bg-[#3b3024]"
                  >
                    🔍 Enter {sub.name} ({sub.pins.length} markers)
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* MARKER SETUP */}

          {isPlacingMarker && (
            <div className={`${panelCls} border-2 border-amber-600 bg-[#3b2a1a] space-y-2`}>
              <h3 className="font-bold text-amber-300">
                Click on the map to place your marker.
              </h3>

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                <input
                  type="text"
                  value={markerName}
                  onChange={(e) => setMarkerName(e.target.value)}
                  placeholder="Location name"
                  className={inputCls}
                />

                <select
                  value={markerCategory}
                  onChange={(e) =>
                    setMarkerCategory(e.target.value as PinCategory)
                  }
                  className={inputCls}
                >
                  {Object.entries(CATEGORY_COLORS).map(
                    ([key, val]) => (
                      <option key={key} value={key}>
                        {val.icon} {val.label}
                      </option>
                    )
                  )}
                </select>

                <select
                  value={markerTargetSubmap}
                  onChange={(e) =>
                    setMarkerTargetSubmap(e.target.value)
                  }
                  className={inputCls}
                >
                  <option value="">No linked submap</option>
                  {appState.maps
                    .filter((m) => m.id !== currentMap.id)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        Link to Submap: {m.name}
                      </option>
                    ))}
                </select>

                <input
                  type="text"
                  value={markerDesc}
                  onChange={(e) => setMarkerDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {/* MAP AND SIDEBAR */}

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-3">
              <div
                className={`relative h-[600px] w-full overflow-hidden rounded-xl border-2 border-[#80643d] bg-[#15120e] cursor-grab ${
                  isDragging ? "cursor-grabbing" : ""
                } ${isPlacingMarker ? "cursor-crosshair" : ""}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <div
                  ref={mapContainerRef}
                  onClick={handleMapClick}
                  className="relative h-full w-full origin-center transition-transform duration-75"
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  }}
                >
                  <img
                    src={currentMap.url}
                    alt={currentMap.name}
                    className="h-full w-full object-contain pointer-events-none"
                  />

                  {currentMap.pins.map((pin) => {
                    const catInfo =
                      CATEGORY_COLORS[pin.category] ||
                      CATEGORY_COLORS.landmark;

                    const isSelected = selectedPin?.id === pin.id;

                    return (
                      <button
                        key={pin.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPin(pin);
                        }}
                        style={{
                          left: `${pin.x}%`,
                          top: `${pin.y}%`,
                        }}
                        className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 p-1.5 shadow-lg transition-transform hover:scale-125 ${catInfo.bg} ${
                          isSelected
                            ? "ring-4 ring-[#e5bd70] scale-125"
                            : ""
                        }`}
                        title={pin.title}
                      >
                        <span className="text-sm">
                          {catInfo.icon}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#b8a17d]">
                <span>💡 Click &amp; drag to pan map.</span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleZoom(0.2)}
                    className="rounded bg-[#30271e] px-3 py-1 font-bold text-white hover:bg-[#3b3024]"
                  >
                    + Zoom In
                  </button>

                  <button
                    onClick={() => handleZoom(-0.2)}
                    className="rounded bg-[#30271e] px-3 py-1 font-bold text-white hover:bg-[#3b3024]"
                  >
                    - Zoom Out
                  </button>

                  <button
                    onClick={resetView}
                    className="rounded bg-[#30271e] px-2 py-1 text-white hover:bg-[#3b3024]"
                  >
                    Reset View
                  </button>
                </div>
              </div>
            </div>

            {/* MARKER DETAILS */}

            <div className="space-y-6">
              {selectedPin ? (
                <section className={panelCls}>
                  <div className="mb-4 flex items-center justify-between border-b border-[#80643d]/40 pb-3">
                    <h3 className="text-xl font-bold">
                      Marker Details
                    </h3>

                    <button
                      onClick={deleteSelectedPin}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      🗑️ Delete
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-[#b8a17d]">
                        Location Title
                      </label>

                      <input
                        type="text"
                        value={selectedPin.title}
                        onChange={(e) =>
                          updateSelectedPin({ title: e.target.value })
                        }
                        className={`${inputCls} w-full font-bold`}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-[#b8a17d]">
                        Linked Submap (Interior / House Map)
                      </label>

                      <select
                        value={selectedPin.targetSubmapId || ""}
                        onChange={(e) =>
                          updateSelectedPin({
                            targetSubmapId: e.target.value || undefined,
                          })
                        }
                        className={`${inputCls} w-full`}
                      >
                        <option value="">None (Static Location)</option>

                        {appState.maps
                          .filter((m) => m.id !== currentMap.id)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              Jump to: {m.name}
                            </option>
                          ))}
                      </select>

                      {selectedPin.targetSubmapId && (
                        <button
                          onClick={() => {
                            setAppState((previous) => ({
                              ...previous,
                              activeMapId: selectedPin.targetSubmapId!,
                            }));
                            setSelectedPin(null);
                          }}
                          className="mt-2 w-full rounded-lg bg-emerald-800 px-3 py-2 font-bold text-xs text-white hover:bg-emerald-700"
                        >
                          🚪 Enter Linked Submap Now
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-[#b8a17d]">
                        Description
                      </label>

                      <textarea
                        rows={4}
                        value={selectedPin.description}
                        onChange={(e) =>
                          updateSelectedPin({
                            description: e.target.value,
                          })
                        }
                        className={`${inputCls} w-full text-sm`}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-[#b8a17d]">
                        Secrets / DM Notes
                      </label>

                      <textarea
                        rows={3}
                        value={selectedPin.secrets || ""}
                        onChange={(e) =>
                          updateSelectedPin({
                            secrets: e.target.value,
                          })
                        }
                        className={`${inputCls} w-full text-sm`}
                      />
                    </div>
                  </div>
                </section>
              ) : (
                <section className={`${panelCls} text-center py-12`}>
                  <span className="mb-2 block text-4xl">📍</span>
                  <h3 className="text-lg font-bold">
                    No Marker Selected
                  </h3>
                  <p className="mt-1 text-xs text-[#b8a17d]">
                    Click any marker to edit info or jump into a linked submap.
                  </p>
                </section>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}