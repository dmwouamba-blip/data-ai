import { useEffect, useState } from 'react'

const STORAGE_KEY = 'theme'

type Theme = 'dark' | 'light'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as Theme) || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved === 'light' ? 'light' : 'dark')
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next === 'light' ? 'light' : 'dark')
    localStorage.setItem(STORAGE_KEY, next)
  }

  return (
    <button className="button" onClick={toggle} aria-label="Toggle theme">
      {theme === 'dark' ? 'Light' : 'Dark'} mode
    </button>
  )
}

