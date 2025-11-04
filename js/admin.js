document.addEventListener('DOMContentLoaded', () => {
    const manageUsers = document.getElementById('manageUsers');
    const viewStats = document.getElementById('viewStats');
    const exportData = document.getElementById('exportData');
    const logout = document.getElementById('logout');
    const content = document.getElementById('content');

    // Modal elements
    const userModal = document.getElementById('userModal');
    const addUserModal = document.getElementById('addUserModal');
    const addUserBtn = document.getElementById('addUserBtn');
    const addUserForm = document.getElementById('addUserForm');
    const closeButtons = document.querySelectorAll('.close');

    // Close modals
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            userModal.style.display = 'none';
            addUserModal.style.display = 'none';
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === userModal) userModal.style.display = 'none';
        if (e.target === addUserModal) addUserModal.style.display = 'none';
    });

    manageUsers.addEventListener('click', () => {
        loadUsers();
        userModal.style.display = 'block';
    });

    addUserBtn.addEventListener('click', () => {
        addUserModal.style.display = 'block';
    });

    addUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('newUserName').value;
        const email = document.getElementById('newUserEmail').value;
        const password = document.getElementById('newUserPassword').value;
        const role = document.getElementById('newUserRole').value;

        try {
            await account.create('unique()', email, password, name);
            await account.updatePrefs({ role: role });
            showNotification('User created successfully!', 'success');
            addUserModal.style.display = 'none';
            addUserForm.reset();
            loadUsers();
        } catch (error) {
            showNotification('Failed to create user: ' + error.message, 'error');
        }
    });

    viewStats.addEventListener('click', () => {
        loadStatistics();
    });

    exportData.addEventListener('click', () => {
        exportAllData();
    });

    logout.addEventListener('click', async () => {
        try {
            await account.deleteSession('current');
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Logout failed:', error);
        }
    });
});

async function loadUsers() {
    try {
        const users = await databases.listDocuments(appwriteConfig.databaseId, 'user_profiles');
        const userList = document.getElementById('userList');
        userList.innerHTML = '';

        if (users.documents.length === 0) {
            userList.innerHTML = '<p>No users found.</p>';
            return;
        }

        users.documents.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'question-item';
            userItem.innerHTML = `
                <h4>${user.user_id}</h4>
                <p>Role: ${user.role}</p>
                <p>Department: ${user.department || 'N/A'}</p>
                <button onclick="deleteUser('${user.$id}')">Delete</button>
            `;
            userList.appendChild(userItem);
        });
    } catch (error) {
        showNotification('Failed to load users: ' + error.message, 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
        await databases.deleteDocument(appwriteConfig.databaseId, 'user_profiles', userId);
        showNotification('User deleted successfully!', 'success');
        loadUsers();
    } catch (error) {
        showNotification('Failed to delete user: ' + error.message, 'error');
    }
}

async function loadStatistics() {
    const content = document.getElementById('content');
    content.innerHTML = '<h3>System Statistics</h3><div class="loading"></div>';

    try {
        const [questions, exams, results] = await Promise.all([
            databases.listDocuments(appwriteConfig.databaseId, 'questions'),
            databases.listDocuments(appwriteConfig.databaseId, 'exams'),
            databases.listDocuments(appwriteConfig.databaseId, 'results')
        ]);

        content.innerHTML = `
            <h3>System Statistics</h3>
            <div class="chart-container">
                <canvas id="statsChart"></canvas>
            </div>
            <div style="display: flex; justify-content: space-around; margin-top: 20px;">
                <div style="text-align: center;">
                    <h4>${questions.total}</h4>
                    <p>Questions</p>
                </div>
                <div style="text-align: center;">
                    <h4>${exams.total}</h4>
                    <p>Exams</p>
                </div>
                <div style="text-align: center;">
                    <h4>${results.total}</h4>
                    <p>Results</p>
                </div>
            </div>
        `;

        const ctx = document.getElementById('statsChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Questions', 'Exams', 'Results'],
                datasets: [{
                    data: [questions.total, exams.total, results.total],
                    backgroundColor: ['#007bff', '#28a745', '#ffc107']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    } catch (error) {
        content.innerHTML = '<h3>System Statistics</h3><p>Failed to load statistics.</p>';
        showNotification('Failed to load statistics: ' + error.message, 'error');
    }
}

async function exportAllData() {
    const content = document.getElementById('content');
    content.innerHTML = '<h3>Export Data</h3><div class="loading"></div>';

    try {
        const [questions, exams, results] = await Promise.all([
            databases.listDocuments(appwriteConfig.databaseId, 'questions'),
            databases.listDocuments(appwriteConfig.databaseId, 'exams'),
            databases.listDocuments(appwriteConfig.databaseId, 'results')
        ]);

        const exportData = {
            questions: questions.documents,
            exams: exams.documents,
            results: results.documents,
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `exampro-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        content.innerHTML = '<h3>Export Data</h3><p>Data exported successfully!</p>';
        showNotification('Data exported successfully!', 'success');
    } catch (error) {
        content.innerHTML = '<h3>Export Data</h3><p>Failed to export data.</p>';
        showNotification('Failed to export data: ' + error.message, 'error');
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}
