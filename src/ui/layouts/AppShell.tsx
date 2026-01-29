'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { AiMode, type AiModeType } from '@/lib/types/enums'
import { Sidebar } from '../components/Sidebar'
import { TopBar } from '../components/TopBar'

const MODE_STORAGE_KEY = 'aiMode'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [currentMode, setCurrentMode] = useState<AiModeType>(AiMode.CONTACT_FINDER)

  // Load mode from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(MODE_STORAGE_KEY)
    if (stored && Object.values(AiMode).includes(stored as AiModeType)) {
      setCurrentMode(stored as AiModeType)
    }
  }, [])

  const handleModeChange = (mode: AiModeType) => {
    setCurrentMode(mode)
    localStorage.setItem(MODE_STORAGE_KEY, mode)
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar - 240px (w-60) */}
      <Sidebar currentMode={currentMode} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {/* Top Bar */}
        <TopBar currentMode={currentMode} onModeChange={handleModeChange} />

        {/* Page content */}
        <main role="main" className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
