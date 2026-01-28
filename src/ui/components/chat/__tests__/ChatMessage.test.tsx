import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatMessage } from '../ChatMessage'
import type { ChatMessage as ChatMessageType } from '../ChatContext'

const userMessage: ChatMessageType = {
  id: '1',
  role: 'user',
  content: 'Hello there',
  timestamp: new Date('2026-01-28T10:00:00Z'),
}

const assistantMessage: ChatMessageType = {
  id: '2',
  role: 'assistant',
  content: 'Hi! How can I help?',
  timestamp: new Date('2026-01-28T10:00:01Z'),
}

const markdownMessage: ChatMessageType = {
  id: '3',
  role: 'assistant',
  content: 'Here is **bold** text',
  timestamp: new Date('2026-01-28T10:00:02Z'),
}

const messageWithActions: ChatMessageType = {
  id: '4',
  role: 'assistant',
  content: 'Found contacts',
  timestamp: new Date('2026-01-28T10:00:03Z'),
  actions: [{ label: 'Approve', actionId: 'approve-1' }],
}

describe('ChatMessage', () => {
  it('renders user message content', () => {
    render(<ChatMessage message={userMessage} />)
    expect(screen.getByText('Hello there')).toBeInTheDocument()
  })

  it('renders assistant message content', () => {
    render(<ChatMessage message={assistantMessage} />)
    expect(screen.getByText('Hi! How can I help?')).toBeInTheDocument()
  })

  it('applies different styling for user vs assistant messages', () => {
    const { container: userContainer } = render(<ChatMessage message={userMessage} />)
    const { container: assistantContainer } = render(<ChatMessage message={assistantMessage} />)

    const userDiv = userContainer.firstChild as HTMLElement
    const assistantDiv = assistantContainer.firstChild as HTMLElement

    // User messages align right, assistant left
    expect(userDiv.className).toContain('justify-end')
    expect(assistantDiv.className).toContain('justify-start')
  })

  it('renders bold markdown in assistant messages', () => {
    const { container } = render(<ChatMessage message={markdownMessage} />)
    const bold = container.querySelector('strong')
    expect(bold).toBeInTheDocument()
    expect(bold?.textContent).toBe('bold')
  })

  it('renders action buttons when message has actions', () => {
    render(<ChatMessage message={messageWithActions} />)
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
  })

  it('calls onAction callback when action button is clicked', () => {
    const onAction = vi.fn()
    render(<ChatMessage message={messageWithActions} onAction={onAction} />)

    screen.getByRole('button', { name: 'Approve' }).click()
    expect(onAction).toHaveBeenCalledWith('approve-1')
  })
})
