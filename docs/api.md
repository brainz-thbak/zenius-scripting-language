# 공개 API

패키지 `@zenius/zsl`은 `ZSL`과 오류 클래스를 내보낸다. `Expression`, `ZslIssue`, `ZslOptions`는 타입으로 가져올 수 있다. [패키지 진입점](../src/zsl/index.ts)

## 실행 환경

ZSL의 실행 대상은 웹 브라우저와 Node.js다. 두 환경에 같은 공개 API와 표현식 평가 규칙을 적용한다.

- 웹 브라우저에서는 ESM 진입점을 사용한다.
- Node.js 24 이상에서는 ESM과 CommonJS 진입점을 제공한다. [패키지 설정](../package.json)

## 인스턴스 설정

`new ZSL(options?)`는 템플릿 원문의 `maxInputLength`와 평가 결과의 `maxOutputLength`를 받는다. 각 한도는 UTF-16 코드 단위로 센 길이의 최댓값이다. 문자열의 `length`와 같은 단위다. 인스턴스는 생성할 때 두 한도를 저장한다. 두 한도는 같은 이름의 공개 `readonly` 속성에서 읽을 수 있다.

각 한도를 생략하거나 `undefined`로 두면 입력은 16,384, 출력은 65,536 UTF-16 코드 단위를 기본값으로 적용한다. 한도를 직접 지정할 때는 0 이상의 안전한 정수를 전달한다. 한도가 조건을 충족하지 못하면 생성자가 `RangeError`를 던진다.

생성자에 `null`, 배열 또는 `undefined` 이외의 원시값을 전달하면 `TypeError`를 던진다. [길이 제한 설정 ADR](adr/0005-instance-length-limit-options.md)

## 컴파일

`compile(source)`는 템플릿에 포함된 표현식을 파싱하고 검사해 `Expression`을 반환한다. 템플릿이나 표현식의 문법이 올바르지 않으면 `ZslSyntaxError` 계열의 오류를 던진다. 등록 함수 이름이나 최소 인자 수 검사에 실패하면 `ZslValidationError` 계열의 오류를 던진다. [컴파일 메서드](../src/zsl/zsl.ts)

`compile()`은 입력이 문자열이면 원문 길이를 검사한 뒤 파싱한다. 문자열 이외의 값에는 `INVALID_SOURCE_TYPE`을 던진다. 원문이 `maxInputLength`를 초과하면 `INPUT_LENGTH_LIMIT_EXCEEDED`를 던진다.

## 평가

`evaluate(context?)`는 컴파일할 때 이스케이프를 처리한 텍스트와 각 표현식의 문자열 결과를 원문 순서대로 이어 붙인다. 같은 `Expression`을 여러 컨텍스트로 평가할 수 있다. 컨텍스트의 키는 `GET`이 조회할 객체 이름이다. 표현식에서 참조할 데이터가 없으면 컨텍스트를 생략할 수 있다. 표현식의 평가 규칙을 충족하지 못하면 템플릿 원문 기준 소스 범위를 담은 `ZslValidationError`를 던진다. [Expression 클래스](../src/expression/expression.ts) · [평가 인터페이스](../src/expression/types.ts) · [언어 명세](language.md)

`Expression`은 컴파일한 `ZSL` 인스턴스의 `maxOutputLength`를 사용한다. 다음 텍스트나 표현식 결과를 이어 붙이면 누적 길이가 한도를 초과하는 경우 `OUTPUT_LENGTH_LIMIT_EXCEEDED`를 던지고 평가를 중단한다.

```ts
import { ZSL } from '@zenius/zsl'

const zsl = new ZSL()
const expression = zsl.compile("test: {${4 + GET('event', 'severity')}}")

expression.evaluate({ event: { severity: 6 } }) // 'test: {10}'
expression.evaluate({ event: { severity: 8 } }) // 'test: {12}'
```

```ts
zsl.compile('${4 + 6}').evaluate() // '10'
```

## AST 조회

`getAstSnapshot()`은 호출할 때마다 템플릿 AST의 새 복사본을 반환한다. 복사본에는 이스케이프를 처리한 텍스트 구간과 원문 소스 범위를 가진 표현식 노드가 포함된다. 복사본의 변경은 원래 `Expression`의 평가나 다음 스냅샷에 영향을 주지 않는다. [Expression 클래스](../src/expression/expression.ts)

```ts
const snapshot = zsl.compile('값: ${42}').getAstSnapshot()

// [
//   { kind: 'text', value: '값: ' },
//   {
//     kind: 'expression',
//     expression: { kind: 'literal', value: 42, span: { start: 5, end: 7 } },
//   },
// ]
```

## 오류와 진단

`ZslError`는 `Error`를 상속한다. `ZslSyntaxError`와 `ZslValidationError`는 각각 `ZslError`를 상속한다. `instanceof`는 같은 패키지 진입점에서 가져온 오류 클래스의 상속 관계를 확인할 때 사용한다. [공통 오류 클래스](../src/exception/zsl-error.ts)

- 오류 원인은 고정 문자열인 `code`로 판별한다. ESM과 CommonJS 진입점은 같은 오류에 같은 `code`를 제공한다. 예를 들어 `ZslDivisionByZeroError`의 코드는 `DIVISION_BY_ZERO`다. 분류 클래스의 기본 코드는 각각 `SYNTAX_ERROR`와 `VALIDATION_ERROR`다. [문법 오류 클래스](../src/exception/syntax-error.ts) · [검사와 평가 오류 클래스](../src/exception/validation-error.ts)
- `issues`는 진단 배열이다. 각 `ZslIssue`는 진단의 `kind`, 상세 `message`, 소스 `span`을 담는다. 범위는 템플릿 원문에서 0부터 시작하는 UTF-16 코드 단위 오프셋이다. `start`를 포함하고 `end`를 제외한다. [진단 타입](../src/exception/types.ts)
- `INVALID_SOURCE_TYPE`, `INPUT_LENGTH_LIMIT_EXCEEDED`, `OUTPUT_LENGTH_LIMIT_EXCEEDED` 오류의 `issues`는 빈 배열이다. 두 길이 초과 오류는 적용된 한도를 `limit`에 담는다.
- 함수 관련 오류는 `functionName`을 제공한다. `ZslInsufficientArgumentsError`의 `minimumArguments`와 `actualArguments`는 필요한 최소 인자 수와 실제 인자 수다. `ZslInvalidArgumentTypeError`의 `expectedType`은 필요한 인자 타입이다. [함수 오류 클래스](../src/exception/validation-error.ts)

지원하지 않는 표현식 노드가 AST에 있으면 `getAstSnapshot()`은 `ZslUnsupportedExpressionNodeError`를 던진다. 오류 코드는 `UNSUPPORTED_EXPRESSION_NODE`이며 `issues`는 빈 배열이다. [AST 오류 클래스](../src/exception/unsupported-expression-node-error.ts)
