import {
  IntegrationsSection,
  TemplatesSection,
  AutomationSection,
} from '@/src/ui/components/settings'

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500">Manage your account and preferences</p>
      </div>

      <div className="space-y-8">
        <IntegrationsSection />
        <TemplatesSection />
        <AutomationSection />
      </div>
    </div>
  )
}
