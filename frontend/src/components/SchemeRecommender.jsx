import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import schemesData from '../data/schemes.json';

export default function SchemeRecommender() {
  const { t, tData } = useLang();
  const [purpose, setPurpose] = useState('');
  const [cost, setCost] = useState('');
  const [income, setIncome] = useState('');
  const [isStudying, setIsStudying] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const schemes = schemesData.schemes;

  function handleSubmit(e) {
    e.preventDefault();
    setResult(null);
    setError('');

    const incomeNum = parseInt(income, 10);
    const costNum = parseInt(cost, 10);

    if (!purpose || !income) {
      setError(t('common.required'));
      return;
    }

    // Rule 1: Income check
    if (incomeNum > 500000) {
      setError(t('home.recommender.notEligible'));
      return;
    }

    // Rule 2: Education
    if (purpose === 'education') {
      setResult(schemes.find(s => s.id === 'education-loan'));
      return;
    }

    if (!cost) {
      setError(t('common.required'));
      return;
    }

    // Rule 5: Exceeds max
    if (costNum > 5000000) {
      setError(t('home.recommender.exceedsMax'));
      return;
    }

    // Rule 3: Micro Finance
    if (costNum <= 140000) {
      setResult(schemes.find(s => s.id === 'micro-finance'));
      return;
    }

    // Rule 4: Term Loan
    setResult(schemes.find(s => s.id === 'term-loan'));
  }

  function handleReset() {
    setPurpose('');
    setCost('');
    setIncome('');
    setIsStudying('');
    setResult(null);
    setError('');
  }

  return (
    <div className="bg-offwhite-0 rounded-xl shadow-sm border border-navy-100 p-6 sm:p-8">
      <h2 className="text-2xl font-semibold text-navy-900 mb-2">
        {t('home.recommender.title')}
      </h2>
      <p className="text-navy-700 text-sm mb-6">
        {t('home.recommender.subtitle')}
      </p>

      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Purpose */}
          <div>
            <label htmlFor="purpose" className="block text-sm font-medium text-ink-900 mb-1.5">
              {t('home.recommender.purpose')}
            </label>
            <select
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-navy-100 bg-offwhite-0 text-ink-900 text-sm focus:border-accent-gold focus:outline-none min-h-[44px]"
            >
              <option value="">{t('common.selectOption')}</option>
              <option value="small">{t('home.recommender.purposeOptions.small')}</option>
              <option value="large">{t('home.recommender.purposeOptions.large')}</option>
              <option value="education">{t('home.recommender.purposeOptions.education')}</option>
            </select>
          </div>

          {/* Cost — hide for education */}
          {purpose !== 'education' && (
            <div>
              <label htmlFor="cost" className="block text-sm font-medium text-ink-900 mb-1.5">
                {t('home.recommender.cost')}
              </label>
              <input
                id="cost"
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="e.g. 100000"
                min="0"
                className="w-full px-4 py-3 rounded-xl border border-navy-100 bg-offwhite-0 text-ink-900 text-sm focus:border-accent-gold focus:outline-none min-h-[44px]"
              />
            </div>
          )}

          {/* Income */}
          <div>
            <label htmlFor="income" className="block text-sm font-medium text-ink-900 mb-1.5">
              {t('home.recommender.income')}
            </label>
            <input
              id="income"
              type="number"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="e.g. 300000"
              min="0"
              className="w-full px-4 py-3 rounded-xl border border-navy-100 bg-offwhite-0 text-ink-900 text-sm focus:border-accent-gold focus:outline-none min-h-[44px]"
            />
          </div>

          {/* Currently studying — only for education */}
          {purpose === 'education' && (
            <div>
              <p className="text-sm font-medium text-ink-900 mb-1.5">
                {t('home.recommender.studying')}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsStudying('yes')}
                  className={`px-5 py-2.5 rounded-xl border text-sm font-medium min-h-[44px] transition-colors duration-200 ${
                    isStudying === 'yes'
                      ? 'bg-navy-900 text-offwhite-0 border-navy-900'
                      : 'bg-offwhite-0 text-ink-900 border-navy-100 hover:bg-navy-100'
                  }`}
                >
                  {t('home.recommender.yes')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsStudying('no')}
                  className={`px-5 py-2.5 rounded-xl border text-sm font-medium min-h-[44px] transition-colors duration-200 ${
                    isStudying === 'no'
                      ? 'bg-navy-900 text-offwhite-0 border-navy-900'
                      : 'bg-offwhite-0 text-ink-900 border-navy-100 hover:bg-navy-100'
                  }`}
                >
                  {t('home.recommender.no')}
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-offwhite-50 border border-accent-gold rounded-xl p-4">
              <p className="text-ink-900 text-sm leading-relaxed">{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full sm:w-auto px-8 py-3 bg-navy-900 text-offwhite-0 font-medium text-sm rounded-xl hover:bg-navy-700 transition-colors duration-200 min-h-[44px]"
          >
            {t('home.recommender.submit')}
          </button>
        </form>
      ) : (
        /* Result card */
        <div className="space-y-4">
          <div className="bg-offwhite-50 border border-accent-gold rounded-xl p-5">
            <p className="text-accent-gold text-xs font-semibold uppercase tracking-wide mb-2">
              {t('home.recommender.recommended')}
            </p>
            <h3 className="text-xl font-semibold text-navy-900">
              {tData(result.name)}
            </h3>
            <p className="text-navy-700 text-sm mt-2 leading-relaxed">
              {tData(result.description)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-navy-100 text-navy-900 rounded-full text-xs font-medium">
                {t('home.schemeGrid.upTo')} ₹{(result.maxAmount / 100000).toFixed(0)} {tData({ en: 'Lakh', hi: 'लाख' })}
              </span>
              <span className="px-3 py-1 bg-navy-100 text-navy-900 rounded-full text-xs font-medium">
                {result.interestRate.min}%–{result.interestRate.max}% {t('scheme.details.perAnnum')}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to={`/schemes/${result.id}`}
              className="px-6 py-3 bg-navy-900 text-offwhite-0 font-medium text-sm rounded-xl hover:bg-navy-700 transition-colors duration-200 text-center min-h-[44px] flex items-center justify-center"
            >
              {t('home.recommender.viewDetails')}
            </Link>
            <button
              onClick={handleReset}
              className="px-6 py-3 border border-navy-100 text-navy-900 font-medium text-sm rounded-xl hover:bg-navy-100 transition-colors duration-200 min-h-[44px]"
            >
              {t('common.back')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
