# ZslOptions

[`ZSL` 생성자](zsl.md)에 전달하는 길이 제한 설정이다.

```ts
interface ZslOptions {
  readonly maxInputLength?: number | undefined
  readonly maxOutputLength?: number | undefined
}
```

## 속성

| 이름              | 기본값 | 설명                                      |
| ----------------- | ------ | ----------------------------------------- |
| `maxInputLength`  | 16,384 | 컴파일할 수 있는 템플릿 원문의 최대 길이. |
| `maxOutputLength` | 65,536 | 평가 결과 문자열의 최대 길이.             |

## 설명

두 한도는 UTF-16 코드 단위로 계산한다. 문자열의 `length`와 같은 단위다. 각 속성은 0 이상의 안전한 정수로 지정한다. 생략하거나 `undefined`를 전달하면 해당 기본값을 사용한다. `ZSL` 인스턴스는 생성할 때 계산한 한도를 사용한다.

## 예제

입력 한도만 지정하고 출력에는 기본 한도를 사용한다.

```ts
import { ZSL, type ZslOptions } from '@zenius/zsl'

const options: ZslOptions = { maxInputLength: 512 }
const zsl = new ZSL(options)

zsl.maxInputLength // 512
zsl.maxOutputLength // 65536
```

## 관련 항목

- [`ZSL`](zsl.md)
- [입력과 길이 제한 오류](error-codes.md#입력과-길이-제한)
