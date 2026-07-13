import { useState } from 'react'
import { ChevronsLeft, ChevronsRight, GripVertical } from 'lucide-react'
import ResumeInsight from './ResumeInsight'
import RagConsole from './RagConsole'
import './assistant-workspace.css'

// 통합 어시스턴트 화면 — 이력서 분석(왼쪽)과 AI 콘솔(오른쪽)을 한 화면에서 나란히 보여준다.
// 예전엔 /assistant, /assistant/resume 두 탭을 오가야 했는데, 실제로는 이력서를 분석하면서
// 바로 그 결과를 근거로 어시스턴트에 이어 물어보는 흐름이 자연스러워 한 화면으로 합쳤다.
// 기본 40/60 분할, 가운데 디바이더의 버튼으로 어느 한쪽을 접어 나머지가 폭 전체를 차지하게 할 수 있다.

type Collapsed = 'none' | 'left' | 'right'

export default function AssistantWorkspace() {
  const [collapsed, setCollapsed] = useState<Collapsed>('none')

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
          <button type="button" className="aw__rail" onClick={() => setCollapsed('none')} aria-label="이력서 패널 펼치기">
            <ChevronsRight size={14} />
            <span className="aw__rail-label">이력서 요약</span>
          </button>
        )}

        {collapsed === 'none' && (
          <div className="aw__divider" role="separator" aria-orientation="vertical">
            <button type="button" className="aw__divider-btn" onClick={() => setCollapsed('left')} aria-label="이력서 패널 접기">
              <ChevronsLeft size={13} />
            </button>
            <span className="aw__divider-grip" aria-hidden="true"><GripVertical size={12} /></span>
            <button type="button" className="aw__divider-btn" onClick={() => setCollapsed('right')} aria-label="어시스턴트 패널 접기">
              <ChevronsRight size={13} />
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
          <button type="button" className="aw__rail" onClick={() => setCollapsed('none')} aria-label="어시스턴트 패널 펼치기">
            <span className="aw__rail-label">어시스턴트</span>
            <ChevronsLeft size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
