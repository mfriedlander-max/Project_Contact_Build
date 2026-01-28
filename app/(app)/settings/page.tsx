'use client'

import { IntegrationsSection } from '@/src/ui/components/settings/IntegrationsSection'
import { TemplatesSection } from '@/src/ui/components/settings/TemplatesSection'
import { AutomationSection } from '@/src/ui/components/settings/AutomationSection'
import { useIntegrations } from '@/src/ui/hooks/useIntegrations'
import { useTemplates } from '@/src/ui/hooks/useTemplates'
import { useSettings } from '@/src/ui/hooks/useSettings'

export default function SettingsPage() {
  const { integrations, saveIntegration, isConnected } = useIntegrations()
  const { templates, createTemplate, deleteTemplate } = useTemplates()
  const { settings, updateSettings } = useSettings()

  const handleHunterSave = async (apiKey: string) => {
    await saveIntegration({ provider: 'HUNTER', accessToken: apiKey, isActive: true })
  }

  const handleGmailConnect = () => {
    window.location.href = '/api/auth/gmail/connect'
  }

  const handleAutomationChange = async (key: string, enabled: boolean) => {
    await updateSettings({ [key]: enabled })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500">Manage your account and preferences</p>
      </div>

      <div className="space-y-8">
        <IntegrationsSection
          integrations={integrations}
          isConnected={isConnected}
          onHunterSave={handleHunterSave}
          onGmailConnect={handleGmailConnect}
        />
        <TemplatesSection
          templates={templates}
          onCreateTemplate={createTemplate}
          onDeleteTemplate={deleteTemplate}
        />
        <AutomationSection
          settings={settings}
          onToggle={handleAutomationChange}
        />
      </div>
    </div>
  )
}
