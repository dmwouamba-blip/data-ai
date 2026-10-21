type Props = { height?: number | string; width?: number | string; radius?: number }
export default function Skeleton({ height = 16, width = '100%', radius = 8 }: Props) {
  return (
    <div style={{
      height, width, borderRadius: radius,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.12), rgba(255,255,255,0.06))',
      backgroundSize: '200% 100%', animation: 'sk 1.2s ease-in-out infinite'
    }} />
  )
}

/* keyframes are global in CSS, but include fallback here for clarity */
const style = document.createElement('style')
style.innerHTML = `@keyframes sk { 0%{background-position: 200% 0} 100%{background-position: -200% 0} }`
document.head.appendChild(style)

