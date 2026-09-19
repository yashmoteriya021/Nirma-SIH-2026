import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useLang } from '../context/LanguageContext';
import { ai, isServiceDown, ApiError } from '../lib/api';
import partnersData from '../data/partners.json';
import PartnerMap from './PartnerMap';

/**
 * Channel Partner locator backed by the ML routing engine (Module 4):
 * partners over the NPA / fund-utilisation thresholds are filtered out
 * *before* ranking by distance, and every result carries a reason string.
 *
 * Props:
 *   schemeId    — frontend scheme page id (e.g. "micro-finance")
 *   mlSchemeId  — ML knowledge-base id (e.g. "NSFDC_MCF"); takes precedence
 *   initialLocation — optional { lat, lon } or { pin_code } to search immediately
 *
 * Falls back to the static partner list when the AI service is unreachable
 * or the scheme has no ML mapping yet.
 */
export default function PartnerLocator({ schemeId, mlSchemeId, initialLocation = null }) {
  const { t, tData, lang } = useLang();
  const [searchCity, setSearchCity] = useState('');
  const [pinCode, setPinCode] = useState(initialLocation?.pin_code || '');
  const [location, setLocation] = useState(initialLocation);
  const [locationError, setLocationError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);      // ML response
  const [fallbackNote, setFallbackNote] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);

  const hi = lang === 'hi';

  // ── ML ranking ────────────────────────────────────────────────────────────
  const fetchRanked = useCallback(async (loc) => {
    if (!loc) return;
    setLoading(true);
    setFallbackNote('');
    try {
      const data = await ai.partners({
        ...(mlSchemeId ? { scheme_id: mlSchemeId } : { frontend_scheme_id: schemeId }),
        ...(loc.pin_code ? { pin_code: loc.pin_code } : { lat: loc.lat, lon: loc.lon }),
      });
      setResult(data);
    } catch (err) {
      setResult(null);
      if (isServiceDown(err)) {
        setFallbackNote(hi
          ? 'AI सेवा उपलब्ध नहीं है — स्थैतिक सूची दिखाई जा रही है (क्षमता जांच के बिना)।'
          : 'AI routing service is offline — showing the static list (no capacity checks).');
      } else if (err instanceof ApiError && err.status === 404) {
        setFallbackNote(hi
          ? 'इस योजना के लिए अभी AI रूटिंग उपलब्ध नहीं है — स्थैतिक सूची दिखाई जा रही है।'
          : 'AI routing is not available for this scheme yet — showing the static list.');
      } else {
        setFallbackNote(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [mlSchemeId, schemeId, hi]);

  // Search immediately when a starting location is supplied (Assistant page).
  const bootstrapped = useRef(false);
  useEffect(() => {
    if (initialLocation && !bootstrapped.current) {
      bootstrapped.current = true;
      fetchRanked(initialLocation);
    }
  }, [initialLocation, fetchRanked]);

  function applyLocation(loc) {
    setLocation(loc);
    fetchRanked(loc);
  }

  function handleUseLocation() {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => applyLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setLocationError(hi
        ? 'स्थान प्राप्त नहीं हो सका। कृपया PIN कोड दर्ज करें।'
        : 'Unable to retrieve your location. Please enter your PIN code instead.'),
    );
  }

  function handlePinSubmit(e) {
    e.preventDefault();
    setLocationError('');
    if (!/^\d{6}$/.test(pinCode)) {
      setLocationError(hi ? '6 अंकों का PIN कोड दर्ज करें' : 'Enter a 6-digit PIN code');
      return;
    }
    applyLocation({ pin_code: pinCode });
  }

  // ── Static fallback (original behaviour) ─────────────────────────────────
  const staticPartners = useMemo(() => {
    let partners = partnersData.partners.filter(p => !schemeId || p.schemesSupported.includes(schemeId));
    if (searchCity.trim()) {
      const q = searchCity.toLowerCase();
      partners = partners.filter(p =>
        p.city.en.toLowerCase().includes(q) ||
        p.city.hi.includes(searchCity) ||
        p.state.en.toLowerCase().includes(q) ||
        p.state.hi.includes(searchCity)
      );
    }
    return partners;
  }, [schemeId, searchCity]);

  const rankedPartners = useMemo(() => {
    if (!result?.ranked_partners) return [];
    if (!searchCity.trim()) return result.ranked_partners;
    const q = searchCity.toLowerCase();
    return result.ranked_partners.filter(p =>
      p.district?.toLowerCase().includes(q) || p.state?.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
    );
  }, [result, searchCity]);

  const showRanked = !!result;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-navy-900">{t('scheme.partner.title')}</h3>
      <p className="text-navy-700 text-sm">
        {hi
          ? 'पार्टनर को दूरी से रैंक किया जाता है — अधिक NPA (>15%) या फंड उपयोग (>90%) वाले पार्टनर पहले ही हटा दिए जाते हैं।'
          : 'Partners are ranked by distance after removing any with high NPA (>15%) or exhausted funds (>90% utilisation).'}
      </p>

      {/* Location controls */}
      <form onSubmit={handlePinSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={pinCode}
          onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
          placeholder={hi ? 'PIN कोड (जैसे 226001)' : 'PIN code (e.g. 226001)'}
          aria-label="PIN code"
          className="flex-1 px-4 py-3 rounded-xl border border-navy-100 bg-offwhite-0 text-ink-900 text-sm focus:border-accent-gold focus:outline-none min-h-[44px]"
        />
        <button
          type="submit"
          className="px-5 py-3 bg-navy-900 text-offwhite-0 font-medium text-sm rounded-xl hover:bg-navy-700 transition-colors duration-200 min-h-[44px]"
        >
          {hi ? 'पार्टनर खोजें' : 'Find partners'}
        </button>
        <button
          type="button"
          onClick={handleUseLocation}
          className="px-5 py-3 border border-navy-100 text-navy-900 font-medium text-sm rounded-xl hover:bg-navy-100 transition-colors duration-200 flex items-center justify-center gap-2 min-h-[44px]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          {t('scheme.partner.useLocation')}
        </button>
      </form>

      <input
        type="text"
        value={searchCity}
        onChange={(e) => setSearchCity(e.target.value)}
        placeholder={t('scheme.partner.searchCity')}
        aria-label={t('scheme.partner.searchCity')}
        className="w-full px-4 py-3 rounded-xl border border-navy-100 bg-offwhite-0 text-ink-900 text-sm focus:border-accent-gold focus:outline-none min-h-[44px]"
      />

      {locationError && (
        <p className="text-sm text-amber-800 bg-amber-50 rounded-xl px-4 py-2">{locationError}</p>
      )}
      {fallbackNote && (
        <p className="text-sm text-amber-800 bg-amber-50 rounded-xl px-4 py-2">{fallbackNote}</p>
      )}
      {loading && (
        <p className="text-sm text-navy-700">{hi ? 'पार्टनर रैंक किए जा रहे हैं…' : 'Ranking partners…'}</p>
      )}

      {/* Ranked (ML) results */}
      {showRanked && (
        <div className="space-y-3">
          {result.location_used && rankedPartners.length > 0 && (
            <PartnerMap
              userLocation={{ lat: result.location_used.latitude, lon: result.location_used.longitude }}
              partners={rankedPartners}
              selectedId={selectedPartnerId}
              onSelect={setSelectedPartnerId}
            />
          )}
          {result.status !== 'partners_found' && (
            <div className="bg-offwhite-50 rounded-xl p-5 text-sm text-navy-700">
              <p>{result.message}</p>
              {result.nearest_beyond_radius?.length > 0 && (
                <ul className="mt-2 list-disc list-inside">
                  {result.nearest_beyond_radius.map(p => (
                    <li key={p.partner_id}>{p.name} — {p.distance_km} km</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {rankedPartners.map((partner, idx) => (
            <div
              key={partner.partner_id}
              onClick={() => setSelectedPartnerId(partner.partner_id)}
              className={`bg-offwhite-0 rounded-xl border p-5 hover:shadow-sm transition-shadow duration-200 cursor-pointer ${selectedPartnerId === partner.partner_id ? 'border-accent-gold shadow-sm' : 'border-navy-100'}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-6 h-6 rounded-full bg-accent-gold text-navy-900 text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                    <h4 className="font-semibold text-ink-900 text-sm">{partner.name}</h4>
                    <span className="px-2.5 py-0.5 bg-navy-100 text-navy-900 rounded-full text-xs font-medium">{partner.type}</span>
                  </div>
                  <p className="text-navy-700 text-xs mt-1">
                    {partner.district}, {partner.state} · {partner.distance_km} km
                  </p>
                  <p className="text-navy-700 text-sm mt-2">{partner.reason}</p>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {t('scheme.partner.accepting')}
                  </span>
                  <span className="text-xs text-navy-700">
                    {hi ? 'फंड उपयोग' : 'Funds used'} {partner.fund_utilization_pct}% · NPA {partner.npa_pct}%
                  </span>
                  {partner.contact_phone && (
                    <a href={`tel:${partner.contact_phone}`} className="text-navy-700 hover:text-accent-gold text-xs transition-colors duration-200">
                      {partner.contact_phone}
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}

          {result.total_filtered_out > 0 && (
            <details className="bg-offwhite-50 rounded-xl p-4 text-sm text-navy-700">
              <summary className="cursor-pointer font-medium">
                {hi
                  ? `${result.total_filtered_out} पार्टनर हटाए गए (यह योजना नहीं / क्षमता / NPA / निष्क्रिय)`
                  : `${result.total_filtered_out} partners filtered out (don't process this scheme / over capacity / high NPA / inactive)`}
              </summary>
              <ul className="mt-2 space-y-1">
                {result.filtered_out.map(p => (
                  <li key={p.partner_id}>
                    <span className="font-medium">{p.name}</span> — {p.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Static fallback list */}
      {!showRanked && !loading && (
        <div className="space-y-3">
          {!location && !fallbackNote && (
            <p className="text-xs text-navy-700">
              {hi ? 'सटीक रैंकिंग के लिए PIN कोड दर्ज करें या अपना स्थान साझा करें।' : 'Enter your PIN code or share your location for capacity-aware ranking.'}
            </p>
          )}
          {staticPartners.length === 0 ? (
            <div className="bg-offwhite-50 rounded-xl p-6 text-center">
              <p className="text-navy-700 text-sm">No partners found. Try a different city.</p>
            </div>
          ) : (
            staticPartners.map(partner => (
              <div key={partner.id} className="bg-offwhite-0 rounded-xl border border-navy-100 p-5 hover:shadow-sm transition-shadow duration-200">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-ink-900 text-sm">{tData(partner.name)}</h4>
                      <span className="px-2.5 py-0.5 bg-navy-100 text-navy-900 rounded-full text-xs font-medium">{partner.type}</span>
                    </div>
                    <p className="text-navy-700 text-sm mt-1">{tData(partner.address)}</p>
                    <p className="text-navy-700 text-xs mt-1">{tData(partner.city)}, {tData(partner.state)}</p>
                  </div>
                  <div className="flex flex-col items-start sm:items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${partner.status === 'accepting' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                      {partner.status === 'accepting' ? t('scheme.partner.accepting') : t('scheme.partner.paused')}
                    </span>
                    <a href={`tel:${partner.phone}`} className="text-navy-700 hover:text-accent-gold text-xs transition-colors duration-200">
                      {partner.phone}
                    </a>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
