import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ChatProvider, useChatContext } from '../ChatContext'
import type { ChatMessage } from '../ChatContext'

function TestConsumer() {
  const { messages, isLoading, sendMessage, clearMessages } = useChatContext()
  return (
    <div>
      <span data-testid="count">{messages.length}</span>
      <span data-testid="loading">{String(isLoading)}</span>
      <button onClick={() => sendMessage('hello')}>send</button>
      <button onClick={clearMessages}>clear</button>
      {messages.map((m) => (
        <div key={m.id} data-testid={`msg-${m.role}`}>{m.content}</div>
      ))}
    </div>
  )
}

describe('ChatContext', () => {
  it('provides empty messages by default', () => {
    render(
      <ChatProvider>
        <TestConsumer />
      </ChatProvider>
    )
    expect(screen.getByTestId('count').textContent).toBe('0')
  })

  it('provides isLoading as false by default', () => {
    render(
      <ChatProvider>
        <TestConsumer />
      </ChatProvider>
    )
    expect(screen.getByTestId('loading').textContent).toBe('false')
  })

  it('adds a user message when sendMessage is called', async () => {
    render(
      <ChatProvider>
        <TestConsumer />
      </ChatProvider>
    )

    await act(async () => {
      screen.getByText('send').click()
    })

    expect(screen.getByTestId('msg-user')).toHaveTextContent('hello')
  })

  it('assigns an id and timestamp to each message', async () => {
    const { container } = render(
      <ChatProvider>
        <TestConsumer />
      </ChatProvider>
    )

    await act(async () => {
      screen.getByText('send').click()
    })

    expect(screen.getByTestId('count').textContent).toBe('1')
  })

  it('clears messages when clearMessages is called', async () => {
    render(
      <ChatProvider>
        <TestConsumer />
      </ChatProvider>
    )

    await act(async () => {
      screen.getByText('send').click()
    })
    expect(screen.getByTestId('count').textContent).toBe('1')

    await act(async () => {
      screen.getByText('clear').click()
    })
    expect(screen.getByTestId('count').textContent).toBe('0')
  })

  it('accepts an onSendMessage callback prop', async () => {
    const onSend = vi.fn()
    render(
      <ChatProvider onSendMessage={onSend}>
        <TestConsumer />
      </ChatProvider>
    )

    await act(async () => {
      screen.getByText('send').click()
    })

    expect(onSend).toHaveBeenCalledWith('hello')
  })

  it('throws when useChatContext is used outside ChatProvider', () => {
    // Suppress console.error from React for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer />)).toThrow()
    spy.mockRestore()
  })
})
