import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  notifyOrcaBookingWebhook,
  type OrcaBookingAction,
  type OrcaBookingRecord,
} from "@/lib/notifyOrcaBookingWebhook";

const ACTIONS = new Set<OrcaBookingAction>(["created", "cancelled", "updated"]);

type ProfileRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function loadProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string
): Promise<ProfileRow | null> {
  const full = await supabase
    .from("profiles")
    .select("id, name, email, role")
    .eq("id", id)
    .maybeSingle();

  if (!full.error && full.data) {
    const row = full.data as ProfileRow;
    return {
      id: row.id,
      name: row.name ?? null,
      email: row.email ?? null,
      role: row.role ?? null,
    };
  }

  const basic = await supabase
    .from("profiles")
    .select("id, name, role")
    .eq("id", id)
    .maybeSingle();

  if (basic.error || !basic.data) return null;

  const row = basic.data as Omit<ProfileRow, "email">;
  return {
    id: row.id,
    name: row.name ?? null,
    email: null,
    role: row.role ?? null,
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const action = isRecord(body) ? body.action : undefined;
  const bookingId = isRecord(body) ? body.bookingId : undefined;

  if (
    typeof action !== "string" ||
    !ACTIONS.has(action as OrcaBookingAction) ||
    typeof bookingId !== "string" ||
    bookingId.trim() === ""
  ) {
    return Response.json({ ok: false, error: "invalid payload" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !data) {
    console.error(
      "ORCA booking webhook: booking not readable",
      bookingId,
      error?.message
    );
    return Response.json({ ok: false, error: "booking not found" }, { status: 404 });
  }

  const booking = data as OrcaBookingRecord & { coach_id?: string | null };
  const actor = await loadProfile(supabase, user.id);
  const isOwner = booking.coach_id === user.id;
  const isAdmin = actor?.role === "admin";

  if (!isOwner && !isAdmin) {
    return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  if (action === "cancelled" && booking.status !== "cancelled") {
    console.error(
      "ORCA booking webhook: cancel notify skipped because status is",
      booking.status,
      bookingId
    );
    return Response.json({ ok: true, skipped: true });
  }

  if (
    (action === "created" || action === "updated") &&
    booking.status &&
    booking.status !== "active"
  ) {
    console.error(
      "ORCA booking webhook: notify skipped because status is",
      booking.status,
      action,
      bookingId
    );
    return Response.json({ ok: true, skipped: true });
  }

  const coach =
    isOwner && actor
      ? actor
      : booking.coach_id
        ? await loadProfile(supabase, booking.coach_id)
        : null;

  const snapshot: OrcaBookingRecord = {
    ...booking,
    id: booking.id,
    coach_name: coach?.name ?? booking.coach_name ?? null,
    coach_email: coach?.email ?? booking.coach_email ?? null,
  };

  after(async () => {
    await notifyOrcaBookingWebhook({
      action: action as OrcaBookingAction,
      booking: snapshot,
    });
  });

  return Response.json({ ok: true });
}
