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
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div>
        <h3 className="font-medium">{label}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
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
  onSettingChange?: (key: string, value: boolean | string | number) => void
  /** @deprecated Use onSettingChange instead */
  onToggle?: (key: string, enabled: boolean) => void
}

const automations = [
  {
    key: 'autoRunEmailFinding',
    label: 'Auto-run email finding',
    description: 'Automatically find email addresses for new contacts',
  },
  {
    key: 'autoRunInserts',
    label: 'Auto-run personalized inserts',
    description: 'Automatically generate personalized content for contacts',
  },
  {
    key: 'autoRunDrafts',
    label: 'Auto-run draft creation',
    description: 'Automatically create email drafts for contacts',
  },
]

export function AutomationSection({
  settings,
  onSettingChange,
  onToggle,
}: AutomationSectionProps) {
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({})
  const [availability, setAvailability] = useState('')
  const [didntConnectDays, setDidntConnectDays] = useState('14')

  useEffect(() => {
    if (!settings) return
    const states: Record<string, boolean> = {}
    for (const automation of automations) {
      states[automation.key] = Boolean(settings[automation.key])
    }
    states.didntConnectEnabled = Boolean(settings.didntConnectEnabled)
    setToggleStates(states)

    if (typeof settings.availabilityBlock === 'string') {
      setAvailability(settings.availabilityBlock)
    }
    if (typeof settings.didntConnectDays === 'number') {
      setDidntConnectDays(String(settings.didntConnectDays))
    }
  }, [settings])

  const handleToggleChange = (key: string, enabled: boolean) => {
    setToggleStates((prev) => ({ ...prev, [key]: enabled }))
    onSettingChange?.(key, enabled)
    onToggle?.(key, enabled)
  }

  const handleAvailabilityChange = (value: string) => {
    setAvailability(value)
    onSettingChange?.('availabilityBlock', value)
  }

  const handleDaysChange = (value: string) => {
    setDidntConnectDays(value)
    const num = parseInt(value, 10)
    if (!isNaN(num) && num >= 1) {
      onSettingChange?.('didntConnectDays', num)
    }
  }

  return (
    <section aria-label="Automation" role="region" className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Automation</h2>
        <p className="text-sm text-gray-500">Automate your workflows</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="availability-textarea" className="block font-medium">
          Availability
        </label>
        <p className="text-sm text-gray-500">
          Your availability text will be inserted into email templates using the{' '}
          {'{{availability}}'} placeholder
        </p>
        <textarea
          id="availability-textarea"
          value={availability}
          onChange={(e) => handleAvailabilityChange(e.target.value)}
          className="w-full rounded-lg border p-3 text-sm"
          rows={3}
          placeholder="e.g., Free Tuesday and Thursday afternoons"
        />
      </div>

      <div className="space-y-3">
        {automations.map((automation) => (
          <AutomationToggle
            key={automation.key}
            label={automation.label}
            description={automation.description}
            enabled={toggleStates[automation.key] ?? false}
            onChange={(enabled) => handleToggleChange(automation.key, enabled)}
          />
        ))}
      </div>

      <div className="space-y-3">
        <AutomationToggle
          label="Didn't connect follow-up"
          description="Automatically flag contacts who haven't connected after a set number of days"
          enabled={toggleStates.didntConnectEnabled ?? false}
          onChange={(enabled) => handleToggleChange('didntConnectEnabled', enabled)}
        />
        {toggleStates.didntConnectEnabled && (
          <div className="ml-4 flex items-center gap-3">
            <label htmlFor="didnt-connect-days" className="text-sm font-medium">
              Days before flagging
            </label>
            <input
              id="didnt-connect-days"
              type="number"
              min={1}
              value={didntConnectDays}
              onChange={(e) => handleDaysChange(e.target.value)}
              className="w-20 rounded border p-2 text-sm"
            />
          </div>
        )}
      </div>
    </section>
  )
}
