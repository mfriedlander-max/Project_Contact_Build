'use client'

import { useState, useCallback, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ColumnMapper } from './ColumnMapper'
import { UploadPreview } from './UploadPreview'
import {
  parseCSV,
  parseXLSX,
  applyMapping,
  validateContacts,
} from '@/src/server/services/uploadParser'
import type {
  ColumnMapping,
  ParsedUpload,
  ContactCreateInput,
  ValidationError,
} from '@/src/server/services/uploadParser'

interface UploadDialogProps {
  open: boolean
  onClose: () => void
  campaignId?: string
  onImportComplete: (count: number) => void
}

type Step = 1 | 2 | 3

const ACCEPTED_TYPES = [
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]
const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls']

function isAcceptedFile(file: File): boolean {
  const byType = ACCEPTED_TYPES.includes(file.type)
  const byExtension = ACCEPTED_EXTENSIONS.some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  )
  return byType || byExtension
}

function isCSVFile(file: File): boolean {
  return file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')
}

interface DialogState {
  step: Step
  file: File | null
  parsed: ParsedUpload | null
  mapping: ColumnMapping
  validContacts: ContactCreateInput[]
  validationErrors: ValidationError[]
  isImporting: boolean
}

const INITIAL_STATE: DialogState = {
  step: 1,
  file: null,
  parsed: null,
  mapping: {},
  validContacts: [],
  validationErrors: [],
  isImporting: false,
}

export function UploadDialog({
  open,
  onClose,
  campaignId,
  onImportComplete,
}: UploadDialogProps) {
  const [state, setState] = useState<DialogState>(INITIAL_STATE)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = useCallback(() => {
    setState(INITIAL_STATE)
  }, [])

  const handleClose = useCallback(() => {
    if (state.file) {
      const confirmed = window.confirm(
        'You have a file selected. Are you sure you want to close?'
      )
      if (!confirmed) return
    }
    resetState()
    onClose()
  }, [state.file, resetState, onClose])

  const processFile = useCallback((file: File) => {
    if (!isAcceptedFile(file)) return

    const reader = new FileReader()

    reader.onload = () => {
      try {
        let parsed: ParsedUpload
        if (isCSVFile(file)) {
          parsed = parseCSV(reader.result as string)
        } else {
          const buffer = Buffer.from(reader.result as ArrayBuffer)
          parsed = parseXLSX(buffer)
        }

        setState((prev) => ({
          ...prev,
          step: 2 as Step,
          file,
          parsed,
        }))
      } catch {
        // parse error handled silently
      }
    }

    if (isCSVFile(file)) {
      reader.readAsText(file)
    } else {
      reader.readAsArrayBuffer(file)
    }
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (selectedFile) {
        processFile(selectedFile)
      }
    },
    [processFile]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) {
        processFile(droppedFile)
      }
    },
    [processFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleMappingChange = useCallback((mapping: ColumnMapping) => {
    setState((prev) => ({ ...prev, mapping }))
  }, [])

  const handleNextToPreview = useCallback(() => {
    if (!state.parsed) return

    const mapped = applyMapping(state.parsed, state.mapping)
    const { valid, errors } = validateContacts(mapped)

    setState((prev) => ({
      ...prev,
      step: 3 as Step,
      validContacts: valid,
      validationErrors: errors,
    }))
  }, [state.parsed, state.mapping])

  const handleBackToMapping = useCallback(() => {
    setState((prev) => ({
      ...prev,
      step: 2 as Step,
      validContacts: [],
      validationErrors: [],
    }))
  }, [])

  const handleImport = useCallback(async () => {
    setState((prev) => ({ ...prev, isImporting: true }))

    try {
      const body = JSON.stringify({
        contacts: state.validContacts,
        campaignId,
      })

      const response = await fetch('/api/contacts/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })

      if (!response.ok) {
        throw new Error('Import failed')
      }

      const result = await response.json()
      const count = result.data?.importedCount ?? state.validContacts.length

      resetState()
      onImportComplete(count)
      onClose()
    } catch (error) {
      setState((prev) => ({ ...prev, isImporting: false }))
      throw error
    }
  }, [state.validContacts, campaignId, resetState, onImportComplete, onClose])

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Import Contacts
            </Dialog.Title>
            <button
              type="button"
              aria-label="Close"
              onClick={handleClose}
              className="rounded-md p-1 text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="mb-4 text-sm text-gray-500">
            Step {state.step} of 3
          </p>

          {state.step === 1 && (
            <div>
              <div
                data-testid="drop-zone"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400"
              >
                <p className="mb-2 text-sm text-gray-600">
                  Drag and drop your file here
                </p>
                <p className="mb-4 text-xs text-gray-400">
                  Accepts .csv and .xlsx files
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Choose File
                </button>
                <input
                  ref={fileInputRef}
                  data-testid="file-input"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {state.step === 2 && state.parsed && (
            <div className="space-y-4">
              <ColumnMapper
                headers={state.parsed.headers}
                sampleRows={state.parsed.rows}
                onMappingChange={handleMappingChange}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleNextToPreview}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {state.step === 3 && (
            <UploadPreview
              contacts={state.validContacts}
              errors={state.validationErrors}
              onImport={handleImport}
              onBack={handleBackToMapping}
              isImporting={state.isImporting}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
