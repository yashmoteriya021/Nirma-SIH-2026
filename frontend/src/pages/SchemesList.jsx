import { useState, useEffect, useMemo } from 'react';
import { useLang } from '../context/LanguageContext';
import SchemeCard from '../components/SchemeCard';
import schemesData from '../data/schemes.json';

export default function SchemesList() {
  const { t, tData } = useLang();
  
  const [schemes, setSchemes] = useState(schemesData.schemes);
  const [filter, setFilter] = useState('All');



  // Get unique categories for the filter
  const categories = useMemo(() => {
    const cats = new Set(schemes.map(s => s.category.en));
    return ['All', ...Array.from(cats)];
  }, [schemes]);

  const filteredSchemes = filter === 'All' 
    ? schemes 
    : schemes.filter(s => s.category.en === filter);

  return (
    <div className="bg-offwhite-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-4">
            Explore All Schemes
          </h1>
          <p className="text-navy-700 max-w-2xl mx-auto">
            Discover a comprehensive range of financial assistance programs tailored for your specific needs, from agriculture and education to tech startups and green energy.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === cat
                  ? 'bg-navy-900 text-white'
                  : 'bg-white text-navy-700 border border-navy-200 hover:bg-navy-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSchemes.map((scheme, idx) => (
            <SchemeCard key={scheme.id || idx} scheme={scheme} />
          ))}
        </div>
        
        {filteredSchemes.length === 0 && (
          <div className="text-center py-20 text-navy-700">
            No schemes found for this category.
          </div>
        )}
      </div>
    </div>
  );
}
