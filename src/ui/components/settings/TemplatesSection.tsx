'use client'

import { useState } from 'react'

interface Template {
  id: string
  name: string
  subject?: string
  body?: string
}

interface CreateTemplatePayload {
  name: string
  subject: string
  body: string
}

interface TemplatesSectionProps {
  templates?: readonly Template[]
  onCreateTemplate?: (payload: CreateTemplatePayload) => void
  onDeleteTemplate?: (id: string) => void
}

export function TemplatesSection({
  templates = [],
  onCreateTemplate,
  onDeleteTemplate,
}: TemplatesSectionProps) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  const handleCreate = () => {
    if (name.trim() && subject.trim() && body.trim()) {
      onCreateTemplate?.({ name: name.trim(), subject: subject.trim(), body: body.trim() })
      setName('')
      setSubject('')
      setBody('')
      setShowForm(false)
    }
  }

  return (
    <section aria-label="Templates" role="region" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Templates</h2>
          <p className="text-sm text-gray-500">Manage your email templates</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create Template
        </button>
      </div>

      {showForm && (
        <div className="space-y-3 rounded-lg border p-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Template name"
            aria-label="Template name"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
            aria-label="Email subject"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Email body"
            aria-label="Email body"
            rows={4}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {templates.length === 0 && !showForm ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-gray-500">No templates yet</p>
          <p className="text-sm text-gray-400">Create your first email template to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <div key={template.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <h3 className="text-sm font-medium">{template.name}</h3>
                {template.subject && (
                  <p className="text-xs text-gray-500">{template.subject}</p>
                )}
              </div>
              {onDeleteTemplate && (
                <button
                  onClick={() => onDeleteTemplate(template.id)}
                  className="text-sm text-red-600 hover:text-red-800"
                  aria-label={`Delete ${template.name}`}
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
