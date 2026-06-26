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

| code | enname | cnname | 비고 |
|:-----|:-------|:-------|:-----|
| `FXUPS` | KR-UPS-Saver | KR-UPS-Saver(红) | |
| `KEUPS008` | KEUPS008 | 韩国UPS-SM-DDU | |
| `KEUPSSMDDP` | KEUPSSMDDP | 韩国UPS-SM-DDP | |
| `KRUPSDDP` | KRUPSDDP | 韩国UPS-CNK-DDP | |
| `KRUPSEXP` | KR-UPS-Express | KR-UPS-Express(加急) | |
| `KRUPSSFLD` | KRUPSSFLD | 韩国UPS三方A蓝单 | |
| `KRUPSSFQD` | KRUPSSFQD | 韩国UPS三方A红单 | |
| `KRUPSWE` | KR-UPS-Expedited | KR-UPS-Expedited(蓝单) | |
| `KRUPSWWEF` | KR-UPS-WWEF | KR-UPS-WWEF(托) | |
| `PK0032` | KR-UPS-WWEF(托)-DDP | 韩国-UPS-WWEF(托)-DDP | |
| `PK0033` | KR-UPS-Express-DDP | 韩国-UPS-Express(加急)-DDP | |
| `PK0034` | KR-UPS-Expedited-DDP | 韩国-UPS-Expedited(蓝单)-DDP | |
| `PK0035` | 韩国-UPS-Saver(红单)-DDP | 韩国-UPS-Saver(红单)-DDP | |
| `PK0049` | KRUPS-DDP-SaverJ4441J | 韩国UPS-DDP-Saver-J4441J | |
| `PK0051` | KRUPS-DDU-Saver-J4441J | 韩国UPS-DDU-Saver-J4441J | |
| `USUPS` | UPS-CNK-DDU | 韩国UPS-CNK-DDU | |

---

## 전체 운송방식 목록 (190건)

| # | code | enname | cnname | note (요약) |
|:-:|:-----|:-------|:-------|:------------|
| 1 | `ADLYAR` | ADLYKR | 集运澳洲空运专线 | |
| 2 | `ANB` | VNBEXP | 越南B类经济 | 到门. 上海-越南4-5天 |
| 3 | `APERD` | APERD | 越南AP-2日达 | 到门. 2天. 航空 D234567 |
| 4 | `APSRDDS` | APSRDDS | 越南陆运电商小包 | |
| 5 | `AUZXHY` | AUZXHY | 集运澳洲海运专线 | |
| 6 | `B1VN` | B1VN | 越南B1陆运 | |
| 7 | `BQGKR` | BQGKR | 韩国海运DDP包税 | |
| 8 | `CGKAIR` | CGKAIR | cargo雅加达仓位CGK | |
| 9 | `CHPHN` | CHPHN | cargo柬埔寨仓位PNH | |
| 10 | `CHVN` | CHVN | cargo越南仓位SGN/HAN | |
| 11 | `CIFSEA` | CIFSEA | 韩国海运准时达BC | 到港. 上海→韩国3天 |
| 12 | `CKDCZ` | CKDCZ | 仓库代操作 | |
| 13 | `CNK0010` | MJLKYZX | cargo孟加拉仓位DAC | |
| 14 | `CVN` | CVN | 越南C物流 | 到门. 上海-越南6-8天 |
| 15 | `DJPZ` | DJPZ | 柬埔寨D类陆运特货 | |
| 16 | `DPFW` | DPFW | 代取代派 | |
| 17 | `FCLKR` | FCLKR | 韩国FCL整柜 | |
| 18 | `FEDEX2DAY3` | FEDEX2DAY-ZD | 美国专线FedEx2Day自打 | 到门. 3-5日 |
| 19 | `FEDEX2DAY4` | FEDEX2DAY-MD | 美国FedEx2Day末端 | |
| 20 | `FEDEXGE` | FedExGroundE | 美国专线FedExEconomy | 到门. 5-11天 |
| 21 | `FXUPS` | KR-UPS-Saver | KR-UPS-Saver(红) | **UPS 한국** |
| 22 | `HANCARRY` | HANCARRY | 手提HANDCARRY | |
| 23 | `HANCH` | VN-CNLYA | VN-CN陆运快件A | |
| 24 | `HANPNHB` | HANPNHB | VN-KH陆运慢件B | |
| 25 | `HCMCN` | VN-CNEXP | VN-CN空运快件 | |
| 26 | `HCMPHNA` | VN-KHEXPA | VN-KH陆运快件A | |
| 27 | `HYDSKR` | HYDSKR | 韩国CNK海运电商BC | |
| 28 | `HYKJCNK` | HYKJCNK | 韩国海运快件 | 到门. 上海→韩国3天 |
| 29 | `HYPUDM` | HYPUDM | 韩国海运准时达 | 到门. 上海→韩国3天 |
| 30 | `HYTS` | HYTS | 韩国海运转关TS | UPS,FEDEX,DHL,航空 |
| 31 | `HZMUPSHY` | HZMUPSHY | VN-胡志明UPS-托盘 | |
| 32 | `JFKAIR` | JFKAIR | cargo纽约仓位JFK | |
| 33 | `JPZA` | JPZA | 柬埔寨A类四日达 | 到门. 5-6天 |
| 34 | `JPZAPJJ` | JPZAPJJ | 柬埔寨AP经济 | 到门. 4-5天 |
| 35 | `JPZAPTKJJ` | JPZAPTKJJ | 柬埔寨AP特快加急 | |
| 36 | `JPZBLK` | JPZBLK | 柬埔寨B类陆加空 | 到门. 3-4天 |
| 37 | `JPZCWL` | JPZCWL | 柬埔寨C类陆运 | 到门. 9-11天 |
| 38 | `JPZDSLY` | JPZDSLY | 集运柬埔寨C类 | |
| 39 | `JPZFTL` | JPZFTL | 柬埔寨陆运FTL | |
| 40 | `JPZLTL` | JPZLTL | 柬埔寨陆运LTL | |
| 41 | `JPZPHKY` | JPZPHKY | 集运柬埔寨AP经济 | |
| 42 | `JPZPY` | JPZPY | 柬埔寨偏远 | |
| 43 | `JPZTBKY` | JPZTBKY | 集运柬埔寨AP特快 | |
| 44 | `JPZZX` | JPZAP | 柬埔寨AP特快 | 到门. 今发明至 |
| 45 | `JYDYDS` | JYDYDS | 集运代运 | |
| 46 | `JYTH` | JYTH | 集运退货 | |
| 47 | `KEUPS008` | KEUPS008 | 韩国UPS-SM-DDU | **UPS 한국** |
| 48 | `KEUPSSMDDP` | KEUPSSMDDP | 韩国UPS-SM-DDP | **UPS 한국** |
| 49 | `KR-CNDG` | KR-CNDG | KR-CN代工 | |
| 50 | `KRAIRLOTTE` | KRAIR | 韩国空运电商 | 到门. 3天 |
| 51 | `KRCJSEA` | KRCJSEA | 韩国CNK海运电商A-集运 | 到门. 上海→韩国3天 |
| 52 | `KRCN` | KRCN | KR-CN海运普货 | |
| 53 | `KREXP` | KREXP | 韩国海运快件BC | 到门. 金浦自提 |
| 54 | `KREYB-A` | KREYB-A | 韩国E邮宝A | 最大:长+宽+高≤90CM |
| 55 | `KRFDX01FIC` | 韩国FEDEX4425-FICP | 韩国FEDEX4425-1306DDP-FICP | |
| 56 | `KRFEDEX001` | KRFEDEX001 | 韩国FEDEX6684-3353DDP-IP | |
| 57 | `KRFEDEX003` | KRFEDEX003 | 韩国FEDEX6256-IP | |
| 58 | `KRFEDEX1IE` | KRFEDEX1IE | 韩国FEDEX6684-3353DDP-IE | |
| 59 | `KRFEDEX3IE` | KRFEDEX3IE | 韩国FEDEX6256-IE | |
| 60 | `KRFEX02FIC` | 韩国FEDEX6684-FICP-US | 韩国FDX6684-3353DDP-FICP-US | |
| 61 | `KRLCL01` | KRDDPBC | 韩国海运DDP包税BC | |
| 62 | `KRLOTTESEA` | KRSEA | 韩国海运电商 | 到门. 上海→韩国3天 |
| 63 | `KRPY` | KRPY | 韩国偏远 | |
| 64 | `KRUPSDDP` | KRUPSDDP | 韩国UPS-CNK-DDP | **UPS 한국** |
| 65 | `KRUPSEXP` | KR-UPS-Express | KR-UPS-Express(加急) | **UPS 한국** |
| 66 | `KRUPSSFLD` | KRUPSSFLD | 韩国UPS三方A蓝单 | **UPS 한국** |
| 67 | `KRUPSSFQD` | KRUPSSFQD | 韩国UPS三方A红单 | **UPS 한국** |
| 68 | `KRUPSWE` | KR-UPS-Expedited | KR-UPS-Expedited(蓝单) | **UPS 한국** |
| 69 | `KRUPSWWEF` | KR-UPS-WWEF | KR-UPS-WWEF(托) | **UPS 한국** |
| 70 | `KRVNAIR` | KRVNAIR | KR-VN空运快件特货 | |
| 71 | `KRVNEXP` | KRVNEXP | KR-VN空运快件普货 | |
| 72 | `KXVNZBFTL` | KXVNZBFTL | KX散拼陆运正报FTL | |
| 73 | `KXVNZBLTL` | KXVNZBLTL | KX整车陆运正报LTL | |
| 74 | `LAXAIR` | LAXAIR | cargo洛杉矶仓位LAX | |
| 75 | `LCLKR` | KRLCL | 韩国海运拼箱M3 | 到港. 上海→韩国3天 |
| 76 | `PHNVN` | KH-VNA | KH-VN陆运快件A | |
| 77 | `PK0002` | ECCF-TOP-BC-LAX | 美国ECCF-TOP清关BC-LAX | |
| 78 | `PK0003` | 韩国-FEDEX5374-FICP | 韩国-FEDEX5374-9220DDU-FICP | |
| 79 | `PK0004` | KR-FEDEX5374-FICP-QT | 韩国-FEDEX5374-FICP-QT | |
| 80 | `PK0005` | KREXPRESSKE | 韩国空运快件BC-KE | |
| 81 | `PK0006` | KRLTSEA | 韩国CNK海运电商-企업 | 到门. 上海→韩国3天 |
| 82 | `PK0007` | KREXPRESSMU | 韩国空运快件BC-MU | |
| 83 | `PK0008` | USECCF-BC-JFK | 美国ECCF专线BC-JFK | |
| 84 | `PK0009` | USECCFTOPBC-JFK | 美国ECCF-TOP清关BC-JFK | |
| 85 | `PK0010` | FEDEX5374-IP | 韩国FEDEX5374-6054DDU-IP | |
| 86 | `PK0011` | FEDEX5374-IE | 韩国FEDEX5374-6054DDU-IE | |
| 87 | `PK0012` | 韩国FEDEX4425-FICP-US | 韩国FEDEX4425-1306DDP-FICP-US | |
| 88 | `PK0013` | UPS-T6000LD | UPS-T价6000蓝单 | |
| 89 | `PK0014` | UPS-T6000HD | UPS-T价6000红单 | |
| 90 | `PK0015` | JSDHL-C | 江苏DHL-C价 | |
| 91 | `PK0018` | KRFEDEX6684-IP2 | 韩国FEDEX6684-3353DDU-IP2 | |
| 92 | `PK0019` | KRFEDEX6684-IE2 | 韩国FEDEX6684-3353DDU-IE2 | |
| 93 | `PK0020` | KRFEDEX6684-IP | 韩国FEDEX6684-3011DDP-IP3 | |
| 94 | `PK0021` | KRFEDEX1IE3 | 韩国FEDEX6684-3011DDP-IE3 | |
| 95 | `PK0023` | 韩国FEDEX6684-FICP3-US | 韩国FDX6684-3011DDP-FICP-US | |
| 96 | `PK0024` | UPS-TP | UPS-托盘6000 | |
| 97 | `PK0025` | KRFEDEX1IE4 | 韩国FEDEX6684-1177DDP-IE4 | |
| 98 | `PK0026` | KRFEDEX004 | 韩国FEDEX6684-1177DDP-IP4 | |
| 99 | `PK0027` | VN-CNEXPDDP | VN-CN空运快件-DDP包税 | |
| 100 | `PK0028` | FEDEX3119-IE | 韩国FEDEX3119-6054DDU-IE | |
| 101 | `PK0030` | UPS-QQ6000HD | UPS-全区6000红单 | |
| 102 | `PK0031` | UPS-QQ6000LD | UPS-全区6000蓝单 | |
| 103 | `PK0032` | KR-UPS-WWEF(托)-DDP | 韩国-UPS-WWEF(托)-DDP | **UPS 한국** |
| 104 | `PK0033` | KR-UPS-Express-DDP | 韩国-UPS-Express(加急)-DDP | **UPS 한국** |
| 105 | `PK0034` | KR-UPS-Expedited-DDP | 韩国-UPS-Expedited(蓝单)-DDP | **UPS 한국** |
| 106 | `PK0035` | 韩国-UPS-Saver(红单)-DDP | 韩国-UPS-Saver(红单)-DDP | **UPS 한국** |
| 107 | `PK0037` | KRBJHZX | 韩国搬家货专线 | |
| 108 | `PK0038` | VNUPSCS | VNUPS测试 | |
| 109 | `PK0039` | Fedex-AL | Fedex-阿里巴巴 | |
| 110 | `PK0040` | QEP-YD-JJ | 强焱-印度-加急 | |
| 111 | `PK0041` | QEP-Fedex5000-U-IP | 强焱-联邦5000-U-IP | |
| 112 | `PK0042` | QEP-SH-Fedex-P-IE | 强焱-沪-联邦-P-IE | |
| 113 | `PK0043` | KRHANJINSEA | 韩国韩进海运电商 | 到门. 上海→韩国3天 |
| 114 | `PK0044` | KHCNAPDDP | KH-CN空运快件AP-DDP | |
| 115 | `PK0045` | VN-FEDEX-IE | VN-FEDEX-IE | |
| 116 | `PK0046` | VN-FEDEX-IP | VN-FEDEX-IP | |
| 117 | `PK0047` | QEP-Fedex5000-W-IP | 强焱-联邦5000-W-IP | |
| 118 | `PK0048` | SFTH-MJX | 顺丰特惠-美加线 | |
| 119 | `PK0049` | KRUPS-DDP-SaverJ4441J | 韩国UPS-DDP-Saver-J4441J | **UPS 한국** |
| 120 | `PK0051` | KRUPS-DDU-Saver-J4441J | 韩国UPS-DDU-Saver-J4441J | **UPS 한국** |
| 121 | `PK0053` | QEP-YD-经济 | 强焱-印度-经济 | |
| 122 | `PK0054` | QEP-ST-YX | 强焱-沙特-优先 | |
| 123 | `PK0055` | FedEx Economy2 | 美国专线FedEx Economy经济 | 到门. 5-11天 |
| 124 | `PK0056` | FedExGround2 | 美国专线FedExGround经济 | 到门. 3-10天 |
| 125 | `PK0057` | VN-UPSHDDDP | VN-UPS红单DDP | |
| 126 | `PK0058` | VNQG | 越南清关 | |
| 127 | `PK0059` | KREXPRESSZE | 韩国空运快件BC-ZE | |
| 128 | `PK0060` | HGHYSQBS | 韩国海运双清包税 | 到门. 上海→韩国3天 |
| 129 | `PNHCN` | KH-CNLYEXP | KH-CN陆运快件A | |
| 130 | `PNHCNB` | PNHCNB | KH-CN陆运慢件B | |
| 131 | `PNHCNC` | PNHCNC | KH-CN陆运慢件C | |
| 132 | `PNHCNEXP` | KHCNEXPAP | KH-CN空运快件AP | |
| 133 | `PNHVNC` | PNHVNC | KH-VN陆运慢件C | |
| 134 | `PXBGYW` | PXBGYW | 出口报关服务 | |
| 135 | `SGNAIR` | VNAIR | 越南AP特快 | 到门. 1天 |
| 136 | `UPS008LKL` | UPSLKL | 深圳UPS红单LKL | |
| 137 | `US002` | FEDEXGROUND | 美国专线FedExGround | 到门. 3-10天 |
| 138 | `US2DAY` | FEDFX2DAY-HB | 美国专线FedEx2Day换标 | 到门. 2-3日 |
| 139 | `USAJYHY` | SAJYHY | 集运美国海运专线 | |
| 140 | `USAJYKY` | USAJYKY | 集运美国空运专线 | |
| 141 | `USECCF` | USECCF | 美国ECCF清关C | |
| 142 | `USECCFIBC` | USECCFZXBC-LAX | 美国ECCF专线BC-LAX | |
| 143 | `USECCFTOPC` | USECCFTOP | 美国ECCF-TOP清关C | |
| 144 | `USFDX4425` | KRFDX4425-FICP-QT | 韩国FDX4425-1306DDU-FICP-QT | |
| 145 | `USFDX6684` | KRFDX6684-FICP-QT | 韩国FDX6684-1306FICP-QT | |
| 146 | `USUPS` | UPS-CNK-DDU | 韩国UPS-CNK-DDU | **UPS 한국** |
| 147 | `USY2` | USY2ZX | 美国Y2拼货到门 | 到门. 4-5天 |
| 148 | `USY2ZT` | USY2ZT | 美国Y2拼货自提 | |
| 149 | `VJJPEXP` | VNJPEXP | VN-JP专线TVE | 到门. 5-7天 |
| 150 | `VN-DLXB` | VN-DLXB | 越南电商小包-代理 | |
| 151 | `VN-THZX` | VN-THWG | VN-泰国专线 | 到门. 5-7天 |
| 152 | `VNA` | VNAEXP | 越南A类三日达 | 到门. 3-4天 |
| 153 | `VNAPTKJJ` | VNAPTKJJ | 越南AP特快加急 | 到门. 1天 |
| 154 | `VNAPZF` | VNAPSRD | 越南AP三日达 | 到门. 2-3天 |
| 155 | `VNBGDEXP` | VN-BGD | VN-BD空运快件 | |
| 156 | `VNBTS` | VNTS | 越南B类转关TS | |
| 157 | `VNCFZBCP` | VNCFZBCP | 越南E类面料专线 | |
| 158 | `VNCNLYB` | VN-CNLYB | VN-CN陆运快件B | |
| 159 | `VNCNLYC` | VNCNLYC | VN-CN陆运慢件C | |
| 160 | `VND` | VND | 越南D类物流 | |
| 161 | `VNDHL` | VNDHL | VN-DHL | |
| 162 | `VNFEDEX002` | VNFEDEX002 | VN-FEDEX-IP002 | |
| 163 | `VNFTL` | VNFTL | 越南FTL整车陆运 | |
| 164 | `VNGNKY` | VNGNKY | VN国内快运 | |
| 165 | `VNHANDHLHY` | VNHANDHL5800 | VN-河内DHL5800 | |
| 166 | `VNHANUPSHY` | VNHANUPSHD | VN-河内UPS红单 | |
| 167 | `VNIDNEXP` | VNIDNEXP | VN-ID空运快件 | |
| 168 | `VNJY` | VNJY | 越南LTL拼车陆运1:300 | |
| 169 | `VNJYDSDM` | VNJYDSDM | 集运越南B类SGN | |
| 170 | `VNJYTK` | VNJYTK | 集运越南B类HAN | |
| 171 | `VNKRAIR` | VNKRAIR | VN-KR空运快件 | |
| 172 | `VNKRSEA` | VNKRSEA | VN-KR海运 | |
| 173 | `VNKYDSXB` | VNKYDSXB | 越南空运电商小包 | |
| 174 | `VNLAOA` | VN-LAOA | VN-LA陆运快件 | |
| 175 | `VNLTL` | VNLTL | 越南LTL拼车陆运1:230 | |
| 176 | `VNOCS` | VNJPOCS | VN-JP专线OCS | |
| 177 | `VNPYFY` | PYFY | VN越南偏远费用 | |
| 178 | `VNSF001` | VNSFEXP | VN-顺丰 | |
| 179 | `VNUPSHB` | VNUPSHB-TP | VN-河内UPS托盘 | |
| 180 | `VNUPSHD` | UPS EXPORT-SS | VN-UPS红单SS | |
| 181 | `VNUPSHY` | VNUPSHDA-HD | VN-河内UPS蓝单 | |
| 182 | `VNUPSLB` | VNUPSLDB-hzm | VN-胡志明UPS-蓝单 | |
| 183 | `VNUPSLD` | VNUPSExport-SS | VN-UPS蓝单SS | |
| 184 | `VNUPSLDHY` | VNUPSLDA-HD | VN-胡志明UPS-红单 | |
| 185 | `VNUPSTU` | VNUPSTU-SS | VN-UPS货运SS | |
| 186 | `VNUSA` | VNUSA | VN-US空运快件 | |
| 187 | `WHEMSDB` | WHEMSDB | 集运威海EMS海运 | |
| 188 | `WHJYEMS` | WHJYEMS | 集运威海EMS空运 | |
| 189 | `WHKRKYDS` | WHKRKYDS | 韩国空运电商GBX | 到门. 3天 |
| 190 | `WMCP` | WMCP | 未知销售产品 | |

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:-----|
| 2026-06-26 | Jaison (JSJung 제안) | getshippingmethod 실측 검증 — 190건 전체 목록 저장. Issue #119 보고 완료. |
