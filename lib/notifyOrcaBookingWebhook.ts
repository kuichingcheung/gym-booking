export type OrcaBookingAction = "created" | "cancelled" | "updated";

export type OrcaBookingRecord = {
  id: string;
  coach_id?: string | null;
  coach_name?: string | null;
  coach_email?: string | null;
  booking_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  slot_type?: string | null;
  status?: string | null;
  class_cost?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type OrcaBookingWebhookPayload = {
  action: OrcaBookingAction;
  coach: string;
  date: string;
  slot: string;
  status: string;
  type: string;
  bookingId: string;
  updatedAt: string;
  coachId: string | null;
  coachEmail: string | null;
  startTime: string | null;
  endTime: string | null;
  classCost: number | null;
  createdAt: string | null;
};

function readServerEnv(name: string) {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function text(value: string | null | undefined) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function clock(value: string | null | undefined) {
  const raw = text(value);
  if (!raw) return "";
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return raw;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function dateOnly(value: string | null | undefined) {
  const raw = text(value);
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : raw;
}

function toIso(value: string | null | undefined) {
  const raw = text(value);
  if (!raw) return null;
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}

function classCost(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function buildOrcaBookingPayload(
  action: OrcaBookingAction,
  booking: OrcaBookingRecord
): OrcaBookingWebhookPayload {
  const start = clock(booking.start_time);
  const end = clock(booking.end_time);
  const coach =
    text(booking.coach_name) ||
    text(booking.coach_email) ||
    text(booking.coach_id);

  return {
    action,
    coach,
    date: dateOnly(booking.booking_date),
    slot: start && end ? `${start}-${end}` : start || end,
    status: text(booking.status),
    type: text(booking.slot_type),
    bookingId: booking.id,
    updatedAt:
      toIso(booking.updated_at) ||
      toIso(booking.created_at) ||
      new Date().toISOString(),
    coachId: text(booking.coach_id) || null,
    coachEmail: text(booking.coach_email) || null,
    startTime: text(booking.start_time) || null,
    endTime: text(booking.end_time) || null,
    classCost: classCost(booking.class_cost),
    createdAt: toIso(booking.created_at),
  };
}

export async function notifyOrcaBookingWebhook(input: {
  action: OrcaBookingAction;
  booking: OrcaBookingRecord;
}) {
  const url = readServerEnv("ORCA_BOOKING_WEBHOOK_URL");
  const token = readServerEnv("ORCA_BOOKING_WEBHOOK_TOKEN");
  const bookingId = input.booking.id;

  if (!url || !token) {
    console.error(
      "ORCA booking webhook skipped: ORCA_BOOKING_WEBHOOK_URL or ORCA_BOOKING_WEBHOOK_TOKEN is not set",
      input.action,
      bookingId
    );
    return;
  }

  const payload = buildOrcaBookingPayload(input.action, input.booking);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.error(
        "ORCA booking webhook failed",
        input.action,
        bookingId,
        response.status
      );
      return;
    }

    console.info("ORCA booking webhook sent", input.action, bookingId, response.status);
  } catch (error) {
    console.error("ORCA booking webhook error", input.action, bookingId, error);
  }
}
