/// <reference lib="deno.ns" />

/**
 * Supabase Edge Function: invite-teacher
 *
 * Purpose:
 * - Admin creates a Teacher account directly (email + password)
 * - Sets profile.role = 'teacher'
 *
 * Required Secrets:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CreateTeacherBody = {
  email: string;
  full_name: string;
  password: string;
  phone?: string | null;
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
  if (userErr || !userData?.user) {
    return json(401, {
      error: "Invalid token",
      details: userErr?.message ?? "Unknown auth error",
    });
  }

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
  let body: CreateTeacherBody;
  try {
    body = (await req.json()) as CreateTeacherBody;
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const full_name = (body.full_name ?? "").trim();
  const password = (body.password ?? "").trim();
  const phone = body.phone?.trim() || null;

  if (!email) return json(400, { error: "email is required" });
  if (!full_name) return json(400, { error: "full_name is required" });
  if (!password) return json(400, { error: "password is required" });

  // 3) Create teacher account directly (no email confirmation flow).
  const { data: createdData, error: createdErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, phone, role: "teacher" },
  });

  if (createdErr) return json(409, { error: createdErr.message });
  const createdUser = createdData.user;
  if (!createdUser) return json(500, { error: "Create user succeeded but no user returned" });

  // 4) Ensure profiles row and role=teacher (service-role bypasses RLS).
  const { error: upsertErr } = await supabaseAdmin.from("profiles").upsert(
    {
      id: createdUser.id,
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
      id: createdUser.id,
      email: createdUser.email,
    },
  });
});

