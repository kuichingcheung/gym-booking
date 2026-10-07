export type SlotType = "normal" | "one_to_two";

export function formatHm(totalMinutes: number) {
  if (totalMinutes >= 24 * 60) return "24:00";
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function buildTimeSlots() {
  const slots: string[] = [];
  // 每次 1 小時，開始時間每 30 分鐘一格（最後一格 23:00-24:00）
  for (let minutes = 7 * 60; minutes <= 23 * 60; minutes += 30) {
    slots.push(`${formatHm(minutes)}-${formatHm(minutes + 60)}`);
  }
  return slots;
}

export function slotClassCost(type: SlotType) {
  return type === "one_to_two" ? 1.5 : 1;
}
