'use client'

import { useState, useEffect } from 'react'
import { useTemplates } from '@/src/ui/hooks/useTemplates'

interface DidntConnectAction {
  type: 'move_stage' | 'send_template' | 'flag_review'
  templateId?: string
}

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

interface RuleBuilderProps {
  days: string
  onDaysChange: (value: string) => void
  actions: DidntConnectAction[]
  onAddAction: () => void
  onRemoveAction: (index: number) => void
  onUpdateAction: (index: number, updates: Partial<DidntConnectAction>) => void
  templates: Array<{ id: string; name: string }>
  templatesLoading: boolean
}

function RuleBuilder({
  days,
  onDaysChange,
  actions,
  onAddAction,
  onRemoveAction,
  onUpdateAction,
  templates,
  templatesLoading,
}: RuleBuilderProps) {
  const actionTypeLabels: Record<DidntConnectAction['type'], string> = {
    move_stage: "Move to 'Didn't Connect' stage",
    send_template: 'Send follow-up email using template',
    flag_review: 'Flag for manual review',
  }

  return (
    <div className="ml-4 space-y-4 rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <label htmlFor="didnt-connect-days" className="text-sm font-medium">
          If no response after
        </label>
        <input
          id="didnt-connect-days"
          type="number"
          min={1}
          value={days}
          onChange={(e) => onDaysChange(e.target.value)}
          className="w-20 rounded border p-2 text-sm"
        />
        <span className="text-sm">days</span>
      </div>

      {actions.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Then:</p>
          {actions.map((action, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <select
                  value={action.type}
                  onChange={(e) =>
                    onUpdateAction(index, {
                      type: e.target.value as DidntConnectAction['type'],
                      templateId: e.target.value === 'send_template' ? action.templateId : undefined,
                    })
                  }
                  className="w-full rounded border p-2 text-sm"
                >
                  {Object.entries(actionTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>

                {action.type === 'send_template' && (
                  <select
                    value={action.templateId ?? ''}
                    onChange={(e) => onUpdateAction(index, { templateId: e.target.value })}
                    className="w-full rounded border p-2 text-sm"
                    disabled={templatesLoading}
                  >
                    <option value="">Select a template...</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <button
                onClick={() => onRemoveAction(index)}
                className="mt-1 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Remove action"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onAddAction}
        className="rounded border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
      >
        + Add action
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
  const { templates, isLoading: templatesLoading } = useTemplates()
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({})
  const [availability, setAvailability] = useState('')
  const [didntConnectDays, setDidntConnectDays] = useState('14')
  const [didntConnectActions, setDidntConnectActions] = useState<DidntConnectAction[]>([])

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
    if (typeof settings.didntConnectActions === 'string') {
      try {
        const parsed = JSON.parse(settings.didntConnectActions)
        if (Array.isArray(parsed)) {
          setDidntConnectActions(parsed)
        }
      } catch {
        setDidntConnectActions([])
      }
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

  const handleAddAction = () => {
    const newActions = [...didntConnectActions, { type: 'move_stage' as const }]
    setDidntConnectActions(newActions)
    onSettingChange?.('didntConnectActions', JSON.stringify(newActions))
  }

  const handleRemoveAction = (index: number) => {
    const newActions = didntConnectActions.filter((_, i) => i !== index)
    setDidntConnectActions(newActions)
    onSettingChange?.('didntConnectActions', JSON.stringify(newActions))
  }

  const handleUpdateAction = (index: number, updates: Partial<DidntConnectAction>) => {
    const newActions = didntConnectActions.map((action, i) =>
      i === index ? { ...action, ...updates } : action
    )
    setDidntConnectActions(newActions)
    onSettingChange?.('didntConnectActions', JSON.stringify(newActions))
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
          description="Automatically take actions when contacts haven't responded after a set number of days"
          enabled={toggleStates.didntConnectEnabled ?? false}
          onChange={(enabled) => handleToggleChange('didntConnectEnabled', enabled)}
        />
        {toggleStates.didntConnectEnabled && (
          <RuleBuilder
            days={didntConnectDays}
            onDaysChange={handleDaysChange}
            actions={didntConnectActions}
            onAddAction={handleAddAction}
            onRemoveAction={handleRemoveAction}
            onUpdateAction={handleUpdateAction}
            templates={templates}
            templatesLoading={templatesLoading}
          />
        )}
      </div>
    </section>
  )
}
