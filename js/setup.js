// Setup script to create Appwrite database, collections, and attributes automatically

async function setupDatabase() {
    document.getElementById('setupBtn').innerHTML = '<span class="loading"></span> Setting up...';
    document.getElementById('setupBtn').disabled = true;
    document.getElementById('progress').style.display = 'block';

    try {
        // Create database if it doesn't exist
        const database = await databases.create(appwriteConfig.databaseId, 'ExamPro Database');
        console.log('Database created:', database);

        // Create collections
        const collections = [
            { id: 'questions', name: 'Questions' },
            { id: 'exams', name: 'Exams' },
            { id: 'marking_guides', name: 'Marking Guides' },
            { id: 'results', name: 'Results' },
            { id: 'user_profiles', name: 'User Profiles' }
        ];

        for (const coll of collections) {
            const collection = await databases.createCollection(appwriteConfig.databaseId, coll.id, coll.name);
            console.log('Collection created:', collection);
        }

        // Create attributes for questions
        await databases.createStringAttribute(appwriteConfig.databaseId, 'questions', 'question_text', 500, false);
        await databases.createStringAttribute(appwriteConfig.databaseId, 'questions', 'course', 100, false);
        await databases.createStringAttribute(appwriteConfig.databaseId, 'questions', 'topic', 100, false);
        await databases.createStringAttribute(appwriteConfig.databaseId, 'questions', 'difficulty', 20, false);
        await databases.createIntegerAttribute(appwriteConfig.databaseId, 'questions', 'marks', false);
        await databases.createStringAttribute(appwriteConfig.databaseId, 'questions', 'type', 20, false);
        await databases.createStringAttribute(appwriteConfig.databaseId, 'questions', 'options', 1000, true); // array
        await databases.createStringAttribute(appwriteConfig.databaseId, 'questions', 'correct_answer', 500, true);
        await databases.createStringAttribute(appwriteConfig.databaseId, 'questions', 'media_url', 500, true);

        // Create attributes for exams
        await databases.createStringAttribute(appwriteConfig.databaseId, 'exams', 'title', 200, false);
        await databases.createStringAttribute(appwriteConfig.databaseId, 'exams', 'course', 100, false);
        await databases.createStringAttribute(appwriteConfig.databaseId, 'exams', 'questions', 1000, false); // array of IDs
        await databases.createIntegerAttribute(appwriteConfig.databaseId, 'exams', 'total_marks', false);
        await databases.createIntegerAttribute(appwriteConfig.databaseId, 'exams', 'duration', false);
        await databases.createStringAttribute(appwriteConfig.databaseId, 'exams', 'created_by', 50, false);
        await databases.createDatetimeAttribute(appwriteConfig.databaseId, 'exams', 'created_at', false);

        // Create attributes for marking_guides
        await databases.createStringAttribute(appwriteConfig.databaseId, 'marking_guides', 'exam_id', 50, false);
        await databases.createStringAttribute(appwriteConfig.databaseId, 'marking_guides', 'guide_content', 10000, false);
        await databases.createDatetimeAttribute(appwriteConfig.databaseId, 'marking_guides', 'created_at', false);

        // Create attributes for results
        await databases.createStringAttribute(appwriteConfig.databaseId, 'results', 'exam_id', 50, false);
        await databases.createStringAttribute(appwriteConfig.databaseId, 'results', 'student_id', 50, false);
        await databases.createStringAttribute(appwriteConfig.databaseId, 'results', 'answers', 10000, false);
        await databases.createIntegerAttribute(appwriteConfig.databaseId, 'results', 'score', true);
        await databases.createDatetimeAttribute(appwriteConfig.databaseId, 'results', 'submitted_at', false);
        await databases.createBooleanAttribute(appwriteConfig.databaseId, 'results', 'graded', false);

        // Create attributes for user_profiles
        await databases.createStringAttribute(appwriteConfig.databaseId, 'user_profiles', 'user_id', 50, false);
        await databases.createStringAttribute(appwriteConfig.databaseId, 'user_profiles', 'role', 20, false);
        await databases.createStringAttribute(appwriteConfig.databaseId, 'user_profiles', 'department', 100, true);

        // Set permissions (example: read for all, write for admins/lecturers)
        // Note: Adjust based on your needs. This is a basic setup.
        const readPerms = ['role:all'];
        const writePerms = ['role:admin', 'role:lecturer'];

        for (const coll of collections) {
            await databases.updateCollection(appwriteConfig.databaseId, coll.id, coll.name, readPerms, writePerms, false);
        }

        // Create default admin and lecturer accounts
        await createDefaultAccounts();

        document.getElementById('message').textContent = 'Database setup completed successfully! Default admin and lecturer accounts created.';
        document.getElementById('message').className = 'success';
    } catch (error) {
        console.error('Setup failed:', error);
        document.getElementById('message').textContent = 'Setup failed: ' + error.message;
        document.getElementById('message').className = 'error';
    } finally {
        document.getElementById('setupBtn').textContent = 'Setup Database';
        document.getElementById('setupBtn').disabled = false;
    }
}

async function createDefaultAccounts() {
    try {
        // Create admin account
        const adminUser = await account.create(ID.unique(), 'admin@exampro.com', 'admin123', 'ExamPro Admin');
        await account.updatePrefs({ role: 'admin' });
        console.log('Admin account created:', adminUser);

        // Create lecturer account
        const lecturerUser = await account.create(ID.unique(), 'lecturer@exampro.com', 'lecturer123', 'ExamPro Lecturer');
        await account.updatePrefs({ role: 'lecturer' });
        console.log('Lecturer account created:', lecturerUser);

        // Note: In a real application, you would want to create these accounts with proper authentication
        // and store them securely. This is just for demonstration purposes.
    } catch (error) {
        console.error('Failed to create default accounts:', error);
        // Don't fail the entire setup if account creation fails
    }
}
