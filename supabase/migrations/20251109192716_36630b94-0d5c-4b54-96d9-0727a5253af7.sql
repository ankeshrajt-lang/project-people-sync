-- Create direct messages table for 1-on-1 chat
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages they sent or received
CREATE POLICY "Users can view their own direct messages"
ON public.direct_messages
FOR SELECT
USING (
  auth.uid() = sender_id OR 
  auth.uid() = receiver_id OR
  is_admin(auth.uid())
);

-- Users can send direct messages
CREATE POLICY "Users can send direct messages"
ON public.direct_messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Users can update messages they received (mark as read)
CREATE POLICY "Users can mark messages as read"
ON public.direct_messages
FOR UPDATE
USING (auth.uid() = receiver_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete their own messages"
ON public.direct_messages
FOR DELETE
USING (auth.uid() = sender_id OR is_admin(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_direct_messages_sender ON public.direct_messages(sender_id);
CREATE INDEX idx_direct_messages_receiver ON public.direct_messages(receiver_id);
CREATE INDEX idx_direct_messages_created_at ON public.direct_messages(created_at DESC);

-- Enable realtime for direct messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;