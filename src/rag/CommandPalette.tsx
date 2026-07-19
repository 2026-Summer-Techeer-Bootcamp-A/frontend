import { ArrowRight, Compass, Database, ExternalLink, Scale, Search } from 'lucide-react'
import type { ChatAttachment } from './chatContract'
import { SCENARIOS } from './demoScenarios'
import { defaultQuestionFor } from './useAttachments'
import AttachmentChip from './AttachmentChip'

// 2c 커맨드 팔레트 빈 상태 — 옛 카드 그리드 히어로(RcEmptyState)를 대체한다. 실제 컴포저
// textarea 값(input)을 그대로 받아 demoScenarios를 실시간 필터링해 보여준다(별도 입력창을
// 새로 만들지 않는다 — 진짜 전송에 쓰이는 그 textarea가 화면 중앙 팔레트 자리에서도 그대로
// 보이도록 RagConsole이 배치만 조정한다).
//
// 4c 첨부 딥링크 착지 — 외부 화면에서 첨부 의도를 들고 들어온 경우(landedFrom이 있으면) 팔레트
// 위에 배너 + 첨부 칩을 얹고, 목록도 범용 시나리오 대신 첨부 조합에 맞춘 제안 3개로 바꾼다.

interface CommandPaletteProps {
  isAuthed: boolean
  nickname: string | null | undefined
  busy: boolean
  input: string
  attachments: ChatAttachment[]
  landedFrom: string | null
  onRemoveAttachment: (kind: ChatAttachment['kind'], id: number) => void
  onPick: (question: string) => void
}

function iconForQuestion(q: string) {
  if (q.includes('비교')) return Scale
  if (q.includes('추천') || q.includes('찾아') || q.includes('있어')) return ExternalLink
  return Search
}

// 첨부 조합별 맞춤 제안 3개 — defaultQuestionFor(가장 자연스러운 기본 질문)를 1번으로 쓰고,
// 같은 맥락에서 실제로 물어볼 법한 변형 질문 2개를 더한다.
function landingSuggestions(attachments: ChatAttachment[]): string[] {
  const resumeCount = attachments.filter((a) => a.kind === 'resume').length
  const postingCount = attachments.filter((a) => a.kind === 'posting').length
  const base = defaultQuestionFor(attachments)
  const out: string[] = base ? [base] : []

  if (resumeCount === 1 && postingCount === 1) {
    out.push('이 공고에 지원하려면 뭐가 부족해?', '내가 이 공고에 얼마나 잘 맞을까?')
  } else if (resumeCount === 1 && postingCount === 0) {
    out.push('내 이력서에 부족한 기술이 뭐야?', '내 이력서로 지원할 만한 공고 추천해줘')
  } else if (resumeCount === 0 && postingCount === 1) {
    out.push('이 공고랑 비슷한 다른 공고 있어?', '이 공고가 시장에서 어느 정도 위치야?')
  } else if (resumeCount === 0 && postingCount >= 2) {
    out.push('공통으로 요구하는 기술이 뭐야?', '어느 공고가 더 신입 친화적이야?')
  } else if (resumeCount === 1 && postingCount >= 2) {
    out.push('가장 적합도가 높은 공고는 어디야?', '부족한 기술이 겹치는 공고가 있어?')
  }
  return out.slice(0, 3)
}

export default function CommandPalette({
  isAuthed,
  nickname,
  busy,
  input,
  attachments,
  landedFrom,
  onRemoveAttachment,
  onPick,
}: CommandPaletteProps) {
  const greeting = isAuthed
    ? `${nickname ?? '리버'}님, 오늘은 뭘 볼까요?`
    : '채용 시장에 대해 무엇이든 물어보세요'

  const query = input.trim().toLowerCase()
  const filtered = query
    ? SCENARIOS.filter((s) => s.chip.toLowerCase().includes(query) || s.userQ.toLowerCase().includes(query))
    : SCENARIOS

  return (
    <div className="rc__hero">
      <span className="rc__hero-badge"><Compass size={20} /></span>
      <div className="rc__hero-greet">{greeting}</div>
      <div className="rc__hero-sub">채용 시장, 이력서, 기술 트렌드 — 실제 데이터로 답해드려요.</div>

      {landedFrom && (
        <>
          <div className="rc__land-banner">
            <ExternalLink size={15} aria-hidden="true" />
            <span><b>{landedFrom}</b>에서 넘어왔어요</span>
          </div>
          {attachments.length > 0 && (
            <div className="rc__land-achips">
              {attachments.map((a) => (
                <AttachmentChip key={`${a.kind}-${a.id}`} attachment={a} onRemove={() => onRemoveAttachment(a.kind, a.id)} />
              ))}
            </div>
          )}
        </>
      )}

      <div className="rc__palette">
        {landedFrom ? (
          <>
            <div className="rc__palette-group-h">이렇게 물어볼 수 있어요</div>
            {landingSuggestions(attachments).map((q) => {
              const Icon = iconForQuestion(q)
              return (
                <button key={q} type="button" className="rc__palette-item" disabled={busy} onClick={() => onPick(q)}>
                  <span className="rc__palette-ic"><Icon size={14} aria-hidden="true" /></span>
                  <span className="rc__palette-text">
                    <span className="rc__palette-title">{q}</span>
                  </span>
                  <ArrowRight size={14} className="rc__palette-sub" aria-hidden="true" />
                </button>
              )
            })}
          </>
        ) : (
          <>
            <div className="rc__palette-group-h">{query ? '이렇게 할 수 있어요' : '무엇이든 물어보세요'}</div>
            {filtered.length === 0 ? (
              <div className="rc__palette-empty">일치하는 추천이 없어요 — 입력한 그대로 물어봐도 돼요.</div>
            ) : (
              filtered.map((s) => {
                const Icon = s.route === 'sql' ? Database : Search
                return (
                  <button key={s.id} type="button" className="rc__palette-item" disabled={busy} onClick={() => onPick(s.userQ)}>
                    <span className="rc__palette-ic"><Icon size={14} aria-hidden="true" /></span>
                    <span className="rc__palette-text">
                      <span className="rc__palette-title">{s.userQ}</span>
                      <span className="rc__palette-sub">{s.chip}</span>
                    </span>
                  </button>
                )
              })
            )}
          </>
        )}
      </div>
    </div>
  )
}
