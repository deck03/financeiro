import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Segunda camada de proteção além do middleware — garante que Server
  // Components nunca renderizem dados sem uma sessão válida.
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role_key, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-base-bg">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar fullName={profile.full_name} roleKey={profile.role_key} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
