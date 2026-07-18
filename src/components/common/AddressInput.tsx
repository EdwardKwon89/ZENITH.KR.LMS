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
    address_english?: string | null;
    address_detail_english?: string | null;
    zipcode?: string | null;
  };
  mode?: 'form-action' | 'rhf';
  prefix?: string;
  register?: any;
  readOnly?: boolean;
  setValue?: (name: any, value: any) => void;
  required?: boolean;
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
  setValue,
  required = false,
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
  const [addressEnglish, setAddressEnglish] = useState(defaultValues.address_english || '');
  const [addressDetailEnglish, setAddressDetailEnglish] = useState(defaultValues.address_detail_english || '');
  const [showPostcode, setShowPostcode] = useState(false);

  useEffect(() => {
    setCountries(Country.getAllCountries());
  }, []);

  useEffect(() => {
    if (defaultValues.country_code) setCountryCode(defaultValues.country_code);
    if (defaultValues.state_province) setSelectedState(defaultValues.state_province);
    if (defaultValues.city) setSelectedCity(defaultValues.city);
    if (defaultValues.address !== undefined) {
      setStreetAddress(defaultValues.address || '');
      if (defaultValues.country_code === 'KR') setRoadAddress(defaultValues.address || '');
    }
    if (defaultValues.address_detail !== undefined) setDetailAddress(defaultValues.address_detail || '');
    if (defaultValues.zipcode !== undefined) setPostalCode(defaultValues.zipcode || '');
  }, [defaultValues.country_code, defaultValues.state_province, defaultValues.city, defaultValues.address, defaultValues.address_detail, defaultValues.zipcode]);

  // 국가 변경 시 state 목록 갱신 (리셋은 onChange에서 처리 — Issue #530)
  useEffect(() => {
    if (countryCode) {
      setStates(State.getStatesOfCountry(countryCode) ?? []);
      setCities([]);
    }
  }, [countryCode]);

  // 시/도 변경 시 city 목록 갱신 (리셋은 onChange에서 처리 — Issue #530)
  useEffect(() => {
    if (selectedState && countryCode) {
      setCities(City.getCitiesOfState(countryCode, selectedState) ?? []);
    }
  }, [selectedState, countryCode]);

  const a = (name: string) => (mode === 'rhf' ? rhf(prefix, name, register) : { name });

  return (
    <div className="border-t border-slate-100 pt-5">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{t('form_address')}{required && <span className="text-rose-500"> *</span>}</p>

      <div className="mb-4">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_country')}</label>
        <select
          value={countryCode}
          onChange={(e) => {
            setCountryCode(e.target.value);
            setSelectedState('');
            setSelectedCity('');
            if (setValue && prefix) {
              setValue(`${prefix}_country_code`, e.target.value);
              setValue(`${prefix}_state_province`, '');
              setValue(`${prefix}_city`, '');
            }
          }}
          disabled={readOnly}
          className={`w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${readOnly ? 'bg-slate-50' : ''}`}
        >
          {countries.map((c) => (
            <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
          ))}
        </select>
        {mode === 'form-action'
          ? <input name="country_code" type="hidden" value={countryCode} />
          : <input type="hidden" {...rhf(prefix, 'country_code', register)} value={countryCode} />
        }
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
              disabled={readOnly}
              className="h-10 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shrink-0 disabled:opacity-50">
              {t('form_address_search')}
            </button>
          </div>
        </div>
      ) : null}

      {countryCode === 'KR' && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_state_province')}</label>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedCity('');
                if (setValue && prefix) {
                  setValue(`${prefix}_state_province`, e.target.value);
                  setValue(`${prefix}_city`, '');
                }
              }}
              disabled={readOnly || !countryCode}
              className={`w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${readOnly ? 'bg-slate-50' : ''}`}
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
              onChange={(e) => {
                setSelectedCity(e.target.value);
                if (setValue && prefix) setValue(`${prefix}_city`, e.target.value);
              }}
              disabled={readOnly || !selectedState}
              className={`w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 ${readOnly ? 'bg-slate-50' : ''}`}
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
      )}

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
              onChange={(e) => {
                setDetailAddress(e.target.value);
                if (setValue && prefix) setValue(`${prefix}_address_detail`, e.target.value);
              }}
              disabled={readOnly}
              className={`w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${readOnly ? 'bg-slate-50' : ''}`}
            />
            {fieldErrors.address_detail && <p className="text-xs text-red-500 mt-1">{fieldErrors.address_detail}</p>}
          </div>
          {mode === 'form-action' && <input name="state_province" type="hidden" value={selectedState} />}
          {mode === 'form-action' && <input name="city" type="hidden" value={selectedCity} />}
          {mode === 'form-action' && <input name="address_english" type="hidden" value={addressEnglish} />}
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_state_province')}</label>
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setSelectedCity('');
                  if (setValue && prefix) {
                    setValue(`${prefix}_state_province`, e.target.value);
                    setValue(`${prefix}_city`, '');
                  }
                }}
                disabled={readOnly || !countryCode}
                className={`w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${readOnly ? 'bg-slate-50' : ''}`}
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
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  if (setValue && prefix) setValue(`${prefix}_city`, e.target.value);
                }}
                disabled={readOnly || !selectedState}
                className={`w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 ${readOnly ? 'bg-slate-50' : ''}`}
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
              disabled={readOnly}
              className={`w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${readOnly ? 'bg-slate-50' : ''}`}
            />
            {fieldErrors.address && <p className="text-xs text-red-500 mt-1">{fieldErrors.address}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_address_detail')}</label>
              <input
                {...a('address_detail')}
                value={detailAddress}
              onChange={(e) => {
                setDetailAddress(e.target.value);
                if (setValue && prefix) setValue(`${prefix}_address_detail`, e.target.value);
              }}
                disabled={readOnly}
                className={`w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${readOnly ? 'bg-slate-50' : ''}`}
              />
              {fieldErrors.address_detail && <p className="text-xs text-red-500 mt-1">{fieldErrors.address_detail}</p>}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_zipcode')}</label>
              <input
                {...a('zipcode')}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                disabled={readOnly}
                className={`w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${readOnly ? 'bg-slate-50' : ''}`}
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
                const englishAddr = (data as any).roadAddressEnglish || '';
                setAddressEnglish(englishAddr);
                const KR_SIDO_TO_ISOCODE: Record<string, string> = {
                  '서울': '11', '부산': '26', '대구': '27', '인천': '28', '광주': '29',
                  '대전': '30', '울산': '31', '세종': '50', '경기': '41', '강원': '42',
                  '충북': '43', '충남': '44', '전북': '45', '전남': '46', '경북': '47',
                  '경남': '48', '제주': '49',
                };
                const matchedIso = Object.entries(KR_SIDO_TO_ISOCODE).find(([key]) => (data as any).sido?.startsWith(key))?.[1] ?? '';
                const matchedCity = City.getCitiesOfState('KR', matchedIso).find(c => c.name === (data as any).sigunguEnglish)?.name ?? (data as any).sigunguEnglish ?? '';
                setSelectedState(matchedIso);
                setSelectedCity(matchedCity);
                if (setValue && prefix) {
                  setValue(`${prefix}_address`, data.roadAddress);
                  setValue(`${prefix}_zipcode`, data.zonecode);
                  setValue(`${prefix}_address_detail`, '');
                  setValue(`${prefix}_address_english`, englishAddr);
                  setValue(`${prefix}_state_province`, matchedIso);
                  setValue(`${prefix}_city`, matchedCity);
                }
                setDetailAddress('');
              }}
              style={{ height: 460 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
