// 폼 Packing Unit 선택지 — TASK-B-337 (Issue #1251)
//
// SHXK 정본 목록(`SHXK_DECLARE_UNITS`)의 code 7개를 그대로 사용한다.
// 라벨은 코드 그대로(국문 표기 없음), 툴팁(title)에만 중국어 명칭을 병기한다.
//
// 신규 품목 기본값은 `PCE`(件) — 변환이 사라지면서 신규 품목 기본값 `EA`("套")가
// 그대로 나가는 것을 방지하기 위한 Jaison 결정. 기존 저장값은 건드리지 않는다.

import { SHXK_DECLARE_UNITS } from '@/lib/shxk/declare-units';

export const PACKING_UNIT_OPTIONS = SHXK_DECLARE_UNITS.map((u) => ({ value: u.code, title: u.cnname }));

export const DEFAULT_PACKING_UNIT = 'PCE';
