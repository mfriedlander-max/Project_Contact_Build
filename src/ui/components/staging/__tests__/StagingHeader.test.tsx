import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StagingHeader } from '../StagingHeader'

describe('StagingHeader', () => {
  it('displays the search query', () => {
    render(
      <StagingHeader
        query="engineers at Google"
        count={5}
        selectedCount={0}
        onApprove={vi.fn()}
        onClear={vi.fn()}
        onSelectAll={vi.fn()}
        allSelected={false}
      />
    )
    expect(screen.getByText(/engineers at google/i)).toBeInTheDocument()
  })

  it('displays the count of staged contacts', () => {
    render(
      <StagingHeader
        query="test"
        count={12}
        selectedCount={0}
        onApprove={vi.fn()}
        onClear={vi.fn()}
        onSelectAll={vi.fn()}
        allSelected={false}
      />
    )
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('renders a "Create Campaign" button', () => {
    render(
      <StagingHeader
        query="test"
        count={5}
        selectedCount={2}
        onApprove={vi.fn()}
        onClear={vi.fn()}
        onSelectAll={vi.fn()}
        allSelected={false}
      />
    )
    expect(screen.getByRole('button', { name: /create campaign/i })).toBeInTheDocument()
  })

  it('renders a clear button', () => {
    render(
      <StagingHeader
        query="test"
        count={5}
        selectedCount={0}
        onApprove={vi.fn()}
        onClear={vi.fn()}
        onSelectAll={vi.fn()}
        allSelected={false}
      />
    )
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
  })

  it('renders a "Select All" checkbox', () => {
    render(
      <StagingHeader
        query="test"
        count={5}
        selectedCount={0}
        onApprove={vi.fn()}
        onClear={vi.fn()}
        onSelectAll={vi.fn()}
        allSelected={false}
      />
    )
    const checkbox = screen.getByRole('checkbox', { name: /select all/i })
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).not.toBeChecked()
  })

  it('shows "Select All" checkbox as checked when allSelected is true', () => {
    render(
      <StagingHeader
        query="test"
        count={5}
        selectedCount={5}
        onApprove={vi.fn()}
        onClear={vi.fn()}
        onSelectAll={vi.fn()}
        allSelected={true}
      />
    )
    const checkbox = screen.getByRole('checkbox', { name: /select all/i })
    expect(checkbox).toBeChecked()
  })

  it('displays selected count when contacts are selected', () => {
    render(
      <StagingHeader
        query="test"
        count={10}
        selectedCount={3}
        onApprove={vi.fn()}
        onClear={vi.fn()}
        onSelectAll={vi.fn()}
        allSelected={false}
      />
    )
    expect(screen.getByText('3 selected')).toBeInTheDocument()
  })

  it('does not show selected count when nothing is selected', () => {
    render(
      <StagingHeader
        query="test"
        count={10}
        selectedCount={0}
        onApprove={vi.fn()}
        onClear={vi.fn()}
        onSelectAll={vi.fn()}
        allSelected={false}
      />
    )
    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument()
  })

  it('disables "Create Campaign" button when nothing is selected', () => {
    render(
      <StagingHeader
        query="test"
        count={5}
        selectedCount={0}
        onApprove={vi.fn()}
        onClear={vi.fn()}
        onSelectAll={vi.fn()}
        allSelected={false}
      />
    )
    const button = screen.getByRole('button', { name: /create campaign/i })
    expect(button).toBeDisabled()
  })

  it('enables "Create Campaign" button when contacts are selected', () => {
    render(
      <StagingHeader
        query="test"
        count={5}
        selectedCount={2}
        onApprove={vi.fn()}
        onClear={vi.fn()}
        onSelectAll={vi.fn()}
        allSelected={false}
      />
    )
    const button = screen.getByRole('button', { name: /create campaign/i })
    expect(button).not.toBeDisabled()
  })

  it('calls onSelectAll when "Select All" checkbox is clicked', () => {
    const onSelectAll = vi.fn()
    render(
      <StagingHeader
        query="test"
        count={5}
        selectedCount={0}
        onApprove={vi.fn()}
        onClear={vi.fn()}
        onSelectAll={onSelectAll}
        allSelected={false}
      />
    )
    fireEvent.click(screen.getByRole('checkbox', { name: /select all/i }))
    expect(onSelectAll).toHaveBeenCalledOnce()
  })

  it('calls onApprove when "Create Campaign" button is clicked', () => {
    const onApprove = vi.fn()
    render(
      <StagingHeader
        query="test"
        count={5}
        selectedCount={2}
        onApprove={onApprove}
        onClear={vi.fn()}
        onSelectAll={vi.fn()}
        allSelected={false}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /create campaign/i }))
    expect(onApprove).toHaveBeenCalledOnce()
  })

  it('calls onClear when clear button is clicked', () => {
    const onClear = vi.fn()
    render(
      <StagingHeader
        query="test"
        count={5}
        selectedCount={0}
        onApprove={vi.fn()}
        onClear={onClear}
        onSelectAll={vi.fn()}
        allSelected={false}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(onClear).toHaveBeenCalledOnce()
  })
})
