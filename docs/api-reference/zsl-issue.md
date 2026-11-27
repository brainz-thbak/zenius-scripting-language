# ZslIssue

문법 또는 검사·평가 실패의 상세 메시지와 템플릿 원문 범위를 나타낸다.

```ts
interface ZslIssue<
  Kind extends 'syntax' | 'validation' = 'syntax' | 'validation',
> {
  readonly kind: Kind
  readonly message: string
  readonly span: { readonly start: number; readonly end: number }
}
```

## 타입 매개변수

| 이름   | 허용값                     | 설명                                         |
| ------ | -------------------------- | -------------------------------------------- |
| `Kind` | `'syntax' \| 'validation'` | 진단 종류. 생략하면 두 종류를 모두 허용한다. |

## 속성

| 이름      | 설명                                                                |
| --------- | ------------------------------------------------------------------- |
| `kind`    | 문법 실패는 `'syntax'`, 검사 또는 평가 실패는 `'validation'`.       |
| `message` | 실패한 구문이나 평가 규칙을 설명하는 메시지.                        |
| `span`    | 원문에서 0부터 시작하는 UTF-16 범위. 시작은 포함하고 끝은 제외한다. |

## 설명

진단은 [`ZslError.issues`](zsl-error.md)에서 읽는다. 오류 원인을 분기하려면 오류 클래스의 `code`를 사용한다. 원문에서 문제 구간을 표시하려면 `source.slice(span.start, span.end)`를 사용한다.

## 예제

0으로 나누는 오류에서 분모를 가리키는 진단을 읽는다.

```ts
import { ZSL, ZslValidationError, type ZslIssue } from '@zenius/zsl'

const source = '${12 / 0}'

try {
  new ZSL().compile(source).evaluate()
} catch (error) {
  if (!(error instanceof ZslValidationError)) throw error

  const issue: ZslIssue<'validation'> | undefined = error.issues[0]
  if (issue) {
    source.slice(issue.span.start, issue.span.end) // '0'
  }
}
```

## 관련 항목

- [`ZslError`](zsl-error.md)
- [오류 클래스와 코드](error-codes.md)
- [`Expression.getAstSnapshot()`](ast-snapshot.md)
