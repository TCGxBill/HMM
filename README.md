# PAIC Live Scoreboard (Supabase Edition)

A modern, real-time web application designed to display a live scoreboard for programming contests, styled after the International Collegiate Programming Contest (ICPC). This version is powered by **Supabase** for its backend, authentication, and real-time database capabilities. It includes an integrated Gemini-powered chatbot for assistance, robust admin controls, and a full suite of features for contestants. This application is bilingual, supporting both English and Vietnamese.

## Setup and Installation

Follow these instructions to set up and run the project using Supabase.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [npm](https://www.npmjs.com/)
- A [Supabase](https://supabase.com/) account (free tier is sufficient)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for the one-time Edge Function deployment)

### Supabase Setup

1.  **Create a New Supabase Project:**
    - Go to your [Supabase Dashboard](https://app.supabase.com/) and create a new project.
    - Save your database password somewhere secure.

2.  **Get API Credentials:**
    - In your new project, navigate to **Project Settings** (the gear icon) > **API**.
    - You will need two values from this page:
        - The **Project URL**.
        - The **Project API Key** (the `anon` `public` one).

3.  **Create a Storage Bucket:**
    - In the Supabase dashboard, go to **Storage** (the bucket icon).
    - Click **Create a new bucket**.
    - Name the bucket **`task-keys`**.
    - Make sure the bucket is **NOT** public.
    - Click **Create bucket**.
    - After creation, go to the bucket's policies and create new policies with the following settings to ensure only admins can upload keys:
      - **Policy Name:** `Admin Upload Access`
      - **Allowed operations:** `SELECT`, `INSERT`, `UPDATE`
      - **Target roles:** `authenticated`
      - **WITH CHECK expression:** `(bucket_id = 'task-keys') AND (auth.uid() IN ( SELECT users.id FROM users WHERE (users.role = 'admin'::text) ))`

4.  **Set Up Database Schema and Functions:**
    - Go to the **SQL Editor** in the Supabase dashboard.
    - Click **+ New query**.
    - Copy the **entire contents** of the SQL script below and paste it into the query window.
    - Click **RUN**. This single script will create your tables, enable real-time updates, set up security policies, and create the necessary server-side functions.

    ```sql
    -- ================================================================================================
    -- PAIC LIVE SCOREBOARD - COMPLETE SUPABASE SETUP SCRIPT
    -- Version: 1.5
    -- Description: This version refactors the key upload mechanism for performance. The `upsert_task_key`
    --              RPC function is removed in favor of a new Edge Function triggered by Supabase Storage.
    -- ================================================================================================

    -- 1. USERS TABLE for public profile information
    CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'contestant')),
        team_name VARCHAR(255) UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

    -- 2. SUBMISSIONS TABLE
    CREATE TABLE IF NOT EXISTS public.submissions (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        task_id VARCHAR(50) NOT NULL,
        best_score NUMERIC(5, 2) DEFAULT 0,
        history JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, task_id)
    );
    ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
    
    -- 3. TASK KEYS TABLE
    -- Securely stores answer key data. Now populated by an Edge Function.
    CREATE TABLE IF NOT EXISTS public.task_keys (
        task_id TEXT PRIMARY KEY,
        key_data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    ALTER TABLE public.task_keys ENABLE ROW LEVEL SECURITY;

    -- 4. RLS POLICIES (Row Level Security)
    -- USERS
    CREATE POLICY "Allow public read access to users" ON public.users FOR SELECT USING (true);
    CREATE POLICY "Allow users to insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
    -- SUBMISSIONS
    CREATE POLICY "Allow public read access to submissions" ON public.submissions FOR SELECT USING (true);
    -- TASK_KEYS (VERY RESTRICTIVE)
    -- This policy is now primarily for the Edge Function (running with service_role) and admin checks.
    CREATE POLICY "Allow admins to manage task keys" ON public.task_keys FOR ALL
        USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'))
        WITH CHECK (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));


    -- 5. REALTIME SETUP
    -- Enable real-time updates for relevant tables.
    DO $$
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.users, public.submissions, public.task_keys;
    EXCEPTION
      WHEN duplicate_object THEN
        -- Publication already exists, do nothing.
    END $$;

    -- 6. SERVER-SIDE FUNCTIONS (RPC)

    -- GET_SCOREBOARD: Securely gets the full scoreboard data with tie-breaking logic.
    CREATE OR REPLACE FUNCTION public.get_scoreboard()
    RETURNS TABLE (
        id UUID,
        "teamName" TEXT,
        "totalScore" NUMERIC,
        solved BIGINT,
        submissions JSON,
        "lastSolveTimestamp" BIGINT
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
        RETURN QUERY
        WITH team_scores AS (
            SELECT
                u.id,
                u.team_name,
                COALESCE(SUM(s.best_score), 0) as total_score,
                COALESCE(COUNT(s.id) FILTER (WHERE s.best_score > 0), 0) as solved_count,
                MAX((SELECT (elem->>'timestamp')::BIGINT FROM jsonb_array_elements(s.history) AS elem WHERE (elem->>'score')::NUMERIC = s.best_score ORDER BY (elem->>'timestamp')::BIGINT ASC LIMIT 1)) AS last_solve_timestamp
            FROM public.users u
            LEFT JOIN public.submissions s ON u.id = s.user_id
            WHERE u.role = 'contestant'
            GROUP BY u.id
        ),
        team_submissions AS (
            SELECT
                s.user_id,
                json_agg(json_build_object('taskId', s.task_id, 'score', s.best_score, 'attempts', jsonb_array_length(s.history), 'history', s.history)) AS submissions_json
            FROM public.submissions s
            GROUP BY s.user_id
        )
        SELECT
            ts.id,
            ts.team_name::text AS "teamName",
            ts.total_score AS "totalScore",
            ts.solved_count AS solved,
            COALESCE(sub.submissions_json, '[]'::json) AS submissions,
            ts.last_solve_timestamp as "lastSolveTimestamp"
        FROM team_scores ts
        LEFT JOIN team_submissions sub ON ts.id = sub.user_id
        ORDER BY "totalScore" DESC, "lastSolveTimestamp" ASC NULLS LAST;
    END;
    $$;

    -- SUBMIT_SOLUTION (REMAINS THE SAME)
    -- This function reads pre-parsed data from task_keys, so it remains fast.
    CREATE OR REPLACE FUNCTION public.submit_solution(p_user_id UUID, p_task_id TEXT, p_submission_data JSONB)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
        v_key_data JSONB;
        v_score NUMERIC;
        v_correct_predictions INT := 0;
        v_total_rows INT;
        v_submission_row JSONB;
        v_key_row JSONB;
        v_new_attempt JSONB;
    BEGIN
        -- Fetch the answer key (SECURITY DEFINER context allows this)
        SELECT tk.key_data INTO v_key_data FROM public.task_keys tk WHERE tk.task_id = p_task_id;

        IF v_key_data IS NULL THEN
            RAISE EXCEPTION 'The answer key for task % has not been set.', p_task_id;
        END IF;

        IF jsonb_array_length(p_submission_data) <> jsonb_array_length(v_key_data) THEN
            RAISE EXCEPTION 'Submission has % data rows, but answer key has %. Row counts must match.', jsonb_array_length(p_submission_data), jsonb_array_length(v_key_data);
        END IF;
        
        v_total_rows := jsonb_array_length(v_key_data);
        IF v_total_rows = 0 THEN
            v_score := 0;
        ELSE
            FOR i IN 0..v_total_rows - 1 LOOP
                v_submission_row := p_submission_data -> i;
                v_key_row := v_key_data -> i;
                IF (v_submission_row ->> 2) = (v_key_row ->> 2) THEN
                    v_correct_predictions := v_correct_predictions + 1;
                END IF;
            END LOOP;
            v_score := (v_correct_predictions::NUMERIC / v_total_rows::NUMERIC) * 100;
        END IF;

        v_new_attempt := jsonb_build_object('score', v_score, 'timestamp', (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT);

        INSERT INTO submissions (user_id, task_id, best_score, history)
        VALUES (p_user_id, p_task_id, v_score, jsonb_build_array(v_new_attempt))
        ON CONFLICT (user_id, task_id) DO UPDATE 
        SET 
            best_score = GREATEST(submissions.best_score, v_score),
            history = submissions.history || v_new_attempt,
            updated_at = NOW();
    END;
    $$;

    -- DELETE_TASK_KEY: For admins to delete a key when a task is deleted.
    CREATE OR REPLACE FUNCTION public.delete_task_key(p_task_id TEXT)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    BEGIN
        IF (SELECT role FROM public.users WHERE id = auth.uid()) <> 'admin' THEN
            RAISE EXCEPTION 'Permission denied: Only admins can manage task keys.';
        END IF;
        DELETE FROM public.task_keys WHERE task_id = p_task_id;
    END;
    $$;
    
    -- GET_UPLOADED_TASK_KEYS: For admin UI to check status without exposing key data.
    CREATE OR REPLACE FUNCTION public.get_uploaded_task_keys()
    RETURNS TABLE (task_id TEXT)
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    BEGIN
        IF (SELECT role FROM public.users WHERE id = auth.uid()) <> 'admin' THEN
            RAISE EXCEPTION 'Permission denied.';
        END IF;
        RETURN QUERY SELECT tk.task_id FROM public.task_keys tk;
    END;
    $$;

    -- DELETE_TEAM: Allows an admin to PERMANENTLY delete a team.
    CREATE OR REPLACE FUNCTION public.delete_team(p_user_id UUID)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    BEGIN
        IF (SELECT role FROM public.users WHERE id = auth.uid()) <> 'admin' THEN
            RAISE EXCEPTION 'You do not have permission to delete a team.';
        END IF;
        PERFORM auth.admin_delete_user(p_user_id);
    END;
    $$;

    -- CLEANUP_ORPHAN_AUTH_USERS: Maintenance function for admins.
    CREATE OR REPLACE FUNCTION public.cleanup_orphan_auth_users()
    RETURNS TABLE (deleted_user_id UUID, status TEXT)
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
        orphan_id UUID;
    BEGIN
        IF (SELECT role FROM public.users WHERE id = auth.uid()) <> 'admin' THEN
            RAISE EXCEPTION 'You do not have permission to perform this action.';
        END IF;
        FOR orphan_id IN SELECT id FROM auth.users WHERE id NOT IN (SELECT id FROM public.users) LOOP
            PERFORM auth.admin_delete_user(orphan_id);
            RETURN QUERY SELECT orphan_id, 'deleted';
        END LOOP;
    END;
    $$;

    -- 7. TRIGGER FOR AUTOMATIC PROFILE CREATION
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    BEGIN
        INSERT INTO public.users (id, username, email, role, team_name)
        VALUES (new.id, new.raw_user_meta_data->>'username', new.email, new.raw_user_meta_data->>'role', new.raw_user_meta_data->>'team_name');
        RETURN new;
    END;
    $$;
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

    -- 8. STORAGE-BASED TRIGGER FOR PROCESSING TASK KEYS (NEW)
    -- This function will be called by our Edge Function, not a traditional DB trigger.
    CREATE OR REPLACE FUNCTION public.internal_upsert_task_key(p_task_id TEXT, p_key_data JSONB)
    RETURNS void
    LANGUAGE plpgsql
    AS $$
    BEGIN
        INSERT INTO public.task_keys(task_id, key_data, updated_at)
        VALUES(p_task_id, p_key_data, NOW())
        ON CONFLICT (task_id) DO UPDATE
        SET key_data = p_key_data, updated_at = NOW();
    END;
    $$;
    ```
    
5.  **Optional: Disable Email Confirmation**
    - In your Supabase project, navigate to **Authentication** > **Providers**.
    - Click on **Email**.
    - Toggle off the **Confirm email** setting.

### Edge Function Setup (One-Time Task)

To handle answer key processing efficiently without slowing down the app, we use a server-side Edge Function.

1.  **Initialize Supabase locally:**
    - Open your terminal in the project's root directory.
    - Log in to the Supabase CLI: `supabase login`
    - Link your local project to your remote Supabase project: `supabase link --project-ref YOUR_PROJECT_ID` (Replace `YOUR_PROJECT_ID` with the ID from your Supabase project's URL).

2.  **Create the Edge Function:**
    - Create the necessary folders: `mkdir -p supabase/functions/process-key-upload`
    - Create a new file named `supabase/functions/process-key-upload/index.ts`.
    - Paste the following code into the new file:

    ```typescript
    import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

    // Helper function to parse CSV content
    const parseCSV = (csvString: string): string[][] => {
        // (Full parsing logic as in scoringService.ts)
        if (!csvString) return [];
        const rows: string[][] = [];
        let currentRow: string[] = [];
        let currentField = '';
        let inQuotes = false;
        const normalizedCsv = csvString.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
        for (let i = 0; i < normalizedCsv.length; i++) {
            const char = normalizedCsv[i];
            if (inQuotes) {
                if (char === '"') {
                    if (i + 1 < normalizedCsv.length && normalizedCsv[i + 1] === '"') {
                        currentField += '"';
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    currentField += char;
                }
            } else {
                switch (char) {
                    case ',':
                        currentRow.push(currentField);
                        currentField = '';
                        break;
                    case '\n':
                        currentRow.push(currentField);
                        rows.push(currentRow);
                        currentRow = [];
                        currentField = '';
                        break;
                    case '"':
                        if (currentField.length === 0) {
                            inQuotes = true;
                        } else {
                            currentField += char;
                        }
                        break;
                    default:
                        currentField += char;
                }
            }
        }
        if (currentRow.length > 0 || currentField.length > 0) {
            currentRow.push(currentField);
            rows.push(currentRow);
        }
        return rows;
    };
    
    // Main function to handle the request
    Deno.serve(async (req) => {
      try {
        const { record } = await req.json();
        
        // This function should be triggered by a storage update, but for robustness,
        // we check if we have a record to process.
        if (!record || !record.name) {
          throw new Error("Invalid request payload. Expected storage object record.");
        }

        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const filePath = record.name;
        const taskId = filePath.split('.')[0];

        // Download the file from storage
        const { data: file, error: downloadError } = await supabaseAdmin.storage
          .from('task-keys')
          .download(filePath);

        if (downloadError) throw downloadError;

        const csvContent = await file.text();
        const rows = parseCSV(csvContent);
        
        const startIndex = rows.length > 0 && rows[0][0].toLowerCase() === 'category_id' ? 1 : 0;
        const keyData = rows.slice(startIndex);
        
        if (keyData.some(row => row.length < 3)) {
            throw new Error("Malformed key file. Expected 'category_id,content,overall_band_score'.");
        }

        // Use the internal RPC function to upsert the parsed key
        const { error: rpcError } = await supabaseAdmin.rpc('internal_upsert_task_key', {
          p_task_id: taskId,
          p_key_data: keyData,
        });

        if (rpcError) throw rpcError;

        return new Response(JSON.stringify({ message: `Successfully processed key for ${taskId}` }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        });
      }
    });
    ```
3.  **Deploy the Function:**
    - From your terminal in the project root, run:
      `supabase functions deploy process-key-upload --no-verify-jwt`
    - This command uploads and deploys your function.

4.  **Create a Webhook to Trigger the Function:**
    - In your Supabase dashboard, go to **Database** > **Webhooks**.
    - Click **Create a new webhook**.
    - **Name:** `Process Uploaded Key`
    - **Table:** `objects` (from the `storage` schema)
    - **Events:** Check **`INSERT`**.
    - **HTTP Request:**
        - **URL:** `YOUR_SUPABASE_PROJECT_URL/functions/v1/process-key-upload`
        - **HTTP Method:** `POST`
    - Click **Create webhook**.

### Frontend Setup

1.  **Configure Environment Variables:**
    - In the project's **root** directory, create a new file named `.env`.
    - Add the Supabase URL, Key, and your Gemini API Key.
      ```env
      VITE_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
      VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
      VITE_API_KEY="YOUR_GEMINI_API_KEY"
      ```

2.  **Install Dependencies & Run:**
    - `npm install`
    - `npm run dev`

## Features

- **Blazing Fast Uploads**: Answer keys are now uploaded directly to optimized storage, making the process feel instant for admins.
- **Live Scoreboard**: Powered by Supabase Realtime.
- **Multi-Language Support**: English and Vietnamese.
- **Role-Based Authentication**: Secure login/registration.
- **Admin & Contestant Panels**: Full suite of features with server-side scoring.
- **Gemini AI Integration**: Chatbot and performance analysis.
- **Data Visualization**: Charts and stats bars.
- **Modern UI/UX**: Responsive dark theme.
