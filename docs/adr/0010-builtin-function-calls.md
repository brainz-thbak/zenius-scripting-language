# 0010 내장 함수 호출 문법

## 배경

ZSL은 엔진이 제공하는 함수만 호출할 수 있는 표현식 언어다. 사용자는 템플릿에 함수를 선언할 수 없다. 이전 호출 문법은 일반 식별자를 함수 이름으로 파싱한 뒤 검사기에서 등록 여부를 확인했다. [alpha.4 로드맵](../roadmap/alpha.4.md)

## 결정

- EBNF의 `call`은 `builtin function`에 열거된 이름을 받는다. 함수 이름은 대소문자를 구분하며, 괄호와 인자 목록에는 공통 호출 문법을 적용한다. [EBNF](../../spec/zsl.ebnf)
- 파서와 평가기는 같은 함수 등록 목록을 사용한다. 파서는 미등록 이름을 만나면 이름 범위에 `ZslUnknownFunctionError`를 낸다. 오류는 `ZslSyntaxError` 계열에 속하고 원인 코드는 `UNKNOWN_FUNCTION`이다. [오류 코드 ADR](0003-error-classification-by-code.md) · [오류 규격](../api-reference/error-codes.md#zslunknownfunctionerror)
- 검사기는 호출의 최소 인자 수를 확인한다. 평가기는 실제로 실행하는 호출에서 인자 값과 반환 규칙을 적용한다. [함수 호출 명세](../language.md#함수-호출) · [내장 함수 규격](../functions.md)

## 근거와 결과

호출할 수 있는 이름을 EBNF에 열거하면 템플릿에서 허용되는 함수가 문법에 드러난다. 미등록 호출은 평가에서 건너뛰는 분기에 있어도 파싱 단계에서 거부된다. 내장 함수를 추가할 때는 EBNF와 함수 등록 목록에 이름을 추가하고 함수별 규격을 작성한다. 파서 테스트는 두 목록이 일치하는지 확인한다. [파서 테스트](../../tests/zsl.parser.test.ts)
