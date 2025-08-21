import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from './input'

describe('Input Component', () => {
  it('renders with default props', () => {
    render(<Input />)
    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
    expect(input).toHaveClass('flex', 'h-10', 'w-full')
  })

  it('renders with placeholder', () => {
    render(<Input placeholder="Enter text..." />)
    expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument()
  })

  it('handles value changes', async () => {
    const user = userEvent.setup()
    render(<Input />)
    const input = screen.getByRole('textbox')
    
    await user.type(input, 'Hello World')
    expect(input).toHaveValue('Hello World')
  })

  it('handles controlled input', () => {
    const handleChange = vi.fn()
    render(<Input value="controlled" onChange={handleChange} />)
    const input = screen.getByRole('textbox')
    
    expect(input).toHaveValue('controlled')
    
    fireEvent.change(input, { target: { value: 'new value' } })
    expect(handleChange).toHaveBeenCalled()
  })

  it('is disabled when disabled prop is true', () => {
    render(<Input disabled />)
    const input = screen.getByRole('textbox')
    expect(input).toBeDisabled()
    expect(input).toHaveClass('disabled:cursor-not-allowed')
  })

  it('accepts custom className', () => {
    render(<Input className="custom-class" />)
    expect(screen.getByRole('textbox')).toHaveClass('custom-class')
  })

  it('handles different input types', () => {
    const { rerender } = render(<Input type="password" />)
    const passwordInput = screen.getByDisplayValue('')
    expect(passwordInput).toHaveAttribute('type', 'password')

    rerender(<Input type="email" />)
    const emailInput = screen.getByDisplayValue('')
    expect(emailInput).toHaveAttribute('type', 'email')
  })

  it('focuses on click', async () => {
    const user = userEvent.setup()
    render(<Input />)
    const input = screen.getByRole('textbox')
    
    await user.click(input)
    expect(input).toHaveFocus()
  })
})