import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const css = readFileSync(new URL('../src/desktop/pages/market.css', import.meta.url), 'utf8')
const widgets = readFileSync(new URL('../src/career/wowWidgets.tsx', import.meta.url), 'utf8')
const market = readFileSync(new URL('../src/desktop/pages/placeholders.tsx', import.meta.url), 'utf8')

test('시장 흐름 그리드는 다른 시장 그리드와 같은 108px 행 밀도를 유지한다', () => {
  assert.match(
    css,
    /\.dmkt2__sec-grid--flow,\s*\.dmkt2__sec-grid--demand2,[\s\S]*?\.dmkt2__sec-grid--global4\s*\{[^}]*grid-auto-rows:\s*108px;/,
  )
})

test('연도별 레이스 차트는 원래 2×2 카드 안에 들어가는 128px 높이를 사용한다', () => {
  assert.match(widgets, /function BumpChart[\s\S]*?const H = 128\b/)
})

test('연도별 레이스 카드의 글씨와 그래프를 위로 당기는 전용 간격을 사용한다', () => {
  assert.match(market, /className="dcard dcard--demand-race"/)
  assert.match(css, /\.dcard--demand-race \.kit-sec\s*\{[^}]*margin:\s*0 2px 6px;/s)
  assert.match(css, /\.dcard--demand-race \.dmkt2__takeaway\s*\{[^}]*margin:\s*2px 0 0;/s)
  assert.match(widgets, /const W = Math\.max\(width, 320\), padL = 18, padR = 104, padT = 20, padB = 26/)
})

test('연도별 레이스에는 가장 큰 교차의 추월 배지 하나만 표시한다', () => {
  assert.match(widgets, /function computeStrongestOvertake/)
  assert.match(widgets, /if \(!strongest \|\| candidate\.strength > strongest\.strength\) strongest = candidate/)
  assert.match(widgets, /\{overtake && \(/)
  assert.match(widgets, /y=\{overtake\.y - 17\}/)
  assert.equal(widgets.match(/>추월<\/text>/g)?.length, 1)
})

test('순위 이력에 빈 연도가 있으면 연속된 폴백 데이터로 표시한다', () => {
  assert.match(widgets, /const complete = r\.skills\.length >= 5 && r\.skills\.every/)
  assert.match(widgets, /rank != null/)
  assert.match(widgets, /setData\(complete \? r : null\)/)
})

test('그룹 점유율 API가 세 항목 미만이면 불완전 응답으로 보고 기존 목록을 유지한다', () => {
  assert.match(widgets, /if \(cancelled \|\| r\.items\.length < 3\) return/)
})

test('다른 시장 그리드는 기존 108px 행 밀도를 유지한다', () => {
  assert.match(
    css,
    /\.dmkt2__sec-grid--demand2,[\s\S]*?\.dmkt2__sec-grid--global4\s*\{[^}]*grid-auto-rows:\s*108px;/,
  )
})
