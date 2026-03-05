# Date & Time Calculation (CRITICAL)

## 절대 규칙

날짜/시간 계산은 절대 머리로 하지 마라. 반드시 시스템 도구를 사용하라.

LLM은 날짜 산술에서 자주 틀린다. 요일, 기간, D-day, 윤년, 월말 등 모든 날짜 계산에 Bash 또는 Python을 사용하라.

## 필수 사용 패턴

### 현재 날짜/시간 확인
```bash
date '+%Y-%m-%d %A %H:%M:%S %Z'
```

### 요일 계산 (macOS)
```bash
date -j -f '%Y-%m-%d' '2026-03-15' '+%A'
```

### 요일 계산 (Linux)
```bash
date -d '2026-03-15' '+%A'
```

### N일 후/전 계산 (macOS)
```bash
date -j -v+30d '+%Y-%m-%d %A'    # 30일 후
date -j -v-7d '+%Y-%m-%d %A'     # 7일 전
```

### N일 후/전 계산 (Linux)
```bash
date -d '+30 days' '+%Y-%m-%d %A'    # 30일 후
date -d '-7 days' '+%Y-%m-%d %A'     # 7일 전
```

### 복잡한 날짜 계산 (Python 사용)
```bash
python3 -c "
from datetime import datetime, timedelta
# 두 날짜 사이 일수
d1 = datetime(2026, 2, 6)
d2 = datetime(2026, 12, 31)
print(f'{(d2-d1).days}일')
"
```

## 금지 사항

- 날짜를 암산으로 계산
- 요일을 추측으로 답변
- 영업일 계산을 머리로 시도

## 허용 사항

- 항상 `date` 명령어 또는 `python3` 사용
