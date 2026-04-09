'use client'

import { useState, useEffect, useRef } from 'react'
import { useConversation } from '@/hooks/useConversation'
import { useConversationPlayer } from '@/hooks/useConversationPlayer'
import { useRecorder } from '@/hooks/useRecorder'

// ── Assets ────────────────────────────────────────────────────────────────────
const imgBg        = "http://localhost:3845/assets/c2295f370f78662def3a8ed633b3b4950379fb92.png"

// Photos
const imgChloe1    = "http://localhost:3845/assets/3121c7092dd56ff8f489dcdc936307c4914a9ae0.png"
const imgMaria1    = "http://localhost:3845/assets/b4a86071199a3170f43d539b2a04c3f918a90961.png"
const imgSarah1    = "http://localhost:3845/assets/fbb421439898c9da2d5b407605d72676d3448e47.png"
const imgLainey1   = "http://localhost:3845/assets/fa82a72c441b7c8022853a5060cb7375fe2d8460.png"

// Hero cluster — idle
const imgUnion       = "http://localhost:3845/assets/35598977a3d82b6b03cc53d5210bd8eafe656dbf.svg"
const imgHeroMask    = "http://localhost:3845/assets/86bcd12c6067f9a3d858f1c4572b94ca78fa96a8.svg"
const imgChloeMaskSm = "http://localhost:3845/assets/a6693fa756111898e61a12d640da5713b8f81cae.svg"

// Hero cluster — playing (Chloe speaking)
const imgUnionChloe   = "http://localhost:3845/assets/0072294d7d2d4822c5beceef453bb8e6fda681e1.svg"
const imgPurpleHalo   = "http://localhost:3845/assets/250ee332ec8b01876148f7857e3f79fbc62fe086.svg"
const imgChloeMaskLg  = "http://localhost:3845/assets/95d91101cfeafae14ea0cc5928ffadc174161142.svg"
const imgMentionsArrow = "http://localhost:3845/assets/6b5b7ec5a3aaf6e4815a9ad5d68a80d7644d2ca4.svg"

// Hero cluster — playing (Maria speaking)
const imgUnionMaria   = "http://localhost:3845/assets/5fcbcee233995ebae7f0aff369de16bdee36bdd5.svg"
const imgBlueHalo     = "http://localhost:3845/assets/6669755bd99536de233fde8da3d4dac50104f097.svg"
const imgMariaMaskLg  = "http://localhost:3845/assets/5d7cdef7c0148c09e269151f03c51ad349cdf3ef.svg"

// Scrubber — per state
const imgBarIdle      = "http://localhost:3845/assets/eb09f228982a4a4fc7968f0a529ccc9b587b5a43.svg"
const imgBarChloe     = "http://localhost:3845/assets/1428d9d95eefc00a7785ecc70b14cd74cd4d7cb7.svg"
const imgBarMaria     = "http://localhost:3845/assets/35075273e54e125c044de66bb50d418ae9a3d07b.svg"
const imgBarChloe2    = "http://localhost:3845/assets/6fcd5198d2596c6bcc0934a747d990bdee656092.svg"
const imgChevron     = "http://localhost:3845/assets/c8f6e0f0dde0c507d127a1af6aa1fce6291c9250.svg"

// Playback icons
const imgRestart   = "http://localhost:3845/assets/a189d610c3586b8aeae2254caa81bd3df8426a19.svg"
const imgPlay      = "http://localhost:3845/assets/370f6ade33db42a3f05e27e7beed32c9b14de6b2.svg"
const imgPause     = "http://localhost:3845/assets/613e7de8b34237722f56f742c57317d7426b36e4.svg"
const imgRecord    = "http://localhost:3845/assets/08a60e5b4df1c79959fa795050e0e6b26013720a.svg"
const imgSkip      = "http://localhost:3845/assets/550abd31c2743edc8ca7fb31f9e3fcf7e4f178fc.svg"

// Recording popup — review state
const imgPlayReview = "http://localhost:3845/assets/5e39d5832b9894c18a2b0a798a22ed392cb76f77.svg"
const imgSendBtn    = "http://localhost:3845/assets/20616a9e3c6b3061fd6c034f71f265f64760f68f.svg"

// Recording popup — analyzing state 1 (initial)
const imgXLarge   = "http://localhost:3845/assets/830c632527df5eb17c31a47a32821376bce6799b.svg"
const imgBar012a  = "http://localhost:3845/assets/977afb640dd32ab1f9c9f73fa70852191453932d.svg"
const imgAiGlow1  = "http://localhost:3845/assets/25c68fc1c64140581fb98a46f6e7aaa835da1777.svg"
const imgAiIcon1  = "http://localhost:3845/assets/c7d4b3ebfb859bb8388f1d1c7ceeee4cf0be9586.svg"

// Recording popup — analyzing state 2 (progress)
const imgBar012b  = "http://localhost:3845/assets/7c9818795f40a2b19bfbf87a2d4fd7784cc9c0b6.svg"
const imgAiGlow2  = "http://localhost:3845/assets/20b92bf568cfc44af75791ccbbf8df90ed7bf868.svg"
const imgAiIcon2  = "http://localhost:3845/assets/ac0b79da94a0a9076ef0e76a3c8c1169ff3b76fe.svg"

// Recording popup — analyzing state 3 (two segments)
const imgBar022   = "http://localhost:3845/assets/95f2cd38e5fdef38cedde40d68f6a27e52cf02e1.svg"
const imgAiGlow3  = "http://localhost:3845/assets/a81ab6a18f6836531e3cb502b7a9ac225f4afc05.svg"
const imgAiIcon3  = "http://localhost:3845/assets/0a9e61f9a18e32b7b7b736a165e04d0133e51aa1.svg"

// Hero cluster — Sarah speaking
const imgOrangeHalo  = "http://localhost:3845/assets/2823cb2907230ac4dc65c60429107740f8db2340.svg"
const imgUnionSarah  = "http://localhost:3845/assets/c59c3989279d03f4735a7d29be0f0a88e52804aa.svg"
// Scrubber — Sarah state
const imgBarSarah    = "http://localhost:3845/assets/1efb67727572f6c92f813c3bd3bc1233a49a6b53.svg"

// Hero cluster — Lainey speaking
const imgGreenHalo       = "http://localhost:3845/assets/a3c9ad485a36b7169e28344df0fa24ffade51e2e.svg"
const imgBarLaineyGreen  = "http://localhost:3845/assets/44bf730347f029763cf3c5dc0cfab7b3da687e8e.svg"
const imgBarLaineyOrange = "http://localhost:3845/assets/6de2115d2bca02b6a0a669959c243f6b4f2989e7.svg"
// Heard-people avatars
const imgMaria2HalfMask = "http://localhost:3845/assets/f00be57646c1975f5a33342935ae5004ab9ff43a.svg"
const imgOutlineRing    = "http://localhost:3845/assets/7380575f4e62cea29ab2a6a623841447c76a654c.svg"
const imgChloeHeardMask = "http://localhost:3845/assets/1a2031594b7b20b803a2b67c981927a07c9afa17.svg"

// Recording popup — analyzing state 4 (all segments complete)
const imgAiGlow4       = "http://localhost:3845/assets/7e0ce7560b02d0a0997adb0c763d4a60afe59218.svg"
const imgAiIcon4       = "http://localhost:3845/assets/3da076482dfe801c3dcaffb2cb48fe535453769a.svg"
const imgSooim1Photo   = "http://localhost:3845/assets/b13af3a88ad7c00abb01c04446604a35ae7629de.png"
const imgChloe2Mask    = "http://localhost:3845/assets/54a72ade070781a85ff3c3a78368c2034ae4880f.svg"
const imgSooim4Mask    = "http://localhost:3845/assets/e931c6b09e59863aa1c7351f22e5a4de3b1742f0.svg"
const imgMaria2Mask    = "http://localhost:3845/assets/0eb7d9f3f784121a2fe970f051d5fc1cb7b8ddea.svg"
const imgPurpleBar     = "http://localhost:3845/assets/de61d9c49af6911b3df01a49c3b92254ab42f7ed.svg"
const imgSooim2Bar     = "http://localhost:3845/assets/959b4f3a1c9fa8b2c322b923b41cec65b36a6f73.svg"
const imgBlueBar       = "http://localhost:3845/assets/b51a8679404ae654bc1662e9bfa69dcbdaae4059.svg"
const imgSooim3Bar     = "http://localhost:3845/assets/d416eacbdae6aa78795d4ea97e5a0702bf3e4832.svg"

// Header icons
const imgBackArrow = "http://localhost:3845/assets/05ee3140b1ee18ee71707b6909c3e60fe46a1af4.svg"
const imgMenu      = "http://localhost:3845/assets/a3235a41e2aad1b99c35642541549590911504fb.svg"

// Status bar
const imgSignal    = "http://localhost:3845/assets/17ea4c9f6c53be95fb129a58e4c7f11ead77ce8a.svg"
const imgWifi      = "http://localhost:3845/assets/c8165777b3e3ffe26b08e8ca8fd013471e1a7bdf.svg"
const imgBatteryFill = "http://localhost:3845/assets/52af93645b42610d7150de228a7f1d6803de9699.svg"
const imgBatteryTip  = "http://localhost:3845/assets/3ad3c29deecc2a256edb655fd46dce4aa145cbdf.svg"

// ── Transcript avatar masks
const imgAvatarMaskLg  = "http://localhost:3845/assets/86bcd12c6067f9a3d858f1c4572b94ca78fa96a8.svg"
const imgAvatarMaskSm  = "http://localhost:3845/assets/a6693fa756111898e61a12d640da5713b8f81cae.svg"
const imgSooim1Mask    = "http://localhost:3845/assets/e39cd97c26bfc9f5bd6eff49fa320667726898b6.svg"

// ── Transcript types ──────────────────────────────────────────────────────────
type TextSegment = string | { mention: string }

interface Message {
  id: string
  speaker: string
  time: string
  avatarSrc: string
  avatarMask: string
  avatarMaskSize: string
  avatarMaskPos: string
  avatarW: number
  avatarH: number
  avatarOffsetX: number
  avatarOffsetY: number
  segments: TextSegment[]
}

// ── Avatar data — keyed by participant id ─────────────────────────────────────
// Single source; used to render transcript rows for any speaker in conversation state.
const AVATAR_DATA: Record<string, Omit<Message, 'id' | 'speaker' | 'time' | 'segments'>> = {
  me:     { avatarSrc: imgSooim1Photo, avatarMask: imgSooim1Mask,   avatarMaskSize: '40px 40px', avatarMaskPos: '1.859px 0.93px',   avatarW: 41.86,  avatarH: 41.86,  avatarOffsetX: -1.86,  avatarOffsetY: -0.93 },
  chloe:  { avatarSrc: imgChloe1,      avatarMask: imgAvatarMaskSm, avatarMaskSize: '40px 40px', avatarMaskPos: '5.871px 5.867px',  avatarW: 51.733, avatarH: 51.733, avatarOffsetX: -5.87,  avatarOffsetY: -5.87 },
  maria:  { avatarSrc: imgMaria1,      avatarMask: imgAvatarMaskLg, avatarMaskSize: '40px 40px', avatarMaskPos: '7.664px 43px',     avatarW: 84.42,  avatarH: 112.56, avatarOffsetX: -7.66,  avatarOffsetY: -43   },
  sarah:  { avatarSrc: imgSarah1,      avatarMask: imgAvatarMaskLg, avatarMaskSize: '40px 40px', avatarMaskPos: '17.332px 12px',    avatarW: 71.333, avatarH: 95,     avatarOffsetX: -17.33, avatarOffsetY: -12   },
  lainey: { avatarSrc: imgLainey1,     avatarMask: imgAvatarMaskLg, avatarMaskSize: '40px 40px', avatarMaskPos: '7.668px 43px',     avatarW: 84.42,  avatarH: 112.56, avatarOffsetX: -7.67,  avatarOffsetY: -43   },
}

const DISPLAY_NAME: Record<string, string> = {
  me: 'You', chloe: 'Chloe', maria: 'Maria', sarah: 'Sarah', lainey: 'Lainey',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBar() {
  return (
    <div className="absolute h-[57px] left-0 top-0 w-full pointer-events-none z-10">
      <div className="absolute flex items-center gap-[2px] left-[36px] top-[25.5px]">
        <span className="font-bold text-[16px] text-black tracking-[-0.368px] leading-none whitespace-nowrap">11:11</span>
        <img alt="" className="w-[10.5px] h-[10.4px]" src={imgSignal} />
      </div>
      <div className="absolute flex items-center gap-[6px] right-[16px] top-[26px]">
        <img alt="" className="w-[19px] h-[13px]" src={imgSignal} />
        <img alt="" className="w-[18px] h-[12px]" src={imgWifi} />
        <div className="relative" style={{ width: 27, height: 14 }}>
          <div className="absolute inset-0 bg-[#d9d9d9] rounded-[4px]" />
          <img alt="" className="absolute left-0 top-0 w-[20px] h-[14px]" src={imgBatteryFill} />
          <img alt="" className="absolute right-0 top-[5px] w-[2px] h-[4px]" src={imgBatteryTip} />
          <span className="absolute left-[4px] top-[1px] font-bold text-[#181716] text-[12px] tracking-[-0.276px] leading-[12px]">79</span>
        </div>
      </div>
    </div>
  )
}

function GlassButton({
  children,
  width,
  height,
  shadow = '0px 8px 40px 0px rgba(0,0,0,0.12)',
  onClick,
}: {
  children: React.ReactNode
  width: number
  height: number
  shadow?: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center justify-center active:opacity-70 transition-opacity rounded-full"
      style={{ width, height }}
    >
      <div className="absolute inset-0 pointer-events-none rounded-full" style={{ boxShadow: shadow }}>
        <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.65)' }} />
        <div className="absolute inset-0 rounded-full" style={{ background: '#ddd', mixBlendMode: 'color-burn' }} />
        <div className="absolute inset-0 rounded-full" style={{ background: '#f7f7f7', mixBlendMode: 'darken' }} />
      </div>
      <div className="relative flex items-center justify-center">{children}</div>
    </button>
  )
}

// 4-petal hero cluster — 288×288 container
function HeroCluster() {
  return (
    <div className="relative" style={{ width: 288, height: 288 }}>
      <img alt="" className="absolute inset-0 w-full h-full" src={imgUnion} />

      {/* Maria — left petal */}
      <div className="absolute" style={{
        left: -2.4, top: -7.2, width: 202.608, height: 270.144,
        maskImage: `url('${imgHeroMask}')`, maskSize: '96px 96px', maskPosition: '18.398px 103.2px', maskRepeat: 'no-repeat',
        WebkitMaskImage: `url('${imgHeroMask}')`, WebkitMaskSize: '96px 96px', WebkitMaskPosition: '18.398px 103.2px', WebkitMaskRepeat: 'no-repeat',
      }}>
        <img alt="Maria" className="absolute inset-0 w-full h-full object-cover" src={imgMaria1} />
      </div>

      {/* Sarah — bottom petal */}
      <div className="absolute" style={{
        left: 54.4, top: 147.2, width: 171, height: 228,
        maskImage: `url('${imgHeroMask}')`, maskSize: '96px 96px', maskPosition: '41.602px 28.8px', maskRepeat: 'no-repeat',
        WebkitMaskImage: `url('${imgHeroMask}')`, WebkitMaskSize: '96px 96px', WebkitMaskPosition: '41.602px 28.8px', WebkitMaskRepeat: 'no-repeat',
      }}>
        <img alt="Sarah" className="absolute inset-0 w-full h-full object-cover" src={imgSarah1} />
      </div>

      {/* Lainey — right petal */}
      <div className="absolute" style={{
        left: 144, top: 46.4, width: 159.6, height: 212.8,
        maskImage: `url('${imgHeroMask}')`, maskSize: '96px 96px', maskPosition: '32px 49.6px', maskRepeat: 'no-repeat',
        WebkitMaskImage: `url('${imgHeroMask}')`, WebkitMaskSize: '96px 96px', WebkitMaskPosition: '32px 49.6px', WebkitMaskRepeat: 'no-repeat',
      }}>
        <img alt="Lainey" className="absolute inset-0 w-full h-full object-cover" src={imgLainey1} />
      </div>

      {/* Chloe — top petal */}
      <div className="absolute" style={{
        left: 81.92, top: 1.92, width: 124.16, height: 124.16,
        maskImage: `url('${imgChloeMaskSm}')`, maskSize: '96px 96px', maskPosition: '14.078px 14.08px', maskRepeat: 'no-repeat',
        WebkitMaskImage: `url('${imgChloeMaskSm}')`, WebkitMaskSize: '96px 96px', WebkitMaskPosition: '14.078px 14.08px', WebkitMaskRepeat: 'no-repeat',
        overflow: 'hidden',
      }}>
        <img alt="Chloe" className="absolute max-w-none" style={{ left: '2.92%', top: '11.44%', width: '88.54%', height: '88.54%' }} src={imgChloe1} />
      </div>
    </div>
  )
}

// Hero cluster — Chloe speaking (288×368)
function HeroClusterPlaying() {
  return (
    <div className="relative" style={{ width: 288, height: 368 }}>
      {/* Union background — Chloe enlarged shape */}
      <img alt="" className="absolute" style={{ left: '50%', transform: 'translateX(-50%)', top: 16, width: 288, height: 352 }} src={imgUnionChloe} />

      {/* Maria — left petal */}
      <div className="absolute" style={{
        left: -2.4, top: 72.8, width: 202.608, height: 270.144,
        maskImage: `url('${imgHeroMask}')`, maskSize: '96px 96px', maskPosition: '18.398px 103.2px', maskRepeat: 'no-repeat',
        WebkitMaskImage: `url('${imgHeroMask}')`, WebkitMaskSize: '96px 96px', WebkitMaskPosition: '18.398px 103.2px', WebkitMaskRepeat: 'no-repeat',
      }}>
        <img alt="Maria" className="absolute inset-0 w-full h-full object-cover" src={imgMaria1} />
      </div>

      {/* Sarah — bottom petal */}
      <div className="absolute" style={{
        left: 54.4, top: 227.2, width: 171.2, height: 228,
        maskImage: `url('${imgHeroMask}')`, maskSize: '96px 96px', maskPosition: '41.602px 28.8px', maskRepeat: 'no-repeat',
        WebkitMaskImage: `url('${imgHeroMask}')`, WebkitMaskSize: '96px 96px', WebkitMaskPosition: '41.602px 28.8px', WebkitMaskRepeat: 'no-repeat',
      }}>
        <img alt="Sarah" className="absolute inset-0 w-full h-full object-cover" src={imgSarah1} />
      </div>

      {/* Lainey — right petal */}
      <div className="absolute" style={{
        left: 144, top: 126.4, width: 160, height: 212.8,
        maskImage: `url('${imgHeroMask}')`, maskSize: '96px 96px', maskPosition: '32px 49.6px', maskRepeat: 'no-repeat',
        WebkitMaskImage: `url('${imgHeroMask}')`, WebkitMaskSize: '96px 96px', WebkitMaskPosition: '32px 49.6px', WebkitMaskRepeat: 'no-repeat',
      }}>
        <img alt="Lainey" className="absolute inset-0 w-full h-full object-cover" src={imgLainey1} />
      </div>

      {/* Purple halo ring behind Chloe */}
      <div className="absolute" style={{ left: 72, top: 40, width: 144, height: 144 }}>
        <div className="absolute" style={{ inset: -32 }}>
          <img alt="" className="w-full h-full" src={imgPurpleHalo} />
        </div>
      </div>

      {/* Chloe — enlarged top petal (144px mask) */}
      <div className="absolute" style={{
        left: 50.88, top: 18.88, width: 186.24, height: 186.24,
        maskImage: `url('${imgChloeMaskLg}')`, maskSize: '144px 144px', maskPosition: '21.117px 21.12px', maskRepeat: 'no-repeat',
        WebkitMaskImage: `url('${imgChloeMaskLg}')`, WebkitMaskSize: '144px 144px', WebkitMaskPosition: '21.117px 21.12px', WebkitMaskRepeat: 'no-repeat',
        overflow: 'hidden',
      }}>
        <img alt="Chloe" className="absolute max-w-none" style={{ left: '2.92%', top: '11.44%', width: '88.54%', height: '88.54%' }} src={imgChloe1} />
      </div>

      {/* "Chloe" name tag — centered at top */}
      <div className="absolute flex items-center justify-center" style={{ left: '50%', transform: 'translateX(-50%)', top: 0 }}>
        <div className="relative flex items-center justify-center px-[20px] py-[6px] rounded-[1000px]"
          style={{ background: '#dec0f8', boxShadow: '0px 8px 40px 0px rgba(0,0,0,0.12)', whiteSpace: 'nowrap' }}>
          <div className="absolute inset-0 rounded-full pointer-events-none">
            <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.65)' }} />
            <div className="absolute inset-0 rounded-full" style={{ background: '#ddd', mixBlendMode: 'color-burn' }} />
            <div className="absolute inset-0 rounded-full" style={{ background: '#f7f7f7', mixBlendMode: 'darken' }} />
          </div>
          <span className="relative font-bold text-[17px] text-[#1a1a1a]">Chloe</span>
        </div>
      </div>

      {/* "Mentions you" badge — centered, below Sarah petal */}
      <div className="absolute flex flex-col items-center" style={{ left: '50%', transform: 'translateX(-50%)', top: 237 }}>
        <div className="relative flex items-center justify-center px-[12px] py-[6px] rounded-[1000px]"
          style={{ background: '#ffdeb8', boxShadow: '0px 8px 40px 0px rgba(0,0,0,0.12)', whiteSpace: 'nowrap' }}>
          <div className="absolute inset-0 rounded-full pointer-events-none">
            <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.65)' }} />
            <div className="absolute inset-0 rounded-full" style={{ background: '#ddd', mixBlendMode: 'color-burn' }} />
            <div className="absolute inset-0 rounded-full" style={{ background: '#f7f7f7', mixBlendMode: 'darken' }} />
          </div>
          <span className="relative font-normal text-[12px] text-[#6d6d6e]">Mentions you</span>
        </div>
        {/* Arrow pointing up toward Sarah */}
        <div style={{ width: 35.84, height: 8.32, marginTop: -1 }}>
          <div style={{
            width: '100%', height: '100%',
            background: '#ffdeb8',
            transform: 'rotate(180deg)',
            maskImage: `url('${imgMentionsArrow}')`,
            maskSize: '100% 100%', maskRepeat: 'no-repeat',
            WebkitMaskImage: `url('${imgMentionsArrow}')`,
            WebkitMaskSize: '100% 100%', WebkitMaskRepeat: 'no-repeat',
          }} />
        </div>
      </div>
    </div>
  )
}

function TranscriptAvatar({ msg }: { msg: Message }) {
  return (
    <div className="relative shrink-0" style={{ width: 40, height: 40, overflow: 'visible' }}>
      <div style={{
        position: 'absolute',
        left: msg.avatarOffsetX, top: msg.avatarOffsetY,
        width: msg.avatarW, height: msg.avatarH,
        maskImage: `url('${msg.avatarMask}')`,
        maskSize: msg.avatarMaskSize, maskPosition: msg.avatarMaskPos, maskRepeat: 'no-repeat',
        WebkitMaskImage: `url('${msg.avatarMask}')`,
        WebkitMaskSize: msg.avatarMaskSize, WebkitMaskPosition: msg.avatarMaskPos, WebkitMaskRepeat: 'no-repeat',
      }}>
        <img alt="" className="absolute inset-0 w-full h-full object-cover" src={msg.avatarSrc} />
      </div>
    </div>
  )
}

function MessageText({ segments }: { segments: TextSegment[] }) {
  return (
    <p className="text-[15px] leading-[22px] text-black">
      {segments.map((seg, i) =>
        typeof seg === 'string'
          ? <span key={i}>{seg}</span>
          : <span key={i} className="font-semibold" style={{ color: '#DEC0F8' }}>{seg.mention}</span>
      )}
    </p>
  )
}

// Hero cluster — Maria speaking (288×369)
function HeroClusterPlayingMaria() {
  return (
    <div className="relative" style={{ width: 288, height: 369 }}>
      {/* Union background — Maria enlarged shape */}
      <img alt="" className="absolute inset-0 w-full h-full" src={imgUnionMaria} />

      {/* Blue halo ring behind Maria */}
      <div className="absolute" style={{ left: 72, top: 41, width: 144, height: 144 }}>
        <div className="absolute" style={{ inset: -32 }}>
          <img alt="" className="w-full h-full" src={imgBlueHalo} />
        </div>
      </div>

      {/* Maria — enlarged center (144px mask) */}
      <div className="absolute" style={{
        left: 44.4, top: -113.8, width: 303.912, height: 405.216,
        maskImage: `url('${imgMariaMaskLg}')`, maskSize: '144px 144px', maskPosition: '27.598px 154.8px', maskRepeat: 'no-repeat',
        WebkitMaskImage: `url('${imgMariaMaskLg}')`, WebkitMaskSize: '144px 144px', WebkitMaskPosition: '27.598px 154.8px', WebkitMaskRepeat: 'no-repeat',
      }}>
        <img alt="Maria" className="absolute inset-0 w-full h-full object-cover" src={imgMaria1} />
      </div>

      {/* Lainey — bottom petal */}
      <div className="absolute" style={{
        left: 64, top: 207.4, width: 160, height: 212.8,
        maskImage: `url('${imgHeroMask}')`, maskSize: '96px 96px', maskPosition: '32px 49.6px', maskRepeat: 'no-repeat',
        WebkitMaskImage: `url('${imgHeroMask}')`, WebkitMaskSize: '96px 96px', WebkitMaskPosition: '32px 49.6px', WebkitMaskRepeat: 'no-repeat',
      }}>
        <img alt="Lainey" className="absolute inset-0 w-full h-full object-cover" src={imgLainey1} />
      </div>

      {/* Sarah — left petal */}
      <div className="absolute" style={{
        left: -25.6, top: 148.2, width: 171.2, height: 228,
        maskImage: `url('${imgHeroMask}')`, maskSize: '96px 96px', maskPosition: '41.602px 28.8px', maskRepeat: 'no-repeat',
        WebkitMaskImage: `url('${imgHeroMask}')`, WebkitMaskSize: '96px 96px', WebkitMaskPosition: '41.602px 28.8px', WebkitMaskRepeat: 'no-repeat',
      }}>
        <img alt="Sarah" className="absolute inset-0 w-full h-full object-cover" src={imgSarah1} />
      </div>

      {/* Chloe — right petal (small) */}
      <div className="absolute" style={{
        left: 161.92, top: 162.92, width: 124.16, height: 124.16,
        maskImage: `url('${imgChloeMaskSm}')`, maskSize: '96px 96px', maskPosition: '14.078px 14.08px', maskRepeat: 'no-repeat',
        WebkitMaskImage: `url('${imgChloeMaskSm}')`, WebkitMaskSize: '96px 96px', WebkitMaskPosition: '14.078px 14.08px', WebkitMaskRepeat: 'no-repeat',
        overflow: 'hidden',
      }}>
        <img alt="Chloe" className="absolute max-w-none" style={{ left: '2.92%', top: '11.44%', width: '88.54%', height: '88.54%' }} src={imgChloe1} />
      </div>

      {/* "Maria" name tag — centered at top */}
      <div className="absolute flex items-center justify-center" style={{ left: '50%', transform: 'translateX(-50%)', top: 0 }}>
        <div className="relative flex items-center justify-center px-[20px] py-[6px] rounded-[1000px]"
          style={{ background: '#b8d8ff', boxShadow: '0px 8px 40px 0px rgba(0,0,0,0.12)', whiteSpace: 'nowrap' }}>
          <div className="absolute inset-0 rounded-full pointer-events-none">
            <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.65)' }} />
            <div className="absolute inset-0 rounded-full" style={{ background: '#ddd', mixBlendMode: 'color-burn' }} />
            <div className="absolute inset-0 rounded-full" style={{ background: '#f7f7f7', mixBlendMode: 'darken' }} />
          </div>
          <span className="relative font-bold text-[17px] text-[#1a1a1a]">Maria</span>
        </div>
      </div>

      {/* "Mentions you" badge — shifted left, below Sarah petal */}
      <div className="absolute flex flex-col items-center" style={{ left: 64, transform: 'translateX(-50%)', top: 160 }}>
        <div className="relative flex items-center justify-center px-[12px] py-[6px] rounded-[1000px]"
          style={{ background: '#ffdeb8', boxShadow: '0px 8px 40px 0px rgba(0,0,0,0.12)', whiteSpace: 'nowrap' }}>
          <div className="absolute inset-0 rounded-full pointer-events-none">
            <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.65)' }} />
            <div className="absolute inset-0 rounded-full" style={{ background: '#ddd', mixBlendMode: 'color-burn' }} />
            <div className="absolute inset-0 rounded-full" style={{ background: '#f7f7f7', mixBlendMode: 'darken' }} />
          </div>
          <span className="relative font-normal text-[12px] text-[#6d6d6e]">Mentions you</span>
        </div>
        <div style={{ width: 35.84, height: 8.32, marginTop: -1 }}>
          <div style={{
            width: '100%', height: '100%',
            background: '#ffdeb8',
            transform: 'rotate(180deg)',
            maskImage: `url('${imgMentionsArrow}')`,
            maskSize: '100% 100%', maskRepeat: 'no-repeat',
            WebkitMaskImage: `url('${imgMentionsArrow}')`,
            WebkitMaskSize: '100% 100%', WebkitMaskRepeat: 'no-repeat',
          }} />
        </div>
      </div>
    </div>
  )
}

// Hero cluster — Sarah speaking (240×302)
function HeroClusterPlayingSarah() {
  return (
    <div className="relative" style={{ width: 240, height: 302 }}>
      {/* BG union */}
      <img alt="" className="absolute" style={{ left: 0, top: 28, width: 240, height: 272.5 }} src={imgUnionSarah} />

      {/* Maria petal (left) */}
      <div className="absolute" style={{
        left: -2.4, top: 84.8, width: 202.608, height: 270.144,
        maskImage: `url('${imgHeroMask}')`, maskSize: '96px 96px', maskPosition: '18.398px 103.2px', maskRepeat: 'no-repeat',
        WebkitMaskImage: `url('${imgHeroMask}')`, WebkitMaskSize: '96px 96px', WebkitMaskPosition: '18.398px 103.2px', WebkitMaskRepeat: 'no-repeat',
      }}>
        <img alt="Maria" className="absolute inset-0 w-full h-full object-cover" src={imgMaria1} />
      </div>

      {/* Lainey petal (lower-left) */}
      <div className="absolute" style={{
        left: -16, top: 138.4, width: 160, height: 212.8,
        maskImage: `url('${imgHeroMask}')`, maskSize: '96px 96px', maskPosition: '32px 49.6px', maskRepeat: 'no-repeat',
        WebkitMaskImage: `url('${imgHeroMask}')`, WebkitMaskSize: '96px 96px', WebkitMaskPosition: '32px 49.6px', WebkitMaskRepeat: 'no-repeat',
      }}>
        <img alt="Lainey" className="absolute inset-0 w-full h-full object-cover" src={imgLainey1} />
      </div>

      {/* Orange halo ring behind Sarah */}
      <div className="absolute" style={{ left: 72, top: 52, width: 144, height: 144 }}>
        <div className="absolute" style={{ inset: '-22.22%' }}>
          <img alt="" className="w-full h-full" src={imgOrangeHalo} />
        </div>
      </div>

      {/* Sarah — enlarged (144px mask, reuses Maria mask shape) */}
      <div className="absolute" style={{
        left: 9.6, top: 8.8, width: 256.8, height: 342,
        maskImage: `url('${imgMariaMaskLg}')`, maskSize: '144px 144px', maskPosition: '62.398px 43.2px', maskRepeat: 'no-repeat',
        WebkitMaskImage: `url('${imgMariaMaskLg}')`, WebkitMaskSize: '144px 144px', WebkitMaskPosition: '62.398px 43.2px', WebkitMaskRepeat: 'no-repeat',
      }}>
        <img alt="Sarah" className="absolute inset-0 w-full h-full object-cover" src={imgSarah1} />
      </div>

      {/* "Sarah / Mentions you" name tag — offset 24px right of center */}
      <div className="absolute flex items-center justify-center"
        style={{ left: 'calc(50% + 24px)', transform: 'translateX(-50%)', top: 0 }}>
        <div className="relative flex flex-col items-center justify-center px-[20px] py-[6px] rounded-[1000px]"
          style={{ background: '#ffdeb8', boxShadow: '0px 8px 40px 0px rgba(0,0,0,0.12)', whiteSpace: 'nowrap' }}>
          <div className="absolute inset-0 rounded-full pointer-events-none">
            <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.65)' }} />
            <div className="absolute inset-0 rounded-full" style={{ background: '#ddd', mixBlendMode: 'color-burn' }} />
            <div className="absolute inset-0 rounded-full" style={{ background: '#f7f7f7', mixBlendMode: 'darken' }} />
          </div>
          <span className="relative font-bold text-[17px] text-[#1a1a1a] leading-[1.1]">Sarah</span>
          <span className="relative font-normal text-[14px] text-[#6d6d6e] leading-[1.1]">Mentions you</span>
        </div>
      </div>
    </div>
  )
}

// Hero cluster — Lainey speaking (240×290)
function HeroClusterPlayingLainey() {
  return (
    <div className="relative" style={{ width: 240, height: 290 }}>
      {/* BG union — reuse Sarah shape */}
      <img alt="" className="absolute" style={{ left: 0, top: 16, width: 240, height: 272.5 }} src={imgUnionSarah} />

      {/* Green halo ring behind Lainey */}
      <div className="absolute" style={{ left: 72, top: 40, width: 144, height: 144 }}>
        <div className="absolute" style={{ inset: '-22.22%' }}>
          <img alt="" className="w-full h-full" src={imgGreenHalo} />
        </div>
      </div>

      {/* Lainey — enlarged center (144px mask, reuses Maria mask shape) */}
      <div className="absolute" style={{
        left: 24, top: -34.4, width: 240, height: 319.2,
        maskImage: `url('${imgMariaMaskLg}')`, maskSize: '144px 144px', maskPosition: '48px 74.4px', maskRepeat: 'no-repeat',
        WebkitMaskImage: `url('${imgMariaMaskLg}')`, WebkitMaskSize: '144px 144px', WebkitMaskPosition: '48px 74.4px', WebkitMaskRepeat: 'no-repeat',
      }}>
        <img alt="Lainey" className="absolute inset-0 w-full h-full object-cover" src={imgLainey1} />
      </div>

      {/* Maria petal (left) */}
      <div className="absolute" style={{
        left: 44.4, top: -114.8, width: 303.912, height: 405.216,
        maskImage: `url('${imgMariaMaskLg}')`, maskSize: '96px 96px', maskPosition: '27.598px 154.8px', maskRepeat: 'no-repeat',
        WebkitMaskImage: `url('${imgMariaMaskLg}')`, WebkitMaskSize: '96px 96px', WebkitMaskPosition: '27.598px 154.8px', WebkitMaskRepeat: 'no-repeat',
      }}>
        <img alt="Maria" className="absolute inset-0 w-full h-full object-cover" src={imgMaria1} />
      </div>

      {/* Sarah petal (bottom-right) */}
      <div className="absolute" style={{
        left: -25.6, top: 147.2, width: 171.2, height: 228,
        maskImage: `url('${imgHeroMask}')`, maskSize: '96px 96px', maskPosition: '41.598px 28.8px', maskRepeat: 'no-repeat',
        WebkitMaskImage: `url('${imgHeroMask}')`, WebkitMaskSize: '96px 96px', WebkitMaskPosition: '41.598px 28.8px', WebkitMaskRepeat: 'no-repeat',
      }}>
        <img alt="Sarah" className="absolute inset-0 w-full h-full object-cover" src={imgSarah1} />
      </div>

      {/* "Lainey" name tag */}
      <div className="absolute flex items-center justify-center"
        style={{ left: 96, transform: 'translateX(-50%)', top: 0 }}>
        <div className="relative flex items-center justify-center px-[20px] py-[6px] rounded-[1000px]"
          style={{ background: '#dfffb8', boxShadow: '0px 8px 40px 0px rgba(0,0,0,0.12)', whiteSpace: 'nowrap' }}>
          <div className="absolute inset-0 rounded-full pointer-events-none">
            <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.65)' }} />
            <div className="absolute inset-0 rounded-full" style={{ background: '#ddd', mixBlendMode: 'color-burn' }} />
            <div className="absolute inset-0 rounded-full" style={{ background: '#f7f7f7', mixBlendMode: 'darken' }} />
          </div>
          <span className="relative font-bold text-[17px] text-[#1a1a1a]">Lainey</span>
        </div>
      </div>
    </div>
  )
}

// Waveform bar heights — active recording (red, precise px)
const WAVEFORM_HEIGHTS_ACTIVE = [
  4.562, 5.246, 7.705, 10.444, 12.96, 14.721, 9.626, 21.39, 13.018, 25.066, 15.156, 23.092,
  9.15, 14.854, 3.486, 3.637, 2.303, 3.272, 3.921, 11.07, 6.687, 17.21, 8.812, 20.202, 24.048,
  11.533, 16.046, 18.291, 12.013, 12.013, 24.048, 20.202, 11.884, 4.562, 5.246, 7.705, 10.444,
  12.96, 14.721, 9.626, 21.39, 13.018, 25.066, 15.156, 23.092, 9.15, 14.854, 3.486, 3.637,
  2.303, 3.272, 3.921, 11.07, 6.687, 17.21, 8.812, 20.202, 24.048, 11.533, 16.046, 18.291,
  12.013, 12.013, 24.048, 20.202, 11.884, 10.444, 6.015, 6.015, 4.188, 3.508, 2.957, 2.548,
  4.188, 6.687, 10.444, 4.188, 4.188, 6.687, 10.444, 2.548, 4.188, 6.687, 10.444, 4.188,
  4.188, 6.687, 10.444, 11.884, 20.202, 24.048, 24.048, 20.202, 8.812, 16.046, 11.533, 6.015,
  6.015, 3.508,
]

// Waveform bar heights — review state (grey, integer px)
const WAVEFORM_HEIGHTS_REVIEW = [
  5, 5, 8, 11, 13, 15, 9, 21, 13, 25, 15, 23, 9, 15, 3, 4, 2, 3, 4, 11, 7, 17, 9, 20, 24,
  11, 16, 18, 12, 12, 24, 20, 12, 5, 5, 8, 11, 13, 15, 9, 21, 13, 25, 15, 23, 9, 15, 3, 4,
  2, 3, 4, 11, 7, 17, 9, 20, 24, 11, 16, 18, 12, 12, 24, 20, 12, 11, 6, 6, 4, 3, 3, 3, 4,
  7, 11, 4, 4, 7, 11, 3, 4, 7, 11, 4, 4, 7, 11, 12, 20, 24, 24, 20, 9, 16, 11, 6, 6, 3,
]

function SmallGlassBtn({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center justify-center active:opacity-70 transition-opacity rounded-full"
      style={{ width: 44.55, height: 44.55 }}
    >
      <div className="absolute inset-0 pointer-events-none rounded-full" style={{ boxShadow: '0px 6.891px 11.137px 0px rgba(0,0,0,0.08)' }}>
        <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.65)' }} />
        <div className="absolute inset-0 rounded-full" style={{ background: '#ddd', mixBlendMode: 'color-burn' }} />
        <div className="absolute inset-0 rounded-full" style={{ background: '#f7f7f7', mixBlendMode: 'darken' }} />
      </div>
      <div className="relative flex items-center justify-center">{children}</div>
    </button>
  )
}

type RecordMode = 'off' | 'active' | 'review' | 'analyzing' | 'analyzing2' | 'analyzing3' | 'analyzing4'

function RecordingPopup({ mode, onClose, onStop, onSend, timerLabel, onPlayPreview }: {
  mode: 'active' | 'review' | 'analyzing' | 'analyzing2' | 'analyzing3' | 'analyzing4'
  onClose: () => void
  onStop: () => void
  onSend: () => void
  timerLabel: string
  onPlayPreview: () => void
}) {
  const isActive = mode === 'active'
  const isAnalyzing = mode === 'analyzing' || mode === 'analyzing2' || mode === 'analyzing3' || mode === 'analyzing4'
  const isAnalyzing2 = mode === 'analyzing2' || mode === 'analyzing3' || mode === 'analyzing4'
  const isAnalyzing3 = mode === 'analyzing3' || mode === 'analyzing4'
  const isAnalyzing4 = mode === 'analyzing4'
  const heights = isActive ? WAVEFORM_HEIGHTS_ACTIVE : WAVEFORM_HEIGHTS_REVIEW
  const barColor = isActive ? '#f97878' : '#8a8a8e'

  return (
    <>
      {/* Dark overlay */}
      <div
        className="absolute inset-0 z-20"
        style={{ background: 'rgba(0,0,0,0.3)' }}
        onClick={isAnalyzing ? undefined : onClose}
      />

      {/* Recording sheet */}
      <div
        className="absolute z-30"
        style={{
          left: 8, top: 563, width: 386, height: 302,
          background: '#efeef2',
          borderRadius: '45px 45px 60px 60px',
        }}
      >
        {isAnalyzing ? (
          <>
            {/* Analyzing header */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center" style={{ top: 23, gap: 8, height: 40 }}>
              <div className="relative shrink-0" style={{ width: 22, height: 22 }}>
                <div className="absolute inset-0">
                  <div className="absolute" style={{ inset: '-9.5%' }}>
                    <img alt="" className="w-full h-full" src={isAnalyzing4 ? imgAiGlow4 : isAnalyzing3 ? imgAiGlow3 : isAnalyzing2 ? imgAiGlow2 : imgAiGlow1} />
                  </div>
                </div>
                <img alt="" className="absolute inset-0 w-full h-full" src={isAnalyzing4 ? imgAiIcon4 : isAnalyzing3 ? imgAiIcon3 : isAnalyzing2 ? imgAiIcon2 : imgAiIcon1} />
              </div>
              <span className="font-semibold text-black whitespace-nowrap" style={{ fontSize: 19.2, lineHeight: '21.209px' }}>Analyzing</span>
            </div>

            {/* Progress bar */}
            {isAnalyzing4 ? (
              /* State 4: all segments complete with avatars */
              <div className="absolute flex items-start" style={{ left: 15, top: 78, gap: 9 }}>
                {/* Chloe — purple bar, 74.2px */}
                <div className="flex flex-col items-center shrink-0" style={{ width: 74.2, gap: 12 }}>
                  <div className="relative inline-grid place-items-start shrink-0">
                    <div style={{
                      position: 'relative', width: 38.8, height: 38.8,
                      marginLeft: -4.4, marginTop: -4.4,
                      maskImage: `url('${imgChloe2Mask}')`, maskSize: '30px 30px', maskPosition: '4.402px 4.4px', maskRepeat: 'no-repeat',
                      WebkitMaskImage: `url('${imgChloe2Mask}')`, WebkitMaskSize: '30px 30px', WebkitMaskPosition: '4.402px 4.4px', WebkitMaskRepeat: 'no-repeat',
                      overflow: 'hidden',
                    }}>
                      <img alt="Chloe" className="absolute max-w-none" style={{ left: '2.92%', top: '11.44%', width: '88.54%', height: '88.54%' }} src={imgChloe1} />
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0 w-full" style={{ gap: 8 }}>
                    <div className="relative shrink-0 w-full" style={{ height: 0 }}>
                      <div className="absolute" style={{ top: -13.5, bottom: -13.5, left: '-18.19%', right: '-18.19%' }}>
                        <img alt="" className="block w-full h-full" src={imgPurpleBar} />
                      </div>
                    </div>
                    <span className="text-[12px] text-black leading-normal w-full text-right" style={{ marginTop: 13.5 }}>0:13</span>
                  </div>
                </div>

                {/* Sooim — first segment, 78px */}
                <div className="flex flex-col items-center shrink-0" style={{ width: 78, gap: 12 }}>
                  <div className="relative inline-grid place-items-start shrink-0">
                    <div style={{
                      position: 'relative', width: 31.395, height: 31.395,
                      marginLeft: -1.4, marginTop: -0.7,
                      maskImage: `url('${imgSooim4Mask}')`, maskSize: '30px 30px', maskPosition: '1.395px 0.698px', maskRepeat: 'no-repeat',
                      WebkitMaskImage: `url('${imgSooim4Mask}')`, WebkitMaskSize: '30px 30px', WebkitMaskPosition: '1.395px 0.698px', WebkitMaskRepeat: 'no-repeat',
                    }}>
                      <img alt="Sooim" className="absolute inset-0 w-full h-full object-cover" src={imgSooim1Photo} />
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0 w-full" style={{ gap: 8 }}>
                    <div className="relative shrink-0 w-full" style={{ height: 0 }}>
                      <div className="absolute" style={{ top: -13.5, bottom: -13.5, left: '-17.31%', right: '-17.31%' }}>
                        <img alt="" className="block w-full h-full" src={imgSooim2Bar} />
                      </div>
                    </div>
                    <span className="text-[12px] text-black leading-normal w-full text-right" style={{ marginTop: 13.5 }}>0:25</span>
                  </div>
                </div>

                {/* Maria — blue bar, 74.2px */}
                <div className="flex flex-col items-center shrink-0" style={{ width: 74.2, gap: 12 }}>
                  <div className="relative inline-grid place-items-start shrink-0">
                    <div style={{
                      position: 'relative', width: 63.315, height: 84.42,
                      marginLeft: -5.75, marginTop: -32.25,
                      maskImage: `url('${imgMaria2Mask}')`, maskSize: '30px 30px', maskPosition: '5.75px 32.25px', maskRepeat: 'no-repeat',
                      WebkitMaskImage: `url('${imgMaria2Mask}')`, WebkitMaskSize: '30px 30px', WebkitMaskPosition: '5.75px 32.25px', WebkitMaskRepeat: 'no-repeat',
                    }}>
                      <img alt="Maria" className="absolute inset-0 w-full h-full object-cover" src={imgMaria1} />
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0 w-full" style={{ gap: 8 }}>
                    <div className="relative shrink-0 w-full" style={{ height: 0 }}>
                      <div className="absolute" style={{ top: -13.5, bottom: -13.5, left: '-18.19%', right: '-18.19%' }}>
                        <img alt="" className="block w-full h-full" src={imgBlueBar} />
                      </div>
                    </div>
                    <span className="text-[12px] text-black leading-normal w-full text-right" style={{ marginTop: 13.5 }}>0:49</span>
                  </div>
                </div>

                {/* Sooim — second segment, 106px */}
                <div className="flex flex-col items-center shrink-0" style={{ width: 106, gap: 12 }}>
                  <div className="relative inline-grid place-items-start shrink-0">
                    <div style={{
                      position: 'relative', width: 31.395, height: 31.395,
                      marginLeft: -1.4, marginTop: -0.7,
                      maskImage: `url('${imgSooim4Mask}')`, maskSize: '30px 30px', maskPosition: '1.395px 0.698px', maskRepeat: 'no-repeat',
                      WebkitMaskImage: `url('${imgSooim4Mask}')`, WebkitMaskSize: '30px 30px', WebkitMaskPosition: '1.395px 0.698px', WebkitMaskRepeat: 'no-repeat',
                    }}>
                      <img alt="Sooim" className="absolute inset-0 w-full h-full object-cover" src={imgSooim1Photo} />
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0 w-full" style={{ gap: 8 }}>
                    <div className="relative shrink-0 w-full" style={{ height: 0 }}>
                      <div className="absolute" style={{ top: -13.5, bottom: -13.5, left: '-12.74%', right: '-12.74%' }}>
                        <img alt="" className="block w-full h-full" src={imgSooim3Bar} />
                      </div>
                    </div>
                    <span className="text-[12px] text-black leading-normal w-full text-right" style={{ marginTop: 13.5 }}>1:11</span>
                  </div>
                </div>
              </div>
            ) : isAnalyzing3 ? (
              /* State 3: 0:12 completed bar + 0:22 growing segment */
              <div className="absolute left-1/2 -translate-x-1/2 flex items-start" style={{ top: 120, width: 360, gap: 12, paddingLeft: 2, paddingRight: 2 }}>
                <div className="flex flex-col items-end shrink-0" style={{ width: 120, gap: 8 }}>
                  <div className="relative shrink-0" style={{ width: 120, height: 0 }}>
                    <div className="absolute" style={{ top: -13.5, bottom: -13.5, left: '-11.25%', right: '-11.25%' }}>
                      <img alt="" className="block w-full h-full" src={imgBar012b} />
                    </div>
                  </div>
                  <span className="text-[12px] text-black leading-normal" style={{ marginTop: 13.5 }}>0:12</span>
                </div>
                <div className="flex flex-col items-start shrink-0" style={{ width: 9 }}>
                  <div className="relative shrink-0" style={{ width: 9, height: 0 }}>
                    <div className="absolute" style={{ top: -13.5, bottom: -13.5, left: '-150%', right: '-150%' }}>
                      <img alt="" className="block w-full h-full" src={imgBar022} />
                    </div>
                  </div>
                </div>
              </div>
            ) : isAnalyzing2 ? (
              /* State 2: 0:12 completed bar */
              <div className="absolute left-1/2 -translate-x-1/2 flex items-start" style={{ top: 120, width: 360, gap: 12 }}>
                <div className="flex flex-col items-end shrink-0" style={{ gap: 8 }}>
                  <div className="relative shrink-0" style={{ width: 120, height: 0 }}>
                    <div className="absolute" style={{ top: -13.5, bottom: -13.5, left: '-11.25%', right: '-11.25%' }}>
                      <img alt="" className="block w-full h-full" src={imgBar012b} />
                    </div>
                  </div>
                  <span className="text-[12px] text-black leading-normal" style={{ marginTop: 13.5 }}>0:12</span>
                </div>
              </div>
            ) : (
              /* State 1: tiny dim bar, far left */
              <div className="absolute" style={{ left: 13, top: 120, width: 18 }}>
                <div className="relative" style={{ width: 14, height: 0 }}>
                  <div className="absolute" style={{ top: -13.5, bottom: -13.5, left: -13.5, right: -13.5 }}>
                    <img alt="" className="block w-full h-full" src={imgBar012a} />
                  </div>
                </div>
              </div>
            )}

            {/* Single large X button — centered */}
            <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 184 }}>
              <button
                onClick={onClose}
                className="relative flex items-center justify-center active:opacity-70 transition-opacity rounded-full"
                style={{ width: 79.2, height: 79.2, background: 'white' }}
              >
                <div className="absolute inset-0 pointer-events-none rounded-full" style={{ boxShadow: '0px 21.78px 33px 0px rgba(0,0,0,0.08)' }}>
                  <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.65)' }} />
                  <div className="absolute inset-0 rounded-full" style={{ background: '#ddd', mixBlendMode: 'color-burn' }} />
                  <div className="absolute inset-0 rounded-full" style={{ background: '#f7f7f7', mixBlendMode: 'darken' }} />
                </div>
                <img alt="close" className="relative" style={{ width: 43, height: 50.094 }} src={imgXLarge} />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Timer */}
            <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 32 }}>
              <span className="font-bold text-[17px] text-black leading-normal">{timerLabel}</span>
            </div>

            {/* Voice waveform */}
            <div
              className="absolute left-1/2 -translate-x-1/2 flex items-center overflow-hidden"
              style={{ top: 92, height: 54.632, gap: 1.508, maxWidth: 370 }}
            >
              {heights.map((h, i) => (
                <div
                  key={i}
                  style={{ width: 2, height: h, background: barColor, borderRadius: 9999, flexShrink: 0 }}
                />
              ))}
            </div>

            {/* Buttons */}
            <div
              className="absolute left-1/2 -translate-x-1/2 flex items-center"
              style={{ top: 184, gap: 8 }}
            >
              {/* Exit / X */}
              <SmallGlassBtn onClick={onClose}>
                <span className="text-[17px] text-[#1a1a1a] font-medium leading-none">✕</span>
              </SmallGlassBtn>

              {isActive ? (
                /* Stop recording — red square */
                <button
                  onClick={onStop}
                  className="relative flex items-center justify-center active:opacity-70 transition-opacity rounded-full"
                  style={{ width: 79.2, height: 79.2 }}
                >
                  <div className="absolute inset-0 pointer-events-none rounded-full" style={{ boxShadow: '0px 21.78px 33px 0px rgba(0,0,0,0.08)' }}>
                    <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.65)' }} />
                    <div className="absolute inset-0 rounded-full" style={{ background: '#ddd', mixBlendMode: 'color-burn' }} />
                    <div className="absolute inset-0 rounded-full" style={{ background: '#f7f7f7', mixBlendMode: 'darken' }} />
                  </div>
                  <div className="relative" style={{ width: 30, height: 30, background: '#ff334b', borderRadius: '4px 4px 4px 6px' }} />
                </button>
              ) : (
                /* Play preview — white glass large */
                <button
                  onClick={onPlayPreview}
                  className="relative flex items-center justify-center active:opacity-70 transition-opacity rounded-full"
                  style={{ width: 79.2, height: 79.2, background: 'white' }}
                >
                  <div className="absolute inset-0 pointer-events-none rounded-full" style={{ boxShadow: '0px 21.78px 33px 0px rgba(0,0,0,0.08)' }}>
                    <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.65)' }} />
                    <div className="absolute inset-0 rounded-full" style={{ background: '#ddd', mixBlendMode: 'color-burn' }} />
                    <div className="absolute inset-0 rounded-full" style={{ background: '#f7f7f7', mixBlendMode: 'darken' }} />
                  </div>
                  <img alt="play" className="relative" style={{ width: 43, height: 44.453 }} src={imgPlayReview} />
                </button>
              )}

              {/* Send — blue tinted glass */}
              <SmallGlassBtn onClick={onSend}>
                <div className="absolute inset-0 rounded-full pointer-events-none" style={{ background: '#b8d8ff', opacity: 0.6 }} />
                <img alt="send" className="relative" style={{ width: 33.413, height: 33.413 }} src={imgSendBtn} />
              </SmallGlassBtn>
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
type Speaker = 'idle' | 'chloe' | 'maria' | 'chloe2' | 'sarah' | 'lainey'

interface ConversationPageProps {
  onBack?: () => void
}

export default function ConversationPage({ onBack }: ConversationPageProps) {
  const [showTranscript, setShowTranscript] = useState(false)
  const [speaker, setSpeaker] = useState<Speaker>('idle')
  const [recordMode, setRecordMode] = useState<RecordMode>('off')
  const [reviewDuration, setReviewDuration] = useState(0)

  const { messages, audioReady, addRecording } = useConversation()
  const player = useConversationPlayer(messages)
  const recorder = useRecorder()
  const reviewRef = useRef<{ blob: Blob; duration: number; url: string } | null>(null)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)
  const pendingPlaybackMessageIdRef = useRef<string | null>(null)

  // Auto-advance through analyzing steps while the pipeline is running.
  useEffect(() => {
    if (recordMode !== 'analyzing' && recordMode !== 'analyzing2' && recordMode !== 'analyzing3' && recordMode !== 'analyzing4') return
    if (recordMode === 'analyzing4') return
    const next: RecordMode = recordMode === 'analyzing' ? 'analyzing2' : recordMode === 'analyzing2' ? 'analyzing3' : 'analyzing4'
    const t = setTimeout(() => setRecordMode(next), 1500)
    return () => clearTimeout(t)
  }, [recordMode])

  useEffect(() => {
    const pendingMessageId = pendingPlaybackMessageIdRef.current
    if (recordMode !== 'off' || !pendingMessageId) return

    const pendingMessage = messages.find((message) => message.id === pendingMessageId)
    if (!pendingMessage || pendingMessage.status !== 'transcribed') return

    pendingPlaybackMessageIdRef.current = null
    player.playFrom(pendingMessageId)
  }, [messages, player, recordMode])

  // Sync hero cluster from player state
  useEffect(() => {
    if (!player.state.isPlaying) { setSpeaker('idle'); return }
    const sid = player.state.activeSpeakerId
    const mid = player.state.activeMessageId
    if (sid === 'chloe') setSpeaker(mid === 'seed-chloe-2' ? 'chloe2' : 'chloe')
    else if (sid === 'maria') setSpeaker('maria')
    else if (sid === 'sarah') setSpeaker('sarah')
    else if (sid === 'lainey') setSpeaker('lainey')
    else setSpeaker('idle')
  }, [player.state.isPlaying, player.state.activeSpeakerId, player.state.activeMessageId])

  const scrubberSrc = speaker === 'maria' ? imgBarMaria : speaker === 'chloe' ? imgBarChloe : speaker === 'chloe2' ? imgBarChloe2 : speaker === 'sarah' ? imgBarSarah : imgBarIdle
  const timeLeft    = speaker === 'maria' ? '0:37' : speaker === 'chloe' ? '0:13' : speaker === 'chloe2' ? '0:46' : speaker === 'sarah' ? '1:29' : speaker === 'lainey' ? '2:02' : '0:00'
  const timeRight   = speaker === 'maria' ? '-0:42' : speaker === 'chloe' ? '-1:06' : speaker === 'chloe2' ? '-0:33' : speaker === 'sarah' ? '-0:34' : speaker === 'lainey' ? '-0:01' : '-1:19'

  const timerSeconds = recordMode === 'active' ? recorder.elapsed : reviewDuration
  const timerLabel = `${Math.floor(timerSeconds / 60)}:${String(timerSeconds % 60).padStart(2, '0')}`

  function handlePlayPause() {
    if (player.state.isPlaying) player.stop()
    else if (audioReady) player.playAll()
    else setSpeaker(s => s !== 'idle' ? 'idle' : 'chloe')
  }

  function handleSkip() {
    if (player.state.isPlaying) player.next()
    else player.playAll()
  }

  function handleRestart() {
    if (player.state.activeMessageId) player.playFrom(player.state.activeMessageId)
    else player.playAll()
  }

  async function handleRecord() {
    await recorder.start()
    setRecordMode('active')
  }

  async function handleStop() {
    const result = await recorder.stop()
    if (result) { reviewRef.current = result; setReviewDuration(result.duration) }
    setRecordMode('review')
  }

  function handlePlayPreview() {
    if (!reviewRef.current) return
    if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null; return }
    const audio = new Audio(reviewRef.current.url)
    previewAudioRef.current = audio
    audio.onended = () => { previewAudioRef.current = null }
    audio.play().catch(() => { previewAudioRef.current = null })
  }

  async function handleSend() {
    const review = reviewRef.current
    if (!review) return
    if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null }
    setRecordMode('analyzing')
    reviewRef.current = null

    const result = await addRecording(review.blob, review.duration, review.url)

    setReviewDuration(0)
    setRecordMode('off')

    if (result.startPlaybackFromId) pendingPlaybackMessageIdRef.current = result.startPlaybackFromId
    else if (audioReady) player.playAll()
  }

  function handleClose() {
    if (recorder.state === 'recording') recorder.stop()
    if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null }
    reviewRef.current = null
    setReviewDuration(0)
    setRecordMode('off')
  }

  // Transcript derived entirely from conversation state — single source of truth
  const transcriptMessages: Message[] = messages
    .filter(m => m.cleanTranscript != null)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map(m => {
      const av = AVATAR_DATA[m.speaker] ?? AVATAR_DATA.me
      const name = DISPLAY_NAME[m.speaker] ?? m.speaker
      const time = new Date(m.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      return { id: m.id, speaker: name, time, ...av, segments: [m.cleanTranscript as string] }
    })

  return (
    <div className="relative bg-white overflow-hidden mx-auto flex flex-col" style={{ width: 402, minHeight: '100vh' }}>

      {/* ── Background gradient (5% opacity) ── */}
      <div className="absolute pointer-events-none" style={{
        left: -10, top: -49, width: 544, height: 971,
        opacity: 0.05, transform: 'rotate(180deg)', zIndex: 0,
      }}>
        <img alt="" className="absolute inset-0 w-full h-full object-cover" src={imgBg} />
      </div>

      {/* ── Status bar ── */}
      <StatusBar />

      {/* ── Header ── */}
      <div className="relative z-10 flex items-center justify-between px-[15px] pt-[60px] pb-[8px]">
        <GlassButton width={44} height={44} onClick={onBack}>
          <img alt="back" className="w-[36px] h-[36px]" src={imgBackArrow} />
        </GlassButton>
        <span className="font-semibold text-[24px] text-black leading-[30px]">besties💛</span>
        <GlassButton width={44} height={44}>
          <img alt="menu" style={{ width: 18.484, height: 4.109 }} src={imgMenu} />
        </GlassButton>
      </div>

      {/* ── Scrollable content ── */}
      <div className="relative z-10 flex-1 overflow-y-auto pb-[140px]">

        {/* Hero cluster */}
        {speaker === 'maria' ? (
          <div className="flex justify-center pt-[61px] pb-[44px]">
            <HeroClusterPlayingMaria />
          </div>
        ) : (speaker === 'chloe' || speaker === 'chloe2') ? (
          <div className="flex justify-center pt-[61px] pb-[44px]">
            <HeroClusterPlaying />
          </div>
        ) : speaker === 'sarah' ? (
          <div className="flex justify-center pt-[61px] pb-[44px]">
            <HeroClusterPlayingSarah />
          </div>
        ) : speaker === 'lainey' ? (
          <div className="flex justify-center pt-[61px] pb-[44px]">
            <HeroClusterPlayingLainey />
          </div>
        ) : (
          <div className="flex justify-center pt-[141px] pb-[76px]">
            <HeroCluster />
          </div>
        )}

        {/* Timeline scrubber */}
        <div className={`relative flex flex-col gap-[7px] items-center px-[16px]${(speaker === 'sarah' || speaker === 'lainey') ? ' pt-[44px]' : ''}`}>
          {/* @You badge — Sarah state only */}
          {speaker === 'sarah' && (
            <div className="absolute z-10" style={{ top: 2, left: 'calc(50% - 92.5px)', transform: 'translateX(-50%)' }}>
              <div className="relative flex items-center justify-center px-[12px] py-[6px] rounded-[1000px]"
                style={{ background: '#ffdeb8', boxShadow: '0px 8px 40px 0px rgba(0,0,0,0.12)', whiteSpace: 'nowrap' }}>
                <div className="absolute inset-0 rounded-full pointer-events-none">
                  <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.65)' }} />
                  <div className="absolute inset-0 rounded-full" style={{ background: '#ddd', mixBlendMode: 'color-burn' }} />
                  <div className="absolute inset-0 rounded-full" style={{ background: '#f7f7f7', mixBlendMode: 'darken' }} />
                </div>
                <span className="relative font-normal text-[12px] text-[#6d6d6e]">@You</span>
              </div>
              {/* Arrow pointing down toward scrubber */}
              <div className="flex justify-center" style={{ marginTop: -1 }}>
                <div style={{
                  width: 35.84, height: 8.32,
                  background: '#ffdeb8',
                  transform: 'rotate(180deg)',
                  maskImage: `url('${imgMentionsArrow}')`,
                  maskSize: '100% 100%', maskRepeat: 'no-repeat',
                  WebkitMaskImage: `url('${imgMentionsArrow}')`,
                  WebkitMaskSize: '100% 100%', WebkitMaskRepeat: 'no-repeat',
                }} />
              </div>
            </div>
          )}
          <div className="relative w-full overflow-visible" style={{ height: 0 }}>
            {speaker === 'lainey' ? (
              <>
                <img alt="" className="absolute block w-full pointer-events-none"
                  style={{ top: -13.5, height: 27, left: 0 }}
                  src={imgBarLaineyGreen} />
                <img alt="" className="absolute block pointer-events-none"
                  style={{ top: -13.5, height: 27, left: 0, width: '40.8%' }}
                  src={imgBarLaineyOrange} />
              </>
            ) : (
              <img alt="" className="absolute block w-full pointer-events-none"
                style={{ top: -13.5, height: 27, left: 0 }}
                src={scrubberSrc} />
            )}
          </div>
          <div style={{ height: 13.5 }} />
          <div className="flex justify-between w-full">
            <span className="text-[10px] text-black leading-normal">{timeLeft}</span>
            <span className="text-[10px] text-black leading-normal text-right">{timeRight}</span>
          </div>
        </div>

        {/* Transcript toggle */}
        <div className="flex items-center justify-center gap-[8px] mt-[12px]">
          <button
            onClick={() => setShowTranscript(v => !v)}
            className="flex items-center gap-[8px] active:opacity-70 transition-opacity"
          >
            <span className="text-[14px] text-[#8a8a8e] tracking-[-0.43px] leading-[22px]">
              {showTranscript ? 'Hide transcript' : 'View transcript'}
            </span>
            <img
              alt=""
              style={{
                width: 11.903, height: 6.948,
                transform: showTranscript ? 'rotate(0deg)' : 'rotate(180deg)',
                transition: 'transform 0.2s',
              }}
              src={imgChevron}
            />
          </button>
        </div>

        {/* Transcript messages */}
        {showTranscript && (
          <div className="relative mt-[16px]">
            <div
              className="absolute top-0 left-0 right-0 h-[48px] pointer-events-none z-10"
              style={{ background: 'linear-gradient(to bottom, white 0%, rgba(255,255,255,0) 100%)' }}
            />
            <div className="flex flex-col gap-[20px] px-[16px]">
              {transcriptMessages.map(msg => (
                <div key={msg.id} className="flex items-start gap-[12px]">
                  <TranscriptAvatar msg={msg} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium text-[15px] text-black leading-[22px]">{msg.speaker}</span>
                      <span className="text-[15px] text-[#8a8a8e] leading-[22px] shrink-0">{msg.time}</span>
                    </div>
                    <div className="mt-[4px]">
                      <MessageText segments={msg.segments} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Heard-people avatars (Sarah / Lainey state) ── */}
      {(speaker === 'sarah' || speaker === 'lainey') && (
        <div className="absolute pointer-events-none z-5" style={{ left: 170, top: 551, width: 60, height: 45 }}>
          {/* Maria (right, slightly behind) */}
          <div className="absolute" style={{ left: 15, top: 0, width: 45, height: 45 }}>
            <div style={{
              position: 'absolute',
              left: 6.38, top: -48.37, width: 94.972, height: 126.63,
              maskImage: `url('${imgMaria2HalfMask}')`, maskSize: '45px 45px', maskPosition: '8.625px 48.375px', maskRepeat: 'no-repeat',
              WebkitMaskImage: `url('${imgMaria2HalfMask}')`, WebkitMaskSize: '45px 45px', WebkitMaskPosition: '8.625px 48.375px', WebkitMaskRepeat: 'no-repeat',
            }}>
              <img alt="Maria" className="absolute inset-0 w-full h-full object-cover" src={imgMaria1} />
            </div>
            <div className="absolute" style={{ inset: '-6.67%' }}>
              <img alt="" className="w-full h-full" src={imgOutlineRing} />
            </div>
          </div>
          {/* Chloe (left, in front) */}
          <div className="absolute" style={{ left: 0, top: 0, width: 45, height: 45 }}>
            <div style={{
              position: 'absolute',
              left: -14.1, top: -6.6, width: 58.2, height: 58.2,
              maskImage: `url('${imgChloeHeardMask}')`, maskSize: '45px 45px', maskPosition: '6.602px 6.6px', maskRepeat: 'no-repeat',
              WebkitMaskImage: `url('${imgChloeHeardMask}')`, WebkitMaskSize: '45px 45px', WebkitMaskPosition: '6.602px 6.6px', WebkitMaskRepeat: 'no-repeat',
              overflow: 'hidden',
            }}>
              <img alt="Chloe" className="absolute max-w-none" style={{ left: '2.92%', top: '11.44%', width: '88.54%', height: '88.54%' }} src={imgChloe1} />
            </div>
            <div className="absolute" style={{ inset: '-6.67%' }}>
              <img alt="" className="w-full h-full" src={imgOutlineRing} />
            </div>
          </div>
        </div>
      )}

      {/* ── Playback controls ── */}
      <div
        className="absolute z-10 flex items-center gap-[12px] justify-center"
        style={{ bottom: 48, left: 0, right: 0 }}
      >
        {/* Restart */}
        <GlassButton width={44.55} height={44.55} shadow="0px 6.891px 11.137px 0px rgba(0,0,0,0.08)" onClick={handleRestart}>
          <img alt="restart" style={{ width: 33.413, height: 33.413 }} src={imgRestart} />
        </GlassButton>

        {/* Play / Pause */}
        <GlassButton width={79} height={79} shadow="0px 21.78px 33px 0px rgba(0,0,0,0.08)" onClick={handlePlayPause}>
          {speaker !== 'idle'
            ? <img alt="pause" style={{ width: 23.906, height: 31.875 }} src={imgPause} />
            : <img alt="play"  style={{ width: 59.25,  height: 59.25  }} src={imgPlay} />
          }
        </GlassButton>

        {/* Record */}
        <GlassButton width={79.2} height={79.2} shadow="0px 21.78px 33px 0px rgba(0,0,0,0.08)" onClick={handleRecord}>
          <img alt="record" style={{ width: 59.4, height: 59.4 }} src={imgRecord} />
        </GlassButton>

        {/* Skip */}
        <GlassButton width={44.55} height={44.55} shadow="0px 6.891px 11.137px 0px rgba(0,0,0,0.08)" onClick={handleSkip}>
          <img alt="skip" style={{ width: 13.859, height: 18.124 }} src={imgSkip} />
        </GlassButton>
      </div>

      {/* ── Recording popup ── */}
      {recordMode !== 'off' && (
        <RecordingPopup
          mode={recordMode as 'active' | 'review' | 'analyzing' | 'analyzing2' | 'analyzing3' | 'analyzing4'}
          onClose={handleClose}
          onStop={handleStop}
          onSend={handleSend}
          timerLabel={timerLabel}
          onPlayPreview={handlePlayPreview}
        />
      )}

    </div>
  )
}
