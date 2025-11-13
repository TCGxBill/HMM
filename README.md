# Bảng điểm trực tiếp PAIC (Phiên bản Supabase)

Một ứng dụng web hiện đại, thời gian thực được thiết kế để hiển thị bảng điểm trực tiếp cho các cuộc thi lập trình, theo phong cách của International Collegiate Programming Contest (ICPC). Phiên bản này sử dụng **Supabase** cho backend, xác thực người dùng và cơ sở dữ liệu thời gian thực. Ứng dụng tích hợp chatbot được hỗ trợ bởi Gemini, cung cấp các công cụ quản lý mạnh mẽ cho admin và đầy đủ tính năng cho thí sinh. Ứng dụng hỗ trợ song ngữ: Tiếng Anh và Tiếng Việt.

## Tính năng chính

- **Tải lên Đáp án Siêu tốc**: File đáp án được tải trực tiếp lên Storage đã được tối ưu, giúp quản trị viên có trải nghiệm tức thì.
- **Bảng điểm Thời gian thực**: Cập nhật trực tiếp bằng Supabase Realtime.
- **Hỗ trợ Đa ngôn ngữ**: Giao diện hoàn chỉnh bằng Tiếng Anh và Tiếng Việt.
- **Xác thực dựa trên Vai trò**: Hệ thống đăng nhập/đăng ký an toàn cho "Thí sinh" và "Quản trị viên".
- **Chấm điểm phía Server**: Toàn bộ logic chấm điểm được thực hiện an toàn trên server-side, không để lộ đáp án ra trình duyệt.
- **Tích hợp Gemini AI**: Bao gồm một chatbot trợ giúp và tính năng phân tích hiệu suất của đội thi.
- **Giao diện Hiện đại**: Giao diện tối (dark theme) đáp ứng tốt trên nhiều thiết bị (responsive).

## Yêu cầu Cài đặt

- [Node.js](https://nodejs.org/) (khuyến nghị phiên bản 18 trở lên)
- [npm](https://www.npmjs.com/)
- Tài khoản [Supabase](https://supabase.com/) (gói miễn phí là đủ)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (cần cho việc cài đặt Edge Function một lần duy nhất)

## Hướng dẫn Cài đặt

Làm theo các bước sau để thiết lập và chạy dự án.

### Phần 1: Cài đặt Frontend

1.  **Cấu hình Biến môi trường:**
    -   Tại thư mục **gốc** của dự án, tạo một tệp mới có tên là `.env`.
    -   Thêm các thông tin Project URL, Khóa API của Supabase và API Key của Gemini vào tệp này. Bạn sẽ lấy các giá trị này ở các bước tiếp theo.

    ```env
    VITE_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
    VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
    VITE_API_KEY="YOUR_GEMINI_API_KEY"
    ```

2.  **Cài đặt Dependencies & Chạy ứng dụng:**
    -   Mở terminal trong thư mục gốc của dự án và chạy:
        ```bash
        npm install
        npm run dev
        ```
    -   Ứng dụng frontend sẽ khởi chạy, nhưng sẽ báo lỗi cho đến khi bạn hoàn thành cài đặt Supabase.

### Phần 2: Cài đặt Supabase Backend

1.  **Tạo một Project Supabase mới:**
    -   Truy cập [Supabase Dashboard](https://app.supabase.com/) và tạo một project mới.
    -   Lưu lại mật khẩu cơ sở dữ liệu của bạn ở một nơi an toàn.

2.  **Lấy API Credentials:**
    -   Trong project vừa tạo, vào **Project Settings** (biểu tượng bánh răng) > **API**.
    -   Lấy hai giá trị sau và điền vào tệp `.env` đã tạo ở Phần 1:
        -   **Project URL**.
        -   **Project API Key** (chọn khóa `anon` `public`).

3.  **Tạo Storage Bucket (Nơi lưu file đáp án):**
    -   Trong dashboard Supabase, vào **Storage** (biểu tượng cái xô).
    -   Nhấp **Create a new bucket**.
    -   Đặt tên bucket là **`task-keys`**. **(QUAN TRỌNG: Tên phải chính xác là 'task-keys')**.
    -   **Bỏ chọn** ô "Public bucket". **(QUAN TRỌNG: Bucket này phải là riêng tư)**.
    -   Nhấp **Create bucket**.
    -   Sau khi tạo xong, vào mục **Policies** của bucket `task-keys` và tạo các policy mới với các thiết lập sau để đảm bảo chỉ admin mới có thể tải lên và đọc file đáp án:
        -   **Policy Name:** `Admin Upload Access`
        -   **Allowed operations:** Chọn `SELECT`, `INSERT`, `UPDATE`.
        -   **Target roles:** Chọn `authenticated`.
        -   **WITH CHECK expression:**
            ```sql
            (bucket_id = 'task-keys'::text) AND (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))
            ```

4.  **Chạy Script SQL Cài đặt Cơ sở dữ liệu:**
    -   Vào **SQL Editor** trong dashboard Supabase.
    -   Nhấp **+ New query**.
    -   **Copy TOÀN BỘ nội dung** của script SQL bên dưới và dán vào cửa sổ query.
    -   Nhấp **RUN**. Script này sẽ tự động tạo các bảng, bật tính năng real-time, thiết lập các quy tắc bảo mật và tạo ra các hàm cần thiết phía server.

    ```sql
    -- ================================================================================================
    -- PAIC LIVE SCOREBOARD - SCRIPT CÀI ĐẶT SUPABASE HOÀN CHỈNH
    -- Phiên bản: 3.0
    -- Mô tả: Thêm bảng `contest_settings` để quản lý trạng thái cuộc thi toàn cục.
    --        Thay thế RPC `reset_contest_tasks` bằng `reset_contest` để dọn dẹp toàn diện.
    -- ================================================================================================

    -- 1. BẢNG USERS cho thông tin công khai
    CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'contestant')),
        team_name VARCHAR(255) UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

    -- 2. BẢNG TASKS
    CREATE TABLE IF NOT EXISTS public.tasks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        key_visibility TEXT NOT NULL DEFAULT 'private' CHECK (key_visibility IN ('public', 'private')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

    -- 3. BẢNG SUBMISSIONS
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
    
    -- 4. BẢNG TASK KEYS
    CREATE TABLE IF NOT EXISTS public.task_keys (
        task_id TEXT PRIMARY KEY,
        key_data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    ALTER TABLE public.task_keys ENABLE ROW LEVEL SECURITY;

    -- 5. BẢNG CONTEST SETTINGS
    CREATE TABLE IF NOT EXISTS public.contest_settings (
        id INT PRIMARY KEY DEFAULT 1,
        contest_status TEXT NOT NULL DEFAULT 'Not Started' CHECK (contest_status IN ('Not Started', 'Live', 'Finished')),
        CONSTRAINT singleton_check CHECK (id = 1)
    );
    ALTER TABLE public.contest_settings ENABLE ROW LEVEL SECURITY;


    -- 6. RLS POLICIES (Quy tắc bảo mật hàng)
    -- USERS
    CREATE POLICY "Allow public read access to users" ON public.users FOR SELECT USING (true);
    CREATE POLICY "Allow users to insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
    -- TASKS
    CREATE POLICY "Allow public read access to tasks" ON public.tasks FOR SELECT USING (true);
    CREATE POLICY "Allow admins to manage tasks" ON public.tasks FOR ALL
        USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'))
        WITH CHECK (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));
    -- SUBMISSIONS
    CREATE POLICY "Allow public read access to submissions" ON public.submissions FOR SELECT USING (true);
    -- TASK_KEYS
    CREATE POLICY "Allow admins to MANAGE keys" ON public.task_keys FOR ALL
        USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'))
        WITH CHECK (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));
    CREATE POLICY "PREVENT non-admins from reading keys" ON public.task_keys FOR SELECT
        USING (false);
    -- CONTEST_SETTINGS
    CREATE POLICY "Allow public read access to settings" ON public.contest_settings FOR SELECT USING (true);
    CREATE POLICY "Allow admins to update settings" ON public.contest_settings FOR UPDATE
        USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'))
        WITH CHECK (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));


    -- 7. CÀI ĐẶT REALTIME
    DO $$
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.users, public.submissions, public.task_keys, public.tasks, public.contest_settings;
    EXCEPTION
      WHEN duplicate_object THEN
        -- Publication đã tồn tại, không làm gì cả.
    END $$;

    -- 8. SEED DATA
    INSERT INTO public.contest_settings (id, contest_status) VALUES (1, 'Not Started') ON CONFLICT (id) DO NOTHING;

    -- 9. CÁC HÀM SERVER-SIDE (RPC)

    -- GET_SCOREBOARD
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

    -- SUBMIT_SOLUTION: Hàm chấm điểm an toàn trên server, trả về điểm số.
    CREATE OR REPLACE FUNCTION public.submit_solution(p_user_id UUID, p_task_id TEXT, p_submission_data JSONB)
    RETURNS NUMERIC
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
        RETURN v_score;
    END;
    $$;

    -- GET_TASKS_WITH_STATUS
    CREATE OR REPLACE FUNCTION public.get_tasks_with_status()
    RETURNS TABLE (
        id TEXT,
        name TEXT,
        "keyVisibility" TEXT,
        "keyUploaded" BOOLEAN
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
        RETURN QUERY
        SELECT
            t.id,
            t.name,
            t.key_visibility AS "keyVisibility",
            EXISTS(SELECT 1 FROM public.task_keys tk WHERE tk.task_id = t.id) AS "keyUploaded"
        FROM
            public.tasks t
        ORDER BY
            t.created_at ASC;
    END;
    $$;
    
    -- DELETE_TASK
    CREATE OR REPLACE FUNCTION public.delete_task(p_task_id TEXT)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    BEGIN
        IF (SELECT role FROM public.users WHERE id = auth.uid()) <> 'admin' THEN
            RAISE EXCEPTION 'Permission denied: Only admins can manage tasks.';
        END IF;
        DELETE FROM public.tasks WHERE id = p_task_id;
        DELETE FROM public.task_keys WHERE task_id = p_task_id;
        PERFORM storage.delete_object('task-keys', p_task_id || '.csv');
    END;
    $$;
    
    -- GET_UPLOADED_TASK_KEYS
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

    -- DELETE_TEAM
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

    -- RESET_CONTEST
    CREATE OR REPLACE FUNCTION public.reset_contest()
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
        object_paths TEXT[];
    BEGIN
        IF (SELECT role FROM public.users WHERE id = auth.uid()) <> 'admin' THEN
            RAISE EXCEPTION 'Permission denied: Only admins can reset the contest.';
        END IF;
        -- Get paths of files in storage to delete them
        SELECT array_agg(tk.task_id || '.csv')
        INTO object_paths
        FROM public.task_keys tk;
        
        -- Clear all contest data
        TRUNCATE public.tasks, public.task_keys, public.submissions RESTART IDENTITY;
        
        -- Delete files from storage
        IF array_length(object_paths, 1) > 0 THEN
            PERFORM storage.delete_objects('task-keys', object_paths);
        END IF;

        -- Reset contest status
        UPDATE public.contest_settings SET contest_status = 'Not Started' WHERE id = 1;
    END;
    $$;

    -- CLEANUP_ORPHAN_AUTH_USERS
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

    -- 10. TRIGGER TỰ ĐỘNG TẠO PROFILE
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

    -- 11. HÀM NỘI BỘ CHO EDGE FUNCTION
    CREATE OR REPLACE FUNCTION public.internal_upsert_task_key(p_task_id TEXT, p_key_data JSONB)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
        INSERT INTO public.task_keys(task_id, key_data, updated_at)
        VALUES(p_task_id, p_key_data, NOW())
        ON CONFLICT (task_id) DO UPDATE
        SET key_data = p_key_data, updated_at = NOW();
    END;
    $$;
    ```
    
5.  **Cấu hình Site URL (QUAN TRỌNG):**
    -   Để chức năng đặt lại mật khẩu hoạt động, bạn phải cấu hình Site URL trong Supabase.
    -   Vào **Authentication** > **URL Configuration**.
    -   Đặt **Site URL** thành URL mà ứng dụng của bạn được host (ví dụ: `http://localhost:5173` cho môi trường phát triển local).

6.  **Tùy chọn: Tắt Xác nhận Email**
    -   Trong project Supabase, vào **Authentication** > **Providers**.
    -   Click vào **Email**.
    -   Tắt tùy chọn **Confirm email**. Điều này giúp thí sinh có thể đăng nhập ngay sau khi đăng ký, rất tiện lợi cho một cuộc thi.

### Phần 3: Cài đặt Edge Function (Tác vụ một lần)

Để xử lý việc tải lên và phân tích file đáp án một cách hiệu quả mà không làm chậm ứng dụng, chúng ta sử dụng một Edge Function chạy phía server.

1.  **Khởi tạo Supabase tại máy của bạn:**
    -   Mở terminal trong thư mục gốc của dự án.
    -   Đăng nhập vào Supabase CLI: `supabase login`
    -   Liên kết thư mục dự án với project Supabase của bạn: `supabase link --project-ref YOUR_PROJECT_ID` (Thay `YOUR_PROJECT_ID` bằng ID project của bạn, lấy từ URL của project trên Supabase).

2.  **Tạo Edge Function:**
    -   Tạo các thư mục cần thiết: `mkdir -p supabase/functions/process-key-upload`
    -   Tạo một tệp mới có tên `supabase/functions/process-key-upload/index.ts`.
    -   Dán đoạn mã **ĐÃ CẬP NHẬT** sau vào tệp vừa tạo:

    ```typescript
    import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

    // Hàm phụ trợ để phân tích nội dung CSV một cách an toàn
    const parseCSV = (csvString: string): string[][] => {
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
    
    // Hàm chính xử lý request
    Deno.serve(async (req) => {
      try {
        const payload = await req.json();

        // **KIỂM TRA BẢO VỆ**: Đảm bảo payload hợp lệ từ webhook của storage.
        if (payload.type !== 'INSERT' || !payload.record || payload.record.bucket_id !== 'task-keys' || !payload.record.name) {
          console.log('Ignoring irrelevant webhook event:', payload);
          return new Response(JSON.stringify({ message: 'Ignoring irrelevant event' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
          });
        }

        const record = payload.record;
        const filePath = record.name;
        const taskId = filePath.split('.')[0];

        // **KIỂM TRA BẢO VỆ**: Bỏ qua các tệp giữ chỗ (placeholder) hoặc file không có tên hợp lệ.
        if (!taskId || taskId.trim() === '' || taskId.startsWith('.') || !filePath.endsWith('.csv')) {
            console.log(`Ignoring file with invalid name or extension: ${filePath}`);
            return new Response(JSON.stringify({ message: `Ignoring file with invalid name or extension` }), {
              headers: { 'Content-Type': 'application/json' },
              status: 200,
            });
        }

        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { data: file, error: downloadError } = await supabaseAdmin.storage
          .from('task-keys')
          .download(filePath);

        if (downloadError) throw downloadError;

        const csvContent = await file.text();
        const rows = parseCSV(csvContent);
        
        const startIndex = rows.length > 0 && rows[0][0].toLowerCase() === 'category_id' ? 1 : 0;
        const keyData = rows.slice(startIndex);
        
        if (keyData.length === 0) {
            console.warn(`Parsed empty key data from file: ${filePath}. Not updating database.`);
            return new Response(JSON.stringify({ message: `Parsed empty key data from file: ${filePath}` }), {
              headers: { 'Content-Type': 'application/json' },
              status: 200,
            });
        }

        if (keyData.some(row => row.length < 3)) {
            throw new Error("Malformed key file. Expected 'category_id,content,overall_band_score'.");
        }

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
        console.error('Error processing key upload:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        });
      }
    });
    ```
3.  **Triển khai (Deploy) Function:**
    -   Từ terminal trong thư mục gốc, chạy lệnh:
      `supabase functions deploy process-key-upload --no-verify-jwt`
    -   Lệnh này sẽ tải lên và triển khai function của bạn.

4.  **Tạo Webhook để kích hoạt Function:**
    -   Trong dashboard Supabase, vào **Database** > **Webhooks**.
    -   Nhấp **Create a new webhook**.
    -   **Name:** `Process Uploaded Key`
    -   **Table:** `objects` (từ schema `storage`)
    -   **Events:** Chọn **`INSERT`**.
    -   **HTTP Request:**
        -   **URL:** `YOUR_SUPABASE_PROJECT_URL/functions/v1/process-key-upload`
        -   **HTTP Method:** `POST`
    -   Nhấp **Create webhook**.

### Phần 4: Tối ưu Hiệu năng (Khuyến khích)

Để đảm bảo bảng điểm tải nhanh, đặc biệt khi có nhiều đội, bạn nên thêm các chỉ mục (index) cho cơ sở dữ liệu.

1.  Vào **SQL Editor** trong dashboard Supabase.
2.  Chạy lần lượt các lệnh sau. Điều này sẽ giúp các truy vấn tìm kiếm trên bảng `users` và `submissions` nhanh hơn rất nhiều.

```sql
-- Index để tăng tốc lọc các thí sinh
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Index để tăng tốc join bảng submissions với users
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON public.submissions(user_id);

-- Index để tăng tốc sắp xếp tasks
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at);
```

Bây giờ dự án của bạn đã được thiết lập hoàn chỉnh!