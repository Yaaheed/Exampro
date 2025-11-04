document.addEventListener('DOMContentLoaded', () => {
    const manageQuestions = document.getElementById('manageQuestions');
    const generateExam = document.getElementById('generateExam');
    const generateMarkingGuide = document.getElementById('generateMarkingGuide');
    const viewResults = document.getElementById('viewResults');
    const logout = document.getElementById('logout');
    const content = document.getElementById('content');

    // Modal elements
    const questionModal = document.getElementById('questionModal');
    const addQuestionModal = document.getElementById('addQuestionModal');
    const examModal = document.getElementById('examModal');
    const addQuestionBtn = document.getElementById('addQuestionBtn');
    const questionForm = document.getElementById('questionForm');
    const examForm = document.getElementById('examForm');
    const closeButtons = document.querySelectorAll('.close');

    // Close modals
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            questionModal.style.display = 'none';
            addQuestionModal.style.display = 'none';
            examModal.style.display = 'none';
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === questionModal) questionModal.style.display = 'none';
        if (e.target === addQuestionModal) addQuestionModal.style.display = 'none';
        if (e.target === examModal) examModal.style.display = 'none';
    });

    // Question type change handler
    document.getElementById('questionType').addEventListener('change', (e) => {
        const optionsContainer = document.getElementById('optionsContainer');
        optionsContainer.style.display = e.target.value === 'objective' ? 'block' : 'none';
    });

    manageQuestions.addEventListener('click', () => {
        loadQuestions();
        questionModal.style.display = 'block';
    });

    addQuestionBtn.addEventListener('click', () => {
        document.getElementById('questionModalTitle').textContent = 'Add New Question';
        questionForm.reset();
        document.getElementById('optionsContainer').style.display = 'none';
        addQuestionModal.style.display = 'block';
    });

    questionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveQuestion();
    });

    generateExam.addEventListener('click', () => {
        loadQuestionSelector();
        examModal.style.display = 'block';
    });

    examForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await generateExam();
    });

    generateMarkingGuide.addEventListener('click', () => {
        loadExamsForMarkingGuide();
    });

    viewResults.addEventListener('click', () => {
        loadResults();
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

async function loadQuestions() {
    try {
        const questions = await databases.listDocuments(appwriteConfig.databaseId, 'questions');
        const questionList = document.getElementById('questionList');
        questionList.innerHTML = '';

        if (questions.documents.length === 0) {
            questionList.innerHTML = '<p>No questions found.</p>';
            return;
        }

        questions.documents.forEach(question => {
            const questionItem = document.createElement('div');
            questionItem.className = 'question-item';
            questionItem.innerHTML = `
                <h4>${question.question_text.substring(0, 50)}...</h4>
                <p>Course: ${question.course} | Topic: ${question.topic} | Difficulty: ${question.difficulty} | Marks: ${question.marks}</p>
                <button onclick="editQuestion('${question.$id}')">Edit</button>
                <button onclick="deleteQuestion('${question.$id}')">Delete</button>
            `;
            questionList.appendChild(questionItem);
        });
    } catch (error) {
        showNotification('Failed to load questions: ' + error.message, 'error');
    }
}

async function saveQuestion() {
    const formData = {
        question_text: document.getElementById('questionText').value,
        course: document.getElementById('questionCourse').value,
        topic: document.getElementById('questionTopic').value,
        difficulty: document.getElementById('questionDifficulty').value,
        marks: parseInt(document.getElementById('questionMarks').value),
        type: document.getElementById('questionType').value,
        media_url: document.getElementById('questionMedia').value || null
    };

    if (formData.type === 'objective') {
        formData.options = [
            document.getElementById('option1').value,
            document.getElementById('option2').value,
            document.getElementById('option3').value,
            document.getElementById('option4').value
        ];
        formData.correct_answer = document.getElementById('correctAnswer').value;
    }

    try {
        await databases.createDocument(appwriteConfig.databaseId, 'questions', 'unique()', formData);
        showNotification('Question saved successfully!', 'success');
        addQuestionModal.style.display = 'none';
        loadQuestions();
    } catch (error) {
        showNotification('Failed to save question: ' + error.message, 'error');
    }
}

async function editQuestion(questionId) {
    try {
        const question = await databases.getDocument(appwriteConfig.databaseId, 'questions', questionId);

        document.getElementById('questionModalTitle').textContent = 'Edit Question';
        document.getElementById('questionType').value = question.type;
        document.getElementById('questionCourse').value = question.course;
        document.getElementById('questionTopic').value = question.topic;
        document.getElementById('questionDifficulty').value = question.difficulty;
        document.getElementById('questionMarks').value = question.marks;
        document.getElementById('questionText').value = question.question_text;
        document.getElementById('questionMedia').value = question.media_url || '';

        if (question.type === 'objective') {
            document.getElementById('optionsContainer').style.display = 'block';
            document.getElementById('option1').value = question.options[0] || '';
            document.getElementById('option2').value = question.options[1] || '';
            document.getElementById('option3').value = question.options[2] || '';
            document.getElementById('option4').value = question.options[3] || '';
            document.getElementById('correctAnswer').value = question.correct_answer;
        }

        addQuestionModal.style.display = 'block';
    } catch (error) {
        showNotification('Failed to load question: ' + error.message, 'error');
    }
}

async function deleteQuestion(questionId) {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
        await databases.deleteDocument(appwriteConfig.databaseId, 'questions', questionId);
        showNotification('Question deleted successfully!', 'success');
        loadQuestions();
    } catch (error) {
        showNotification('Failed to delete question: ' + error.message, 'error');
    }
}

async function loadQuestionSelector() {
    try {
        const questions = await databases.listDocuments(appwriteConfig.databaseId, 'questions');
        const selector = document.getElementById('questionSelector');
        selector.innerHTML = '<h4>Select Questions for Exam:</h4>';

        questions.documents.forEach(question => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `question-${question.$id}`;
            checkbox.value = question.$id;

            const label = document.createElement('label');
            label.htmlFor = `question-${question.$id}`;
            label.textContent = `${question.question_text.substring(0, 50)}... (${question.marks} marks)`;

            const div = document.createElement('div');
            div.appendChild(checkbox);
            div.appendChild(label);
            selector.appendChild(div);
        });
    } catch (error) {
        showNotification('Failed to load questions: ' + error.message, 'error');
    }
}

async function generateExam() {
    const title = document.getElementById('examTitle').value;
    const course = document.getElementById('examCourse').value;
    const duration = parseInt(document.getElementById('examDuration').value);
    const selectedQuestions = Array.from(document.querySelectorAll('#questionSelector input:checked')).map(cb => cb.value);

    if (selectedQuestions.length === 0) {
        showNotification('Please select at least one question.', 'error');
        return;
    }

    try {
        const user = await account.get();
        await databases.createDocument(appwriteConfig.databaseId, 'exams', 'unique()', {
            title,
            course,
            questions: selectedQuestions,
            total_marks: selectedQuestions.length * 10, // Assuming 10 marks per question
            duration,
            created_by: user.$id,
            created_at: new Date().toISOString()
        });

        showNotification('Exam generated successfully!', 'success');
        examModal.style.display = 'none';
    } catch (error) {
        showNotification('Failed to generate exam: ' + error.message, 'error');
    }
}

async function loadExamsForMarkingGuide() {
    const content = document.getElementById('content');
    content.innerHTML = '<h3>Generate Marking Guide</h3><div class="loading"></div>';

    try {
        const exams = await databases.listDocuments(appwriteConfig.databaseId, 'exams');

        if (exams.documents.length === 0) {
            content.innerHTML = '<h3>Generate Marking Guide</h3><p>No exams found.</p>';
            return;
        }

        content.innerHTML = '<h3>Generate Marking Guide</h3>';
        exams.documents.forEach(exam => {
            const examItem = document.createElement('div');
            examItem.className = 'exam-item';
            examItem.innerHTML = `
                <h4>${exam.title}</h4>
                <p>Course: ${exam.course} | Questions: ${exam.questions.length} | Total Marks: ${exam.total_marks}</p>
                <button onclick="generateMarkingGuide('${exam.$id}')">Generate Guide</button>
            `;
            content.appendChild(examItem);
        });
    } catch (error) {
        content.innerHTML = '<h3>Generate Marking Guide</h3><p>Failed to load exams.</p>';
        showNotification('Failed to load exams: ' + error.message, 'error');
    }
}

async function generateMarkingGuide(examId) {
    try {
        const exam = await databases.getDocument(appwriteConfig.databaseId, 'exams', examId);
        const questions = await Promise.all(
            exam.questions.map(qId => databases.getDocument(appwriteConfig.databaseId, 'questions', qId))
        );

        const guideContent = {
            examTitle: exam.title,
            course: exam.course,
            totalMarks: exam.total_marks,
            questions: questions.map(q => ({
                text: q.question_text,
                marks: q.marks,
                type: q.type,
                correct_answer: q.correct_answer || 'Subjective evaluation required'
            }))
        };

        await databases.createDocument(appwriteConfig.databaseId, 'marking_guides', 'unique()', {
            exam_id: examId,
            guide_content: JSON.stringify(guideContent),
            created_at: new Date().toISOString()
        });

        showNotification('Marking guide generated successfully!', 'success');
    } catch (error) {
        showNotification('Failed to generate marking guide: ' + error.message, 'error');
    }
}

async function loadResults() {
    const content = document.getElementById('content');
    content.innerHTML = '<h3>Exam Results</h3><div class="loading"></div>';

    try {
        const results = await databases.listDocuments(appwriteConfig.databaseId, 'results');

        if (results.documents.length === 0) {
            content.innerHTML = '<h3>Exam Results</h3><p>No results found.</p>';
            return;
        }

        content.innerHTML = '<h3>Exam Results</h3>';
        results.documents.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            resultItem.innerHTML = `
                <h4>Exam ID: ${result.exam_id}</h4>
                <p>Student: ${result.student_id} | Score: ${result.score || 'Not graded'} | Submitted: ${new Date(result.submitted_at).toLocaleDateString()}</p>
                <button onclick="viewResultDetails('${result.$id}')">View Details</button>
            `;
            content.appendChild(resultItem);
        });
    } catch (error) {
        content.innerHTML = '<h3>Exam Results</h3><p>Failed to load results.</p>';
        showNotification('Failed to load results: ' + error.message, 'error');
    }
}

async function viewResultDetails(resultId) {
    try {
        const result = await databases.getDocument(appwriteConfig.databaseId, 'results', resultId);
        alert(`Result Details:\nScore: ${result.score || 'Not graded'}\nAnswers: ${JSON.stringify(result.answers, null, 2)}`);
    } catch (error) {
        showNotification('Failed to load result details: ' + error.message, 'error');
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
