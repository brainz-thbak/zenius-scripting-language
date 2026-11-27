# ZSL.compile()

템플릿 원문을 파싱하고 검사한 뒤 평가할 수 있는 `Expression`을 반환한다.

```ts
compile(source: string): Expression
```

## 매개변수

| 이름     | 타입     | 설명                                                     |
| -------- | -------- | -------------------------------------------------------- |
| `source` | `string` | 일반 텍스트와 선택적인 `${...}` 표현식 구간을 담은 원문. |

## 반환값

[`Expression`](expression.md). 같은 템플릿을 여러 컨텍스트로 평가하거나 템플릿의 AST를 조회할 수 있다.

## 설명

`source`의 타입과 길이를 확인한 뒤 템플릿을 파싱한다. 등록되지 않은 함수 이름은 파서가 거부한다. 파싱이 끝나면 함수마다 정해진 인자 수 조건을 검사한다. 파싱과 검사는 평가에서 건너뛰는 삼항 연산이나 논리 연산의 분기에도 적용된다.

| 조건                                                    | 오류                               |
| ------------------------------------------------------- | ---------------------------------- |
| `source`가 문자열이 아니다.                             | `ZslInvalidSourceTypeError`        |
| 원문 길이가 인스턴스의 `maxInputLength`를 넘는다.       | `ZslInputLengthLimitExceededError` |
| 템플릿이나 표현식 문법이 잘못됐다.                      | `ZslSyntaxError` 계열              |
| 미등록 함수를 호출했다.                                 | `ZslUnknownFunctionError`          |
| 등록 함수 호출의 인자 수가 최솟값보다 작다.             | `ZslInsufficientArgumentsError`    |
| 호출의 인자 수가 함수가 요구하는 고정 인자 수와 다르다. | `ZslInvalidArgumentCountError`     |

## 예제

```ts
import { ZSL } from '@zenius/zsl'

const zsl = new ZSL()
const expression = zsl.compile('합계: ${4 + 6}')

expression.evaluate() // '합계: 10'
```

## 관련 항목

- [`ZSL`](zsl.md)
- [`Expression.evaluate()`](evaluate.md)
- [오류 클래스와 코드](error-codes.md)
- [템플릿 문법](../language.md#템플릿)
