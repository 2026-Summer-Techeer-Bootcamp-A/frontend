import RagConsole from '../../rag/RagConsole'

const GOOD: { title: string; reason: string; ref: string }[] = [
  {
    title: '내 이력서와 의미상 비슷한 공고 찾기',
    reason:
      '"백엔드 개발자"와 "서버 엔지니어"는 글자는 다르지만 의미는 같아요. 회사마다 직무명·문장 표현이 제각각이라 키워드 매칭으로는 놓치는 공고가 많고, 임베딩 유사도는 이 표현 차이를 흡수해요. 대신 "합격 확률" 같은 근거 없는 숫자는 절대 만들지 않고 유사도 수치만 그대로 보여줘요.',
    ref: 'GET /postings/{id}/similar · posting_embedding · pgvector HNSW cosine',
  },
  {
    title: '공고 원문 요약·하이라이트',
    reason:
      '채용공고 원문은 수백~수천 자짜리 비정형 HTML이에요. 이걸 사람이 다 읽긴 부담스러운데, LLM이 "그 공고의 실제 원문"만 근거로 요약하면 읽는 시간을 줄여줘요. 원문에 없는 복지·문화를 지어내지 않도록 프롬프트에 원문 텍스트만 주입해요.',
    ref: 'GET /postings/{id}/analysis · raw_posting.payload 기반, degraded 시 폴백',
  },
  {
    title: '스키마로 딱 떨어지지 않는 자유 질문',
    reason:
      '"이 회사 분위기 어때?", "신입도 지원할 만한 데 있어?" 같은 질문은 SQL 컬럼 하나로 답이 안 나와요. 관련 공고·기업 텍스트를 검색해서 그 안에서만 답하게 하면, 모델이 아는 척 지어내는 대신 실제 문서에 있는 내용만 인용해서 답해요.',
    ref: 'POST /chat · route=vector',
  },
  {
    title: '이력서 기반 피드백·예상 면접 질문',
    reason:
      '이 사람이 실제로 확정한 스킬셋(세션에 저장된 값)을 프롬프트에 그대로 넣어서 생성하면, "당신 이력서에는 없는데 있다고 착각하는" 답변을 막을 수 있어요. 일반적인 조언이 아니라 이 사람 스킬셋에 실제로 근거한 피드백만 나가요.',
    ref: 'POST /resume/feedback · session 확정 스킬셋 grounding',
  },
]

const BAD: { title: string; reason: string; ref: string }[] = [
  {
    title: '"React 공고 몇 건이야?" 같은 정량 집계',
    reason:
      'LLM은 확률적으로 다음 토큰을 예측하는 모델이라 정확한 개수 세기를 원천적으로 보장 못 해요. 이미 SQL로 100% 정확하게 셀 수 있는 걸 굳이 벡터 검색+생성을 거치면 느려지고 비용만 들고, 할루시네이션 위험만 새로 생겨요. 그래서 정량 질문은 반드시 SQL로 먼저 라우팅해요.',
    ref: 'POST /chat · route=sql (숫자 질문은 벡터로 절대 안 보냄)',
  },
  {
    title: '커버리지 점수·갭 분석·what-if 시뮬레이션',
    reason:
      '"내 스킬 ∩ 시장 요구 스킬"은 정확한 집합 연산이지, 대충 비슷한 걸 찾는 문제가 아니에요. 사용자는 "62.4%"라는 숫자를 그대로 신뢰해야 하는데, 벡터 유사도 기반 생성 답변은 근사치라 매번 미세하게 다른 숫자를 뱉을 수 있어요. 이런 계산은 앞으로도 계속 결정론적 SQL 집계로만 처리해요.',
    ref: 'GET /match/coverage · GET /match/gap · GET /match/what-if',
  },
  {
    title: '기술·자격증 자동완성 드롭다운',
    reason:
      '자동완성은 응답속도가 생명이에요(수십 ms). LLM 추론은 아무리 빨라도 수백 ms~초 단위라 타이핑할 때마다 버벅여요. 게다가 자동완성은 "정해진 사전 안에서" 찾는 폐쇄형 문제라 임베딩의 "의미적 유사성"이 애초에 필요 없고, 오탈자 대응 정도는 훨씬 가벼운 문자열 매칭으로 충분해요.',
    ref: 'GET /skills · GET /certs · taxonomy prefix match',
  },
  {
    title: '운영 대시보드(수집 파이프라인 상태)',
    reason:
      '장애 대응 중인 운영자는 로그와 타임스탬프를 원본 그대로 봐야 해요. 여기에 LLM이 "요약"이나 "괜찮아 보여요" 같은 해석을 덧붙이면, 재해석된 텍스트 때문에 정확한 판단이 늦어질 수 있어요. 상태 조회는 있는 그대로, 가공 없이 보여줘요.',
    ref: 'GET /admin/collector/status · 원본 그대로 노출',
  },
  {
    title: 'DB에 없는 값(합격 확률 등)을 그럴듯하게 답변',
    reason:
      'RAG는 "검색해서 찾은 근거로만 답하는" 구조지, 없는 데이터를 만들어내는 도구가 아니에요. 애초에 실제 합격 여부 데이터 자체가 없는데 "합격 확률 73%" 같은 답을 내놓으면 이건 RAG가 아니라 그냥 할루시네이션이고, 이 프로젝트의 정직 표기 원칙에 정면으로 위배돼요.',
    ref: '근거: cite/05-data-sources.md "합성·보간 없음" 원칙',
  },
]

export default function InsightsSection() {
  return (
    <section className="ds-sec ds-page">
      <div className="ds-sec__head">
        <h2>인사이트·AI</h2>
        <span className="ds-sub">실제 채용 데이터로 답하는 어시스턴트 — 답이 아니라, 답을 만드는 과정을 보여줘요</span>
      </div>

      <RagConsole />

      <div className="rag-guide">
        <div className="rag-guide__head">
          <h3>RAG, 어디에 쓰고 어디엔 안 쓰나</h3>
          <p>이 프로젝트에서 이미 확정된 API 설계(cite/03-api.md) 기준으로, 실제로 검토했던 판단 근거예요.</p>
        </div>

        <div className="rag-guide__col">
          <div className="rag-guide__label rag-guide__label--good">✓ RAG를 쓰는 게 맞는 경우</div>
          {GOOD.map((item) => (
            <div className="rag-guide__item rag-guide__item--good" key={item.title}>
              <div className="rag-guide__title">{item.title}</div>
              <p>{item.reason}</p>
              <div className="rag-guide__ref">{item.ref}</div>
            </div>
          ))}
        </div>

        <div className="rag-guide__col">
          <div className="rag-guide__label rag-guide__label--bad">✕ RAG를 쓰면 오히려 나쁜 경우</div>
          {BAD.map((item) => (
            <div className="rag-guide__item rag-guide__item--bad" key={item.title}>
              <div className="rag-guide__title">{item.title}</div>
              <p>{item.reason}</p>
              <div className="rag-guide__ref">{item.ref}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
