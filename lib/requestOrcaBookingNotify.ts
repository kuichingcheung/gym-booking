type OrcaBookingAction = "created" | "cancelled" | "updated";

export function requestOrcaBookingNotify(
  action: OrcaBookingAction,
  bookingId: string
) {
  if (!bookingId) return;

  void fetch("/api/orca/booking-webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    keepalive: true,
    body: JSON.stringify({ action, bookingId }),
  })
    .then((response) => {
      if (!response.ok) {
        console.error("ORCA booking notify failed", action, bookingId, response.status);
      }
    })
    .catch((error) => {
      console.error("ORCA booking notify error", action, bookingId, error);
    });
}
