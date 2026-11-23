'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { ZenInput } from './ZenInput';
import { PHONE_MAX_DIGITS, stripNonDigits } from '@/lib/validation/shxk-limits';

export interface PhoneInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean | string;
  /**
   * 하이픈 허용 변형 (TASK-B-347 / Issue #1279).
   * 픽업 연락처처럼 기존에 "하이픈 포함 저장" 계약이 있는 필드 전용.
   * 기본 false면숫자만 허용한다.
   */
  allowHyphens?: boolean;
  /** 입력란 아래 도움말 문구 표시 여부 (기본 true) */
  showHelp?: boolean;
}

/**
 * 전화번호 입력 공용 컴포넌트 (TASK-B-347 / Issue #1279)
 *
 * - `inputMode="numeric"` + `maxLength={PHONE_MAX_DIGITS}` + onChange에서 비숫자 제거.
 *   키보드 타이핑·붙여넣기·IME·자동완성 모두 input onChange 경유이므로
 *   한곳의 정규화로 전 경로가 동일하게 걸러진다.
 * - 입력란 아래 i18n 도움말 문구 표시 — `Common.phoneHelp`(숫자만) /
 *   `Common.phoneHelpHyphen`(하이픈 허용) 키를 4개 로케일(ko/en/zh/ja)에서 제공.
 */
export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    { className, error, onChange, maxLength, placeholder, allowHyphens = false, showHelp = true, ...props },
    ref
  ) => {
    const t = useTranslations('Common');
    return (
      <div className="space-y-1">
        <ZenInput
          ref={ref}
          placeholder={placeholder ?? '01012345678'}
          inputMode={allowHyphens ? undefined : 'numeric'}
          maxLength={maxLength ?? (allowHyphens ? PHONE_MAX_DIGITS + 3 : PHONE_MAX_DIGITS)}
          error={error}
          className={className}
          onChange={(e) => {
            e.target.value = allowHyphens
              ? e.target.value.replace(/[^\d-]/g, '')
              : stripNonDigits(e.target.value);
            onChange?.(e);
          }}
          {...props}
        />
        {showHelp && (
          <p className="text-[10px] text-slate-400 leading-tight">
            {t(allowHyphens ? 'phoneHelpHyphen' : 'phoneHelp', { max: PHONE_MAX_DIGITS })}
          </p>
        )}
      </div>
    );
  }
);
PhoneInput.displayName = 'PhoneInput';
