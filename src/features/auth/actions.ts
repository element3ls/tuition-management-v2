"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cloneDemoData } from "@/lib/demo-data";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { demoUserCookie } from "@/lib/auth/session";
import { hasAdminRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { forgotPasswordSchema, loginSchema, resetPasswordSchema } from "@/features/auth/validation";
import { logActivityEvent } from "@/lib/activity/log";

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/login?error=Invalid%20email%20or%20password");
  }

  const { email, password } = parsed.data;

  if (isDemoMode()) {
    const profile = cloneDemoData().profiles.find((candidate) => candidate.email.toLowerCase() === email.toLowerCase());
    if (!profile || password.length === 0) {
      redirect("/login?error=Invalid%20email%20or%20password");
    }

    const cookieStore = await cookies();
    cookieStore.set(demoUserCookie, profile.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/"
    });
    await logActivityEvent({
      userId: profile.id,
      eventType: "login",
      resourceType: null,
      resourceId: null,
      metadata: { mode: "demo" }
    });
    redirect(profile.email === "admin@example.com" ? "/admin" : "/dashboard");
  }

  if (!isSupabaseConfigured()) {
    redirect("/login?error=Supabase%20is%20not%20configured");
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const userId = data.user?.id;
  if (!userId) {
    redirect("/login?error=Unable%20to%20read%20user%20session");
  }

  await logActivityEvent({
    userId,
    eventType: "login",
    resourceType: null,
    resourceId: null,
    metadata: { mode: "supabase" }
  });

  const admin = createAdminClient();
  const { data: roles } = await admin.from("user_roles").select("roles(name)").eq("user_id", userId);
  const roleNames =
    roles
      ?.map((row) => {
        const roleRecord = row.roles as { name?: string } | { name?: string }[] | null;
        return Array.isArray(roleRecord) ? roleRecord[0]?.name : roleRecord?.name;
      })
      .filter((role): role is "student" | "teacher" | "admin" | "super_admin" => Boolean(role)) ?? [];

  redirect(hasAdminRole(roleNames) ? "/admin" : "/dashboard");
}

export async function logoutAction() {
  if (isDemoMode()) {
    const cookieStore = await cookies();
    cookieStore.delete(demoUserCookie);
    redirect("/login");
  }

  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}

export async function forgotPasswordAction(formData: FormData) {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/forgot-password?error=Enter%20a%20valid%20email");
  }

  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.resetPasswordForEmail(parsed.data.email);
  }

  redirect("/forgot-password?success=Reset%20instructions%20sent");
}

export async function resetPasswordAction(formData: FormData) {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/reset-password?error=Passwords%20must%20match%20and%20be%20at%20least%208%20characters");
  }

  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.updateUser({ password: parsed.data.password });
  }

  redirect("/login?success=Password%20updated");
}
