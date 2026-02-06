-- Create table to track collected cups
CREATE TABLE IF NOT EXISTS public.user_collected_cups (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    week_index integer NOT NULL, -- 0 to 15 (for 16 weeks)
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_collected_cups_pkey PRIMARY KEY (id),
    CONSTRAINT user_collected_cups_user_week_unique UNIQUE (user_id, week_index)
);

-- Enable RLS
ALTER TABLE public.user_collected_cups ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own cups" 
    ON public.user_collected_cups FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cups" 
    ON public.user_collected_cups FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- RPC to get total cups for a user (optional, but convenient for UI)
CREATE OR REPLACE FUNCTION get_user_total_cups(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT count(*)::integer FROM user_collected_cups WHERE user_id = p_user_id;
$$;

-- Grant permissions (adjust based on your roles)
GRANT SELECT, INSERT ON public.user_collected_cups TO authenticated;
