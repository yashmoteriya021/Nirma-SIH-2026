import { useLang } from '../context/LanguageContext';
import SchemeRecommender from '../components/SchemeRecommender';
import SchemeCard from '../components/SchemeCard';
import StatChip from '../components/StatChip';
import Accordion from '../components/Accordion';
import schemesData from '../data/schemes.json';

export default function Home() {
  const { t } = useLang();
  const schemes = schemesData.schemes;

  const faqItems = [
    { q: t('home.faq.items.0.q'), a: t('home.faq.items.0.a') },
    { q: t('home.faq.items.1.q'), a: t('home.faq.items.1.a') },
    { q: t('home.faq.items.2.q'), a: t('home.faq.items.2.a') },
    { q: t('home.faq.items.3.q'), a: t('home.faq.items.3.a') },
    { q: t('home.faq.items.4.q'), a: t('home.faq.items.4.a') },
  ];

  const howItWorksIcons = [
    <svg key="1" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>,
    <svg key="2" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>,
    <svg key="3" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>,
    <svg key="4" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>,
  ];

  return (
    <main>
      {/* ===== 1. Hero ===== */}
      <section className="bg-navy-900 text-offwhite-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
              {t('home.hero.title')}
            </h1>
            <p className="mt-4 text-lg text-navy-100 leading-relaxed max-w-2xl mx-auto">
              {t('home.hero.subtitle')}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="#recommender"
                className="px-8 py-3.5 bg-accent-gold text-navy-900 font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity duration-200 min-h-[44px] flex items-center justify-center"
              >
                {t('home.hero.findScheme')}
              </a>
              <a
                href="#scheme-grid"
                className="px-8 py-3.5 border-2 border-offwhite-0 text-offwhite-0 font-semibold text-sm rounded-xl hover:bg-offwhite-0 hover:text-navy-900 transition-colors duration-200 min-h-[44px] flex items-center justify-center"
              >
                {t('home.hero.browseAll')}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 2. Trust Strip ===== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatChip
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            }
            value="100+"
            label={t('home.trust.partners')}
          />
          <StatChip
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
            }
            value="90%"
            label={t('home.trust.funding')}
          />
          <StatChip
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            value="4%"
            label={t('home.trust.interest')}
          />
          <StatChip
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            }
            value="SC"
            label={t('home.trust.community')}
          />
        </div>
      </section>

      {/* ===== 3. Smart Scheme Recommender ===== */}
      <section id="recommender" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <SchemeRecommender />
      </section>

      {/* ===== 4. Scheme Category Grid ===== */}
      <section id="scheme-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-navy-900 text-center mb-8">
          {t('home.schemeGrid.title')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {schemes.map(scheme => (
            <SchemeCard key={scheme.id} scheme={scheme} />
          ))}
        </div>
      </section>

      {/* ===== 5. How It Works ===== */}
      <section className="bg-navy-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-offwhite-0 text-center mb-12">
            {t('home.howItWorks.title')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-navy-700 text-accent-gold flex items-center justify-center mx-auto mb-4">
                  {howItWorksIcons[i]}
                </div>
                <div className="w-8 h-8 rounded-full bg-accent-gold text-navy-900 font-bold flex items-center justify-center mx-auto mb-3 text-sm">
                  {i + 1}
                </div>
                <h3 className="text-offwhite-0 font-semibold text-base mb-2">
                  {t(`home.howItWorks.steps.${i}`)}
                </h3>
                <p className="text-navy-100 text-sm leading-relaxed">
                  {t(`home.howItWorks.stepDescriptions.${i}`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 6. Impact Snapshot ===== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-navy-900 text-center mb-2">
          {t('home.impact.title')}
        </h2>
        <p className="text-center text-navy-700 text-xs mb-10 italic">
          {t('home.impact.note')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[0, 1, 2].map(i => {
            const stat = {
              0: { value: '15,000+', icon: '👥' },
              1: { value: '₹120 Cr+', icon: '💰' },
              2: { value: '28', icon: '🗺️' },
            }[i];
            return (
              <div key={i} className="bg-offwhite-0 rounded-xl border border-navy-100 p-8 text-center shadow-sm">
                <p className="text-4xl mb-2">{stat.icon}</p>
                <p className="text-3xl font-bold text-navy-900 mb-1">{stat.value}</p>
                <p className="text-navy-700 text-sm">{t(`home.impact.stats.${i}.label`)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== 7. FAQ Preview ===== */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-navy-900 text-center mb-8">
          {t('home.faq.title')}
        </h2>
        <div className="space-y-3">
          {faqItems.map((item, i) => (
            <Accordion key={i} question={item.q} answer={item.a} />
          ))}
        </div>
      </section>
    </main>
  );
}
