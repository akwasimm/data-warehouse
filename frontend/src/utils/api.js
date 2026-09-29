import { useEffect, useState } from 'react';

const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000/api';

export async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    // Surface the API's own message; the UI renders it inside the card.
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.detail ?? `Request failed (${res.status})`);
  }
  return res.json();
}

/**
 * Fetch-on-mount with the three states every card needs: loading, error, data.
 * Pass `skip` to hold a request until a selector has a value.
 */
export function useApi(path, skip = false) {
  const [state, setState] = useState({ data: null, loading: !skip, error: null });

  useEffect(() => {
    if (skip || !path) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    get(path)
      .then((data) => live && setState({ data, loading: false, error: null }))
      .catch((error) => live && setState({ data: null, loading: false, error: error.message }));
    return () => {
      live = false;
    };
  }, [path, skip]);

  return state;
}
