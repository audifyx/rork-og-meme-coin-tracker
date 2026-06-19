-- Advanced Token Intelligence Platform Tables

-- Token research notes (community crowdsourced due diligence)
CREATE TABLE IF NOT EXISTS public.token_research_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mint text NOT NULL,
  author uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  author_username text,
  content text NOT NULL,
  category text NOT NULL CHECK (category IN ('flag', 'positive', 'analysis', 'question')),
  upvotes integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_research_notes_mint ON public.token_research_notes(mint);
CREATE INDEX idx_research_notes_author ON public.token_research_notes(author);
CREATE INDEX idx_research_notes_category ON public.token_research_notes(category);

-- Votes on research notes
CREATE TABLE IF NOT EXISTS public.token_research_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.token_research_notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(note_id, user_id)
);

CREATE INDEX idx_research_votes_note ON public.token_research_votes(note_id);
CREATE INDEX idx_research_votes_user ON public.token_research_votes(user_id);

-- Token events timeline
CREATE TABLE IF NOT EXISTS public.token_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mint text NOT NULL,
  event_type text NOT NULL,
  title text NOT NULL,
  description text,
  data jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_token_events_mint ON public.token_events(mint);
CREATE INDEX idx_token_events_type ON public.token_events(event_type);

-- Auto-generated signals
CREATE TABLE IF NOT EXISTS public.token_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mint text NOT NULL,
  signal_type text NOT NULL CHECK (signal_type IN ('danger', 'warning', 'info', 'positive')),
  title text NOT NULL,
  description text,
  severity integer DEFAULT 5,
  data jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_token_signals_mint ON public.token_signals(mint);
CREATE INDEX idx_token_signals_type ON public.token_signals(signal_type);

-- RLS Policies

-- Research notes: Public read, authenticated write
ALTER TABLE public.token_research_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY research_notes_public_read ON public.token_research_notes
  FOR SELECT USING (true);

CREATE POLICY research_notes_insert_own ON public.token_research_notes
  FOR INSERT WITH CHECK (auth.uid() = author);

CREATE POLICY research_notes_update_own ON public.token_research_notes
  FOR UPDATE USING (auth.uid() = author)
  WITH CHECK (auth.uid() = author);

CREATE POLICY research_notes_delete_own ON public.token_research_notes
  FOR DELETE USING (auth.uid() = author);

-- Research votes: authenticated only
ALTER TABLE public.token_research_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY research_votes_insert_own ON public.token_research_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY research_votes_public_read ON public.token_research_votes
  FOR SELECT USING (true);

-- Token events: public read, only backend writes
ALTER TABLE public.token_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY token_events_public_read ON public.token_events
  FOR SELECT USING (true);

-- Token signals: public read
ALTER TABLE public.token_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY token_signals_public_read ON public.token_signals
  FOR SELECT USING (true);
