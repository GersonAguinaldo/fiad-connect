-- ============ Présidence ============
CREATE TABLE public.presidency_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  assigned_by uuid,
  revoked_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX presidency_single_active ON public.presidency_history (ended_at) WHERE ended_at IS NULL;
GRANT SELECT ON public.presidency_history TO authenticated;
GRANT INSERT, UPDATE ON public.presidency_history TO authenticated;
GRANT ALL ON public.presidency_history TO service_role;
ALTER TABLE public.presidency_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presidency read" ON public.presidency_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "presidency admin write" ON public.presidency_history FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "presidency admin update" ON public.presidency_history FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE TABLE public.presidency_team (
  user_id uuid PRIMARY KEY,
  added_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.presidency_team TO authenticated;
GRANT INSERT, DELETE ON public.presidency_team TO authenticated;
GRANT ALL ON public.presidency_team TO service_role;
ALTER TABLE public.presidency_team ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team read" ON public.presidency_team FOR SELECT TO authenticated USING (true);
CREATE POLICY "team admin insert" ON public.presidency_team FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "team admin delete" ON public.presidency_team FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION private.current_president()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id FROM public.presidency_history WHERE ended_at IS NULL LIMIT 1
$$;

CREATE OR REPLACE FUNCTION private.is_presidency(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.presidency_history WHERE ended_at IS NULL AND user_id = _uid)
      OR EXISTS (SELECT 1 FROM public.presidency_team WHERE user_id = _uid)
$$;

-- ============ Messagerie ============
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('president','direct','group','forum','proximity')),
  title text NOT NULL,
  description text,
  subject text,
  urgency text NOT NULL DEFAULT 'normale' CHECK (urgency IN ('faible','normale','urgente')),
  status text NOT NULL DEFAULT 'en_attente' CHECK (status IN ('en_attente','repondu','clos')),
  city text,
  country text,
  created_by uuid,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'membre',
  subscribed boolean NOT NULL DEFAULT true,
  last_read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  attachment_url text,
  attachment_name text,
  attachment_type text,
  on_behalf_of_presidency boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_idx ON public.messages (conversation_id, created_at);

CREATE OR REPLACE FUNCTION private.is_participant(_conv uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = _conv AND user_id = _uid)
$$;

CREATE OR REPLACE FUNCTION private.conv_kind(_conv uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT kind FROM public.conversations WHERE id = _conv
$$;

CREATE OR REPLACE FUNCTION private.can_read_conv(_conv uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN private.conv_kind(_conv) IN ('forum','proximity') THEN true
    WHEN private.conv_kind(_conv) = 'president' THEN private.is_participant(_conv, _uid) OR private.is_presidency(_uid)
    ELSE private.is_participant(_conv, _uid)
  END
$$;

GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_participants TO authenticated;
GRANT ALL ON public.conversation_participants TO service_role;
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conv read" ON public.conversations FOR SELECT TO authenticated
  USING (kind IN ('forum','proximity') OR private.is_participant(id, auth.uid())
         OR (kind = 'president' AND private.is_presidency(auth.uid()))
         OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "conv create" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid()
    AND (kind IN ('president','direct','group')
         OR ((kind IN ('forum','proximity')) AND (private.has_role(auth.uid(), 'admin') OR private.is_presidency(auth.uid())))));
CREATE POLICY "conv update" ON public.conversations FOR UPDATE TO authenticated
  USING (private.is_participant(id, auth.uid()) OR private.is_presidency(auth.uid()) OR private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.is_participant(id, auth.uid()) OR private.is_presidency(auth.uid()) OR private.has_role(auth.uid(), 'admin'));

CREATE POLICY "part read" ON public.conversation_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.can_read_conv(conversation_id, auth.uid()) OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "part insert" ON public.conversation_participants FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR private.is_participant(conversation_id, auth.uid()) OR private.is_presidency(auth.uid()) OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "part update own" ON public.conversation_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "part delete own" ON public.conversation_participants FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

CREATE POLICY "msg read" ON public.messages FOR SELECT TO authenticated
  USING (private.can_read_conv(conversation_id, auth.uid()) OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "msg insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND private.can_read_conv(conversation_id, auth.uid()));

CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.bump_conversation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations
     SET last_message_at = NEW.created_at,
         status = CASE WHEN kind = 'president' AND NEW.on_behalf_of_presidency THEN 'repondu'
                       WHEN kind = 'president' AND NOT NEW.on_behalf_of_presidency AND status = 'clos' THEN 'en_attente'
                       ELSE status END
   WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER messages_bump AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_conversation();