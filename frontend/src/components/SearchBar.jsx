import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import schemesData from '../data/schemes.json';

export default function SearchBar({ onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();
  const { t, tData } = useLang();

  const schemes = schemesData.schemes;

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSearch(value) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const q = value.toLowerCase();
    const matched = schemes.filter(scheme => {
      const nameEn = scheme.name.en.toLowerCase();
      const nameHi = scheme.name.hi;
      const catEn = scheme.category.en.toLowerCase();
      const catHi = scheme.category.hi;
      const descEn = scheme.description.en.toLowerCase();
      return (
        nameEn.includes(q) ||
        nameHi.includes(q) ||
        catEn.includes(q) ||
        catHi.includes(q) ||
        descEn.includes(q)
      );
    });
    setResults(matched);
    setIsOpen(matched.length > 0);
  }

  function handleSelect(schemeId) {
    setQuery('');
    setIsOpen(false);
    if (onClose) onClose();
    navigate(`/schemes/${schemeId}`);
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative">
        {/* Search Icon */}
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-100"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={t('navbar.search')}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-navy-700 text-offwhite-0 placeholder-navy-100 text-sm border border-navy-700 focus:border-accent-gold focus:outline-none"
          aria-label={t('navbar.search')}
        />
      </div>

      {/* Autocomplete dropdown */}
      {isOpen && (
        <ul className="absolute top-full left-0 right-0 mt-1 bg-offwhite-0 rounded-xl shadow-md border border-navy-100 overflow-hidden z-50">
          {results.map(scheme => (
            <li key={scheme.id}>
              <button
                onClick={() => handleSelect(scheme.id)}
                className="w-full text-left px-4 py-3 hover:bg-navy-100 transition-colors duration-200 flex items-center gap-3"
              >
                <span className="text-accent-gold">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </span>
                <div>
                  <p className="text-ink-900 font-medium text-sm">{tData(scheme.name)}</p>
                  <p className="text-navy-700 text-xs">{tData(scheme.category)}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
