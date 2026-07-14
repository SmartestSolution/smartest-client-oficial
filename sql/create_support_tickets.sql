-- Run this SQL in Cloud View > Run SQL to create the support_tickets table

CREATE TABLE public.support_tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  category text NOT NULL DEFAULT 'question',
  status text NOT NULL DEFAULT 'open',
  admin_response text,
  responded_at timestamptz,
  responded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets"
ON public.support_tickets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets"
ON public.support_tickets FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins can update tickets"
ON public.support_tickets FOR UPDATE
USING (public.is_admin());

-- Add FK to profiles for joining
ALTER TABLE public.support_tickets
ADD CONSTRAINT support_tickets_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id);
