import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StageBadge } from '../StageBadge'
import { ConnectionStage } from '@/lib/types/enums'

describe('StageBadge', () => {
  it('renders DRAFTED with gray styling', () => {
    render(<StageBadge stage={ConnectionStage.DRAFTED} />)
    const badge = screen.getByText('Drafted')
    expect(badge.className).toContain('bg-gray')
  })

  it('renders MESSAGE_SENT with blue styling', () => {
    render(<StageBadge stage={ConnectionStage.MESSAGE_SENT} />)
    const badge = screen.getByText('Message Sent')
    expect(badge.className).toContain('bg-blue')
  })

  it('renders DIDNT_CONNECT with yellow styling', () => {
    render(<StageBadge stage={ConnectionStage.DIDNT_CONNECT} />)
    const badge = screen.getByText("Didn't Connect")
    expect(badge.className).toContain('bg-yellow')
  })

  it('renders CONNECTED with green styling', () => {
    render(<StageBadge stage={ConnectionStage.CONNECTED} />)
    const badge = screen.getByText('Connected')
    expect(badge.className).toContain('bg-green')
  })

  it('renders IN_TOUCH with purple styling', () => {
    render(<StageBadge stage={ConnectionStage.IN_TOUCH} />)
    const badge = screen.getByText('In Touch')
    expect(badge.className).toContain('bg-purple')
  })
})
