import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ContactList } from '../ContactList'
import { ConnectionStage, type ConnectionStageType } from '@/lib/types/enums'
import type { Contact } from '@/lib/types/contact'

const contacts: Array<{ contact: Contact; stage: ConnectionStageType }> = [
  {
    contact: { id: '1', first_name: 'Jane', last_name: 'Doe', email: 'jane@a.com', company: 'A' },
    stage: ConnectionStage.DRAFTED,
  },
  {
    contact: { id: '2', first_name: 'John', last_name: 'Smith', email: 'john@b.com', company: 'B' },
    stage: ConnectionStage.CONNECTED,
  },
]

describe('ContactList', () => {
  it('renders all contacts', () => {
    render(<ContactList items={contacts} />)
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('John Smith')).toBeInTheDocument()
  })

  it('renders empty state when no contacts', () => {
    render(<ContactList items={[]} />)
    expect(screen.getByText(/no contacts/i)).toBeInTheDocument()
  })

  it('is scrollable (has overflow-y-auto class)', () => {
    const { container } = render(<ContactList items={contacts} />)
    expect((container.firstChild as HTMLElement).className).toContain('overflow-y-auto')
  })
})
