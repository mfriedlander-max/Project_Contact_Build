import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prismadb } from '@/lib/prisma'
import {
  parseCSV,
  parseXLSX,
  applyMapping,
  validateContacts,
} from '@/src/server/services/uploadParser'
import type { ColumnMapping, ContactCreateInput } from '@/src/server/services/uploadParser'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set(['csv', 'xlsx'])

function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return (parts[parts.length - 1] ?? '').toLowerCase()
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file')
    const mappingRaw = formData.get('mapping')
    const campaignId = formData.get('campaignId') as string | null

    if (!file || !(file instanceof Blob) || !('name' in file)) {
      return NextResponse.json(
        { error: 'A file is required' },
        { status: 400 }
      )
    }

    const fileObj = file as File
    const extension = getFileExtension(fileObj.name)

    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Only CSV and XLSX are allowed.' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await fileObj.arrayBuffer())

    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File exceeds maximum size of 5MB' },
        { status: 400 }
      )
    }

    if (!mappingRaw || typeof mappingRaw !== 'string') {
      return NextResponse.json(
        { error: 'Column mapping is required' },
        { status: 400 }
      )
    }

    const mapping: ColumnMapping = JSON.parse(mappingRaw)

    const parsed = extension === 'csv'
      ? parseCSV(buffer.toString('utf-8'))
      : parseXLSX(buffer)

    const mapped = applyMapping(parsed, mapping)

    const { valid, errors } = validateContacts(mapped)

    const userId = session.user.id

    const contactsToCreate: ContactCreateInput[] = valid.map((contact) => ({
      ...contact,
      connection_stage: 'DRAFTED',
      v: 0,
      createdBy: userId,
      assigned_to: userId,
      ...(campaignId ? { campaignId } : {}),
    }))

    await prismadb.crm_Contacts.createMany({
      data: contactsToCreate,
    })

    return NextResponse.json({
      created: contactsToCreate.length,
      errors,
      contacts: contactsToCreate,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    return NextResponse.json(
      { error: `Upload failed: ${message}` },
      { status: 500 }
    )
  }
}
