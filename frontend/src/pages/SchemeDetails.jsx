import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import EMICalculator from '../components/EMICalculator';
import PartnerLocator from '../components/PartnerLocator';
import Accordion from '../components/Accordion';
import SchemeCard from '../components/SchemeCard';
import schemesData from '../data/schemes.json';

export default function SchemeDetails() {
  const { schemeId } = useParams();
  const { t, tData, lang } = useLang();
  const [activeTab, setActiveTab] = useState('overview');

  const scheme = schemesData.schemes.find(s => s.id === schemeId);
  const relatedSchemes = schemesData.schemes.filter(s => s.id !== schemeId);

  if (!scheme) {
    return (
      <main className="min-h-screen bg-offwhite-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-navy-900 mb-2">Scheme not found</h1>
          <Link to="/" className="text-accent-gold hover:underline">Go back home</Link>
        </div>
      </main>
    );
  }

  const formatAmount = (amount) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(amount % 100000 === 0 ? 0 : 1)} ${tData({ en: 'Lakh', hi: 'लाख' })}`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const isLoan = scheme.scheme_type === 'loan' || !scheme.scheme_type;

  const tabs = [
    { id: 'overview', label: t('scheme.tabs.overview') },
    { id: 'eligibility', label: t('scheme.tabs.eligibility') },
    { id: 'loanDetails', label: isLoan ? t('scheme.tabs.loanDetails') : (lang === 'hi' ? 'विवरण' : 'Details') },
    ...(isLoan ? [{ id: 'emiCalculator', label: t('scheme.tabs.emiCalculator') }] : []),
    { id: 'documents', label: t('scheme.tabs.documents') },
    { id: 'process', label: t('scheme.tabs.process') },
    { id: 'partners', label: t('scheme.tabs.partners') },
    { id: 'faqs', label: t('scheme.tabs.faqs') },
  ];

  return (
    <main className="min-h-screen bg-offwhite-50">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <nav aria-label="Breadcrumb" className="text-sm text-navy-700">
          <ol className="flex items-center gap-1.5 flex-wrap">
            <li>
              <Link to="/" className="hover:text-accent-gold transition-colors duration-200">
                {t('scheme.breadcrumb.home')}
              </Link>
            </li>
            <li aria-hidden="true" className="text-navy-100">›</li>
            <li>
              <span className="text-navy-700">{t('scheme.breadcrumb.schemes')}</span>
            </li>
            <li aria-hidden="true" className="text-navy-100">›</li>
            <li>
              <span className="text-navy-900 font-medium">{tData(scheme.name)}</span>
            </li>
          </ol>
        </nav>
      </div>

      {/* Header block */}
      <div className="bg-navy-900 text-offwhite-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="px-3 py-1 bg-navy-700 rounded-full text-xs font-medium text-navy-100">
              {tData(scheme.category)}
            </span>
            <span className="px-3 py-1 bg-navy-700 rounded-full text-xs font-medium text-navy-100 capitalize">
              {scheme.scheme_type || 'loan'}
            </span>
            <span className="px-3 py-1 bg-navy-700 rounded-full text-xs font-medium text-navy-100">
              {t('scheme.chips.income')}
            </span>
            <span className="px-3 py-1 bg-navy-700 rounded-full text-xs font-medium text-navy-100">
              {t('scheme.chips.category')}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
            {tData(scheme.name)}
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-navy-100 bg-offwhite-0 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto gap-0 -mb-px scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-200 min-h-[44px] ${
                  activeTab === tab.id
                    ? 'border-accent-gold text-navy-900'
                    : 'border-transparent text-navy-700 hover:text-navy-900 hover:border-navy-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content — 2 cols */}
          <div className="lg:col-span-2 space-y-8">
            {/* Overview */}
            {activeTab === 'overview' && (
              <section>
                <h2 className="text-xl font-semibold text-navy-900 mb-4">{t('scheme.tabs.overview')}</h2>
                <div className="space-y-4">
                  <p className="text-ink-900 leading-relaxed text-lg">{tData(scheme.description)}</p>
                  <p className="text-navy-700 leading-relaxed">
                    {lang === 'en' 
                      ? "This initiative is part of the government's ongoing efforts to ensure financial inclusion and socio-economic empowerment for the Scheduled Caste community. By offering subsidized interest rates, relaxed eligibility criteria, and flexible repayment terms, this scheme aims to reduce financial barriers, promote sustainable growth, and foster long-term self-reliance among beneficiaries."
                      : "यह पहल अनुसूचित जाति समुदाय के लिए वित्तीय समावेशन और सामाजिक-आर्थिक सशक्तिकरण सुनिश्चित करने के सरकार के निरंतर प्रयासों का हिस्सा है। रियायती ब्याज दरों, आसान पात्रता मानदंडों और लचीली पुनर्भुगतान शर्तों की पेशकश करके, इस योजना का उद्देश्य वित्तीय बाधाओं को कम करना, सतत विकास को बढ़ावा देना और लाभार्थियों के बीच दीर्घकालिक आत्मनिर्भरता को बढ़ावा देना है।"
                    }
                  </p>
                </div>

                {/* Quick stats */}
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-offwhite-0 rounded-xl border border-navy-100 p-4">
                    <p className="text-xs text-navy-700 mb-1">{t('scheme.details.maxLoan')}</p>
                    <p className="text-lg font-bold text-navy-900">{formatAmount(scheme.maxAmount)}</p>
                  </div>
                  <div className="bg-offwhite-0 rounded-xl border border-navy-100 p-4">
                    <p className="text-xs text-navy-700 mb-1">{t('scheme.details.interestRate')}</p>
                    <p className="text-lg font-bold text-navy-900">{scheme.interestRate.min}%–{scheme.interestRate.max}%</p>
                  </div>
                  <div className="bg-offwhite-0 rounded-xl border border-navy-100 p-4">
                    <p className="text-xs text-navy-700 mb-1">{t('scheme.details.funding')}</p>
                    <p className="text-lg font-bold text-navy-900">{scheme.fundingPercent}%</p>
                  </div>
                </div>
              </section>
            )}

            {/* Eligibility */}
            {activeTab === 'eligibility' && (
              <section>
                <h2 className="text-xl font-semibold text-navy-900 mb-4">{t('scheme.tabs.eligibility')}</h2>
                <ul className="space-y-3">
                  {(scheme.eligibility[lang] || scheme.eligibility.en).map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-green-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-ink-900 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Loan/Scheme Details */}
            {activeTab === 'loanDetails' && (
              <section>
                <h2 className="text-xl font-semibold text-navy-900 mb-4">
                  {isLoan ? t('scheme.tabs.loanDetails') : (lang === 'hi' ? 'विवरण' : 'Details')}
                </h2>
                <div className="bg-offwhite-0 rounded-xl border border-navy-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-navy-100">
                        <td className="px-5 py-4 font-medium text-navy-700 bg-offwhite-50 w-1/2">{t('scheme.details.maxLoan')}</td>
                        <td className="px-5 py-4 text-ink-900 font-semibold">{formatAmount(scheme.maxAmount)}</td>
                      </tr>
                      <tr className="border-b border-navy-100">
                        <td className="px-5 py-4 font-medium text-navy-700 bg-offwhite-50">{t('scheme.details.interestRate')}</td>
                        <td className="px-5 py-4 text-ink-900 font-semibold">{scheme.interestRate.min}%–{scheme.interestRate.max}% {t('scheme.details.perAnnum')}</td>
                      </tr>
                      <tr className="border-b border-navy-100">
                        <td className="px-5 py-4 font-medium text-navy-700 bg-offwhite-50">{t('scheme.details.funding')}</td>
                        <td className="px-5 py-4 text-ink-900 font-semibold">{scheme.fundingPercent}% {t('scheme.details.ofProjectCost')}</td>
                      </tr>
                      <tr className="border-b border-navy-100">
                        <td className="px-5 py-4 font-medium text-navy-700 bg-offwhite-50">{t('scheme.details.moratorium')}</td>
                        <td className="px-5 py-4 text-ink-900 font-semibold">
                          {scheme.moratoriumMonths[0]} {t('scheme.details.toMonths')} {scheme.moratoriumMonths[1]} {t('scheme.details.months')}
                        </td>
                      </tr>
                      <tr className="border-b border-navy-100">
                        <td className="px-5 py-4 font-medium text-navy-700 bg-offwhite-50">{t('scheme.details.tenure')}</td>
                        <td className="px-5 py-4 text-ink-900 font-semibold">{scheme.tenureMonths} {t('scheme.details.months')}</td>
                      </tr>
                      <tr>
                        <td className="px-5 py-4 font-medium text-navy-700 bg-offwhite-50">{t('scheme.details.incomeLimit')}</td>
                        <td className="px-5 py-4 text-ink-900 font-semibold">₹{scheme.incomeLimit.toLocaleString('en-IN')} {t('scheme.details.perYear')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* EMI Calculator */}
            {activeTab === 'emiCalculator' && (
              <section>
                <EMICalculator scheme={scheme} />
              </section>
            )}

            {/* Documents */}
            {activeTab === 'documents' && (
              <section>
                <h2 className="text-xl font-semibold text-navy-900 mb-4">{t('scheme.tabs.documents')}</h2>
                <ul className="space-y-3">
                  {(scheme.documents[lang] || scheme.documents.en).map((doc, i) => (
                    <li key={i} className="flex items-center gap-3 bg-offwhite-0 rounded-xl border border-navy-100 px-5 py-3">
                      <svg className="w-5 h-5 text-navy-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <span className="text-ink-900 text-sm">{doc}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Application Process */}
            {activeTab === 'process' && (
              <section>
                <h2 className="text-xl font-semibold text-navy-900 mb-4">{t('scheme.tabs.process')}</h2>
                <ol className="space-y-4">
                  {(scheme.applicationProcess[lang] || scheme.applicationProcess.en).map((step, i) => (
                    <li key={i} className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-navy-900 text-offwhite-0 flex items-center justify-center shrink-0 text-sm font-bold">
                        {i + 1}
                      </div>
                      <div className="flex-1 bg-offwhite-0 rounded-xl border border-navy-100 px-5 py-4">
                        <p className="text-ink-900 text-sm">{step}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* Partners */}
            {activeTab === 'partners' && (
              <section>
                <PartnerLocator schemeId={schemeId} />
              </section>
            )}

            {/* FAQs */}
            {activeTab === 'faqs' && (
              <section>
                <h2 className="text-xl font-semibold text-navy-900 mb-4">{t('scheme.tabs.faqs')}</h2>
                <div className="space-y-3">
                  {(scheme.faqs[lang] || scheme.faqs.en).map((faq, i) => (
                    <Accordion key={i} question={faq.q} answer={faq.a} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar — CTA */}
          <aside>
            <div className="bg-navy-900 rounded-xl p-6 text-center">
              <h3 className="text-offwhite-0 font-semibold text-lg mb-2">{tData(scheme.name)}</h3>
              <p className="text-navy-100 text-sm mb-4">
                {t('scheme.details.interestRate')}: {scheme.interestRate.min}%–{scheme.interestRate.max}%
              </p>
              <button
                onClick={() => setActiveTab('partners')}
                className="w-full py-3 bg-accent-gold text-navy-900 font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity duration-200 min-h-[44px]"
              >
                {t('scheme.applyNow')}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
