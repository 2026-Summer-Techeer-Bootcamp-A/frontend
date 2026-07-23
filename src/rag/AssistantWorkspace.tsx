import { useState, useEffect } from 'react'
import { ChevronsLeft, ChevronsRight, GripVertical, Lock } from 'lucide-react'
import ResumeInsight from './ResumeInsight'
import RagConsole from './RagConsole'
import { useAuth } from '../career/authStore'
import { useLoginModal } from '../career/LoginModalContext'
import './assistant-workspace.css'

// 통합 어시스턴트 화면 — 이력서 분석(왼쪽)과 AI 콘솔(오른쪽)을 한 화면에서 나란히 보여준다.
// 비로그인 상태에선 로그인 유도 및 모달이 노출된다.

type Collapsed = 'none' | 'left' | 'right'

export default function AssistantWorkspace() {
  const [collapsed, setCollapsed] = useState<Collapsed>('none')
  const { isAuthed } = useAuth()
  const { openLoginModal } = useLoginModal()

  useEffect(() => {
    if (!isAuthed) {
      openLoginModal('사용하려면 로그인이 필요합니다')
    }
  }, [isAuthed])

  if (!isAuthed) {
    return (
      <div className="aw aw--guest">
        <div className="aw__guest-card">
          <div className="aw__guest-icon">
            <Lock size={28} />
          </div>
          <h2 className="aw__guest-title">사용하려면 로그인이 필요합니다</h2>
          <p className="aw__guest-desc">
            커리어 어시스턴트는 AI 기반 이력서 분석 및 RAG 질의응답을 제공합니다.
            서비스를 이용하시려면 먼저 로그인해 주세요.
          </p>
          <button
            type="button"
            className="aw__guest-btn"
            onClick={() => openLoginModal('사용하려면 로그인이 필요합니다')}
          >
            로그인하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="aw">
      <div className="aw__row">
        <section
          className={`aw__pane aw__pane--left${collapsed === 'right' ? ' aw__pane--solo' : ''}${collapsed === 'left' ? ' aw__pane--collapsed' : ''}`}
          aria-label="데이터 기반 이력서 요약 · 시각화"
          aria-hidden={collapsed === 'left'}
        >
          <ResumeInsight />
        </section>

        {collapsed === 'left' && (
          <button
            type="button"
            className="aw__restore aw__restore--left"
            onClick={() => setCollapsed('none')}
            aria-label="이력서 패널 펼치기"
          >
            <ChevronsRight size={16} />
          </button>
        )}

        {collapsed === 'none' && (
          <div className="aw__divider" role="separator" aria-orientation="vertical">
            <button type="button" className="aw__divider-btn" onClick={() => setCollapsed('left')} aria-label="이력서 패널 접기">
              <ChevronsLeft size={17} />
            </button>
            <span className="aw__divider-grip" aria-hidden="true"><GripVertical size={14} /></span>
            <button type="button" className="aw__divider-btn" onClick={() => setCollapsed('right')} aria-label="어시스턴트 패널 접기">
              <ChevronsRight size={17} />
            </button>
          </div>
        )}

        <section
          className={`aw__pane aw__pane--right${collapsed === 'left' ? ' aw__pane--solo' : ''}${collapsed === 'right' ? ' aw__pane--collapsed' : ''}`}
          aria-label="어시스턴트 채팅"
          aria-hidden={collapsed === 'right'}
        >
          <RagConsole />
        </section>

        {collapsed === 'right' && (
          <button
            type="button"
            className="aw__restore aw__restore--right"
            onClick={() => setCollapsed('none')}
            aria-label="어시스턴트 패널 펼치기"
          >
            <ChevronsLeft size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
