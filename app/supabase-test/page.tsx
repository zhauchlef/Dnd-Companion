
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SupabaseTest() {
  const [status, setStatus] = useState("Connecting...");

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ error }) => {
        if (error) {
          setStatus("Connection error: " + error.message);
        } else {
          setStatus("Connected successfully!");
        }
      })
      .catch((error) => {
        setStatus("Failed: " + error.message);
      });
  }, []);

  return (
    <div style={{
      background: "#211c17",
      color: "#e5bd70",
      padding: 40,
      minHeight: "100vh"
    }}>
      <h1>D&D World Map Connection Test</h1>
      <p>{status}</p>
    </div>
  );
}
