# Expression

[`ZSL.compile()`](compile.md)이 반환하는 컴파일된 템플릿의 타입이다. 패키지에서 `import type`으로 가져온다.

```ts
import type { Expression } from '@zenius/zsl'
```

## 메서드

| 메서드                                | 설명                                                         |
| ------------------------------------- | ------------------------------------------------------------ |
| [`evaluate(context?)`](evaluate.md)   | 컨텍스트를 사용해 템플릿을 평가하고 결과 문자열을 반환한다.  |
| [`getAstSnapshot()`](ast-snapshot.md) | 이스케이프를 처리한 텍스트와 표현식 AST의 복사본을 반환한다. |

## 설명

`ZSL.compile()`을 호출해 인스턴스를 얻는다. 같은 `Expression`을 다시 평가할 때는 원하는 컨텍스트를 매번 전달한다. 출력 길이 한도는 이 템플릿을 컴파일한 `ZSL` 인스턴스의 설정을 따른다.

## 예제

```ts
import { ZSL, type Expression } from '@zenius/zsl'

const greeting: Expression = new ZSL().compile(
  "안녕하세요, ${GET('user', 'name')}님.",
)

greeting.evaluate({ user: { name: '민지' } }) // '안녕하세요, 민지님.'
greeting.evaluate({ user: { name: '준호' } }) // '안녕하세요, 준호님.'
```

## 관련 항목

- [`ZSL.compile()`](compile.md)
- [`Expression.evaluate()`](evaluate.md)
- [`Expression.getAstSnapshot()`](ast-snapshot.md)
