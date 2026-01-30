'use client'

import { useState, useRef } from 'react'

export interface Template {
  id: string
  name: string
  subject?: string
  body?: string
  isDefault?: boolean
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
  onUpdateTemplate?: (id: string, updates: Partial<Template>) => void
  onSetDefault?: (id: string) => void
}

const PLACEHOLDERS = [
  '{{first_name}}',
  '{{company}}',
  '{{personalized_insert}}',
  '{{availability}}',
] as const

function parseSubjectVariants(subject?: string): readonly string[] {
  if (!subject) return ['']
  const parts = subject.split('|')
  return parts.length > 0 ? parts : ['']
}

function joinSubjectVariants(variants: readonly string[]): string {
  return variants.map((v) => v.trim()).join('|')
}

interface PlaceholderChipsProps {
  onInsert: (placeholder: string) => void
}

function PlaceholderChips({ onInsert }: PlaceholderChipsProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {PLACEHOLDERS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onInsert(p)}
          className="rounded-full border px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
        >
          {p}
        </button>
      ))}
    </div>
  )
}

interface VariantItem {
  readonly id: string
  readonly value: string
}

interface SubjectVariantsInputProps {
  variants: readonly VariantItem[]
  onChange: (variants: readonly VariantItem[]) => void
}

function SubjectVariantsInput({ variants, onChange }: SubjectVariantsInputProps) {
  const nextId = useRef(variants.length)

  const handleVariantChange = (id: string, value: string) => {
    onChange(variants.map((v) => (v.id === id ? { ...v, value } : v)))
  }

  const handleAdd = () => {
    const id = String(nextId.current++)
    onChange([...variants, { id, value: '' }])
  }

  const handleRemove = (id: string) => {
    onChange(variants.filter((v) => v.id !== id))
  }

  return (
    <div className="space-y-2">
      {variants.map((variant, index) => (
        <div key={variant.id} className="flex items-center gap-2">
          <input
            type="text"
            value={variant.value}
            onChange={(e) => handleVariantChange(variant.id, e.target.value)}
            placeholder={`Subject variant ${index + 1}`}
            aria-label={`Subject variant ${index + 1}`}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          {variants.length > 1 && (
            <button
              type="button"
              onClick={() => handleRemove(variant.id)}
              aria-label="Remove variant"
              className="text-sm text-red-500 hover:text-red-700"
            >
              &times;
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={handleAdd}
        className="text-sm text-blue-600 hover:text-blue-800"
      >
        Add variant
      </button>
    </div>
  )
}

interface TemplateFormProps {
  initialName?: string
  initialVariants?: readonly string[]
  initialBody?: string
  onSave: (data: { name: string; subject: string; body: string }) => void
  onCancel: () => void
}

function toVariantItems(strings: readonly string[]): readonly VariantItem[] {
  return strings.map((value, i) => ({ id: String(i), value }))
}

function fromVariantItems(items: readonly VariantItem[]): readonly string[] {
  return items.map((item) => item.value)
}

function TemplateForm({
  initialName = '',
  initialVariants = [''],
  initialBody = '',
  onSave,
  onCancel,
}: TemplateFormProps) {
  const [name, setName] = useState(initialName)
  const [variants, setVariants] = useState<readonly VariantItem[]>(
    toVariantItems(initialVariants)
  )
  const [body, setBody] = useState(initialBody)
  const [showErrors, setShowErrors] = useState(false)

  const trimmedName = name.trim()
  const joined = joinSubjectVariants(fromVariantItems(variants))
  const trimmedBody = body.trim()

  const nameEmpty = !trimmedName
  const subjectEmpty = !joined
  const bodyEmpty = !trimmedBody

  const handleSave = () => {
    if (nameEmpty || subjectEmpty || bodyEmpty) {
      setShowErrors(true)
      return
    }
    onSave({ name: trimmedName, subject: joined, body: trimmedBody })
  }

  const handleInsertPlaceholder = (placeholder: string) => {
    setBody((prev) => prev + placeholder)
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Template name"
          aria-label="Template name"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        {showErrors && nameEmpty && (
          <p className="mt-1 text-xs text-red-600">Template name is required</p>
        )}
      </div>
      <div>
        <SubjectVariantsInput variants={variants} onChange={setVariants} />
        {showErrors && subjectEmpty && (
          <p className="mt-1 text-xs text-red-600">At least one subject variant is required</p>
        )}
      </div>
      <div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Email body"
          aria-label="Email body"
          rows={4}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        {showErrors && bodyEmpty && (
          <p className="mt-1 text-xs text-red-600">Email body is required</p>
        )}
      </div>
      <PlaceholderChips onInsert={handleInsertPlaceholder} />
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="rounded-md border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

interface TemplateListItemProps {
  template: Template
  onDelete?: (id: string) => void
  onUpdate?: (id: string, updates: Partial<Template>) => void
  onSetDefault?: (id: string) => void
}

function TemplateListItem({ template, onDelete, onUpdate, onSetDefault }: TemplateListItemProps) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    const variants = parseSubjectVariants(template.subject)
    return (
      <TemplateForm
        initialName={template.name}
        initialVariants={variants}
        initialBody={template.body ?? ''}
        onSave={(data) => {
          onUpdate?.(template.id, data)
          setEditing(false)
        }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{template.name}</h3>
          {template.isDefault && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Default
            </span>
          )}
        </div>
        {template.subject && (
          <p className="text-xs text-gray-500">{template.subject}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onSetDefault && !template.isDefault && (
          <button
            onClick={() => onSetDefault(template.id)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Set Default
          </button>
        )}
        {onUpdate && (
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-blue-600 hover:text-blue-800"
            aria-label={`Edit ${template.name}`}
          >
            Edit
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(template.id)}
            className="text-sm text-red-600 hover:text-red-800"
            aria-label={`Delete ${template.name}`}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

export function TemplatesSection({
  templates = [],
  onCreateTemplate,
  onDeleteTemplate,
  onUpdateTemplate,
  onSetDefault,
}: TemplatesSectionProps) {
  const [showForm, setShowForm] = useState(false)

  const handleCreate = (data: { name: string; subject: string; body: string }) => {
    onCreateTemplate?.(data)
    setShowForm(false)
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
        <TemplateForm
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {templates.length === 0 && !showForm ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-gray-500">No templates yet</p>
          <p className="text-sm text-gray-400">Create your first email template to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <TemplateListItem
              key={template.id}
              template={template}
              onDelete={onDeleteTemplate}
              onUpdate={onUpdateTemplate}
              onSetDefault={onSetDefault}
            />
          ))}
        </div>
      )}
    </section>
  )
}
