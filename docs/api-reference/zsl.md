# ZSL

템플릿을 컴파일하는 인스턴스를 생성한다. 인스턴스에 입력과 출력의 길이 한도를 지정할 수 있다.

```ts
constructor(options?: ZslOptions)
```

## 매개변수

| 이름      | 타입                           | 설명                                           |
| --------- | ------------------------------ | ---------------------------------------------- |
| `options` | [`ZslOptions`](zsl-options.md) | 선택 사항. 입력과 출력의 길이 한도를 지정한다. |

## 반환값

`ZSL` 인스턴스. [`compile()`](compile.md)로 템플릿을 컴파일한다.

## 설명

길이 한도는 UTF-16 코드 단위로 계산한다. 기본값은 입력 16,384, 출력 65,536이다. 각 옵션을 생략하거나 `undefined`로 지정하면 해당 기본값을 사용한다. 인스턴스에서 `maxInputLength`와 `maxOutputLength`를 읽을 수 있다.

옵션에 `null`, 배열, 또는 `undefined` 이외의 원시값을 전달하면 `TypeError`를 던진다. 길이 한도가 0 이상의 안전한 정수가 아니면 `RangeError`를 던진다.

## 예제

```ts
import { ZSL } from '@zenius/zsl'

const zsl = new ZSL({ maxInputLength: 256, maxOutputLength: 128 })

zsl.maxInputLength // 256
zsl.compile('합계: ${4 + 6}').evaluate() // '합계: 10'
```

## 관련 항목

- [`ZslOptions`](zsl-options.md)
- [`ZSL.compile()`](compile.md)
- [`Expression.evaluate()`](evaluate.md)
