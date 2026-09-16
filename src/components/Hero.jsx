import Icon from "./Icon";
import SmartLink from "./SmartLink";
import HeroHeading from "./HeroHeading";
export default function Hero({ profile }) {
  return (
    <section id="hero" tabIndex={-1} className="hero container">
      <div className="hero-copy">
        <HeroHeading greeting={profile.greeting} intro={profile.intro} />
        <p>
          {profile.summary.map((part, i) =>
            part.emphasis ? (
              <strong key={i}>{part.text}</strong>
            ) : (
              <span key={i}>{part.text}</span>
            ),
          )}
        </p>
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
      <div className="hero-visual" aria-hidden={!profile.heroImage}>
        {profile.heroImage && (
          <img src={profile.heroImage.src} alt={profile.heroImage.alt} />
        )}
      </div>
    </section>
  );
}
