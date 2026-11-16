import { useCallback, useEffect, useState } from 'react';

type AsyncState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: (options?: ReloadOptions) => Promise<void>;
};

type ReloadOptions = {
  showLoading?: boolean;
};

export function useAsync<T>(loader: () => Promise<T>, deps: React.DependencyList = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async (options: ReloadOptions = {}) => {
    if (options.showLoading !== false) {
      setLoading(true);
    }
    setError(null);
    try {
      setData(await loader());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload };
}
