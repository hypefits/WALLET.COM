// Settings Management
const SETTINGS_KEY = 'moneyVault_settings';

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    
    // Load dark mode
    if (settings.darkMode) {
        document.body.classList.add('dark-mode');
        document.getElementById('darkModeToggle').checked = true;
    }
    
    // Load sound settings
    if (settings.soundEnabled !== undefined) {
        document.getElementById('soundToggle').checked = settings.soundEnabled;
    } else {
        document.getElementById('soundToggle').checked = true;
    }
    
    // Load auto-lock settings
    if (settings.autoLock) {
        document.getElementById('autoLockToggle').checked = true;
    }
}

function toggleDarkMode() {
    const isDarkMode = document.getElementById('darkModeToggle').checked;
    
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    saveSettings({ darkMode: isDarkMode });
    showNotification('Theme updated successfully!');
}

function toggleSound() {
    const soundEnabled = document.getElementById('soundToggle').checked;
    saveSettings({ soundEnabled: soundEnabled });
    
    if (soundEnabled) {
        playSound('success');
        showNotification('Sound effects enabled!');
    } else {
        showNotification('Sound effects disabled!');
    }
}

function toggleAutoLock() {
    const autoLock = document.getElementById('autoLockToggle').checked;
    saveSettings({ autoLock: autoLock });
    showNotification(autoLock ? 'Auto-lock enabled!' : 'Auto-lock disabled!');
}

function saveSettings(updates) {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    Object.assign(settings, updates);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function showChangePinModal() {
    document.getElementById('changePinModal').classList.add('show');
}

function closeChangePinModal() {
    document.getElementById('changePinModal').classList.remove('show');
    document.getElementById('changePinForm').reset();
}

function changePin() {
    const currentPin = document.getElementById('currentPin').value;
    const newPin = document.getElementById('newPin').value;
    const confirmNewPin = document.getElementById('confirmNewPin').value;
    
    if (!currentPin || !newPin || !confirmNewPin) {
        alert('Please fill all fields');
        return;
    }
    
    if (newPin.length < 4 || newPin.length > 6) {
        alert('New PIN must be 4-6 digits');
        return;
    }
    
    if (newPin !== confirmNewPin) {
        alert('New PINs do not match');
        return;
    }
    
    const currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || '{}');
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    
    // Verify current PIN
    if (atob(currentUser.pin) !== currentPin) {
        alert('Current PIN is incorrect');
        return;
    }

    // Check if new PIN already exists
    if (users.some(u => u.id !== currentUser.id && atob(u.pin) === newPin)) {
        alert('This PIN is already in use. Please choose a different PIN.');
        return;
    }

    // Update PIN
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex].pin = btoa(newPin);
        currentUser.pin = btoa(newPin);

        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));

        closeChangePinModal();
        showNotification('PIN changed successfully!');
        playSound('success');
    }
}

function backupData() {
    const backup = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        app: 'MoneyVault',
        data: {
            transactions: JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '[]'),
            users: JSON.parse(localStorage.getItem(USERS_KEY) || '[]'),
            settings: JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
        }
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MoneyVault_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Backup downloaded successfully!');
    playSound('success');
}

function restoreData(input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const backup = JSON.parse(e.target.result);
            
            if (!backup.app || backup.app !== 'MoneyVault') {
                alert('Invalid backup file');
                return;
            }
            
            if (!confirm('This will replace all current data. Are you sure?')) {
                return;
            }
            
            // Restore data
            if (backup.data.transactions) {
                localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(backup.data.transactions));
            }
            if (backup.data.users) {
                localStorage.setItem(USERS_KEY, JSON.stringify(backup.data.users));
            }
            if (backup.data.settings) {
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(backup.data.settings));
            }
            
            showNotification('Data restored successfully! Reloading...');
            playSound('success');
            
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error) {
            alert('Failed to restore backup: ' + error.message);
        }
    };
    
    reader.readAsText(file);
    input.value = ''; // Reset file input
}

function confirmReset() {
    const confirmText = prompt('This will DELETE ALL DATA. Type "RESET" to confirm:');
    
    if (confirmText === 'RESET') {
        localStorage.clear();
        showNotification('App reset complete. Redirecting...');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    } else if (confirmText !== null) {
        alert('Reset cancelled. Your data is safe.');
    }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification show';
    notification.innerHTML = `
        <span class="notification-icon">✓</span>
        <span class="notification-text">${message}</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function playSound(type) {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    if (settings.soundEnabled !== false) {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZizMGHW/A7+OZURE');
        audio.volume = 0.3;
        audio.play().catch(() => {});
    }
}

// Apply saved theme on page load
document.addEventListener('DOMContentLoaded', function() {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    if (settings.darkMode) {
        document.body.classList.add('dark-mode');
    }
});