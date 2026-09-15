import { useState, useEffect, useMemo } from 'react';
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
  
  // Profile state
  const [annualIncome, setAnnualIncome] = useState('');
  const [projectCost, setProjectCost] = useState('');

  const [apiResult, setApiResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fallback calculation in case backend is down
  const fallbackEmi = useMemo(() => {
    const P = loanAmount;
    const r = defaults.rate / 12 / 100;
    const n = tenure;
    const m = scheme?.moratoriumMonths?.[0] || 0;

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
  }, [loanAmount, tenure, defaults.rate, scheme]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEmi();
    }, 500);
    return () => clearTimeout(timer);
  }, [loanAmount, tenure, annualIncome, projectCost, scheme?.id]);

  const fetchEmi = async () => {
    if (!scheme?.id) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5001/api/calculator/emi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheme_id: scheme.id,
          requested_loan: loanAmount,
          tenure_months: tenure,
          user_profile: {
            annual_income: annualIncome ? Number(annualIncome) : 0,
            project_cost: projectCost ? Number(projectCost) : 0
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setApiResult(data.data);
      } else {
        setApiResult(null);
      }
    } catch (err) {
      console.error("Failed to fetch personalized EMI", err);
      setApiResult(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => `₹${val.toLocaleString('en-IN')}`;

  // Determine active values (API vs Fallback)
  const activeMaxLoan = apiResult?.max_eligible_loan ?? (scheme?.maxAmount || 5000000);
  const activeEmi = apiResult?.emi_result?.emi ?? fallbackEmi.monthly;
  const activeTotalInterest = apiResult?.emi_result?.total_interest ?? fallbackEmi.totalInterest;
  const activeTotalPayment = apiResult?.emi_result?.total_payment ?? fallbackEmi.totalPayment;
  const activeMoratorium = apiResult?.moratorium_months ?? (scheme?.moratoriumMonths?.[0] || 0);
  const activeMoratoriumPayment = apiResult?.emi_result?.moratorium_interest ?? fallbackEmi.moratoriumPayment;
  const activeRate = apiResult?.applicable_interest_rate ?? defaults.rate;

  return (
    <div className="bg-offwhite-0 rounded-xl border border-navy-100 p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-navy-900 mb-2">Personalized EMI Calculator</h3>
        <p className="text-navy-700 text-sm">
          Enter your details to calculate your actual eligible loan amount, subsidies, and EMI based on the rules of <strong>{scheme?.name?.en || 'this scheme'}</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Inputs */}
        <div className="space-y-6">
          
          <div className="bg-offwhite-50 p-4 rounded-xl border border-navy-100 space-y-4">
            <h4 className="text-sm font-bold text-navy-900 uppercase tracking-wide">Your Profile</h4>
            
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Annual Income (₹)</label>
              <input
                type="number"
                value={annualIncome}
                onChange={(e) => setAnnualIncome(e.target.value)}
                placeholder="e.g. 300000"
                className="w-full bg-offwhite-0 border border-navy-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-gold"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-navy-700 mb-1">Estimated Project Cost (₹)</label>
              <input
                type="number"
                value={projectCost}
                onChange={(e) => setProjectCost(e.target.value)}
                placeholder="e.g. 500000"
                className="w-full bg-offwhite-0 border border-navy-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-gold"
              />
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="text-sm font-bold text-navy-900 uppercase tracking-wide">Loan Parameters</h4>
            
            {/* Loan Amount */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-ink-900">Desired Loan Amount</label>
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
                type="range"
                min="10000"
                max={scheme?.maxAmount || 5000000}
                step="5000"
                value={loanAmount}
                onChange={(e) => setLoanAmount(parseInt(e.target.value))}
                className="w-full h-2 bg-navy-100 rounded-full appearance-none cursor-pointer accent-navy-900"
              />
              <div className="flex justify-between text-xs text-navy-700 mt-1">
                <span>₹10,000</span>
                <span>{formatCurrency(scheme?.maxAmount || 5000000)} (Scheme Max)</span>
              </div>
            </div>

            {/* Tenure */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-ink-900">Repayment Tenure</label>
                <div className="flex items-center gap-1 bg-offwhite-50 border border-navy-100 rounded px-2 py-1 focus-within:border-accent-gold">
                  <input
                    type="number"
                    value={tenure || ''}
                    onChange={(e) => setTenure(e.target.value === '' ? 0 : parseInt(e.target.value))}
                    className="w-16 text-right text-sm font-semibold text-navy-900 bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-sm font-semibold text-navy-700">months</span>
                </div>
              </div>
              <input
                type="range"
                min="6"
                max={scheme?.tenureMonths || 120}
                step="6"
                value={tenure}
                onChange={(e) => setTenure(parseInt(e.target.value))}
                className="w-full h-2 bg-navy-100 rounded-full appearance-none cursor-pointer accent-navy-900"
              />
              <div className="flex justify-between text-xs text-navy-700 mt-1">
                <span>6 mos</span>
                <span>{scheme?.tenureMonths || 120} mos</span>
              </div>
            </div>
            
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="bg-navy-900 rounded-xl p-6 text-offwhite-0 relative overflow-hidden flex flex-col">
          {loading && (
            <div className="absolute inset-0 bg-navy-900/50 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="w-8 h-8 border-4 border-accent-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          
          <h4 className="text-sm font-bold text-accent-gold uppercase tracking-wide mb-6">Your Personalized Result</h4>
          
          <div className="flex-1 space-y-6">
            <div className="grid grid-cols-2 gap-4 border-b border-navy-700 pb-6">
              <div>
                <p className="text-navy-100 text-xs mb-1">Max Eligible Loan</p>
                <p className="text-xl font-bold">{formatCurrency(activeMaxLoan)}</p>
              </div>
              <div>
                <p className="text-navy-100 text-xs mb-1">Applied Loan</p>
                <p className={`text-xl font-bold ${apiResult?.is_eligible === false ? 'text-red-400' : ''}`}>
                  {formatCurrency(apiResult?.applied_loan_amount ?? loanAmount)}
                </p>
              </div>
              <div>
                <p className="text-navy-100 text-xs mb-1">Applicable Rate</p>
                <p className="text-xl font-bold">{activeRate}%</p>
              </div>
              <div>
                <p className="text-navy-100 text-xs mb-1">Moratorium</p>
                <p className="text-xl font-bold">{activeMoratorium} mos</p>
              </div>
            </div>

            <div className="text-center py-2">
              <p className="text-navy-100 text-sm mb-1">Estimated Monthly EMI</p>
              <p className="text-4xl font-bold text-accent-gold">{formatCurrency(activeEmi)}</p>
            </div>

            {apiResult?.affordability && (
              <div className="bg-navy-800 rounded-lg p-4 flex items-center justify-between border border-navy-700">
                <div>
                  <p className="text-xs text-navy-100">EMI / Income Ratio</p>
                  <p className="text-lg font-bold">{apiResult.affordability.ratio_pct}%</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-navy-100">Affordability</p>
                  <p className={`text-sm font-bold ${
                    apiResult.affordability.status === 'Comfortable' ? 'text-green-400' :
                    apiResult.affordability.status === 'High Repayment Burden' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {apiResult.affordability.status}
                  </p>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-navy-700">
              <div>
                <p className="text-navy-100 text-xs mb-1">Total Interest</p>
                <p className="text-sm font-semibold">{formatCurrency(activeTotalInterest)}</p>
              </div>
              <div>
                <p className="text-navy-100 text-xs mb-1">Total Repayment</p>
                <p className="text-sm font-semibold">{formatCurrency(activeTotalPayment)}</p>
              </div>
            </div>

            {apiResult?.reasons?.length > 0 && (
              <div className="bg-navy-800 rounded-lg p-4 mt-4 text-xs text-navy-100 space-y-2 border border-navy-700">
                <p className="font-bold text-offwhite-0 mb-2">Why this result?</p>
                <ul className="list-disc pl-4 space-y-1">
                  {apiResult.reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

            {!apiResult && !loading && (
               <div className="text-xs text-navy-100 text-center mt-4">
                 ⚠️ Showing generic estimation. API disconnected or scheme data unavailable.
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
