interface IceCrackDividerProps {
  className?: string
  vertical?: boolean
}

export function IceCrackDivider({ className = '', vertical = false }: IceCrackDividerProps) {
  return (
    <svg className={`flex-shrink-0 ${vertical ? 'w-1 h-full' : 'w-full h-1'} ${className}`} viewBox={vertical ? "0 0 10 200" : "0 200 10 0"}>
      <g stroke="#9E1F36" strokeWidth="0.5" fill="none">
        {vertical ? (
          <>
            <path d="M5,0 L5,30 L2,45 L5,60 L8,75 L5,90 L3,105 L5,120 L7,135 L5,150 L4,165 L5,180 L6,195 L5,200" />
            <path d="M5,25 L8,35 L5,45 L3,55" />
            <path d="M5,70 L2,80 L5,90 L8,100" />
            <path d="M5,125 L7,135 L5,145 L3,155" />
            <path d="M5,170 L8,180 L5,190" />
          </>
        ) : (
          <>
            <path d="M0,5 L30,5 L45,2 L60,5 L75,8 L90,5 L105,3 L120,5 L135,7 L150,5 L165,4 L180,5 L195,6 L200,5" />
            <path d="M25,5 L35,8 L45,5 L55,3" />
            <path d="M70,5 L80,2 L90,5 L100,8" />
            <path d="M125,5 L135,7 L145,5 L155,3" />
            <path d="M170,5 L180,8 L190,5" />
          </>
        )}
      </g>
    </svg>
  )
}

export function BranchDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-8 ${className}`}>
      <svg className="w-32 h-8" viewBox="0 0 120 30">
        <path d="M0,15 Q30,5 60,15 Q90,25 120,15" stroke="#9E1F36" strokeWidth="1" fill="none" />
        <circle cx="60" cy="15" r="3" fill="#F4C430" />
        <path d="M45,10 Q50,5 55,10" stroke="#1A365D" strokeWidth="0.5" fill="none" />
        <path d="M75,20 Q70,25 65,20" stroke="#1A365D" strokeWidth="0.5" fill="none" />
        <path d="M30,18 Q25,22 20,18" stroke="#1A365D" strokeWidth="0.5" fill="none" />
        <path d="M90,12 Q95,8 100,12" stroke="#1A365D" strokeWidth="0.5" fill="none" />
      </svg>
    </div>
  )
}

export function MeanderDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-6 ${className}`}>
      <svg className="w-48 h-6" viewBox="0 0 192 24">
        <path
          d="M0,12 L24,12 L24,0 L48,0 L48,12 L72,12 L72,24 L96,24 L96,12 L120,12 L120,0 L144,0 L144,12 L168,12 L168,24 L192,24"
          stroke="#9E1F36"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M12,12 L12,0 L36,0 L36,12 L60,12 L60,24 L84,24 L84,12 L108,12 L108,0 L132,0 L132,12 L156,12 L156,24 L180,24"
          stroke="#F4C430"
          strokeWidth="0.5"
          fill="none"
        />
      </svg>
    </div>
  )
}

export function CloudDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-6 ${className}`}>
      <svg className="w-40 h-10" viewBox="0 0 160 40">
        <g fill="none" stroke="#9E1F36" strokeWidth="1">
          <path d="M10,20 Q20,10 35,15 Q45,5 55,15 Q65,5 75,15 Q85,10 95,20" />
          <path d="M75,20 Q85,30 100,25 Q110,35 120,25 Q130,35 140,25 Q150,30 160,20" />
          <path d="M35,15 Q40,25 55,20 Q60,30 75,25" />
          <path d="M100,25 Q105,35 120,30 Q125,40 140,35" />
        </g>
        <circle cx="60" cy="20" r="2" fill="#F4C430" />
        <circle cx="130" cy="20" r="2" fill="#F4C430" />
      </svg>
    </div>
  )
}

export function LotusDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-6 ${className}`}>
      <svg className="w-36 h-12" viewBox="0 0 144 48">
        <g fill="none" stroke="#9E1F36" strokeWidth="1">
          <ellipse cx="72" cy="24" rx="60" ry="8" />
          <path d="M72,24 L72,48" />
          <path d="M52,24 Q40,30 30,24" />
          <path d="M92,24 Q104,30 114,24" />
          <path d="M72,16 Q62,8 72,0 Q82,8 72,16" />
          <path d="M58,18 Q50,10 58,2" />
          <path d="M86,18 Q94,10 86,2" />
        </g>
        <circle cx="72" cy="24" r="3" fill="#F4C430" />
      </svg>
    </div>
  )
}

export function WaveDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-6 ${className}`}>
      <svg className="w-48 h-8" viewBox="0 0 192 32">
        <g fill="none" stroke="#9E1F36" strokeWidth="1">
          <path d="M0,16 Q12,8 24,16 Q36,24 48,16 Q60,8 72,16 Q84,24 96,16 Q108,8 120,16 Q132,24 144,16 Q156,8 168,16 Q180,24 192,16" />
          <path d="M0,20 Q12,12 24,20 Q36,28 48,20 Q60,12 72,20 Q84,28 96,20 Q108,12 120,20 Q132,28 144,20 Q156,12 168,20 Q180,28 192,20" />
        </g>
      </svg>
    </div>
  )
}
