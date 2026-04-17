# ZENITH_LMS UI Visual Specification: Ethereal Tactile (Hybrid)

이 문서는 사용자 승인을 받은 'Ethereal Tactile' 하이브리드 디자인 시안을 실제 코드로 구현하기 위한 수치적 가이드라인을 정의합니다.

## 🎨 Color Palette & Skinning
기본 테마는 **Light Mode**이며, 스킨 적용 가능성을 고려하여 CSS Variables 기반으로 설계합니다.

| Category | Token | Value (Light Default) | Description |
|:---:|:---|:---|:---|
| **Background** | `--zen-bg` | `#f8fafc` (Slate 50) | 전체 대시보드 배경 |
| **Accent** | `--zen-primary` | `#2563eb` (Blue 600) | 주요 상호작용 및 브랜드 컬러 |
| **Accent Glow** | `--zen-aurora` | `linear-gradient(...)` | 배경에 배치되는 부드러운 오로라 효과 |
| **Surface** | `--zen-glass-bg` | `rgba(255, 255, 255, 0.6)` | 유격(Elevation)을 가진 유리 카드 배경 |
| **Shadow (Neo)** | `--zen-shadow-light` | `-5px -5px 10px #ffffff` | 뉴모픽 밝은 부분 (좌상단) |
| **Shadow (Neo)** | `--zen-shadow-dark` | `5px 5px 12px #d1d5db` | 뉴모픽 어두운 부분 (우하단) |

## ✨ Visual Effects (Ethereal)

### 1. Glassmorphism (유리 질감)
- **Blur**: `backdrop-filter: blur(12px)`
- **Border**: `1px solid rgba(255, 255, 255, 0.3)` (흰색 반투명 선)
- **Shadow**: `box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07)`

### 2. Tactile Interactivity (입체적 상호작용)
- **Normal State**: 부드러운 돌출 (Outer Shadow)
- **Active/Pressed State**: 함몰 느낌 (Inner Shadow)
- **Hover State**: 미세한 글로우(Glow) 효과 추가

## 🧱 Key Components Spec

### 🔘 ZenButton (Tactile)
- 시안 4번의 버튼 형태 계승.
- 전형적인 납작한 버튼이 아닌, 표면에서 살짝 솟아오른 듯한 3D 느낌 구현.
- 클릭 시 실제 물리 버튼처럼 눌리는 애니메이션(`transform: scale(0.98)`) 포함.

### 🍱 ZenCard (Glass)
- 시안 1번의 레이아웃 계승.
- 정보 위젯의 기본 컨테이너.
- 배경의 '오로라' 색상이 카드 위로 비치는 반투명성 유지.

## 🌓 Theme & Skins
- **Default (Zenith Blue)**: 표준 물류 플랫폼 감성.
- **Emerald/Forest**: 물동량 및 환경 지표 강조 테마.
- **Amber/Gold**: 프리미엄 VIP 고객사 전용 테마.

---
**Audit Note**: 위 명세는 `Tailwind v4`와 `@theme` 레이어를 통해 중앙 집중식으로 관리됩니다.
