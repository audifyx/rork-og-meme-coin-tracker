-- Aggregated analytics for a user's connected Telegram bot.
create or replace function public.telegram_bot_analytics(p_user uuid)
returns jsonb
language sql
security definer
set search_path = public
as $func$
  with b as (select * from telegram_bots where user_id = p_user limit 1)
  select case when not exists (select 1 from b) then jsonb_build_object('connected', false)
  else jsonb_build_object(
    'connected', true,
    'bot', (select jsonb_build_object('username', bot_username, 'alerts_migrations', alerts_migrations,
              'ai_enabled', ai_enabled, 'ai_model', ai_model, 'created_at', created_at) from b),
    'totals', jsonb_build_object(
      'chats',        (select count(*) from telegram_alert_chats c, b where c.bot_id=b.id),
      'supergroups',  (select count(*) from telegram_alert_chats c, b where c.bot_id=b.id and c.chat_id::text like '-100%'),
      'groups',       (select count(*) from telegram_alert_chats c, b where c.bot_id=b.id and c.chat_id::text like '-%' and c.chat_id::text not like '-100%'),
      'dms',          (select count(*) from telegram_alert_chats c, b where c.bot_id=b.id and c.chat_id::text not like '-%'),
      'active_chats', (select count(*) from telegram_alert_chats c, b where c.bot_id=b.id and c.enabled),
      'messages',     (select count(*) from telegram_bot_messages m, b where m.bot_id=b.id),
      'messages_live',(select count(*) from telegram_bot_messages m, b where m.bot_id=b.id and m.deleted_at is null),
      'scans',        (select count(*) from scan_log s, b where s.bot_id=b.id),
      'scan_users',   (select count(distinct scanned_by) from scan_log s, b where s.bot_id=b.id and scanned_by is not null),
      'watch',        (select count(*) from telegram_watchlist w, b where w.bot_id=b.id),
      'commands',     (select count(*) from telegram_custom_commands cc, b where cc.bot_id=b.id)
    ),
    'messages_by_day', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'n', cnt) order by d), '[]'::jsonb)
      from (select gs::date d, (select count(*) from telegram_bot_messages m, b where m.bot_id=b.id and m.sent_at::date=gs::date) cnt
            from generate_series(current_date - interval '13 days', current_date, interval '1 day') gs) x),
    'scans_by_day', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'n', cnt) order by d), '[]'::jsonb)
      from (select gs::date d, (select count(*) from scan_log s, b where s.bot_id=b.id and s.created_at::date=gs::date) cnt
            from generate_series(current_date - interval '13 days', current_date, interval '1 day') gs) x),
    'top_chats', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select c.chat_id::text chat_id, c.chat_title,
          (select count(*) from telegram_bot_messages m where m.bot_id=(select id from b) and m.chat_id=c.chat_id::text) messages,
          (select count(*) from scan_log s where s.bot_id=(select id from b) and s.chat_id=c.chat_id::text) scans
        from telegram_alert_chats c where c.bot_id=(select id from b)
        order by messages desc, scans desc limit 12) t),
    'top_tokens', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select symbol, mint, count(*) scans,
          round(max(peak_multiple)::numeric,2) best_multiple, round(avg(og_score)::numeric,0) avg_score
        from scan_log s, b where s.bot_id=b.id and symbol is not null
        group by symbol, mint order by scans desc, best_multiple desc nulls last limit 10) t),
    'recent_scans', (select coalesce(jsonb_agg(jsonb_build_object(
          'symbol', symbol, 'og_score', og_score, 'peak_multiple', round(peak_multiple::numeric,2),
          'market_cap', market_cap, 'created_at', created_at) order by created_at desc), '[]'::jsonb)
        from (select s.* from scan_log s, b where s.bot_id=b.id order by s.created_at desc limit 10) z)
,
    'per_group', (select coalesce(jsonb_agg(jsonb_build_object(
          'chat_id', cid, 'chat_title', ctitle, 'enabled', cen, 'type', ctype,
          'messages', msgs, 'messages_live', msgs_live, 'scans', scans, 'users', susers,
          'last_scan', last_scan, 'last_message', last_msg) order by msgs desc, scans desc), '[]'::jsonb)
      from (
        select c.chat_id::text cid, c.chat_title ctitle, c.enabled cen,
          case when c.chat_id::text like '-100%' then 'supergroup' when c.chat_id::text like '-%' then 'group' else 'dm' end ctype,
          (select count(*) from telegram_bot_messages m where m.bot_id=c.bot_id and m.chat_id=c.chat_id::text) msgs,
          (select count(*) from telegram_bot_messages m where m.bot_id=c.bot_id and m.chat_id=c.chat_id::text and m.deleted_at is null) msgs_live,
          (select count(*) from scan_log s where s.bot_id=c.bot_id and s.chat_id=c.chat_id::text) scans,
          (select count(distinct s.scanned_by) from scan_log s where s.bot_id=c.bot_id and s.chat_id=c.chat_id::text and s.scanned_by is not null) susers,
          (select max(s.created_at) from scan_log s where s.bot_id=c.bot_id and s.chat_id=c.chat_id::text) last_scan,
          (select max(m.sent_at) from telegram_bot_messages m where m.bot_id=c.bot_id and m.chat_id=c.chat_id::text) last_msg
        from telegram_alert_chats c where c.bot_id=(select id from b)
      ) z)
  ) end;
$func$;
