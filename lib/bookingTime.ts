const HONG_KONG_OFFSET = "+08:00";

export function hasBookingSlotStarted(bookingDate: string, startTime: string) {
  const time =
    startTime.length >= 8 ? startTime.slice(0, 8) : `${startTime.slice(0, 5)}:00`;
  const startMs = Date.parse(`${bookingDate}T${time}${HONG_KONG_OFFSET}`);
  if (Number.isNaN(startMs)) return true;
  return Date.now() >= startMs;
}
