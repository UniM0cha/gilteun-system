import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { AlertCircle } from 'lucide-react';

describe('Alert', () => {
  it('renders default alert correctly', () => {
    render(
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Something went wrong!</AlertDescription>
      </Alert>
    );

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong!')).toBeInTheDocument();
  });

  it('renders destructive variant correctly', () => {
    render(
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Something went wrong!</AlertDescription>
      </Alert>
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('border-destructive/50');
  });

  it('renders with custom className', () => {
    render(
      <Alert className="custom-class">
        <AlertDescription>Test message</AlertDescription>
      </Alert>
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('custom-class');
  });

  it('supports data-testid', () => {
    render(
      <Alert data-testid="test-alert">
        <AlertDescription>Test message</AlertDescription>
      </Alert>
    );

    expect(screen.getByTestId('test-alert')).toBeInTheDocument();
  });
});
