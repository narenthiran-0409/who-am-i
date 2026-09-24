// Month precision avoids inventing employment start/end days.
export function monthIndex(value) {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
  const [year, month] = value.split("-").map(Number);
  return year * 12 + month - 1;
}

export function roleDuration(dates, now = new Date()) {
  const start = monthIndex(dates?.start);
  const end = dates?.end === null
    ? now.getUTCFullYear() * 12 + now.getUTCMonth()
    : monthIndex(dates?.end);
  if (start === null || end === null || end < start) return null;
  const months = end - start;
  if (months === 0) return "Less than 1 month";
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  return [years && `${years} ${years === 1 ? "year" : "years"}`,
    remainder && `${remainder} ${remainder === 1 ? "month" : "months"}`].filter(Boolean).join(" ");
}

export function rolePeriod(role) {
  const dates = role.roleDates;
  if (monthIndex(dates?.start) === null || (dates.end !== null && monthIndex(dates.end) === null)) return role.period;
  const label = value => {
    const index = monthIndex(value);
    const date = new Date(0);
    date.setUTCFullYear(Math.floor(index / 12), index % 12, 1);
    return new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
  };
  return `${label(dates.start)} - ${dates.end === null ? "Present" : label(dates.end)}`;
}
