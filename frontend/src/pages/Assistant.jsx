import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import { ai, calculator, isServiceDown } from '../lib/api';
import { playBase64Audio, isTtsMuted, setTtsMuted } from '../lib/audio';
import { useSpeechRecognition } from '../lib/speech';
import PartnerLocator from '../components/PartnerLocator';

/**
 * Typewriter effect: animates text character by character.
 * Only runs on first render of the given text.
 */
function useTypewriter(text, speed = 14) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!text) { setDisplayed(''); setDone(true); return; }
    setDisplayed('');
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(id); setDone(true); }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return { displayed, done };
}

/** Renders a bot bubble with typewriter animation */
function TypewriterBubble({ text, className = '', audio }) {
  const { displayed, done } = useTypewriter(text);
  return (
    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-line bg-navy-100 text-ink-900 rounded-tl-sm flex items-start gap-2 ${className}`}
      style={{ animation: 'slideInLeft 0.25s ease-out' }}>
      <span className="flex-1">
        {displayed}
        {!done && <span className="inline-block w-0.5 h-3.5 bg-navy-600 ml-0.5 animate-pulse align-middle" />}
      </span>
      {audio && (
        <button
          type="button"
          onClick={() => playBase64Audio(audio)}
          aria-label="Play audio"
          className="shrink-0 mt-0.5 text-navy-700 hover:text-accent-gold transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 00-2.5-4.03v8.06A4.5 4.5 0 0016.5 12z"/></svg>
        </button>
      )}
    </div>
  );
}

/** Header mute toggle for spoken responses */
function SpeakerToggle() {
  const [muted, setMuted] = useState(isTtsMuted());
  return (
    <button
      type="button"
      onClick={() => { setTtsMuted(!muted); setMuted(!muted); }}
      className="inline-flex items-center gap-1.5 text-xs text-navy-700 hover:text-accent-gold transition-colors"
      title={muted ? 'Voice replies muted' : 'Voice replies on'}
    >
      {muted ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 14L21 10M21 14L17 10M11 5L6 9H3v6h3l5 4V5z"/></svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 010 7"/></svg>
      )}
      {muted ? 'Muted' : 'Voice on'}
    </button>
  );
}

/**
 * AI Assistant — the ML pipeline end to end:
 *   1. Profile (manual form → Module 1)
 *   2. Chat: describe the need in Hindi / English / Hinglish (Module 2 slot filling)
 *   3. Ranked, explained scheme matches (Module 3)
 *   4. Nearby healthy channel partners for the chosen scheme (Module 4)
 */

const STATES = [
  ['AP', 'Andhra Pradesh'], ['AR', 'Arunachal Pradesh'], ['AS', 'Assam'], ['BR', 'Bihar'],
  ['CG', 'Chhattisgarh'], ['DL', 'Delhi'], ['GA', 'Goa'], ['GJ', 'Gujarat'], ['HR', 'Haryana'],
  ['HP', 'Himachal Pradesh'], ['JH', 'Jharkhand'], ['JK', 'Jammu & Kashmir'], ['KA', 'Karnataka'],
  ['KL', 'Kerala'], ['MP', 'Madhya Pradesh'], ['MH', 'Maharashtra'], ['MN', 'Manipur'],
  ['ML', 'Meghalaya'], ['MZ', 'Mizoram'], ['NL', 'Nagaland'], ['OD', 'Odisha'], ['PB', 'Punjab'],
  ['RJ', 'Rajasthan'], ['SK', 'Sikkim'], ['TN', 'Tamil Nadu'], ['TS', 'Telangana'], ['TR', 'Tripura'],
  ['UP', 'Uttar Pradesh'], ['UK', 'Uttarakhand'], ['WB', 'West Bengal'],
];

const CATEGORIES = [
  ['SC', { en: 'Scheduled Caste (SC)', hi: 'अनुसूचित जाति (SC)' }],
  ['OBC', { en: 'Other Backward Class (OBC)', hi: 'अन्य पिछड़ा वर्ग (OBC)' }],
  ['SafaiKaramchari', { en: 'Safai Karamchari', hi: 'सफाई कर्मचारी' }],
  ['ManualScavenger', { en: 'Manual Scavenger (identified)', hi: 'मैनुअल स्कैवेंजर (चिह्नित)' }],
  ['WastePicker', { en: 'Waste Picker', hi: 'कचरा बीनने वाले' }],
];

const EDUCATION = [
  ['below_8th', { en: 'Below 8th', hi: '8वीं से कम' }],
  ['8th_pass', { en: '8th pass', hi: '8वीं पास' }],
  ['10th_pass', { en: '10th pass', hi: '10वीं पास' }],
  ['12th_pass', { en: '12th pass', hi: '12वीं पास' }],
  ['graduate', { en: 'Graduate', hi: 'स्नातक' }],
  ['post_graduate', { en: 'Post-graduate', hi: 'स्नातकोत्तर' }],
  ['professional', { en: 'Professional degree', hi: 'व्यावसायिक डिग्री' }],
];

const inputCls = 'w-full px-4 py-3 rounded-xl border border-navy-100 bg-offwhite-0 text-ink-900 text-sm focus:border-accent-gold focus:outline-none min-h-[44px] transition-shadow';
const labelCls = 'block text-sm font-medium text-ink-900 mb-1.5';
const primaryBtn = 'px-5 py-3 bg-navy-900 text-offwhite-0 font-medium text-sm rounded-xl hover:bg-navy-700 active:scale-95 transition-all duration-200 min-h-[44px] disabled:opacity-50';
const secondaryBtn = 'px-5 py-3 border border-navy-100 text-navy-900 font-medium text-sm rounded-xl hover:bg-navy-100 active:scale-95 transition-all duration-200 min-h-[44px]';

const fmt = (n) => (n == null ? '—' : `₹${Number(n).toLocaleString('en-IN')}`);

export default function Assistant() {
  const { lang, tData } = useLang();
  const hi = lang === 'hi';
  const L = (en, h) => (hi ? h : en);

  const [step, setStep] = useState(1);            // 1 profile, 2 chat, 3 results
  const [profile, setProfile] = useState(null);
  const [serviceError, setServiceError] = useState('');

  // ── Step 1: profile form ─────────────────────────────────────────────────
  const [form, setForm] = useState({
    full_name: '', dob: '', gender: 'male', category: 'SC', domicile_state: 'UP',
    annual_family_income: '', income_certificate_issue_date: '', caste_certificate_issue_date: '',
    education_status: '10th_pass', marital_status: 'single', existing_loan_flag: false,
  });
  const [formError, setFormError] = useState('');
  const [formBusy, setFormBusy] = useState(false);
  const onField = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function submitProfile(e) {
    e.preventDefault();
    setFormError('');
    setServiceError('');
    setFormBusy(true);
    try {
      const body = {
        ...form,
        annual_family_income: Number(form.annual_family_income),
        caste_certificate_issue_date: form.caste_certificate_issue_date || null,
      };
      const { profile: p } = await ai.profile(body);
      setProfile(p);
      setMessages([{ role: 'bot', text: L(
        `Hi ${p.full_name.split(' ')[0]}! Tell me what you need the loan for — in Hindi, English or both. For example: "mujhe silai ki dukaan kholni hai, 80 hazar chahiye".`,
        `नमस्ते ${p.full_name.split(' ')[0]}! बताइए आपको लोन किस लिए चाहिए — हिंदी, अंग्रेज़ी या दोनों में। जैसे: "mujhe silai ki dukaan kholni hai, 80 hazar chahiye"।`,
      ) }]);
      setStep(2);
    } catch (err) {
      if (isServiceDown(err)) setServiceError(err.message);
      else setFormError(err.message);
    } finally {
      setFormBusy(false);
    }
  }

  // ── Step 2: chat ─────────────────────────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [intent, setIntent] = useState(null);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [lastMethod, setLastMethod] = useState('');
  const [animatingIdx, setAnimatingIdx] = useState(-1); // index of the message currently typewriting
  const [vocalMode, setVocalMode] = useState(false);
  const chatContainerRef = useRef(null);

  const stt = useSpeechRecognition({
    language: lang,
    onResult: (text) => { setDraft(''); sendMessage(null, text); },
  });
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, chatBusy]);

  async function sendMessage(e, overrideText) {
    e?.preventDefault();
    const text = (overrideText ?? draft).trim();
    if (!text || chatBusy) return;
    setDraft('');
    setServiceError('');
    setMessages(m => [...m, { role: 'user', text }]);
    setChatBusy(true);
    try {
      const data = await ai.intent({ text, profile, session_id: sessionId, language: lang });
      setSessionId(data.session_id);
      setLastMethod(data.extraction_method);
      if (data.complete) {
        setIntent(data.intent);
        setAwaitingConfirm(true);
        const newMsg = { role: 'bot', text: data.confirmation_summary || L('Shall I find matching schemes?', 'क्या मैं मिलती-जुलती योजनाएं खोजूं?'), audio: data.audio_base64 };
        setMessages(m => { setAnimatingIdx(m.length); return [...m, newMsg]; });
        // Confirmation needs a Yes/No tap, not a voice reply — don't re-listen.
        playBase64Audio(data.audio_base64);
      } else {
        const newMsg = { role: 'bot', text: data.follow_up_question, audio: data.audio_base64 };
        setMessages(m => { setAnimatingIdx(m.length); return [...m, newMsg]; });
        playBase64Audio(data.audio_base64, vocalMode ? () => stt.start() : undefined);
      }
    } catch (err) {
      if (isServiceDown(err)) setServiceError(err.message);
      const newMsg = { role: 'bot', text: L('Sorry, something went wrong: ', 'क्षमा करें, कुछ गड़बड़ हुई: ') + err.message, error: true };
      setMessages(m => { setAnimatingIdx(m.length); return [...m, newMsg]; });
    } finally {
      setChatBusy(false);
    }
  }

  function editIntent() {
    setAwaitingConfirm(false);
    setIntent(null);
    setSessionId(null);
    setMessages(m => [...m, { role: 'bot', text: L('Okay — tell me again what you need, in one message.', 'ठीक है — एक संदेश में फिर से बताइए आपको क्या चाहिए।') }]);
  }

  // ── Step 3: match + partners ─────────────────────────────────────────────
  const [matchResult, setMatchResult] = useState(null);
  const [matchBusy, setMatchBusy] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [emiResults, setEmiResults] = useState({});   // scheme_id -> result | 'loading' | error string
  const [openEmiFor, setOpenEmiFor] = useState(null);

  async function calculateEmi(rec) {
    setOpenEmiFor(rec.scheme_id);
    if (emiResults[rec.scheme_id] && emiResults[rec.scheme_id] !== 'error') return;
    setEmiResults(r => ({ ...r, [rec.scheme_id]: 'loading' }));
    try {
      const data = await calculator.emi({
        scheme_details: rec.scheme_details,
        requested_loan: intent?.estimated_cost,
        user_profile: { annual_income: profile?.annual_family_income, project_cost: intent?.estimated_cost },
      });
      setEmiResults(r => ({ ...r, [rec.scheme_id]: data }));
    } catch (err) {
      setEmiResults(r => ({ ...r, [rec.scheme_id]: err.message || 'error' }));
    }
  }

  async function confirmAndMatch() {
    setMatchBusy(true);
    setServiceError('');
    try {
      const data = await ai.match(profile, intent);
      setMatchResult(data);
      setSelectedScheme(data.recommendations?.[0] || null);
      setStep(3);
      playBase64Audio(data.audio_base64);
    } catch (err) {
      if (isServiceDown(err)) setServiceError(err.message);
      else setMessages(m => [...m, { role: 'bot', text: err.message, error: true }]);
    } finally {
      setMatchBusy(false);
    }
  }

  function restart() {
    setStep(1); setProfile(null); setMessages([]); setDraft(''); setSessionId(null);
    setIntent(null); setAwaitingConfirm(false); setMatchResult(null); setSelectedScheme(null);
    setServiceError('');
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold text-navy-900">{L('AI Scheme Assistant', 'AI योजना सहायक')}</h1>
          <p className="text-navy-700 mt-2 text-sm sm:text-base">
            {L('Describe your need in your own words. We verify eligibility with published scheme rules, explain every match, and route you to a channel partner that can actually process it.',
               'अपनी ज़रूरत अपने शब्दों में बताइए। हम योजना नियमों से पात्रता जांचते हैं, हर मिलान को समझाते हैं, और आपको ऐसे चैनल पार्टनर तक पहुंचाते हैं जो वास्तव में आवेदन प्रोसेस कर सके।')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {stt.supported && (
            <button
              type="button"
              onClick={() => setVocalMode(v => !v)}
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${vocalMode ? 'bg-accent-gold border-accent-gold text-navy-900 font-medium' : 'border-navy-100 text-navy-700 hover:bg-navy-100'}`}
              title={L('Hands-free: speak your answers, hear the replies', 'हैंड्स-फ्री: अपने जवाब बोलें, जवाब सुनें')}
            >
              🎙️ {vocalMode ? L('Vocal mode: on', 'वोकल मोड: चालू') : L('Vocal mode', 'वोकल मोड')}
            </button>
          )}
          <SpeakerToggle />
        </div>
      </div>

      {/* Stepper */}
      <ol className="flex items-center gap-2 text-xs sm:text-sm mb-8 flex-wrap">
        {[L('Profile', 'प्रोफ़ाइल'), L('Your need', 'आपकी ज़रूरत'), L('Schemes & partners', 'योजनाएं और पार्टनर')].map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold ${step > i ? 'bg-accent-gold text-navy-900' : 'bg-navy-100 text-navy-700'}`}>{i + 1}</span>
            <span className={step === i + 1 ? 'font-medium text-navy-900' : 'text-navy-700'}>{label}</span>
            {i < 2 && <span className="text-navy-100 mx-1">—</span>}
          </li>
        ))}
      </ol>

      {serviceError && (
        <div className="mb-6 rounded-xl bg-amber-50 text-amber-900 text-sm px-4 py-3">
          <strong>{L('AI service offline.', 'AI सेवा उपलब्ध नहीं है।')}</strong> {serviceError}
        </div>
      )}

      {/* ── Step 1 ── */}
      {step === 1 && (
        <form onSubmit={submitProfile} className="bg-offwhite-0 rounded-xl shadow-sm border border-navy-100 p-6 sm:p-8 space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-navy-900">{L('About you', 'आपके बारे में')}</h2>
            <p className="text-navy-700 text-sm mt-1">
              {L('These fixed facts decide eligibility. In production they come from DigiLocker; here you enter them once and the assistant never asks again.',
                 'ये तथ्य पात्रता तय करते हैं। प्रोडक्शन में ये DigiLocker से आते हैं; यहां आप इन्हें एक बार भरते हैं और सहायक दोबारा नहीं पूछता।')}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls} htmlFor="full_name">{L('Full name', 'पूरा नाम')}</label>
              <input id="full_name" required className={inputCls} value={form.full_name} onChange={onField('full_name')} />
            </div>
            <div>
              <label className={labelCls} htmlFor="dob">{L('Date of birth', 'जन्म तिथि')}</label>
              <input id="dob" type="date" required className={inputCls} value={form.dob} onChange={onField('dob')} />
            </div>
            <div>
              <label className={labelCls} htmlFor="gender">{L('Gender', 'लिंग')}</label>
              <select id="gender" className={inputCls} value={form.gender} onChange={onField('gender')}>
                <option value="male">{L('Male', 'पुरुष')}</option>
                <option value="female">{L('Female', 'महिला')}</option>
                <option value="other">{L('Other', 'अन्य')}</option>
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="category">{L('Category', 'श्रेणी')}</label>
              <select id="category" className={inputCls} value={form.category} onChange={onField('category')}>
                {CATEGORIES.map(([v, lbl]) => <option key={v} value={v}>{tData(lbl)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="domicile_state">{L('Domicile state', 'निवास राज्य')}</label>
              <select id="domicile_state" className={inputCls} value={form.domicile_state} onChange={onField('domicile_state')}>
                {STATES.map(([v, lbl]) => <option key={v} value={v}>{lbl}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="annual_family_income">{L('Annual family income (₹)', 'वार्षिक पारिवारिक आय (₹)')}</label>
              <input id="annual_family_income" type="number" min="0" required placeholder="e.g. 320000" className={inputCls} value={form.annual_family_income} onChange={onField('annual_family_income')} />
            </div>
            <div>
              <label className={labelCls} htmlFor="income_certificate_issue_date">{L('Income certificate issue date', 'आय प्रमाण पत्र जारी तिथि')}</label>
              <input id="income_certificate_issue_date" type="date" required className={inputCls} value={form.income_certificate_issue_date} onChange={onField('income_certificate_issue_date')} />
            </div>
            <div>
              <label className={labelCls} htmlFor="caste_certificate_issue_date">
                {L('Caste certificate issue date', 'जाति प्रमाण पत्र जारी तिथि')}
                <span className="text-navy-700 font-normal"> {L('(needed for SC)', '(SC के लिए आवश्यक)')}</span>
              </label>
              <input id="caste_certificate_issue_date" type="date" className={inputCls} value={form.caste_certificate_issue_date} onChange={onField('caste_certificate_issue_date')} />
            </div>
            <div>
              <label className={labelCls} htmlFor="education_status">{L('Highest education', 'उच्चतम शिक्षा')}</label>
              <select id="education_status" className={inputCls} value={form.education_status} onChange={onField('education_status')}>
                {EDUCATION.map(([v, lbl]) => <option key={v} value={v}>{tData(lbl)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="marital_status">{L('Marital status', 'वैवाहिक स्थिति')}</label>
              <select id="marital_status" className={inputCls} value={form.marital_status} onChange={onField('marital_status')}>
                <option value="single">{L('Single', 'अविवाहित')}</option>
                <option value="married">{L('Married', 'विवाहित')}</option>
                <option value="widowed">{L('Widowed', 'विधवा/विधुर')}</option>
                <option value="divorced">{L('Divorced', 'तलाकशुदा')}</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm text-ink-900">
            <input type="checkbox" checked={form.existing_loan_flag} onChange={onField('existing_loan_flag')} className="w-4 h-4" />
            {L('I already have an outstanding loan from NSFDC / NBCFDC / NSKFDC', 'मेरे पास पहले से NSFDC / NBCFDC / NSKFDC का बकाया ऋण है')}
          </label>

          {formError && <p className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-2">{formError}</p>}

          <div className="flex flex-wrap gap-3 items-center">
            <button type="submit" disabled={formBusy} className={primaryBtn}>
              {formBusy ? L('Checking…', 'जांच हो रही है…') : L('Continue', 'आगे बढ़ें')}
            </button>
            <p className="text-xs text-navy-700">
              {L('By continuing you consent to processing of caste and income data for scheme matching. No documents are stored.',
                 'आगे बढ़ने पर आप योजना मिलान हेतु जाति और आय डेटा के प्रसंस्करण की सहमति देते हैं। कोई दस्तावेज़ संग्रहीत नहीं होते।')}
            </p>
          </div>
        </form>
      )}

      {/* ── Step 2 ── */}
      {step === 2 && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-offwhite-0 rounded-xl shadow-sm border border-navy-100 flex flex-col min-h-[420px]">
            <div ref={chatContainerRef} className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[60vh]">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex items-end gap-2 ${
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                  style={{
                    animation: m.role === 'user' ? 'slideInRight 0.2s ease-out' : 'slideInLeft 0.2s ease-out',
                  }}
                >
                  {/* Bot avatar dot */}
                  {m.role === 'bot' && (
                    <div className="w-6 h-6 rounded-full bg-navy-900 flex items-center justify-center shrink-0 mb-0.5">
                      <svg className="w-3 h-3 text-accent-gold" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                      </svg>
                    </div>
                  )}

                  {/* Message bubble */}
                  {m.role === 'user' ? (
                    <div className="max-w-[80%] rounded-2xl rounded-br-sm px-4 py-3 text-sm whitespace-pre-line bg-navy-900 text-offwhite-0">
                      {m.text}
                    </div>
                  ) : i === animatingIdx ? (
                    <TypewriterBubble text={m.text} audio={m.audio} className={m.error ? '!bg-red-50 !text-red-800' : ''} />
                  ) : (
                    <div className={`max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm whitespace-pre-line ${
                      m.error ? 'bg-red-50 text-red-800' : 'bg-navy-100 text-ink-900'
                    }`}>
                      {m.text}
                    </div>
                  )}
                </div>
              ))}

              {/* Thinking indicator */}
              {chatBusy && (
                <div className="flex items-end gap-2" style={{ animation: 'slideInLeft 0.2s ease-out' }}>
                  <div className="w-6 h-6 rounded-full bg-navy-900 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-accent-gold" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                  </div>
                  <div className="bg-navy-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-3">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <span
                          key={i}
                          className="w-2 h-2 bg-navy-500 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.18}s`, animationDuration: '0.9s' }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-navy-600 font-medium">{L('Setu is thinking…', 'Setu सोच रहा है…')}</span>
                  </div>
                </div>
              )}
            </div>

            {awaitingConfirm ? (
              <div className="border-t border-navy-100 p-4 flex flex-wrap gap-3">
                <button onClick={confirmAndMatch} disabled={matchBusy} className={primaryBtn}>
                  {matchBusy ? L('Matching…', 'मिलान हो रहा है…') : L('Yes, find schemes', 'हां, योजनाएं खोजें')}
                </button>
                <button onClick={editIntent} className={secondaryBtn}>{L('No, let me change it', 'नहीं, बदलना है')}</button>
              </div>
            ) : (
              <form onSubmit={sendMessage} className="border-t border-navy-100 p-4 flex flex-col gap-2">
                <div className="flex gap-3">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={stt.listening ? L('Listening…', 'सुन रहा हूं…') : L('Type in Hindi, English or Hinglish…', 'हिंदी, अंग्रेज़ी या हिंग्लिश में लिखें…')}
                    aria-label={L('Your message', 'आपका संदेश')}
                    className={inputCls}
                    autoFocus
                  />
                  {stt.supported && (
                    <button
                      type="button"
                      onClick={() => (stt.listening ? stt.stop() : stt.start())}
                      disabled={chatBusy}
                      aria-label={L('Speak', 'बोलें')}
                      className={`px-4 rounded-xl border text-lg transition-colors min-h-[44px] disabled:opacity-50 ${stt.listening ? 'bg-red-50 border-red-200 animate-pulse' : 'border-navy-100 hover:bg-navy-100'}`}
                    >
                      🎤
                    </button>
                  )}
                  <button type="submit" disabled={chatBusy || !draft.trim()} className={primaryBtn}>{L('Send', 'भेजें')}</button>
                </div>
                {stt.error && (
                  <p className="text-xs text-amber-700">{L('Could not hear you — try again.', 'सुन नहीं सका — फिर से कोशिश करें।')}</p>
                )}
              </form>
            )}
          </div>

          <aside className="space-y-4">
            <div className="bg-offwhite-0 rounded-xl border border-navy-100 p-5 text-sm">
              <h3 className="font-semibold text-navy-900 mb-2">{L('Your profile', 'आपकी प्रोफ़ाइल')}</h3>
              <dl className="space-y-1 text-navy-700">
                <div className="flex justify-between"><dt>{L('Category', 'श्रेणी')}</dt><dd className="text-ink-900">{profile.category}</dd></div>
                <div className="flex justify-between"><dt>{L('Income', 'आय')}</dt><dd className="text-ink-900">{fmt(profile.annual_family_income)}</dd></div>
                <div className="flex justify-between"><dt>{L('State', 'राज्य')}</dt><dd className="text-ink-900">{profile.domicile_state}</dd></div>
                <div className="flex justify-between"><dt>{L('Status', 'स्थिति')}</dt><dd className="text-ink-900">{profile.verification_status}</dd></div>
              </dl>
              {profile.needs_reverification && (
                <p className="mt-3 text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">{profile.reverification_reason}</p>
              )}
              <button onClick={restart} className="mt-3 text-xs text-navy-700 hover:text-accent-gold">{L('Edit profile', 'प्रोफ़ाइल बदलें')}</button>
            </div>
            {lastMethod && (
              <p className="text-xs text-navy-700 px-1">
                {L('Understanding via', 'समझा गया')}: {lastMethod === 'llm' ? 'LLM' : L('offline rules', 'ऑफ़लाइन नियम')}
              </p>
            )}
          </aside>
        </div>
      )}

      {/* ── Step 3 ── */}
      {step === 3 && matchResult && (
        <div className="space-y-8">
          <div className="bg-offwhite-0 rounded-xl border border-navy-100 p-5 text-sm flex flex-wrap gap-x-6 gap-y-1 text-navy-700">
            <span><strong className="text-ink-900">{L('Need', 'ज़रूरत')}:</strong> {intent.project_type || intent.purpose}</span>
            <span><strong className="text-ink-900">{L('Amount', 'राशि')}:</strong> {fmt(intent.estimated_cost)}</span>
            <span><strong className="text-ink-900">{L('For', 'किसके लिए')}:</strong> {intent.beneficiary === 'dependent' ? L('dependent', 'आश्रित') : L('self', 'स्वयं')}</span>
            <button onClick={() => { setStep(2); editIntent(); }} className="text-navy-700 hover:text-accent-gold underline">{L('Change', 'बदलें')}</button>
          </div>

          {matchResult.status === 'schemes_found' ? (
            <section>
              <h2 className="text-xl font-semibold text-navy-900 mb-1">
                {L(`${matchResult.total_eligible} eligible scheme${matchResult.total_eligible === 1 ? '' : 's'}`, `${matchResult.total_eligible} पात्र योजना${matchResult.total_eligible === 1 ? '' : 'एं'}`)}
              </h2>
              <p className="text-navy-700 text-sm mb-4">
                {L(`${matchResult.total_ineligible} schemes were ruled out by hard eligibility rules (income ceiling, category, cost band).`,
                   `${matchResult.total_ineligible} योजनाएं कठोर पात्रता नियमों (आय सीमा, श्रेणी, लागत बैंड) से बाहर हुईं।`)}
              </p>
              <div className="space-y-4">
                {matchResult.recommendations.map((rec) => (
                  <article
                    key={rec.scheme_id}
                    className={`bg-offwhite-0 rounded-xl border p-5 sm:p-6 transition-shadow ${selectedScheme?.scheme_id === rec.scheme_id ? 'border-accent-gold shadow-md' : 'border-navy-100'}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-7 h-7 rounded-full bg-accent-gold text-navy-900 text-xs font-bold flex items-center justify-center">#{rec.rank}</span>
                          <h3 className="font-semibold text-ink-900">{rec.scheme_name}</h3>
                          <span className="px-2.5 py-0.5 bg-navy-100 text-navy-900 rounded-full text-xs font-medium">{rec.corporation}</span>
                        </div>
                        <p className="text-navy-700 text-xs mt-1">
                          {L('Fit score', 'फिट स्कोर')} {Math.round(rec.score * 100)}% · {L('up to', 'अधिकतम')} {fmt(rec.scheme_details.loan_ceiling)} · {rec.scheme_details.effective_rate}% p.a. · {rec.scheme_details.loan_percentage}% {L('of cost', 'लागत का')}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => calculateEmi(rec)} className={secondaryBtn}>
                          {L('Calculate EMI', 'EMI गणना करें')}
                        </button>
                        <button onClick={() => setSelectedScheme(rec)} className={selectedScheme?.scheme_id === rec.scheme_id ? primaryBtn : secondaryBtn}>
                          {L('Find partners', 'पार्टनर खोजें')}
                        </button>
                        {rec.frontend_id && (
                          <Link to={`/schemes/${rec.frontend_id}`} className={secondaryBtn + ' inline-flex items-center'}>{L('Details', 'विवरण')}</Link>
                        )}
                      </div>
                    </div>

                    {openEmiFor === rec.scheme_id && (
                      <div className="mt-4 rounded-xl bg-offwhite-50 border border-navy-100 p-4 text-sm">
                        {emiResults[rec.scheme_id] === 'loading' && <p className="text-navy-700">{L('Calculating…', 'गणना हो रही है…')}</p>}
                        {emiResults[rec.scheme_id] && emiResults[rec.scheme_id] !== 'loading' && typeof emiResults[rec.scheme_id] === 'object' && (() => {
                          const e = emiResults[rec.scheme_id];
                          return (
                            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                              <div><dt className="text-navy-700 inline">{L('Monthly EMI', 'मासिक EMI')}: </dt><dd className="inline font-semibold text-ink-900">{fmt(e.emi_result?.emi)}</dd></div>
                              <div><dt className="text-navy-700 inline">{L('Loan amount used', 'उपयोग किया गया ऋण')}: </dt><dd className="inline text-ink-900">{fmt(e.applied_loan_amount)}</dd></div>
                              <div><dt className="text-navy-700 inline">{L('Total interest', 'कुल ब्याज')}: </dt><dd className="inline text-ink-900">{fmt(e.emi_result?.total_interest)}</dd></div>
                              <div><dt className="text-navy-700 inline">{L('Tenure', 'अवधि')}: </dt><dd className="inline text-ink-900">{e.tenure_months} {L('months', 'महीने')}</dd></div>
                              {e.affordability && (
                                <div className="sm:col-span-2">
                                  <dt className="text-navy-700 inline">{L('Affordability', 'वहनीयता')}: </dt>
                                  <dd className={`inline font-medium ${e.affordability.status === 'Comfortable' ? 'text-green-800' : e.affordability.status === 'High Repayment Burden' ? 'text-amber-800' : 'text-red-800'}`}>
                                    {e.affordability.status} ({e.affordability.ratio_pct}% {L('of monthly income', 'मासिक आय का')})
                                  </dd>
                                </div>
                              )}
                              {e.reasons?.length > 0 && (
                                <ul className="sm:col-span-2 list-disc list-inside text-navy-700 text-xs mt-1 space-y-0.5">
                                  {e.reasons.map((r, i) => <li key={i}>{r}</li>)}
                                </ul>
                              )}
                            </div>
                          );
                        })()}
                        {typeof emiResults[rec.scheme_id] === 'string' && emiResults[rec.scheme_id] !== 'loading' && (
                          <p className="text-red-700">{emiResults[rec.scheme_id]}</p>
                        )}
                      </div>
                    )}

                    <div className="grid sm:grid-cols-3 gap-4 mt-4 text-sm">
                      <div>
                        <h4 className="font-medium text-green-800 mb-1">{L('Why you qualify', 'आप क्यों पात्र हैं')}</h4>
                        <ul className="list-disc list-inside text-navy-700 space-y-0.5">{rec.explanation.eligible_because.map((r, i) => <li key={i}>{r}</li>)}</ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-navy-900 mb-1">{L('Advantages', 'लाभ')}</h4>
                        <ul className="list-disc list-inside text-navy-700 space-y-0.5">{rec.explanation.advantages.map((r, i) => <li key={i}>{r}</li>)}</ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-amber-800 mb-1">{L('Keep in mind', 'ध्यान रखें')}</h4>
                        {rec.explanation.considerations.length ? (
                          <ul className="list-disc list-inside text-navy-700 space-y-0.5">{rec.explanation.considerations.map((r, i) => <li key={i}>{r}</li>)}</ul>
                        ) : <p className="text-navy-700">—</p>}
                      </div>
                    </div>

                    <details className="mt-3 text-xs text-navy-700">
                      <summary className="cursor-pointer">{L('Documents & score breakdown', 'दस्तावेज़ और स्कोर विवरण')}</summary>
                      <p className="mt-2"><strong>{L('Documents', 'दस्तावेज़')}:</strong> {rec.scheme_details.required_documents.join(', ')}</p>
                      <p className="mt-1">
                        {Object.entries(rec.score_factors || {}).map(([k, v]) => `${k.replace(/_/g, ' ')} ${Math.round(v.score * 100)}% × ${v.weight}`).join(' · ')}
                      </p>
                    </details>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <section className="bg-offwhite-0 rounded-xl border border-navy-100 p-6 space-y-4">
              <h2 className="text-xl font-semibold text-navy-900">{L('No scheme matches yet', 'अभी कोई योजना मेल नहीं खाती')}</h2>
              <p className="text-navy-700 text-sm">{matchResult.message}</p>
              {matchResult.nearest_misses?.map((miss) => (
                <div key={miss.scheme_id} className="border-t border-navy-100 pt-4 text-sm">
                  <h3 className="font-semibold text-ink-900">{miss.scheme_name || miss.scheme_id}</h3>
                  <ul className="list-disc list-inside text-red-800 mt-1">{miss.failing_reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
                  <ul className="list-disc list-inside text-navy-700 mt-1">{miss.suggestions.map((r, i) => <li key={i}>{r}</li>)}</ul>
                </div>
              ))}
              {matchResult.general_advice?.length > 0 && (
                <ul className="list-disc list-inside text-navy-700 text-sm">{matchResult.general_advice.map((a, i) => <li key={i}>{a}</li>)}</ul>
              )}
            </section>
          )}

          {selectedScheme && (
            <section className="bg-offwhite-0 rounded-xl shadow-sm border border-navy-100 p-6 sm:p-8">
              <p className="text-xs text-navy-700 mb-3">{L('Routing for', 'रूटिंग')}: <strong className="text-ink-900">{selectedScheme.scheme_name}</strong></p>
              <PartnerLocator key={selectedScheme.scheme_id} mlSchemeId={selectedScheme.scheme_id} schemeId={selectedScheme.frontend_id} />
            </section>
          )}

          <button onClick={restart} className={secondaryBtn}>{L('Start over', 'फिर से शुरू करें')}</button>
        </div>
      )}
    </div>
  );
}
