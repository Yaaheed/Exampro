# ExamPro - Advanced Examination Management System

## Overview

ExamPro is a comprehensive web-based examination management system designed to streamline the process of creating, administering, and grading examinations. Built with modern web technologies, it provides a complete solution for educational institutions to manage their assessment processes efficiently.

The system leverages Appwrite as its backend-as-a-service platform, eliminating the need for server-side code and providing a scalable, secure foundation for data management.

## How the System Works

### Architecture Overview

ExamPro operates as a single-page application (SPA) with multiple dashboard views, using:

- **Frontend**: Pure HTML, CSS, and JavaScript with modern ES6+ features
- **Backend**: Appwrite Cloud (Database, Authentication, Storage)
- **Deployment**: Static hosting on Vercel
- **Styling**: Custom CSS with modern animations and responsive design

### Core Components

1. **Authentication System** (`js/auth.js`)
   - Handles user login, registration, and session management
   - Role-based access control (Admin, Lecturer, Student)
   - Password reset functionality
   - Automatic redirection based on user roles

2. **Database Configuration** (`js/appwrite-config.js`)
   - Appwrite client initialization
   - Global service instances (Account, Databases, Storage)

3. **Setup System** (`setup.html`, `js/setup.js`)
   - Automated database and collection creation
   - Default admin and lecturer account provisioning
   - Permission configuration

4. **Dashboard Modules**
   - **Admin Dashboard** (`admin-dashboard.html`, `js/admin.js`): User management, system statistics, data export
   - **Lecturer Dashboard** (`lecturer-dashboard.html`, `js/lecturer.js`): Question management, exam generation, marking guide creation, results viewing
   - **Student Dashboard** (`student-dashboard.html`, `js/student.js`): Mock exam taking, results viewing

### Data Flow

1. **Setup Phase**:
   - User accesses `setup.html`
   - Script creates Appwrite database and collections
   - Default accounts are created with predefined credentials

2. **Authentication Phase**:
   - Users access `index.html` for login/registration
   - Students can register publicly (role auto-assigned)
   - Admins/Lecturers use pre-created accounts
   - Successful authentication redirects to appropriate dashboard

3. **Operational Phase**:
   - **Lecturers**: Create/manage questions, generate exams and marking guides
   - **Students**: Take mock exams, view results
   - **Admins**: Manage users, view system statistics, export data

### Database Schema

The system uses 5 main collections in Appwrite:

#### 1. Questions Collection
- Stores question bank with metadata
- Supports both objective (multiple choice) and theory questions
- Includes difficulty levels, marks, and optional media attachments

#### 2. Exams Collection
- Contains exam definitions with question references
- Tracks creation metadata and exam parameters

#### 3. Marking Guides Collection
- Stores AI-generated or manual marking guides
- Linked to specific exams

#### 4. Results Collection
- Records student exam attempts and scores
- Supports both auto-grading (objective) and manual grading (theory)

#### 5. User Profiles Collection
- Extended user information beyond Appwrite's built-in user data
- Role and department information

### Key Features

#### For Lecturers:
- **Question Bank Management**: Create, edit, categorize questions
- **Exam Generation**: Select questions by criteria, set exam parameters
- **Marking Guide Creation**: Automated guide generation for fair assessment
- **Results Analysis**: View and analyze student performance

#### For Students:
- **Mock Exam Taking**: Timed exams with various question types
- **Results Viewing**: Access scores and feedback
- **Progress Tracking**: Monitor learning progress

#### For Admins:
- **User Management**: Create/manage lecturer and admin accounts
- **System Monitoring**: View usage statistics and analytics
- **Data Export**: Export system data for external analysis

### Security & Permissions

- **Role-Based Access Control**: Strict permissions based on user roles
- **Data Isolation**: Users can only access authorized data
- **Secure Authentication**: Appwrite's built-in security features
- **API Security**: All backend operations secured via Appwrite SDK

### Deployment & Hosting

- **Static Hosting**: All files served statically from Vercel
- **CDN Distribution**: Global content delivery for optimal performance
- **Automatic Builds**: GitHub integration for continuous deployment
- **Environment Configuration**: Separate configs for development/production

## Installation & Setup

### Prerequisites
- Appwrite Cloud account (https://cloud.appwrite.io)
- GitHub account for repository hosting
- Vercel account for deployment

### Quick Start

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Yaaheed/Exampro.git
   cd exampro
   ```

2. **Configure Appwrite**
   - Create a new project at https://cloud.appwrite.io
   - Note your Project ID and create a Database
   - Update `js/appwrite-config.js` with your credentials

3. **Setup Database**
   - Open `setup.html` in a browser
   - Click "Setup Database" to create collections and default accounts
   - Default credentials:
     - Admin: admin@exampro.com / admin123
     - Lecturer: lecturer@exampro.com / lecturer123

4. **Deploy to Vercel**
   ```bash
   npm install -g vercel
   vercel login
   vercel --prod
   ```

5. **Access the Application**
   - Open the deployed URL
   - Login with appropriate credentials

### Manual Setup (Alternative)

If automated setup fails, manually create the following in Appwrite Console:

#### Collections:
1. **questions** - Question bank
2. **exams** - Exam definitions
3. **marking_guides** - Grading guides
4. **results** - Student results
5. **user_profiles** - Extended user data

#### Attributes:
Configure attributes as detailed in the original README section.

## Usage Guide

### For Lecturers
1. Login with lecturer credentials
2. Manage question bank (add/edit questions)
3. Generate exams by selecting questions
4. Create marking guides for fair assessment
5. Review student results and performance

### For Students
1. Register a new student account
2. Take available mock exams
3. View results and feedback
4. Track learning progress

### For Admins
1. Login with admin credentials
2. Manage lecturer/admin accounts
3. Monitor system usage
4. Export data for analysis

## Development

### Project Structure
```
exampro/
├── index.html              # Login/Register page
├── setup.html              # Database setup page
├── admin-dashboard.html    # Admin interface
├── lecturer-dashboard.html # Lecturer interface
├── student-dashboard.html  # Student interface
├── css/
│   └── styles.css          # Global styles
├── js/
│   ├── appwrite-config.js  # Appwrite configuration
│   ├── auth.js             # Authentication logic
│   ├── admin.js            # Admin dashboard logic
│   ├── lecturer.js         # Lecturer dashboard logic
│   ├── student.js          # Student dashboard logic
│   └── setup.js            # Database setup logic
├── vercel.json             # Vercel deployment config
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

### Adding New Features
1. Update relevant HTML files for UI changes
2. Modify corresponding JavaScript files for logic
3. Update CSS for styling
4. Test across different user roles
5. Commit and deploy changes

### Customization
- Modify `css/styles.css` for visual changes
- Update `js/appwrite-config.js` for backend configuration
- Extend dashboard files for new functionality

## Troubleshooting

### Common Issues
- **Database Setup Fails**: Check Appwrite project permissions
- **Login Issues**: Verify user roles in Appwrite console
- **Styling Problems**: Clear browser cache, check CSS paths
- **Deployment Issues**: Verify Vercel configuration

### Support
- Check Appwrite documentation for backend issues
- Review browser console for JavaScript errors
- Verify network connectivity for Appwrite API calls

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and test thoroughly
4. Submit a pull request with detailed description

## License

This project is open-source and available under the MIT License.
