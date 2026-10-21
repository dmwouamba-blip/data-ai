import { useState, useEffect } from 'react'

/**
 * Composant de contrôle du thème pour la sidebar
 */
export default function ThemeControl() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    const shouldBeDark = saved ? saved === 'dark' : systemPrefersDark
    setIsDark(shouldBeDark)
    applyTheme(shouldBeDark)
  }, [])

  const applyTheme = (dark: boolean) => {
    const root = document.documentElement
    if (dark) {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', 'light')
    }
  }

  const handleThemeToggle = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    applyTheme(newIsDark)
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light')
  }

  return (
    <button
      onClick={handleThemeToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 10,
        color: 'var(--text)',
        textDecoration: 'none',
        border: '1px solid var(--border)',
        background: 'var(--bg-elev)',
        cursor: 'pointer',
        width: '100%',
        fontSize: 14,
        fontWeight: 500,
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--card)'
        e.currentTarget.style.transform = 'translateX(2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--bg-elev)'
        e.currentTarget.style.transform = 'translateX(0)'
      }}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {/* Theme Toggle Component */}
      <div style={{
        width: 32,
        height: 18,
        borderRadius: 9,
        background: isDark 
          ? 'linear-gradient(135deg, #374151, #1f2937)' 
          : 'linear-gradient(135deg, #e5e7eb, #d1d5db)',
        border: `1px solid ${isDark ? '#4b5563' : '#9ca3af'}`,
        position: 'relative',
        transition: 'all 0.3s ease',
        flexShrink: 0
      }}>
        <div style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: isDark 
            ? 'linear-gradient(135deg, #1f2937, #111827)' 
            : 'linear-gradient(135deg, #ffffff, #f9fafb)',
          position: 'absolute',
          top: 1,
          left: isDark ? 1 : 16,
          transition: 'all 0.3s ease',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 8
        }}>
          {isDark ? '🌙' : '☀️'}
        </div>
      </div>
      
      <span>{isDark ? 'Dark' : 'Light'} Mode</span>
    </button>
  )
}
