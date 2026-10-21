type Item = { text: string; tone?: 'positive' | 'negative' }

export default function InsightsTicker({ items }: { items: Item[] }) {
  return (
    <div className="topbar">
      <div className="topbar-inner">
        {items.map((it, i) => (
          <span key={i} className={`chip-lg ${it.tone ?? ''}`}>{it.text}</span>
        ))}
      </div>
    </div>
  )
}
