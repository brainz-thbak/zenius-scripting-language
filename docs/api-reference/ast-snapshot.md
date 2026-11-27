# Expression.getAstSnapshot()

컴파일된 템플릿 AST의 새 복사본을 반환한다.

```ts
getAstSnapshot(): TemplateAst
```

## 매개변수

없음.

## 반환값

`TemplateAst`. 텍스트 구간과 표현식 구간을 원문 순서대로 담는다. 타입 선언은 이 배열을 읽기 전용으로 제공한다. 반환 타입에 이름을 붙이려면 `ReturnType<Expression['getAstSnapshot']>`을 사용한다.

## 설명

`kind: 'text'`인 구간에는 이스케이프를 처리한 `value`가 담긴다. `kind: 'expression'`인 구간에는 `expression` 노드가 담긴다. 표현식 노드의 `span`은 템플릿 원문에서 0부터 시작하는 UTF-16 범위다. `start`는 포함하고 `end`는 제외한다.

스냅샷을 수정해도 원래 `Expression`의 평가와 다음 스냅샷에는 영향이 없다. 안전 정수 범위를 넘는 소수점 없는 리터럴은 `bigint`로 기록된다. 스냅샷을 JSON으로 직렬화할 때는 `replacer`에서 `bigint` 값을 문자열로 바꿀 수 있다.

지원하지 않는 표현식 노드를 만나면 [`ZslUnsupportedExpressionNodeError`](error-codes.md#ast-스냅샷-오류)를 던진다.

## 예제

```ts
import { ZSL } from '@zenius/zsl'

const snapshot = new ZSL().compile('값: ${42}').getAstSnapshot()

snapshot[0] // { kind: 'text', value: '값: ' }
snapshot[1]
// {
//   kind: 'expression',
//   expression: { kind: 'literal', value: 42, span: { start: 5, end: 7 } },
// }
```

## 관련 항목

- [`Expression`](expression.md)
- [`ZslIssue`](zsl-issue.md)
- [리터럴](../language.md#리터럴)
