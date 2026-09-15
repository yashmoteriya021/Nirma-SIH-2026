import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import LanguageToggle from './LanguageToggle';

export default function Footer() {
  const { t } = useLang();

  return (
    <footer className="bg-navy-900 text-offwhite-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <svg className="w-7 h-7" viewBox="0 0 64 64" fill="none">
                <path d="M8 44 C8 44 20 22 32 22 C44 22 56 44 56 44" stroke="#FAF8F3" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
                <path d="M14 44 C14 44 22 28 32 28 C42 28 50 44 50 44" stroke="#C9982A" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                <line x1="6" y1="44" x2="58" y2="44" stroke="#FAF8F3" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              <span className="font-semibold text-lg">{t('navbar.logo')}</span>
            </Link>
            <p className="text-navy-100 text-sm leading-relaxed">
              {t('footer.description')}
            </p>
            <LanguageToggle />
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-base mb-4">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2.5">
              <li>
                <Link to="/" className="text-navy-100 hover:text-accent-gold text-sm transition-colors duration-200">
                  {t('footer.home')}
                </Link>
              </li>
              <li>
                <Link to="/" className="text-navy-100 hover:text-accent-gold text-sm transition-colors duration-200">
                  {t('footer.allSchemes')}
                </Link>
              </li>
              <li>
                <a href="#" className="text-navy-100 hover:text-accent-gold text-sm transition-colors duration-200">
                  {t('footer.about')}
                </a>
              </li>
              <li>
                <a href="#" className="text-navy-100 hover:text-accent-gold text-sm transition-colors duration-200">
                  {t('footer.faqs')}
                </a>
              </li>
              <li>
                <a href="#" className="text-navy-100 hover:text-accent-gold text-sm transition-colors duration-200">
                  {t('footer.contact')}
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-base mb-4">{t('footer.support')}</h3>
            <ul className="space-y-2.5">
              <li>
                <a href="#" className="text-navy-100 hover:text-accent-gold text-sm transition-colors duration-200">
                  {t('footer.accessibility')}
                </a>
              </li>
              <li>
                <a href="#" className="text-navy-100 hover:text-accent-gold text-sm transition-colors duration-200">
                  {t('footer.privacy')}
                </a>
              </li>
              <li>
                <a href="#" className="text-navy-100 hover:text-accent-gold text-sm transition-colors duration-200">
                  {t('footer.terms')}
                </a>
              </li>
            </ul>
          </div>

          {/* Helpline */}
          <div>
            <h3 className="font-semibold text-base mb-4">{t('footer.helpline')}</h3>
            <div className="flex items-center gap-2 text-accent-gold font-semibold text-lg mb-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              {t('footer.helplineNumber')}
            </div>
            <p className="text-navy-100 text-xs leading-relaxed">
              {t('footer.affiliation')}
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-navy-700 mt-8 pt-6 text-center">
          <p className="text-navy-100 text-xs">
            {t('footer.copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
}
