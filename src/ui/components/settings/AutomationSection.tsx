'use client'

import { useState } from 'react'

interface AutomationToggleProps {
  label: string
  description: string
  defaultEnabled?: boolean
  onChange?: (enabled: boolean) => void
}

function AutomationToggle({
  label,
  description,
  defaultEnabled = false,
  onChange,
}: AutomationToggleProps) {
  const [enabled, setEnabled] = useState(defaultEnabled)

  const handleToggle = () => {
    const newValue = !enabled
    setEnabled(newValue)
    onChange?.(newValue)
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

const automations = [
  {
    label: 'Auto-send drafts',
    description: 'Automatically send approved drafts at scheduled times',
  },
  {
    label: 'Follow-up reminders',
    description: 'Get notified when contacts need follow-up',
  },
]

export function AutomationSection() {
  return (
    <section aria-label="Automation" role="region" className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Automation</h2>
        <p className="text-sm text-gray-500">Automate your workflows</p>
      </div>

      <div className="space-y-3">
        {automations.map((automation) => (
          <AutomationToggle
            key={automation.label}
            label={automation.label}
            description={automation.description}
          />
        ))}
      </div>
    </section>
  )
}
