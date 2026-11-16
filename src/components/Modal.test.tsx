import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import Modal from './Modal';

it('renders only while open and keeps clicks within the content from closing it', async () => {
  const onClose = vi.fn();
  const { rerender } = render(<Modal title="Edit workout" open={false} onClose={onClose}><p>Form content</p></Modal>);
  expect(screen.queryByText('Form content')).not.toBeInTheDocument();
  rerender(<Modal title="Edit workout" open onClose={onClose}><p>Form content</p></Modal>);
  await userEvent.click(screen.getByText('Form content'));
  expect(onClose).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(onClose).toHaveBeenCalledOnce();
});

it('closes when the backdrop is clicked', () => {
  const onClose = vi.fn();
  const { container } = render(<Modal title="Edit workout" open onClose={onClose}>Content</Modal>);
  fireEvent.click(container.firstElementChild!);
  expect(onClose).toHaveBeenCalledOnce();
});
