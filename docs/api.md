# 공개 API

패키지 이름은 `@zenius/zsl`이다. `compile()`은 엔진을 연결하기 전까지 호출 시 오류를 던진다. 아래 예시는 엔진이 제공할 호출 계약을 보여준다. [패키지 진입점](../src/zsl/index.ts)

## 컴파일

`compile(source)`는 템플릿에 포함된 표현식을 파싱하고 검사해 `Expression`을 반환한다. 문법이나 검사에 실패하면 `ZslValidationError`를 던진다. 오류의 `issues`에서 진단 종류, 메시지와 소스 범위를 읽을 수 있다. [컴파일 메서드](../src/zsl/zsl.ts) · [진단 타입](../src/exception/types.ts)

## 평가

`Expression`은 컴파일한 템플릿 AST를 보관한다. `evaluate(context?)`는 같은 AST를 전달받은 컨텍스트로 평가해 문자열을 반환한다. 컨텍스트의 키는 `GET`이 조회할 객체 이름이다. 표현식에서 참조할 데이터가 없으면 컨텍스트를 생략할 수 있다. [Expression 클래스](../src/expression/expression.ts) · [평가 인터페이스](../src/expression/types.ts) · [언어 명세](language.md)

```ts
const zsl = new ZSL()
const expression = zsl.compile("test: {${4 + GET('event', 'severity')}}")

expression.evaluate({ event: { severity: 6 } }) // 'test: {10}'
expression.evaluate({ event: { severity: 8 } }) // 'test: {12}'
```

```ts
zsl.compile('${4 + 6}').evaluate() // '10'
```
