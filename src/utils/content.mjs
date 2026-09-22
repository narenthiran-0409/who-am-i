export function buildResume(profile, skills, journey) {
  const h = profile.resume.headings;
  return [
    profile.resume.sampleNotice,
    "",
    profile.name,
    profile.role,
    "",
    h.about,
    ...profile.biography,
    "",
    h.skills,
    skills.map((s) => `${s.name} (${s.category})`).join(", "),
    "",
    h.experience,
    ...journey.experience.flatMap((e) =>
      [e, ...(e.history || [])].flatMap(role => [
        [role.title, e.organization, role.period].filter(Boolean).join(" | "),
        ...(role.description ? [role.description] : []),
        ...(role.highlights || []),
        "",
      ]),
    ),
    h.education,
    ...journey.education.flatMap((e) => [
      `${e.title} | ${e.organization} | ${e.period}`,
      e.description,
      "",
    ]),
    h.contact,
    ...profile.facts.filter((f) => f.href).map((f) => `${f.label}: ${f.value}`),
  ].join("\n");
}
export function validateContact(values, errors) {
  const result = {};
  if (!values.name?.trim()) result.name = errors.name;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email?.trim() || ""))
    result.email = errors.email;
  if (!values.message?.trim()) result.message = errors.message;
  return result;
}
export function buildContactDraft(values, config) {
  const body = `${config.fields[0].label}: ${values.name.trim()}\n${config.fields[1].label}: ${values.email.trim()}\n\n${values.message.trim()}`;
  return {
    body,
    href: `mailto:${config.recipient}?subject=${encodeURIComponent(config.subject)}&body=${encodeURIComponent(body)}`,
  };
}
export function buildNavigation(navigation, projects, projectsLabel) {
  const items = [...navigation.items];
  if (projects.enabled && projects.items.length && !items.some(item => item.target === "projects")) {
    items.splice(3, 0, { label: projectsLabel, target: "projects" });
  }
  return { ...navigation, items };
}
