-- telegram_bot_messages: tracks messages sent by user bots so they can be deleted from the dashboard
CREATE TABLE IF NOT EXISTS telegram_bot_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_id uuid NOT NULL REFERENCES telegram_bots(id) ON DELETE CASCADE,
  chat_id text NOT NULL,
  chat_title text,
  message_id bigint NOT NULL,
  text_preview text,
  message_type text NOT NULL DEFAULT 'outbound',
  deleted_at timestamptz,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(bot_id, chat_id, message_id)
);

ALTER TABLE telegram_bot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own bot messages"
  ON telegram_bot_messages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_tgmsg_user_sent ON telegram_bot_messages(user_id, sent_at DESC);
CREATE INDEX idx_tgmsg_chat ON telegram_bot_messages(user_id, chat_id, sent_at DESC);
