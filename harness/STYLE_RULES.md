# STYLE_RULES.md — 비주얼 스타일 기준

## 색상 팔레트 (절대 준수)
Primary BG:  #080B10   Panel:   #0F1318
Accent Gold: #E8C547   Blue:    #60A5FA
Green:       #10B981   Purple:  #A78BFA
Red:         #EF4444   Orange:  #F59E0B
Text:        #CDD5E0   Muted:   #3D4A5C

## 씬 타입 → 배경 + 액센트
opening:  bg=#0D1F35  accent=#60A5FA
headline: bg=#1F0D0D  accent=#EF4444
data:     bg=#0D1F14  accent=#10B981
analysis: bg=#1A0D2E  accent=#A78BFA
expert:   bg=#1F1A0D  accent=#F59E0B
field:    bg=#0D1A1F  accent=#34D399
closing:  bg=#0D0D1F  accent=#E8C547

## 전환 효과 가이드
opening→*     : fade (0.5s)
*→headline    : wipe-left (0.4s)
*→data        : zoom-in (0.5s)
*→closing     : fade (0.8s)
default       : fade (0.4s)
허용 전환: fade|wipe-left|wipe-right|zoom-in|zoom-out|slide-up|slide-down|flash

## 타이포그래피
메인 타이틀:  bold 52-60px 흰색#F0F4FF
하단 자막:    regular 26-30px 흰색90%
앵커명:       bold 28-32px Accent색
Lower Third:  18-22px 흰색85%
티커 텍스트:  regular 14-16px 흰색

## Lower Third 규칙
- 최대 32자
- 앵커명 + 구분선 + 자막텍스트 2줄 구조
- 배경: rgba(0,0,0,0.9) + Accent 4px 사이드바

## Breaking News 티커
- 배경: #B91C1C (진한 빨강)
- BREAKING 레이블: Accent (#E8C547) 배경, 검정 텍스트
- 스크롤: 좌→우 방향, 18-20초 루프

## 캔버스 스펙
해상도: 1920×1080 (렌더), 960×540 (프리뷰)
FPS: 30
켄번스 줌: progress × 0.03 (씬 내 서서히 줌인)
그리드 노이즈: rgba(255,255,255,0.018) 32px 간격
