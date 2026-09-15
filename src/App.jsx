import { useEffect } from "react";
import {
  site,
  profile,
  certifications,
  skills,
  journey,
  projects,
  contact,
} from "./data";
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
  const navigation = { ...site.navigation, items: [...site.navigation.items] };
  if (projects.enabled && projects.items.length)
    navigation.items.splice(3, 0, {
      label: site.labels.projectsNavigation,
      target: "projects",
    });
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    document.getElementById(hash)?.scrollIntoView();
  }, []);
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
        <Skills items={skills} heading={site.sections.skills} />
        <Journey data={journey} heading={site.sections.journey} />
        <Contact data={contact} />
      </main>
      <Footer data={site.footer} />
    </>
  );
}
