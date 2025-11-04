# PAIC Live Scoreboard

A modern, real-time web application designed to display a live scoreboard for programming contests, styled after the International Collegiate Programming Contest (ICPC). It includes an integrated Gemini-powered chatbot for assistance, robust admin controls, and a full suite of features for contestants. This application is bilingual, supporting both English and Vietnamese.

## Features

- **Live Scoreboard**: Automatically updates and ranks teams based on total score in real-time. The top three teams are highlighted with gold, silver, and bronze themes.
- **Multi-Language Support**: Seamlessly switch between English and Vietnamese with a persistent language preference.
- **Role-Based Authentication**: Separate login and registration flows for Contestants and Admins, with unique username and team name validation.
- **Contestant Panel**:
    - Submit solutions by uploading CSV files for specific tasks.
    - View a detailed submission history for each task, including scores and timestamps for every attempt.
    - Real-time scoring feedback.
- **Admin Panel**:
    - **Contest Control**: Start, pause ('Live'), or end the contest.
    - **Task Management**: Dynamically add or delete contest tasks.
    - **Answer Key Management**: Upload individual answer key files for each task and toggle their visibility (Public/Private).
    - **Team Management**: Delete teams and all their associated results from the contest.
- **Gemini AI Integration**:
    - **AI Chatbot**: An assistant trained to answer questions about competitive programming, NLP concepts, and contest strategies.
    - **AI Performance Analysis**: Admins and contestants can get an instant, AI-generated performance breakdown and strategic advice for any team with a single click.
- **Data Visualization**:
    - A dynamic bar chart displays the scores of the top 5 teams.
    - A stats bar provides an at-a-glance overview of key contest metrics (status, total submissions, highest score, etc.).
- **Modern UI/UX**:
    - Responsive design that works on all screen sizes.
    - A sleek dark theme with "glassmorphism" effects.
    - Toast notifications for user feedback.
    - Modals for viewing team details, AI analysis, and editing tasks/teams.
- **Offline & Data Persistence**: User session, language preference, and contest state are persisted in the browser's local storage.

## How to Use

### For Contestants

1.  **Registration**:
    - On the login page, select the "Contestant" tab.
    - Click the "Register" link.
    - Fill in your desired username, email, password, and a **unique team name**.
    - Click "Register". After a successful registration, you will be prompted to log in.

2.  **Login**:
    - Select the "Contestant" tab.
    - Enter your username and password.
    - Click "Login".

3.  **Submitting a Solution**:
    - In the "Submit Your Solution" panel, select the task you are solving from the dropdown menu.
    - Drag and drop your `predictions.csv` file into the upload area, or click to select it. The file must have the format: `category_id,content,overall_band_score`.
    - Click the "Submit Solution" button. You will receive a toast notification with your score.

4.  **Viewing History**:
    - In the "My Submission History" section, you can see your best score and total attempts for each task you've submitted to.
    - Click the chevron icon next to any task to expand and see a detailed log of every attempt with its score and timestamp.

### For Administrators

1.  **Login**:
    - On the login page, select the "Admin" tab.
    - Enter your admin username and password.
    - Click "Login".

2.  **Managing the Contest**:
    - **Contest Status**: Use the buttons ("Not Started", "Live", "Finished") to control the contest state. Submissions are only accepted when the status is "Live".
    - **Manage Tasks**: Add a new task by typing its name and clicking "Add Task". Delete a task using the trash icon.
    - **Manage Answer Keys**:
        - For each task, click the upload icon to select and upload the corresponding answer key CSV file. The file must have the format: `category_id,content,overall_band_score`.
        - Use the "Private/Public" toggle to control whether the answer key is used for scoring. A key must be uploaded and set to 'Public' for submissions on that task to be scored.
    - **Manage Teams**: Click the delete icon next to a team's name to permanently remove them and their submissions from the contest.

### General Features

- **Language Selection**: Use the dropdown menu in the top-right of the header to switch between English and Vietnamese.
- **AI Chatbot**: Click the chat icon in the bottom-right corner to open the Gemini Assistant. Ask it questions related to the contest or NLP.
- **AI Analysis**: On the scoreboard, click the sparkle icon (✨) next to any team's name to open a modal with an AI-generated performance analysis.

## Technologies Used

- **Frontend**: React, TypeScript, Tailwind CSS
- **AI**: Google Gemini API
- **Backend (Mock)**: MockAPI.io for user authentication and data persistence.
- **Modules**: `react-dropzone` for file uploads.
