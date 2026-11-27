# EXIST

컨텍스트 경로가 가리키는 자체 데이터 속성에 값이 저장되어 있는지 확인한다.

## 호출 형식

```text
EXIST(contextKey, propertyName, ...propertyNames)
```

인자는 두 개 이상이며 각 인자는 문자열로 평가되는 표현식이다.

| 인자               | 역할                                                       |
| ------------------ | ---------------------------------------------------------- |
| `contextKey`       | 컨텍스트의 최상위 키다.                                    |
| `propertyName`     | 첫 번째 속성 이름이다.                                     |
| `...propertyNames` | 더 깊은 경로의 속성 이름이다. 필요한 만큼 인자를 추가한다. |

## 반환값

- 마지막 속성에 `undefined` 이외의 값이 저장되어 있으면 `true`를 반환한다. `null`, `false`, `0`, 빈 문자열, 객체와 배열도 값이 있는 경우에 해당한다.
- 경로를 조회할 수 없거나 마지막 값이 `undefined`이면 `false`를 반환한다.

경로는 `GET`과 같은 규칙으로 조회한다. [데이터 접근 규칙](../language.md#데이터-접근) · [GET](get.md)

## 오류

| 오류 코드                                                                                 | 발생 조건과 범위                                        |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [`INSUFFICIENT_ARGUMENTS`](../api-reference/error-codes.md#zslinsufficientargumentserror) | 컴파일할 때 인자가 두 개 미만이면 호출 전체를 가리킨다. |
| [`INVALID_ARGUMENT_TYPE`](../api-reference/error-codes.md#zslinvalidargumenttypeerror)    | 인자의 평가 값이 문자열이 아니면 해당 인자를 가리킨다.  |

## 예제

템플릿의 삼항 연산에서 출발지 IP 속성의 존재 여부에 따라 출력할 문자열을 고른다. `ip`에 `null`이 저장된 경우에도 `있음`을 출력한다.

```js
import { ZSL } from '@zenius/zsl'

const template = new ZSL().compile(
  "IP 속성: ${EXIST('event', 'source', 'ip') ? '있음' : '없음'}",
)

console.log(template.evaluate({ event: { source: { ip: '192.0.2.1' } } })) // IP 속성: 있음
console.log(template.evaluate({ event: { source: { ip: null } } })) // IP 속성: 있음
console.log(template.evaluate({ event: { source: {} } })) // IP 속성: 없음
```
