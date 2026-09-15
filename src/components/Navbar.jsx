import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import LanguageToggle from './LanguageToggle';
import SearchBar from './SearchBar';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useLang();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-navy-900 shadow-md">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="SchemeSetu Home">
            <svg className="w-8 h-8" viewBox="0 0 64 64" fill="none">
              <path d="M8 44 C8 44 20 22 32 22 C44 22 56 44 56 44" stroke="#FAF8F3" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
              <path d="M14 44 C14 44 22 28 32 28 C42 28 50 44 50 44" stroke="#C9982A" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              <line x1="22" y1="44" x2="22" y2="34" stroke="#FAF8F3" strokeWidth="2" strokeLinecap="round"/>
              <line x1="32" y1="44" x2="32" y2="22" stroke="#FAF8F3" strokeWidth="2" strokeLinecap="round"/>
              <line x1="42" y1="44" x2="42" y2="34" stroke="#FAF8F3" strokeWidth="2" strokeLinecap="round"/>
              <line x1="6" y1="44" x2="58" y2="44" stroke="#FAF8F3" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <span className="text-offwhite-0 font-semibold text-lg tracking-tight">
              {t('navbar.logo')}
            </span>
          </Link>

          {/* Desktop search */}
          <div className="hidden md:flex flex-1 justify-center max-w-lg">
            <SearchBar />
          </div>

          {/* Desktop right actions */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageToggle />
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2 bg-offwhite-0 text-navy-900 font-medium text-sm rounded-xl hover:bg-navy-100 transition-colors duration-200 min-h-[44px]"
            >
              {t('navbar.login')}
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex items-center justify-center w-11 h-11 text-offwhite-0 rounded-lg hover:bg-navy-700 transition-colors duration-200"
            aria-label={mobileOpen ? t('common.close') : t('common.menu')}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile panel */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            mobileOpen ? 'max-h-80 pb-4' : 'max-h-0'
          }`}
        >
          <div className="pt-3 space-y-3">
            <SearchBar onClose={() => setMobileOpen(false)} />
            <div className="flex items-center justify-between gap-3 pt-2">
              <LanguageToggle />
              <button
                onClick={() => { navigate('/login'); setMobileOpen(false); }}
                className="px-5 py-2 bg-offwhite-0 text-navy-900 font-medium text-sm rounded-xl hover:bg-navy-100 transition-colors duration-200 min-h-[44px]"
              >
                {t('navbar.login')}
              </button>
            </div>
            <div className="flex flex-col gap-1 pt-1">
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className="text-offwhite-0 hover:text-accent-gold px-2 py-2 text-sm font-medium transition-colors duration-200"
              >
                {t('navbar.home')}
              </Link>
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className="text-offwhite-0 hover:text-accent-gold px-2 py-2 text-sm font-medium transition-colors duration-200"
              >
                {t('navbar.schemes')}
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
