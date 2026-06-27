//========================================================================
// UHV MCQ PREMIUM TEST - CLIENT SIDE BACKEND
// script.js
//========================================================================

// Application State
let questions = [];        // Holds all 150 questions loaded from JSON
let activeQuestions = [];  // Sliced set of 30 questions for the current test
let currentQuestion = 0;   // Current question pointer (0-29)
let userAnswers = [];      // Tracks user choices (selected option indices)
let activeSetIndex = 0;    // Index of the set being taken (0 to 4)
let isSignUpMode = false;  // Auth form state toggle

// DOM Elements - Screens
const authScreen = document.getElementById("authScreen");
const dashboardScreen = document.getElementById("dashboardScreen");
const quizScreen = document.getElementById("quizScreen");
const resultScreen = document.getElementById("resultScreen");
const reviewScreen = document.getElementById("reviewScreen");

// DOM Elements - Auth Section
const authTitle = document.getElementById("authTitle");
const nameField = document.getElementById("nameField");
const authNameInput = document.getElementById("authName");
const authEmailInput = document.getElementById("authEmail");
const authPasswordInput = document.getElementById("authPassword");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const authSwitchText = document.getElementById("authSwitchText");
const authSwitchLink = document.getElementById("authSwitchLink");
const authError = document.getElementById("authError");

// DOM Elements - Dashboard Section
const userNameSpan = document.getElementById("userName");
const logoutBtn = document.getElementById("logoutBtn");
const statCompleted = document.getElementById("statCompleted");
const statAvgScore = document.getElementById("statAvgScore");
const statNextSet = document.getElementById("statNextSet");
const startSetBtn = document.getElementById("startSetBtn");
const toggleHistoryBtn = document.getElementById("toggleHistoryBtn");
const historySection = document.getElementById("historySection");
const historyTableBody = document.getElementById("historyTableBody");

// DOM Elements - Profile Menu Dropdown
const profileTrigger = document.getElementById("profileTrigger");
const profileDropdown = document.getElementById("profileDropdown");
const userAvatar = document.getElementById("userAvatar");
const dropdownAvatar = document.getElementById("dropdownAvatar");
const dropdownName = document.getElementById("dropdownName");
const dropdownEmail = document.getElementById("dropdownEmail");
const dropdownSet = document.getElementById("dropdownSet");

// DOM Elements - Quiz Section
const questionText = document.getElementById("questionText");
const optionsContainer = document.getElementById("optionsContainer");
const currentQuestionNumber = document.getElementById("currentQuestion");
const questionCount = document.getElementById("questionCount");
const progressBar = document.getElementById("progressBar");
const liveScore = document.getElementById("liveScore");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");
const quitQuizBtn = document.getElementById("quitQuizBtn");

// DOM Elements - Result Section
const correctAnswers = document.getElementById("correctAnswers");
const wrongAnswers = document.getElementById("wrongAnswers");
const percentage = document.getElementById("percentage");
const statusText = document.getElementById("status");
const resultTotal = document.getElementById("resultTotal");
const resultDashboardBtn = document.getElementById("resultDashboardBtn");
const restartBtn = document.getElementById("restartBtn");
const reviewBtn = document.getElementById("reviewBtn");

// DOM Elements - Review Section
const reviewContainer = document.getElementById("reviewContainer");
const backResultBtn = document.getElementById("backResultBtn");
const reviewDashboardBtn = document.getElementById("reviewDashboardBtn");

// DOM Elements - Custom Modal Section
const customModal = document.getElementById("customModal");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalCancelBtn = document.getElementById("modalCancelBtn");
const modalConfirmBtn = document.getElementById("modalConfirmBtn");

let activeConfirmCallback = null;

function showConfirm(title, message, onConfirm) {
    modalTitle.innerText = title;
    modalMessage.innerText = message;
    modalCancelBtn.style.display = "inline-block";
    customModal.classList.remove("hidden");
    activeConfirmCallback = onConfirm;
}

function showAlert(title, message) {
    modalTitle.innerText = title;
    modalMessage.innerText = message;
    modalCancelBtn.style.display = "none";
    customModal.classList.remove("hidden");
    activeConfirmCallback = null;
}

modalConfirmBtn.onclick = function() {
    customModal.classList.add("hidden");
    if (activeConfirmCallback) {
        activeConfirmCallback();
        activeConfirmCallback = null;
    }
};

modalCancelBtn.onclick = function() {
    customModal.classList.add("hidden");
    activeConfirmCallback = null;
};

// ==========================================
// 1. DATABASE & SESSION SERVICE
// ==========================================

function getLoggedInUser() {
    const userStr = localStorage.getItem("uhv_premium_session_user");
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch(e) {
        return null;
    }
}

function setLoggedInUser(user) {
    if (user) {
        localStorage.setItem("uhv_premium_session_user", JSON.stringify(user));
    } else {
        localStorage.removeItem("uhv_premium_session_user");
    }
}

// ==========================================
// 2. AUTHENTICATION FLOW
// ==========================================

// Switch between Login and Sign Up UI
authSwitchLink.onclick = function() {
    isSignUpMode = !isSignUpMode;
    if (isSignUpMode) {
        authTitle.innerText = "Create Your Account";
        nameField.style.display = "block";
        authSubmitBtn.innerText = "Sign Up";
        authSwitchText.innerHTML = 'Already have an account? <span id="authSwitchLink" style="cursor:pointer; text-decoration:underline; color:#2563eb;">Login</span>';
    } else {
        authTitle.innerText = "Login to Your Account";
        nameField.style.display = "none";
        authSubmitBtn.innerText = "Login";
        authSwitchText.innerHTML = 'Don\'t have an account? <span id="authSwitchLink" style="cursor:pointer; text-decoration:underline; color:#2563eb;">Sign Up</span>';
    }
    // Re-bind the click listener because innerHTML was updated
    document.getElementById("authSwitchLink").onclick = authSwitchLink.onclick;
    clearAuthFields();
};

function clearAuthFields() {
    authNameInput.value = "";
    authEmailInput.value = "";
    authPasswordInput.value = "";
    authError.classList.add("hidden");
    authError.innerText = "";
}

function showAuthError(msg) {
    authError.innerText = msg;
    authError.classList.remove("hidden");
}

// Login/Signup Submit Handler
authSubmitBtn.onclick = function() {
    const email = authEmailInput.value.trim().toLowerCase();
    const password = authPasswordInput.value.trim();
    const name = authNameInput.value.trim();
    
    if (!email || !password || (isSignUpMode && !name)) {
        showAuthError("All fields are required.");
        return;
    }
    
    const url = isSignUpMode ? "/api/auth/signup" : "/api/auth/login";
    const payload = { email, password };
    if (isSignUpMode) {
        payload.name = name;
    }
    
    authSubmitBtn.disabled = true;
    authSubmitBtn.innerText = "Please wait...";
    
    fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => { throw new Error(err.error || "Authentication failed."); });
        }
        return res.json();
    })
    .then(user => {
        setLoggedInUser(user);
        showDashboard();
    })
    .catch(err => {
        showAuthError(err.message);
    })
    .finally(() => {
        authSubmitBtn.disabled = false;
        authSubmitBtn.innerText = isSignUpMode ? "Sign Up" : "Login";
    });
};

// Logout Button Handler
logoutBtn.onclick = function() {
    setLoggedInUser(null);
    showAuth();
};

// ==========================================
// 3. NAVIGATION ROUTER & PROFILE DROPDOWN
// ==========================================

function getInitials(name) {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1][0] || "")).toUpperCase();
}

// Toggle Profile Dropdown
profileTrigger.onclick = function(e) {
    e.stopPropagation();
    profileDropdown.classList.toggle("hidden");
};

// Close dropdown when clicking outside
document.addEventListener("click", function(e) {
    if (!profileDropdown.classList.contains("hidden") && !profileTrigger.contains(e.target)) {
        profileDropdown.classList.add("hidden");
    }
});

function hideAllScreens() {
    authScreen.classList.add("hidden");
    dashboardScreen.classList.add("hidden");
    quizScreen.classList.add("hidden");
    resultScreen.classList.add("hidden");
    reviewScreen.classList.add("hidden");
}

function showAuth() {
    hideAllScreens();
    authScreen.classList.remove("hidden");
    clearAuthFields();
}

function showDashboard() {
    hideAllScreens();
    dashboardScreen.classList.remove("hidden");
    
    const user = getLoggedInUser();
    if (!user) {
        showAuth();
        return;
    }
    
    userNameSpan.innerText = user.name;
    
    // Update Profile Dropdown Details
    const initials = getInitials(user.name);
    userAvatar.innerText = initials;
    dropdownAvatar.innerText = initials;
    dropdownName.innerText = user.name;
    dropdownEmail.innerText = user.email;
    dropdownSet.innerText = `Set ${user.currentSetIndex + 1}`;
    
    // Update Stats Display
    statCompleted.innerText = user.history.length;
    
    if (user.history.length > 0) {
        const sumPercent = user.history.reduce((sum, item) => sum + parseFloat(item.percent), 0);
        const avg = (sumPercent / user.history.length).toFixed(2);
        statAvgScore.innerText = avg + "%";
    } else {
        statAvgScore.innerText = "0%";
    }
    
    const nextSetIdx = user.currentSetIndex;
    const startQ = (nextSetIdx * 30) + 1;
    const endQ = (nextSetIdx * 30) + 30;
    statNextSet.innerText = `Set ${nextSetIdx + 1} (Q${startQ}-${endQ})`;
    
    renderHistory();
}

// Render Table History
function renderHistory() {
    const user = getLoggedInUser();
    historyTableBody.innerHTML = "";
    
    if (!user || user.history.length === 0) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="5" style="text-align:center; padding: 20px; color:#aaa;">No attempts recorded yet.</td>`;
        historyTableBody.appendChild(tr);
        return;
    }
    
    // Show attempts in reverse chronological order (newest first)
    [...user.history].reverse().forEach(item => {
        const tr = document.createElement("tr");
        const dateObj = new Date(item.date);
        const dateStr = dateObj.toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        const statusClass = item.status === "PASS" ? "pass" : "fail";
        
        tr.innerHTML = `
            <td>${dateStr}</td>
            <td>Set ${item.setIndex + 1}</td>
            <td>${item.score} / ${item.total}</td>
            <td>${item.percent}%</td>
            <td class="${statusClass}" style="font-weight:bold;">${item.status}</td>
        `;
        historyTableBody.appendChild(tr);
    });
}

// Toggle History Panel Visibility
toggleHistoryBtn.onclick = function() {
    if (historySection.classList.contains("hidden")) {
        historySection.classList.remove("hidden");
        toggleHistoryBtn.innerText = "Hide History";
    } else {
        historySection.classList.add("hidden");
        toggleHistoryBtn.innerText = "View History";
    }
};

// ==========================================
// 4. QUIZ ENGINE (30-Question Sets)
// ==========================================

// Trigger quiz from active set
startSetBtn.onclick = function() {
    const user = getLoggedInUser();
    if (!user) return;
    startQuiz(user.currentSetIndex);
};

function startQuiz(setIndex) {
    if (questions.length === 0) {
        alert("Questions data is loading. Please wait...");
        return;
    }
    
    activeSetIndex = setIndex;
    
    // Slices 30 questions based on the active set index
    const startIndex = setIndex * 30;
    activeQuestions = questions.slice(startIndex, startIndex + 30);
    
    if (activeQuestions.length === 0) {
        alert("System Error: Question partition failed.");
        return;
    }
    
    currentQuestion = 0;
    userAnswers = new Array(activeQuestions.length).fill(null);
    
    // Set counter configurations
    questionCount.innerText = activeQuestions.length;
    resultTotal.innerText = activeQuestions.length;
    
    hideAllScreens();
    quizScreen.classList.remove("hidden");
    
    loadQuestion();
}

function loadQuestion() {
    let q = activeQuestions[currentQuestion];
    currentQuestionNumber.innerText = currentQuestion + 1;
    questionText.innerText = q.question;
    optionsContainer.innerHTML = "";
    
    q.options.forEach((option, index) => {
        let div = document.createElement("div");
        div.className = "option";
        div.innerHTML = option;
        
        if (userAnswers[currentQuestion] === index) {
            div.classList.add("selected");
        }
        
        div.onclick = function() {
            selectOption(index);
        };
        optionsContainer.appendChild(div);
    });
    
    updateProgress();
    checkButtons();
    calculateScore();
}

function selectOption(index) {
    userAnswers[currentQuestion] = index;
    
    let options = document.querySelectorAll(".option");
    options.forEach(op => {
        op.classList.remove("selected");
    });
    options[index].classList.add("selected");
    
    calculateScore();
}

function calculateScore() {
    let score = 0;
    for (let i = 0; i < activeQuestions.length; i++) {
        if (userAnswers[i] === activeQuestions[i].answer) {
            score++;
        }
    }
    liveScore.innerText = score;
}

function updateProgress() {
    let percent = ((currentQuestion + 1) / activeQuestions.length) * 100;
    progressBar.style.width = percent + "%";
}

function checkButtons() {
    // Show/Hide Previous Button
    if (currentQuestion === 0) {
        prevBtn.style.display = "none";
    } else {
        prevBtn.style.display = "inline-block";
    }
    
    // Toggle Next vs. Submit Buttons on the last question
    if (currentQuestion === activeQuestions.length - 1) {
        nextBtn.style.display = "none";
        submitBtn.style.display = "inline-block";
    } else {
        nextBtn.style.display = "inline-block";
        submitBtn.style.display = "none";
    }
}

// Navigation Controls
prevBtn.onclick = function() {
    if (currentQuestion > 0) {
        currentQuestion--;
        loadQuestion();
    }
};

nextBtn.onclick = function() {
    if (currentQuestion < activeQuestions.length - 1) {
        currentQuestion++;
        loadQuestion();
    }
};

// Keyboard Arrow Support
document.addEventListener("keydown", function(e) {
    if (quizScreen.classList.contains("hidden")) return;
    
    if (e.key === "ArrowRight" && currentQuestion < activeQuestions.length - 1) {
        currentQuestion++;
        loadQuestion();
    }
    if (e.key === "ArrowLeft" && currentQuestion > 0) {
        currentQuestion--;
        loadQuestion();
    }
});

// Quit quiz safely
quitQuizBtn.onclick = function() {
    showConfirm(
        "Quit Test?",
        "Are you sure you want to quit the test? Your responses on this set will not be saved.",
        function() {
            showDashboard();
        }
    );
};

// ==========================================
// 5. TEST SUBMISSION & SCORES LOGGING
// ==========================================

submitBtn.onclick = function() {
    let finalScore = 0;
    for (let i = 0; i < activeQuestions.length; i++) {
        if (userAnswers[i] === activeQuestions[i].answer) {
            finalScore++;
        }
    }
    
    const user = getLoggedInUser();
    if (!user) return;
    
    const percent = ((finalScore / activeQuestions.length) * 100).toFixed(2);
    const wrong = activeQuestions.length - finalScore;
    const status = percent >= 40 ? "PASS" : "FAIL";
    
    // Record attempt details
    const attempt = {
        date: new Date().toISOString(),
        setIndex: activeSetIndex,
        score: finalScore,
        total: activeQuestions.length,
        percent: percent,
        status: status
    };
    
    submitBtn.disabled = true;
    submitBtn.innerText = "Saving...";
    
    fetch("/api/users/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: user.email,
            attempt: attempt,
            activeSetIndex: activeSetIndex
        })
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to save history in database.");
        return res.json();
    })
    .then(updatedUser => {
        setLoggedInUser(updatedUser);
        
        // Update Results Display
        correctAnswers.innerText = finalScore;
        wrongAnswers.innerText = wrong;
        percentage.innerText = percent + "%";
        
        if (status === "PASS") {
            statusText.innerText = "PASS 🎉";
            statusText.style.color = "var(--color-success)";
        } else {
            statusText.innerText = "FAIL ❌";
            statusText.style.color = "var(--color-danger)";
        }
        
        hideAllScreens();
        resultScreen.classList.remove("hidden");
    })
    .catch(err => {
        showAlert("Database Error", "Your score could not be saved to MongoDB: " + err.message);
    })
    .finally(() => {
        submitBtn.disabled = false;
        submitBtn.innerText = "Submit Test";
    });
    
    hideAllScreens();
    resultScreen.classList.remove("hidden");
};

// Result Screen Buttons
resultDashboardBtn.onclick = function() {
    showDashboard();
};

restartBtn.onclick = function() {
    startQuiz(activeSetIndex);
};

// Mistakes Review Engine
reviewBtn.onclick = function() {
    hideAllScreens();
    reviewScreen.classList.remove("hidden");
    reviewContainer.innerHTML = "";
    
    for (let i = 0; i < activeQuestions.length; i++) {
        if (userAnswers[i] !== activeQuestions[i].answer) {
            let card = document.createElement("div");
            card.className = "reviewCard";
            
            const userAns = userAnswers[i] == null
                ? "Not Answered"
                : activeQuestions[i].options[userAnswers[i]];
            const correctAns = activeQuestions[i].options[activeQuestions[i].answer];
            
            card.innerHTML = `
                <h3>Question ${i + 1}</h3>
                <p><b>${activeQuestions[i].question}</b></p>
                <p class="wrongAnswer">Your Answer: ${userAns}</p>
                <p class="correctAnswer">Correct Answer: ${correctAns}</p>
            `;
            reviewContainer.appendChild(card);
        }
    }
    
    if (reviewContainer.innerHTML === "") {
        reviewContainer.innerHTML = "<h2 style='text-align:center; color:#69f0ae; padding: 30px;'>🎉 Excellent! No incorrect answers to review.</h2>";
    }
};

backResultBtn.onclick = function() {
    hideAllScreens();
    resultScreen.classList.remove("hidden");
};

reviewDashboardBtn.onclick = function() {
    showDashboard();
};

// ==========================================
// 6. INIT LIFECYCLE
// ==========================================

// Load Questions on Boot
fetch("/api/questions")
    .then(res => res.json())
    .then(data => {
        questions = data;
        const user = getLoggedInUser();
        if (user) {
            showDashboard();
        }
    })
    .catch(() => {
        showAlert("Connection Error", "Failed to fetch questions from the MongoDB backend server.");
    });

window.onload = function() {
    const user = getLoggedInUser();
    if (user) {
        showDashboard();
    } else {
        showAuth();
    }
};