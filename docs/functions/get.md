# GET

컨텍스트에서 경로가 가리키는 값을 읽는다.

## 호출 형식

```text
GET(contextKey, propertyName, ...propertyNames)
```

인자는 두 개 이상이며 각 인자는 문자열로 평가되는 표현식이다.

| 인자               | 역할                                                       |
| ------------------ | ---------------------------------------------------------- |
| `contextKey`       | 컨텍스트의 최상위 키다.                                    |
| `propertyName`     | 첫 번째 속성 이름이다.                                     |
| `...propertyNames` | 더 깊은 경로의 속성 이름이다. 필요한 만큼 인자를 추가한다. |

## 반환값

마지막 속성의 값이 문자열, 불리언, `null` 또는 유한한 `number`이면 그대로 반환한다. 경로를 조회할 수 없으면 `null`을 반환한다. 이 경우에는 속성이 없거나 마지막 값이 `undefined`인 경우도 포함된다. [데이터 접근 규칙](../language.md#데이터-접근)

## 오류

| 오류 코드                                                                                  | 발생 조건과 범위                                                                                         |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| [`INSUFFICIENT_ARGUMENTS`](../api-reference/error-codes.md#zslinsufficientargumentserror)  | 컴파일할 때 인자가 두 개 미만이면 호출 전체를 가리킨다.                                                  |
| [`INVALID_ARGUMENT_TYPE`](../api-reference/error-codes.md#zslinvalidargumenttypeerror)     | 인자의 평가 값이 문자열이 아니면 해당 인자를 가리킨다.                                                   |
| [`INVALID_FUNCTION_RESULT`](../api-reference/error-codes.md#zslinvalidfunctionresulterror) | 조회한 값이 객체, 배열, `bigint` 또는 유한하지 않은 숫자처럼 반환할 수 없는 값이면 호출 전체를 가리킨다. |

## 예제

이벤트의 심각도와 출발지 IP를 템플릿에 삽입한다. 담당자가 없거나 값이 `null`이면 `미지정`을 출력한다.

```js
import { ZSL } from '@zenius/zsl'

const zsl = new ZSL()
const context = {
  event: { severity: 6, source: { ip: '192.0.2.1' } },
}

const event = zsl.compile(
  "심각도: ${GET('event', 'severity')}, IP: ${GET('event', 'source', 'ip')}",
)
console.log(event.evaluate(context)) // 심각도: 6, IP: 192.0.2.1

const assignee = zsl.compile("담당자: ${GET('event', 'assignee') ?? '미지정'}")
console.log(assignee.evaluate(context)) // 담당자: 미지정
console.log(assignee.evaluate({ event: { assignee: null } })) // 담당자: 미지정
```

저장된 `null`과 경로 누락을 구분하려면 `EXIST`를 사용한다. [EXIST](exist.md)
