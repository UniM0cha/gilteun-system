import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConnectionStatus } from './ConnectionStatus';

// Mock the useSocket hook
vi.mock('@/hooks/useSocket', () => ({
  useSocket: vi.fn(),
}));

const mockUseSocket = vi.mocked(await import('@/hooks/useSocket')).useSocket;

describe('ConnectionStatus', () => {
  it('shows connecting state correctly', () => {
    mockUseSocket.mockReturnValue({
      isConnected: false,
      isConnecting: true,
      error: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
    });

    render(<ConnectionStatus />);

    expect(screen.getByText('연결 중...')).toBeInTheDocument();
    expect(screen.getByTestId('loader-icon') || screen.getByRole('img', { hidden: true })).toBeInTheDocument();
  });

  it('shows connected state correctly with proper semantic colors', () => {
    const mockDisconnect = vi.fn();
    mockUseSocket.mockReturnValue({
      isConnected: true,
      isConnecting: false,
      error: null,
      connect: vi.fn(),
      disconnect: mockDisconnect,
    });

    render(<ConnectionStatus />);

    expect(screen.getByText('연결됨')).toBeInTheDocument();
    
    // Check for semantic color classes (emerald-600 instead of green-500)
    const container = screen.getByText('연결됨').closest('div');
    expect(container).toHaveClass('text-emerald-600');

    const disconnectButton = screen.getByText('연결 해제');
    expect(disconnectButton).toBeInTheDocument();
    
    fireEvent.click(disconnectButton);
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('shows disconnected state correctly', () => {
    const mockConnect = vi.fn();
    mockUseSocket.mockReturnValue({
      isConnected: false,
      isConnecting: false,
      error: null,
      connect: mockConnect,
      disconnect: vi.fn(),
    });

    render(<ConnectionStatus />);

    expect(screen.getByText('연결되지 않음')).toBeInTheDocument();
    
    // Check for semantic destructive color
    const container = screen.getByText('연결되지 않음').closest('div');
    expect(container).toHaveClass('text-destructive');

    const connectButton = screen.getByText('다시 연결');
    expect(connectButton).toBeInTheDocument();
    
    fireEvent.click(connectButton);
    expect(mockConnect).toHaveBeenCalled();
  });

  it('shows error message when connection fails', () => {
    mockUseSocket.mockReturnValue({
      isConnected: false,
      isConnecting: false,
      error: 'Network error',
      connect: vi.fn(),
      disconnect: vi.fn(),
    });

    render(<ConnectionStatus />);

    expect(screen.getByText('연결 실패: Network error')).toBeInTheDocument();
  });

  it('uses shadcn/ui Button components', () => {
    mockUseSocket.mockReturnValue({
      isConnected: true,
      isConnecting: false,
      error: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
    });

    render(<ConnectionStatus />);

    const button = screen.getByText('연결 해제');
    expect(button).toHaveClass('inline-flex'); // shadcn/ui button class
    expect(button).toHaveAttribute('data-slot', 'button'); // new shadcn/ui button data attribute
  });
});