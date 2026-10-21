type Option = { label: string; value: string }

type Props = { options: Option[]; value: string; onChange: (v: string) => void }

export default function PillFilter({ options, value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(o => (
        <button key={o.value} className="button" style={{
          borderRadius: 999, padding: '6px 12px',
          background: value === o.value ? 'var(--brand)' : 'var(--bg-elev)',
          borderColor: value === o.value ? 'transparent' : 'var(--border)'
        }} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

