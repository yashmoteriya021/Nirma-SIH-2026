import { useState, useEffect, useCallback } from 'react';
import { useLang } from '../context/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';
import OTPInput from '../components/OTPInput';

export default function Login() {
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState('otp');

  // OTP flow state
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // Email flow state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const formatTimer = useCallback((seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  }, []);

  function handleSendOTP(e) {
    e.preventDefault();
    if (phone.length < 10) return;
    setOtpSent(true);
    setResendTimer(30);
    setOtpError('');
  }

  function handleVerifyOTP(e) {
    e.preventDefault();
    if (otp.length < 6) return;
    // Mock verification — any 6 digits is "valid" for demo
    if (otp === '000000') {
      setOtpError(t('login.otpError'));
    } else {
      alert('Login successful! (Demo)');
    }
  }

  function handleEmailLogin(e) {
    e.preventDefault();
    if (!email || !password) return;
    // Mock — always succeed for demo
    alert('Login successful! (Demo)');
  }

  function handleResend() {
    setResendTimer(30);
    setOtp('');
    setOtpError('');
  }

  return (
    <main className="min-h-screen bg-offwhite-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        <div className="bg-offwhite-0 rounded-2xl shadow-md border border-navy-100 p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-2">
              <svg className="w-8 h-8" viewBox="0 0 64 64" fill="none">
                <path d="M8 44 C8 44 20 22 32 22 C44 22 56 44 56 44" stroke="#0A2647" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
                <path d="M14 44 C14 44 22 28 32 28 C42 28 50 44 50 44" stroke="#C9982A" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                <line x1="6" y1="44" x2="58" y2="44" stroke="#0A2647" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              <span className="text-navy-900 font-semibold text-lg">{t('navbar.logo')}</span>
            </div>
            <LanguageToggle />
          </div>

          <h1 className="text-xl font-bold text-navy-900 mb-1">{t('login.title')}</h1>
          <p className="text-navy-700 text-sm mb-6">{t('login.subtitle')}</p>

          {/* Tabs */}
          <div className="flex border-b border-navy-100 mb-6">
            <button
              onClick={() => { setActiveTab('otp'); setEmailError(''); }}
              className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors duration-200 ${
                activeTab === 'otp'
                  ? 'border-accent-gold text-navy-900'
                  : 'border-transparent text-navy-700 hover:text-navy-900'
              }`}
            >
              {t('login.mobileTab')}
            </button>
            <button
              onClick={() => { setActiveTab('email'); setOtpError(''); }}
              className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors duration-200 ${
                activeTab === 'email'
                  ? 'border-accent-gold text-navy-900'
                  : 'border-transparent text-navy-700 hover:text-navy-900'
              }`}
            >
              {t('login.emailTab')}
            </button>
          </div>

          {/* OTP Tab */}
          {activeTab === 'otp' && (
            <>
              {!otpSent ? (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-ink-900 mb-1.5">
                      {t('login.phone')}
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-navy-100 bg-offwhite-50 text-navy-700 text-sm">
                        +91
                      </span>
                      <input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="98765 43210"
                        maxLength={10}
                        className="flex-1 px-4 py-3 rounded-r-xl border border-navy-100 bg-offwhite-0 text-ink-900 text-sm focus:border-accent-gold focus:outline-none min-h-[44px]"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={phone.length < 10}
                    className="w-full py-3 bg-navy-900 text-offwhite-0 font-medium text-sm rounded-xl hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 min-h-[44px]"
                  >
                    {t('login.sendOTP')}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-5">
                  <p className="text-sm text-navy-700 text-center">
                    {t('login.enterOTP')}
                  </p>
                  <OTPInput length={6} value={otp} onChange={setOtp} />

                  {otpError && (
                    <p className="text-sm text-red-600 text-center bg-red-50 rounded-xl px-4 py-2">
                      {otpError}
                    </p>
                  )}

                  <div className="text-center">
                    {resendTimer > 0 ? (
                      <p className="text-xs text-navy-700">
                        {t('login.resendIn')} {formatTimer(resendTimer)}
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResend}
                        className="text-xs text-accent-gold font-medium hover:underline"
                      >
                        {t('login.resend')}
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={otp.length < 6}
                    className="w-full py-3 bg-navy-900 text-offwhite-0 font-medium text-sm rounded-xl hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 min-h-[44px]"
                  >
                    {t('login.verify')}
                  </button>
                </form>
              )}
            </>
          )}

          {/* Email Tab */}
          {activeTab === 'email' && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-ink-900 mb-1.5">
                  {t('login.email')}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-navy-100 bg-offwhite-0 text-ink-900 text-sm focus:border-accent-gold focus:outline-none min-h-[44px]"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-ink-900 mb-1.5">
                  {t('login.password')}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-navy-100 bg-offwhite-0 text-ink-900 text-sm focus:border-accent-gold focus:outline-none min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-700 hover:text-navy-900 p-1"
                    aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {emailError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">
                  {emailError}
                </p>
              )}

              <button
                type="submit"
                disabled={!email || !password}
                className="w-full py-3 bg-navy-900 text-offwhite-0 font-medium text-sm rounded-xl hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 min-h-[44px]"
              >
                {t('login.loginBtn')}
              </button>
            </form>
          )}

          {/* Security reassurance */}
          <div className="mt-6 flex items-center justify-center gap-2 text-navy-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span className="text-xs">{t('login.secure')}</span>
          </div>

          {/* Register link */}
          <p className="mt-4 text-center">
            <a href="#" className="text-sm text-navy-700 hover:text-accent-gold transition-colors duration-200">
              {t('login.register')}
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
