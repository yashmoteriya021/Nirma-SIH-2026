import { useState, useMemo } from 'react';
import { useLang } from '../context/LanguageContext';
import partnersData from '../data/partners.json';

export default function PartnerLocator({ schemeId }) {
  const { t, tData } = useLang();
  const [searchCity, setSearchCity] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState('');

  const allPartners = partnersData.partners;

  // Filter partners that support this scheme
  const eligiblePartners = useMemo(() => {
    return allPartners.filter(p =>
      p.schemesSupported.includes(schemeId)
    );
  }, [schemeId]);

  // Calculate distance using Haversine formula
  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  // Filter and sort by city or distance
  const filteredPartners = useMemo(() => {
    let partners = [...eligiblePartners];

    if (searchCity.trim()) {
      const q = searchCity.toLowerCase();
      partners = partners.filter(p =>
        p.city.en.toLowerCase().includes(q) ||
        p.city.hi.includes(searchCity) ||
        p.state.en.toLowerCase().includes(q) ||
        p.state.hi.includes(searchCity)
      );
    }

    if (userLocation) {
      partners = partners.map(p => ({
        ...p,
        distance: getDistance(userLocation.lat, userLocation.lng, p.lat, p.lng),
      })).sort((a, b) => a.distance - b.distance);
    }

    return partners;
  }, [eligiblePartners, searchCity, userLocation]);

  function handleUseLocation() {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocationError('Unable to retrieve your location. Please search by city instead.');
      }
    );
  }

  const statusColors = {
    accepting: 'bg-green-100 text-green-800',
    paused: 'bg-amber-100 text-amber-800',
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-navy-900">{t('scheme.partner.title')}</h3>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={searchCity}
          onChange={(e) => setSearchCity(e.target.value)}
          placeholder={t('scheme.partner.searchCity')}
          className="flex-1 px-4 py-3 rounded-xl border border-navy-100 bg-offwhite-0 text-ink-900 text-sm focus:border-accent-gold focus:outline-none min-h-[44px]"
        />
        <button
          onClick={handleUseLocation}
          className="px-5 py-3 border border-navy-100 text-navy-900 font-medium text-sm rounded-xl hover:bg-navy-100 transition-colors duration-200 flex items-center gap-2 min-h-[44px]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          {t('scheme.partner.useLocation')}
        </button>
      </div>

      {locationError && (
        <p className="text-sm text-amber-800 bg-amber-50 rounded-xl px-4 py-2">{locationError}</p>
      )}

      <div className="space-y-3">
        {filteredPartners.length === 0 ? (
          <div className="bg-offwhite-50 rounded-xl p-6 text-center">
            <p className="text-navy-700 text-sm">No partners found. Try a different city.</p>
          </div>
        ) : (
          filteredPartners.map(partner => (
            <div key={partner.id} className="bg-offwhite-0 rounded-xl border border-navy-100 p-5 hover:shadow-sm transition-shadow duration-200">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-ink-900 text-sm">
                      {tData(partner.name)}
                    </h4>
                    <span className="px-2.5 py-0.5 bg-navy-100 text-navy-900 rounded-full text-xs font-medium">
                      {partner.type}
                    </span>
                  </div>
                  <p className="text-navy-700 text-sm mt-1">
                    {tData(partner.address)}
                  </p>
                  <p className="text-navy-700 text-xs mt-1">
                    {tData(partner.city)}, {tData(partner.state)}
                    {partner.distance !== undefined && ` · ~${partner.distance} km`}
                  </p>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[partner.status] || ''}`}>
                    {partner.status === 'accepting'
                      ? t('scheme.partner.accepting')
                      : t('scheme.partner.paused')
                    }
                  </span>
                  <a
                    href={`tel:${partner.phone}`}
                    className="text-navy-700 hover:text-accent-gold text-xs flex items-center gap-1 transition-colors duration-200"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                    {partner.phone}
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
