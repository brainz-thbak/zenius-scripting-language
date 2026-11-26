# 공개 API

패키지 `@zenius/zsl`에서 `ZSL`, `Expression`, `ZslValidationError`를 가져올 수 있다. [패키지 진입점](../src/zsl/index.ts)

## 컴파일

`compile(source)`는 템플릿에 포함된 표현식을 파싱하고 검사해 `Expression`을 반환한다. 문법이나 검사에 실패하면 `ZslValidationError`를 던진다. 오류의 `issues`에서 진단 종류, 메시지와 소스 범위를 읽을 수 있다. 소스 범위는 템플릿 원문에서 0부터 시작하는 UTF-16 코드 단위 오프셋이다. 시작 위치를 포함하고 끝 위치를 제외한다. [컴파일 메서드](../src/zsl/zsl.ts) · [진단 타입](../src/exception/types.ts)

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
