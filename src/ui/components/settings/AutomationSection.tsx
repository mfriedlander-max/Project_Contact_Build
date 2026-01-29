'use client'

import { useState, useEffect } from 'react'

interface AutomationToggleProps {
  label: string
  description: string
  enabled: boolean
  onChange: (enabled: boolean) => void
}

function AutomationToggle({
  label,
  description,
  enabled,
  onChange,
}: AutomationToggleProps) {
  const handleToggle = () => {
    onChange(!enabled)
  }

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div>
        <h3 className="font-medium">{label}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={enabled}
        onClick={handleToggle}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          enabled ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

interface AutomationSectionProps {
  settings?: { [key: string]: unknown } | null
  onToggle?: (key: string, enabled: boolean) => void
}

const automations = [
  {
    key: 'autoSendDrafts',
    label: 'Auto-send drafts',
    description: 'Automatically send approved drafts at scheduled times',
  },
  {
    key: 'followUpReminders',
    label: 'Follow-up reminders',
    description: 'Get notified when contacts need follow-up',
  },
]

export function AutomationSection({ settings, onToggle }: AutomationSectionProps) {
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (settings) {
      const states: Record<string, boolean> = {}
      for (const automation of automations) {
        states[automation.key] = Boolean(settings[automation.key])
      }
      setToggleStates(states)
    }
  }, [settings])

  const handleChange = (key: string, enabled: boolean) => {
    setToggleStates((prev) => ({ ...prev, [key]: enabled }))
    onToggle?.(key, enabled)
  }

  return (
    <section aria-label="Automation" role="region" className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Automation</h2>
        <p className="text-sm text-gray-500">Automate your workflows</p>
      </div>

      <div className="space-y-3">
        {automations.map((automation) => (
          <AutomationToggle
            key={automation.key}
            label={automation.label}
            description={automation.description}
            enabled={toggleStates[automation.key] ?? false}
            onChange={(enabled) => handleChange(automation.key, enabled)}
          />
        ))}
      </div>
    </section>
  )
}
