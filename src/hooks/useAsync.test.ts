import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { deferred } from '../test/fixtures';
import { useAsync } from './useAsync';

it('starts loading and exposes the result', async () => {
  const pending = deferred<string[]>();
  const { result } = renderHook(() => useAsync(() => pending.promise));
  expect(result.current).toMatchObject({ loading: true, data: null, error: null });
  await act(async () => pending.resolve(['workout']));
  expect(result.current).toMatchObject({ loading: false, data: ['workout'], error: null });
});

it.each([new Error('Offline'), 'unknown'])('reports errors and can retry', async (failure) => {
  const loader = vi.fn().mockRejectedValueOnce(failure).mockResolvedValueOnce(['recovered']);
  const { result } = renderHook(() => useAsync(loader));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBe(failure instanceof Error ? 'Offline' : 'Unexpected error');
  await act(async () => result.current.reload());
  expect(result.current).toMatchObject({ error: null, data: ['recovered'], loading: false });
});

it('loads again when the resource identifier changes', async () => {
  const loader = vi.fn(async (id: string) => id);
  const { result, rerender } = renderHook(({ id }) => useAsync(() => loader(id), [id]), { initialProps: { id: 'first' } });
  await waitFor(() => expect(result.current.data).toBe('first'));
  rerender({ id: 'second' });
  await waitFor(() => expect(result.current.data).toBe('second'));
  expect(loader.mock.calls).toEqual([['first'], ['second']]);
});

it('supports in-place reloads without hiding existing content', async () => {
  const pending = deferred<string>();
  const loader = vi.fn().mockResolvedValueOnce('old').mockReturnValueOnce(pending.promise);
  const { result } = renderHook(() => useAsync(loader));
  await waitFor(() => expect(result.current.data).toBe('old'));
  let reload!: Promise<void>;
  act(() => { reload = result.current.reload({ showLoading: false }); });
  expect(result.current).toMatchObject({ loading: false, data: 'old' });
  await act(async () => { pending.resolve('new'); await reload; });
  expect(result.current.data).toBe('new');
});
