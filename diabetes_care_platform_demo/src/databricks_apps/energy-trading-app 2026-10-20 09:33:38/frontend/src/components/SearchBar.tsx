import { useState } from 'react'

type Props = { placeholder?: string; onChange: (value: string) => void }

export default function SearchBar({ placeholder = 'Search…', onChange }: Props) {
  const [q, setQ] = useState('')
  return (
    <input
      value={q}
      onChange={e => { setQ(e.target.value); onChange(e.target.value) }}
      placeholder={placeholder}
      style={{
        width: '100%', maxWidth: 360, padding: '10px 12px',
        borderRadius: 10, border: '1px solid var(--border)',
        background: 'var(--bg-elev)', color: 'var(--text)'
      }}
    />
  )
}

