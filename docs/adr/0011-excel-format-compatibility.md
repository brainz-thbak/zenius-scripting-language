# 0011 Excel 서식 호환성

## 배경

Excel의 `TEXT(value, format_text)`는 숫자를 지정한 서식의 문자열로 변환한다. ZSL 템플릿에서도 Excel에서 쓰던 서식 문자열을 그대로 사용할 수 있어야 한다. [Microsoft Excel TEXT 함수](https://support.microsoft.com/en-us/excel/functions/text-function)

Excel 비교 사례의 기대값은 Microsoft 예제 통합 문서에 저장된 `TEXT` 결과다. [Excel TEXT 함수 예제 통합 문서](https://download.microsoft.com/download/6/A/8/6A818B0B-06F4-4E41-80DE-D383A3B89865/TEXT%20function%20examples.xlsx)

## 결정

- `FORMAT_NUM(number, pattern)`은 유한한 `number` 또는 `bigint`와 서식 문자열을 받아 문자열을 반환한다. 숫자 표시의 호환성 기준은 Microsoft 365 Excel의 `TEXT` 서식과 그 문자열 결과다. 이 ADR의 숫자 서식 범위를 alpha.17에 적용한다. [alpha.17 로드맵](../roadmap/alpha.17.md)
- 기본 서식, 사용자 지정 서식, 로캘별 서식과 Excel이 허용하는 조합을 지원한다. 색상 같은 표시 지시자는 Excel `TEXT`가 받아들이는 형태로 수용하고, 반환 문자열에는 `TEXT`가 출력하는 문자만 넣는다. `@`가 들어 있는 텍스트 구역도 서식의 일부로 수용한다. [Excel 사용자 지정 숫자 서식](https://support.microsoft.com/en-us/excel/review-guidelines-for-customizing-a-number-format) · [Excel TEXT 함수](https://support.microsoft.com/en-us/excel/functions/text-function)
- 로캘에 따라 Excel과 같은 방식으로 서식을 해석하고 문자열을 출력한다. ZSL의 기본 로캘은 `en-US`이며, 다른 지역 설정은 평가 설정으로 명시할 수 있어야 한다. 서식에 포함된 로캘과 숫자 체계 지시자는 Excel 규칙에 따라 해석한다. [Excel 숫자 서식 문법](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-xls/300280fd-e4fe-4675-a924-4d383af48d3b) · [Excel 국제 서식 확장](https://learn.microsoft.com/en-us/openspecs/office_standards/ms-xlsx/8c82391e-f128-499a-80a1-734b8504f60e)
- 유효하지 않은 서식의 오류는 두 번째 인자 범위를 가리킨다. 유효한 서식에 표시할 수 없는 숫자가 들어와 Excel `TEXT`가 오류를 내는 경우에는 첫 번째 인자 범위를 가리킨다.

## 숫자 처리

소수점과 천 단위 구분자는 적용한 지역 설정을 따른다. 서식에 포함된 통화 지시자는 Excel 규칙에 따라 해석한다. [Excel 숫자 서식 문법](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-xls/300280fd-e4fe-4675-a924-4d383af48d3b)

`[h]`, `[m]`, `[s]`를 쓰는 경과 시간 서식에서 입력은 일 단위의 길이다. [Excel 경과 시간 서식](https://support.microsoft.com/en-us/excel/format-numbers-as-dates-or-times)

ZSL의 숫자 정밀도를 유지한다. `number`의 10진 문자열 표현을 기준으로 반올림하고, 정확히 중간이면 절댓값이 커지는 쪽을 택한다. `bigint`는 자릿수를 잃지 않고 해당 서식이 요구하는 변환을 적용한다. 반올림한 값이 0이면 자동으로 붙는 음수 부호를 생략한다. 서식에 직접 작성한 부호, 괄호, 문자에는 해당 구역의 규칙을 적용한다. [숫자 정밀도 ADR](0009-numeric-precision.md)

### Excel과 비교할 사례

| 동작                           | 입력                   | 서식                                 | 기대 문자열      |
| ------------------------------ | ---------------------- | ------------------------------------ | ---------------- |
| 정수 반올림과 천 단위 구분     | `1234.56`              | `#,##0`                              | `1,235`          |
| 다른 자리표시자로 천 단위 구분 | `12200000`             | `#,###`                              | `12,200,000`     |
| 필수 자릿수와 천 단위 구분     | `12200000`             | `0,000.00`                           | `12,200,000.00`  |
| 천 단위로 축소                 | `12200000`             | `#,`                                 | `12200`          |
| 백만 단위로 축소               | `12200000`             | `0.0,,`                              | `12.2`           |
| 퍼센트                         | `0.285`                | `0.00%`                              | `28.50%`         |
| 통화                           | `1234.56`              | `$#,##0`                             | `$1,235`         |
| 회계 서식의 공백               | `1234.56`              | `$ * #,##0`                          | `$ 1,235`        |
| 음수 구역과 괄호               | `-1234.56`             | `$#,##0.00_);($#,##0.00)`            | `($1,234.56)`    |
| 지수 표기                      | `12200000`             | `0.00E+00`                           | `1.22E+07`       |
| 분수                           | `4.34`                 | `# ?/?`                              | `4 1/3`          |
| 분모가 고정된 분수             | `4.34`                 | `# ?/2`                              | `4 1/2`          |
| 경과 시간                      | `0.043055555555555562` | `[h]:mm`                             | `1:02`           |
| 조건 구역과 전화번호           | `1234567899`           | `[<=9999999]###-####;(###) ###-####` | `(123) 456-7899` |
| 우편번호                       | `123456789`            | `00000-0000`                         | `12345-6789`     |

Excel 공식 가이드의 자리표시자와 리터럴 사례도 적용한다. `8.9`에 `#.000`을 적용하면 `8.900`, `12`에 `#.0#`을 적용하면 `12.0`이다. `-125.74`에 `$0.00" Surplus";$-0.00" Shortage"`를 적용하면 `$-125.74 Shortage`다. [Excel 사용자 지정 숫자 서식](https://support.microsoft.com/en-us/excel/review-guidelines-for-customizing-a-number-format)

호환성 검증에는 `General`, `0`·`#`·`?`의 조합, 양수·음수·0 구역과 빈 구역, `@`가 있는 서식, 색상, 인용 문자와 이스케이프, 공백과 채움, 로캘 지시자를 포함한다. 같은 값과 서식을 Excel에서 계산해 문자열의 공백, 구역 선택, 잘못된 서식과 표시할 수 없는 값의 오류까지 비교한다. [Excel 셀 서식 규칙](https://learn.microsoft.com/en-us/troubleshoot/microsoft-365-apps/excel/format-cells-settings)

### ZSL의 숫자 규칙을 확인할 사례

| 입력               | 서식       | ZSL 기대 결과           |
| ------------------ | ---------- | ----------------------- |
| `999.995`          | `#,##0.00` | `1,000.00`              |
| `-1.005`           | `0.00`     | `-1.01`                 |
| `-0.004`           | `0.00`     | `0.00`                  |
| `9007199254740993` | `#,##0`    | `9,007,199,254,740,993` |

## 날짜 처리

`FORMAT_DATE(value, pattern, timeZone)`은 `Z` 또는 UTC 오프셋이 포함된 ISO 8601 날짜·시간 문자열을 받는다. 입력이 가리키는 시각을 지정한 시간대로 변환한 뒤 출력 서식에 맞는 문자열을 반환한다. [alpha.18 로드맵](../roadmap/alpha.18.md)

`FORMAT_DATE`에 Excel 일련번호를 넘기면 첫 번째 인자에서 타입 오류가 발생한다. `FORMAT_NUM`에 일련번호를 달력 날짜나 시각으로 변환하는 서식을 넘기면 두 번째 인자에서 서식 오류가 발생한다.

### 확인 사례

| 표현식                                                                | 기대 결과                 |
| --------------------------------------------------------------------- | ------------------------- |
| `FORMAT_DATE('2026-11-27T23:30:45.12Z', 'yyyy-MM-dd', 'Asia/Seoul')`  | 문자열 `2026-11-28`       |
| `FORMAT_DATE('2026-11-27T14:30:00+09:00', 'yyyy-MM-dd HH:mm', 'UTC')` | 문자열 `2026-11-27 05:30` |
| `FORMAT_DATE(42670, 'yyyy-MM-dd', 'UTC')`                             | 첫 번째 인자의 타입 오류  |
| `FORMAT_NUM(42670, 'MM/DD/YY')`                                       | 두 번째 인자의 서식 오류  |
