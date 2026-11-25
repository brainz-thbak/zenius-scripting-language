# ZSL의 EBNF 읽는 법

EBNF는 어떤 문자열이 문법에 맞는지 규칙으로 적는 표기법이다. ZSL의 표현식 문법을 읽을 때는 `expression input`부터 시작하고, 오른쪽에 나온 규칙 이름을 따라간다. `expression input`처럼 공백이 들어간 이름도 규칙 하나를 가리킨다. [ZSL 표현식 문법](../spec/zsl.ebnf)

## 기호 읽기

```ebnf
boolean = "true" | "false" ;
```

왼쪽의 `boolean`은 규칙 이름이다. 오른쪽은 입력에 `true` 또는 `false`가 와야 한다는 뜻이다. 따옴표는 입력에 들어갈 글자를 표시한다.

| 표기               | 읽는 법                                                                            |
| ------------------ | ---------------------------------------------------------------------------------- |
| `a = b ;`          | `a`를 `b`로 정의한다. 세미콜론에서 규칙이 끝난다.                                  |
| `"true"`, `'true'` | 따옴표 안의 글자가 입력과 정확히 일치해야 한다.                                    |
| `a, b`             | `a` 다음에 `b`가 온다.                                                             |
| `a \| b`           | `a`와 `b` 중 하나가 온다.                                                          |
| `[ a ]`            | `a`를 생략하거나 한 번 쓸 수 있다.                                                 |
| `{ a }`            | `a`를 생략하거나 여러 번 쓸 수 있다.                                               |
| `( a )`            | 괄호 안을 한 묶음으로 읽는다. 입력에 실제 여는 괄호가 필요하면 `"("`로 적는다.     |
| `? end of input ?` | 표준 기호로 표현하기 어려운 조건을 적는다. 여기서는 입력이 끝났어야 한다는 뜻이다. |
| `(* 설명 *)`       | 규칙을 이해하는 데 필요한 주석을 적는다.                                           |

## 입력 전체 읽기

```ebnf
expression input = spacing, expression, spacing, ? end of input ? ;
```

앞쪽 공백, 표현식 하나, 뒤쪽 공백을 차례대로 읽으면 입력이 끝나야 한다. `spacing`은 공백이 없어도 된다는 뜻이다. `4 5`는 `4` 뒤의 공백을 읽고도 `5`가 남으므로 거부된다.

## 숫자 규칙 읽기

```ebnf
number = digit, { digit }, [ ".", digit, { digit } ] ;
```

1. `digit`이 먼저 오므로 숫자가 한 자리 이상 있어야 한다.
2. `{ digit }`에서 숫자가 더 이어질 수 있다.
3. `[ ".", digit, { digit } ]`는 소수점과 소수부 전체를 생략할 수 있다는 뜻이다. 소수점이 있으면 바로 뒤에 숫자가 한 자리 이상 있어야 한다.

그래서 `4`와 `01.25`는 이 규칙에 맞고, `.5`와 `4.`는 숫자가 필요한 자리가 비어 있다.

## 연산자 우선순위 읽기

```ebnf
expression = conditional ;
conditional = null coalescing, [ spacing, "?", spacing, conditional, spacing, ":", spacing, conditional ] ;
null coalescing = logical or, { spacing, "??", spacing, logical or } ;
logical or = logical and, { spacing, "||", spacing, logical and } ;
logical and = sum, { spacing, "&&", spacing, sum } ;
sum = product, { spacing, ( "+" | "-" ), spacing, product } ;
product = primary, { spacing, ( "*" | "/" ), spacing, primary } ;
primary = literal | "(", spacing, expression, spacing, ")" ;
```

- `conditional`은 `null coalescing`으로 조건을 읽고, `?`와 `:`가 있으면 두 가지를 각각 `conditional`로 읽는다. 아래 규칙일수록 더 높은 우선순위의 연산을 읽는다.
- `sum`은 `product` 하나로 시작하고, `+`나 `-` 뒤에 또 다른 `product`를 붙일 수 있다. `product`는 `*`나 `/`를 처리하므로 `1 + 2 * 3`을 읽을 때 `2 * 3`이 먼저 묶인다.
- `primary`의 두 번째 선택지는 여는 괄호를 읽고 `expression` 규칙을 다시 사용한다. 그래서 `(1 + 2) * 3`은 괄호 안의 덧셈을 먼저 묶고, 괄호 안에 또 괄호를 쓸 수 있다.
- 같은 우선순위의 이항 연산이 반복되면 파서는 왼쪽부터 묶는다. `8 / 4 / 2`는 `(8 / 4) / 2`로 읽는다. 이 결합 방향은 EBNF의 관련 주석에 명시돼 있다.

연산자 앞뒤의 `spacing`도 생략할 수 있으므로 `1+2`와 `1 + 2`는 둘 다 문법에 맞는다.

## ZSL에서 사용하는 곳

렉서와 파서는 EBNF의 규칙을 TypeScript로 구현한다. 예를 들어 `true + 1`은 문법에 따라 연산 노드로 묶을 수 있다. 평가기는 양쪽 값이 숫자여야 한다는 언어 규칙에 따라 이 식을 거부한다. [언어 명세](language.md#사칙연산과-괄호)

EBNF 기호의 상세 정의는 ISO/IEC 14977의 4~6절에 있다. [ISO/IEC 14977 표준 페이지](https://www.iso.org/standard/26153.html) · [표준 PDF](https://www.open-std.org/jtc1/sc22/wg20/docs/n740-ebnf.pdf)
