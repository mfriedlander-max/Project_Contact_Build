'use client'

import Link from 'next/link'
import { AI_MODE_LABELS, type AiModeType } from '@/lib/types/enums'

interface SidebarProps {
  currentMode: AiModeType
}

const navItems = [
  { href: '/home', label: 'Home' },
  { href: '/sheets', label: 'Sheets' },
  { href: '/settings', label: 'Settings' },
]

export function Sidebar({ currentMode }: SidebarProps) {
  return (
    <aside role="complementary" className="flex h-screen w-60 flex-col border-r bg-gray-50">
      {/* Logo/Title */}
      <div className="border-b p-4">
        <h1 className="text-lg font-semibold">Contact CRM</h1>
        <p className="text-xs text-gray-500">Networking Made Easy</p>
      </div>

      {/* Navigation */}
      <nav role="navigation" className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mode Indicator */}
      <div className="border-t p-4">
        <div className="rounded-md bg-gray-100 px-3 py-2">
          <p className="text-xs text-gray-500">Current Mode</p>
          <p className="text-sm font-medium">{AI_MODE_LABELS[currentMode]}</p>
        </div>
      </div>
    </aside>
  )
}
