import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import LoginPage from "@/components/LoginPage";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LoginPage />;
  }

  return <AppShell userId={user.id} userEmail={user.email ?? ""} />;
}
