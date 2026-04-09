'use client'

// ── Assets ────────────────────────────────────────────────────────────────────
const imgBg          = "http://localhost:3845/assets/c2295f370f78662def3a8ed633b3b4950379fb92.png"

// Photos
const imgChloe1      = "http://localhost:3845/assets/3121c7092dd56ff8f489dcdc936307c4914a9ae0.png"
const imgMaria1      = "http://localhost:3845/assets/b4a86071199a3170f43d539b2a04c3f918a90961.png"
const imgSarah1      = "http://localhost:3845/assets/fbb421439898c9da2d5b407605d72676d3448e47.png"
const imgLainey1     = "http://localhost:3845/assets/fa82a72c441b7c8022853a5060cb7375fe2d8460.png"
const imgSooim1      = "http://localhost:3845/assets/b13af3a88ad7c00abb01c04446604a35ae7629de.png"
const imgMusicLeague = "http://localhost:3845/assets/b64aaa5466bc4c4e1110f1fa7586444d610dc271.png"
const imgSooma1      = "http://localhost:3845/assets/957e3f108bb57b4fde325de382df07da569e9923.png"

// Circle bg SVGs
const imgEllipse27   = "http://localhost:3845/assets/d640c78272870f811e016ce98142713d4bb1cefc.svg"  // besties
const imgEllipse33   = "http://localhost:3845/assets/2ac6b5e61dd1a92f49bfe600fa38f43bbe0db489.svg"  // dunkinistas
const imgBgChat      = "http://localhost:3845/assets/6d28f6fca75575104b629cc1f2298c6b3520f3c7.svg"  // eliza & isabella
const imgEllipse38   = "http://localhost:3845/assets/8459e5c7cc736a63b151c9deee5b4ad8d52d4283.svg"  // 1lians

// Notification badge circle
const imgEllipse44   = "http://localhost:3845/assets/e1c3f411185ddcf14dc073e066005a675dc750c9.svg"

// Eliza & Isabella initial circles
const imgEllipse40   = "http://localhost:3845/assets/9f4f7ab96de63237b1a37b68ad5b0ff6bf227849.svg"  // I
const imgEllipse41   = "http://localhost:3845/assets/1f2751c0abe99c7e26bc73da2673e96f0d1d81c6.svg"  // E

// Photo mask SVGs (besties collage)
const imgMariaMask   = "http://localhost:3845/assets/90cd6213e2de49fd9618bd46ce38f9dc6214c144.svg"
const imgSarahMask   = "http://localhost:3845/assets/1f285728da479a5a9bf4ab6f2cfdf3933b6592c9.svg"
const imgLaineyMask  = "http://localhost:3845/assets/386523578cda6e269b01543515d1c5950cfb2296.svg"
const imgChloeMask   = "http://localhost:3845/assets/4aace8cf5bc2f0ff24469aadbdd4f89e52975be5.svg"

// Photo cover mask (music league & sooma)
const imgCoverMask   = "http://localhost:3845/assets/d139c4be91a1e37b7cf2ffbbbe9eb5787088986c.svg"

// Profile pic mask
const imgSooim       = "http://localhost:3845/assets/59aad22b3fc40b2b361394ccadf193fc4859b483.svg"

// UI icons
const imgSearch      = "http://localhost:3845/assets/28abc2b52d1a416f400ebe1649e23b096789564e.svg"
const imgRecord      = "http://localhost:3845/assets/acc05c129def645219121477cb2c3129322dc4e8.svg"

// ── Sub-components ────────────────────────────────────────────────────────────

function GlassBtn({
  children,
  size = 44,
  onClick,
  className = '',
}: {
  children: React.ReactNode
  size?: number
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center justify-center active:opacity-70 transition-opacity rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0 pointer-events-none rounded-full"
        style={{ boxShadow: '0px 8px 40px 0px rgba(0,0,0,0.12)' }}
      >
        <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.65)' }} />
        <div className="absolute inset-0 rounded-full" style={{ background: '#ddd', mixBlendMode: 'color-burn' }} />
        <div className="absolute inset-0 rounded-full" style={{ background: '#f7f7f7', mixBlendMode: 'darken' }} />
      </div>
      {children}
    </button>
  )
}

function NotificationBadge({ count }: { count: number }) {
  return (
    <div className="relative" style={{ width: 32, height: 32 }}>
      <img alt="" className="absolute inset-0 w-full h-full" src={imgEllipse44} />
      <span className="absolute inset-0 flex items-center justify-center font-semibold text-[19.2px] text-black leading-none">
        {count}
      </span>
    </div>
  )
}

// Besties 4-photo collage inside a 192×192 container
function BestiesBubble() {
  return (
    <div className="relative" style={{ width: 192, height: 192 }}>
      <img alt="" className="absolute inset-0 w-full h-full" src={imgEllipse27} />

      {/* Maria */}
      <div className="absolute" style={{
        left: 92.09, top: 1.75, width: 147.735, height: 196.98,
        maskImage: `url('${imgMariaMask}')`, maskSize: '70px 70px', maskPosition: '13.414px 75.251px', maskRepeat: 'no-repeat',
        WebkitMaskImage: `url('${imgMariaMask}')`, WebkitMaskSize: '70px 70px', WebkitMaskPosition: '13.414px 75.251px', WebkitMaskRepeat: 'no-repeat',
      }}>
        <img alt="Maria" className="absolute inset-0 w-full h-full object-cover" src={imgMaria1} />
      </div>

      {/* Sarah */}
      <div className="absolute" style={{
        left: 27.36, top: 100.6, width: 103.433, height: 137.75,
        maskImage: `url('${imgSarahMask}')`, maskSize: '58px 58px', maskPosition: '25.137px 17.399px', maskRepeat: 'no-repeat',
        WebkitMaskImage: `url('${imgSarahMask}')`, WebkitMaskSize: '58px 58px', WebkitMaskPosition: '25.137px 17.399px', WebkitMaskRepeat: 'no-repeat',
      }}>
        <img alt="Sarah" className="absolute inset-0 w-full h-full object-cover" src={imgSarah1} />
      </div>

      {/* Lainey */}
      <div className="absolute" style={{
        left: 100.83, top: 7.27, width: 73.333, height: 97.533,
        maskImage: `url('${imgLaineyMask}')`, maskSize: '44px 44px', maskPosition: '14.668px 22.733px', maskRepeat: 'no-repeat',
        WebkitMaskImage: `url('${imgLaineyMask}')`, WebkitMaskSize: '44px 44px', WebkitMaskPosition: '14.668px 22.733px', WebkitMaskRepeat: 'no-repeat',
      }}>
        <img alt="Lainey" className="absolute inset-0 w-full h-full object-cover" src={imgLainey1} />
      </div>

      {/* Chloe */}
      <div className="absolute" style={{
        left: 8, top: 8, width: 118.987, height: 118.987,
        maskImage: `url('${imgChloeMask}')`, maskSize: '92px 92px', maskPosition: '13.492px 13.493px', maskRepeat: 'no-repeat',
        WebkitMaskImage: `url('${imgChloeMask}')`, WebkitMaskSize: '92px 92px', WebkitMaskPosition: '13.492px 13.493px', WebkitMaskRepeat: 'no-repeat',
        overflow: 'hidden',
      }}>
        <img alt="Chloe" className="absolute max-w-none" style={{ left: '2.92%', width: '88.54%', height: '88.54%', top: '11.44%' }} src={imgChloe1} />
      </div>
    </div>
  )
}

// Photo cover bubble (music league & sooma) — 192×192 container, full-cover masked photo
function CoverBubble({ src }: { src: string }) {
  return (
    <div className="relative" style={{ width: 192, height: 192 }}>
      <div className="absolute" style={{
        left: -86.04, top: -219.17, width: 364.075, height: 791.547,
        maskImage: `url('${imgCoverMask}')`, maskSize: '192px 192px', maskPosition: '86.039px 219.17px', maskRepeat: 'no-repeat',
        WebkitMaskImage: `url('${imgCoverMask}')`, WebkitMaskSize: '192px 192px', WebkitMaskPosition: '86.039px 219.17px', WebkitMaskRepeat: 'no-repeat',
      }}>
        <img alt="" className="absolute inset-0 w-full h-full object-cover" src={src} />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
interface ChatsPageProps {
  onOpenChat?: () => void
}

export default function ChatsPage({ onOpenChat }: ChatsPageProps) {
  return (
    <div className="relative bg-white overflow-x-hidden mx-auto" style={{ width: 402, minHeight: '100vh' }}>

      {/* ── Background gradient ── */}
      <div className="absolute pointer-events-none" style={{
        left: -10, top: -49, width: 544, height: 971,
        opacity: 0.10, transform: 'rotate(180deg)', zIndex: 0,
      }}>
        <img alt="" className="absolute inset-0 w-full h-full object-cover" src={imgBg} />
      </div>

      {/* ── Header ── */}
      <div className="absolute z-10 flex items-center justify-between" style={{ left: 15, right: 15, top: 20 }}>
        <h1 className="font-semibold text-[30px] text-black leading-[30px]">Chats</h1>
        <div className="flex items-center gap-[12px]">
          {/* Search */}
          <GlassBtn size={44}>
            <img alt="search" className="w-[36px] h-[36px]" src={imgSearch} />
          </GlassBtn>
          {/* Profile pic */}
          <div className="relative" style={{ width: 45, height: 45 }}>
            <div className="absolute inset-0" style={{
              maskImage: `url('${imgSooim}')`, maskSize: '43px 43px', maskPosition: '2px 1px', maskRepeat: 'no-repeat',
              WebkitMaskImage: `url('${imgSooim}')`, WebkitMaskSize: '43px 43px', WebkitMaskPosition: '2px 1px', WebkitMaskRepeat: 'no-repeat',
              overflow: 'hidden',
            }}>
              <img alt="Profile" className="w-full h-full object-cover" src={imgSooim1} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Chat grid (staggered 2-column) ── */}
      <div className="relative z-10" style={{ height: 1070, marginTop: 17 }}>

        {/* besties – left col, top 117 */}
        <button className="absolute text-left active:opacity-70 transition-opacity" style={{ left: 16, top: 60 }} onClick={onOpenChat}>
          <BestiesBubble />
          <p className="mt-1 text-center font-semibold text-[16px] text-black w-[192px]">besties💛</p>
          <div className="absolute" style={{ left: 146, top: 14 }}>
            <NotificationBadge count={4} />
          </div>
        </button>

        {/* The Dunkinistas – right col, top 249 */}
        <button className="absolute text-left active:opacity-70 transition-opacity" style={{ left: 192, top: 192 }} onClick={onOpenChat}>
          <div className="relative" style={{ width: 192, height: 192 }}>
            <img alt="" className="absolute inset-0 w-full h-full" src={imgEllipse33} />
            <span className="absolute inset-0 flex items-center justify-center text-[120px] leading-none select-none">💕</span>
          </div>
          <p className="mt-1 text-center font-semibold text-[16px] text-black w-[192px]">The Dunkinistas</p>
          <div className="absolute" style={{ left: 146, top: 14 }}>
            <NotificationBadge count={2} />
          </div>
        </button>

        {/* Eliza Dolgins & Is... – left col, top 381 */}
        <button className="absolute text-left active:opacity-70 transition-opacity" style={{ left: 16, top: 324 }} onClick={onOpenChat}>
          <div className="relative" style={{ width: 192, height: 192 }}>
            <img alt="" className="absolute inset-0 w-full h-full" src={imgBgChat} />
            {/* "I" circle */}
            <div className="absolute" style={{ left: 28, top: 22, width: 104, height: 104 }}>
              <img alt="" className="absolute inset-0 w-full h-full" src={imgEllipse40} />
              <span className="absolute inset-0 flex items-center justify-center font-semibold text-black" style={{ fontSize: 53.023 }}>I</span>
            </div>
            {/* "E" circle */}
            <div className="absolute" style={{ left: 110, top: 104, width: 60, height: 60 }}>
              <img alt="" className="absolute inset-0 w-full h-full" src={imgEllipse41} />
              <span className="absolute inset-0 flex items-center justify-center font-semibold text-black" style={{ fontSize: 32.877 }}>E</span>
            </div>
          </div>
          <p className="mt-1 text-center font-semibold text-[16px] text-black w-[192px]">Eliza Dolgins &amp; Is...</p>
        </button>

        {/* Music league – right col, top 513 */}
        <button className="absolute text-left active:opacity-70 transition-opacity" style={{ left: 192, top: 456 }} onClick={onOpenChat}>
          <CoverBubble src={imgMusicLeague} />
          <p className="mt-1 text-center font-semibold text-[16px] text-black w-[192px]">Music league</p>
        </button>

        {/* 1Lians – left col, top 645 */}
        <button className="absolute text-left active:opacity-70 transition-opacity" style={{ left: 16, top: 588 }} onClick={onOpenChat}>
          <div className="relative" style={{ width: 192, height: 192 }}>
            <img alt="" className="absolute inset-0 w-full h-full" src={imgEllipse38} />
            <span className="absolute inset-0 flex items-center justify-center text-[120px] leading-none select-none">👽</span>
          </div>
          <p className="mt-1 text-center font-semibold text-[16px] text-black w-[192px]">1Lians</p>
          <div className="absolute" style={{ left: 146, top: 14 }}>
            <NotificationBadge count={6} />
          </div>
        </button>

        {/* sooma – right col, top 807 */}
        <button className="absolute text-left active:opacity-70 transition-opacity" style={{ left: 192, top: 750 }} onClick={onOpenChat}>
          <CoverBubble src={imgSooma1} />
          <p className="mt-1 text-center font-semibold text-[16px] text-black w-[192px]">sooma</p>
        </button>

      </div>

      {/* ── Record FAB ── */}
      <div className="sticky bottom-[26px] flex justify-end pr-[16px] z-20" style={{ marginTop: -79 }}>
        <button
          className="relative flex items-center justify-center active:opacity-70 transition-opacity rounded-full"
          style={{ width: 79, height: 79 }}
        >
          <div className="absolute inset-0 pointer-events-none rounded-full" style={{ boxShadow: '0px 13.167px 65.833px 0px rgba(0,0,0,0.12)' }}>
            <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.65)' }} />
            <div className="absolute inset-0 rounded-full" style={{ background: '#ddd', mixBlendMode: 'color-burn' }} />
            <div className="absolute inset-0 rounded-full" style={{ background: '#f7f7f7', mixBlendMode: 'darken' }} />
          </div>
          <img alt="record" className="relative w-[59.25px] h-[59.25px]" src={imgRecord} />
        </button>
      </div>

    </div>
  )
}
