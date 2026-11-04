
import { supabase } from "./supabase";

export async function uploadMap(file: File) {
  const mapId = crypto.randomUUID();

  const extension = file.name.split(".").pop() || "png";
  const filePath = `${mapId}.${extension}`;

  const { data, error } = await supabase.storage
    .from("world-maps")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: mapId,
    path: data.path,
    name: file.name,
    size: file.size,
  };
}
