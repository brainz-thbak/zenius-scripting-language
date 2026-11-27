# Expression.evaluate()

컴파일된 템플릿의 표현식을 평가하고, 텍스트와 표현식 결과를 원문 순서대로 이어 붙인다.

```ts
evaluate(context?: Readonly<Record<string, unknown>>): string
```

## 매개변수

| 이름      | 타입                                | 설명                                                                       |
| --------- | ----------------------------------- | -------------------------------------------------------------------------- |
| `context` | `Readonly<Record<string, unknown>>` | 선택 사항. `GET`이 조회할 데이터를 담은 객체. 생략하면 빈 객체를 사용한다. |

## 반환값

`string`. 일반 텍스트와 각 표현식의 문자열 결과를 이어 붙인 값이다.

## 설명

같은 `Expression`을 여러 컨텍스트로 평가할 수 있다. `GET`의 첫 인자는 컨텍스트의 키다. 이어지는 문자열 인자는 중첩 속성 경로를 지정한다. 조회에 사용하는 객체와 배열은 호출 측에서 일반 데이터로 구성한다.

평가 규칙을 위반하면 `ZslValidationError` 계열 오류를 던진다. 누적 출력 길이가 `maxOutputLength`를 초과하면 `ZslOutputLengthLimitExceededError`를 던진다.

## 예제

같은 템플릿에 다른 이벤트 데이터를 넣어 평가한다.

```ts
import { ZSL } from '@zenius/zsl'

const expr = new ZSL().compile("심각도: ${GET('event', 'severity') ?? 0}")

expr.evaluate({ event: { severity: 6 } }) // '심각도: 6'
expr.evaluate({ event: { severity: 8 } }) // '심각도: 8'
expr.evaluate() // '심각도: 0'
```

## 관련 항목

- [`ZSL.compile()`](compile.md)
- [`Expression`](expression.md)
- [`GET` 조회 규칙](../language.md#데이터-접근)
- [검사와 평가 오류](error-codes.md#검사와-평가-오류)
