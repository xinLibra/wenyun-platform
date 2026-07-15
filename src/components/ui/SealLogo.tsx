interface SealLogoProps {
  size?: number
  darkMode?: boolean
}

export function SealLogo({ size = 56, darkMode = false }: SealLogoProps) {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/logo-icon.svg"
        alt="纹韵"
        className={`h-auto object-contain ${darkMode ? 'text-ming-yellow' : 'text-palace-red'}`}
        style={{ width: size }}
      />
      <div className="flex flex-col leading-tight">
        <img
          src="/logo-text.svg"
          alt="纹韵"
          className={`h-auto object-contain ${darkMode ? 'text-rice-paper' : 'text-deep-blue'}`}
          style={{ width: size * 2.5 }}
        />
      </div>
    </div>
  )
}