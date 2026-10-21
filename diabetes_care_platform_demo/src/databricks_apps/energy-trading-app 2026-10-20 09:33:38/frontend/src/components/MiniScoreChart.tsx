import { useEffect, useRef, useState } from 'react'

type Mode = 'DoD'|'WoW'|'MoM'|'YoY'

type Props = { dates: string[]; scores: number[]; color: string; width?: number; height?: number; mode?: Mode; windowDays?: number }

function fmtDate(d: string, mode: Mode) {
  const dt = new Date(d)
  if (mode === 'DoD') return dt.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit', year: '2-digit' })
  if (mode === 'MoM') return dt.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
  if (mode === 'YoY') return `${dt.getFullYear()}`
  const tmp = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()))
  const dayNum = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(),0,1))
  const weekNo = Math.ceil((((tmp as any) - (yearStart as any)) / 86400000 + 1)/7)
  return `W${weekNo}`
}

function bucketKey(d: Date, mode: Mode): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  if (mode === 'DoD') return `${y}-${m}-${day}`
  if (mode === 'MoM') return `${y}-${m}`
  if (mode === 'YoY') return `${y}`
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(),0,1))
  const weekNo = Math.ceil((((tmp as any) - (yearStart as any)) / 86400000 + 1)/7)
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2,'0')}`
}

export default function MiniScoreChart({ dates, scores, color, width, height = 80, mode = 'DoD', windowDays }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [w, setW] = useState<number>(width || 300)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<{ text: string; x: number; visible: boolean }>({ text: '', x: 0, visible: false })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new (window as any).ResizeObserver((entries: any) => {
      for (const entry of entries) {
        const newW = entry.contentRect.width
        if (newW && Math.abs(newW - w) > 1) setW(newW)
      }
    })
    ro.observe(el)
    setW(el.clientWidth || w)
    return () => ro.disconnect()
  }, [])

  if (!scores.length || !dates.length) return null

  const dObjs = dates.map(d => new Date(d))
  let startIdx = 0
  if (windowDays && dObjs.length) {
    const end = dObjs[dObjs.length - 1].getTime()
    const startTs = end - windowDays * 24 * 3600 * 1000
    startIdx = dObjs.findIndex(dt => dt.getTime() >= startTs)
    if (startIdx < 0) startIdx = 0
  }

  const sums = new Map<string, { sum: number; c: number; anyDate: Date }>()
  for (let i = startIdx; i < dates.length; i++) {
    const dt = dObjs[i]
    const key = bucketKey(dt, mode)
    const cur = sums.get(key) || { sum: 0, c: 0, anyDate: dt }
    cur.sum += Math.max(0, Math.min(100, Math.round(scores[i])))
    cur.c += 1
    cur.anyDate = dt
    sums.set(key, cur)
  }
  const bucketEntries = Array.from(sums.entries()).sort((a, b) => a[1].anyDate.getTime() - b[1].anyDate.getTime())
  const aggScores = bucketEntries.map(([, v]) => Math.round(v.sum / (v.c || 1)))
  const aggDates = bucketEntries.map(([, v]) => v.anyDate.toISOString().slice(0,10))

  const n = aggScores.length
  if (n === 0) return null

  const padX = 12
  const padTop = 10
  const padBottom = 22
  const innerW = Math.max(1, w - padX * 2)
  const innerH = Math.max(1, height - padTop - padBottom)
  const dx = n > 1 ? innerW / (n - 1) : innerW
  const scaleY = (v: number) => padTop + (100 - v) / 100 * innerH

  const points = aggScores.map((v, i) => `${i * dx + padX},${scaleY(v)}`).join(' ')

  const startLabel = fmtDate(aggDates[0], mode)
  const endLabel = fmtDate(aggDates[aggDates.length - 1], mode)

  const gridVals = [0, 25, 50, 75, 100]

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const idx = Math.max(0, Math.min(n - 1, Math.round((x - padX) / dx)))
    setHoverIdx(idx)
    setTooltip({ text: `${fmtDate(aggDates[idx], mode)} · ${aggScores[idx]}`, x: Math.min(w - 140, Math.max(0, x)), visible: true })
  }

  const onLeave = () => {
    setHoverIdx(null)
    setTooltip(t => ({ ...t, visible: false }))
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} onMouseMove={onMove} onMouseLeave={onLeave}>
        {gridVals.map(v => (
          <line key={v} x1={padX} y1={scaleY(v)} x2={w - padX} y2={scaleY(v)} stroke="var(--border)" strokeWidth="1" opacity={v % 50 === 0 ? 0.5 : 0.2} />
        ))}
        <polyline fill="none" stroke={color} strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round" points={points} />
        {aggScores.map((v, i) => (
          <circle key={i} cx={i * dx + padX} cy={scaleY(v)} r={hoverIdx === i ? 3.8 : 2.4} fill={color} style={{ transition: 'r .12s ease' }} />
        ))}
        {hoverIdx !== null && (
          <line x1={hoverIdx * dx + padX} y1={padTop} x2={hoverIdx * dx + padX} y2={padTop + innerH} stroke={color} strokeWidth="1.2" opacity={0.35} />
        )}
        <text x={padX} y={padTop} fill="var(--muted)" fontSize="9">Score</text>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: 10 }}>
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
      <div className="mini-tooltip" style={{ position: 'absolute', pointerEvents: 'none', opacity: tooltip.visible ? 1 : 0, transition: 'opacity .12s ease', background: 'var(--bg-elev)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px', fontSize: 10, boxShadow: 'var(--shadow-sm)', left: tooltip.x, top: -24 }}>
        {tooltip.text}
      </div>
    </div>
  )
}
