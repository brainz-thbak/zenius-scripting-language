export interface PlaygroundInput {
  source: string
  context: string
}

interface Sample {
  id: string
  name: string
  description: string
  input: PlaygroundInput
}

export const samples: readonly [Sample, ...Sample[]] = [
  {
    id: 'service',
    name: '서비스 알림',
    description: 'GET과 삼항 연산으로 상태 메시지 만들기',
    input: {
      source: [
        "서비스: ${GET('service', 'name')}",
        "상태: ${GET('service', 'healthy') ? '정상' : '점검 필요'}",
        "응답 시간: ${GET('service', 'latencyMs') ?? 0} ms",
      ].join('\n'),
      context: JSON.stringify(
        { service: { name: 'API Gateway', healthy: false, latencyMs: 240 } },
        null,
        2,
      ),
    },
  },
  {
    id: 'fallback',
    name: '기본값 적용',
    description: '값이 없을 때 ??로 기본값 선택하기',
    input: {
      source: "담당자: ${GET('event', 'assignee') ?? '미지정'}",
      context: JSON.stringify({ event: { assignee: null } }, null, 2),
    },
  },
  {
    id: 'precision',
    name: '큰 정수와 소수',
    description: '안전 정수 범위를 넘는 값 확인하기',
    input: {
      source: '${9007199254740992}, ${9007199254740993}\n${0.0000001}',
      context: '{}',
    },
  },
  {
    id: 'error',
    name: '오류 위치 찾기',
    description: '0으로 나누고 진단 범위 확인하기',
    input: {
      source: '계산: ${12 / 0}',
      context: '{}',
    },
  },
]

export const quickReference = [
  {
    notation: '${…}',
    name: '표현식 삽입',
    description: '템플릿 중괄호 안의 표현식을 평가해 문자열에 삽입합니다.',
    example: '합계: ${4 + 6}',
  },
  {
    notation: 'GET',
    name: '컨텍스트 조회',
    description:
      '첫 인자는 컨텍스트의 키입니다. 이어지는 문자열은 중첩 속성의 경로입니다.',
    example: "${GET('service', 'name')}",
  },
  {
    notation: '? :',
    name: '조건 선택',
    description:
      '조건이 참이면 물음표 뒤의 식을, 거짓이면 콜론 뒤의 식을 평가합니다.',
    example: "${true ? '정상' : '점검 필요'}",
  },
  {
    notation: '??',
    name: '기본값 선택',
    description: '왼쪽 값이 null이면 오른쪽 값을 사용합니다.',
    example: "${null ?? '미지정'}",
  },
] as const
