import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../auth/useAuth';

export interface SearchResult {
  id: number;
  nome: string;
  [key: string]: any;
}

/**
 * Hook para busca server-side com debounce.
 * Busca no endpoint e retorna resultados filtrados pelo backend.
 * Limpa o cache e faz nova requisição quando o termo muda.
 */
export function useDebouncedSearch<T = any>(endpoint: string, debounceMs = 300) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(endpoint, { params: { search: term } });
      setResults(res.data.results || res.data || []);
    } catch {
      setError('Erro ao buscar.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(() => {
      search(query);
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, debounceMs, search]);

  return { query, setQuery, results, loading, error, clear: () => setQuery('') };
}