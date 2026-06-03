"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cloneDemoData } from "@/lib/demo-data";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { demoUserCookie, requireAuth } from "@/lib/auth/session";
import { getAuthenticatedHomePath } from "@/lib/auth/redirects";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { forgotPasswordSchema, loginSchema, ownPasswordSchema, ownProfileSchema, resetPasswordSchema } from "@/features/auth/validation";
import { logActivityEvent } from "@/lib/activity/log";
import { logAudit } from "@/lib/audit/log";

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
    const roles = cloneDemoData()
      .userRoles.filter((role) => role.user_id === profile.id)
      .map((role) => role.role);
    redirect(getAuthenticatedHomePath(profile, roles));
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
  const [{ data: roles }, { data: profile }] = await Promise.all([
    admin.from("user_roles").select("roles(name)").eq("user_id", userId),
    admin.from("profiles").select("must_change_password").eq("id", userId).single()
  ]);
  const roleNames =
    roles
      ?.map((row) => {
        const roleRecord = row.roles as { name?: string } | { name?: string }[] | null;
        return Array.isArray(roleRecord) ? roleRecord[0]?.name : roleRecord?.name;
      })
      .filter((role): role is "student" | "teacher" | "admin" | "super_admin" => Boolean(role)) ?? [];

  redirect(getAuthenticatedHomePath({ must_change_password: profile?.must_change_password ?? false }, roleNames));
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

export async function updateOwnProfileAction(formData: FormData) {
  const user = await requireAuth();
  const parsed = ownProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/account?error=Enter%20a%20valid%20name%20and%20email");
  }

  if (isDemoMode()) {
    redirect("/account?success=Demo%20mode%20validated%20the%20form.%20Connect%20Supabase%20to%20persist%20changes.");
  }

  if (!isSupabaseConfigured()) {
    redirect("/account?error=Supabase%20is%20not%20configured");
  }

  const admin = createAdminClient();
  const { data: beforeData } = await admin.from("profiles").select("*").eq("id", user.id).single();
  const authUpdate = await admin.auth.admin.updateUserById(user.id, {
    email: parsed.data.email,
    user_metadata: { full_name: parsed.data.full_name }
  });
  if (authUpdate.error) throw new Error(authUpdate.error.message);

  const profileUpdate = await admin
    .from("profiles")
    .update({ email: parsed.data.email, full_name: parsed.data.full_name })
    .eq("id", user.id);
  if (profileUpdate.error) throw new Error(profileUpdate.error.message);

  await logAudit({
    actorId: user.id,
    action: "user_updated",
    resourceType: "profile",
    resourceId: user.id,
    beforeData,
    afterData: { email: parsed.data.email, full_name: parsed.data.full_name }
  });
  redirect("/account?success=Profile%20updated");
}

export async function updateOwnPasswordAction(formData: FormData) {
  const user = await requireAuth();
  const parsed = ownPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/account?error=Passwords%20must%20match%20and%20be%20at%20least%208%20characters");
  }

  if (isDemoMode()) {
    redirect("/account?success=Demo%20mode%20validated%20the%20form.%20Connect%20Supabase%20to%20persist%20changes.");
  }

  if (!isSupabaseConfigured()) {
    redirect("/account?error=Supabase%20is%20not%20configured");
  }

  const admin = createAdminClient();
  const authUpdate = await admin.auth.admin.updateUserById(user.id, {
    password: parsed.data.password
  });
  if (authUpdate.error) throw new Error(authUpdate.error.message);

  const profileUpdate = await admin.from("profiles").update({ must_change_password: false }).eq("id", user.id);
  if (profileUpdate.error) throw new Error(profileUpdate.error.message);

  await logAudit({
    actorId: user.id,
    action: "user_updated",
    resourceType: "profile",
    resourceId: user.id,
    afterData: { password_updated: true }
  });
  redirect("/account?success=Password%20updated");
}
