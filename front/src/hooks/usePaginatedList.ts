import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../auth/useAuth';
import { useAlert } from '../contexts/AlertContext';

interface UsePaginatedListOptions {
 endpoint: string;
 pageSize?: number;
 searchKey?: string | null;
}

interface PaginatedState<T> {
 items: T[];
 loading: boolean;
 hasMore: boolean;
 totalCount: number;
 loadMore: () => void;
 setSearch: (q: string) => void;
 refresh: () => void;
}

export function usePaginatedList<T = any>({
 endpoint,
 pageSize = 50,
 searchKey = 'search',
}: UsePaginatedListOptions): PaginatedState<T> {
 const [items, setItems] = useState<T[]>([]);
 const [offset, setOffset] = useState(0);
 const [totalCount, setTotalCount] = useState(0);
 const [loading, setLoading] = useState(false);
 const [search, setSearch] = useState('');
 const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
 const { addAlert } = useAlert();

 const fetchPage = useCallback(
 async (off: number, q: string, reset = false) => {
 setLoading(true);
 try {
 const params: Record<string, string | number> = {
 limit: pageSize,
 offset: off,
 };
 if (searchKey && q) {
 params[searchKey] = q;
 }
 const res = await api.get(endpoint, { params });
 const results = res.data.results ?? res.data;
 const count = res.data.count ?? (Array.isArray(results) ? results.length : 0);
 setItems((prev) => (reset ? results : [...prev, ...results]));
 setOffset(off + (Array.isArray(results) ? results.length : 0));
 setTotalCount(count);
 } catch (err: any) {
 addAlert(err?.response?.data?.detail || 'Erro ao carregar lista.', 'error');
 } finally {
 setLoading(false);
 }
 },
 [endpoint, pageSize, searchKey, addAlert],
 );

 // Reset + reload when search changes (debounced)
 useEffect(() => {
 setSearch('');
 setItems([]);
 setOffset(0);
 setTotalCount(0);
 }, [endpoint]);

 // Debounced search setter
 const setSearchDebounced = useCallback(
 (q: string) => {
 if (searchTimer.current) clearTimeout(searchTimer.current);
 searchTimer.current = setTimeout(() => {
 setSearch(q);
 setItems([]);
 setOffset(0);
 setTotalCount(0);
 fetchPage(0, q, true);
 }, 350);
 },
 [fetchPage],
 );

 // Fetch first page on mount / when search is committed
 useEffect(() => {
 fetchPage(0, search, true);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [search]);

 const loadMore = useCallback(() => {
 if (loading) return;
 fetchPage(offset, search, false);
 }, [loading, offset, search, fetchPage]);

 const refresh = useCallback(() => {
 setItems([]);
 setOffset(0);
 setTotalCount(0);
 fetchPage(0, search, true);
 }, [search, fetchPage]);

 const hasMore = items.length < totalCount;

 return { items, loading, hasMore, totalCount, loadMore, setSearch: setSearchDebounced, refresh };
}
