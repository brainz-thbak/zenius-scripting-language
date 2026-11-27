# ZslError

ZSL 오류의 추상 기본 클래스다. `Error`를 상속하고 원인을 나타내는 `code`와 세부 진단 배열 `issues`를 제공한다.

```ts
abstract class ZslError<Issue extends ZslIssue = ZslIssue> extends Error {
  abstract readonly code: string
  readonly issues: readonly Issue[]

  constructor(message: string, issues: readonly Issue[])
}
```

## 타입 매개변수

| 이름    | 설명                                                                                                                      |
| ------- | ------------------------------------------------------------------------------------------------------------------------- |
| `Issue` | 진단 타입이다. 기본값은 `ZslIssue`다. 하위 클래스에서 진단 종류를 제한하거나 추가 속성을 가진 진단 타입을 지정할 수 있다. |

## 매개변수

| 이름                       | 설명                                                         |
| -------------------------- | ------------------------------------------------------------ |
| `message: string`          | 상속받은 `Error.message`에 저장할 오류 메시지다.             |
| `issues: readonly Issue[]` | 오류에 담을 진단 배열이다. 진단이 없으면 빈 배열을 전달한다. |

## 속성

| 이름                       | 설명                                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| `code: string`             | 하위 클래스가 정의하는 오류 코드다. 내장 오류는 ESM과 CommonJS에서 같은 코드로 같은 원인을 나타낸다. |
| `issues: readonly Issue[]` | 생성자가 복사한 진단 배열이다. 각 진단에 종류, 메시지, 템플릿 원문에서의 소스 범위가 들어 있다.      |

## 설명

엔진이 생성하는 오류 메시지와 진단 메시지는 한국어다. 호출자가 전달한 메시지는 전달된 문구를 사용한다.

`message`는 오류 전체의 메시지다. 문법 오류와 검사·평가 오류는 같은 분류의 오류끼리 이 값을 공유한다. 각 진단의 `message`에서 실패한 규칙을 확인할 수 있다. 같은 진입점의 클래스 생성자를 공유하는 코드에서는 `instanceof ZslError`로 상속 관계를 확인할 수 있다. ESM과 CommonJS를 함께 쓰는 호출부에서는 `code`로 원인을 비교할 수 있다.

생성자는 진단 배열을 새로 만든다. 프로토타입이 `Object.prototype`인 진단은 얕게 복사하고, 그 진단의 `span`도 같은 조건을 충족하면 얕게 복사한다. 복사본에는 진단의 `kind`, `message`, `span`과 범위의 `start`, `end`가 포함된다. 그 밖의 속성은 자체 열거 속성만 복사한다. 사용자 정의 클래스의 진단 인스턴스처럼 다른 프로토타입을 가진 진단은 원래 참조를 유지한다.

## 예제

```ts
import { ZSL, ZslError } from '@zenius/zsl'

try {
  new ZSL().compile('${12 / 0}').evaluate()
} catch (error) {
  if (!(error instanceof ZslError)) throw error

  console.log(error.code) // 'DIVISION_BY_ZERO'
  console.log(error.issues[0]?.span) // { start: 7, end: 8 }
}
```

하위 클래스의 타입 매개변수로 사용자 정의 진단 속성을 유지할 수 있다.

```ts
import { ZslError, type ZslIssue } from '@zenius/zsl'

interface FieldIssue extends ZslIssue<'validation'> {
  readonly field: string
}

class FieldError extends ZslError<FieldIssue> {
  override readonly code = 'INVALID_FIELD'
}

const span = { start: 0, end: 3 }
const error = new FieldError('Invalid field', [
  { kind: 'validation', message: 'Required field', span, field: 'name' },
])

span.start = 1
console.log(error.issues[0]?.span.start) // 0
console.log(error.issues[0]?.field) // 'name'
```

## 관련 항목

- [오류 클래스와 코드](error-codes.md)
- [`ZslIssue`](zsl-issue.md)
- [공개 API의 오류와 진단](../api.md#오류와-진단)
