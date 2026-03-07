import { fireEvent, render, screen } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PaginationControls from './PaginationControls';

describe('PaginationControls', () => {
  const onPageChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a compact middle-page window with edge buttons and gaps', () => {
    render(() => <PaginationControls page={5} totalPages={10} onPageChange={onPageChange} />);

    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '4' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: '6' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument();
    expect(screen.getAllByText('...')).toHaveLength(2);
  });

  it('renders a compact window near the start of the range', () => {
    render(() => <PaginationControls page={2} totalPages={10} onPageChange={onPageChange} />);

    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument();
    expect(screen.getAllByText('...')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: '4' })).not.toBeInTheDocument();
  });

  it('renders a compact window near the end of the range', () => {
    render(() => <PaginationControls page={9} totalPages={10} onPageChange={onPageChange} />);

    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '8' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '9' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument();
    expect(screen.getAllByText('...')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: '7' })).not.toBeInTheDocument();
  });

  it('blocks navigation while busy and does not emit page changes for the current page', () => {
    render(() => <PaginationControls page={5} totalPages={10} busy onPageChange={onPageChange} />);

    const previousButton = screen.getByRole('button', { name: 'Anterior' });
    const currentPageButton = screen.getByRole('button', { name: '5' });
    const nextPageButton = screen.getByRole('button', { name: '6' });
    const nextButton = screen.getByRole('button', { name: 'Siguiente' });

    expect(previousButton).toBeDisabled();
    expect(currentPageButton).toBeDisabled();
    expect(nextPageButton).toBeDisabled();
    expect(nextButton).toBeDisabled();

    fireEvent.click(previousButton);
    fireEvent.click(currentPageButton);
    fireEvent.click(nextPageButton);
    fireEvent.click(nextButton);

    expect(onPageChange).not.toHaveBeenCalled();
  });
});
