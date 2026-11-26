# 0.1.0-alpha.7 구체 오류 클래스

호출자는 오류 클래스 또는 고정 `code`로 실패 원인을 식별하고, `issues`에서 진단의 상세 메시지와 소스 범위를 읽는다.

| 구성             | 오류 클래스 예시                    | 적용 규칙                                                                               |
| ---------------- | ----------------------------------- | --------------------------------------------------------------------------------------- |
| 공통 오류        | `ZslError`                          | 라이브러리의 오류 클래스가 공유하는 상위 클래스다.                                      |
| 문법 오류        | `ZslUnsupportedEscapeError`         | `ZslSyntaxError`를 상속한다. `issues`의 진단 종류는 `syntax`다.                         |
| 검사와 평가 오류 | `ZslDivisionByZeroError`            | `ZslValidationError`를 상속한다. `issues`의 진단 종류는 `validation`이다.               |
| AST 스냅샷 오류  | `ZslUnsupportedExpressionNodeError` | `ZslError`를 상속한다. 코드가 `UNSUPPORTED_EXPRESSION_NODE`이고 `issues`는 빈 배열이다. |

## 구현 범위

- 렉서, 파서, 템플릿 컴파일러는 문법 오류 클래스를 사용한다. 함수 등록부와 평가기는 검사 또는 평가 실패에 해당하는 클래스를 사용한다. [문법 오류 클래스](../../src/exception/syntax-error.ts) · [검사와 평가 오류 클래스](../../src/exception/validation-error.ts)
- 구체 오류 클래스는 고정 `code`와 상세 진단 메시지를 정의한다. 함수 오류는 `functionName`을 제공하며, 인자 수 오류는 `minimumArguments`와 `actualArguments`를 제공한다. [공개 오류 API](../api.md#오류와-진단)
- ESM과 CommonJS 진입점에서 상위 클래스와 구체 클래스를 가져올 수 있다. [패키지 진입점](../../src/zsl/index.ts)

## 확인 기준

| 입력 또는 동작                           | 기대 결과                                                                                     |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| 닫히지 않은 표현식 구간 컴파일           | `ZslUnterminatedTemplateExpressionError`와 `UNTERMINATED_TEMPLATE_EXPRESSION`                 |
| `unknown()`이 든 표현식 구간 컴파일      | `ZslUnknownFunctionError`, `UNKNOWN_FUNCTION`, `functionName` 값 `unknown`                    |
| `GET()`이 든 표현식 구간 컴파일          | `ZslInsufficientArgumentsError`, `INSUFFICIENT_ARGUMENTS`, 최소 인자 수 `2`, 실제 인자 수 `0` |
| `1 / 0`이 든 표현식 구간 평가            | `ZslDivisionByZeroError`, `DIVISION_BY_ZERO`, 나누는 수의 소스 범위                           |
| 구체 오류를 `instanceof ZslError`로 확인 | 문법 오류, 검사와 평가 오류, AST 스냅샷 오류에서 `true`                                       |

구체 오류의 타입, 코드, 메시지, 소스 범위를 테스트한다. [오류 테스트](../../tests/zsl.error.test.ts)
