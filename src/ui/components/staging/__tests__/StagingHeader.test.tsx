import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StagingHeader } from '../StagingHeader'

describe('StagingHeader', () => {
  it('displays the search query', () => {
    render(<StagingHeader query="engineers at Google" count={5} onApprove={vi.fn()} onClear={vi.fn()} />)
    expect(screen.getByText(/engineers at google/i)).toBeInTheDocument()
  })

  it('displays the count of staged contacts', () => {
    render(<StagingHeader query="test" count={12} onApprove={vi.fn()} onClear={vi.fn()} />)
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('renders an approve button', () => {
    render(<StagingHeader query="test" count={5} onApprove={vi.fn()} onClear={vi.fn()} />)
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument()
  })

  it('renders a clear button', () => {
    render(<StagingHeader query="test" count={5} onApprove={vi.fn()} onClear={vi.fn()} />)
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
  })

  it('calls onApprove when approve button is clicked', () => {
    const onApprove = vi.fn()
    render(<StagingHeader query="test" count={5} onApprove={onApprove} onClear={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /approve/i }))
    expect(onApprove).toHaveBeenCalledOnce()
  })

  it('calls onClear when clear button is clicked', () => {
    const onClear = vi.fn()
    render(<StagingHeader query="test" count={5} onApprove={vi.fn()} onClear={onClear} />)
    fireEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(onClear).toHaveBeenCalledOnce()
  })
})
