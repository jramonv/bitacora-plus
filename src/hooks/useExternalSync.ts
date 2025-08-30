import { useState } from 'react';

export function useExternalSync<TParams, TResult>(syncFn: (params: TParams) => Promise<TResult>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sync = async (params: TParams): Promise<TResult> => {
    setLoading(true);
    setError(null);
    try {
      return await syncFn(params);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { sync, loading, error };
}
