# ExamPro - Examination and Marking Guide Generating System

## Overview
A web-based system for managing examinations, generating question papers, and creating marking guides using HTML, CSS, JavaScript, and Appwrite.

## Features
- User Authentication (Admin, Lecturer, Student)
- Question Management
- Exam Paper Generation
- Marking Guide Generator
- Student Mock Tests
- Admin Panel
- Reporting and Analytics

## Setup
1. Create an Appwrite project at https://cloud.appwrite.io
2. Update `js/appwrite-config.js` with your project ID, endpoint, and database ID.
3. Open `setup.html` in a browser and click "Setup Database" to automatically create collections and attributes.
4. Manually create admin and lecturer accounts in Appwrite Console, set prefs.role accordingly.
5. Open `index.html` in a browser to start.

## Appwrite Collections and Attributes

### Collections to Create:
1. **questions**
   - Attributes:
     - question_text (string)
     - course (string)
     - topic (string)
     - difficulty (string: easy, medium, hard)
     - marks (number)
     - type (string: objective, theory)
     - options (string array, for objective)
     - correct_answer (string, for objective)
     - media_url (string, optional)

2. **exams**
   - Attributes:
     - title (string)
     - course (string)
     - questions (string array, IDs of questions)
     - total_marks (number)
     - duration (number, minutes)
     - created_by (string, user ID)
     - created_at (datetime)

3. **marking_guides**
   - Attributes:
     - exam_id (string)
     - guide_content (string, JSON or text)
     - created_at (datetime)

4. **results**
   - Attributes:
     - exam_id (string)
     - student_id (string)
     - answers (string, JSON)
     - score (number)
     - submitted_at (datetime)
     - graded (boolean)

5. **user_profiles** (optional, for additional info)
   - Attributes:
     - user_id (string)
     - role (string)
     - department (string, optional)

### Permissions:
- Set read/write permissions based on roles.
- Admins: Full access
- Lecturers: Read/write on questions, exams, marking_guides, results
- Students: Read on exams, write on results

## Dashboard Access
- **Admin**: Manually create accounts in Appwrite Console, set prefs.role to 'admin', then login via index.html
- **Lecturer**: Manually create accounts, set prefs.role to 'lecturer', login via index.html
- **Student**: Register publicly via index.html, role auto-set to 'student'

## Development
- Frontend: HTML, CSS, JS
- Backend: Appwrite
- No server-side code needed, all handled via Appwrite SDK
