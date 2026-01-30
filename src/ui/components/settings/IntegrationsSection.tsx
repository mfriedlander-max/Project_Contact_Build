'use client'

import { useState } from 'react'
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

interface HunterApiKeyInputProps {
  onSave: (apiKey: string) => void
  onTestKey?: (apiKey: string) => Promise<boolean>
  isConnected: boolean
}

function TestStatusIndicator({ status }: { status: 'idle' | 'testing' | 'valid' | 'invalid' }) {
  if (status === 'idle') return null
  if (status === 'testing') return <span className="text-sm text-gray-500">Testing...</span>
  if (status === 'valid') return <span className="text-sm text-green-600">&#10003; Valid</span>
  return <span className="text-sm text-red-600">&#10007; Invalid</span>
}

function HunterApiKeyInput({ onSave, onTestKey, isConnected }: HunterApiKeyInputProps) {
  const [apiKey, setApiKey] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle')

  const handleTest = async () => {
    if (!apiKey.trim() && !isConnected) return
    setTestStatus('testing')
    try {
      const valid = await onTestKey?.(apiKey.trim() || '') ?? false
      setTestStatus(valid ? 'valid' : 'invalid')
    } catch {
      setTestStatus('invalid')
    }
    setTimeout(() => setTestStatus('idle'), 3000)
  }

  if (isConnected && !showInput) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowInput(true)}
          className="rounded-md bg-green-100 px-4 py-2 text-sm font-medium text-green-700"
        >
          Connected
        </button>
        {onTestKey && (
          <button
            onClick={handleTest}
            className="rounded-md border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Test Key
          </button>
        )}
        <TestStatusIndicator status={testStatus} />
      </div>
    )
  }

  if (!showInput) {
    return (
      <button
        onClick={() => setShowInput(true)}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Connect
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="Enter API key"
        aria-label="Hunter API key"
        className="rounded-md border px-3 py-1.5 text-sm"
      />
      <button
        onClick={() => {
          if (apiKey.trim()) {
            onSave(apiKey.trim())
            setApiKey('')
            setShowInput(false)
          }
        }}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        Save
      </button>
      {onTestKey && (
        <button
          onClick={handleTest}
          className="rounded-md border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Test Key
        </button>
      )}
      <TestStatusIndicator status={testStatus} />
    </div>
  )
}

const integrationsList = [
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

interface IntegrationsSectionProps {
  integrations?: readonly { provider: string; isActive: boolean }[]
  isConnected?: (provider: string) => boolean
  onHunterSave?: (apiKey: string) => void
  onTestHunterKey?: (apiKey: string) => Promise<boolean>
  onGmailConnect?: () => void
}

export function IntegrationsSection({
  isConnected,
  onHunterSave,
  onTestHunterKey,
  onGmailConnect,
}: IntegrationsSectionProps) {
  return (
    <section aria-label="Integrations" role="region" className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Integrations</h2>
        <p className="text-sm text-gray-500">Connect your accounts and services</p>
      </div>

      <div className="space-y-3">
        {integrationsList.map((integration) => {
          const connected = isConnected?.(integration.provider) ?? false

          if (integration.provider === IntegrationProvider.HUNTER && onHunterSave) {
            return (
              <div key={integration.provider} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <h3 className="font-medium">{integration.name}</h3>
                  <p className="text-sm text-gray-500">{integration.description}</p>
                </div>
                <HunterApiKeyInput onSave={onHunterSave} onTestKey={onTestHunterKey} isConnected={connected} />
              </div>
            )
          }

          if (integration.provider === IntegrationProvider.GMAIL) {
            return (
              <IntegrationCard
                key={integration.provider}
                name={integration.name}
                description={integration.description}
                provider={integration.provider}
                isConnected={connected}
                onConnect={onGmailConnect}
              />
            )
          }

          return (
            <IntegrationCard
              key={integration.provider}
              name={integration.name}
              description={integration.description}
              provider={integration.provider}
              isConnected={connected}
            />
          )
        })}
      </div>
    </section>
  )
}
