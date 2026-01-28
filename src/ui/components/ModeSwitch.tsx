'use client'

import { useState, useEffect } from 'react'
import { AiMode, AI_MODE_LABELS, type AiModeType } from '@/lib/types/enums'

const MODE_STORAGE_KEY = 'aiMode'

interface ModeSwitchProps {
  value?: AiModeType
  onChange?: (mode: AiModeType) => void
}

export function ModeSwitch({ value, onChange }: ModeSwitchProps) {
  const [selectedMode, setSelectedMode] = useState<AiModeType>(
    value ?? AiMode.CONTACT_FINDER
  )

  // Load from localStorage on mount
  useEffect(() => {
    if (value !== undefined) return // Controlled component

    const stored = localStorage.getItem(MODE_STORAGE_KEY)
    if (stored && Object.values(AiMode).includes(stored as AiModeType)) {
      setSelectedMode(stored as AiModeType)
    }
  }, [value])

  const handleModeChange = (mode: AiModeType) => {
    setSelectedMode(mode)
    localStorage.setItem(MODE_STORAGE_KEY, mode)
    onChange?.(mode)
  }

  const modes = Object.values(AiMode) as AiModeType[]

  return (
    <div role="radiogroup" aria-label="AI Mode" className="flex gap-1 rounded-lg bg-gray-100 p-1">
      {modes.map((mode) => (
        <label
          key={mode}
          className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            selectedMode === mode
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <input
            type="radio"
            name="aiMode"
            value={mode}
            checked={selectedMode === mode}
            onChange={() => handleModeChange(mode)}
            className="sr-only"
            aria-label={AI_MODE_LABELS[mode]}
          />
          {AI_MODE_LABELS[mode]}
        </label>
      ))}
    </div>
  )
}
