'use client'

import { useState } from 'react'
import { signIn, signOut } from 'next-auth/react'
import { IntegrationsSection } from '@/src/ui/components/settings/IntegrationsSection'
import { TemplatesSection } from '@/src/ui/components/settings/TemplatesSection'
import { AutomationSection } from '@/src/ui/components/settings/AutomationSection'
import { useIntegrations } from '@/src/ui/hooks/useIntegrations'
import { useTemplates } from '@/src/ui/hooks/useTemplates'
import { useSettings } from '@/src/ui/hooks/useSettings'

type TabId = 'integrations' | 'templates' | 'automation'

const tabs: readonly { id: TabId; label: string }[] = [
  { id: 'integrations', label: 'Integrations' },
  { id: 'templates', label: 'Templates' },
  { id: 'automation', label: 'Automation' },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('integrations')
  const { integrations, saveIntegration, isConnected } = useIntegrations()
  const { templates, createTemplate, updateTemplate, deleteTemplate } = useTemplates()
  const { settings, updateSettings } = useSettings()

  const handleHunterSave = async (apiKey: string) => {
    await saveIntegration({ provider: 'HUNTER', accessToken: apiKey, isActive: true })
  }

  const handleGmailConnect = () => {
    signIn('google', { callbackUrl: '/settings' })
  }

  const handleSettingChange = async (key: string, value: boolean | string | number) => {
    await updateSettings({ [key]: value })
  }

  const handleSetDefaultTemplate = async (id: string) => {
    await updateTemplate(id, { isDefault: true })
  }

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-gray-500">Manage your account and preferences</p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Log out
        </button>
      </div>

      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'integrations' && (
        <IntegrationsSection
          integrations={integrations}
          isConnected={isConnected}
          onHunterSave={handleHunterSave}
          onGmailConnect={handleGmailConnect}
        />
      )}
      {activeTab === 'templates' && (
        <TemplatesSection
          templates={templates}
          onCreateTemplate={createTemplate}
          onUpdateTemplate={updateTemplate}
          onDeleteTemplate={deleteTemplate}
          onSetDefault={handleSetDefaultTemplate}
        />
      )}
      {activeTab === 'automation' && (
        <AutomationSection
          settings={settings}
          onSettingChange={handleSettingChange}
        />
      )}
    </div>
  )
}
