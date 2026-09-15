import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';

export default function Register() {
  const { t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    certificate: null,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Mock Verification States
  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'certificate' && files) {
      setFormData((prev) => ({ ...prev, certificate: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleVerifyEmail = () => {
    if (formData.email) setEmailVerified(true);
  };

  const handleVerifyMobile = () => {
    if (formData.mobile.length === 10) setMobileVerified(true);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!emailVerified || !mobileVerified) {
      alert('Please verify email and mobile number first.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      alert(t('register.passwordMismatch'));
      return;
    }
    alert('Registration successful! (Demo)');
  };

  const handleLoginClick = (e) => {
    e.preventDefault();
    if (location.state?.fromLogin) {
      navigate(-1);
    } else {
      navigate('/login', { replace: true });
    }
  };

  return (
    <main className="min-h-screen bg-offwhite-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[500px]">
        <div className="bg-offwhite-0 rounded-2xl shadow-md border border-navy-100 p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-2">
              <svg className="w-8 h-8" viewBox="0 0 64 64" fill="none">
                <path d="M8 44 C8 44 20 22 32 22 C44 22 56 44 56 44" stroke="#0A2647" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                <path d="M14 44 C14 44 22 28 32 28 C42 28 50 44 50 44" stroke="#C9982A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <line x1="6" y1="44" x2="58" y2="44" stroke="#0A2647" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              <span className="text-navy-900 font-semibold text-lg">{t('navbar.logo')}</span>
            </div>
            <LanguageToggle />
          </div>

          <h1 className="text-xl font-bold text-navy-900 mb-1">{t('register.title')}</h1>
          <p className="text-navy-700 text-sm mb-6">{t('register.subtitle')}</p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-ink-900 mb-1.5">
                  {t('register.firstName')}
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-navy-100 bg-offwhite-0 text-ink-900 text-sm focus:border-accent-gold focus:outline-none min-h-[44px]"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-ink-900 mb-1.5">
                  {t('register.lastName')}
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-navy-100 bg-offwhite-0 text-ink-900 text-sm focus:border-accent-gold focus:outline-none min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink-900 mb-1.5">
                {t('register.email')}
              </label>
              <div className="flex gap-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={emailVerified}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-navy-100 bg-offwhite-0 text-ink-900 text-sm focus:border-accent-gold focus:outline-none min-h-[44px] disabled:bg-gray-100"
                />
                <button
                  type="button"
                  onClick={handleVerifyEmail}
                  disabled={emailVerified || !formData.email}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 min-h-[44px] whitespace-nowrap ${emailVerified ? 'bg-green-100 text-green-700' : 'bg-navy-100 text-navy-900 hover:bg-navy-200'
                    }`}
                >
                  {emailVerified ? t('register.verified') : t('register.verifyBtn')}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="mobile" className="block text-sm font-medium text-ink-900 mb-1.5">
                {t('register.mobile')}
              </label>
              <div className="flex gap-2">
                <div className="flex w-full">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-navy-100 bg-offwhite-50 text-navy-700 text-sm">
                    +91
                  </span>
                  <input
                    id="mobile"
                    name="mobile"
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, mobile: val });
                    }}
                    disabled={mobileVerified}
                    required
                    placeholder="xxxxx xxxxx"
                    maxLength={10}
                    className="flex-1 px-4 py-3 rounded-r-xl border border-navy-100 bg-offwhite-0 text-ink-900 text-sm focus:border-accent-gold focus:outline-none min-h-[44px] disabled:bg-gray-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleVerifyMobile}
                  disabled={mobileVerified || formData.mobile.length < 10}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 min-h-[44px] whitespace-nowrap ${mobileVerified ? 'bg-green-100 text-green-700' : 'bg-navy-100 text-navy-900 hover:bg-navy-200'
                    }`}
                >
                  {mobileVerified ? t('register.verified') : t('register.verifyBtn')}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="certificate" className="block text-sm font-medium text-ink-900 mb-1.5">
                {t('register.certificate')}
              </label>
              <input
                id="certificate"
                name="certificate"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 rounded-xl border border-navy-100 bg-offwhite-0 text-ink-900 text-sm focus:border-accent-gold focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-navy-50 file:text-navy-700 hover:file:bg-navy-100"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink-900 mb-1.5">
                {t('register.password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  required
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

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink-900 mb-1.5">
                {t('register.confirmPassword')}
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-navy-100 bg-offwhite-0 text-ink-900 text-sm focus:border-accent-gold focus:outline-none min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-700 hover:text-navy-900 p-1"
                  aria-label={showConfirmPassword ? t('login.hidePassword') : t('login.showPassword')}
                >
                  {showConfirmPassword ? (
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

            <button
              type="submit"
              className="w-full py-3 bg-navy-900 text-offwhite-0 font-medium text-sm rounded-xl hover:bg-navy-700 transition-colors duration-200 min-h-[44px] mt-2"
            >
              {t('register.submitBtn')}
            </button>
          </form>

          {/* Security reassurance */}
          <div className="mt-6 flex items-center justify-center gap-2 text-navy-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span className="text-xs">{t('login.secure')}</span>
          </div>

          {/* Login link */}
          <p className="mt-4 text-center">
            <a href="/login" onClick={handleLoginClick} className="text-sm text-navy-700 hover:text-accent-gold transition-colors duration-200">
              {t('register.loginLink')}
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
