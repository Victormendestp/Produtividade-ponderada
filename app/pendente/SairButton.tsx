"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SairButton() {
  const router = useRouter();
  return (
    <button className="btn" onClick={async () => { await createClient().auth.signOut(); router.replace("/login"); router.refresh(); }}>
      Sair
    </button>
  );
}
