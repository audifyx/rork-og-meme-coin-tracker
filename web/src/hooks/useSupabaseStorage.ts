/**
 * useSupabaseStorage — Drop-in replacement for localStorage-backed state.
 * Reads from Supabase on mount (falls back to localStorage), writes to both.
 * Components can swap `loadFromLS` / `saveToLS` calls with this hook.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

/**
 * Generic hook: replaces a localStorage key with a Supabase-backed table row.
 * The table must have: id (uuid PK), user_id (uuid FK), + your data columns.
 *
 * @param table - Supabase table name
 * @param localStorageKey - existing localStorage key (used as fallback)
 * @param defaultValue - initial value if nothing exists
 * @param options.serialize - convert state → row data for upsert (default: { data: value })
 * @param options.deserialize - convert row → state (default: row.data)
 * @param options.uniqueColumn - column for upsert conflict (default: "user_id")
 */
export function useSupabaseStorage<T>(
  table: string,
  localStorageKey: string,
  defaultValue: T,
  options?: {
    serialize?: (value: T) => Record<string, any>;
    deserialize?: (row: any) => T;
    uniqueColumn?: string;
  }
) {
  const { user } = useAuth();
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  const serialize = options?.serialize ?? ((v: T) => ({ data: v }));
  const deserialize = options?.deserialize ?? ((row: any) => row.data as T);
  const uniqueColumn = options?.uniqueColumn ?? "user_id";

  // Load from Supabase, fall back to localStorage
  useEffect(() => {
    if (initialized.current) return;

    const load = async () => {
      // If user is logged in, try Supabase first
      if (user) {
        try {
          const { data: row } = await supabase
            .from(table)
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();
          if (row) {
            const parsed = deserialize(row);
            setValue(parsed);
            // Also sync to localStorage as cache
            try { localStorage.setItem(localStorageKey, JSON.stringify(parsed)); } catch {}
            initialized.current = true;
            setLoading(false);
            return;
          }
        } catch {
          // Supabase failed, fall through to localStorage
        }
      }

      // Fall back to localStorage
      try {
        const raw = localStorage.getItem(localStorageKey);
        if (raw) {
          setValue(JSON.parse(raw));
        }
      } catch {}
      initialized.current = true;
      setLoading(false);
    };

    load();
  }, [user?.id, table, localStorageKey]);

  // Save to both Supabase and localStorage
  const save = useCallback(
    async (newValue: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof newValue === "function" ? (newValue as (prev: T) => T)(prev) : newValue;

        // Write to localStorage immediately (sync)
        try { localStorage.setItem(localStorageKey, JSON.stringify(resolved)); } catch {}

        // Write to Supabase (async, fire-and-forget)
        if (user) {
          const rowData = serialize(resolved);
          supabase
            .from(table)
            .upsert(
              { user_id: user.id, ...rowData, updated_at: new Date().toISOString() },
              { onConflict: uniqueColumn }
            )
            .then(({ error }) => {
              if (error) console.warn(`[useSupabaseStorage] ${table} upsert error:`, error.message);
            });
        }

        return resolved;
      });
    },
    [user?.id, table, localStorageKey, serialize, uniqueColumn]
  );

  return { value, save, loading };
}

/**
 * useSupabaseList — For tables where each row is an item in a list.
 * Replaces localStorage arrays with Supabase table rows.
 * 
 * @param table - Supabase table name
 * @param localStorageKey - existing localStorage key (used as fallback on first load)
 */
export function useSupabaseList<T extends Record<string, any>>(
  table: string,
  localStorageKey: string,
  options?: {
    orderBy?: string;
    orderAsc?: boolean;
    maxItems?: number;
    toRow?: (item: T) => Record<string, any>;
    fromRow?: (row: any) => T;
  }
) {
  const { user } = useAuth();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  const orderBy = options?.orderBy ?? "created_at";
  const orderAsc = options?.orderAsc ?? false;
  const maxItems = options?.maxItems ?? 500;
  const toRow = options?.toRow ?? ((item: T) => item);
  const fromRow = options?.fromRow ?? ((row: any) => row as T);

  // Load from Supabase, fall back to localStorage
  useEffect(() => {
    if (initialized.current || !user) {
      if (!user) setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const { data: rows } = await supabase
          .from(table)
          .select("*")
          .eq("user_id", user.id)
          .order(orderBy, { ascending: orderAsc })
          .limit(maxItems);
        if (rows && rows.length > 0) {
          setItems(rows.map(fromRow));
          initialized.current = true;
          setLoading(false);
          return;
        }
      } catch {}

      // Fall back to localStorage  
      try {
        const raw = localStorage.getItem(localStorageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setItems(parsed);
        }
      } catch {}
      initialized.current = true;
      setLoading(false);
    };

    load();
  }, [user?.id, table]);

  const add = useCallback(async (item: T) => {
    if (!user) return;
    const rowData = toRow(item);
    const { data: inserted, error } = await supabase
      .from(table)
      .insert({ user_id: user.id, ...rowData })
      .select()
      .single();
    if (inserted) {
      setItems(prev => [fromRow(inserted), ...prev].slice(0, maxItems));
    } else if (error) {
      // Fallback: add locally
      setItems(prev => [item, ...prev].slice(0, maxItems));
    }
  }, [user?.id, table, toRow, fromRow, maxItems]);

  const remove = useCallback(async (id: string) => {
    await supabase.from(table).delete().eq("id", id);
    setItems(prev => prev.filter((i: any) => i.id !== id));
  }, [table]);

  const update = useCallback(async (id: string, patch: Partial<T>) => {
    const { data: updated } = await supabase
      .from(table)
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (updated) {
      setItems(prev => prev.map((i: any) => i.id === id ? fromRow(updated) : i));
    }
  }, [table, fromRow]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data: rows } = await supabase
      .from(table)
      .select("*")
      .eq("user_id", user.id)
      .order(orderBy, { ascending: orderAsc })
      .limit(maxItems);
    if (rows) setItems(rows.map(fromRow));
  }, [user?.id, table, orderBy, orderAsc, maxItems, fromRow]);

  return { items, setItems, loading, add, remove, update, refresh };
}
