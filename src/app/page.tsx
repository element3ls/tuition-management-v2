import { redirect } from "next/navigation";
import { getLoginRedirect } from "@/lib/auth/session";

export default async function HomePage() {
  redirect(await getLoginRedirect());
}
