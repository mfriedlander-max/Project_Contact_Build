'use client'

export function TemplatesSection() {
  return (
    <section aria-label="Templates" role="region" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Templates</h2>
          <p className="text-sm text-gray-500">Manage your email templates</p>
        </div>
        <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Create Template
        </button>
      </div>

      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-gray-500">No templates yet</p>
        <p className="text-sm text-gray-400">Create your first email template to get started</p>
      </div>
    </section>
  )
}
