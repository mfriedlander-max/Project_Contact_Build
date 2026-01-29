import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ChatPanel } from '../ChatPanel'
import { ChatProvider } from '../ChatContext'

describe('ChatPanel', () => {
  it('renders with a message list area and input', () => {
    render(
      <ChatProvider>
        <ChatPanel />
      </ChatProvider>
    )

    expect(screen.getByRole('log')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('displays messages after sending', async () => {
    render(
      <ChatProvider>
        <ChatPanel />
      </ChatProvider>
    )

    const input = screen.getByRole('textbox')
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Hello AI' } })
      fireEvent.click(screen.getByRole('button', { name: /send/i }))
    })

    expect(screen.getByText('Hello AI')).toBeInTheDocument()
  })

  it('shows empty state when no messages', () => {
    render(
      <ChatProvider>
        <ChatPanel />
      </ChatProvider>
    )

    expect(screen.getByText(/start a conversation/i)).toBeInTheDocument()
  })
})
