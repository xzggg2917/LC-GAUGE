import React from 'react'

interface GaugeIconProps {
  className?: string
  size?: number
}

const GaugeIcon: React.FC<GaugeIconProps> = ({ className, size = 120 }) => {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 外圈装饰线 */}
      <path
        d="M 30 170 Q 20 140 20 100 Q 20 45 60 20"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 140 20 Q 180 45 180 100 Q 180 140 170 170"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      
      {/* 红色区域 (危险区) */}
      <path
        d="M 45 155 A 80 80 0 0 1 65 75"
        stroke="#ef4444"
        strokeWidth="20"
        fill="none"
        strokeLinecap="round"
      />
      
      {/* 橙色区域 (警告区) */}
      <path
        d="M 68 73 A 80 80 0 0 1 100 55"
        stroke="#f59e0b"
        strokeWidth="20"
        fill="none"
        strokeLinecap="round"
      />
      
      {/* 绿色区域 (安全区) */}
      <path
        d="M 103 55 A 80 80 0 0 1 155 155"
        stroke="#10b981"
        strokeWidth="20"
        fill="none"
        strokeLinecap="round"
      />
      
      {/* 中心圆盘 */}
      <circle cx="100" cy="100" r="65" fill="white" opacity="0.95" />
      <circle cx="100" cy="100" r="55" fill="white" />
      
      {/* 刻度线 */}
      <line x1="45" y1="155" x2="52" y2="148" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
      <line x1="58" y1="125" x2="66" y2="120" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
      <line x1="65" y1="90" x2="73" y2="88" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
      <line x1="100" y1="55" x2="100" y2="65" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
      <line x1="135" y1="90" x2="127" y2="88" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
      <line x1="142" y1="125" x2="134" y2="120" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
      <line x1="155" y1="155" x2="148" y2="148" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
      
      {/* 指针 */}
      <g transform="rotate(-45 100 100)">
        <path
          d="M 100 100 L 95 105 L 100 30 L 105 105 Z"
          fill="#1f2937"
        />
        <circle cx="100" cy="100" r="8" fill="#10b981" />
      </g>
      
      {/* 中心点 */}
      <circle cx="100" cy="100" r="6" fill="#1f2937" />
    </svg>
  )
}

export default GaugeIcon
