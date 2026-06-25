# Phase 8 UPS 실물 API 연동 리서치 결과

> **작성일**: 2026-06-25
> **작성자**: Dave (DeepSeek V4) — TASK-B-023
> **참조 자료**:
> - `docs/80_RawData/20260609 IBC和UPS Interface.pdf`
> - `docs/02_Analysis/An_09_통관연계_분석_검토보고서.md`
> - **라이브 API 문서**: `https://shxk.rtb56.com/usercenter/manager/api_document.aspx`
> - **실측 API**: `http://shxk.rtb56.com/webservice/PublicService.asmx/ServiceInterfaceUTF8`
> - `.env.local` — UPS_API_KEY / UPS_API_TOKEN (발급 완료)
> - **DEF-079** (260624): 실 연동 대상은 shxk.rtb56.com (제3자 플랫폼)

---

## 리서치 개요

- **연동 대상**: `shxk.rtb56.com` — 중국 포워더(3PL) 국제특송 주문 시스템
- **PDF 표기**: "UPS接口文档"으로 표기되었으나 UPS 공식 API가 아닌 제3자 시스템
- **라이브 문서 확인 완료**: `https://shxk.rtb56.com/usercenter/manager/api_document.aspx`
- **API 키 발급 완료** (JSJung → `.env.local`): `UPS_API_KEY` / `UPS_API_TOKEN`
- **실제 API 호출 검증 완료**: `http://shxk.rtb56.com/webservice/PublicService.asmx/ServiceInterfaceUTF8`

---

## ① API 기본 정보

| 항목 | 내용 |
|:-----|:------|
| **Base URL** | `http://shxk.rtb56.com/webservice/PublicService.asmx/ServiceInterfaceUTF8` |
| **Protocol** | HTTP (HTTPS 아님 — PDF에 HTTP 명시) |
| **Method** | POST |
| **Content-Type** | `application/x-www-form-urlencoded` |
| **Auth** | appToken + appKey (POST Body 파라미터로 전송) |
| **Service 방식** | 단일 엔드포인트 + `serviceMethod` 파라미터로 기능 분기 |

**참고**: 엔드포인트는 `tools/submit_ajax.ashx?action=xxx` (웹 내부 AJAX)와
`webservice/PublicService.asmx/ServiceInterfaceUTF8` (외부 API) 두 가지가 존재함.
외부 연동은 **asmx 엔드포인트**를 사용해야 함.

### 공통 요청 형식

```
POST /webservice/PublicService.asmx/ServiceInterfaceUTF8
Content-Type: application/x-www-form-urlencoded

appToken={token}&appKey={key}&serviceMethod={method}&paramsJson={json}
```

### 공통 응답 형식

```json
{
  "success": 0 | 1 | 2,
  "cnmessage": "중문 메시지",
  "enmessage": "영문 메시지",
  "data": { ... }
}
```

| 필드 | 타입 | 설명 |
|:-----|:-----|:-----|
| `success` | int | 0=실패, 1=성공, 2=중복주문 |
| `cnmessage` | string | 중문 결과 메시지 |
| `enmessage` | string | 영문 결과 메시지 |
| `data` | object/array | 성공 시 반환 데이터 |

---

## ② 사용 가능한 API 목록 (serviceMethod)

| # | serviceMethod | 설명 | 중요도 |
|:-:|:--------------|:-----|:------:|
| 1 | `createorder` | 주문 생성 (Draft 또는 즉시예보) | 🔴 필수 |
| 2 | `submitforecast` | Draft 주문 예보 제출 (2단계) | 🔴 필수 |
| 3 | `updateorder` | 주문 수정 | 🟡 필요 |
| 4 | `removeorder` | 주문 삭제 | 🟡 필요 |
| 5 | `getnewlabel` | 라벨/운송장 PDF/PNG 출력 | 🔴 필수 |
| 6 | `gettrackingnumber` | 트래킹 번호 조회 | 🔴 필수 |
| 7 | `gettrack` | 트래킹 기록 조회 | 🔴 필수 |
| 8 | `getorderfee` | 주문 비용 조회 (항목별 합계) | 🟡 필요 |
| 9 | `getorderfeedetail` | 주문 비용 상세 조회 | 🟢 옵션 |
| 10 | `getorderweight` | 주문 중량 조회 | 🟢 옵션 |
| 11 | `calculateshippingfee` | 운임 견적/사전 계산 | 🟡 필요 |
| 12 | `getbasicdata` | 기초 데이터 조회(운송방식 등) | 🟡 필요 |

---

## ③ API 상세 스펙

### ③-1. createorder (주문 생성)

**serviceMethod**: `createorder`

**paramsJson 필드**:

| 필드 | 타입 | 길이 | 필수 | 설명 |
|:-----|:-----|:----:|:----:|:-----|
| `reference_no` | string | 50 | **Y** | 고객 참조 번호 (유니크) |
| `shipping_method` | string | | **Y** | 운송 방식 코드 (getbasicdata로 조회) |
| `shipping_method_no` | string | 50 | | 서비스업체 운송장번호 |
| `order_weight` | string | 9,3 | | 중량(KG), 3자리 소수, 기본 0.2 |
| `order_pieces` | string | | | 외포장 건수, 기본 1 |
| `cargotype` | string | | | 화물유형: W(소포) / D(서류) / B(가방) |
| `order_status` | string | | | P=예보완료(기본), D=초안 |
| `mail_cargo_type` | string | | | 신고종류: 1=선물 / 2=상품샘플 / 3=서류 / 4=기타(기본) |
| `buyer_id` | string | 30 | | 구매자ID (eCommerce) |
| `order_info` | string | 200 | | 주문 비고 |
| `platform_id` | string | | | 플랫폼ID (사전등록 필요) |
| `custom_hawbcode` | string | 50 | | 사용자 지정 운송장번호 |
| `production_sales_company` | string | | | 생산판매 기업명 |
| `production_sales_companycode` | string | | | 생산판매 기업코드 |
| `shipper` | object | | **Y** | 발송인 정보 |
| `shipper.shipper_name` | string | 200 | **Y** | 발송인 성명 |
| `shipper.shipper_company` | string | 200 | | 발송인 회사명 |
| `shipper.shipper_countrycode` | string | 2 | **Y** | 발송인 국가코드 (ISO 2자리) |
| `shipper.shipper_province` | string | 300 | | 주/도 |
| `shipper.shipper_city` | string | 300 | | 도시 |
| `shipper.shipper_district` | string | 300 | | 구/군 |
| `shipper.shipper_street` | string | 300 | **Y** | 거리주소 |
| `shipper.shipper_postcode` | string | 100 | | 우편번호 |
| `shipper.shipper_areacode` | string | 10 | | 지역코드 |
| `shipper.shipper_telephone` | string | 100 | 조건 | 전화번호 (mobile/telephone 중 1 필수) |
| `shipper.shipper_mobile` | string | 100 | 조건 | 휴대폰 |
| `shipper.shipper_email` | string | 100 | | 이메일 |
| `shipper.shipper_fax` | string | 40 | | 팩스 |
| `consignee` | object | | **Y** | 수취인 정보 |
| `consignee.consignee_name` | string | 200 | **Y** | 수취인 성명 |
| `consignee.consignee_company` | string | 200 | | 수취인 회사명 |
| `consignee.consignee_countrycode` | string | 2 | **Y** | 수취인 국가코드 |
| `consignee.consignee_province` | string | 300 | 조건 | 주/도 |
| `consignee.consignee_city` | string | 300 | 조건 | 도시 |
| `consignee.consignee_district` | string | 300 | 조건 | 구/군 |
| `consignee.consignee_street` | string | 300 | **Y** | 거리주소 |
| `consignee.consignee_postcode` | string | 100 | 조건 | 우편번호 |
| `consignee.consignee_doorplate` | string | 300 | | 문패번호 |
| `consignee.consignee_areacode` | string | 10 | | 지역코드 |
| `consignee.consignee_telephone` | string | 100 | 조건 | 전화번호 |
| `consignee.consignee_mobile` | string | 100 | 조건 | 휴대폰 |
| `consignee.consignee_email` | string | 100 | | 이메일 |
| `consignee.consignee_fax` | string | 100 | | 팩스 |
| `consignee.consignee_certificatetype` | string | | | 증명서유형: ID(신분증) / PP(여권) |
| `consignee.consignee_certificatecode` | string | 50 | | 증명서번호 |
| `consignee.consignee_credentials_period` | string | 50 | | 증명서 유효기간 |
| `consignee.consignee_tariff` | string | 50 | 조건 | 수취인 세금번호 (EIN/TIN) |
| `invoice` | array | | **Y** | 통관 신고 품목 목록 |
| `invoice[].sku` | string | 100 | | SKU |
| `invoice[].invoice_enname` | string | 500 | **Y** | 영문 품명 |
| `invoice[].invoice_cnname` | string | 500 | 조건 | 중문 품명 |
| `invoice[].invoice_quantity` | string | 6 | **Y** | 수량 |
| `invoice[].unit_code` | string | | | 단위: MTR(미터) / PCE(개) / SET(세트), 기본 PCE |
| `invoice[].invoice_unitcharge` | string | 12,2 | **Y** | 단가(USD), 소수2자리 |
| `invoice[].hs_code` | string | 30 | | HS코드 |
| `invoice[].register_code` | string | 30 | | HTS번호 (미국용) |
| `invoice[].invoice_note` | string | 255 | | 배송메모 |
| `invoice[].invoice_url` | string | 255 | | 판매URL |
| `invoice[].invoice_info` | string | 200 | | 상품이미지 URL |
| `invoice[].invoice_material` | string | 255 | | 재질 |
| `invoice[].invoice_spec` | string | 255 | | 규격 |
| `invoice[].invoice_use` | string | 255 | | 용도 |
| `invoice[].invoice_brand` | string | 255 | | 브랜드 |
| `invoice[].posttax_num` | string | 255 | | 행우편세금번호 |
| `invoice[].country_origin` | string | 50 | | 원산지국가 |
| `invoice[].net_weight` | string | 9,3 | | 개별 상품중량(KG), 소수3자리 |
| `cargovolume` | array | | | 포장 체적 정보 (분할선적시) |
| `cargovolume[].child_number` | string | 60 | | 박스번호(자식운송장) |
| `cargovolume[].involume_length` | string | 5,1 | | 길이(CM), 소수1자리 |
| `cargovolume[].involume_width` | string | 5,1 | | 폭(CM), 소수1자리 |
| `cargovolume[].involume_height` | string | 5,1 | | 높이(CM), 소수1자리 |
| `cargovolume[].involume_grossweight` | string | 10,3 | | 총중량(KG), 소수3자리 |
| `extra_service` | array | | | 추가 서비스 |
| `extra_service[].extra_servicecode` | string | | **Y** | 서비스 유형코드 |
| `extra_service[].extra_servicevalue` | string | 20 | 조건 | 서비스 값 |
| `extra_service[].extra_servicenote` | string | 50 | | 비고 |

**응답 예시**:
```json
{
  "success": 1,
  "cnmessage": "订单创建成功",
  "enmessage": "Order created successfully",
  "data": {
    "order_id": 51770,
    "refrence_no": "TEST2018000002",
    "shipping_method_no": "RZ000013260TW",
    "channel_hawbcode": ""
  }
}
```

### ③-2. submitforecast (예보 제출 — 2단계)

createorder에서 `order_status: "D"`(초안)으로 생성한 후 호출.

**paramsJson**:
| 필드 | 타입 | 필수 | 설명 |
|:-----|:-----|:----:|:-----|
| `reference_no` | string | **Y** | 고객 참조 번호 |
| `order_weight` | string | | 중량(KG) |

**참고**: `order_status: "P"`로 바로 생성하면 submitforecast 불필요.

### ③-3. updateorder (주문 수정)

**paramsJson**:
| 필드 | 타입 | 필수 | 설명 |
|:-----|:-----|:----:|:-----|
| `reference_no` | string | **Y** | 고객 참조 번호 |
| `order_weight` | string | **Y** | 수정할 중량 |

### ③-4. removeorder (주문 삭제)

**paramsJson**:
| 필드 | 타입 | 필수 | 설명 |
|:-----|:-----|:----:|:-----|
| `reference_no` | string | **Y** | 고객 참조 번호 |

### ③-5. getnewlabel (라벨 출력)

라벨 파일(PNG/PDF)을 Base64 또는 URL로 반환.

**paramsJson**:
| 필드 | 타입 | 필수 | 설명 |
|:-----|:-----|:----:|:-----|
| `configInfo` | object | **Y** | 출력 설정 |
| `configInfo.lable_file_type` | string | **Y** | 1=PNG, 2=PDF |
| `configInfo.lable_paper_type` | string | **Y** | 1=라벨지, 2=A4 |
| `configInfo.lable_content_type` | string | **Y** | 1=라벨 / 2=세관신고서 / 3=배송물류 / 4=라벨+신고서 / 5=라벨+배송물류 / 6=라벨+신고서+배송물류 |
| `configInfo.additional_info` | object | **Y** | 추가설정 |
| `configInfo.additional_info.lable_print_invoiceinfo` | string | | 라벨에 배송정보 출력 (Y/N, 기본 N) |
| `configInfo.additional_info.lable_print_buyerid` | string | | 라벨에 구매자ID 출력 (Y/N, 기본 N) |
| `configInfo.additional_info.lable_print_datetime` | string | | 라벨에 날짜 출력 (Y/N, 기본 Y) |
| `configInfo.additional_info.customsdeclaration_print_actualweight` | string | | 세관신고서에 실중량 출력 (Y/N) |
| `listorder` | array | **Y** | 출력할 주문 목록 |
| `listorder[].reference_no` | string | **Y** | 고객 참조 번호 |

### ③-6. gettrackingnumber (트래킹 번호 조회)

**paramsJson**:
| 필드 | 타입 | 필수 | 설명 |
|:-----|:-----|:----:|:-----|
| `reference_no` | string | **Y** | 고객 참조 번호 |

### ③-7. gettrack (트래킹 기록 조회)

**paramsJson**:
| 필드 | 타입 | 필수 | 설명 |
|:-----|:-----|:----:|:-----|
| `tracking_number` | string | **Y** | 서비스업체 운송장번호 (shipping_method_no) |

**응답 예시**:
```json
{
  "success": 1,
  "data": [{
    "server_hawbcode": "RZ000013260TW",
    "destination_country": "US",
    "track_status": "NT",
    "track_status_name": "转运中",
    "signatory_name": "",
    "details": [{
      "track_occur_date": "2018-09-04 11:52:27",
      "track_location": "",
      "track_description": "快件电子信息已经收到"
    }]
  }]
}
```

### ③-8. getorderfee (비용 조회)

**paramsJson**:
| 필드 | 타입 | 필수 | 설명 |
|:-----|:-----|:----:|:-----|
| `reference_no` | string | **Y** | 고객 참조 번호 |

### ③-9. calculateshippingfee (운임 사전 계산)

견적용 — 주문 생성 전 운임 확인.

### ③-10. getbasicdata (기초 데이터)

운송 방식 코드 목록 등 시스템 기초 데이터 조회.

---

## ④ 인증 방식

- **메커니즘**: `appToken` + `appKey`를 POST Body 파라미터로 전송
- **헤더 인증 아님** — Authorization 헤더 불필요
- **매 요청마다** appToken + appKey 포함 필요
- **토큰 만료 정책**: 문서상 미확인 — 필요시 shxk 관리자 문의
- **발급 상태**: ✅ JSJung 통해 발급 완료, `.env.local`에 등록됨

```
UPS_API_KEY=bd0b5fea5e5821c6eec8e38639d97428
UPS_API_TOKEN=7315a08b6474676b16747aa39195f29a7315a08b6474676b16747aa39195f29a
```

---

## ⑤ 실제 API 호출 검증 결과

| Test | Endpoint | 파라미터 | 결과 |
|:-----|:---------|:---------|:-----|
| gettrack | 유효한 자격증명 + 존재하지 않는 tracking_number | `tracking_number: "TEST001"` | `{"success":0,"cnmessage":"跟踪号码不存在"}` ✅ |
| gettrackingnumber | 유효한 자격증명 + 존재하지 않는 reference_no | `reference_no: "TEST2018000001"` | `{"success":0,"cnmessage":"获取的跟踪单号为空"}` ✅ |
| getorderinfo | 잘못된 serviceMethod | `serviceMethod: "getorderinfo"` | `{"success":0,"cnmessage":"接口方法不支持"}` ✅ |

- API 정상 응답 확인 완료
- 자격증명 유효함
- 에러 응답 구조 일관됨 (`success` + `cnmessage` + `enmessage`)

---

## ⑥ 2단계 주문 프로세스

```
[1단계] createorder (order_status="D")
  → 데이터 임시 저장, 운송사 미전송
  → 응답: order_id, reference_no

[2단계] submitforecast (reference_no)
  → 실제 운송 예약 접수
  → 응답: shipping_method_no (운송장번호)

[선택] createorder (order_status="P")
  → 1단계+2단계 한번에 처리
```

---

## ⑦ 시스템 아키텍처 매핑

```
ZENITH LMS ──► shxk.rtb56.com (중국 포워더 3PL)
                    │
                    ├── createorder / submitforecast (주문)
                    ├── getnewlabel (라벨 PDF)
                    ├── gettrackingnumber (트래킹번호)
                    └── gettrack (트래킹조회)
```

- 기존 An_12 설계대로 ZENITH LMS에서 직접 shxk API 호출
- IBC/Pactrak 시스템은 이번 Phase 8에서 제외 (Edward/Aiden 확정)

---

## ⑧ 리스크 및 주의사항

| 리스크 | 영향 | 대응 |
|:-------|:-----|:-----|
| HTTP 프로토콜 (HTTPS 아님) | 보안 위험 | 데이터 암호화 검토 필요 |
| appToken 만료 정책 미확인 | 갑작스러운 연동 장애 | shxk 관리자에 만료 정책 문의 |
| shipping_method 코드 사전등록 필요 | 주문 생성 불가 | getbasicdata로 코드 목록 확보 |
| platform_id 사전등록 필요 | 플랫폼 주문 불가 | shxk 관리자에게 platform_id 요청 |
| 중국어 메시지 기반 오류 응답 | 디버깅 어려움 | `enmessage` 필드 활용, 오류코드 매핑 테이블 구축 |

---

## ⑨ 결론 및 권장사항

1. **연동 가능**: shxk.rtb56.com API는 실제 호출 가능하며 자격증명도 유효함
2. **RESTful 아님**: 단일 엔드포인트 + serviceMethod 분기 방식 — 어댑터 패턴으로 추상화 필요
3. **2단계 프로세스 지원**: createorder(Draft) → submitforecast 또는 createorder(P) 일괄 처리
4. **라벨 출력**: PNG/PDF 선택 가능, A4/라벨지 지원
5. **트래킹**: gettrackingnumber + gettrack 으로 전체 트래킹 커버 가능
6. **착수 조건**: shipping_method 코드 목록 + platform_id 확보 후 IMP-069(어댑터 구현) 착수
