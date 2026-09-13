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

  const maxAmount = scheme?.maxAmount || 5000000;

  const emi = useMemo(() => {
    const P = loanAmount;
    const r = rate / 12 / 100; // monthly rate
    const n = tenure;

    if (P <= 0 || r <= 0 || n <= 0) return { monthly: 0, totalInterest: 0, totalPayment: 0 };

    const emiVal = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    const totalPayment = emiVal * n;
    const totalInterest = totalPayment - P;

    return {
      monthly: Math.round(emiVal),
      totalInterest: Math.round(totalInterest),
      totalPayment: Math.round(totalPayment),
    };
  }, [loanAmount, tenure, rate]);

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
            <span className="text-sm font-semibold text-navy-900">{formatCurrency(loanAmount)}</span>
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
            <span className="text-sm font-semibold text-navy-900">{tenure} {t('scheme.details.months')}</span>
          </div>
          <input
            id="emi-tenure"
            type="range"
            min="6"
            max="120"
            step="6"
            value={tenure}
            onChange={(e) => setTenure(parseInt(e.target.value))}
            className="w-full h-2 bg-navy-100 rounded-full appearance-none cursor-pointer accent-navy-900"
          />
          <div className="flex justify-between text-xs text-navy-700 mt-1">
            <span>6 {t('scheme.details.months')}</span>
            <span>120 {t('scheme.details.months')}</span>
          </div>
        </div>

        {/* Interest Rate */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="emi-rate" className="text-sm font-medium text-ink-900">
              {t('scheme.emi.rate')}
            </label>
            <span className="text-sm font-semibold text-navy-900">{rate}%</span>
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
        <div className="bg-navy-900 rounded-xl p-4 text-center">
          <p className="text-navy-100 text-xs mb-1">{t('scheme.emi.monthlyEMI')}</p>
          <p className="text-accent-gold text-xl font-bold">{formatCurrency(emi.monthly)}</p>
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
