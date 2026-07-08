import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud, Check } from 'lucide-react'
import { SubScreen } from './charts'

type Mode = 'form' | 'pdf'

export default function ResumeSubmit() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('form')
  const [position, setPosition] = useState('Backend Engineer')
  const [career2, setCareer] = useState('3')
  const [parsed, setParsed] = useState(false)

  return (
    <SubScreen title="이력서 제출">
      <div className="scr-segfull">
        <button className={mode === 'form' ? 'on' : ''} onClick={() => setMode('form')}>직접 입력</button>
        <button className={mode === 'pdf' ? 'on' : ''} onClick={() => setMode('pdf')}>PDF 업로드</button>
      </div>

      {mode === 'pdf' && !parsed ? (
        <div className="scr-upload" onClick={() => { setParsed(true); setMode('form') }}>
          <UploadCloud size={30} style={{ color: 'var(--c-accent)' }} />
          <div style={{ marginTop: 8 }}><b>이력서 PDF</b>를 올려주세요</div>
          <div style={{ fontSize: 11.5, marginTop: 4 }}>기술·포지션·연차를 자동 추출해요 (탭해서 데모 실행)</div>
        </div>
      ) : (
        <>
          {parsed && (
            <div className="scr-excluded" style={{ background: '#e6f5ed', color: '#1c7a4d' }}>
              <Check size={13} style={{ verticalAlign: -2 }} /> PDF에서 기술을 추출했어요.
            </div>
          )}

          <div className="scr-field">
            <label className="scr-field__lbl">희망 포지션</label>
            <input className="scr-input" value={position} onChange={(e) => setPosition(e.target.value)} />
          </div>

          <div className="scr-field">
            <label className="scr-field__lbl">경력 (년)</label>
            <input className="scr-input" type="number" min={0} value={career2} onChange={(e) => setCareer(e.target.value)} />
          </div>

          <div className="scr-note">
            보유 기술은 <b>마이 &gt; 보유 기술</b>에서 추가·삭제해요. 사전 외 기술은 매칭 계산에서 제외되며 조용히 버리지 않고 표시돼요.
          </div>
          <div className="scr-note" style={{ marginTop: 10 }}>
            🔒 이력서 원문은 서버에 저장하지 않아요. 매칭에 필요한 기술셋·포지션·연차만 사용해요.
          </div>

          <button className="scr-primary" onClick={() => navigate('/resume')}>확인하고 마이로</button>
        </>
      )}
      <div style={{ height: 20 }} />
    </SubScreen>
  )
}
