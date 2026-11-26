# 0.1.0-alpha.9 컴파일 입력 검증과 템플릿 길이 제한

컴파일 입력을 런타임에 검증하고 템플릿 원문과 평가 결과의 길이를 인스턴스별로 제한한다.

| 구성           | 호출                | 적용 규칙                                                        |
| -------------- | ------------------- | ---------------------------------------------------------------- |
| 입력 타입 검사 | `compile(source)`   | 문자열이 아닌 값은 파싱 전에 `INVALID_SOURCE_TYPE` 오류를 낸다.  |
| 입력 길이 제한 | `compile(source)`   | 파싱 전에 템플릿 원문의 길이를 `maxInputLength`와 비교한다.      |
| 출력 길이 제한 | `evaluate(context)` | 텍스트와 표현식 결과의 누적 길이를 `maxOutputLength`와 비교한다. |

한도는 `ZSL` 생성자에서 각각 설정한다. 길이는 UTF-16 코드 단위로 잰다. [공개 API](../api.md) · [길이 제한 설정 ADR](../adr/0005-instance-length-limit-options.md)

## 확인 기준

| 입력 또는 동작                                      | 기대 결과                                             |
| --------------------------------------------------- | ----------------------------------------------------- |
| JavaScript에서 `compile(null)`, `compile(42)` 호출  | `code`가 `INVALID_SOURCE_TYPE`인 ZSL 오류가 발생한다. |
| 닫히지 않은 구간이 있는 문자열을 `compile()`에 전달 | `UNTERMINATED_TEMPLATE_EXPRESSION` 오류가 발생한다.   |
| 입력과 출력이 각각 정해진 한도 이하임               | 컴파일과 평가가 성공하고 평가 결과가 그대로 반환된다. |
| 템플릿 원문이 `maxInputLength`를 넘음               | 컴파일에서 `INPUT_LENGTH_LIMIT_EXCEEDED`가 발생한다.  |
| 누적 출력이 `maxOutputLength`를 넘음                | 평가에서 `OUTPUT_LENGTH_LIMIT_EXCEEDED`가 발생한다.   |
| 한도가 다른 두 `ZSL` 인스턴스에서 같은 템플릿 처리  | 각 인스턴스의 한도가 독립적으로 적용된다.             |

[템플릿 테스트](../../tests/zsl.template.test.ts) · [오류 테스트](../../tests/zsl.error.test.ts)
