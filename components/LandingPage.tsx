'use client'

const imgBg       = "http://localhost:3845/assets/c2295f370f78662def3a8ed633b3b4950379fb92.png"
const imgYApLogo  = "http://localhost:3845/assets/9eb4d702af6bd6fe1023cb08531f169d04feff56.svg"

interface LandingPageProps {
  onLogin?: () => void
  onSignup?: () => void
}

function GlassButton({
  children,
  onClick,
  tint,
  width,
}: {
  children: React.ReactNode
  onClick?: () => void
  tint?: string
  width: number
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center justify-center active:opacity-70 transition-opacity"
      style={{
        width,
        height: 48,
        borderRadius: 1000,
        background: tint ?? 'transparent',
      }}
    >
      {/* Glass layers */}
      <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: 1000, boxShadow: '0px 8px 40px 0px rgba(0,0,0,0.12)' }}>
        <div className="absolute inset-0" style={{ borderRadius: 1000, background: 'rgba(255,255,255,0.65)' }} />
        <div className="absolute inset-0" style={{ borderRadius: 1000, background: '#ddd', mixBlendMode: 'color-burn' }} />
        <div className="absolute inset-0" style={{ borderRadius: 1000, background: '#f7f7f7', mixBlendMode: 'darken' }} />
      </div>
      <span className="relative font-medium text-[17px] text-[#1a1a1a] whitespace-nowrap" style={{ fontFeatureSettings: "'ss16'" }}>
        {children}
      </span>
    </button>
  )
}

export default function LandingPage({ onLogin, onSignup }: LandingPageProps) {
  return (
    <div
      className="relative bg-white overflow-hidden mx-auto"
      style={{ width: 402, minHeight: '100vh' }}
    >
      {/* ── Iridescent gradient background ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: -10,
          top: -49,
          width: 544,
          height: 971,
          opacity: 0.20,
          transform: 'rotate(180deg)',
          zIndex: 0,
        }}
      >
        <img alt="" className="absolute inset-0 w-full h-full object-cover" src={imgBg} />
      </div>

      {/* ── yAp logo ── */}
      <div
        className="absolute"
        style={{
          left: 'calc(50% - 91.45px)',
          top: 'calc(50% + 100px)',
          transform: 'translate(-50%, -50%)',
          width: 167.098,
          height: 86,
          zIndex: 1,
        }}
      >
        <img alt="yAp" className="w-full h-full" src={imgYApLogo} />
      </div>

      {/* ── Tagline ── */}
      <div
        className="absolute"
        style={{
          left: 26,
          top: 624,
          transform: 'translateY(-50%)',
          zIndex: 1,
        }}
      >
        <p className="font-semibold text-[30px] text-black leading-[35px] whitespace-pre">
          {'More talking. \nLess typing.'}
        </p>
      </div>

      {/* ── Buttons ── */}
      <div
        className="absolute flex gap-[12px] items-center"
        style={{ left: 26, top: 778, zIndex: 1 }}
      >
        <GlassButton width={169} tint="rgba(0,29,239,0.4)" onClick={onLogin}>
          Login
        </GlassButton>
        <GlassButton width={168} onClick={onSignup}>
          Sign up
        </GlassButton>
      </div>

    </div>
  )
}
