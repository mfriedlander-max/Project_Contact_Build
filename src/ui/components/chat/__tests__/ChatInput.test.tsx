import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatInput } from '../ChatInput'

describe('ChatInput', () => {
  it('renders a text input', () => {
    render(<ChatInput onSend={vi.fn()} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders a send button', () => {
    render(<ChatInput onSend={vi.fn()} />)
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('calls onSend with input value when send button is clicked', () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test message' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))

    expect(onSend).toHaveBeenCalledWith('test message')
  })

  it('clears input after sending', () => {
    render(<ChatInput onSend={vi.fn()} />)

    const input = screen.getByRole('textbox') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'test' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))

    expect(input.value).toBe('')
  })

  it('sends on Enter key press', () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} />)

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'enter test' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSend).toHaveBeenCalledWith('enter test')
  })

  it('does not send empty messages', () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} />)

    fireEvent.click(screen.getByRole('button', { name: /send/i }))

    expect(onSend).not.toHaveBeenCalled()
  })

  it('disables input and button when disabled prop is true', () => {
    render(<ChatInput onSend={vi.fn()} disabled />)

    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
  })

  it('shows placeholder text', () => {
    render(<ChatInput onSend={vi.fn()} placeholder="Type a message..." />)
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
  })
})
