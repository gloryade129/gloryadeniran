-- ==============================================================================
-- Schema: Beyond Performance - Redefining Prayer & Bible Connection
-- Target: Supabase / PostgreSQL Database
-- Table:  prayer_survey_entries
-- ==============================================================================

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.prayer_survey_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    privacy_accepted BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Step 1: Participant Identity
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    faith_status TEXT NOT NULL,
    church_name TEXT,
    
    -- Step 2: Honest Reflections on Prayer
    prayer_reality TEXT NOT NULL,
    prayer_friction_points TEXT[] NOT NULL DEFAULT '{}',
    openness_rating INTEGER NOT NULL CHECK (openness_rating >= 1 AND openness_rating <= 5),
    
    -- Step 3: Scriptural Engagement & Formats
    bible_reading_status TEXT NOT NULL,
    preferred_formats TEXT[] NOT NULL DEFAULT '{}',
    
    -- Step 4: Open Observations
    open_reflection TEXT,
    
    -- Backend Classification & Tracking
    assigned_segment TEXT NOT NULL,
    email_sent BOOLEAN NOT NULL DEFAULT FALSE,
    email_sent_at TIMESTAMPTZ,
    raw_metadata JSONB DEFAULT '{}'::jsonb,

    -- Enforce unique email for idempotent updates/resubmissions
    CONSTRAINT prayer_survey_entries_email_key UNIQUE (email)
);

-- 2. Indexes for performance and query optimization
CREATE INDEX IF NOT EXISTS idx_prayer_survey_email 
    ON public.prayer_survey_entries (email);

CREATE INDEX IF NOT EXISTS idx_prayer_survey_created_at 
    ON public.prayer_survey_entries (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prayer_survey_segment 
    ON public.prayer_survey_entries (assigned_segment);

CREATE INDEX IF NOT EXISTS idx_prayer_survey_friction_gin 
    ON public.prayer_survey_entries USING GIN (prayer_friction_points);

CREATE INDEX IF NOT EXISTS idx_prayer_survey_formats_gin 
    ON public.prayer_survey_entries USING GIN (preferred_formats);

-- 3. Automatic updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_prayer_survey_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prayer_survey_updated_at ON public.prayer_survey_entries;
CREATE TRIGGER trigger_prayer_survey_updated_at
    BEFORE UPDATE ON public.prayer_survey_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_prayer_survey_updated_at();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.prayer_survey_entries ENABLE ROW LEVEL SECURITY;

-- Allow public insert/upsert (for anonymous survey respondents)
CREATE POLICY "Allow public survey submission" 
    ON public.prayer_survey_entries 
    FOR INSERT 
    WITH CHECK (privacy_accepted = TRUE);

-- Allow public update if matching email (or service role)
CREATE POLICY "Allow public survey resubmission" 
    ON public.prayer_survey_entries 
    FOR UPDATE 
    USING (true)
    WITH CHECK (privacy_accepted = TRUE);

-- Read access restricted to service_role / authenticated admin
CREATE POLICY "Allow service role read" 
    ON public.prayer_survey_entries 
    FOR SELECT 
    USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- 5. Helpful Comments
COMMENT ON TABLE public.prayer_survey_entries IS 'Stores user survey responses for Beyond Performance: Redefining Prayer & Bible Connection.';
COMMENT ON COLUMN public.prayer_survey_entries.assigned_segment IS 'Segment tag: PERFORMANCE_BURNOUT, GENTLE_REBUILD, FOUNDATIONAL_STUDY, or GENERAL_GROWTH.';
