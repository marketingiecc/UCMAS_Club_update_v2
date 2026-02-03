/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type InviteTeacherBody = {
  email: string;
  full_name: string;
  phone?: string | null;
  redirectTo?: string | null;
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return json(401, { error: "Missing bearer token" });

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // 1) Verify caller and enforce admin-only access.
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) return json(401, { error: "Invalid token" });

  const callerId = userData.user.id;
  const { data: callerProfile, error: callerProfileErr } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("id", callerId)
    .maybeSingle();

  if (callerProfileErr) return json(500, { error: callerProfileErr.message });
  if (!callerProfile || callerProfile.role !== "admin") {
    return json(403, { error: "Admin only" });
  }

  // 2) Parse and validate body.
  let body: InviteTeacherBody;
  try {
    body = (await req.json()) as InviteTeacherBody;
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const full_name = (body.full_name ?? "").trim();
  const phone = body.phone?.trim() || null;
  const redirectTo = body.redirectTo?.trim() || null;

  if (!email) return json(400, { error: "email is required" });
  if (!full_name) return json(400, { error: "full_name is required" });

  // 3) Invite teacher via Supabase Auth.
  const { data: inviteData, error: inviteErr } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectTo ?? undefined,
      data: { full_name, phone, role: "teacher" },
    });

  if (inviteErr) {
    // Common cases: already registered, invalid email, etc.
    return json(409, { error: inviteErr.message });
  }

  const invitedUser = inviteData.user;
  if (!invitedUser) return json(500, { error: "Invite succeeded but no user returned" });

  // 4) Ensure profiles row and role=teacher (service-role bypasses RLS).
  const { error: upsertErr } = await supabaseAdmin.from("profiles").upsert(
    {
      id: invitedUser.id,
      full_name,
      phone,
      role: "teacher",
    },
    { onConflict: "id" },
  );

  if (upsertErr) return json(500, { error: upsertErr.message });

  return json(200, {
    ok: true,
    user: {
      id: invitedUser.id,
      email: invitedUser.email,
    },
  });
});

