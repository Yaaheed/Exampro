document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');
    const messageDiv = document.getElementById('message');
    const forgotPassword = document.getElementById('forgotPassword');

    // Social login elements removed

    // Enhanced form switching with advanced animations
    showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        animateFormSwitch('login-form', 'register-form');
    });

    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        animateFormSwitch('register-form', 'login-form');
    });

    function animateFormSwitch(fromForm, toForm) {
        const from = document.getElementById(fromForm);
        const to = document.getElementById(toForm);

        // Add enhanced exit animation
        from.style.animation = 'fadeOut 0.4s ease-out, slideOutLeft 0.4s ease-out';
        from.style.transformOrigin = 'center';

        setTimeout(() => {
            from.style.display = 'none';
            to.style.display = 'block';
            // Add enhanced entrance animation
            to.style.animation = 'fadeIn 0.5s ease-in, slideInRight 0.5s ease-in, bounceIn 0.6s ease-out 0.2s both';
            to.style.transformOrigin = 'center';

            // Add particle effect on form switch
            createParticleEffect();
        }, 400);
    }

    function createParticleEffect() {
        const container = document.querySelector('.container');
        for (let i = 0; i < 10; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 2 + 's';
            container.appendChild(particle);

            setTimeout(() => {
                particle.remove();
            }, 3000);
        }
    }

    // Password confirmation validation
    const confirmPassword = document.getElementById('registerConfirmPassword');
    confirmPassword.addEventListener('input', () => {
        const password = document.getElementById('registerPassword').value;
        if (confirmPassword.value !== password) {
            confirmPassword.setCustomValidity('Passwords do not match');
        } else {
            confirmPassword.setCustomValidity('');
        }
    });

    // Role selection (removed as only students can register publicly)

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const button = loginForm.querySelector('button');
        const originalHTML = button.innerHTML;

        // Enhanced loading animation
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
        button.disabled = true;
        button.style.animation = 'heartbeat 1s infinite';

        // Add ripple effect
        createRippleEffect(button);

        try {
            // Delete any existing session first
            try {
                await account.deleteSession('current');
            } catch (error) {
                // Ignore error if no session exists
            }
            const session = await account.createEmailSession(email, password);
            // Get user details to determine role
            const user = await account.get();
            const role = user.prefs.role || 'student';
            console.log('User role from prefs:', role, 'User ID:', user.$id); // Debug log
            messageDiv.textContent = `Welcome back, ${user.name || user.email}! Redirecting to ${role} dashboard...`;
            messageDiv.className = 'success';
            messageDiv.style.animation = 'slideIn 0.5s ease-out, rainbow 2s ease-in-out infinite';

            // Success particle effect
            createSuccessParticles();

            setTimeout(() => redirectToDashboard(role), 1500);
        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = 'Login failed: ' + error.message;

            // Provide more specific error messages
            if (error.message.includes('Invalid credentials')) {
                errorMessage = 'Invalid email or password. Please check your credentials and try again.';
            } else if (error.message.includes('User not found')) {
                errorMessage = 'Account not found. Please check your email or register a new account.';
            } else if (error.message.includes('Too many requests')) {
                errorMessage = 'Too many login attempts. Please wait a few minutes before trying again.';
            }

            messageDiv.textContent = errorMessage;
            messageDiv.className = 'error';
            messageDiv.style.animation = 'shake 0.5s ease-in-out, wiggle 0.5s ease-in-out 0.5s';
            button.innerHTML = originalHTML;
            button.disabled = false;
            button.style.animation = '';

            // Error shake effect on form
            loginForm.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                loginForm.style.animation = '';
            }, 500);
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const button = registerForm.querySelector('button');
        const originalHTML = button.innerHTML;

        // Enhanced loading animation
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
        button.disabled = true;
        button.style.animation = 'heartbeat 1s infinite';

        // Add ripple effect
        createRippleEffect(button);

        try {
            await account.create(ID.unique(), email, password, name);
            // Set role to student (only students can register publicly)
            await account.updatePrefs({ role: 'student' });
            messageDiv.textContent = 'Student account created successfully! Welcome to ExamPro!';
            messageDiv.className = 'success';
            messageDiv.style.animation = 'slideIn 0.5s ease-out, rainbow 2s ease-in-out infinite';

            // Success particle effect
            createSuccessParticles();

            setTimeout(() => {
                animateFormSwitch('register-form', 'login-form');
                messageDiv.textContent = 'Please sign in with your new account.';
                messageDiv.className = 'info';
                messageDiv.style.animation = 'bounce 0.6s ease-in-out';
            }, 2000);
        } catch (error) {
            messageDiv.textContent = 'Registration failed: ' + error.message;
            messageDiv.className = 'error';
            messageDiv.style.animation = 'shake 0.5s ease-in-out, wiggle 0.5s ease-in-out 0.5s';
            button.innerHTML = originalHTML;
            button.disabled = false;
            button.style.animation = '';

            // Error shake effect on form
            registerForm.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                registerForm.style.animation = '';
            }, 500);
        }
    });

    // Forgot password
    forgotPassword.addEventListener('click', (e) => {
        e.preventDefault();
        const email = prompt('Enter your email address to reset password:');
        if (email) {
            account.createRecovery(email, window.location.origin + '/reset-password')
                .then(() => {
                    messageDiv.textContent = 'Password reset email sent! Check your inbox.';
                    messageDiv.className = 'success';
                })
                .catch(error => {
                    messageDiv.textContent = 'Failed to send reset email: ' + error.message;
                    messageDiv.className = 'error';
                });
        }
    });



    // Social login removed as requested

    // Check if user is already logged in
    checkAuth();


});

async function checkAuth() {
    try {
        const user = await account.get();
        const role = user.prefs.role;
        redirectToDashboard(role);
    } catch (error) {
        // Not logged in
    }
}

function redirectToDashboard(role) {
    if (role === 'admin') {
        window.location.href = 'admin-dashboard.html';
    } else if (role === 'lecturer') {
        window.location.href = 'lecturer-dashboard.html';
    } else if (role === 'student') {
        window.location.href = 'student-dashboard.html';
    }
}

// Enhanced visual effects functions
function createRippleEffect(button) {
    const ripple = document.createElement('div');
    ripple.style.position = 'absolute';
    ripple.style.borderRadius = '50%';
    ripple.style.background = 'rgba(255, 255, 255, 0.6)';
    ripple.style.transform = 'scale(0)';
    ripple.style.animation = 'ripple 0.6s linear';
    ripple.style.left = '50%';
    ripple.style.top = '50%';
    ripple.style.width = '20px';
    ripple.style.height = '20px';
    ripple.style.marginLeft = '-10px';
    ripple.style.marginTop = '-10px';
    button.style.position = 'relative';
    button.appendChild(ripple);

    setTimeout(() => {
        ripple.remove();
    }, 600);
}

function createSuccessParticles() {
    const container = document.querySelector('.container');
    for (let i = 0; i < 15; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.background = '#28a745';
        particle.style.animationDelay = Math.random() * 1 + 's';
        particle.style.animation = 'float 2s ease-out, fadeInOut 2s ease-in-out';
        container.appendChild(particle);

        setTimeout(() => {
            particle.remove();
        }, 2000);
    }
}

// Add CSS for ripple animation
const style = document.createElement('style');
style.textContent = `
@keyframes ripple {
    to {
        transform: scale(4);
        opacity: 0;
    }
}
`;
document.head.appendChild(style);
