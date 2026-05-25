/**
 * useToolPersistence — Shared hooks for persisting tool data to Supabase.
 * Replaces localStorage with cloud-synced, user-scoped persistence.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

/* ═══════════════════════════════════════════════════════════════
   1. User State — selected mint, active chain, recent searches, filter presets
   ═══════════════════════════════════════════════════════════════ */

export interface OgScanUserState {
  selected_mint: string | null;
  active_chain: string | null;
  recent_searches: string[];
  filter_presets: Record<string, any>;
}

export function useUserState() {
  const { user } = useAuth();
  const [state, setState] = useState<OgScanUserState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setState(null); setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("ogscan_user_state")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setState(data ?? { selected_mint: null, active_chain: "solana", recent_searches: [], filter_presets: {} });
      setLoading(false);
    })();
  }, [user?.id]);

  const update = useCallback(async (patch: Partial<OgScanUserState>) => {
    if (!user) return;
    setState((prev) => prev ? { ...prev, ...patch } : null);
    await supabase
      .from("ogscan_user_state")
      .upsert({ user_id: user.id, ...patch, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  }, [user?.id]);

  const addRecentSearch = useCallback(async (mint: string) => {
    if (!user || !state) return;
    const updated = [mint, ...state.recent_searches.filter((s) => s !== mint)].slice(0, 20);
    await update({ recent_searches: updated });
  }, [user?.id, state, update]);

  return { state, loading, update, addRecentSearch };
}

/* ═══════════════════════════════════════════════════════════════
   2. Watchlist — tracked mints with labels and metadata
   ═══════════════════════════════════════════════════════════════ */

export interface WatchlistItem {
  id: string;
  mint: string;
  symbol: string;
  name: string;
  added_at: string;
}

export function useWatchlist() {
  const { user } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    const { data } = await supabase
      .from("watchlist_tokens")
      .select("*")
      .eq("user_id", user.id)
      .order("added_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const add = useCallback(async (mint: string, symbol: string, name: string) => {
    if (!user) return;
    const exists = items.some((i) => i.mint === mint);
    if (exists) return;
    const { data } = await supabase
      .from("watchlist_tokens")
      .insert({ user_id: user.id, mint, symbol, name })
      .select()
      .single();
    if (data) setItems((prev) => [data, ...prev]);
  }, [user?.id, items]);

  const remove = useCallback(async (id: string) => {
    await supabase.from("watchlist_tokens").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const has = useCallback((mint: string) => items.some((i) => i.mint === mint), [items]);

  return { items, loading, add, remove, has, refresh: fetchItems };
}

/* ═══════════════════════════════════════════════════════════════
   3. Watched Mints — dev wallet tracking for scanner
   ═══════════════════════════════════════════════════════════════ */

export interface WatchedMint {
  id: string;
  mint: string;
  label: string;
  metadata: Record<string, any>;
  created_at: string;
}

export function useWatchedMints() {
  const { user } = useAuth();
  const [items, setItems] = useState<WatchedMint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    const { data } = await supabase
      .from("ogscan_watched_mints")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const add = useCallback(async (mint: string, label: string, metadata?: Record<string, any>) => {
    if (!user) return;
    const { data } = await supabase
      .from("ogscan_watched_mints")
      .insert({ user_id: user.id, mint, label, metadata: metadata ?? {} })
      .select()
      .single();
    if (data) setItems((prev) => [data, ...prev]);
  }, [user?.id]);

  const remove = useCallback(async (id: string) => {
    await supabase.from("ogscan_watched_mints").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return { items, loading, add, remove, refresh: fetchItems };
}

/* ═══════════════════════════════════════════════════════════════
   4. Watched Devs — dev wallet tracking
   ═══════════════════════════════════════════════════════════════ */

export interface WatchedDev {
  id: string;
  wallet: string;
  label: string;
  metadata: Record<string, any>;
  created_at: string;
}

export function useWatchedDevs() {
  const { user } = useAuth();
  const [items, setItems] = useState<WatchedDev[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    const { data } = await supabase
      .from("ogscan_watched_devs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const add = useCallback(async (wallet: string, label: string, metadata?: Record<string, any>) => {
    if (!user) return;
    const { data } = await supabase
      .from("ogscan_watched_devs")
      .insert({ user_id: user.id, wallet, label, metadata: metadata ?? {} })
      .select()
      .single();
    if (data) setItems((prev) => [data, ...prev]);
  }, [user?.id]);

  const remove = useCallback(async (id: string) => {
    await supabase.from("ogscan_watched_devs").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return { items, loading, add, remove, refresh: fetchItems };
}

/* ═══════════════════════════════════════════════════════════════
   5. Price Alerts
   ═══════════════════════════════════════════════════════════════ */

export interface PriceAlert {
  id: string;
  token_address: string;
  symbol: string;
  target_price: number;
  condition: "above" | "below";
  is_active: boolean;
  triggered_at: string | null;
  created_at: string;
}

export function usePriceAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    if (!user) { setAlerts([]); setLoading(false); return; }
    const { data } = await supabase
      .from("price_alerts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setAlerts(data ?? []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const add = useCallback(async (tokenAddress: string, symbol: string, targetPrice: number, condition: "above" | "below") => {
    if (!user) return;
    const { data } = await supabase
      .from("price_alerts")
      .insert({ user_id: user.id, token_address: tokenAddress, symbol, target_price: targetPrice, condition, is_active: true })
      .select()
      .single();
    if (data) setAlerts((prev) => [data, ...prev]);
  }, [user?.id]);

  const remove = useCallback(async (id: string) => {
    await supabase.from("price_alerts").delete().eq("id", id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const toggle = useCallback(async (id: string, active: boolean) => {
    await supabase.from("price_alerts").update({ is_active: active }).eq("id", id);
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, is_active: active } : a));
  }, []);

  return { alerts, loading, add, remove, toggle, refresh: fetchAlerts };
}

/* ═══════════════════════════════════════════════════════════════
   6. Trade History — log swaps
   ═══════════════════════════════════════════════════════════════ */

export interface TradeRecord {
  id: string;
  token_address: string;
  token_symbol: string;
  token_name: string;
  trade_type: "buy" | "sell";
  amount: number;
  price_usd: number;
  total_usd: number;
  signature: string;
  timestamp: string;
}

export function useTradeHistory() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrades = useCallback(async () => {
    if (!user) { setTrades([]); setLoading(false); return; }
    const { data } = await supabase
      .from("trade_history")
      .select("*")
      .eq("user_id", user.id)
      .order("timestamp", { ascending: false })
      .limit(100);
    setTrades(data ?? []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchTrades(); }, [fetchTrades]);

  const logTrade = useCallback(async (trade: Omit<TradeRecord, "id" | "timestamp">) => {
    if (!user) return;
    const { data } = await supabase
      .from("trade_history")
      .insert({ user_id: user.id, ...trade, timestamp: new Date().toISOString() })
      .select()
      .single();
    if (data) setTrades((prev) => [data, ...prev]);
  }, [user?.id]);

  return { trades, loading, logTrade, refresh: fetchTrades };
}

/* ═══════════════════════════════════════════════════════════════
   7. Tracked Tokens — full-featured token tracking (different from watchlist)
   ═══════════════════════════════════════════════════════════════ */

export interface TrackedToken {
  id: string;
  token_address: string;
  symbol: string;
  name: string;
  is_favorite: boolean;
  market_cap: number | null;
  volume_24h: number | null;
  risk_score: number | null;
  created_at: string;
}

export function useTrackedTokens() {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<TrackedToken[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTokens = useCallback(async () => {
    if (!user) { setTokens([]); setLoading(false); return; }
    const { data } = await supabase
      .from("tracked_tokens")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setTokens(data ?? []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchTokens(); }, [fetchTokens]);

  const track = useCallback(async (tokenAddress: string, symbol: string, name: string) => {
    if (!user) return;
    const exists = tokens.some((t) => t.token_address === tokenAddress);
    if (exists) return;
    const { data } = await supabase
      .from("tracked_tokens")
      .insert({ user_id: user.id, token_address: tokenAddress, symbol, name, is_favorite: false })
      .select()
      .single();
    if (data) setTokens((prev) => [data, ...prev]);
  }, [user?.id, tokens]);

  const untrack = useCallback(async (id: string) => {
    await supabase.from("tracked_tokens").delete().eq("id", id);
    setTokens((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleFavorite = useCallback(async (id: string, fav: boolean) => {
    await supabase.from("tracked_tokens").update({ is_favorite: fav }).eq("id", id);
    setTokens((prev) => prev.map((t) => t.id === id ? { ...t, is_favorite: fav } : t));
  }, []);

  const isTracked = useCallback((tokenAddress: string) => tokens.some((t) => t.token_address === tokenAddress), [tokens]);

  return { tokens, loading, track, untrack, toggleFavorite, isTracked, refresh: fetchTokens };
}
