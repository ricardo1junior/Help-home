import { subscribeToChanges } from '@helphome/shared';
import { useEffect, useRef } from 'react';
import { supabase } from './supabase';

type Table = { table: string; filter?: string };

/** Chama `onChange` (agrupando rajadas) quando alguma das tabelas muda no banco. */
export function useRealtime(name: string, tables: Table[] | null, onChange: () => void) {
  const callback = useRef(onChange);
  useEffect(() => {
    callback.current = onChange;
  });
  const key = tables ? JSON.stringify(tables) : null;

  useEffect(() => {
    if (!key) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = subscribeToChanges(supabase, name, JSON.parse(key) as Table[], () => {
      clearTimeout(timer);
      timer = setTimeout(() => callback.current(), 300);
    });
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, [name, key]);
}
