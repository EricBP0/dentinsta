import { redirect } from "next/navigation";

// A renovação anual virou assinatura: os links antigos levam para os planos.
export default function Renovar() {
  redirect("/assinar");
}
