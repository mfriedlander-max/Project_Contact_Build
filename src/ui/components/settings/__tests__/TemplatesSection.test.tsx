import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplatesSection } from '../TemplatesSection'

describe('TemplatesSection', () => {
  it('renders templates section heading', () => {
    render(<TemplatesSection />)
    expect(screen.getByRole('heading', { name: /templates/i })).toBeInTheDocument()
  })

  it('renders description text', () => {
    render(<TemplatesSection />)
    expect(screen.getByText(/email templates/i)).toBeInTheDocument()
  })

  it('renders create template button', () => {
    render(<TemplatesSection />)
    expect(screen.getByRole('button', { name: /create template|new template/i })).toBeInTheDocument()
  })

  it('renders empty state when no templates', () => {
    render(<TemplatesSection />)
    expect(screen.getByText(/no templates yet/i)).toBeInTheDocument()
  })

  it('has correct section structure', () => {
    render(<TemplatesSection />)
    const section = screen.getByRole('region', { name: /templates/i })
    expect(section).toBeInTheDocument()
  })

  it('renders subject variant inputs with add/remove', async () => {
    const user = userEvent.setup()
    render(<TemplatesSection />)

    await user.click(screen.getByRole('button', { name: /create template/i }))

    // Should have one subject variant input by default
    expect(screen.getByLabelText(/subject variant 1/i)).toBeInTheDocument()

    // Click add variant
    await user.click(screen.getByRole('button', { name: /add variant/i }))
    expect(screen.getByLabelText(/subject variant 2/i)).toBeInTheDocument()

    // Remove the second variant
    const removeButtons = screen.getAllByRole('button', { name: /remove variant/i })
    await user.click(removeButtons[1])
    expect(screen.queryByLabelText(/subject variant 2/i)).not.toBeInTheDocument()
  })

  it('does not remove last subject variant', async () => {
    const user = userEvent.setup()
    render(<TemplatesSection />)

    await user.click(screen.getByRole('button', { name: /create template/i }))

    // Only one variant — remove button should not exist or be disabled
    const removeButtons = screen.queryAllByRole('button', { name: /remove variant/i })
    expect(removeButtons).toHaveLength(0)
  })

  it('renders placeholder chips below body textarea', async () => {
    const user = userEvent.setup()
    render(<TemplatesSection />)

    await user.click(screen.getByRole('button', { name: /create template/i }))

    expect(screen.getByRole('button', { name: '{{first_name}}' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '{{company}}' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '{{personalized_insert}}' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '{{availability}}' })).toBeInTheDocument()
  })

  it('clicking placeholder chip inserts text into body', async () => {
    const user = userEvent.setup()
    render(<TemplatesSection />)

    await user.click(screen.getByRole('button', { name: /create template/i }))

    const bodyTextarea = screen.getByLabelText(/email body/i)
    await user.type(bodyTextarea, 'Hello ')
    await user.click(screen.getByRole('button', { name: '{{first_name}}' }))

    expect(bodyTextarea).toHaveValue('Hello {{first_name}}')
  })

  it('renders edit button for each template', () => {
    const templates = [
      { id: '1', name: 'Template A', subject: 'Sub A', body: 'Body A' },
      { id: '2', name: 'Template B', subject: 'Sub B', body: 'Body B' },
    ]
    render(<TemplatesSection templates={templates} onUpdateTemplate={vi.fn()} />)

    expect(screen.getByRole('button', { name: /edit template a/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit template b/i })).toBeInTheDocument()
  })

  it('edit mode shows pre-filled form', async () => {
    const user = userEvent.setup()
    const templates = [
      { id: '1', name: 'My Template', subject: 'SubA|SubB', body: 'Hello body' },
    ]
    render(<TemplatesSection templates={templates} onUpdateTemplate={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /edit my template/i }))

    expect(screen.getByDisplayValue('My Template')).toBeInTheDocument()
    expect(screen.getByDisplayValue('SubA')).toBeInTheDocument()
    expect(screen.getByDisplayValue('SubB')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Hello body')).toBeInTheDocument()
  })

  it('edit mode calls onUpdateTemplate on save', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    const templates = [
      { id: '1', name: 'My Template', subject: 'Sub A', body: 'Body' },
    ]
    render(<TemplatesSection templates={templates} onUpdateTemplate={onUpdate} />)

    await user.click(screen.getByRole('button', { name: /edit my template/i }))

    const nameInput = screen.getByDisplayValue('My Template')
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Name')

    await user.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onUpdate).toHaveBeenCalledWith('1', expect.objectContaining({ name: 'Updated Name' }))
  })

  it('renders Default badge on default template', () => {
    const templates = [
      { id: '1', name: 'Template A', isDefault: true },
      { id: '2', name: 'Template B' },
    ]
    render(<TemplatesSection templates={templates} />)

    expect(screen.getByText('Default')).toBeInTheDocument()
    expect(screen.getAllByText('Default')).toHaveLength(1)
  })

  it('renders Set Default button for non-default templates', () => {
    const templates = [
      { id: '1', name: 'Template A', isDefault: true },
      { id: '2', name: 'Template B' },
    ]
    render(<TemplatesSection templates={templates} onSetDefault={vi.fn()} />)

    // Non-default template should have Set Default button
    expect(screen.getByRole('button', { name: /set default/i })).toBeInTheDocument()
    // Only one (not on the already-default template)
    expect(screen.getAllByRole('button', { name: /set default/i })).toHaveLength(1)
  })

  it('does not call onCreateTemplate when fields are empty', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<TemplatesSection onCreateTemplate={onCreate} />)
    await user.click(screen.getByRole('button', { name: /create template/i }))
    await user.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('creates template with pipe-separated subject variants', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<TemplatesSection onCreateTemplate={onCreate} />)

    await user.click(screen.getByRole('button', { name: /create template/i }))

    await user.type(screen.getByLabelText(/template name/i), 'Test')
    await user.type(screen.getByLabelText(/subject variant 1/i), 'Sub A')
    await user.click(screen.getByRole('button', { name: /add variant/i }))
    await user.type(screen.getByLabelText(/subject variant 2/i), 'Sub B')
    await user.type(screen.getByLabelText(/email body/i), 'Body text')

    await user.click(screen.getByRole('button', { name: /^save$/i }))

    expect(onCreate).toHaveBeenCalledWith({
      name: 'Test',
      subject: 'Sub A|Sub B',
      body: 'Body text',
    })
  })
})
