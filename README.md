# PAIC Live Scoreboard (Supabase Edition)

A modern, real-time web application designed to display a live scoreboard for programming contests, styled after the International Collegiate Programming Contest (ICPC). This version is powered by **Supabase** for its backend, authentication, and real-time database capabilities. It includes an integrated Gemini-powered chatbot for assistance, robust admin controls, and a full suite of features for contestants. This application is bilingual, supporting both English and Vietnamese.

## Setup and Installation

Follow these instructions to set up and run the project using Supabase.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [npm](https://www.npmjs.com/)
- A [Supabase](https://supabase.com/) account (free tier is sufficient)

### Supabase Setup

1.  **Create a New Supabase Project:**
    - Go to your [Supabase Dashboard](https://app.supabase.com/) and create a new project.
    - Save your database password somewhere secure.

2.  **Get API Credentials:**
    - In your new project, navigate to **Project Settings** (the gear icon) > **API**.
    - You will need two values from this page:
        - The **Project URL**.
        - The **Project API Key** (the `anon` `public` one).

3.  **Set Up Database Schema and Functions:**
    - Go to the **SQL Editor** in the Supabase dashboard.
    - Click **+ New query**.
    - Copy the **entire contents** of the SQL script below and paste it into the query window.
    - Click **RUN**. This single script will create your tables, enable real-time updates, set up security policies, and create the necessary server-side functions.

    ```sql
    -- ================================================================================================
    -- PAIC LIVE SCOREBOARD - COMPLETE SUPABASE SETUP SCRIPT
    -- Version: 1.3
    -- Description: This script sets up all necessary tables, policies, real-time replication,
    --              and robust server-side functions for user creation, deletion, and cleanup.
    --              Includes tie-breaking logic in scoreboard ranking.
    -- ================================================================================================

    -- 1. USERS TABLE for public profile information
    -- Stores non-sensitive user data linked to the master auth.users table.
    CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'contestant')),
        team_name VARCHAR(255) UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    -- Enable Row Level Security
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

    -- 2. SUBMISSIONS TABLE
    -- Stores all submission data for each user/task.
    CREATE TABLE IF NOT EXISTS public.submissions (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        task_id VARCHAR(50) NOT NULL,
        best_score NUMERIC(5, 2) DEFAULT 0,
        history JSONB, -- Stores an array of all attempts: [{ "score": 85.5, "timestamp": "..." }]
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, task_id)
    );
    -- Enable Row Level Security
    ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

    -- 3. RLS POLICIES (Row Level Security)
    -- Defines who can access or modify the data.
    CREATE POLICY "Allow public read access to users" ON public.users FOR SELECT USING (true);
    CREATE POLICY "Allow users to insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
    CREATE POLICY "Allow public read access to submissions" ON public.submissions FOR SELECT USING (true);
    -- Note: Direct insert/update policies for submissions are not needed as we use a secure RPC function.

    -- 4. REALTIME SETUP
    -- Enable real-time updates for the 'users' and 'submissions' tables.
    DO $$
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.users, public.submissions;
    EXCEPTION
      WHEN duplicate_object THEN
        -- Publication already exists, do nothing.
    END $$;

    -- 5. SERVER-SIDE FUNCTIONS (RPC)

    -- GET_SCOREBOARD: Securely gets the full scoreboard data with tie-breaking logic.
    CREATE OR REPLACE FUNCTION public.get_scoreboard()
    RETURNS TABLE (
        id UUID,
        "teamName" TEXT,
        "totalScore" NUMERIC,
        solved BIGINT,
        submissions JSON,
        "lastSolveTimestamp" BIGINT -- For tie-breaking
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
        RETURN QUERY
        WITH team_scores AS (
            -- Step 1: Calculate total score, solved count, and last solve time for each team
            SELECT
                u.id,
                u.team_name,
                COALESCE(SUM(s.best_score), 0) as total_score,
                COALESCE(COUNT(s.id) FILTER (WHERE s.best_score > 0), 0) as solved_count,
                MAX(
                    -- This subquery finds the timestamp of the FIRST attempt that achieved the best score for a task
                    (
                        SELECT (elem->>'timestamp')::BIGINT
                        FROM jsonb_array_elements(s.history) AS elem
                        WHERE (elem->>'score')::NUMERIC = s.best_score
                        ORDER BY (elem->>'timestamp')::BIGINT ASC
                        LIMIT 1
                    )
                ) AS last_solve_timestamp
            FROM
                public.users u
            LEFT JOIN
                public.submissions s ON u.id = s.user_id
            WHERE
                u.role = 'contestant'
            GROUP BY
                u.id
        ),
        team_submissions AS (
            -- Step 2: Aggregate submission details for JSON output
            SELECT
                s.user_id,
                json_agg(json_build_object(
                    'taskId', s.task_id,
                    'score', s.best_score,
                    'attempts', jsonb_array_length(s.history),
                    'history', s.history
                )) AS submissions_json
            FROM
                public.submissions s
            GROUP BY
                s.user_id
        )
        -- Step 3: Join everything and order with tie-breaking
        SELECT
            ts.id,
            ts.team_name::text AS "teamName",
            ts.total_score AS "totalScore",
            ts.solved_count AS solved,
            COALESCE(sub.submissions_json, '[]'::json) AS submissions,
            ts.last_solve_timestamp as "lastSolveTimestamp"
        FROM
            team_scores ts
        LEFT JOIN
            team_submissions sub ON ts.id = sub.user_id
        ORDER BY
            "totalScore" DESC,
            "lastSolveTimestamp" ASC NULLS LAST;
    END;
    $$;

    -- SUBMIT_SOLUTION: Securely handles a new submission.
    CREATE OR REPLACE FUNCTION public.submit_solution(p_user_id UUID, p_task_id TEXT, p_attempt JSONB)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    BEGIN
        INSERT INTO submissions (user_id, task_id, best_score, history)
        VALUES (p_user_id, p_task_id, (p_attempt->>'score')::NUMERIC, jsonb_build_array(p_attempt))
        ON CONFLICT (user_id, task_id) DO UPDATE 
        SET 
            best_score = GREATEST(submissions.best_score, (p_attempt->>'score')::NUMERIC),
            history = submissions.history || p_attempt,
            updated_at = NOW();
    END;
    $$;
    
    -- DELETE_TEAM: Allows an admin to PERMANENTLY delete a team and free up their email.
    CREATE OR REPLACE FUNCTION public.delete_team(p_user_id UUID)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
        requesting_user_role TEXT;
    BEGIN
        -- Verify the calling user IS an admin from our public.users table.
        SELECT role INTO requesting_user_role FROM public.users WHERE id = auth.uid();
        IF requesting_user_role <> 'admin' THEN
            RAISE EXCEPTION 'You do not have permission to delete a team.';
        END IF;

        -- If the check passes, proceed with permanent deletion from the auth schema.
        -- This function PERMANENTLY deletes the user and all their data (due to CASCADE), allowing the email to be reused.
        PERFORM auth.admin_delete_user(p_user_id);
    END;
    $$;

    -- CLEANUP_ORPHAN_AUTH_USERS: A maintenance function for admins to remove stuck accounts.
    -- This finds users in `auth.users` that do not have a corresponding profile in `public.users`
    -- (usually from a failed registration) and purges them.
    CREATE OR REPLACE FUNCTION public.cleanup_orphan_auth_users()
    RETURNS TABLE (deleted_user_id UUID, status TEXT)
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
        requesting_user_role TEXT;
        orphan_id UUID;
    BEGIN
        -- Verify the calling user IS an admin.
        SELECT role INTO requesting_user_role FROM public.users WHERE id = auth.uid();
        IF requesting_user_role <> 'admin' THEN
            RAISE EXCEPTION 'You do not have permission to perform this action.';
        END IF;

        -- Find and delete orphans
        FOR orphan_id IN
            SELECT id FROM auth.users WHERE id NOT IN (SELECT id FROM public.users)
        LOOP
            PERFORM auth.admin_delete_user(orphan_id);
            RETURN QUERY SELECT orphan_id, 'deleted';
        END LOOP;
    END;
    $$;

    -- 6. TRIGGER FOR AUTOMATIC PROFILE CREATION
    -- This function automatically creates a user profile upon registration.
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    BEGIN
        INSERT INTO public.users (id, username, email, role, team_name)
        VALUES (
            new.id,
            new.raw_user_meta_data->>'username',
            new.email,
            new.raw_user_meta_data->>'role',
            new.raw_user_meta_data->>'team_name'
        );
        RETURN new;
    END;
    $$;

    -- This trigger calls the function after a user signs up.
    -- Drop the trigger if it exists to ensure it's fresh
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    ```
    
4.  **Optional: Disable Email Confirmation**
    For a smoother experience during a time-limited contest, you may want to disable email confirmation so users can log in immediately after registering.
    - In your Supabase project, navigate to **Authentication** > **Providers**.
    - Click on **Email**.
    - Toggle off the **Confirm email** setting.
    - **Note:** Disabling this is less secure. For a real-world application, it's recommended to keep email confirmation enabled.


### Frontend Setup

1.  **Configure Environment Variables:**
    - In the project's **root** directory, create a new file named `.env`.
    - Add the Supabase URL, Key, and your Gemini API Key. **The `VITE_` prefix is important!**
      ```env
      VITE_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
      VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
      VITE_API_KEY="YOUR_GEMINI_API_KEY"
      ```
    - Replace the placeholder values with your actual credentials.

2.  **Install Dependencies & Run:**
    - Open your terminal in the project's **root** directory.
    - Install the necessary packages:
      ```bash
      npm install
      ```
    - Start the development server:
      ```bash
      npm run dev
      ```
    - The application will now be running, typically at `http://localhost:5173`, and will connect to your Supabase project for all backend operations.

## Features

- **Live Scoreboard**: Powered by Supabase Realtime, the scoreboard instantly updates and ranks teams. The top three teams are highlighted.
- **Multi-Language Support**: Seamlessly switch between English and Vietnamese.
- **Role-Based Authentication**: Secure login and registration flows via Supabase Auth.
- **Contestant Panel**:
    - Submit solutions by uploading CSV files.
    - View a detailed submission history for each task.
- **Admin Panel**:
    - **Contest Control**: Start, pause ('Live'), or end the contest.
    - **Task Management**: Dynamically add or delete contest tasks.
    - **Answer Key Management**: Upload answer keys and control their scoring visibility.
    - **Team Management**: Delete teams and all their associated data directly from the UI.
- **Gemini AI Integration**:
    - **AI Chatbot**: An assistant for questions about competitive programming.
    - **AI Performance Analysis**: Get an instant, AI-generated performance breakdown for any team.
- **Data Visualization**: Dynamic bar chart for top teams and a stats overview bar.
- **Modern UI/UX**: Responsive dark theme with toast notifications and modals.
- **Data Persistence**: User session and language preference are persisted.

## How to Use

The application's usage remains the same as before. The primary difference is that user registration now creates accounts directly in your Supabase project, which you can manage from the Supabase dashboard under **Authentication**.