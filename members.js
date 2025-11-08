// Member Management
let editingMemberId = null;

function loadMembers() {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const membersList = document.getElementById('membersList');
    const memberCount = document.getElementById('memberCount');
    
    if (!membersList) return;
    
    memberCount.textContent = `${users.length} Member${users.length !== 1 ? 's' : ''}`;
    
    membersList.innerHTML = users.map(user => `
        <div class="member-card animate-fadeIn">
            <div class="member-avatar">
                ${user.role === 'admin' ? '👑' : '👤'}
            </div>
            <h3 class="member-name">${user.name}</h3>
            <span class="member-role" style="background: ${user.role === 'admin' ? '#FFD700' : '#4A90E2'}">
                ${user.role === 'admin' ? 'Administrator' : 'Member'}
            </span>
            <div class="member-info">
                <small>Added: ${new Date(user.createdAt).toLocaleDateString()}</small>
            </div>
            <div class="member-actions">
                <button class="btn btn-secondary" onclick="editMember('${user.id}')">
                    ✏️ Edit
                </button>
                ${user.role !== 'admin' ? `
                    <button class="btn btn-danger" onclick="deleteMember('${user.id}')">
                        🗑️ Delete
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Add member form submission
document.addEventListener('DOMContentLoaded', function() {
    const memberForm = document.getElementById('memberForm');
    if (memberForm) {
        memberForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addMember();
        });
    }
});

function addMember() {
    const name = document.getElementById('memberName').value.trim();
    const pin = document.getElementById('memberPin').value;
    const role = document.getElementById('memberRole').value;
    
    if (!name || !pin) {
        alert('Please fill all fields');
        return;
    }
    
    if (pin.length < 4 || pin.length > 6) {
        alert('PIN must be 4-6 digits');
        return;
    }
    
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    
    // Check if PIN already exists
    if (users.some(u => atob(u.pin) === pin)) {
        alert('This PIN is already in use. Please choose a different PIN.');
        return;
    }
    
    const newUser = {
        id: 'user_' + Date.now(),
        name: name,
        pin: btoa(pin),
        role: role,
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    // Reset form
    document.getElementById('memberForm').reset();
    
    // Reload members
    loadMembers();
    
    // Show notification
    showNotification(`Member "${name}" added successfully!`);
    playSound('success');
}

function editMember(id) {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const user = users.find(u => u.id === id);
    
    if (!user) return;
    
    editingMemberId = id;
    
    // Fill edit form
    document.getElementById('editName').value = user.name;
    document.getElementById('editRole').value = user.role;
    document.getElementById('editPin').value = '';
    
    // Show modal
    document.getElementById('editModal').classList.add('show');
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('show');
    editingMemberId = null;
}

function updateMember() {
    if (!editingMemberId) return;
    
    const name = document.getElementById('editName').value.trim();
    const pin = document.getElementById('editPin').value;
    const role = document.getElementById('editRole').value;
    
    if (!name) {
        alert('Name is required');
        return;
    }
    
    if (pin && (pin.length < 4 || pin.length > 6)) {
        alert('PIN must be 4-6 digits');
        return;
    }

    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const userIndex = users.findIndex(u => u.id === editingMemberId);

    if (userIndex === -1) return;

    // Check if PIN already exists (if changing PIN)
    if (pin && users.some(u => u.id !== editingMemberId && atob(u.pin) === pin)) {
        alert('This PIN is already in use. Please choose a different PIN.');
        return;
    }

    // Prevent changing admin role
    if (users[userIndex].role === 'admin' && role !== 'admin') {
        alert('Cannot change administrator role');
        return;
    }

    // Update user
    users[userIndex].name = name;
    users[userIndex].role = role;
    if (pin) {
        users[userIndex].pin = btoa(pin);
    }
    
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    closeEditModal();
    loadMembers();
    showNotification('Member updated successfully!');
}

function deleteMember(id) {
    if (!confirm('Are you sure you want to delete this member? Their transactions will be preserved.')) {
        return;
    }
    
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const user = users.find(u => u.id === id);
    
    if (user && user.role === 'admin') {
        alert('Cannot delete administrator account');
        return;
    }
    
    const filteredUsers = users.filter(u => u.id !== id);
    localStorage.setItem(USERS_KEY, JSON.stringify(filteredUsers));
    
    loadMembers();
    showNotification('Member deleted successfully!');
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

// Add member-specific styles
const memberStyles = document.createElement('style');
memberStyles.textContent = `
    .member-info {
        margin: 10px 0;
        color: var(--light-text);
        font-size: 12px;
    }
    
    .member-card {
        transition: transform 0.3s, box-shadow 0.3s;
    }
    
    .member-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 30px rgba(0,0,0,0.15);
    }
`;
document.head.appendChild(memberStyles);