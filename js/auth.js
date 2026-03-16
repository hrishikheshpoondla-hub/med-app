// Authentication Functions

// Toggle password visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.parentElement.querySelector('.toggle-password i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Show/Hide forms
function showLogin() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('signupForm').classList.add('hidden');
    document.getElementById('forgotPasswordForm').classList.add('hidden');
}

function showSignup() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('signupForm').classList.remove('hidden');
    document.getElementById('forgotPasswordForm').classList.add('hidden');
}

function showForgotPassword() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('signupForm').classList.add('hidden');
    document.getElementById('forgotPasswordForm').classList.remove('hidden');
}

// Password strength checker
document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('signupPassword');
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            const strength = checkPasswordStrength(this.value);
            const strengthBar = document.getElementById('passwordStrength');
            strengthBar.className = 'password-strength ' + strength;
        });
    }
});

function checkPasswordStrength(password) {
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/\d/)) strength++;
    if (password.match(/[^a-zA-Z\d]/)) strength++;
    
    if (strength <= 1) return 'weak';
    if (strength <= 2) return 'medium';
    return 'strong';
}

// Handle Login
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const loginBtn = document.getElementById('loginBtn');
    
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showToast('success', 'Welcome back!', 'You have successfully logged in.');
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    } catch (error) {
        showToast('error', 'Login Failed', getErrorMessage(error.code));
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<span>Sign In</span><i class="fas fa-arrow-right"></i>';
    }
}

// Handle Signup
async function handleSignup(event) {
    event.preventDefault();
    
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const signupBtn = document.getElementById('signupBtn');
    
    // Validate passwords match
    if (password !== confirmPassword) {
        showToast('error', 'Password Mismatch', 'Passwords do not match. Please try again.');
        return;
    }
    
    signupBtn.disabled = true;
    signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    
    try {
        // Create user account
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update display name
        await user.updateProfile({
            displayName: `${firstName} ${lastName}`
        });
        
        // Create user document in Firestore
        await db.collection('users').doc(user.uid).set({
            firstName: firstName,
            lastName: lastName,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            settings: {
                pushNotifications: true,
                soundAlerts: true,
                reminderSound: 'default',
                snoozeDuration: 5,
                emailReminders: false,
                darkMode: false,
                compactView: false,
                timeFormat: '12'
            },
            emergencyContact: null
        });
        
        showToast('success', 'Account Created!', 'Welcome to MedSafe. Redirecting to dashboard...');
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    } catch (error) {
        showToast('error', 'Signup Failed', getErrorMessage(error.code));
        signupBtn.disabled = false;
        signupBtn.innerHTML = '<span>Create Account</span><i class="fas fa-arrow-right"></i>';
    }
}

// Handle Forgot Password
async function handleForgotPassword(event) {
    event.preventDefault();
    
    const email = document.getElementById('resetEmail').value;
    const resetBtn = document.getElementById('resetBtn');
    
    resetBtn.disabled = true;
    resetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    
    try {
        await auth.sendPasswordResetEmail(email);
        showToast('success', 'Email Sent!', 'Check your inbox for password reset instructions.');
        
        setTimeout(() => {
            showLogin();
        }, 2000);
    } catch (error) {
        showToast('error', 'Error', getErrorMessage(error.code));
    }
    
    resetBtn.disabled = false;
    resetBtn.innerHTML = '<span>Send Reset Link</span><i class="fas fa-paper-plane"></i>';
}

// Google Sign In
async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    
    try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        
        // Check if user document exists
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            // Create new user document
            const names = user.displayName ? user.displayName.split(' ') : ['User', ''];
            await db.collection('users').doc(user.uid).set({
                firstName: names[0],
                lastName: names.slice(1).join(' '),
                email: user.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                settings: {
                    pushNotifications: true,
                    soundAlerts: true,
                    reminderSound: 'default',
                    snoozeDuration: 5,
                    emailReminders: false,
                    darkMode: false,
                    compactView: false,
                    timeFormat: '12'
                },
                emergencyContact: null
            });
        }
        
        showToast('success', 'Welcome!', 'You have successfully signed in with Google.');
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    } catch (error) {
        showToast('error', 'Sign In Failed', getErrorMessage(error.code));
    }
}

// Handle Logout
async function handleLogout() {
    try {
        await auth.signOut();
        showToast('success', 'Logged Out', 'You have been successfully logged out.');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    } catch (error) {
        showToast('error', 'Error', 'Failed to log out. Please try again.');
    }
}

// Get user-friendly error messages
function getErrorMessage(errorCode) {
    const messages = {
        'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/operation-not-allowed': 'This sign-in method is not enabled.',
        'auth/weak-password': 'Password should be at least 6 characters.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Please check your connection.',
        'auth/popup-closed-by-user': 'Sign-in popup was closed before completing.',
        'auth/cancelled-popup-request': 'Sign-in was cancelled.'
    };
    
    return messages[errorCode] || 'An unexpected error occurred. Please try again.';
}

// Toast notification function
function showToast(type, title, message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const icons = {
        success: 'fa-check',
        error: 'fa-times',
        warning: 'fa-exclamation',
        info: 'fa-info'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${icons[type]}"></i>
        </div>
        <div class="toast-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Check authentication state
function checkAuth() {
    return new Promise((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user);
        }, reject);
    });
}

// Protect dashboard pages
async function requireAuth() {
    const user = await checkAuth();
    if (!user) {
        window.location.href = 'login.html';
        return null;
    }
    return user;
}
