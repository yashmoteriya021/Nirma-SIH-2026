import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ai, isServiceDown } from '../lib/api';
import { playBase64Audio, isTtsMuted, setTtsMuted } from '../lib/audio';
import { useSpeechRecognition } from '../lib/speech';
import { useLang } from '../context/LanguageContext';

/**
 * AIAssistant — embedded home-page widget.
 *
 * Flow:
 *   Step 0: Quick profile form (category + income + state)
 *   Step 1: Chat (unified /chat endpoint — intent → auto-match)
 *   Step 2: Show scheme recommendations
 */

const CATEGORIES = [
  ['SC', 'Scheduled Caste (SC)'],
  ['OBC', 'Other Backward Class (OBC)'],
  ['SafaiKaramchari', 'Safai Karamchari'],
  ['ManualScavenger', 'Manual Scavenger'],
  ['WastePicker', 'Waste Picker'],
];

const STATES = [
  ['AP', 'Andhra Pradesh'], ['AR', 'Arunachal Pradesh'], ['AS', 'Assam'], ['BR', 'Bihar'],
  ['CG', 'Chhattisgarh'], ['DL', 'Delhi'], ['GA', 'Goa'], ['GJ', 'Gujarat'], ['HR', 'Haryana'],
  ['HP', 'Himachal Pradesh'], ['JH', 'Jharkhand'], ['JK', 'J&K'], ['KA', 'Karnataka'],
  ['KL', 'Kerala'], ['MP', 'Madhya Pradesh'], ['MH', 'Maharashtra'], ['NL', 'Nagaland'],
  ['OD', 'Odisha'], ['PB', 'Punjab'], ['RJ', 'Rajasthan'], ['TN', 'Tamil Nadu'],
  ['TS', 'Telangana'], ['UP', 'Uttar Pradesh'], ['UK', 'Uttarakhand'], ['WB', 'West Bengal'],
];

const EXAMPLE_PROMPTS = [
  'I want to open a tailoring shop, need ₹80,000',
  'Mujhe dairy farm ke liye 3 lakh chahiye',
  'My son needs an education loan for BTech',
  'Want to buy an auto-rickshaw for livelihood',
];

export default function AIAssistant() {
  const { lang } = useLang();
  const hi = lang === 'hi';
  const L = (en, h) => (hi ? h : en);

  // ── Step 0: Quick profile ─────────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({
    category: 'SC',
    annual_family_income: '',
    domicile_state: 'UP',
    gender: 'male',
  });
  const [profileError, setProfileError] = useState('');

  function handleProfileField(k) {
    return (e) => setProfileForm(f => ({ ...f, [k]: e.target.value }));
  }

  function submitProfile(e) {
    e.preventDefault();
    const income = Number(profileForm.annual_family_income);
    if (!income || income <= 0) {
      setProfileError(L('Please enter a valid annual income.', 'कृपया वार्षिक आय दर्ज करें।'));
      return;
    }
    // Build a minimal profile compatible with Module 3's hard filter
    setProfile({
      category: profileForm.category,
      annual_family_income: income,
      domicile_state: profileForm.domicile_state,
      gender: profileForm.gender,
      // Provide safe defaults so the ML pipeline never crashes on missing fields
      full_name: 'User',
      dob: '1990-01-01',
      income_certificate_issue_date: new Date().toISOString().slice(0, 10),
      education_status: '10th_pass',
      existing_loan_flag: false,
      marital_status: 'single',
    });
    setMessages([{
      role: 'bot',
      text: L(
        `Great! Tell me what you need the loan for — in Hindi, English, or both.\n\nFor example: "I need ₹80,000 to start a tailoring shop"`,
        `बढ़िया! बताइए आपको लोन किस लिए चाहिए — हिंदी, अंग्रेज़ी या दोनों में।\n\nजैसे: "मुझे सिलाई की दुकान के लिए 80,000 चाहिए"`
      ),
    }]);
    setStep(1);
  }

  // ── Step 1: Chat ──────────────────────────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [matchResult, setMatchResult] = useState(null);
  const [muted, setMuted] = useState(isTtsMuted());
  const [vocalMode, setVocalMode] = useState(false);
  const chatRef = useRef(null);

  const stt = useSpeechRecognition({
    language: lang,
    onResult: (text) => { setDraft(''); sendMessage(text); },
  });

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, busy]);

  async function sendMessage(text) {
    if (!text.trim() || busy) return;
    setDraft('');
    setError('');
    setMessages(m => [...m, { role: 'user', text }]);
    setBusy(true);
    try {
      const data = await ai.chat({
        text: text.trim(),
        profile,
        session_id: sessionId,
        language: lang === 'hi' ? 'hi' : 'en',
        auto_match: true,
      });

      setSessionId(data.session_id);

      playBase64Audio(data.audio_base64, vocalMode ? () => stt.start() : undefined);

      if (data.stage === 'follow_up') {
        setMessages(m => [...m, {
          role: 'bot',
          text: data.follow_up_question || L('Could you give more details?', 'कृपया अधिक जानकारी दें।'),
        }]);
      } else if (data.stage === 'matched' || data.stage === 'no_match') {
        const summary = data.confirmation_summary
          ? `${data.confirmation_summary}\n\n`
          : '';
        if (data.stage === 'matched') {
          setMessages(m => [...m, {
            role: 'bot',
            text: summary + L(
              `I found ${data.match_result.total_eligible} eligible scheme(s) for you! Here are the best matches:`,
              `आपके लिए ${data.match_result.total_eligible} पात्र योजना मिली! यहां सबसे अच्छे विकल्प हैं:`
            ),
          }]);
        } else {
          setMessages(m => [...m, {
            role: 'bot',
            text: summary + (data.match_result?.message || L(
              "No perfectly matching scheme found at this time. Here are the nearest options:",
              "अभी कोई पूरी तरह मेल खाने वाली योजना नहीं मिली। यहां सबसे करीबी विकल्प हैं:"
            )),
          }]);
        }
        setMatchResult(data.match_result);
        setStep(2);
      } else if (data.stage === 'confirm') {
        // auto_match was false — shouldn't happen with current config
        setMessages(m => [...m, {
          role: 'bot',
          text: data.confirmation_summary || L('Shall I find matching schemes?', 'क्या मैं योजनाएं खोजूं?'),
        }]);
      }
    } catch (err) {
      const msg = isServiceDown(err)
        ? L(
            '⚠️ AI service is offline. Please start the ML service: cd ml && uvicorn service.app:app --port 8000',
            '⚠️ AI सेवा उपलब्ध नहीं है। ML सेवा शुरू करें।'
          )
        : err.message;
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage(draft);
  }

  function restart() {
    setStep(0); setProfile(null); setMessages([]); setDraft('');
    setSessionId(null); setBusy(false); setError(''); setMatchResult(null);
    setProfileError('');
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-navy-100 flex flex-col overflow-hidden w-full max-w-2xl mx-auto" style={{ minHeight: 480 }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-navy-900 text-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent-gold/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-sm">{L('AI Scheme Assistant', 'AI योजना सहायक')}</p>
            <p className="text-xs text-navy-300">{L('Find the right government loan for you', 'सही सरकारी ऋण खोजें')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {stt.supported && step === 1 && (
            <button
              type="button"
              onClick={() => setVocalMode(v => !v)}
              className={`text-xs px-2 py-1 rounded-full transition-colors ${vocalMode ? 'bg-accent-gold text-navy-900 font-medium' : 'text-navy-300 hover:text-white'}`}
              title={L('Hands-free: speak, listen, repeat', 'हैंड्स-फ्री: बोलें, सुनें, दोहराएं')}
            >
              {vocalMode ? L('Vocal mode: on', 'वोकल मोड: चालू') : L('Vocal mode', 'वोकल मोड')}
            </button>
          )}
          <button
            type="button"
            onClick={() => setMuted(m => { setTtsMuted(!m); return !m; })}
            className="text-xs text-navy-300 hover:text-white transition-colors"
            title={muted ? L('Voice replies muted', 'आवाज़ बंद') : L('Voice replies on', 'आवाज़ चालू')}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-navy-300">{L('Live', 'लाइव')}</span>
        </div>
      </div>

      {/* Step 0: Quick profile form */}
      {step === 0 && (
        <form onSubmit={submitProfile} className="flex-1 flex flex-col gap-4 p-6">
          <div>
            <h3 className="font-semibold text-navy-900 text-base mb-1">
              {L('Tell us a little about yourself', 'अपने बारे में थोड़ा बताएं')}
            </h3>
            <p className="text-xs text-navy-600">
              {L('This helps us match schemes accurately. No data is stored.', 'इससे हम सटीक योजनाएं मिलाते हैं। कोई डेटा स्टोर नहीं होता।')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-navy-800 block mb-1">{L('Category', 'श्रेणी')}</label>
              <select
                value={profileForm.category}
                onChange={handleProfileField('category')}
                className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm bg-white focus:outline-none focus:border-navy-900"
              >
                {CATEGORIES.map(([v, lbl]) => <option key={v} value={v}>{lbl}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-navy-800 block mb-1">{L('Gender', 'लिंग')}</label>
              <select
                value={profileForm.gender}
                onChange={handleProfileField('gender')}
                className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm bg-white focus:outline-none focus:border-navy-900"
              >
                <option value="male">{L('Male', 'पुरुष')}</option>
                <option value="female">{L('Female', 'महिला')}</option>
                <option value="other">{L('Other', 'अन्य')}</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-navy-800 block mb-1">{L('Annual Family Income (₹)', 'वार्षिक आय (₹)')}</label>
              <input
                type="number" min="0" required
                placeholder="e.g. 300000"
                value={profileForm.annual_family_income}
                onChange={handleProfileField('annual_family_income')}
                className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm focus:outline-none focus:border-navy-900"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-navy-800 block mb-1">{L('State', 'राज्य')}</label>
              <select
                value={profileForm.domicile_state}
                onChange={handleProfileField('domicile_state')}
                className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm bg-white focus:outline-none focus:border-navy-900"
              >
                {STATES.map(([v, lbl]) => <option key={v} value={v}>{lbl}</option>)}
              </select>
            </div>
          </div>

          {profileError && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{profileError}</p>
          )}

          <div className="flex items-center gap-3 mt-auto">
            <button
              type="submit"
              className="flex-1 py-3 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-700 transition-colors"
            >
              {L('Start — Find my scheme →', 'शुरू करें — योजना खोजें →')}
            </button>
            <Link
              to="/assistant"
              className="text-xs text-navy-600 hover:text-navy-900 underline whitespace-nowrap"
            >
              {L('Full mode', 'पूरा मोड')}
            </Link>
          </div>
        </form>
      )}

      {/* Step 1: Chat */}
      {step === 1 && (
        <>
          <div ref={chatRef} className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50" style={{ maxHeight: 320 }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-line shadow-sm ${
                  m.role === 'user'
                    ? 'bg-navy-900 text-white rounded-tr-sm'
                    : 'bg-white text-navy-900 border border-navy-100 rounded-tl-sm'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="bg-white border border-navy-100 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center shadow-sm">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-2 h-2 bg-navy-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Example prompts */}
          {messages.length <= 1 && !busy && (
            <div className="px-5 py-2 flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="text-xs px-3 py-1.5 rounded-full border border-navy-200 text-navy-700 hover:bg-navy-100 hover:border-navy-400 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="mx-5 mb-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t border-navy-100 bg-white">
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={stt.listening ? L('Listening…', 'सुन रहा हूं…') : L('Describe what you need (Hindi/English)…', 'अपनी ज़रूरत बताएं…')}
              disabled={busy}
              className="flex-1 px-4 py-2.5 rounded-xl border border-navy-200 text-sm focus:outline-none focus:border-navy-900 bg-slate-50"
            />
            {stt.supported && (
              <button
                type="button"
                onClick={() => (stt.listening ? stt.stop() : stt.start())}
                disabled={busy}
                aria-label={L('Speak', 'बोलें')}
                className={`px-3.5 py-2.5 rounded-xl border text-sm transition-colors disabled:opacity-50 ${stt.listening ? 'bg-red-50 border-red-200 text-red-700 animate-pulse' : 'border-navy-200 text-navy-700 hover:bg-navy-50'}`}
              >
                🎤
              </button>
            )}
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="px-5 py-2.5 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-700 disabled:opacity-50 transition-colors"
            >
              {busy ? '…' : L('Send', 'भेजें')}
            </button>
          </form>
          {stt.error && (
            <p className="mx-5 mb-2 text-xs text-amber-700">{L('Could not hear you — try again.', 'सुन नहीं सका — फिर से कोशिश करें।')}</p>
          )}
        </>
      )}

      {/* Step 2: Results */}
      {step === 2 && matchResult && (
        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ maxHeight: 480 }}>
          {matchResult.status === 'schemes_found' ? (
            <>
              <p className="text-xs text-navy-600 font-medium uppercase tracking-wide">
                {L(`${matchResult.total_eligible} eligible scheme${matchResult.total_eligible !== 1 ? 's' : ''} found`,
                   `${matchResult.total_eligible} पात्र योजना मिली`)}
              </p>
              {matchResult.recommendations?.map((rec) => (
                <article key={rec.scheme_id} className="bg-white rounded-xl border border-navy-100 p-4 space-y-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="w-6 h-6 rounded-full bg-accent-gold text-navy-900 text-xs font-bold flex items-center justify-center">
                          {rec.rank}
                        </span>
                        <h4 className="font-semibold text-navy-900 text-sm">{rec.scheme_name}</h4>
                      </div>
                      <p className="text-xs text-navy-600">
                        {rec.corporation} · {L('up to', 'तक')} ₹{Number(rec.scheme_details?.loan_ceiling || 0).toLocaleString('en-IN')} · {rec.scheme_details?.effective_rate}% p.a. · {Math.round(rec.score * 100)}% {L('match', 'मेल')}
                      </p>
                    </div>
                  </div>

                  {rec.explanation?.advantages?.length > 0 && (
                    <ul className="space-y-1">
                      {rec.explanation.advantages.slice(0, 3).map((adv, j) => (
                        <li key={j} className="text-xs text-navy-700 flex gap-1.5 items-start">
                          <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                          <span>{adv}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {rec.explanation?.considerations?.length > 0 && (
                    <ul className="space-y-1">
                      {rec.explanation.considerations.slice(0, 2).map((c, j) => (
                        <li key={j} className="text-xs text-amber-700 flex gap-1.5 items-start">
                          <span className="shrink-0">⚠</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Link
                      to="/assistant"
                      className="text-xs px-3 py-1.5 bg-navy-900 text-white rounded-lg hover:bg-navy-700 transition-colors font-medium"
                    >
                      {L('Apply with partner →', 'पार्टनर के साथ आवेदन →')}
                    </Link>
                    {rec.frontend_id && (
                      <Link
                        to={`/schemes/${rec.frontend_id}`}
                        className="text-xs px-3 py-1.5 border border-navy-200 text-navy-700 rounded-lg hover:bg-navy-50 transition-colors"
                      >
                        {L('Details', 'विवरण')}
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-navy-700">{matchResult.message}</p>
              {matchResult.nearest_misses?.map((miss) => (
                <div key={miss.scheme_id} className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <h4 className="font-semibold text-navy-900 text-sm mb-2">{miss.scheme_name || miss.scheme_id}</h4>
                  <ul className="space-y-1">
                    {miss.suggestions?.map((s, i) => (
                      <li key={i} className="text-xs text-navy-700 flex gap-1.5">
                        <span>•</span><span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={restart}
              className="text-sm px-4 py-2 border border-navy-200 text-navy-700 rounded-xl hover:bg-navy-50 transition-colors"
            >
              {L('Start over', 'फिर से शुरू')}
            </button>
            <Link
              to="/assistant"
              className="text-sm px-4 py-2 bg-navy-900 text-white rounded-xl hover:bg-navy-700 transition-colors font-medium"
            >
              {L('Full assistant →', 'पूरा सहायक →')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
