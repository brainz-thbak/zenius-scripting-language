# 공개 API

패키지 `@zenius/zsl`은 `ZSL`과 오류 클래스를 내보낸다. `Expression`과 `ZslIssue`는 타입으로 가져올 수 있다. [패키지 진입점](../src/zsl/index.ts)

## 컴파일

`compile(source)`는 템플릿에 포함된 표현식을 파싱하고 검사해 `Expression`을 반환한다. 템플릿이나 표현식의 문법이 올바르지 않으면 `ZslSyntaxError` 계열의 오류를 던진다. 등록 함수 이름이나 최소 인자 수 검사에 실패하면 `ZslValidationError` 계열의 오류를 던진다. [컴파일 메서드](../src/zsl/zsl.ts)

## 평가

`evaluate(context?)`는 텍스트를 보존하고 각 표현식의 결과를 문자열로 바꿔 원문 순서대로 이어 붙인다. 같은 `Expression`을 여러 컨텍스트로 평가할 수 있다. 컨텍스트의 키는 `GET`이 조회할 객체 이름이다. 표현식에서 참조할 데이터가 없으면 컨텍스트를 생략할 수 있다. 표현식의 평가 규칙을 충족하지 못하면 템플릿 원문 기준 소스 범위를 담은 `ZslValidationError`를 던진다. [Expression 클래스](../src/expression/expression.ts) · [평가 인터페이스](../src/expression/types.ts) · [언어 명세](language.md)

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

`getAstSnapshot()`은 호출할 때마다 템플릿 AST의 새 복사본을 반환한다. 복사본에는 텍스트 구간, 표현식 노드, 소스 범위가 포함된다. 복사본의 변경은 원래 `Expression`의 평가나 다음 스냅샷에 영향을 주지 않는다. [Expression 클래스](../src/expression/expression.ts)

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

`ZslError`는 `Error`를 상속한다. `ZslSyntaxError`와 `ZslValidationError`는 각각 `ZslError`를 상속한다. `instanceof`로 공통 클래스, 분류 클래스 또는 구체적인 오류 클래스를 확인할 수 있다. [공통 오류 클래스](../src/exception/zsl-error.ts)

- `code`는 오류 원인을 식별하는 고정 문자열이다. 예를 들어 `ZslDivisionByZeroError`의 코드는 `DIVISION_BY_ZERO`다. 분류 클래스의 기본 코드는 각각 `SYNTAX_ERROR`와 `VALIDATION_ERROR`다. [문법 오류 클래스](../src/exception/syntax-error.ts) · [검사와 평가 오류 클래스](../src/exception/validation-error.ts)
- `issues`는 진단 배열이다. 각 `ZslIssue`는 진단의 `kind`, 상세 `message`, 소스 `span`을 담는다. 범위는 템플릿 원문에서 0부터 시작하는 UTF-16 코드 단위 오프셋이다. `start`를 포함하고 `end`를 제외한다. [진단 타입](../src/exception/types.ts)
- 함수 관련 오류는 `functionName`을 제공한다. `ZslInsufficientArgumentsError`의 `minimumArguments`와 `actualArguments`는 필요한 최소 인자 수와 실제 인자 수다. `ZslInvalidArgumentTypeError`의 `expectedType`은 필요한 인자 타입이다. [함수 오류 클래스](../src/exception/validation-error.ts)

지원하지 않는 표현식 노드가 AST에 있으면 `getAstSnapshot()`은 `ZslUnsupportedExpressionNodeError`를 던진다. 오류 코드는 `UNSUPPORTED_EXPRESSION_NODE`이며 `issues`는 빈 배열이다. [AST 오류 클래스](../src/exception/unsupported-expression-node-error.ts)
