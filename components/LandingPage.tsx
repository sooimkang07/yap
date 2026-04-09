'use client'

const imgBg       = "http://localhost:3845/assets/c2295f370f78662def3a8ed633b3b4950379fb92.png"
const imgYApLogo  = "http://localhost:3845/assets/9eb4d702af6bd6fe1023cb08531f169d04feff56.svg"
const imgSignal   = "http://localhost:3845/assets/17ea4c9f6c53be95fb129a58e4c7f11ead77ce8a.svg"
const imgWifi     = "http://localhost:3845/assets/c8165777b3e3ffe26b08e8ca8fd013471e1a7bdf.svg"
const imgBatteryFill = "http://localhost:3845/assets/52af93645b42610d7150de228a7f1d6803de9699.svg"
const imgBatteryTip  = "http://localhost:3845/assets/3ad3c29deecc2a256edb655fd46dce4aa145cbdf.svg"

interface LandingPageProps {
  onLogin?: () => void
  onSignup?: () => void
}

function StatusBar() {
  return (
    <div className="absolute h-[57px] left-0 top-0 w-full pointer-events-none z-10">
      {/* Time */}
      <div className="absolute flex items-center gap-[2px] left-[36px] top-[25.5px]">
        <span className="font-bold text-[16px] text-black tracking-[-0.368px] leading-none whitespace-nowrap">
          11:11
        </span>
        <img alt="" className="w-[10.5px] h-[10.4px]" src={imgSignal} />
      </div>
      {/* Right icons */}
      <div className="absolute flex items-center gap-[6px] right-[16px] top-[26px]">
        {/* Signal bars */}
        <div className="relative inline-grid place-items-start" style={{ gridTemplateColumns: 'max-content', gridTemplateRows: 'max-content' }}>
          <div className="bg-black rounded-[1px]" style={{ width: 3, height: 13, marginLeft: 16, marginTop: 0, gridColumn: 1, gridRow: 1 }} />
          <div className="bg-black rounded-[1px]" style={{ width: 3, height: 10, marginLeft: 11, marginTop: 3, gridColumn: 1, gridRow: 1 }} />
          <div className="bg-black rounded-[1px]" style={{ width: 3, height: 7, marginLeft: 5, marginTop: 6, gridColumn: 1, gridRow: 1 }} />
          <div className="bg-black rounded-[1px]" style={{ width: 3, height: 5, marginLeft: 0, marginTop: 8, gridColumn: 1, gridRow: 1 }} />
        </div>
        <img alt="" className="w-[18px] h-[12px]" src={imgWifi} />
        {/* Battery */}
        <div className="relative" style={{ width: 27, height: 14 }}>
          <div className="absolute inset-0 bg-[#d9d9d9] rounded-[4px]" />
          <img alt="" className="absolute left-0 top-0 w-[20px] h-[14px]" src={imgBatteryFill} />
          <img alt="" className="absolute right-0 top-[5px] w-[2px] h-[4px]" src={imgBatteryTip} />
          <span className="absolute left-[4px] top-[1px] font-bold text-[#181716] text-[12px] tracking-[-0.276px] leading-[12px]">
            79
          </span>
        </div>
      </div>
    </div>
  )
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

      {/* ── Status bar ── */}
      <StatusBar />

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

      {/* ── Home indicator bar ── */}
      <div
        className="absolute bg-black"
        style={{
          bottom: 4.83,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 137.775,
          height: 5,
          borderRadius: 10.282,
          mixBlendMode: 'luminosity',
          zIndex: 1,
        }}
      />
    </div>
  )
}
