// --- FIREBASE SETUP USING VITE ENVIRONMENT VARIABLES ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Load Firebase config from environment variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- FIREBASE INITIALIZATION ---
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- GLOBAL DOM ELEMENTS & CONSTANTS ---
const appContainer = document.getElementById('app-container');
const header = document.getElementById('header');
const nav = document.getElementById('main-nav');
const userStatusDiv = document.getElementById('user-status');
const loadingSpinner = document.getElementById('loading-spinner');

// --- PWA INSTALL PROMPT ---
let deferredPrompt;
let unsubscribeExamListener = null; // To manage Firestore real-time listener

// Gemini API Configuration
const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`;

// --- FIRESTORE PATH HELPER ---
const getUserProfileDocRef = (uid) => {
    return db.collection('artifacts')
             .doc(appId)
             .collection('users')
             .doc(uid)
             .collection('user_metadata')
             .doc('profile');
};

const getExamDocRef = (examId) => {
    // In a real app, examId would be dynamic (e.g., selected from a list)
    return db.collection('artifacts')
             .doc(appId)
             .collection('exams')
             .doc(examId);
};

// --- UTILITY FUNCTIONS ---
const showLoading = (show, context = 'application') => {
    if (context === 'application') {
         if (loadingSpinner) loadingSpinner.classList.toggle('hidden', !show);
         if (appContainer) appContainer.classList.toggle('hidden', show);
         if (header) header.classList.toggle('hidden', show); // Hide header on full-screen loading
    } else if (context === 'generator') {
        const genButton = document.getElementById('generate-btn');
        if (genButton) {
            const icon = genButton.querySelector('svg');
            const text = genButton.querySelector('span');
            genButton.disabled = show;
            if (show) {
                if (text) text.textContent = 'Generating...';
                if (icon) icon.classList.remove('hidden');
            } else {
                if (text) text.textContent = '✨ Generate Question';
                if (icon) icon.classList.add('hidden');
            }
        }
    } else if (context === 'analyzer') {
        const analButton = document.getElementById('analyze-btn');
        if (analButton) {
            const icon = analButton.querySelector('svg');
            const text = analButton.querySelector('span');
            analButton.disabled = show;
            if (show) {
                if (text) text.textContent = 'Analyzing...';
                if (icon) icon.classList.remove('hidden');
            } else {
                if (text) text.textContent = '📚 Analyze Content';
                if (icon) icon.classList.add('hidden');
            }
        }
    }
};

const displayMessage = (containerId, message, isError = true) => {
    const el = document.getElementById(containerId);
    if (el) {
        el.textContent = message;
        el.className = isError 
            ? 'text-red-600 text-sm text-center mt-3 p-2 bg-red-50 rounded-lg'
            : 'text-green-600 text-sm text-center mt-3 p-2 bg-green-50 rounded-lg';
        el.classList.remove('hidden');
    }
};

// --- TAB MANAGEMENT (for Exam Builder) ---
const setupTabs = () => {
    const tabs = document.querySelectorAll('.tab-button');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.add('hidden'));

            tab.classList.add('active');
            const targetId = tab.id.replace('tab-', 'tab-content-');
            document.getElementById(targetId).classList.remove('hidden');
        });
    });
};

// --- GEMINI API INTEGRATIONS (Snipped for brevity, but retained full functions) ---
const generateQuestion = async () => { /* ... full function retained ... */ 
    const topic = document.getElementById('topic-input').value;
    const difficulty = document.getElementById('difficulty-select').value;
    const style = document.getElementById('style-input').value;
    const outputDiv = document.getElementById('generated-output');
    const msgDiv = document.getElementById('generator-message');
    
    outputDiv.innerHTML = '<p class="text-center text-gray-500">Generating question...</p>';
    msgDiv.classList.add('hidden');

    if (!topic) {
        displayMessage('generator-message', 'Please enter a topic to generate a question.', true);
        return;
    }

    const userQuery = `Generate a single exam question on the following topic: "${topic}". The question should be of ${difficulty} difficulty and written in the style of: "${style}".`;
    
    const systemPrompt = `You are a world-class educational content generator. Your task is to create a single, high-quality exam question based on the user's prompt. You MUST respond with a valid JSON object matching the provided schema. The marking scheme should detail the necessary elements for full marks. Do NOT include any introductory or concluding text outside the JSON object.`;
    
    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    "topic": { "type": "STRING", "description": "The specific academic topic covered." },
                    "questionText": { "type": "STRING", "description": "The complete text of the exam question." },
                    "points": { "type": "INTEGER", "description": "The total marks/points the question is worth (e.g., 5, 10, 15)." },
                    "markingScheme": {
                        "type": "ARRAY",
                        "description": "A list of bullet points detailing the required answer elements or steps for grading.",
                        "items": { "type": "STRING" }
                    }
                },
                "propertyOrdering": ["topic", "questionText", "points", "markingScheme"]
            }
        }
    };
    
    showLoading(true, 'generator');

    try {
        const response = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API call failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        let generatedData = null;

        if (jsonText) {
            generatedData = JSON.parse(jsonText);
            renderGeneratedQuestion(generatedData);
        } else {
            throw new Error("Invalid response format from Gemini API.");
        }

    } catch (error) {
        console.error("Gemini Generation Error:", error);
        displayMessage('generator-message', `Failed to generate question: ${error.message}. Please try again.`);
        outputDiv.innerHTML = '<p class="text-center text-gray-500">Error generating question. See console for details.</p>';
    } finally {
        showLoading(false, 'generator');
    }
 }

const analyzeContent = async () => { /* ... full function retained ... */
    const content = document.getElementById('content-input').value;
    const outputDiv = document.getElementById('analysis-output');
    const msgDiv = document.getElementById('analyzer-message');

    outputDiv.innerHTML = '<p class="text-center text-gray-500">Analyzing content...</p>';
    msgDiv.classList.add('hidden');

    if (!content) {
        displayMessage('analyzer-message', 'Please paste content to analyze.', true);
        return;
    }

    const userQuery = content;
    
    const systemPrompt = `You are an expert academic assistant. Analyze the provided text and structure your response as a JSON object containing a 'summary' of the text (max 4 concise sentences), a list of 5 'keywords' or technical terms, and 3 'learningObjectives' suitable for an exam or lesson. Do NOT include any text outside the JSON object.`;

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    "summary": { "type": "STRING", "description": "A concise summary of the content (max 4 sentences)." },
                    "keywords": { "type": "ARRAY", "description": "5 key terms or concepts from the text.", "items": { "type": "STRING" } },
                    "learningObjectives": { "type": "ARRAY", "description": "3 potential learning objectives derived from the text (starting with 'Students will be able to...').", "items": { "type": "STRING" } }
                },
                "propertyOrdering": ["summary", "keywords", "learningObjectives"]
            }
        }
    };
    
    showLoading(true, 'analyzer');

    try {
        const response = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API call failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        let generatedData = null;

        if (jsonText) {
            generatedData = JSON.parse(jsonText);
            renderAnalysis(generatedData);
        } else {
            throw new Error("Invalid response format from Gemini API.");
        }

    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        displayMessage('analyzer-message', `Failed to analyze content: ${error.message}. Please try again.`);
        outputDiv.innerHTML = '<p class="text-center text-gray-500">Error analyzing content. See console for details.</p>';
    } finally {
        showLoading(false, 'analyzer');
    }
}

// --- RENDER HELPERS (Snipped for brevity, but retained full functions) ---
const renderGeneratedQuestion = (data) => { /* ... full function retained ... */
    const outputDiv = document.getElementById('generated-output');
    const markingSchemeItems = data.markingScheme.map(item => `
        <li class="p-2 border-b border-gray-100 last:border-b-0">${item}</li>
    `).join('');

    outputDiv.innerHTML = `
        <div class="bg-indigo-50 border-l-4 border-indigo-500 text-indigo-800 p-6 rounded-lg shadow-inner mb-6">
            <p class="text-lg font-bold">Topic: ${data.topic || 'N/A'}</p>
        </div>
        
        <h4 class="text-2xl font-bold text-gray-800 mb-4">Question (${data.points || '?'} Points)</h4>
        <div class="p-6 bg-white border border-gray-200 rounded-lg shadow-md mb-8">
            <p class="whitespace-pre-wrap text-lg">${data.questionText || 'Could not generate question text.'}</p>
        </div>

        <h4 class="text-xl font-bold text-green-700 mb-3">Draft Marking Scheme</h4>
        <ul class="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            ${markingSchemeItems}
        </ul>

        <button id="save-question-btn" class="mt-8 w-full py-3 px-4 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 transition-default shadow-md">
            Save Question to Exam
        </button>
    `;

    // Attach event listener to the dynamically created button
    document.getElementById('save-question-btn')?.addEventListener('click', async (e) => {
         const saveButton = e.currentTarget;
         saveButton.disabled = true;
         saveButton.textContent = 'Saving...';

         try {
            // For now, we'll save to a hardcoded "default-exam".
            // This would be dynamic in a full implementation.
            const examId = 'default-exam';
            const examRef = getExamDocRef(examId);

            const newQuestion = {
                ...data,
                id: `q_${Date.now()}`, // Simple unique ID
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Use arrayUnion to add the question to an array in the exam document.
            // This also initializes the document if it doesn't exist.
            await examRef.set({
                questions: firebase.firestore.FieldValue.arrayUnion(newQuestion),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }); // Use merge to avoid overwriting other exam fields

            displayMessage('generator-message', 'Question saved successfully to the exam!', false);
            saveButton.textContent = 'Saved!';
            saveButton.classList.replace('bg-green-500', 'bg-gray-400');

         } catch (error) {
            console.error("Failed to save question:", error);
            displayMessage('generator-message', `Error saving question: ${error.message}`, true);
            saveButton.disabled = false;
            saveButton.textContent = 'Save Question to Exam';
         }
    });
}

const renderAnalysis = (data) => { /* ... full function retained ... */
    const outputDiv = document.getElementById('analysis-output');
    
    const keywordsHtml = (data.keywords || []).map(k => `
        <span class="inline-block bg-indigo-100 text-indigo-800 text-sm font-medium mr-2 px-3 py-1 rounded-full">${k}</span>
    `).join('');

    const objectivesHtml = (data.learningObjectives || []).map(o => `
        <li class="flex items-start mb-2 text-gray-700">
            <svg class="flex-shrink-0 w-5 h-5 text-green-500 mt-1 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            ${o}
        </li>
    `).join('');

    outputDiv.innerHTML = `
        <div class="space-y-8">
            <!-- Summary Card -->
            <div class="p-6 bg-white rounded-xl shadow-md border-l-4 border-blue-500">
                <h4 class="text-xl font-bold text-blue-700 mb-2">Summary</h4>
                <p class="text-gray-700">${data.summary || 'Summary not available.'}</p>
            </div>

            <!-- Keywords -->
            <div class="p-6 bg-white rounded-xl shadow-md border-l-4 border-yellow-500">
                <h4 class="text-xl font-bold text-yellow-700 mb-3">Key Terminology</h4>
                <div class="flex flex-wrap gap-2">
                    ${keywordsHtml}
                </div>
            </div>

            <!-- Learning Objectives -->
            <div class="p-6 bg-white rounded-xl shadow-md border-l-4 border-green-500">
                <h4 class="text-xl font-bold text-green-700 mb-3">Suggested Learning Objectives</h4>
                <ul class="list-none space-y-3">
                    ${objectivesHtml}
                </ul>
            </div>
        </div>
    `;
}

const renderExamQuestionList = (questions = []) => {
    const listContainer = document.getElementById('exam-questions-list');
    if (!listContainer) return;

    if (questions.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                <p class="text-gray-500">No questions added yet.</p>
                <p class="text-sm text-gray-400 mt-1">Use the AI Question Generator to add questions to this exam.</p>
            </div>
        `;
        return;
    }

    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);
    document.getElementById('exam-total-points').textContent = totalPoints;

    listContainer.innerHTML = questions.map((q, index) => `
        <div class="p-4 bg-white border border-gray-200 rounded-lg shadow-sm mb-4">
            <div class="flex justify-between items-start">
                <p class="text-base text-gray-800 flex-grow pr-4">
                    <strong class="text-indigo-600">${index + 1}.</strong> ${q.questionText}
                </p>
                <div class="text-right flex-shrink-0">
                    <p class="font-bold text-lg text-gray-700">${q.points || 'N/A'}</p>
                    <p class="text-xs text-gray-500">Points</p>
                </div>
            </div>
             <p class="text-xs text-gray-400 mt-2">Topic: ${q.topic}</p>
        </div>
    `).join('');
};


// --- VIEW RENDERERS ---

const renderView = (viewName) => {
    if (viewName === 'Exam Builder') {
        renderExamBuilder();
    } else if (viewName === 'Auth') {
        renderAuthPage();
    } else if (viewName === 'Dashboard') {
        // The dashboard is rendered by the auth listener, but if navigated to, we need to ensure listeners are cleared.
        if (unsubscribeExamListener) {
            unsubscribeExamListener();
            unsubscribeExamListener = null;
        }
    } else {
         appContainer.innerHTML = `
            <div class="max-w-4xl mx-auto p-10 bg-white shadow-xl rounded-xl">
                <h2 class="text-4xl font-extrabold text-center text-indigo-700 mb-4">🚧 ${viewName} Module 🚧</h2>
                <p class="text-center text-xl text-gray-600">
                    This view is ready for development (Sprint 2+).
                </p>
                <div class="mt-6 text-center text-sm text-gray-500">
                    <p>Current features: Landing Page, Auth, Role Management, Dashboard, AI Tools (Question Generator & Content Analyzer).</p>
                </div>
            </div>
        `;
        // Clean up listeners when navigating to a generic/other view
        if (unsubscribeExamListener) {
            unsubscribeExamListener();
            unsubscribeExamListener = null;
        }
    }
};

// NEW: Landing Page Renderer
const renderLandingPage = () => {
     header.classList.add('hidden');
     appContainer.classList.remove('p-4', 'md:p-8');
     appContainer.innerHTML = `
        <div class="min-h-screen pt-16 pb-20 sm:pt-24 sm:pb-28 bg-gray-50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <p class="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-2">AI-POWERED ACADEMIC TOOLS</p>
                <h1 class="text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-tight mb-6 tracking-tighter">
                    Create <span class="text-indigo-600">Better Exams</span>, Faster.
                </h1>
                <p class="mt-3 max-w-3xl mx-auto text-xl text-gray-500 sm:mt-5 sm:text-2xl">
                    ExamPro uses Gemini AI to help teachers and markers draft high-quality questions, analyze source content, and streamline the grading process.
                </p>
                <div class="mt-10 max-w-md mx-auto sm:flex sm:justify-center md:mt-12 space-y-4 sm:space-y-0 sm:space-x-4">
                    <!-- Main CTA -->
                    <div class="rounded-xl shadow-xl transform transition duration-300 hover:scale-[1.02]">
                        <a href="#" id="cta-start" class="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-bold rounded-xl text-white cta-gradient hover:opacity-90 md:py-4 md:text-lg md:px-10">
                            Start Creating Exams
                        </a>
                    </div>
                    <!-- Secondary CTA -->
                    <a href="#" id="cta-signin" class="w-full flex items-center justify-center px-8 py-3 border-2 border-indigo-600 text-base font-bold rounded-xl text-indigo-600 bg-white hover:bg-indigo-50 md:py-4 md:text-lg md:px-10 transition duration-300">
                        Sign In
                    </a>
                    <!-- Install PWA Button -->
                    <button id="install-pwa-btn" class="hidden w-full flex items-center justify-center px-8 py-3 border-2 border-green-600 text-base font-bold rounded-xl text-green-600 bg-white hover:bg-green-50 md:py-4 md:text-lg md:px-10 transition duration-300">
                        Install App
                    </button>
                </div>
            </div>

            <!-- Features Showcase -->
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <!-- Feature 1 -->
                    <div class="p-6 bg-white rounded-xl shadow-2xl border-t-4 border-indigo-500">
                        <div class="p-3 inline-flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 mb-4">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-2">AI Question Generation</h3>
                        <p class="text-gray-500">Instantly generate diverse questions with integrated marking schemes based on your topic and desired difficulty.</p>
                    </div>
                    <!-- Feature 2 -->
                    <div class="p-6 bg-white rounded-xl shadow-2xl border-t-4 border-blue-500">
                        <div class="p-3 inline-flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-blue-600 mb-4">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-2">Content Analysis</h3>
                        <p class="text-gray-500">Paste in source material and instantly receive summaries, keywords, and measurable learning objectives.</p>
                    </div>
                    <!-- Feature 3 -->
                    <div class="p-6 bg-white rounded-xl shadow-2xl border-t-4 border-green-500">
                        <div class="p-3 inline-flex items-center justify-center h-12 w-12 rounded-full bg-green-100 text-green-600 mb-4">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-2">Collaborative Marking</h3>
                        <p class="text-gray-500">Use the integrated marking interface to streamline batch grading and maintain consistency across multiple markers.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // --- ATTACH EVENT LISTENERS FOR LANDING PAGE ---
    document.getElementById('cta-start')?.addEventListener('click', (e) => {
        e.preventDefault();
        renderView('Auth');
    });
    document.getElementById('cta-signin')?.addEventListener('click', (e) => {
        e.preventDefault();
        renderView('Auth');
    });
    document.getElementById('install-pwa-btn')?.addEventListener('click', installPWA);
};

const renderExamBuilder = () => { /* ... existing function retained ... */
    appContainer.classList.add('p-4', 'md:p-8');
    appContainer.innerHTML = `
        <div class="max-w-7xl mx-auto">
            <h2 class="text-4xl font-extrabold text-gray-900 mb-2">Exam Builder</h2>
            <p class="text-xl text-gray-600 mb-8">Draft questions with AI and build your exam in real-time.</p>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Left Column: AI Tools -->
                <div class="bg-white p-6 rounded-xl shadow-2xl border border-gray-100">
                    <!-- Tabs for features -->
                    <div class="flex border-b mb-6">
                        <button id="tab-generator" class="tab-button active">✨ AI Question Generator</button>
                        <button id="tab-analyzer" class="tab-button">📚 AI Content Analyzer</button>
                    </div>
                    
                    <!-- Generator Tab Content -->
                    <div id="tab-content-generator" class="tab-content">
                        <!-- Question Generator Sidebar -->
                        <div class="p-4 bg-gray-50 rounded-xl border border-gray-200 h-fit mb-6">
                            <h3 class="text-xl font-bold text-indigo-600 mb-3">Draft Question Parameters</h3>
                            <div class="space-y-4">
                                <div>
                                    <label for="topic-input" class="block text-sm font-medium text-gray-700">Topic/Concept</label>
                                    <input type="text" id="topic-input" placeholder="e.g., Photosynthesis C3 Cycle" class="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500 transition-default">
                                </div>
                                <div>
                                    <label for="difficulty-select" class="block text-sm font-medium text-gray-700">Difficulty</label>
                                    <select id="difficulty-select" class="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500 transition-default bg-white">
                                        <option value="easy">Easy (Recall)</option>
                                        <option value="moderate" selected>Moderate (Application)</option>
                                        <option value="hard">Hard (Synthesis/Evaluation)</option>
                                    </select>
                                </div>
                                <div>
                                    <label for="style-input" class="block text-sm font-medium text-gray-700">Question Style Hint</label>
                                    <input type="text" id="style-input" placeholder="e.g., Short answer, graph analysis" class="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500 transition-default">
                                </div>
                                <button id="generate-btn" class="w-full py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-indigo-500 transition-default flex items-center justify-center">
                                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    <span>✨ Generate Question</span>
                                </button>
                                <p id="generator-message" class="hidden"></p>
                            </div>
                        </div>
                        <!-- Generated Content Display -->
                        <div>
                            <h3 class="text-2xl font-bold text-gray-800 mb-4">Generated Question Draft</h3>
                            <div id="generated-output" class="min-h-[200px] p-6 bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500">
                                Enter parameters and click 'Generate' to see the result.
                            </div>
                        </div>
                    </div>

                    <!-- Analyzer Tab Content -->
                    <div id="tab-content-analyzer" class="tab-content hidden">
                        <div class="p-4 bg-gray-50 rounded-xl border border-gray-200 h-fit mb-6">
                            <h3 class="text-xl font-bold text-indigo-600 mb-3">Source Content Input</h3>
                            <p class="text-sm text-gray-600 mb-4">Paste text to analyze.</p>
                            <textarea id="content-input" rows="8" placeholder="Paste your text here..." class="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500 transition-default"></textarea>
                            <button id="analyze-btn" class="mt-4 w-full py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-blue-500 transition-default flex items-center justify-center">
                                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <span>📚 Analyze Content</span>
                            </button>
                            <p id="analyzer-message" class="hidden"></p>
                        </div>
                        <div>
                            <h3 class="text-2xl font-bold text-gray-800 mb-4">AI Analysis Results</h3>
                            <div id="analysis-output" class="min-h-[200px] p-6 bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500">
                                Paste content and click 'Analyze' to see the results.
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right Column: Current Exam Questions -->
                <div class="bg-white p-6 rounded-xl shadow-2xl border border-gray-100">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-2xl font-bold text-gray-800">Current Exam Questions</h3>
                        <div class="text-right">
                            <p class="font-extrabold text-3xl text-indigo-600" id="exam-total-points">0</p>
                            <p class="text-sm text-gray-500">Total Points</p>
                        </div>
                    </div>
                    <div id="exam-questions-list" class="space-y-4">
                        <!-- Questions will be rendered here by the listener -->
                    </div>
                </div>
            </div>
        </div>
    `;
    // Set up event listeners and initialize tabs
    document.getElementById('generate-btn').addEventListener('click', generateQuestion);
    document.getElementById('analyze-btn').addEventListener('click', analyzeContent);
    setupTabs();

    // --- ATTACH REAL-TIME LISTENER FOR EXAM QUESTIONS ---
    const examId = 'default-exam';
    const examRef = getExamDocRef(examId);

    // Detach any existing listener before attaching a new one
    if (unsubscribeExamListener) {
        unsubscribeExamListener();
    }

    unsubscribeExamListener = examRef.onSnapshot((doc) => {
        const examData = doc.data();
        renderExamQuestionList(examData?.questions || []);
    });
};


const renderAuthPage = () => {
    header.classList.add('hidden');
    appContainer.classList.add('p-4', 'md:p-8');
    appContainer.innerHTML = `
        <div class="max-w-md mx-auto mt-10 p-8 bg-white shadow-2xl rounded-xl border border-gray-100 transition-default">
            <h2 class="text-4xl font-bold text-center mb-8 text-indigo-700">ExamPro Login</h2>
            <form id="auth-form" class="space-y-6">
                <div>
                    <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" id="email" required placeholder="name@school.edu"
                        class="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500 transition-default">
                </div>
                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
                    <input type="password" id="password" required placeholder="••••••••"
                        class="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500 transition-default">
                </div>
                <button type="submit" id="login-btn"
                    class="w-full py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-indigo-500 transition-default">
                    Sign In (Admin/Teacher/Marker)
                </button>
                <p id="auth-message" class="hidden"></p>
                <div class="mt-4 text-center">
                    <a href="#" id="back-to-landing-link" class="text-sm text-gray-500 hover:text-gray-700">Back to Home</a>
                </div>
            </form>
        </div>
    `;

    document.getElementById('auth-form').addEventListener('submit', handleLogin);
    // Attach listener for the "Back to Home" link
    document.getElementById('back-to-landing-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        renderLandingPage();
    });
};

const renderDashboard = (user) => {
    header.classList.remove('hidden');
    appContainer.classList.add('p-4', 'md:p-8');

    // 1. Navigation Links (Role-based)
    let navLinks = '';
    const allNavLinks = [
        { role: ['admin', 'teacher'], view: 'Exam Builder' },
        { role: ['admin', 'marker'], view: 'Marking Interface' },
        { role: ['admin'], view: 'Admin Panel' }
    ];

    allNavLinks.forEach(link => {
        if (link.role.includes(user.role)) {
            navLinks += `<a href="#" data-view="${link.view}" class="text-gray-600 hover:text-indigo-600 px-3 py-1 rounded-md hover:bg-gray-100 transition-default">${link.view}</a>`;
        }
    });
    // Add a link back to the dashboard
    nav.innerHTML = `<a href="#" data-view="Dashboard" class="text-gray-600 hover:text-indigo-600 px-3 py-1 rounded-md hover:bg-gray-100 transition-default">Dashboard</a>` + navLinks;
    nav.querySelectorAll('[data-view="Dashboard"]').forEach(link => link.addEventListener('click', (e) => {
        e.preventDefault();
        renderDashboard(user);
    }));
    nav.innerHTML = navLinks;

    // 2. User Status
    userStatusDiv.innerHTML = `
        <span class="px-3 py-1 rounded-full text-xs font-semibold ${user.role === 'admin' ? 'bg-red-100 text-red-700' : user.role === 'teacher' ? 'bg-blue-100 text-blue-700' : user.role === 'marker' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}">
            ${user.role.toUpperCase()}
        </span>
        <span class="text-sm font-medium text-gray-700">${user.displayName}</span>
        <button id="logout-btn" class="py-1 px-3 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-default shadow-sm">Logout</button>
    `;
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // 3. Dashboard Content
    
    appContainer.innerHTML = `
        <div class="max-w-6xl mx-auto">
            <h2 class="text-4xl font-extrabold text-gray-900 mb-8">Welcome, ${user.displayName}!</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                ${user.role === 'teacher' || user.role === 'admin' ? `
                    <div class="card" data-view="Exam Builder">
                        <h3 class="text-2xl font-semibold mb-2 text-indigo-700">Create Exam</h3>
                        <p class="text-gray-600">Draft, version, and publish new exam papers. (Includes AI Generator & Analyzer!)</p>
                        <p class="text-xs text-gray-400 mt-2">Sprint 2 Feature</p>
                    </div>
                ` : ''}
                ${user.role === 'marker' || user.role === 'admin' ? `
                    <div class="card" data-view="Marking Interface">
                        <h3 class="text-2xl font-semibold mb-2 text-green-700">Grade Attempts</h3>
                        <p class="text-gray-600">Mark student submissions and finalize grades.</p>
                        <p class="text-xs text-gray-400 mt-2">Sprint 4 Feature</p>
                    </div>
                ` : ''}
                ${user.role === 'admin' ? `
                    <div class="card" data-view="Admin Panel">
                        <h3 class="text-2xl font-semibold mb-2 text-red-700">User Management</h3>
                        <p class="text-gray-600">Manage user roles, audit logs, and system settings.</p>
                        <p class="text-xs text-gray-400 mt-2">Sprint 6 Feature</p>
                    </div>
                ` : ''}
                 <div class="card" data-view="Reports">
                        <h3 class="text-2xl font-semibold mb-2 text-yellow-700">Analytics</h3>
                        <p class="text-gray-600">View exam statistics, distributions, and item analysis.</p>
                        <p class="text-xs text-gray-400 mt-2">Sprint 5 Feature</p>
                    </div>
            </div>
            
            <section id="exam-summary-section" class="mt-12 p-6 bg-white rounded-xl shadow-lg border border-gray-100">
                <h3 class="text-2xl font-bold text-gray-800 mb-4">Exam Summary</h3>
                <div class="p-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <svg class="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                    <p class="mt-3 text-lg font-medium text-gray-900">No Exam Data Loaded</p>
                    <p class="mt-1 text-sm text-gray-500">
                        This section is ready to display real-time exam data. To proceed, we need to implement Firestore listeners to the **'exams'** collection (which should be stored under the **public** path for multi-user access).
                    </p>
                </div>
            </section>
        </div>
        <style>
            .card {
                background-color: white;
                padding: 1.5rem;
                border-radius: 0.75rem;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
                border-left: 5px solid theme('colors.indigo.500');
                cursor: pointer;
                transition: all 0.3s ease;
            }
            .card:hover {
                transform: translateY(-4px);
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
            }
        </style>
    `;

    // Attach event listeners for internal navigation
    appContainer.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', (e) => {
            const view = card.getAttribute('data-view');
            renderView(view);
                });
            });
            nav.querySelectorAll('[data-view]').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const view = e.target.getAttribute('data-view');
                    renderView(view);
        });
    });
    nav.querySelectorAll('[data-view]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = e.target.getAttribute('data-view');
            renderView(view);
        });
    });
};

// --- FIREBASE AUTH HANDLERS ---

const handleLogin = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    displayMessage('auth-message', '', false);
    
    // NOTE: Non-student users (Admin, Teacher, Marker) MUST use this login path
    // with credentials pre-registered by an admin.

    try {
        showLoading(true, 'application');
        await auth.signInWithEmailAndPassword(email, password);
        // onAuthStateChanged listener will handle redirection
    } catch (error) {
        console.error("Login failed:", error.code, error.message);
        displayMessage('auth-message', `Sign In failed: ${error.message}`);
        showLoading(false, 'application');
    }
};

const handleSignup = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    displayMessage('auth-message', '', false);
    
    // SECURITY ENFORCEMENT: ONLY public student registration is allowed here.
    const defaultRole = 'student'; 
    const displayName = email.split('@')[0].split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
    
    if (!email || !password || password.length < 6) {
        displayMessage('auth-message', "Please enter a valid email and a password of at least 6 characters.");
        return;
    }

    try {
        showLoading(true, 'application');
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        const userProfileDocRef = getUserProfileDocRef(user.uid);

        // 1. Update profile with display name
        await user.updateProfile({ displayName: displayName });

        // 2. Create the user document in Firestore with the fixed 'student' role
        await userProfileDocRef.set({
            displayName: displayName,
            email: user.email,
            role: defaultRole, // This is the enforcement point: all public signups are 'student'
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        displayMessage('auth-message', `Success! Account created with role: ${defaultRole}. Signing in...`, false);
        // The listener will handle the final sign-in state
    } catch (error) {
        console.error("Signup failed:", error.code, error.message);
        displayMessage('auth-message', `Signup failed: ${error.message}`);
        showLoading(false, 'application');
    }
};

const handleLogout = async () => {
    try {
        await auth.signOut();
    } catch (error) {
        console.error("Logout failed:", error);
    }
};

/**
 * Attempts to sign the user in using the initial custom token or anonymously.
 */
const initialAuthentication = async () => {
     try {
        if (initialAuthToken) {
            await auth.signInWithCustomToken(initialAuthToken);
        } else {
            // Sign in anonymously to ensure a user object exists for the session
            await auth.signInAnonymously();
        }
    } catch (error) {
        console.error("Initial authentication failed:", error);
        // Fallback to landing page if token fails
        renderLandingPage();
        showLoading(false, 'application');
    }
};


// --- AUTH STATE LISTENER (CORE LOGIC) ---

/**
 * Main function to handle user state, fetch role, and render the appropriate view.
 */
auth.onAuthStateChanged(async (user) => {
    showLoading(true, 'application');
    if (user && !user.isAnonymous) { // Check if a real user is signed in
        try {
            // Fetch user role
            const userDoc = await getUserProfileDocRef(user.uid).get();

            if (userDoc.exists) {
                const userData = userDoc.data();
                const fullUser = {
                    uid: user.uid,
                    displayName: user.displayName || userData.displayName,
                    role: userData.role,
                    ...userData
                };
                console.log("User authorized:", fullUser.role);
                renderDashboard(fullUser);
            } else {
                // Logged in user with no profile (e.g., failed signup, but auth object exists), force to login to re-authenticate or signup
                console.warn("User document missing. Directing to Auth page.");
                renderAuthPage();
            }
        } catch (error) {
            console.error("Error fetching user role or data:", error);
            // Clean up listeners on error
            if (unsubscribeExamListener) {
                unsubscribeExamListener();
                unsubscribeExamListener = null;
            }
            renderAuthPage(); 
        }
    } else {
        // User is signed out OR anonymously signed in. Show the Landing Page.
        renderLandingPage();
    }
    showLoading(false, 'application');
    // Clean up listeners on auth state change to signed out
    if (!user && unsubscribeExamListener) {
        unsubscribeExamListener();
        unsubscribeExamListener = null;
    }
});

// Register service worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('Service Worker registered successfully:', registration);
            })
            .catch((error) => {
                console.log('Service Worker registration failed:', error);
            });
    });
}

// PWA Install Prompt Handling
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Show install button if on landing page
    const installBtn = document.getElementById('install-pwa-btn');
    if (installBtn) installBtn.classList.remove('hidden');
});

window.addEventListener('appinstalled', (e) => {
    console.log('PWA was installed');
    deferredPrompt = null;
    // Hide install button
    const installBtn = document.getElementById('install-pwa-btn');
    if (installBtn) installBtn.classList.add('hidden');
});

// Function to trigger PWA install
const installPWA = async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to install prompt: ${outcome}`);
        deferredPrompt = null;
    }
};

// Start the initial authentication process immediately
initialAuthentication();