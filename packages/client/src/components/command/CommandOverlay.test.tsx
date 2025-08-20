import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CommandOverlay } from './CommandOverlay'
import type { Command } from '@gilteun/shared'

// Mock time functions
const mockNow = new Date('2024-01-01T10:00:00Z').getTime()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(mockNow)
})

afterEach(() => {
  vi.useRealTimers()
})

const createMockCommand = (overrides?: Partial<Command>): Command => ({
  id: 'cmd-1',
  content: '다음 곡으로 넘어갑니다',
  senderName: '김인도',
  senderInstrument: 'piano',
  target: 'all',
  timestamp: new Date(mockNow),
  icon: '▶️',
  ...overrides,
})

describe('CommandOverlay Component', () => {
  it('renders without commands', () => {
    const onCommandExpire = vi.fn()
    const { container } = render(
      <CommandOverlay commands={[]} onCommandExpire={onCommandExpire} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders a single command correctly', () => {
    const onCommandExpire = vi.fn()
    const command = createMockCommand()
    
    render(<CommandOverlay commands={[command]} onCommandExpire={onCommandExpire} />)
    
    expect(screen.getByText('다음 곡으로 넘어갑니다')).toBeInTheDocument()
    expect(screen.getByText('김인도')).toBeInTheDocument()
    expect(screen.getByText('🎹')).toBeInTheDocument()
    expect(screen.getByText('▶️')).toBeInTheDocument()
    expect(screen.getByText('방금 전')).toBeInTheDocument()
  })

  it('renders multiple commands in correct order', () => {
    const onCommandExpire = vi.fn()
    const commands = [
      createMockCommand({ 
        id: 'cmd-1', 
        content: '첫 번째 명령',
        timestamp: new Date(mockNow - 1000)
      }),
      createMockCommand({ 
        id: 'cmd-2', 
        content: '두 번째 명령',
        timestamp: new Date(mockNow)
      }),
    ]
    
    render(<CommandOverlay commands={commands} onCommandExpire={onCommandExpire} />)
    
    const commandElements = screen.getAllByText(/번째 명령/)
    // 최신 명령이 먼저 표시되어야 함
    expect(commandElements[0]).toHaveTextContent('두 번째 명령')
    expect(commandElements[1]).toHaveTextContent('첫 번째 명령')
  })

  it('shows progress bar with correct initial width', () => {
    const onCommandExpire = vi.fn()
    const command = createMockCommand()
    
    render(<CommandOverlay commands={[command]} onCommandExpire={onCommandExpire} />)
    
    const progressBar = document.querySelector('[style*="width: 100%"]')
    expect(progressBar).toBeInTheDocument()
  })

  it('updates progress bar over time', async () => {
    const onCommandExpire = vi.fn()
    const command = createMockCommand()
    
    render(<CommandOverlay commands={[command]} onCommandExpire={onCommandExpire} />)
    
    // 1초 후 진행바가 줄어들어야 함
    vi.advanceTimersByTime(1000)
    await waitFor(() => {
      const progressBar = document.querySelector('[style*="width: 66"]')
      expect(progressBar).toBeInTheDocument()
    })
  })

  it('handles manual dismiss', async () => {
    const onCommandExpire = vi.fn()
    const command = createMockCommand()
    
    render(<CommandOverlay commands={[command]} onCommandExpire={onCommandExpire} />)
    
    const closeButton = screen.getByLabelText('명령 닫기')
    fireEvent.click(closeButton)
    
    // 닫기 애니메이션 후 onCommandExpire 호출
    vi.advanceTimersByTime(300)
    await waitFor(() => {
      expect(onCommandExpire).toHaveBeenCalledWith('cmd-1')
    })
  })

  it('auto-expires commands after 3 seconds', async () => {
    const onCommandExpire = vi.fn()
    const command = createMockCommand()
    
    render(<CommandOverlay commands={[command]} onCommandExpire={onCommandExpire} />)
    
    // 3.5초 후 자동 만료
    vi.advanceTimersByTime(3600) // 3600ms = 3.6초
    
    await waitFor(() => {
      expect(onCommandExpire).toHaveBeenCalledWith('cmd-1')
    })
  })

  it('displays target badge for non-all targets', () => {
    const onCommandExpire = vi.fn()
    const command = createMockCommand({ target: 'leaders' })
    
    render(<CommandOverlay commands={[command]} onCommandExpire={onCommandExpire} />)
    
    expect(screen.getByText('인도자만')).toBeInTheDocument()
  })

  it('does not display target badge for all targets', () => {
    const onCommandExpire = vi.fn()
    const command = createMockCommand({ target: 'all' })
    
    render(<CommandOverlay commands={[command]} onCommandExpire={onCommandExpire} />)
    
    expect(screen.queryByText('전체')).not.toBeInTheDocument()
  })

  it('applies fade-out animation near expiration', async () => {
    const onCommandExpire = vi.fn()
    const command = createMockCommand()
    
    render(<CommandOverlay commands={[command]} onCommandExpire={onCommandExpire} />)
    
    // 2.6초 후 (만료 500ms 전)
    vi.advanceTimersByTime(2600)
    
    await waitFor(() => {
      const card = document.querySelector('.opacity-0')
      expect(card).toBeInTheDocument()
    })
  })

  it('formats time correctly', () => {
    const onCommandExpire = vi.fn()
    
    // 1분 전 명령
    const oneMinuteAgo = createMockCommand({
      timestamp: new Date(mockNow - 60000)
    })
    
    const { rerender } = render(
      <CommandOverlay commands={[oneMinuteAgo]} onCommandExpire={onCommandExpire} />
    )
    expect(screen.getByText('1분 전')).toBeInTheDocument()
    
    // 1시간 전 명령
    const oneHourAgo = createMockCommand({
      timestamp: new Date(mockNow - 3600000)
    })
    
    rerender(<CommandOverlay commands={[oneHourAgo]} onCommandExpire={onCommandExpire} />)
    expect(screen.getByText('09:00')).toBeInTheDocument() // 시:분 형태
  })

  it('handles commands without instruments', () => {
    const onCommandExpire = vi.fn()
    const command = createMockCommand({ senderInstrument: undefined })
    
    render(<CommandOverlay commands={[command]} onCommandExpire={onCommandExpire} />)
    
    expect(screen.getByText('김인도')).toBeInTheDocument()
    expect(screen.queryByText('🎹')).not.toBeInTheDocument()
  })

  it('handles commands without icons', () => {
    const onCommandExpire = vi.fn()
    const command = createMockCommand({ icon: undefined })
    
    render(<CommandOverlay commands={[command]} onCommandExpire={onCommandExpire} />)
    
    expect(screen.getByText('다음 곡으로 넘어갑니다')).toBeInTheDocument()
    expect(screen.queryByText('▶️')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const onCommandExpire = vi.fn()
    const command = createMockCommand()
    
    const { container } = render(
      <CommandOverlay 
        commands={[command]} 
        onCommandExpire={onCommandExpire}
        className="custom-overlay" 
      />
    )
    
    expect(container.firstChild).toHaveClass('custom-overlay')
  })

  it('animates new commands with staggered delay', () => {
    const onCommandExpire = vi.fn()
    const commands = [
      createMockCommand({ id: 'cmd-1', content: '첫 번째' }),
      createMockCommand({ id: 'cmd-2', content: '두 번째' }),
    ]
    
    render(<CommandOverlay commands={commands} onCommandExpire={onCommandExpire} />)
    
    const cards = document.querySelectorAll('[style*="animation-delay"]')
    expect(cards[0]).toHaveStyle('animation-delay: 0ms')
    expect(cards[1]).toHaveStyle('animation-delay: 100ms')
  })

  it('maintains accessibility', () => {
    const onCommandExpire = vi.fn()
    const command = createMockCommand()
    
    render(<CommandOverlay commands={[command]} onCommandExpire={onCommandExpire} />)
    
    const closeButton = screen.getByLabelText('명령 닫기')
    expect(closeButton).toBeInTheDocument()
    expect(closeButton).toHaveAttribute('aria-label', '명령 닫기')
  })
})