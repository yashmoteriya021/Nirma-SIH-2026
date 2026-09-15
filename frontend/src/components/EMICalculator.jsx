import { useState, useMemo } from 'react';
import { useLang } from '../context/LanguageContext';

export default function EMICalculator({ scheme }) {
  const { t } = useLang();

  const defaults = {
    amount: scheme?.maxAmount ? Math.min(scheme.maxAmount, 500000) : 100000,
    tenure: scheme?.tenureMonths || 36,
    rate: scheme?.interestRate?.min || 6.5,
  };

  const [loanAmount, setLoanAmount] = useState(defaults.amount);
  const [tenure, setTenure] = useState(defaults.tenure);
  const [rate, setRate] = useState(defaults.rate);
  const [moratorium, setMoratorium] = useState(0);

  const maxAmount = scheme?.maxAmount || 5000000;

  const emi = useMemo(() => {
    const P = loanAmount;
    const r = rate / 12 / 100; // monthly rate
    const n = tenure;
    const m = moratorium;

    if (P <= 0 || r <= 0 || n <= 0) return { monthly: 0, totalInterest: 0, totalPayment: 0, moratoriumPayment: 0 };

    let moratoriumPayment = 0;
    let totalMoratoriumInterest = 0;
    let remainingTenure = n - m;
    let emiVal = 0;
    let totalEmiPayment = 0;

    if (m > 0) {
      moratoriumPayment = P * r;
      totalMoratoriumInterest = moratoriumPayment * m;
    }

    if (remainingTenure > 0) {
      emiVal = P * r * Math.pow(1 + r, remainingTenure) / (Math.pow(1 + r, remainingTenure) - 1);
      totalEmiPayment = emiVal * remainingTenure;
    }

    const totalPayment = totalMoratoriumInterest + totalEmiPayment;
    const totalInterest = totalPayment - P;

    return {
      monthly: Math.round(emiVal),
      moratoriumPayment: Math.round(moratoriumPayment),
      totalInterest: Math.round(totalInterest),
      totalPayment: Math.round(totalPayment),
    };
  }, [loanAmount, tenure, rate, moratorium]);

  const formatCurrency = (val) => `₹${val.toLocaleString('en-IN')}`;

  return (
    <div className="bg-offwhite-0 rounded-xl border border-navy-100 p-6">
      <div className="mb-1 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-navy-900">
          {t('scheme.emi.title')}
        </h3>
        <div className="group relative">
          <button
            className="w-5 h-5 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-xs font-bold"
            aria-label={t('scheme.emi.tooltip')}
          >
            ?
          </button>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-navy-900 text-offwhite-0 text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
            {t('scheme.emi.tooltip')}
          </div>
        </div>
      </div>
      <p className="text-navy-700 text-sm mb-6">{t('scheme.emi.subtitle')}</p>

      <div className="space-y-6">
        {/* Loan Amount */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="emi-amount" className="text-sm font-medium text-ink-900">
              {t('scheme.emi.loanAmount')}
            </label>
            <div className="flex items-center gap-1 bg-offwhite-50 border border-navy-100 rounded px-2 py-1 focus-within:border-accent-gold">
              <span className="text-sm font-semibold text-navy-700">₹</span>
              <input
                type="number"
                value={loanAmount || ''}
                onChange={(e) => setLoanAmount(e.target.value === '' ? 0 : parseInt(e.target.value))}
                className="w-24 text-right text-sm font-semibold text-navy-900 bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
          <input
            id="emi-amount"
            type="range"
            min="10000"
            max={maxAmount}
            step="10000"
            value={loanAmount}
            onChange={(e) => setLoanAmount(parseInt(e.target.value))}
            className="w-full h-2 bg-navy-100 rounded-full appearance-none cursor-pointer accent-navy-900"
          />
          <div className="flex justify-between text-xs text-navy-700 mt-1">
            <span>₹10,000</span>
            <span>{formatCurrency(maxAmount)}</span>
          </div>
        </div>

        {/* Tenure */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="emi-tenure" className="text-sm font-medium text-ink-900">
              {t('scheme.emi.tenure')}
            </label>
            <div className="flex items-center gap-1 bg-offwhite-50 border border-navy-100 rounded px-2 py-1 focus-within:border-accent-gold">
              <input
                type="number"
                value={tenure || ''}
                onChange={(e) => {
                  const newTenure = e.target.value === '' ? 0 : parseInt(e.target.value);
                  setTenure(newTenure);
                  if (moratorium >= newTenure) setMoratorium(newTenure - 1 > 0 ? newTenure - 1 : 0);
                }}
                className="w-16 text-right text-sm font-semibold text-navy-900 bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-sm font-semibold text-navy-700">{t('scheme.details.months')}</span>
            </div>
          </div>
          <input
            id="emi-tenure"
            type="range"
            min="6"
            max="120"
            step="6"
            value={tenure}
            onChange={(e) => {
              const newTenure = parseInt(e.target.value);
              setTenure(newTenure);
              if (moratorium >= newTenure) setMoratorium(newTenure - 1 > 0 ? newTenure - 1 : 0);
            }}
            className="w-full h-2 bg-navy-100 rounded-full appearance-none cursor-pointer accent-navy-900"
          />
          <div className="flex justify-between text-xs text-navy-700 mt-1">
            <span>6 {t('scheme.details.months')}</span>
            <span>120 {t('scheme.details.months')}</span>
          </div>
        </div>

        {/* Moratorium */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="emi-moratorium" className="text-sm font-medium text-ink-900">
              {t('scheme.tabs.process') ? (t('scheme.emi.title').includes('EMI') ? 'Moratorium Period (Interest Only)' : 'स्थगन अवधि (केवल ब्याज)') : 'Moratorium Period'}
            </label>
            <div className="flex items-center gap-1 bg-offwhite-50 border border-navy-100 rounded px-2 py-1 focus-within:border-accent-gold">
              <input
                type="number"
                value={moratorium !== undefined ? moratorium : ''}
                onChange={(e) => setMoratorium(e.target.value === '' ? 0 : parseInt(e.target.value))}
                className="w-16 text-right text-sm font-semibold text-navy-900 bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-sm font-semibold text-navy-700">{t('scheme.details.months')}</span>
            </div>
          </div>
          <input
            id="emi-moratorium"
            type="range"
            min="0"
            max={tenure - 1 > 0 ? tenure - 1 : 0}
            step="1"
            value={moratorium}
            onChange={(e) => setMoratorium(parseInt(e.target.value))}
            className="w-full h-2 bg-navy-100 rounded-full appearance-none cursor-pointer accent-navy-900"
          />
          <div className="flex justify-between text-xs text-navy-700 mt-1">
            <span>0 {t('scheme.details.months')}</span>
            <span>{tenure - 1 > 0 ? tenure - 1 : 0} {t('scheme.details.months')}</span>
          </div>
        </div>

        {/* Interest Rate */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="emi-rate" className="text-sm font-medium text-ink-900">
              {t('scheme.emi.rate')}
            </label>
            <div className="flex items-center gap-1 bg-offwhite-50 border border-navy-100 rounded px-2 py-1 focus-within:border-accent-gold">
              <input
                type="number"
                step="0.1"
                value={rate || ''}
                onChange={(e) => setRate(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                className="w-16 text-right text-sm font-semibold text-navy-900 bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-sm font-semibold text-navy-700">%</span>
            </div>
          </div>
          <input
            id="emi-rate"
            type="range"
            min="1"
            max="15"
            step="0.5"
            value={rate}
            onChange={(e) => setRate(parseFloat(e.target.value))}
            className="w-full h-2 bg-navy-100 rounded-full appearance-none cursor-pointer accent-navy-900"
          />
          <div className="flex justify-between text-xs text-navy-700 mt-1">
            <span>1%</span>
            <span>15%</span>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-navy-900 rounded-xl p-4 text-center flex flex-col justify-center">
          {moratorium > 0 ? (
            <>
              <p className="text-navy-100 text-[10px] sm:text-xs mb-1">Interest Only ({moratorium} mos)</p>
              <p className="text-accent-gold text-lg sm:text-xl font-bold">{formatCurrency(emi.moratoriumPayment)}</p>
              <div className="h-px bg-navy-700 w-1/2 mx-auto my-2"></div>
              <p className="text-navy-100 text-[10px] sm:text-xs mb-1">Regular EMI ({tenure - moratorium} mos)</p>
              <p className="text-accent-gold text-lg sm:text-xl font-bold">{formatCurrency(emi.monthly)}</p>
            </>
          ) : (
            <>
              <p className="text-navy-100 text-xs mb-1">{t('scheme.emi.monthlyEMI')}</p>
              <p className="text-accent-gold text-xl font-bold">{formatCurrency(emi.monthly)}</p>
            </>
          )}
        </div>
        <div className="bg-offwhite-50 rounded-xl p-4 text-center border border-navy-100">
          <p className="text-navy-700 text-xs mb-1">{t('scheme.emi.totalInterest')}</p>
          <p className="text-navy-900 text-xl font-bold">{formatCurrency(emi.totalInterest)}</p>
        </div>
        <div className="bg-offwhite-50 rounded-xl p-4 text-center border border-navy-100">
          <p className="text-navy-700 text-xs mb-1">{t('scheme.emi.totalRepayment')}</p>
          <p className="text-navy-900 text-xl font-bold">{formatCurrency(emi.totalPayment)}</p>
        </div>
      </div>
    </div>
  );
}
