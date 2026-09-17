import Icon from "./Icon";
import SmartLink from "./SmartLink";
import HeroHeading from "./HeroHeading";
import { makeTitle } from "./hero/DottedTitle";

export default function Hero({ profile }) {
  const title = makeTitle(profile.greeting);
  return (
    <section id="hero" tabIndex={-1} className="hero container">
      <div
        className="hero-copy"
        style={{ "--hero-title-duration": `${title?.duration ?? 0}s` }}
      >
        <HeroHeading greeting={profile.greeting} intro={profile.intro} title={title} />
        <div className="hero-details">
          <div className="hero-summary-mask">
            <p className="hero-summary">
              {profile.summary.map((part, i) =>
                part.emphasis ? (
                  <strong key={i}>{part.text}</strong>
                ) : (
                  <span key={i}>{part.text}</span>
                ),
              )}
            </p>
          </div>
          <div className="social-links">
            {profile.socialLinks.map((link) => (
              <SmartLink
                key={link.label}
                href={link.href}
                className="social-link"
                aria-label={link.label}
              >
                <Icon name={link.icon} />
              </SmartLink>
            ))}
            <span className="social-divider" />
          </div>
        </div>
      </div>
      <div className="hero-visual" aria-hidden={!profile.heroImage}>
        {profile.heroImage && (
          <img src={profile.heroImage.src} alt={profile.heroImage.alt} />
        )}
      </div>
    </section>
  );
}
