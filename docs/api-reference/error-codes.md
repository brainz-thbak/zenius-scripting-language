---

toc_max_heading_level: 2

---

# 오류 클래스와 코드

패키지에서 가져올 수 있는 오류 클래스와 그 클래스가 제공하는 `code`를 정리한다. 아래 호출 예제에서 `zsl`은 `new ZSL()`로 만든 인스턴스다. [공통 오류 속성](zsl-error.md)

## 문법 오류

`ZslSyntaxError`는 `ZslError<ZslIssue<'syntax'>>`를 상속한다.

```ts
new ZslSyntaxError(issues: readonly ZslIssue<'syntax'>[])
```

`issues`에는 직접 생성한 오류에 담을 문법 진단을 전달한다. 아래 구체 오류의 생성자는 `span: ZslIssue['span']`을 받으며, 이 범위에 대한 문법 진단 하나를 생성한다. [소스 범위](zsl-issue.md)

### ZslSyntaxError

`SYNTAX_ERROR`. 문법 오류를 나타내는 분류 클래스다. 직접 생성할 때 이 코드를 사용한다.

```ts
new ZslSyntaxError([])
```

### ZslUnexpectedCharacterError

`UNEXPECTED_CHARACTER`. 표현식에서 인식할 수 없는 문자소를 만났다. 진단 범위는 해당 문자소 전체다.

```ts
zsl.compile('${1 + 😀}')
```

### ZslUnsupportedEscapeError

`UNSUPPORTED_ESCAPE`. 문자열 리터럴에 지원하지 않는 이스케이프가 있다.

```ts
zsl.compile('${"\\q"}')
```

### ZslInvalidStringCharacterError

`INVALID_STRING_CHARACTER`. 문자열 리터럴에 이스케이프하지 않은 U+0000부터 U+001F까지의 제어 문자가 있다.

```ts
zsl.compile('${"a\nb"}')
```

### ZslUnterminatedStringError

`UNTERMINATED_STRING`. 표현식의 문자열을 읽는 중 닫는 따옴표 없이 입력이 끝났다.

```ts
new ZslUnterminatedStringError({ start: 2, end: 4 })
```

### ZslMissingFractionDigitError

`MISSING_FRACTION_DIGIT`. 숫자 리터럴의 소수점 뒤에 숫자가 없다.

```ts
zsl.compile('${14.}')
```

### ZslNonFiniteNumberLiteralError

`NON_FINITE_NUMBER_LITERAL`. 숫자 리터럴을 `Number`로 변환한 값이 유한하지 않다.

```ts
zsl.compile('${' + '9'.repeat(309) + '}')
```

### ZslMissingCallOpeningParenError

`MISSING_CALL_OPENING_PAREN`. 함수 이름 뒤에 여는 괄호 `(`가 없다.

```ts
zsl.compile('${GET}')
```

### ZslUnknownFunctionError

`UNKNOWN_FUNCTION`. 파서가 등록되지 않은 함수 호출을 만났다. 진단 범위는 함수 이름이다.

생성자는 `functionName: string`을 `span` 앞에 받는다.

```ts
zsl.compile('${missing()}')
```

### ZslMissingOperandError

`MISSING_OPERAND`. 피연산자가 필요한 위치에 표현식이 없다.

```ts
zsl.compile('${1 +}')
```

### ZslMissingGroupClosingParenError

`MISSING_GROUP_CLOSING_PAREN`. 괄호로 묶은 표현식 뒤에 닫는 괄호 `)`가 없다.

```ts
zsl.compile('${(1}')
```

### ZslExpectedArgumentDelimiterError

`EXPECTED_ARGUMENT_DELIMITER`. 함수 인자 뒤에 쉼표 `,` 또는 닫는 괄호 `)`가 없다.

```ts
zsl.compile("${GET('event' 'severity')}")
```

### ZslMissingConditionalColonError

`MISSING_CONDITIONAL_COLON`. 조건식의 참 분기 뒤에 콜론 `:`이 없다.

```ts
zsl.compile('${true ? 1}')
```

### ZslTrailingTokenError

`TRAILING_TOKEN`. 표현식 뒤에 해석되지 않은 토큰이 남아 있다.

```ts
zsl.compile('${1 2}')
```

### ZslUnterminatedTemplateExpressionError

`UNTERMINATED_TEMPLATE_EXPRESSION`. 템플릿 표현식이 시작된 뒤 문자열 밖에서 닫는 구분자 `}`를 만나기 전에 원문이 끝났다.

```ts
zsl.compile('값 ${1')
```

`compile()`은 표현식을 파싱하기 전에 템플릿 원문에서 표현식의 끝을 찾는다. 따옴표가 열린 채 원문이 끝나면 `UNTERMINATED_TEMPLATE_EXPRESSION`을 던진다. [`ZSL.compile()`](compile.md) · [언어 명세](../language.md)

## 검사와 평가 오류

`ZslValidationError`는 `ZslError<ZslIssue<'validation'>>`를 상속한다.

```ts
new ZslValidationError(issues: readonly ZslIssue<'validation'>[])
```

`issues`에는 직접 생성한 오류에 담을 검사·평가 진단을 전달한다. 구체 오류의 생성자는 `span: ZslIssue['span']`을 마지막 인자로 받고, 이 범위에 대한 검사·평가 진단 하나를 생성한다. 함수 관련 오류는 함수 이름과 필요한 인자 정보를 읽기 전용 속성으로 제공한다.

### ZslValidationError

`VALIDATION_ERROR`. 검사·평가 오류를 나타내는 분류 클래스다. 직접 생성할 때 이 코드를 사용한다.

```ts
new ZslValidationError([])
```

### ZslInsufficientArgumentsError

`INSUFFICIENT_ARGUMENTS`. 컴파일 중 함수 호출의 인자 수가 해당 함수의 최솟값보다 적다.

생성자는 아래 속성이 있는 객체를 `span` 앞에 받는다.

- `functionName: string`은 함수 이름이다.
- `minimumArguments: number`는 필요한 최소 인자 수다.
- `actualArguments: number`는 실제 인자 수다.

```ts
zsl.compile('${GET()}')
```

### ZslInvalidArgumentTypeError

`INVALID_ARGUMENT_TYPE`. 평가 중 `GET` 또는 `EXIST`의 인자가 문자열 이외의 값으로 평가됐다.

생성자는 아래 속성이 있는 객체를 `span` 앞에 받는다.

- `functionName: string`은 함수 이름이다.
- `expectedType: 'string' | 'number' | 'boolean'`은 필요한 인자 타입이다.

```ts
zsl.compile("${GET('event', false)}").evaluate()
```

### ZslInvalidFunctionResultError

`INVALID_FUNCTION_RESULT`. 평가 중 `GET`의 결과가 문자열, 불리언, `null`, 유한한 `number`에 해당하지 않는다.

생성자는 `functionName: string`을 `span` 앞에 받는다.

```ts
zsl.compile("${GET('event', 'value')}").evaluate({ event: { value: {} } })
```

### ZslInvalidConditionTypeError

`INVALID_CONDITION_TYPE`. 조건식의 조건을 평가한 값이 불리언이 아니다.

```ts
zsl.compile('${1 ? 2 : 3}').evaluate()
```

### ZslDivisionByZeroError

`DIVISION_BY_ZERO`. 나눗셈의 오른쪽 피연산자가 `0` 또는 `0n`이다.

```ts
zsl.compile('${1 / 0}').evaluate()
```

### ZslNonFiniteArithmeticResultError

`NON_FINITE_ARITHMETIC_RESULT`. 산술 연산 결과를 `Number`로 변환한 값이 유한하지 않다.

```ts
zsl.compile('${' + '9'.repeat(308) + ' * 2}').evaluate()
```

### ZslInvalidArithmeticOperandTypeError

`INVALID_ARITHMETIC_OPERAND_TYPE`. 산술 연산의 피연산자를 평가한 값이 `number`나 `bigint`에 해당하지 않는다.

```ts
zsl.compile('${1 + true}').evaluate()
```

### ZslInvalidComparisonOperandTypeError

`INVALID_COMPARISON_OPERAND_TYPE`. 크기 비교에 숫자 이외의 값이 나왔다. 진단 범위는 해당 피연산자다.

```ts
zsl.compile('${1 < null}').evaluate()
```

### ZslInvalidLogicalOperandTypeError

`INVALID_LOGICAL_OPERAND_TYPE`. 논리 연산에서 실제로 평가한 피연산자의 값이 불리언이 아니다.

```ts
zsl.compile('${true && 1}').evaluate()
```

[`ZSL.compile()`](compile.md) · [`Expression.evaluate()`](evaluate.md) · [언어 명세](../language.md)

## 입력과 길이 제한

아래 클래스는 `ZslError<never>`를 상속하며 `issues`가 빈 배열이다. 두 길이 초과 오류의 생성자는 `limit: number`를 받는다. `limit`은 읽기 전용 속성으로 제공되며 UTF-16 코드 단위로 센 한도를 나타낸다. `ZslInvalidSourceTypeError`의 생성자는 인자를 받지 않는다.

### ZslInvalidSourceTypeError

`INVALID_SOURCE_TYPE`. `compile()`의 런타임 인자가 문자열이 아니다.

```ts
Reflect.apply(zsl.compile, zsl, [null])
```

### ZslInputLengthLimitExceededError

`INPUT_LENGTH_LIMIT_EXCEEDED`. 템플릿 원문 길이가 `maxInputLength`를 초과했다.

```ts
new ZSL({ maxInputLength: 1 }).compile('ab')
```

### ZslOutputLengthLimitExceededError

`OUTPUT_LENGTH_LIMIT_EXCEEDED`. 평가 중 다음 텍스트나 표현식 결과를 이어 붙이면 누적 길이가 `maxOutputLength`를 초과한다.

```ts
new ZSL({ maxOutputLength: 2 }).compile('abc').evaluate()
```

[`ZslOptions`](zsl-options.md) · [`ZSL.compile()`](compile.md) · [`Expression.evaluate()`](evaluate.md)

## AST 스냅샷 오류

### ZslUnsupportedExpressionNodeError

`UNSUPPORTED_EXPRESSION_NODE`. `ZslError<never>`를 상속한다. `getAstSnapshot()`이 지원하지 않는 종류의 표현식 노드를 만나면 이 오류를 던진다. 생성자는 인자를 받지 않고 `issues`는 빈 배열이다.

```ts
import { ZslUnsupportedExpressionNodeError } from '@zenius/zsl'

const error = new ZslUnsupportedExpressionNodeError()
console.log(error.code) // 'UNSUPPORTED_EXPRESSION_NODE'
console.log(error.issues) // []
```

[`Expression.getAstSnapshot()`](ast-snapshot.md)

## 관련 항목

- [`ZslError`](zsl-error.md)
- [`ZslIssue`](zsl-issue.md)
- [코드로 오류 원인 판별](../adr/0003-error-classification-by-code.md)
