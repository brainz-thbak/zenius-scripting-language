# 0002 Expression의 AST 스냅샷 조회

## 기존 구조

`Expression`은 템플릿 AST를 비공개 멤버 `#ast`에 보관했다. 호출자는 `evaluate()`로 평가 결과만 얻을 수 있었다.

## 결정

- `getAstSnapshot()`을 공개한다. 호출마다 템플릿 구간, 하위 노드, 소스 범위를 복사해 반환한다.
- 스냅샷의 변경은 평가에 사용하는 AST와 다음 스냅샷에 영향을 주지 않는다. [AST 조회 계약](../api.md#ast-조회)

## 관련 로드맵

- [alpha.6 AST 조회와 테스트 구조](../roadmap/alpha.6.md)
