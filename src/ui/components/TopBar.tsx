'use client'

import { type AiModeType } from '@/lib/types/enums'
import { ModeSwitch } from './ModeSwitch'

interface TopBarProps {
  currentMode: AiModeType
  onModeChange: (mode: AiModeType) => void
}

export function TopBar({ currentMode, onModeChange }: TopBarProps) {
  return (
    <header role="banner" className="flex h-14 items-center justify-between border-b bg-white px-6">
      {/* Left side - Mode Switch */}
      <ModeSwitch value={currentMode} onChange={onModeChange} />

      {/* Right side - User Avatar */}
      <div className="flex items-center gap-4">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white"
          role="img"
          aria-label="User avatar"
        >
          U
        </div>
      </div>
    </header>
  )
}
