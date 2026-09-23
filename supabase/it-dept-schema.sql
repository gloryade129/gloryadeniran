-- ============================================================================
-- Information Technology Department (2025â€“2029 Set: 100L -> 200L Transition)
-- Database Architecture & Schema Migration: supabase_schema.sql
-- ============================================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- Table 1: students_profile
-- Stores student directory identity, 100L retrospective, and 200L committee choices
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    matric_no VARCHAR(30) NOT NULL,
    email VARCHAR(255) NOT NULL DEFAULT '',
    phone VARCHAR(25) NOT NULL,
    birthday VARCHAR(50) NOT NULL,
    birth_day SMALLINT NOT NULL CHECK (birth_day BETWEEN 1 AND 31),
    birth_month SMALLINT NOT NULL CHECK (birth_month BETWEEN 1 AND 12),
    tech_track VARCHAR(80) NOT NULL,
    
    -- 100-Level Retrospective
    academic_rating_100l SMALLINT NOT NULL DEFAULT 5 CHECK (academic_rating_100l BETWEEN 1 AND 5),
    favorite_courses TEXT[] NOT NULL DEFAULT '{}'::text[],
    toughest_courses TEXT[] NOT NULL DEFAULT '{}'::text[],
    challenges_100l TEXT[] NOT NULL DEFAULT '{}'::text[],
    
    -- 200-Level Committee Sign-ups & Vision
    committees TEXT[] NOT NULL DEFAULT '{}'::text[],
    suggestions_200l TEXT DEFAULT '',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Case-insensitive & trimmed unique index on matric_no to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_profile_matric_unique 
    ON students_profile (UPPER(TRIM(matric_no)));

-- Performance indexes for analytics and calendar filtering
CREATE INDEX IF NOT EXISTS idx_students_profile_tech_track 
    ON students_profile (tech_track);
CREATE INDEX IF NOT EXISTS idx_students_profile_birthday 
    ON students_profile (birth_month, birth_day);
CREATE INDEX IF NOT EXISTS idx_students_profile_created_at 
    ON students_profile (created_at DESC);

-- ----------------------------------------------------------------------------
-- Table 2: leadership_feedback
-- Stores CR and ACR performance reviews and qualitative critiques
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leadership_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Anonymity decoupling foreign key:
    -- MUST be NULL if is_anonymous is true. Can reference students_profile if false.
    student_id UUID NULL REFERENCES students_profile(id) ON DELETE SET NULL,
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    
    -- Class Representative (CR) Evaluation (1 to 5 Stars)
    cr_communication SMALLINT NOT NULL CHECK (cr_communication BETWEEN 1 AND 5),
    cr_materials SMALLINT NOT NULL CHECK (cr_materials BETWEEN 1 AND 5),
    cr_availability SMALLINT NOT NULL CHECK (cr_availability BETWEEN 1 AND 5),
    cr_welfare SMALLINT NOT NULL CHECK (cr_welfare BETWEEN 1 AND 5),
    
    -- Assistant Class Representative (ACR) Evaluation (1 to 5 Stars)
    acr_communication SMALLINT NOT NULL CHECK (acr_communication BETWEEN 1 AND 5),
    acr_materials SMALLINT NOT NULL CHECK (acr_materials BETWEEN 1 AND 5),
    acr_availability SMALLINT NOT NULL CHECK (acr_availability BETWEEN 1 AND 5),
    acr_welfare SMALLINT NOT NULL CHECK (acr_welfare BETWEEN 1 AND 5),
    
    -- Stored computed composite score (average across all 8 metrics)
    overall_score NUMERIC(3,2) GENERATED ALWAYS AS (
        ROUND((
            cr_communication + cr_materials + cr_availability + cr_welfare +
            acr_communication + acr_materials + acr_availability + acr_welfare
        )::numeric / 8.0, 2)
    ) STORED,
    
    -- Constructive Qualitative Feedback
    well_done TEXT NOT NULL DEFAULT '',
    critical_areas TEXT NOT NULL DEFAULT '',
    
    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    
    -- Cryptographic & Architectural Anonymity Constraint:
    -- When is_anonymous is TRUE, student_id MUST be NULL.
    CONSTRAINT chk_anonymity_integrity CHECK (
        (is_anonymous = TRUE AND student_id IS NULL) OR 
        (is_anonymous = FALSE)
    )
);

-- Performance indexes for leadership feedback queries
CREATE INDEX IF NOT EXISTS idx_leadership_feedback_is_anon 
    ON leadership_feedback (is_anonymous);
CREATE INDEX IF NOT EXISTS idx_leadership_feedback_created_at 
    ON leadership_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leadership_feedback_student_id 
    ON leadership_feedback (student_id);

-- ----------------------------------------------------------------------------
-- Row Level Security (RLS) Enablement & Policies
-- ----------------------------------------------------------------------------

ALTER TABLE students_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadership_feedback ENABLE ROW LEVEL SECURITY;

-- 1. Public Anonymous Insert Policies (Scholars can submit their survey)
CREATE POLICY "Allow public anonymous insert to students_profile"
    ON students_profile
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Allow public anonymous insert to leadership_feedback"
    ON leadership_feedback
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- 2. Authenticated / Service Role Read Policies (Admins only)
CREATE POLICY "Allow authenticated read on students_profile"
    ON students_profile
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated read on leadership_feedback"
    ON leadership_feedback
    FOR SELECT
    TO authenticated
    USING (true);

-- ----------------------------------------------------------------------------
-- Remote Procedure Calls (RPCs)
-- ----------------------------------------------------------------------------

-- Function 1: Check if a matric number already exists (Zero-data leak pre-check)
CREATE OR REPLACE FUNCTION check_matric_registered(p_matric_no TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM students_profile
        WHERE UPPER(TRIM(matric_no)) = UPPER(TRIM(p_matric_no))
    );
END;
$$;

GRANT EXECUTE ON FUNCTION check_matric_registered(TEXT) TO anon, authenticated;

-- Function 2: Fetch Admin Analytics & Records via Secret Passcode Verification
-- Provides PIN-based admin access without exposing direct table SELECTs to anon
CREATE OR REPLACE FUNCTION get_admin_dashboard_data(input_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_pin TEXT := '2025';
    data_output JSONB;
BEGIN
    IF input_pin IS NULL OR input_pin <> admin_pin THEN
        RAISE EXCEPTION 'Unauthorized: Invalid Admin Access PIN';
    END IF;

    SELECT jsonb_build_object(
        'profiles', (
            SELECT COALESCE(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
            FROM (
                SELECT 
                    id,
                    full_name AS "fullName",
                    matric_no AS "matricNo",
                    phone,
                    birthday AS "birthdayString",
                    birth_day AS "birthDay",
                    birth_month AS "birthMonth",
                    tech_track AS "techTrack",
                    academic_rating_100l AS "academicRating100L",
                    favorite_courses AS "favoriteCourses",
                    toughest_courses AS "toughestCourses",
                    challenges_100l AS "challenges100L",
                    committees,
                    suggestions_200l AS "suggestions200L",
                    created_at AS "createdAt"
                FROM students_profile 
                ORDER BY created_at DESC
            ) s
        ),
        'feedbacks', (
            SELECT COALESCE(jsonb_agg(to_jsonb(f)), '[]'::jsonb)
            FROM (
                SELECT 
                    lf.id,
                    lf.student_id AS "studentId",
                    CASE 
                        WHEN lf.is_anonymous THEN NULL 
                        ELSE sp.full_name 
                    END AS "studentName",
                    CASE 
                        WHEN lf.is_anonymous THEN NULL 
                        ELSE sp.matric_no 
                    END AS "studentMatric",
                    lf.is_anonymous AS "isAnonymous",
                    lf.cr_communication AS "crCommunication",
                    lf.cr_materials AS "crMaterials",
                    lf.cr_availability AS "crAvailability",
                    lf.cr_welfare AS "crWelfare",
                    lf.acr_communication AS "acrCommunication",
                    lf.acr_materials AS "acrMaterials",
                    lf.acr_availability AS "acrAvailability",
                    lf.acr_welfare AS "acrWelfare",
                    lf.overall_score AS "overallScore",
                    lf.well_done AS "wellDone",
                    lf.critical_areas AS "criticalAreas",
                    lf.created_at AS "createdAt"
                FROM leadership_feedback lf
                LEFT JOIN students_profile sp ON lf.student_id = sp.id
                ORDER BY lf.created_at DESC
            ) f
        )
    ) INTO data_output;

    RETURN data_output;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_dashboard_data(TEXT) TO anon, authenticated;

