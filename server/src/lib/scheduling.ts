export function isTimeAllowed(startMs: number, endMs: number, schedule: any) {
  if (!schedule) return { allowed: true };
  const startDate = new Date(startMs);
  const weekDay = startDate.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase(); // mon, tue...
  const ranges = schedule[weekDay];

  if (!ranges || ranges.length === 0) {
      const tomorrow = new Date(startDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0,0,0,0);
      return { allowed: false, nextStart: tomorrow.getTime() };
  }

  for (const range of ranges) {
      const [startStr, endStr] = range.split('-');
      const [sH, sM] = startStr.split(':').map(Number);
      const [eH, eM] = endStr.split(':').map(Number);

      const rangeStart = new Date(startDate);
      rangeStart.setHours(sH, sM, 0, 0);

      const rangeEnd = new Date(startDate);
      rangeEnd.setHours(eH, eM, 0, 0);

      if (startMs >= rangeStart.getTime() && endMs <= rangeEnd.getTime()) {
          return { allowed: true };
      }

      if (startMs < rangeStart.getTime()) {
           return { allowed: false, nextStart: rangeStart.getTime() };
      }
  }

  const tomorrow = new Date(startDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0,0,0,0);
  return { allowed: false, nextStart: tomorrow.getTime() };
}
