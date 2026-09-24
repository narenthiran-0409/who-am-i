import ServerTeaBreak from "./components/ServerTeaBreak";
import { useEffect } from "react";
import { buildNavigation } from "./utils/content.mjs";
import usePortfolio from "./hooks/usePortfolio";
import Navigation from "./components/Navigation";
import Hero from "./components/Hero";
import About from "./components/About";
import Certifications from "./components/Certifications";
import Projects from "./components/Projects";
import Skills from "./components/Skills";
import Journey from "./components/Journey";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
export default function App() {
  const { data, error, retry } = usePortfolio();
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    document.getElementById(hash)?.scrollIntoView();
  }, [data]);
  if (error) return <ServerTeaBreak retrying={false} onRetry={retry} />;
  if (!data) return (
    <main id="main" className="portfolio-status">
      <p role="status">Loading portfolio...</p>
    </main>
  );
  const { site, profile, certifications, skills, journey, projects, contact } = data;
  const navigation = buildNavigation(site.navigation, projects, site.labels.projectsNavigation);
  return (
    <>
      <a className="skip-link" href="#main">
        {site.navigation.skip}
      </a>
      <Navigation data={navigation} />
      <main id="main" tabIndex={-1}>
        <Hero profile={profile} />
        <About
          profile={profile}
          heading={site.sections.about}
          labels={site.labels}
          skills={skills}
          journey={journey}
        />
        <Certifications
          items={certifications}
          heading={site.sections.certifications}
          labels={site.labels}
        />
        <Projects
          data={projects}
          heading={site.sections.projects}
          labels={site.labels}
        />
        <Skills items={skills} heading={site.sections.skills} labels={site.labels} />
        <Journey data={journey} heading={site.sections.journey} />
        <Contact data={contact} />
      </main>
      <Footer data={site.footer} />
    </>
  );
}
