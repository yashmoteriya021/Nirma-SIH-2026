import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';

export default function SchemeCard({ scheme }) {
  const { t, tData } = useLang();

  // Format currency for display
  const formatAmount = (amount) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(amount % 100000 === 0 ? 0 : 1)} ${tData({ en: 'Lakh', hi: 'लाख' })}`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // Icons per category
  const icons = {
    'micro-finance': (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.15c0 .415.336.75.75.75z" />
      </svg>
    ),
    'term-loan': (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
      </svg>
    ),
    'education-loan': (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
      </svg>
    ),
  };

  return (
    <Link
      to={`/schemes/${scheme.id}`}
      className="scheme-card group block bg-offwhite-0 rounded-xl shadow-sm border border-navy-100 p-6"
    >
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-navy-900 text-offwhite-0 flex items-center justify-center shrink-0 group-hover:bg-navy-700 transition-colors duration-200">
          {icons[scheme.id]}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-ink-900 text-lg group-hover:text-navy-700 transition-colors duration-200">
            {tData(scheme.name)}
          </h3>
          <p className="text-navy-700 text-sm mt-1 line-clamp-2">
            {tData(scheme.description)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-navy-100 text-navy-900 rounded-full text-xs font-medium">
          {t('home.schemeGrid.upTo')} {formatAmount(scheme.maxAmount)}
        </span>
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-navy-100 text-navy-900 rounded-full text-xs font-medium">
          {t('home.schemeGrid.interest')}: {scheme.interestRate.min}%–{scheme.interestRate.max}%
        </span>
      </div>

      <div className="mt-4 flex items-center gap-1 text-accent-gold text-sm font-medium">
        {t('home.schemeGrid.learnMore')}
        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </div>
    </Link>
  );
}
