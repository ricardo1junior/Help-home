import { redirect } from "next/navigation";
import { homeFor, requireProfile } from "@/lib/session";

export default async function PainelPage() {
  const { profile } = await requireProfile();
  redirect(homeFor(profile));
}
