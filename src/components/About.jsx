import SectionHeading from "./SectionHeading";
import Icon from "./Icon";
import SmartLink from "./SmartLink";
export default function About({ profile, heading, labels, skills, journey }) {
  return (
    <section
      id="about"
      tabIndex={-1}
      className="section container"
      aria-labelledby="about-title"
    >
      <SectionHeading {...heading} id="about-title" />
      <div className="about-grid">
        <article className="bio-card panel">
          <div className="portrait">
            <img
              src={profile.portrait.src}
              alt={profile.portrait.alt}
              width="192"
              height="192"
              loading="lazy"
            />
          </div>
          <h3>{profile.aboutRole}</h3>
          {profile.biography.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <div className="resume-row">
            <a
              className="button button-outline"
              href={profile.resume.url || profile.resume.generatedUrl}
              download={
                profile.resume.url ? undefined : profile.resume.filename
              }
            >
              <Icon name="download" size={16} />
              {labels.downloadResume}
            </a>
          </div>
        </article>
        <aside className="personal-data panel">
          <h3 className="eyebrow">{labels.personalData}</h3>
          <dl className="facts-grid">
            {profile.facts.map((f) => (
              <div key={f.label}>
                <dt>
                  <Icon name={f.icon} size={15} />
                  <span>{f.label}</span>
                </dt>
                <dd>
                  {f.href ? (
                    <SmartLink href={f.href}>{f.value}</SmartLink>
                  ) : (
                    f.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </section>
  );
}
