import { useState } from 'react'
import { FileText, RotateCcw, Search } from 'lucide-react'

import { SegmentedControl } from '../../career/kit'
import type { DeadlineDays, JobPool, JobSort } from './jobsFilterState'
import { DEADLINE_OPTIONS } from './jobsFilterState'

export type TechFilterGroup = { cat: string; label: string; techs: string[] }
export type PositionFilterOption = { value: string; label: string }
export type RegionFilterOption = { value: string; count: number }

type Props = {
  hasResume: boolean
  resumeTitle?: string
  onResumeRegister: () => void
  query: string
  onQueryChange: (value: string) => void
  pool: JobPool
  onPoolChange: (value: JobPool) => void
  skillQuery: string
  onSkillQueryChange: (value: string) => void
  skillGroups: TechFilterGroup[]
  selectedSkills: ReadonlySet<string>
  onToggleSkill: (skill: string) => void
  onClearSkills: () => void
  position: string
  positionOptions: PositionFilterOption[]
  onPositionChange: (value: string) => void
  district: string
  regionOptions: RegionFilterOption[]
  onDistrictChange: (value: string) => void
  deadlineDays?: DeadlineDays
  onDeadlineDaysChange: (value?: DeadlineDays) => void
  sort: JobSort
  onSortChange: (value: JobSort) => void
  onReset: () => void
  total: number
}

function TechGroup({
  group,
  defaultExpanded,
  selectedSkills,
  onToggleSkill,
}: {
  group: TechFilterGroup
  defaultExpanded: boolean
  selectedSkills: ReadonlySet<string>
  onToggleSkill: (skill: string) => void
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <details
      className="djobs__techgroup"
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary className="djobs__techgroup-l">{group.label}<span>{group.techs.length}</span></summary>
      <div className="djobs__chiprow">
        {group.techs.map((tech) => (
          <button
            type="button"
            key={tech}
            className={selectedSkills.has(tech) ? 'on' : ''}
            aria-pressed={selectedSkills.has(tech)}
            onClick={() => onToggleSkill(tech)}
          >
            {tech}
          </button>
        ))}
      </div>
    </details>
  )
}

export default function JobsFilterPanel({
  hasResume,
  resumeTitle,
  onResumeRegister,
  query,
  onQueryChange,
  pool,
  onPoolChange,
  skillQuery,
  onSkillQueryChange,
  skillGroups,
  selectedSkills,
  onToggleSkill,
  onClearSkills,
  position,
  positionOptions,
  onPositionChange,
  district,
  regionOptions,
  onDistrictChange,
  deadlineDays,
  onDeadlineDaysChange,
  sort,
  onSortChange,
  onReset,
  total,
}: Props) {
  const domestic = pool === '국내'

  return (
    <aside className="dcard djobs__filters">
      {!hasResume ? (
        <div className="djobs__resume-cta">
          <span>이력서를 등록하면 내 기술과 맞는 공고를 확인할 수 있어요</span>
          <button type="button" onClick={onResumeRegister}>이력서 등록하기</button>
        </div>
      ) : (
        <div className="djobs__fld">
          <span className="djobs__fld-l">이력서 매칭 적용</span>
          <div className="djobs__resume-active">
            <FileText size={14} /> {resumeTitle} 기준 매칭도를 표시하고 있어요
          </div>
        </div>
      )}

      <label className="djobs__search">
        <Search size={16} />
        <input
          aria-label="회사·공고 검색"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="회사 · 공고 검색"
        />
      </label>

      <div className="djobs__fld">
        <span className="djobs__fld-l">채용 풀</span>
        <SegmentedControl
          value={pool}
          onChange={(value) => onPoolChange(value as JobPool)}
          options={[{ key: '국내', label: '국내' }, { key: '국외', label: '글로벌' }]}
        />
      </div>

      <div className="djobs__fld">
        <div className="djobs__fld-head">
          <span className="djobs__fld-l">기술 스택</span>
          {selectedSkills.size > 0 && (
            <button type="button" className="djobs__text-btn" onClick={onClearSkills}>선택 해제</button>
          )}
        </div>
        <label className="djobs__skill-search">
          <Search size={14} />
          <input
            aria-label="기술 스택 검색"
            value={skillQuery}
            onChange={(event) => onSkillQueryChange(event.target.value)}
            placeholder="기술 검색"
          />
        </label>
        {selectedSkills.size > 0 && (
          <div className="djobs__selected-summary">선택 {selectedSkills.size}개 · 하나 이상 포함된 공고</div>
        )}
        <div className="djobs__techgroups">
          {skillGroups.length === 0 ? (
            <span className="djobs__filter-empty">검색된 기술이 없어요.</span>
          ) : skillGroups.map((group, index) => (
            <TechGroup
              key={`${skillQuery.trim() ? 'search' : 'browse'}-${group.cat}`}
              group={group}
              defaultExpanded={skillQuery.trim().length > 0 || group.techs.some((tech) => selectedSkills.has(tech)) || index === 0}
              selectedSkills={selectedSkills}
              onToggleSkill={onToggleSkill}
            />
          ))}
        </div>
      </div>

      <div className="djobs__fld">
        <span className="djobs__fld-l">직무</span>
        <select aria-label="직무" className="djobs__select" value={position} onChange={(event) => onPositionChange(event.target.value)}>
          <option value="">전체</option>
          {positionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>

      {domestic && (
        <div className="djobs__fld">
          <span className="djobs__fld-l">지역</span>
          <select aria-label="지역" className="djobs__select" value={district} onChange={(event) => onDistrictChange(event.target.value)}>
            <option value="">전체</option>
            {regionOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.value} ({option.count.toLocaleString()})</option>
            ))}
          </select>
        </div>
      )}

      {domestic && (
        <div className="djobs__fld">
          <span className="djobs__fld-l">마감 임박</span>
          <select
            aria-label="마감 임박"
            className="djobs__select"
            value={deadlineDays ?? ''}
            onChange={(event) => onDeadlineDaysChange(event.target.value ? Number(event.target.value) as DeadlineDays : undefined)}
          >
            <option value="">전체</option>
            {DEADLINE_OPTIONS.map((days) => <option key={days} value={days}>{days}일 이내</option>)}
          </select>
          {deadlineDays && <span className="djobs__filter-note">마감일이 등록된 공고만 표시됩니다.</span>}
        </div>
      )}

      <div className="djobs__fld">
        <span className="djobs__fld-l">정렬</span>
        <div className="djobs__sorts">
          {hasResume && <button type="button" className={sort === 'match' ? 'on' : ''} onClick={() => onSortChange('match')}>매칭순</button>}
          <button type="button" className={sort === 'latest' ? 'on' : ''} onClick={() => onSortChange('latest')}>최신순</button>
          {domestic && <button type="button" className={sort === 'deadline' ? 'on' : ''} onClick={() => onSortChange('deadline')}>마감순</button>}
        </div>
      </div>

      <div className="djobs__filter-foot">
        <span className="djobs__count">{total.toLocaleString()}건</span>
        <button type="button" className="djobs__reset" onClick={onReset}><RotateCcw size={13} /> 전체 초기화</button>
      </div>
    </aside>
  )
}
