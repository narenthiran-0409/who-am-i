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
export function buildNavigation(navigation, projects, projectsLabel) {
  const items = navigation.items.filter(item => item.target !== "projects" || (projects.enabled && projects.items.length));
  if (projects.enabled && projects.items.length && !items.some(item => item.target === "projects")) {
    items.splice(3, 0, { label: projectsLabel, target: "projects" });
  }
  return { ...navigation, items };
}
