document.addEventListener('DOMContentLoaded', () => {
    const takeMockExam = document.getElementById('takeMockExam');
    const viewResults = document.getElementById('viewResults');
    const logout = document.getElementById('logout');
    const content = document.getElementById('content');

    // Modal elements
    const examTakingModal = document.getElementById('examTakingModal');
    const resultsModal = document.getElementById('resultsModal');
    const submitExamBtn = document.getElementById('submitExamBtn');
    const closeButtons = document.querySelectorAll('.close');

    // Close modals
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            examTakingModal.style.display = 'none';
            resultsModal.style.display = 'none';
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === examTakingModal) examTakingModal.style.display = 'none';
        if (e.target === resultsModal) resultsModal.style.display = 'none';
    });

    takeMockExam.addEventListener('click', () => {
        loadAvailableExams();
    });

    viewResults.addEventListener('click', () => {
        loadStudentResults();
        resultsModal.style.display = 'block';
    });

    submitExamBtn.addEventListener('click', () => {
        submitExam();
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

async function loadAvailableExams() {
    const content = document.getElementById('content');
    content.innerHTML = '<h3>Available Exams</h3><div class="loading"></div>';

    try {
        const exams = await databases.listDocuments(appwriteConfig.databaseId, 'exams');

        if (exams.documents.length === 0) {
            content.innerHTML = '<h3>Available Exams</h3><p>No exams available.</p>';
            return;
        }

        content.innerHTML = '<h3>Available Exams</h3>';
        exams.documents.forEach(exam => {
            const examItem = document.createElement('div');
            examItem.className = 'exam-item';
            examItem.innerHTML = `
                <h4>${exam.title}</h4>
                <p>Course: ${exam.course} | Duration: ${exam.duration} minutes | Total Marks: ${exam.total_marks}</p>
                <button onclick="startExam('${exam.$id}')">Start Exam</button>
            `;
            content.appendChild(examItem);
        });
    } catch (error) {
        content.innerHTML = '<h3>Available Exams</h3><p>Failed to load exams.</p>';
        showNotification('Failed to load exams: ' + error.message, 'error');
    }
}

async function startExam(examId) {
    try {
        const exam = await databases.getDocument(appwriteConfig.databaseId, 'exams', examId);
        const questions = await Promise.all(
            exam.questions.map(qId => databases.getDocument(appwriteConfig.databaseId, 'questions', qId))
        );

        currentExam = { ...exam, questions };
        currentAnswers = {};

        displayExam(questions);
        startTimer(exam.duration);
        examTakingModal.style.display = 'block';
    } catch (error) {
        showNotification('Failed to start exam: ' + error.message, 'error');
    }
}

function displayExam(questions) {
    const examQuestions = document.getElementById('examQuestions');
    examQuestions.innerHTML = '';

    questions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'exam-question';
        questionDiv.innerHTML = `
            <h4>Question ${index + 1} (${question.marks} marks)</h4>
            <p>${question.question_text}</p>
        `;

        if (question.media_url) {
            questionDiv.innerHTML += `<img src="${question.media_url}" alt="Question media" style="max-width: 100%; height: auto;">`;
        }

        if (question.type === 'objective') {
            question.options.forEach((option, optIndex) => {
                const optionDiv = document.createElement('div');
                optionDiv.className = 'option';
                optionDiv.textContent = `${String.fromCharCode(65 + optIndex)}. ${option}`;
                optionDiv.addEventListener('click', () => {
                    selectOption(question.$id, optIndex, optionDiv);
                });
                questionDiv.appendChild(optionDiv);
            });
        } else {
            const textarea = document.createElement('textarea');
            textarea.placeholder = 'Enter your answer here...';
            textarea.addEventListener('input', (e) => {
                currentAnswers[question.$id] = e.target.value;
            });
            questionDiv.appendChild(textarea);
        }

        examQuestions.appendChild(questionDiv);
    });
}

function selectOption(questionId, optionIndex, optionDiv) {
    // Remove selected class from all options in this question
    const questionDiv = optionDiv.parentElement;
    questionDiv.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));

    // Add selected class to clicked option
    optionDiv.classList.add('selected');
    currentAnswers[questionId] = optionIndex;
}

function startTimer(duration) {
    let timeLeft = duration * 60; // Convert to seconds
    const timerElement = document.getElementById('timeRemaining');

    const timer = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        if (timeLeft <= 0) {
            clearInterval(timer);
            submitExam();
        }
        timeLeft--;
    }, 1000);

    // Store timer for cleanup
    window.examTimer = timer;
}

async function submitExam() {
    if (window.examTimer) {
        clearInterval(window.examTimer);
    }

    try {
        const user = await account.get();
        await databases.createDocument(appwriteConfig.databaseId, 'results', 'unique()', {
            exam_id: currentExam.$id,
            student_id: user.$id,
            answers: currentAnswers,
            submitted_at: new Date().toISOString(),
            graded: false
        });

        showNotification('Exam submitted successfully!', 'success');
        examTakingModal.style.display = 'none';
    } catch (error) {
        showNotification('Failed to submit exam: ' + error.message, 'error');
    }
}

async function loadStudentResults() {
    try {
        const user = await account.get();
        const results = await databases.listDocuments(appwriteConfig.databaseId, 'results', [
            Query.equal('student_id', user.$id)
        ]);

        const resultsList = document.getElementById('resultsList');
        resultsList.innerHTML = '';

        if (results.documents.length === 0) {
            resultsList.innerHTML = '<p>No results found.</p>';
            return;
        }

        results.documents.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            resultItem.innerHTML = `
                <h4>Exam ID: ${result.exam_id}</h4>
                <p>Score: ${result.score || 'Not graded yet'} | Submitted: ${new Date(result.submitted_at).toLocaleDateString()}</p>
                <p>Status: ${result.graded ? 'Graded' : 'Pending Grading'}</p>
            `;
            resultsList.appendChild(resultItem);
        });
    } catch (error) {
        showNotification('Failed to load results: ' + error.message, 'error');
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

// Global variables
let currentExam = null;
let currentAnswers = {};

// Import Query for filtering results
const { Query } = Appwrite;
