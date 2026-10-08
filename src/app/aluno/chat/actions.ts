"use server";

import { redirect } from "next/navigation";
import { exigirLogin } from "@/lib/auth";

export async function apagarConversa(formData: FormData) {
  const { supabase } = await exigirLogin();
  // O RLS só deixa apagar as conversas do próprio aluno.
  await supabase.from("chat_conversas").delete().eq("id", String(formData.get("id") ?? ""));
  redirect("/aluno/chat");
}
