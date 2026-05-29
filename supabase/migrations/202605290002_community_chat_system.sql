-- ====================================================================
-- OG SCAN Community Chat System V2
-- Backend-backed group chats, community channels, roles, reports,
-- warnings, mutes, bans, reactions, and audit logs.
-- ====================================================================

-- Extend existing room table without breaking older clients.
ALTER TABLE community_rooms ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES communities(id) ON DELETE CASCADE;
ALTER TABLE community_rooms ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE community_rooms ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE community_rooms ADD COLUMN IF NOT EXISTS rules TEXT;
ALTER TABLE community_rooms ADD COLUMN IF NOT EXISTS room_type TEXT NOT NULL DEFAULT 'public' CHECK (room_type IN ('public', 'private', 'invite_only', 'community', 'team', 'project', 'research', 'trading', 'local'));
ALTER TABLE community_rooms ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE community_rooms ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE community_rooms ADD COLUMN IF NOT EXISTS is_read_only BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE community_rooms ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE community_rooms ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE community_rooms ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE community_rooms ADD COLUMN IF NOT EXISTS online_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE community_rooms ADD COLUMN IF NOT EXISTS pinned_announcement TEXT;
ALTER TABLE community_rooms ADD COLUMN IF NOT EXISTS shared_links JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE community_rooms ADD COLUMN IF NOT EXISTS media_gallery JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE community_rooms ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE community_rooms ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE community_rooms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE community_rooms
SET is_public = NOT COALESCE(is_private, false),
    host_id = COALESCE(host_id, created_by),
    updated_at = COALESCE(updated_at, last_message_at, created_at, now())
WHERE true;

CREATE INDEX IF NOT EXISTS community_rooms_community_idx ON community_rooms(community_id);
CREATE INDEX IF NOT EXISTS community_rooms_active_idx ON community_rooms(is_archived, is_hidden, sort_order, updated_at DESC);
CREATE INDEX IF NOT EXISTS community_rooms_type_idx ON community_rooms(room_type);

CREATE OR REPLACE FUNCTION public.set_community_room_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_community_rooms_updated_at ON community_rooms;
CREATE TRIGGER trg_community_rooms_updated_at
BEFORE UPDATE ON community_rooms
FOR EACH ROW EXECUTE FUNCTION public.set_community_room_updated_at();

-- Canonical V2 message table. The older community_messages table can remain
-- for historical compatibility, while the app reads/writes this richer table.
CREATE TABLE IF NOT EXISTS community_room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES community_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 5000),
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'gif', 'video', 'voice', 'file', 'system')),
  media_url TEXT,
  file_url TEXT,
  link_preview JSONB NOT NULL DEFAULT '{}'::jsonb,
  reply_to_id UUID REFERENCES community_room_messages(id) ON DELETE SET NULL,
  quote_message_id UUID REFERENCES community_room_messages(id) ON DELETE SET NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_room_messages_sender_auth_fkey'
  ) THEN
    ALTER TABLE community_room_messages
      ADD CONSTRAINT community_room_messages_sender_auth_fkey
      FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS community_room_messages_room_idx ON community_room_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS community_room_messages_sender_idx ON community_room_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS community_room_messages_pinned_idx ON community_room_messages(room_id, is_pinned, created_at DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_room_messages_sender_id_fkey'
  ) THEN
    ALTER TABLE community_room_messages
      ADD CONSTRAINT community_room_messages_sender_id_fkey
      FOREIGN KEY (sender_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS community_room_reactions (
  message_id UUID NOT NULL REFERENCES community_room_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS community_room_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES community_rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, name)
);

ALTER TABLE community_room_members ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES community_room_roles(id) ON DELETE SET NULL;
ALTER TABLE community_room_members ADD COLUMN IF NOT EXISTS warning_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE community_room_members ADD COLUMN IF NOT EXISTS reputation_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE community_room_members ADD COLUMN IF NOT EXISTS activity_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE community_room_members ADD COLUMN IF NOT EXISTS muted_until TIMESTAMPTZ;
ALTER TABLE community_room_members ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ;
ALTER TABLE community_room_members ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE community_room_members DROP CONSTRAINT IF EXISTS community_room_members_role_check;
ALTER TABLE community_room_members ADD CONSTRAINT community_room_members_role_check CHECK (role IN ('owner', 'admin', 'moderator', 'helper', 'verified', 'member'));

CREATE TABLE IF NOT EXISTS community_room_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES community_rooms(id) ON DELETE CASCADE,
  message_id UUID REFERENCES community_room_messages(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS community_room_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES community_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  moderator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_room_mutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES community_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  moderator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_room_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES community_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  moderator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  expires_at TIMESTAMPTZ,
  appeal_text TEXT,
  appeal_status TEXT DEFAULT 'none' CHECK (appeal_status IN ('none', 'pending', 'approved', 'denied')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_room_moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES community_rooms(id) ON DELETE CASCADE,
  moderator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message_id UUID REFERENCES community_room_messages(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_room_reports_room_idx ON community_room_reports(room_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS community_room_warnings_user_idx ON community_room_warnings(room_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS community_room_mutes_user_idx ON community_room_mutes(room_id, user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS community_room_bans_user_idx ON community_room_bans(room_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS community_room_actions_room_idx ON community_room_moderation_actions(room_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.is_room_moderator(room_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM community_room_members
    WHERE room_id = room_uuid
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin', 'moderator')
      AND NOT is_banned
  )
  OR EXISTS (
    SELECT 1 FROM community_rooms
    WHERE id = room_uuid AND COALESCE(created_by, host_id) = auth.uid()
  );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.can_send_room_message(room_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM community_rooms r
    LEFT JOIN community_room_members m ON m.room_id = r.id AND m.user_id = auth.uid()
    WHERE r.id = room_uuid
      AND auth.uid() IS NOT NULL
      AND NOT r.is_archived
      AND NOT r.is_locked
      AND (NOT r.is_read_only OR public.is_room_moderator(room_uuid))
      AND COALESCE(m.is_banned, false) = false
      AND (m.muted_until IS NULL OR m.muted_until < now())
      AND NOT EXISTS (
        SELECT 1 FROM community_room_mutes mu
        WHERE mu.room_id = room_uuid AND mu.user_id = auth.uid() AND mu.expires_at > now()
      )
      AND NOT EXISTS (
        SELECT 1 FROM community_room_bans b
        WHERE b.room_id = room_uuid AND b.user_id = auth.uid() AND (b.expires_at IS NULL OR b.expires_at > now())
      )
  );
$$ LANGUAGE sql STABLE;

ALTER TABLE community_room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_room_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_room_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_room_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_room_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_room_mutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_room_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_room_moderation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "room_messages_select_visible" ON community_room_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_rooms r
      WHERE r.id = room_id
        AND NOT r.is_hidden
        AND (r.is_public OR r.created_by = auth.uid() OR EXISTS (
          SELECT 1 FROM community_room_members m WHERE m.room_id = r.id AND m.user_id = auth.uid() AND NOT m.is_banned
        ))
    )
  );

CREATE POLICY IF NOT EXISTS "room_messages_insert_members" ON community_room_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid() AND public.can_send_room_message(room_id));

CREATE POLICY IF NOT EXISTS "room_messages_update_owner_or_mod" ON community_room_messages
  FOR UPDATE USING (sender_id = auth.uid() OR public.is_room_moderator(room_id))
  WITH CHECK (sender_id = auth.uid() OR public.is_room_moderator(room_id));

CREATE POLICY IF NOT EXISTS "room_messages_delete_owner_or_mod" ON community_room_messages
  FOR DELETE USING (sender_id = auth.uid() OR public.is_room_moderator(room_id));

CREATE POLICY IF NOT EXISTS "room_reactions_select_visible" ON community_room_reactions FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "room_reactions_insert_self" ON community_room_reactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "room_reactions_delete_self" ON community_room_reactions FOR DELETE USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "room_roles_select_visible" ON community_room_roles FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "room_roles_manage_mods" ON community_room_roles FOR ALL USING (public.is_room_moderator(room_id)) WITH CHECK (public.is_room_moderator(room_id));

CREATE POLICY IF NOT EXISTS "room_reports_insert_self" ON community_room_reports FOR INSERT WITH CHECK (reporter_id = auth.uid());
CREATE POLICY IF NOT EXISTS "room_reports_select_mods" ON community_room_reports FOR SELECT USING (public.is_room_moderator(room_id) OR reporter_id = auth.uid());
CREATE POLICY IF NOT EXISTS "room_reports_update_mods" ON community_room_reports FOR UPDATE USING (public.is_room_moderator(room_id));

CREATE POLICY IF NOT EXISTS "room_warnings_select_mods_or_self" ON community_room_warnings FOR SELECT USING (public.is_room_moderator(room_id) OR user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "room_warnings_insert_mods" ON community_room_warnings FOR INSERT WITH CHECK (public.is_room_moderator(room_id) AND moderator_id = auth.uid());

CREATE POLICY IF NOT EXISTS "room_mutes_select_mods_or_self" ON community_room_mutes FOR SELECT USING (public.is_room_moderator(room_id) OR user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "room_mutes_insert_mods" ON community_room_mutes FOR INSERT WITH CHECK (public.is_room_moderator(room_id) AND moderator_id = auth.uid());

CREATE POLICY IF NOT EXISTS "room_bans_select_mods_or_self" ON community_room_bans FOR SELECT USING (public.is_room_moderator(room_id) OR user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "room_bans_insert_mods" ON community_room_bans FOR INSERT WITH CHECK (public.is_room_moderator(room_id) AND moderator_id = auth.uid());
CREATE POLICY IF NOT EXISTS "room_bans_update_mods_or_appeal" ON community_room_bans FOR UPDATE USING (public.is_room_moderator(room_id) OR user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "room_actions_select_mods" ON community_room_moderation_actions FOR SELECT USING (public.is_room_moderator(room_id));
CREATE POLICY IF NOT EXISTS "room_actions_insert_mods" ON community_room_moderation_actions FOR INSERT WITH CHECK (public.is_room_moderator(room_id));

-- Tighten member updates for room owners without recursive member-table RLS.
CREATE POLICY IF NOT EXISTS "members_update_room_owner" ON community_room_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM community_rooms r
      WHERE r.id = room_id AND COALESCE(r.created_by, r.host_id) = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_rooms r
      WHERE r.id = room_id AND COALESCE(r.created_by, r.host_id) = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON community_room_messages TO authenticated;
GRANT SELECT, INSERT, DELETE ON community_room_reactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_room_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON community_room_reports TO authenticated;
GRANT SELECT, INSERT ON community_room_warnings TO authenticated;
GRANT SELECT, INSERT ON community_room_mutes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON community_room_bans TO authenticated;
GRANT SELECT, INSERT ON community_room_moderation_actions TO authenticated;
