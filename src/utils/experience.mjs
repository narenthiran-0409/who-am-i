import { monthIndex } from "./timeline.mjs";

export function experienceDuration(journey, now = new Date()) {
  const current = now.getUTCFullYear() * 12 + now.getUTCMonth();
  const ranges = (journey.experience ?? []).flatMap(item => {
    const dates = item.employmentDates;
    const start = monthIndex(dates?.start);
    const end = dates?.end === null ? current : monthIndex(dates?.end);
    return start !== null && end !== null && start <= current && end >= start
      ? [[start, Math.min(end, current)]] : [];
  }).sort((a, b) => a[0] - b[0]);
  // Count overlapping jobs once; exclude gaps between separate employments.
  let total = 0, previousEnd = -Infinity;
  for (const [start, end] of ranges) {
    total += Math.max(0, end - Math.max(start, previousEnd));
    previousEnd = Math.max(previousEnd, end);
  }
  if (!ranges.length) return "Not specified";
  if (!total) return "Less than 1 month";
  const years = Math.floor(total / 12), months = total % 12;
  return [years && `${years} ${years === 1 ? "year" : "years"}`,
    months && `${months} ${months === 1 ? "month" : "months"}`].filter(Boolean).join(" ");
}

export function resolveProfileExperience(profile, journey, now = new Date()) {
  const experience = experienceDuration(journey, now);
  const replace = value => typeof value === "string" ? value.replaceAll("{{experience}}", experience) : value;
  return {
    ...profile,
    summary: profile.summary.map(part => ({ ...part, text: replace(part.text) })),
    biography: profile.biography.map(replace),
    facts: profile.facts.map(fact => ({ ...fact, value: replace(fact.value) })),
  };
}
