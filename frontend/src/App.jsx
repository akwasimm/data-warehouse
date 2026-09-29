import ArchitectureOverview from './sections/ArchitectureOverview';
import BronzeSection from './sections/BronzeSection';
import Footer from './sections/Footer';
import GoldSection from './sections/GoldSection';
import Hero from './sections/Hero';
import SilverSection from './sections/SilverSection';
import ScrollProgress from './components/ScrollProgress';

export default function App() {
  return (
    <>
      {/* Read-progress bar: makes the page read as a journey, not a list. */}
      <ScrollProgress />

      {/* Fixed gradient + blurred orbs. Everything scrolls on top of this. */}
      <div className="backdrop" aria-hidden="true">
        <div className="orb orb--one" />
        <div className="orb orb--two" />
        <div className="orb orb--three" />
      </div>

      <main>
        <Hero />
        <ArchitectureOverview />
        <BronzeSection />
        <SilverSection />
        <GoldSection />
      </main>

      <Footer />
    </>
  );
}
