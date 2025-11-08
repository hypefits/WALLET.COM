// Authentication Management
const AUTH_KEY = 'moneyVault_auth';
const USERS_KEY = 'moneyVault_users';
const CURRENT_USER_KEY = 'moneyVault_currentUser';

// Check if app is initialized
function checkInitialization() {
    const users = localStorage.getItem(USERS_KEY);
    if (!users) {
        // First time setup
        document.getElementById('setupSection').classList.remove('hidden');
        document.getElementById('loginSection').classList.add('hidden');
    } else {
        // Show login
        document.getElementById('setupSection').classList.add('hidden');
        document.getElementById('loginSection').classList.remove('hidden');
    }
}

// Setup admin account
function setupAdmin() {
    const name = document.getElementById('adminName').value.trim();
    const pin = document.getElementById('setupPin').value;
    const confirmPin = document.getElementById('confirmPin').value;

    if (!name || !pin || !confirmPin) {
        showError('Please fill all fields');
        return;
    }

    if (pin.length < 4 || pin.length > 6) {
        showError('PIN must be 4-6 digits');
        return;
    }

    if (pin !== confirmPin) {
        showError('PINs do not match');
        return;
    }

    // Create admin user
    const adminUser = {
        id: 'admin_' + Date.now(),
        name: name,
        pin: btoa(pin), // Basic encoding (in production, use proper encryption)
        role: 'admin',
        createdAt: new Date().toISOString()
    };

    // Save to localStorage
    const users = [adminUser];
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    // Auto login
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(adminUser));
    localStorage.setItem(AUTH_KEY, 'true');

    // Play success sound
    playSound('success');

    // Redirect to dashboard
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 500);
}

// Login function
function login() {
    const pinInput = document.getElementById('pinInput').value;

    if (!pinInput) {
        showError('Please enter your PIN');
        return;
    }

    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const user = users.find(u => atob(u.pin) === pinInput);

    if (user) {
        // Successful login
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        localStorage.setItem(AUTH_KEY, 'true');
        
        // Play success sound
        playSound('success');
        
        // Animate and redirect
        document.querySelector('.login-card').style.animation = 'fadeOut 0.5s';
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 500);
    } else {
        // Failed login
        showError('Invalid PIN');
        document.getElementById('pinInput').classList.add('animate-shake');
        setTimeout(() => {
            document.getElementById('pinInput').classList.remove('animate-shake');
        }, 500);
    }
}

// Show error message
function showError(message) {
    const errorMsg = document.getElementById('errorMsg');
    if (errorMsg) {
        errorMsg.textContent = message;
        setTimeout(() => {
            errorMsg.textContent = '';
        }, 3000);
    }
}

// Check authentication
function checkAuth() {
    const isAuthenticated = localStorage.getItem(AUTH_KEY);
    const currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || '{}');

    if (!isAuthenticated) {
        window.location.href = 'index.html';
        return false;
    }

    // Update UI with user info
    if (document.getElementById('currentUser')) {
        document.getElementById('currentUser').textContent = currentUser.name || 'User';
    }
    if (document.getElementById('userRole')) {
        document.getElementById('userRole').textContent = currentUser.role === 'admin' ? 'Administrator' : 'Member';
    }

    // Hide admin-only features for normal users
    if (currentUser.role !== 'admin') {
        const adminElements = document.querySelectorAll('#membersLink, #settingsLink');
        adminElements.forEach(el => {
            if (el) el.style.display = 'none';
        });
    }

    return true;
}

// Check admin authentication
function checkAdminAuth() {
    const currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || '{}');
    
    if (!localStorage.getItem(AUTH_KEY) || currentUser.role !== 'admin') {
        alert('Access denied. Admin privileges required.');
        window.location.href = 'dashboard.html';
        return false;
    }
    
    return true;
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem(CURRENT_USER_KEY);
        window.location.href = 'index.html';
    }
}

// Play sound effect
function playSound(type) {
    const settings = JSON.parse(localStorage.getItem('moneyVault_settings') || '{}');
    if (settings.soundEnabled !== false) {
        // Create audio element and play (you can add actual sound files)
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZizMGHW/A7+OZURE');
        audio.volume = 0.3;
        audio.play().catch(() => {});
    }
}

// PIN input visual feedback
document.addEventListener('DOMContentLoaded', function() {
    checkInitialization();

    const pinInput = document.getElementById('pinInput');
    if (pinInput) {
        pinInput.addEventListener('input', function() {
            const dots = document.querySelectorAll('.pin-dots .dot');
            const value = this.value;
            
            dots.forEach((dot, index) => {
                if (index < value.length) {
                    dot.classList.add('filled');
                } else {
                    dot.classList.remove('filled');
                }
            });
        });

        // Allow enter key to submit
        pinInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                login();
            }
        });
    }

    // Auto-lock timer (2 minutes of inactivity)
    let inactivityTimer;
    const AUTO_LOCK_TIME = 120000; // 2 minutes

    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        const settings = JSON.parse(localStorage.getItem('moneyVault_settings') || '{}');
        
        if (settings.autoLock && localStorage.getItem(AUTH_KEY)) {
            inactivityTimer = setTimeout(() => {
                logout();
            }, AUTO_LOCK_TIME);
        }
    }

    // Track user activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, resetInactivityTimer, true);
    });

    resetInactivityTimer();
});
