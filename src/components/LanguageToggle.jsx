import { useLang } from '../context/LanguageContext';

export default function LanguageToggle({ className = '' }) {
  const { lang, toggleLang } = useLang();

  return (
    <button
      onClick={toggleLang}
      className={`inline-flex items-center rounded-full border-2 border-navy-100 bg-offwhite-0 text-sm font-medium overflow-hidden ${className}`}
      aria-label={lang === 'en' ? 'Switch to Hindi' : 'Switch to English'}
    >
      <span
        className={`px-3 py-1.5 transition-colors duration-200 ${
          lang === 'en'
            ? 'bg-navy-900 text-offwhite-0'
            : 'text-navy-900 hover:bg-navy-100'
        }`}
      >
        EN
      </span>
      <span
        className={`px-3 py-1.5 transition-colors duration-200 ${
          lang === 'hi'
            ? 'bg-navy-900 text-offwhite-0'
            : 'text-navy-900 hover:bg-navy-100'
        }`}
        style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}
      >
        हिं
      </span>
    </button>
  );
}
