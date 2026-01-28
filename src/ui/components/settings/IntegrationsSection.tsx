'use client'

import { IntegrationProvider, type IntegrationProviderType } from '@/lib/types/enums'

interface IntegrationCardProps {
  name: string
  description: string
  provider: IntegrationProviderType
  isConnected?: boolean
  onConnect?: () => void
}

function IntegrationCard({
  name,
  description,
  isConnected = false,
  onConnect,
}: IntegrationCardProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div>
        <h3 className="font-medium">{name}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        onClick={onConnect}
        className={`rounded-md px-4 py-2 text-sm font-medium ${
          isConnected
            ? 'bg-green-100 text-green-700'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isConnected ? 'Connected' : 'Connect'}
      </button>
    </div>
  )
}

const integrations = [
  {
    name: 'Gmail',
    description: 'Connect your Gmail account to send emails',
    provider: IntegrationProvider.GMAIL,
  },
  {
    name: 'Hunter',
    description: 'Email finding service for contact discovery',
    provider: IntegrationProvider.HUNTER,
  },
  {
    name: 'Search API',
    description: 'Web search API for contact research',
    provider: IntegrationProvider.SEARCH_PROVIDER,
  },
]

export function IntegrationsSection() {
  return (
    <section aria-label="Integrations" role="region" className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Integrations</h2>
        <p className="text-sm text-gray-500">Connect your accounts and services</p>
      </div>

      <div className="space-y-3">
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.provider}
            name={integration.name}
            description={integration.description}
            provider={integration.provider}
          />
        ))}
      </div>
    </section>
  )
}
