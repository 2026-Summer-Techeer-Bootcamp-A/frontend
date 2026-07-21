import type { VizDef } from './types'
import { renderRag } from './viz/rag'
import { renderMatch } from './viz/match'
import { renderHybrid } from './viz/hybrid'
import { renderGraph } from './viz/graph'
import { renderProblem } from './viz/problem'
import { renderSolution } from './viz/solution'
import { renderNavNorthstar } from './viz/nav-northstar'
import { renderVoyagePath } from './viz/voyage-path'
import { renderRagAgentLoop } from './viz/rag-agent-loop'
import { renderEmbeddingNebula } from './viz/embedding-nebula'
import { renderMatchingAlgo } from './viz/matching-algo'
import { renderSplitDiff } from './viz/split-diff'
import { renderDataScale } from './viz/data-scale'
import { renderPerfTuning } from './viz/perf-tuning'
import { renderCicd } from './viz/cicd'
import { resumeStackCleanViz } from './viz/resume-stack-clean'
import { techChipPileViz } from './viz/tech-chip-pile'

export const vizRegistry: VizDef[] = [
  {
    id: 'nav-northstar',
    title: '북극성 항해',
    subtitle: '내 스킬을 49,015건과 매칭해 방향을 계산하다',
    category: 'feature',
    period: 13000,
    render: renderNavNorthstar,
  },
  {
    id: 'voyage-path',
    title: '항로 개척',
    subtitle: '경유 기술을 이어 목표까지 항로를 열다',
    category: 'feature',
    period: 13000,
    render: renderVoyagePath,
  },
  resumeStackCleanViz,
  techChipPileViz,
  {
    id: 'problem-scatter',
    title: '문제 인식',
    subtitle: '이력서에서 뽑힌 기술이 별처럼 흩어짐',
    category: 'feature',
    period: 12500,
    render: renderProblem,
  },
  {
    id: 'solution-workflow',
    title: '해결 워크플로우',
    subtitle: '별자리 → 카테고리 → 배우는 순서 카드',
    category: 'feature',
    period: 16500,
    render: renderSolution,
  },
  {
    id: 'match',
    title: '이력서·공고 매칭률',
    subtitle: '두 카드 연결 + 적합도 롤업',
    category: 'feature',
    period: 7500,
    render: renderMatch,
  },
  {
    id: 'rag',
    title: 'RAG',
    subtitle: '질문 → 임베딩 → 벡터 유사도 검색 → 근거',
    category: 'tech',
    period: 12000,
    render: renderRag,
  },
  {
    id: 'hybrid',
    title: '하이브리드 검색',
    subtitle: 'LLM이 SQL · Graph · Vector 중 도구를 고름',
    category: 'tech',
    period: 11000,
    render: renderHybrid,
  },
  {
    id: 'graph',
    title: '지식 그래프',
    subtitle: '반짝이는 별이 별자리가 됨',
    category: 'tech',
    period: 7000,
    render: renderGraph,
  },
  {
    id: 'rag-agent-loop',
    title: 'RAG 에이전트 루프',
    subtitle: '실제 질의로 도구를 굴리고 근거를 종합하다',
    category: 'tech',
    period: 13000,
    render: renderRagAgentLoop,
  },
  {
    id: 'embedding-nebula',
    title: '임베딩 의미 성운',
    subtitle: '흩어진 점군이 의미 성운으로 수렴',
    category: 'tech',
    period: 12000,
    render: renderEmbeddingNebula,
  },
  {
    id: 'matching-algo',
    title: '매칭 알고리즘',
    subtitle: '가중치로 적합도를 계산하다',
    category: 'tech',
    period: 11000,
    render: renderMatchingAlgo,
  },
  {
    id: 'split-diff',
    title: 'Split Diff',
    subtitle: '이력서 × 공고 원문 대조',
    category: 'tech',
    period: 12000,
    render: renderSplitDiff,
  },
  {
    id: 'data-scale',
    title: '데이터 수집 규모',
    subtitle: '4개 소스 통합',
    category: 'tech',
    period: 6000,
    render: renderDataScale,
  },
  {
    id: 'perf-tuning',
    title: '성능 튜닝',
    subtitle: '27.3초에서 6.1밀리초로',
    category: 'tech',
    period: 6000,
    render: renderPerfTuning,
  },
  {
    id: 'cicd',
    title: 'CI/CD 파이프라인',
    subtitle: '커밋에서 배포까지',
    category: 'tech',
    period: 8000,
    render: renderCicd,
  },
]
