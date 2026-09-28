/*
# Enable Realtime for private rooms (production sync fix)

Private rooms sync between players through Supabase Realtime `postgres_changes`.
Realtime only fires for tables that are members of the `supabase_realtime`
publication — without this, room updates fall back to slow polling and boards
appear "not synced" in production.

This migration is idempotent and safe to run on existing projects.
*/

-- Add chess_private_rooms to the realtime publication (no-op if already there).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chess_private_rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chess_private_rooms;
  END IF;
END $$;

-- Keep updated_at fresh so clients can detect stale rooms reliably.
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chess_private_rooms_touch_updated_at ON public.chess_private_rooms;
CREATE TRIGGER chess_private_rooms_touch_updated_at
  BEFORE UPDATE ON public.chess_private_rooms
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
