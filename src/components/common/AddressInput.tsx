'use client';

import { useState, useEffect } from 'react';
import { DaumPostcodeEmbed } from 'react-daum-postcode';
import { Country, State, City } from 'country-state-city';
import type { ICountry, IState, ICity } from 'country-state-city';

interface AddressInputProps {
  t: (key: string) => string;
  fieldErrors?: Record<string, string>;
  defaultValues?: {
    country_code?: string | null;
    state_province?: string | null;
    city?: string | null;
    address?: string | null;
    address_detail?: string | null;
    zipcode?: string | null;
  };
  mode?: 'form-action' | 'rhf';
  prefix?: string;
  register?: any;
  readOnly?: boolean;
}

function rhf(p: string, n: string, r?: any) {
  return r ? r(`${p ? `${p}_` : ''}${n}`) : {};
}

export function AddressInput({
  t,
  fieldErrors = {},
  defaultValues = {},
  mode = 'form-action',
  prefix = '',
  register,
  readOnly = false,
}: AddressInputProps) {
  const [countryCode, setCountryCode] = useState(defaultValues.country_code || 'KR');
  const [countries, setCountries] = useState<ICountry[]>([]);
  const [states, setStates] = useState<IState[]>([]);
  const [cities, setCities] = useState<ICity[]>([]);
  const [selectedState, setSelectedState] = useState(defaultValues.state_province || '');
  const [selectedCity, setSelectedCity] = useState(defaultValues.city || '');
  const [streetAddress, setStreetAddress] = useState(defaultValues.address || '');
  const [detailAddress, setDetailAddress] = useState(defaultValues.address_detail || '');
  const [postalCode, setPostalCode] = useState(defaultValues.zipcode || '');
  const [roadAddress, setRoadAddress] = useState(defaultValues.country_code === 'KR' ? (defaultValues.address || '') : '');
  const [showPostcode, setShowPostcode] = useState(false);

  useEffect(() => {
    setCountries(Country.getAllCountries());
  }, []);

  useEffect(() => {
    if (countryCode && countryCode !== 'KR') {
      setStates(State.getStatesOfCountry(countryCode) ?? []);
      setSelectedState('');
      setSelectedCity('');
      setCities([]);
    }
  }, [countryCode]);

  useEffect(() => {
    if (selectedState && countryCode !== 'KR') {
      setCities(City.getCitiesOfState(countryCode, selectedState) ?? []);
      setSelectedCity('');
    }
  }, [selectedState, countryCode]);

  const a = (name: string) => (mode === 'rhf' ? rhf(prefix, name, register) : { name });

  return (
    <div className="border-t border-slate-100 pt-5">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{t('form_address')}</p>

      <div className="mb-4">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_country')}</label>
        <select
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          className="w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          {countries.map((c) => (
            <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
          ))}
        </select>
        {mode === 'form-action' && <input name="country_code" type="hidden" value={countryCode} />}
      </div>

      {countryCode === 'KR' ? (
        <div className="mb-4">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_zipcode')}</label>
          <div className="flex gap-2">
            <input
              {...a('zipcode')}
              value={postalCode}
              readOnly
              placeholder={t('form_zipcode')}
              className="flex-1 h-10 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
            />
            <button type="button" onClick={() => setShowPostcode(true)}
              className="h-10 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shrink-0">
              {t('form_address_search')}
            </button>
          </div>
        </div>
      ) : null}

      {countryCode === 'KR' ? (
        <>
          <div className="mb-4">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_address')}</label>
            <input
              {...a('address')}
              value={roadAddress}
              readOnly
              placeholder={countryCode === 'KR' ? t('form_address_search') : ''}
              className="w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
            />
            {fieldErrors.address && <p className="text-xs text-red-500 mt-1">{fieldErrors.address}</p>}
          </div>
          <div className="mb-4">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_address_detail')}</label>
            <input
              {...a('address_detail')}
              value={detailAddress}
              onChange={(e) => setDetailAddress(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {fieldErrors.address_detail && <p className="text-xs text-red-500 mt-1">{fieldErrors.address_detail}</p>}
          </div>
          {mode === 'form-action' && <input name="state_province" type="hidden" value="" />}
          {mode === 'form-action' && <input name="city" type="hidden" value="" />}
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_state_province')}</label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">{t('form_state_province')}</option>
                {states.map((s) => (
                  <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                ))}
              </select>
              <input type="hidden" {...(mode === 'rhf' ? rhf(prefix, 'state_province', register) : { name: 'state_province' })} value={selectedState} />
              {fieldErrors.state_province && <p className="text-xs text-red-500 mt-1">{fieldErrors.state_province}</p>}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_city')}</label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                disabled={!selectedState}
                className="w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
              >
                <option value="">{t('form_city')}</option>
                {cities.map((c) => (
                  <option key={`${c.name}-${c.stateCode}`} value={c.name}>{c.name}</option>
                ))}
              </select>
              <input type="hidden" {...(mode === 'rhf' ? rhf(prefix, 'city', register) : { name: 'city' })} value={selectedCity} />
              {fieldErrors.city && <p className="text-xs text-red-500 mt-1">{fieldErrors.city}</p>}
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_address')}</label>
            <input
              {...a('address')}
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {fieldErrors.address && <p className="text-xs text-red-500 mt-1">{fieldErrors.address}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_address_detail')}</label>
              <input
                {...a('address_detail')}
                value={detailAddress}
                onChange={(e) => setDetailAddress(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {fieldErrors.address_detail && <p className="text-xs text-red-500 mt-1">{fieldErrors.address_detail}</p>}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_zipcode')}</label>
              <input
                {...a('zipcode')}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {fieldErrors.zipcode && <p className="text-xs text-red-500 mt-1">{fieldErrors.zipcode}</p>}
            </div>
          </div>
        </>
      )}

      {showPostcode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowPostcode(false)}
        >
          <div
            className="bg-white rounded-2xl overflow-auto w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <DaumPostcodeEmbed
              onComplete={(data) => {
                setRoadAddress(data.roadAddress);
                setPostalCode(data.zonecode);
                setShowPostcode(false);
              }}
              style={{ height: 460 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
