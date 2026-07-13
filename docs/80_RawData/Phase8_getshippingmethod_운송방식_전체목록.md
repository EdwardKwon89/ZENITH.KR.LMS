# Phase 8 — getshippingmethod 운송방식 전체 목록

> **검증일**: 2026-06-26
> **검증자**: Jaison (JSJung 제안 → Jaison 실측)
> **API**: `POST http://shxk.rtb56.com/webservice/PublicService.asmx/ServiceInterfaceUTF8`
> **serviceMethod**: `getshippingmethod`
> **관련 Issue**: [#119](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/119)
> **참조**: TASK-B-023 리서치 문서 미등재 신규 발견 메서드

---

## 검증 결과 요약

| 항목 | 내용 |
|:-----|:-----|
| HTTP 상태 | 200 OK |
| 인증 | appToken + appKey POST body — 정상 작동 |
| 응답 구조 | `{"data":[{"code","cnname","enname","note"}]}` |
| 전체 운송방식 수 | **190건** |
| 한국 관련 (code/cnname 기준) | **65건** |
| UPS 한국 코드 | **16건** |

---

## UPS 한국 운송방식 (16건)

> An-13 설계 시 `shipping_method` 필드 참조용

| code | enname | cnname | 한국어 | 비고 |
|:-----|:-------|:-------|:-------|:-----|
| `FXUPS` | KR-UPS-Saver | KR-UPS-Saver(红) | KR-UPS-세이버(레드) | |
| `KEUPS008` | KEUPS008 | 韩国UPS-SM-DDU | 한국 UPS-SM-DDU | |
| `KEUPSSMDDP` | KEUPSSMDDP | 韩国UPS-SM-DDP | 한국 UPS-SM-DDP | |
| `KRUPSDDP` | KRUPSDDP | 韩国UPS-CNK-DDP | 한국 UPS-CNK-DDP(관세포함) | |
| `KRUPSEXP` | KR-UPS-Express | KR-UPS-Express(加急) | KR-UPS-익스프레스(긴급) | |
| `KRUPSSFLD` | KRUPSSFLD | 韩国UPS三方A蓝单 | 한국 UPS 3자A 블루라벨 | |
| `KRUPSSFQD` | KRUPSSFQD | 韩国UPS三方A红单 | 한국 UPS 3자A 레드라벨 | |
| `KRUPSWE` | KR-UPS-Expedited | KR-UPS-Expedited(蓝单) | KR-UPS-익스페디티드(블루라벨) | |
| `KRUPSWWEF` | KR-UPS-WWEF | KR-UPS-WWEF(托) | KR-UPS-WWEF(팔레트) | |
| `PK0032` | KR-UPS-WWEF(托)-DDP | 韩国-UPS-WWEF(托)-DDP | 한국-UPS-WWEF(팔레트)-DDP | |
| `PK0033` | KR-UPS-Express-DDP | 韩国-UPS-Express(加急)-DDP | 한국-UPS-익스프레스(긴급)-DDP | |
| `PK0034` | KR-UPS-Expedited-DDP | 韩国-UPS-Expedited(蓝单)-DDP | 한국-UPS-익스페디티드(블루라벨)-DDP | |
| `PK0035` | 韩国-UPS-Saver(红单)-DDP | 韩国-UPS-Saver(红单)-DDP | 한국-UPS-세이버(레드라벨)-DDP | |
| `PK0049` | KRUPS-DDP-SaverJ4441J | 韩国UPS-DDP-Saver-J4441J | 한국 UPS-DDP-세이버-J4441J | |
| `PK0051` | KRUPS-DDU-Saver-J4441J | 韩国UPS-DDU-Saver-J4441J | 한국 UPS-DDU-세이버-J4441J | |
| `USUPS` | UPS-CNK-DDU | 韩国UPS-CNK-DDU | 한국 UPS-CNK-DDU(관세미포함) | |

---

## 전체 운송방식 목록 (190건)

| # | code | enname | cnname | 한국어 | note (요약) |
|:-:|:-----|:-------|:-------|:-------|:------------|
| 1 | `ADLYAR` | ADLYKR | 集运澳洲空运专线 | 호주 항공 집하운송 전용편 | |
| 2 | `ANB` | VNBEXP | 越南B类经济 | 베트남 B등급 경제편 | 문전. 상하이-베트남 4-5일 |
| 3 | `APERD` | APERD | 越南AP-2日达 | 베트남 AP 2일 도착 | 문전. 2일. 항공 |
| 4 | `APSRDDS` | APSRDDS | 越南陆运电商小包 | 베트남 육로 이커머스 소포 | |
| 5 | `AUZXHY` | AUZXHY | 集运澳洲海运专线 | 호주 해운 집하운송 전용편 | |
| 6 | `B1VN` | B1VN | 越南B1陆运 | 베트남 B1 육로운송 | |
| 7 | `BQGKR` | BQGKR | 韩国海运DDP包税 | 한국 해운 DDP 관세포함 | |
| 8 | `CGKAIR` | CGKAIR | cargo雅加达仓位CGK | 카고 자카르타 CGK | |
| 9 | `CHPHN` | CHPHN | cargo柬埔寨仓位PNH | 카고 캄보디아 PNH | |
| 10 | `CHVN` | CHVN | cargo越南仓位SGN/HAN | 카고 베트남 SGN/HAN | |
| 11 | `CIFSEA` | CIFSEA | 韩国海运准时达BC | 한국 해운 정시도착 BC | 도착항. 상하이→한국 3일 |
| 12 | `CKDCZ` | CKDCZ | 仓库代操作 | 창고 위탁작업 | |
| 13 | `CNK0010` | MJLKYZX | cargo孟加拉仓位DAC | 카고 방글라데시 DAC | |
| 14 | `CVN` | CVN | 越南C物流 | 베트남 C 물류 | 문전. 상하이-베트남 6-8일 |
| 15 | `DJPZ` | DJPZ | 柬埔寨D类陆运特货 | 캄보디아 D등급 육로 특수화물 | |
| 16 | `DPFW` | DPFW | 代取代派 | 픽업/배송 대행 | |
| 17 | `FCLKR` | FCLKR | 韩国FCL整柜 | 한국 FCL 전용컨테이너 | |
| 18 | `FEDEX2DAY3` | FEDEX2DAY-ZD | 美国专线FedEx2Day自打 | 미국 전용편 FedEx 2일 자체라벨 | 문전. 3-5일 |
| 19 | `FEDEX2DAY4` | FEDEX2DAY-MD | 美国FedEx2Day末端 | 미국 FedEx 2일 라스트마일 | |
| 20 | `FEDEXGE` | FedExGroundE | 美国专线FedExEconomy | 미국 전용편 FedEx 이코노미 | 문전. 5-11일 |
| 21 | `FXUPS` | KR-UPS-Saver | KR-UPS-Saver(红) | **KR-UPS-세이버(레드)** | **UPS 한국** |
| 22 | `HANCARRY` | HANCARRY | 手提HANDCARRY | 핸드캐리 | |
| 23 | `HANCH` | VN-CNLYA | VN-CN陆运快件A | 베트남→중국 육로 특급 A | |
| 24 | `HANPNHB` | HANPNHB | VN-KH陆运慢件B | 베트남→캄보디아 육로 일반 B | |
| 25 | `HCMCN` | VN-CNEXP | VN-CN空运快件 | 베트남→중국 항공 특급 | |
| 26 | `HCMPHNA` | VN-KHEXPA | VN-KH陆运快件A | 베트남→캄보디아 육로 특급 A | |
| 27 | `HYDSKR` | HYDSKR | 韩国CNK海运电商BC | 한국 CNK 해운 이커머스 BC | |
| 28 | `HYKJCNK` | HYKJCNK | 韩国海运快件 | 한국 해운 특급화물 | 문전. 상하이→한국 3일 |
| 29 | `HYPUDM` | HYPUDM | 韩国海运准时达 | 한국 해운 정시도착 | 문전. 상하이→한국 3일 |
| 30 | `HYTS` | HYTS | 韩国海运转关TS | 한국 해운 환적 TS | UPS·FedEx·DHL·항공 |
| 31 | `HZMUPSHY` | HZMUPSHY | VN-胡志明UPS-托盘 | 베트남-호치민 UPS 팔레트 | |
| 32 | `JFKAIR` | JFKAIR | cargo纽约仓位JFK | 카고 뉴욕 JFK | |
| 33 | `JPZA` | JPZA | 柬埔寨A类四日达 | 캄보디아 A등급 4일 도착 | 문전. 5-6일 |
| 34 | `JPZAPJJ` | JPZAPJJ | 柬埔寨AP经济 | 캄보디아 AP 경제편 | 문전. 4-5일 |
| 35 | `JPZAPTKJJ` | JPZAPTKJJ | 柬埔寨AP特快加急 | 캄보디아 AP 특급 긴급 | |
| 36 | `JPZBLK` | JPZBLK | 柬埔寨B类陆加空 | 캄보디아 B등급 육로+항공 | 문전. 3-4일 |
| 37 | `JPZCWL` | JPZCWL | 柬埔寨C类陆运 | 캄보디아 C등급 육로운송 | 문전. 9-11일 |
| 38 | `JPZDSLY` | JPZDSLY | 集运柬埔寨C类 | 캄보디아 C등급 집하운송 | |
| 39 | `JPZFTL` | JPZFTL | 柬埔寨陆运FTL | 캄보디아 육로 FTL | |
| 40 | `JPZLTL` | JPZLTL | 柬埔寨陆运LTL | 캄보디아 육로 LTL | |
| 41 | `JPZPHKY` | JPZPHKY | 集运柬埔寨AP经济 | 캄보디아 AP 경제 집하운송 | |
| 42 | `JPZPY` | JPZPY | 柬埔寨偏远 | 캄보디아 오지할증 | |
| 43 | `JPZTBKY` | JPZTBKY | 集运柬埔寨AP特快 | 캄보디아 AP 특급 집하운송 | |
| 44 | `JPZZX` | JPZAP | 柬埔寨AP特快 | 캄보디아 AP 특급 | 문전. 당일발송 익일도착 |
| 45 | `JYDYDS` | JYDYDS | 集运代运 | 집하 위탁운송 | |
| 46 | `JYTH` | JYTH | 集运退货 | 집하 반품 | |
| 47 | `KEUPS008` | KEUPS008 | 韩国UPS-SM-DDU | **한국 UPS-SM-DDU** | **UPS 한국** |
| 48 | `KEUPSSMDDP` | KEUPSSMDDP | 韩国UPS-SM-DDP | **한국 UPS-SM-DDP** | **UPS 한국** |
| 49 | `KR-CNDG` | KR-CNDG | KR-CN代工 | 한국→중국 위탁제조 | |
| 50 | `KRAIRLOTTE` | KRAIR | 韩国空运电商 | 한국 항공 이커머스 | 문전. 3일 |
| 51 | `KRCJSEA` | KRCJSEA | 韩国CNK海运电商A-集运 | 한국 CNK 해운 이커머스 A 집하 | 문전. 상하이→한국 3일 |
| 52 | `KRCN` | KRCN | KR-CN海运普货 | 한국→중국 해운 일반화물 | |
| 53 | `KREXP` | KREXP | 韩国海运快件BC | 한국 해운 특급 BC | 문전. 금포 자체픽업 |
| 54 | `KREYB-A` | KREYB-A | 韩国E邮宝A | 한국 E-패킷 A | 최대: 장+폭+고 ≤90cm |
| 55 | `KRFDX01FIC` | 韩国FEDEX4425-FICP | 韩国FEDEX4425-1306DDP-FICP | 한국 FedEx 4425-1306 DDP-FICP | |
| 56 | `KRFEDEX001` | KRFEDEX001 | 韩国FEDEX6684-3353DDP-IP | 한국 FedEx 6684-3353 DDP-IP | |
| 57 | `KRFEDEX003` | KRFEDEX003 | 韩国FEDEX6256-IP | 한국 FedEx 6256-IP | |
| 58 | `KRFEDEX1IE` | KRFEDEX1IE | 韩国FEDEX6684-3353DDP-IE | 한국 FedEx 6684-3353 DDP-IE | |
| 59 | `KRFEDEX3IE` | KRFEDEX3IE | 韩国FEDEX6256-IE | 한국 FedEx 6256-IE | |
| 60 | `KRFEX02FIC` | 韩国FEDEX6684-FICP-US | 韩国FDX6684-3353DDP-FICP-US | 한국 FDX 6684-3353 DDP-FICP-US | |
| 61 | `KRLCL01` | KRDDPBC | 韩国海运DDP包税BC | 한국 해운 DDP 관세포함 BC | |
| 62 | `KRLOTTESEA` | KRSEA | 韩国海运电商 | 한국 해운 이커머스 | 문전. 상하이→한국 3일 |
| 63 | `KRPY` | KRPY | 韩国偏远 | 한국 오지할증 | |
| 64 | `KRUPSDDP` | KRUPSDDP | 韩国UPS-CNK-DDP | **한국 UPS-CNK-DDP(관세포함)** | **UPS 한국** |
| 65 | `KRUPSEXP` | KR-UPS-Express | KR-UPS-Express(加急) | **KR-UPS-익스프레스(긴급)** | **UPS 한국** |
| 66 | `KRUPSSFLD` | KRUPSSFLD | 韩国UPS三方A蓝单 | **한국 UPS 3자A 블루라벨** | **UPS 한국** |
| 67 | `KRUPSSFQD` | KRUPSSFQD | 韩国UPS三方A红单 | **한국 UPS 3자A 레드라벨** | **UPS 한국** |
| 68 | `KRUPSWE` | KR-UPS-Expedited | KR-UPS-Expedited(蓝单) | **KR-UPS-익스페디티드(블루라벨)** | **UPS 한국** |
| 69 | `KRUPSWWEF` | KR-UPS-WWEF | KR-UPS-WWEF(托) | **KR-UPS-WWEF(팔레트)** | **UPS 한국** |
| 70 | `KRVNAIR` | KRVNAIR | KR-VN空运快件特货 | 한국→베트남 항공 특급 특수화물 | |
| 71 | `KRVNEXP` | KRVNEXP | KR-VN空运快件普货 | 한국→베트남 항공 특급 일반화물 | |
| 72 | `KXVNZBFTL` | KXVNZBFTL | KX散拼陆运正报FTL | KX 혼재 육로 정식신고 FTL | |
| 73 | `KXVNZBLTL` | KXVNZBLTL | KX整车陆运正报LTL | KX 전용차 육로 정식신고 LTL | |
| 74 | `LAXAIR` | LAXAIR | cargo洛杉矶仓位LAX | 카고 로스앤젤레스 LAX | |
| 75 | `LCLKR` | KRLCL | 韩国海运拼箱M3 | 한국 해운 LCL(혼재) M3 | 도착항. 상하이→한국 3일 |
| 76 | `PHNVN` | KH-VNA | KH-VN陆运快件A | 캄보디아→베트남 육로 특급 A | |
| 77 | `PK0002` | ECCF-TOP-BC-LAX | 美国ECCF-TOP清关BC-LAX | 미국 ECCF-TOP 통관 BC-LAX | |
| 78 | `PK0003` | 韩国-FEDEX5374-FICP | 韩国-FEDEX5374-9220DDU-FICP | 한국 FedEx 5374-9220 DDU-FICP | |
| 79 | `PK0004` | KR-FEDEX5374-FICP-QT | 韩国-FEDEX5374-FICP-QT | 한국 FedEx 5374-FICP-QT | |
| 80 | `PK0005` | KREXPRESSKE | 韩国空运快件BC-KE | 한국 항공 특급 BC-KE | |
| 81 | `PK0006` | KRLTSEA | 韩国CNK海运电商-企业 | 한국 CNK 해운 이커머스-기업 | 문전. 상하이→한국 3일 |
| 82 | `PK0007` | KREXPRESSMU | 韩国空运快件BC-MU | 한국 항공 특급 BC-MU | |
| 83 | `PK0008` | USECCF-BC-JFK | 美国ECCF专线BC-JFK | 미국 ECCF 전용편 BC-JFK | |
| 84 | `PK0009` | USECCFTOPBC-JFK | 美国ECCF-TOP清关BC-JFK | 미국 ECCF-TOP 통관 BC-JFK | |
| 85 | `PK0010` | FEDEX5374-IP | 韩国FEDEX5374-6054DDU-IP | 한국 FedEx 5374-6054 DDU-IP | |
| 86 | `PK0011` | FEDEX5374-IE | 韩国FEDEX5374-6054DDU-IE | 한국 FedEx 5374-6054 DDU-IE | |
| 87 | `PK0012` | 韩国FEDEX4425-FICP-US | 韩国FEDEX4425-1306DDP-FICP-US | 한국 FedEx 4425-1306 DDP-FICP-US | |
| 88 | `PK0013` | UPS-T6000LD | UPS-T价6000蓝单 | UPS-T가격6000 블루라벨 | |
| 89 | `PK0014` | UPS-T6000HD | UPS-T价6000红单 | UPS-T가격6000 레드라벨 | |
| 90 | `PK0015` | JSDHL-C | 江苏DHL-C价 | 장쑤성 DHL C가격 | |
| 91 | `PK0018` | KRFEDEX6684-IP2 | 韩国FEDEX6684-3353DDU-IP2 | 한국 FedEx 6684-3353 DDU-IP2 | |
| 92 | `PK0019` | KRFEDEX6684-IE2 | 韩国FEDEX6684-3353DDU-IE2 | 한국 FedEx 6684-3353 DDU-IE2 | |
| 93 | `PK0020` | KRFEDEX6684-IP | 韩国FEDEX6684-3011DDP-IP3 | 한국 FedEx 6684-3011 DDP-IP3 | |
| 94 | `PK0021` | KRFEDEX1IE3 | 韩国FEDEX6684-3011DDP-IE3 | 한국 FedEx 6684-3011 DDP-IE3 | |
| 95 | `PK0023` | 韩国FEDEX6684-FICP3-US | 韩国FDX6684-3011DDP-FICP-US | 한국 FDX 6684-3011 DDP-FICP-US | |
| 96 | `PK0024` | UPS-TP | UPS-托盘6000 | UPS 팔레트 6000 | |
| 97 | `PK0025` | KRFEDEX1IE4 | 韩国FEDEX6684-1177DDP-IE4 | 한국 FedEx 6684-1177 DDP-IE4 | |
| 98 | `PK0026` | KRFEDEX004 | 韩国FEDEX6684-1177DDP-IP4 | 한국 FedEx 6684-1177 DDP-IP4 | |
| 99 | `PK0027` | VN-CNEXPDDP | VN-CN空运快件-DDP包税 | 베트남→중국 항공 특급 DDP 관세포함 | |
| 100 | `PK0028` | FEDEX3119-IE | 韩国FEDEX3119-6054DDU-IE | 한국 FedEx 3119-6054 DDU-IE | |
| 101 | `PK0030` | UPS-QQ6000HD | UPS-全区6000红单 | UPS 전지역 6000 레드라벨 | |
| 102 | `PK0031` | UPS-QQ6000LD | UPS-全区6000蓝单 | UPS 전지역 6000 블루라벨 | |
| 103 | `PK0032` | KR-UPS-WWEF(托)-DDP | 韩国-UPS-WWEF(托)-DDP | **한국-UPS-WWEF(팔레트)-DDP** | **UPS 한국** |
| 104 | `PK0033` | KR-UPS-Express-DDP | 韩国-UPS-Express(加急)-DDP | **한국-UPS-익스프레스(긴급)-DDP** | **UPS 한국** |
| 105 | `PK0034` | KR-UPS-Expedited-DDP | 韩国-UPS-Expedited(蓝单)-DDP | **한국-UPS-익스페디티드(블루라벨)-DDP** | **UPS 한국** |
| 106 | `PK0035` | 韩国-UPS-Saver(红单)-DDP | 韩国-UPS-Saver(红单)-DDP | **한국-UPS-세이버(레드라벨)-DDP** | **UPS 한국** |
| 107 | `PK0037` | KRBJHZX | 韩国搬家货专线 | 한국 이사화물 전용편 | |
| 108 | `PK0038` | VNUPSCS | VNUPS测试 | 베트남 UPS 테스트 | |
| 109 | `PK0039` | Fedex-AL | Fedex-阿里巴巴 | FedEx-알리바바 | |
| 110 | `PK0040` | QEP-YD-JJ | 强焱-印度-加急 | 강염(强焱)-인도-긴급 | |
| 111 | `PK0041` | QEP-Fedex5000-U-IP | 强焱-联邦5000-U-IP | 강염-FedEx5000-U-IP | |
| 112 | `PK0042` | QEP-SH-Fedex-P-IE | 强焱-沪-联邦-P-IE | 강염-상하이-FedEx-P-IE | |
| 113 | `PK0043` | KRHANJINSEA | 韩国韩进海运电商 | 한국 한진 해운 이커머스 | 문전. 상하이→한국 3일 |
| 114 | `PK0044` | KHCNAPDDP | KH-CN空运快件AP-DDP | 캄보디아→중국 항공 특급 AP-DDP | |
| 115 | `PK0045` | VN-FEDEX-IE | VN-FEDEX-IE | 베트남 FedEx-IE(국제이코노미) | |
| 116 | `PK0046` | VN-FEDEX-IP | VN-FEDEX-IP | 베트남 FedEx-IP(국제우선) | |
| 117 | `PK0047` | QEP-Fedex5000-W-IP | 强焱-联邦5000-W-IP | 강염-FedEx5000-W-IP | |
| 118 | `PK0048` | SFTH-MJX | 顺丰特惠-美加线 | SF익스프레스 특가 미국/캐나다 노선 | |
| 119 | `PK0049` | KRUPS-DDP-SaverJ4441J | 韩国UPS-DDP-Saver-J4441J | **한국 UPS-DDP-세이버-J4441J** | **UPS 한국** |
| 120 | `PK0051` | KRUPS-DDU-Saver-J4441J | 韩国UPS-DDU-Saver-J4441J | **한국 UPS-DDU-세이버-J4441J** | **UPS 한국** |
| 121 | `PK0053` | QEP-YD-经济 | 强焱-印度-经济 | 강염-인도-경제편 | |
| 122 | `PK0054` | QEP-ST-YX | 强焱-沙特-优先 | 강염-사우디아라비아-우선 | |
| 123 | `PK0055` | FedEx Economy2 | 美国专线FedEx Economy经济 | 미국 전용편 FedEx 이코노미 | 문전. 5-11일 |
| 124 | `PK0056` | FedExGround2 | 美国专线FedExGround经济 | 미국 전용편 FedEx 그라운드 경제편 | 문전. 3-10일 |
| 125 | `PK0057` | VN-UPSHDDDP | VN-UPS红单DDP | 베트남 UPS 레드라벨 DDP | |
| 126 | `PK0058` | VNQG | 越南清关 | 베트남 통관 | |
| 127 | `PK0059` | KREXPRESSZE | 韩国空运快件BC-ZE | 한국 항공 특급 BC-ZE | |
| 128 | `PK0060` | HGHYSQBS | 韩国海运双清包税 | 한국 해운 쌍청(통관+배송) 관세포함 | 문전. 상하이→한국 3일 |
| 129 | `PNHCN` | KH-CNLYEXP | KH-CN陆运快件A | 캄보디아→중국 육로 특급 A | |
| 130 | `PNHCNB` | PNHCNB | KH-CN陆运慢件B | 캄보디아→중국 육로 일반 B | |
| 131 | `PNHCNC` | PNHCNC | KH-CN陆运慢件C | 캄보디아→중국 육로 일반 C | |
| 132 | `PNHCNEXP` | KHCNEXPAP | KH-CN空运快件AP | 캄보디아→중국 항공 특급 AP | |
| 133 | `PNHVNC` | PNHVNC | KH-VN陆运慢件C | 캄보디아→베트남 육로 일반 C | |
| 134 | `PXBGYW` | PXBGYW | 出口报关服务 | 수출신고 서비스 | |
| 135 | `SGNAIR` | VNAIR | 越南AP特快 | 베트남 AP 특급 | 문전. 1일 |
| 136 | `UPS008LKL` | UPSLKL | 深圳UPS红单LKL | 선전 UPS 레드라벨 LKL | |
| 137 | `US002` | FEDEXGROUND | 美国专线FedExGround | 미국 전용편 FedEx 그라운드 | 문전. 3-10일 |
| 138 | `US2DAY` | FEDFX2DAY-HB | 美国专线FedEx2Day换标 | 미국 전용편 FedEx 2일 라벨교체 | 문전. 2-3일 |
| 139 | `USAJYHY` | SAJYHY | 集运美国海运专线 | 미국 해운 집하운송 전용편 | |
| 140 | `USAJYKY` | USAJYKY | 集运美国空运专线 | 미국 항공 집하운송 전용편 | |
| 141 | `USECCF` | USECCF | 美国ECCF清关C | 미국 ECCF 통관 C | |
| 142 | `USECCFIBC` | USECCFZXBC-LAX | 美国ECCF专线BC-LAX | 미국 ECCF 전용편 BC-LAX | |
| 143 | `USECCFTOPC` | USECCFTOP | 美国ECCF-TOP清关C | 미국 ECCF-TOP 통관 C | |
| 144 | `USFDX4425` | KRFDX4425-FICP-QT | 韩国FDX4425-1306DDU-FICP-QT | 한국 FDX 4425-1306 DDU-FICP-QT | |
| 145 | `USFDX6684` | KRFDX6684-FICP-QT | 韩国FDX6684-1306FICP-QT | 한국 FDX 6684-1306 FICP-QT | |
| 146 | `USUPS` | UPS-CNK-DDU | 韩国UPS-CNK-DDU | **한국 UPS-CNK-DDU(관세미포함)** | **UPS 한국** |
| 147 | `USY2` | USY2ZX | 美国Y2拼货到门 | 미국 Y2 혼재화물 문전배송 | 문전. 4-5일 |
| 148 | `USY2ZT` | USY2ZT | 美国Y2拼货自提 | 미국 Y2 혼재화물 자체픽업 | |
| 149 | `VJJPEXP` | VNJPEXP | VN-JP专线TVE | 베트남→일본 전용편 TVE | 문전. 5-7일 |
| 150 | `VN-DLXB` | VN-DLXB | 越南电商小包-代理 | 베트남 이커머스 소포 대리 | |
| 151 | `VN-THZX` | VN-THWG | VN-泰国专线 | 베트남→태국 전용편 | 문전. 5-7일 |
| 152 | `VNA` | VNAEXP | 越南A类三日达 | 베트남 A등급 3일 도착 | 문전. 3-4일 |
| 153 | `VNAPTKJJ` | VNAPTKJJ | 越南AP特快加急 | 베트남 AP 특급 긴급 | 문전. 1일 |
| 154 | `VNAPZF` | VNAPSRD | 越南AP三日达 | 베트남 AP 3일 도착 | 문전. 2-3일 |
| 155 | `VNBGDEXP` | VN-BGD | VN-BD空运快件 | 베트남→방글라데시 항공 특급 | |
| 156 | `VNBTS` | VNTS | 越南B类转关TS | 베트남 B등급 환적 TS | |
| 157 | `VNCFZBCP` | VNCFZBCP | 越南E类面料专线 | 베트남 E등급 원단 전용편 | |
| 158 | `VNCNLYB` | VN-CNLYB | VN-CN陆运快件B | 베트남→중국 육로 특급 B | |
| 159 | `VNCNLYC` | VNCNLYC | VN-CN陆运慢件C | 베트남→중국 육로 일반 C | |
| 160 | `VND` | VND | 越南D类物流 | 베트남 D등급 물류 | |
| 161 | `VNDHL` | VNDHL | VN-DHL | 베트남 DHL | |
| 162 | `VNFEDEX002` | VNFEDEX002 | VN-FEDEX-IP002 | 베트남 FedEx-IP002 | |
| 163 | `VNFTL` | VNFTL | 越南FTL整车陆运 | 베트남 FTL 전용차 육로운송 | |
| 164 | `VNGNKY` | VNGNKY | VN国内快运 | 베트남 국내 특급 | |
| 165 | `VNHANDHLHY` | VNHANDHL5800 | VN-河内DHL5800 | 베트남-하노이 DHL5800 | |
| 166 | `VNHANUPSHY` | VNHANUPSHD | VN-河内UPS红单 | 베트남-하노이 UPS 레드라벨 | |
| 167 | `VNIDNEXP` | VNIDNEXP | VN-ID空运快件 | 베트남→인도네시아 항공 특급 | |
| 168 | `VNJY` | VNJY | 越南LTL拼车陆运1:300 | 베트남 LTL 혼재차 육로 1:300 | |
| 169 | `VNJYDSDM` | VNJYDSDM | 集运越南B类SGN | 베트남 B등급 SGN 집하운송 | |
| 170 | `VNJYTK` | VNJYTK | 集运越南B类HAN | 베트남 B등급 HAN 집하운송 | |
| 171 | `VNKRAIR` | VNKRAIR | VN-KR空运快件 | 베트남→한국 항공 특급 | |
| 172 | `VNKRSEA` | VNKRSEA | VN-KR海运 | 베트남→한국 해운 | |
| 173 | `VNKYDSXB` | VNKYDSXB | 越南空运电商小包 | 베트남 항공 이커머스 소포 | |
| 174 | `VNLAOA` | VN-LAOA | VN-LA陆运快件 | 베트남→라오스 육로 특급 | |
| 175 | `VNLTL` | VNLTL | 越南LTL拼车陆运1:230 | 베트남 LTL 혼재차 육로 1:230 | |
| 176 | `VNOCS` | VNJPOCS | VN-JP专线OCS | 베트남→일본 전용편 OCS | |
| 177 | `VNPYFY` | PYFY | VN越南偏远费用 | 베트남 오지할증 | |
| 178 | `VNSF001` | VNSFEXP | VN-顺丰 | 베트남 SF익스프레스(순풍) | |
| 179 | `VNUPSHB` | VNUPSHB-TP | VN-河内UPS托盘 | 베트남-하노이 UPS 팔레트 | |
| 180 | `VNUPSHD` | UPS EXPORT-SS | VN-UPS红单SS | 베트남 UPS 레드라벨 SS | |
| 181 | `VNUPSHY` | VNUPSHDA-HD | VN-河内UPS蓝单 | 베트남-하노이 UPS 블루라벨 | |
| 182 | `VNUPSLB` | VNUPSLDB-hzm | VN-胡志明UPS-蓝单 | 베트남-호치민 UPS 블루라벨 | |
| 183 | `VNUPSLD` | VNUPSExport-SS | VN-UPS蓝单SS | 베트남 UPS 블루라벨 SS | |
| 184 | `VNUPSLDHY` | VNUPSLDA-HD | VN-胡志明UPS-红单 | 베트남-호치민 UPS 레드라벨 | |
| 185 | `VNUPSTU` | VNUPSTU-SS | VN-UPS货运SS | 베트남 UPS 화물운송 SS | |
| 186 | `VNUSA` | VNUSA | VN-US空运快件 | 베트남→미국 항공 특급 | |
| 187 | `WHEMSDB` | WHEMSDB | 集运威海EMS海运 | 웨이하이 EMS 해운 집하운송 | |
| 188 | `WHJYEMS` | WHJYEMS | 集运威海EMS空运 | 웨이하이 EMS 항공 집하운송 | |
| 189 | `WHKRKYDS` | WHKRKYDS | 韩国空运电商GBX | 한국 항공 이커머스 GBX | 문전. 3일 |
| 190 | `WMCP` | WMCP | 未知销售产品 | 미확인 판매 상품 | |

---

## 약어 범례

| 약어 | 의미 |
|:-----|:-----|
| DDP | Delivered Duty Paid (관세포함 배송) |
| DDU | Delivered Duty Unpaid (관세미포함 배송) |
| IP | International Priority (국제 우선배송) |
| IE | International Economy (국제 이코노미) |
| FICP | FedEx International Connect Plus |
| WWEF | UPS Worldwide Express Freight (팔레트 화물) |
| FCL | Full Container Load (전용 컨테이너) |
| LCL | Less than Container Load (혼재 컨테이너) |
| FTL | Full Truck Load (전용 차량) |
| LTL | Less than Truck Load (혼재 차량) |
| BC | 브로커 채널 |
| SS | Scheduled Service |
| 쌍청(双清) | 수출입 통관 + 관세 일괄 처리 |

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:-----|
| 2026-06-26 | Jaison (JSJung 제안) | getshippingmethod 실측 검증 — 190건 전체 목록 저장. Issue #119 보고 완료. |
| 2026-06-26 | Jaison | 한국어 번역 컬럼 추가 — cnname 전량 번역 + 약어 범례 추가 (JSJung 요청) |
