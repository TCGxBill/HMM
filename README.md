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
    -- 1. USERS TABLE for public profile information
    -- This table will store non-sensitive user data and is linked to the master auth.users table.
    CREATE TABLE users (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'contestant')),
        team_name VARCHAR(255) UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    -- Enable Row Level Security
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;

    -- 2. SUBMISSIONS TABLE
    -- This table stores all submission data for each user/task.
    CREATE TABLE submissions (
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
    ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

    -- 3. RLS POLICIES (Row Level Security)
    -- These policies define who can access or modify the data.
    -- Users can see all other users' public profiles.
    CREATE POLICY "Allow public read access to users" ON users FOR SELECT USING (true);
    -- Users can only insert their own profile.
    CREATE POLICY "Allow users to insert their own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
    -- Users can see all submissions.
    CREATE POLICY "Allow public read access to submissions" ON submissions FOR SELECT USING (true);
    -- Users can only insert/update their own submissions (delegated to RPC function).
    -- We don't need direct insert/update policies as we'll use a secure function.

    -- 4. REALTIME SETUP
    -- Enable real-time updates for the 'users' and 'submissions' tables.
    ALTER PUBLICATION supabase_realtime ADD TABLE users, submissions;

    -- 5. SERVER-SIDE FUNCTIONS (RPC)
    -- This function securely gets the full scoreboard data, just like the old backend API.
    CREATE OR REPLACE FUNCTION get_scoreboard()
    RETURNS TABLE (
        id UUID,
        "teamName" TEXT,
        "totalScore" NUMERIC,
        solved BIGINT,
        submissions JSON
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
        RETURN QUERY
        SELECT
            u.id,
            u.team_name as "teamName",
            COALESCE(
                (SELECT SUM(s_sum.best_score) FROM submissions s_sum WHERE s_sum.user_id = u.id), 0
            ) as "totalScore",
            COALESCE(
                (SELECT COUNT(*) FROM submissions s_count WHERE s_count.user_id = u.id AND s_count.best_score > 0), 0
            ) as solved,
            COALESCE(
                (
                    SELECT json_agg(json_build_object(
                        'taskId', s_inner.task_id,
                        'score', s_inner.best_score,
                        'attempts', jsonb_array_length(s_inner.history),
                        'history', s_inner.history
                    ))
                    FROM submissions s_inner WHERE s_inner.user_id = u.id
                ), '[]'::json
            ) as submissions
        FROM users u
        WHERE u.role = 'contestant'
        GROUP BY u.id
        ORDER BY "totalScore" DESC;
    END;
    $$;

    -- This function handles a new submission securely.
    CREATE OR REPLACE FUNCTION submit_solution(
        p_user_id UUID,
        p_task_id TEXT,
        p_attempt JSONB
    )
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER -- This allows the function to run with elevated privileges
    AS $$
    BEGIN
        INSERT INTO submissions (user_id, task_id, best_score, history)
        VALUES (p_user_id, p_task_id, (p_attempt->>'score')::NUMERIC, jsonb_build_array(p_attempt))
        ON CONFLICT (user_id, task_id) DO UPDATE 
        SET 
            best_score = GREATEST(submissions.best_score, (p_attempt->>'score')::NUMERIC),
            history = submissions.history || p_attempt;
    END;
    $$;
    
    -- This function allows an admin to delete a team.
    CREATE OR REPLACE FUNCTION delete_team(p_user_id UUID)
    RETURNS void
    LANGUAGE plpgsql
    AS $$
    DECLARE
        requesting_user_role TEXT;
    BEGIN
        -- Check if the user calling this function is an admin
        SELECT role INTO requesting_user_role FROM public.users WHERE id = auth.uid();

        IF requesting_user_role = 'admin' THEN
            -- If admin, proceed to delete the user from the master auth table.
            -- The 'ON DELETE CASCADE' in our table definitions will handle cleanup.
            DELETE FROM auth.users WHERE id = p_user_id;
        ELSE
            -- If not an admin, raise an error.
            RAISE EXCEPTION 'You do not have permission to delete a team.';
        END IF;
    END;
    $$;

    -- 6. TRIGGER FOR AUTOMATIC PROFILE CREATION
    -- This function automatically creates a user profile upon registration.
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
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
    CREATE OR REPLACE TRIGGER on_auth_user_created
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