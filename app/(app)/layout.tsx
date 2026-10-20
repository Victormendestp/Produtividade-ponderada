import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DataProvider } from "@/components/DataProvider";
import { DialogsProvider } from "@/components/Dialogs";
import { AppShell } from "@/components/AppShell";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile || profile.papel === "pendente") redirect("/pendente");
  return (
    <DataProvider profile={profile}>
      <DialogsProvider>
        <AppShell>{children}</AppShell>
      </DialogsProvider>
    </DataProvider>
  );
}
