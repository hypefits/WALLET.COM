// Debts Management
const DEBTS_KEY = 'moneyVault_debts';

// Debt management class
class DebtManager {
    constructor() {
        this.debts = this.loadDebts();
    }

    loadDebts() {
        const data = localStorage.getItem(DEBTS_KEY);
        return data ? JSON.parse(data) : [];
    }

    saveDebts() {
        localStorage.setItem(DEBTS_KEY, JSON.stringify(this.debts));
    }

    addDebt(debt) {
        const newDebt = {
            id: 'debt_' + Date.now(),
            ...debt,
            createdAt: new Date().toISOString()
        };

        this.debts.unshift(newDebt);
        this.saveDebts();
        return newDebt;
    }

    updateDebt(id, updates) {
        const debtIndex = this.debts.findIndex(d => d.id === id);
        if (debtIndex !== -1) {
            this.debts[debtIndex] = { ...this.debts[debtIndex], ...updates };
            this.saveDebts();
            return true;
        }
        return false;
    }

    deleteDebt(id) {
        this.debts = this.debts.filter(d => d.id !== id);
        this.saveDebts();
        return true;
    }

    getDebts(filters = {}) {
        let filtered = [...this.debts];

        // Filter by type
        if (filters.type && filters.type !== 'all') {
            filtered = filtered.filter(d => d.type === filters.type);
        }

        // Filter by status
        if (filters.status && filters.status !== 'all') {
            filtered = filtered.filter(d => d.status === filters.status);
        }

        return filtered;
    }

    calculateStats() {
        const stats = {
            totalOwed: 0,
            totalLent: 0,
            netBalance: 0
        };

        this.debts.forEach(debt => {
            const amount = parseFloat(debt.amount);
            if (debt.type === 'owe' && debt.status !== 'paid') {
                stats.totalOwed += amount;
            } else if (debt.type === 'lent' && debt.status !== 'paid') {
                stats.totalLent += amount;
            }
        });

        stats.netBalance = stats.totalLent - stats.totalOwed;
        return stats;
    }

    checkOverdueDebts() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        this.debts.forEach(debt => {
            if (debt.status === 'pending') {
                const dueDate = new Date(debt.dueDate);
                dueDate.setHours(0, 0, 0, 0);

                if (dueDate < today) {
                    this.updateDebt(debt.id, { status: 'overdue' });
                }
            }
        });
    }
}

// Create global instance
const debtManager = new DebtManager();

// UI Functions
let currentDebtType = 'borrowed'; // Default to borrowed

function initDebtsPage() {
    // Set today's date as default for due date
    const dueDateInput = document.getElementById('dueDate');
    if (dueDateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dueDateInput.value = tomorrow.toISOString().split('T')[0];
    }

    // Display current date and day
    displayCurrentDateAndDay();

    // Setup form submission
    const form = document.getElementById('debtForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            addDebt();
        });
    }

    // Check for overdue debts
    debtManager.checkOverdueDebts();
}

function selectDebtType(type) {
    currentDebtType = type;

    // Update button states
    document.querySelectorAll('.debt-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.debt-type-btn').classList.add('active');
}

function addDebt() {
    const debt = {
        personName: document.getElementById('personName').value.trim(),
        type: currentDebtType, // Use the selected type (borrowed/lent)
        description: document.getElementById('debtDesc').value.trim(),
        amount: parseFloat(document.getElementById('debtAmount').value),
        dueDate: document.getElementById('dueDate').value,
        status: 'pending' // Always start as pending
    };

    // Validate
    if (!debt.personName || !debt.description || !debt.amount || !debt.dueDate) {
        alert('Please fill all required fields');
        return;
    }

    if (debt.amount <= 0) {
        alert('Amount must be greater than 0');
        return;
    }

    // Add debt
    debtManager.addDebt(debt);

    // Clear form
    document.getElementById('debtForm').reset();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('dueDate').value = tomorrow.toISOString().split('T')[0];

    // Update UI
    loadDebts();
    updateDebtStats();
    showNotification('Debt record added successfully!');
    playSound('success');
}

function loadDebts() {
    const container = document.getElementById('debtsList');
    const noDebtMsg = document.getElementById('noDebtMsg');

    if (!container) return;

    const debts = debtManager.getDebts();

    if (debts.length === 0) {
        container.innerHTML = '';
        noDebtMsg.style.display = 'block';
    } else {
        noDebtMsg.style.display = 'none';
        container.innerHTML = debts.map(debt => `
            <div class="debt-item animate-fadeIn ${debt.status}">
                <div class="debt-header">
                    <div class="debt-person">
                        <span class="person-avatar">${debt.personName.charAt(0).toUpperCase()}</span>
                        <div class="person-info">
                            <h4>${debt.personName}</h4>
                            <small>${debt.description}</small>
                        </div>
                    </div>
                    <div class="debt-amount">
                        <span class="amount ${debt.type}">₹${formatAmount(debt.amount)}</span>
                        <span class="debt-type-badge ${debt.type}">
                            ${debt.type === 'borrowed' ? '⬇️ Borrowed' : '⬆️ Lent'}
                        </span>
                    </div>
                </div>
                <div class="debt-details">
                    <div class="debt-date">
                        <span>📅 Due: ${formatDate(debt.dueDate)}</span>
                    </div>
                    <div class="debt-status">
                        <span class="status-badge ${debt.status}">
                            ${getStatusIcon(debt.status)} ${debt.status.charAt(0).toUpperCase() + debt.status.slice(1)}
                        </span>
                    </div>
                </div>
                <div class="debt-actions">
                    ${debt.status !== 'paid' ? `
                        <button class="btn btn-success btn-sm" onclick="markAsPaid('${debt.id}')">
                            ✅ Mark Paid
                        </button>
                    ` : ''}
                    <button class="btn btn-danger btn-sm" onclick="deleteDebt('${debt.id}')">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `).join('');
    }
}

function markAsPaid(id) {
    if (confirm('Mark this debt as paid?')) {
        debtManager.updateDebt(id, { status: 'paid' });
        loadDebts();
        updateDebtStats();
        showNotification('Debt marked as paid!');
        playSound('success');
    }
}

function deleteDebt(id) {
    if (confirm('Are you sure you want to delete this debt record?')) {
        debtManager.deleteDebt(id);
        loadDebts();
        updateDebtStats();
        showNotification('Debt record deleted!');
    }
}

function updateDebtStats() {
    const stats = debtManager.calculateStats();
    const debts = debtManager.getDebts();

    // Calculate borrowed and lent totals
    let borrowedTotal = 0;
    let lentTotal = 0;
    let borrowedCount = 0;
    let lentCount = 0;

    debts.forEach(debt => {
        if (debt.status !== 'paid') {
            if (debt.type === 'borrowed') {
                borrowedTotal += parseFloat(debt.amount);
                borrowedCount++;
            } else if (debt.type === 'lent') {
                lentTotal += parseFloat(debt.amount);
                lentCount++;
            }
        }
    });

    // Update summary cards
    document.getElementById('borrowedTotal').textContent = formatAmount(borrowedTotal);
    document.getElementById('lentTotal').textContent = formatAmount(lentTotal);
    document.getElementById('borrowedCount').textContent = `${borrowedCount} debt${borrowedCount !== 1 ? 's' : ''}`;
    document.getElementById('lentCount').textContent = `${lentCount} debt${lentCount !== 1 ? 's' : ''}`;

    // Update old stats (keeping for compatibility)
    document.getElementById('totalOwed').textContent = '₹' + formatAmount(stats.totalOwed);
    document.getElementById('totalLent').textContent = '₹' + formatAmount(stats.totalLent);
    document.getElementById('netBalance').textContent = '₹' + formatAmount(Math.abs(stats.netBalance));

    // Change balance color based on value
    const balanceElement = document.getElementById('netBalance');
    if (balanceElement) {
        balanceElement.style.color = stats.netBalance >= 0 ? '#28A745' : '#DC3545';
        // Add positive/negative indicator
        const indicator = stats.netBalance >= 0 ? '(+)' : '(-)';
        balanceElement.textContent = '₹' + formatAmount(Math.abs(stats.netBalance)) + ' ' + indicator;
    }
}

function filterDebts() {
    const type = document.getElementById('filterDebtType').value;
    const status = document.getElementById('filterDebtStatus').value;

    const filters = {};
    if (type !== 'all') filters.type = type;
    if (status !== 'all') filters.status = status;

    const debts = debtManager.getDebts(filters);
    displayFilteredDebts(debts);
}

function displayFilteredDebts(debts) {
    const container = document.getElementById('debtsList');
    const noDebtMsg = document.getElementById('noDebtMsg');

    if (debts.length === 0) {
        container.innerHTML = '';
        noDebtMsg.style.display = 'block';
        noDebtMsg.innerHTML = '<span>🔍</span><p>No debt records match your filters</p>';
    } else {
        noDebtMsg.style.display = 'none';
        container.innerHTML = debts.map(debt => `
            <div class="debt-item animate-fadeIn ${debt.status}">
                <div class="debt-header">
                    <div class="debt-person">
                        <span class="person-avatar">${debt.personName.charAt(0).toUpperCase()}</span>
                        <div class="person-info">
                            <h4>${debt.personName}</h4>
                            <small>${debt.description}</small>
                        </div>
                    </div>
                    <div class="debt-amount">
                        <span class="amount ${debt.type}">₹${formatAmount(debt.amount)}</span>
                        <span class="debt-type-badge ${debt.type}">
                            ${debt.type === 'borrowed' ? '⬇️ Borrowed' : '⬆️ Lent'}
                        </span>
                    </div>
                </div>
                <div class="debt-details">
                    <div class="debt-date">
                        <span>📅 Due: ${formatDate(debt.dueDate)}</span>
                    </div>
                    <div class="debt-status">
                        <span class="status-badge ${debt.status}">
                            ${getStatusIcon(debt.status)} ${debt.status.charAt(0).toUpperCase() + debt.status.slice(1)}
                        </span>
                    </div>
                </div>
                <div class="debt-actions">
                    ${debt.status !== 'paid' ? `
                        <button class="btn btn-success btn-sm" onclick="markAsPaid('${debt.id}')">
                            ✅ Mark Paid
                        </button>
                    ` : ''}
                    <button class="btn btn-danger btn-sm" onclick="deleteDebt('${debt.id}')">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `).join('');
    }
}

function toggleDebtFields() {
    // Could be used for future enhancements
}

function getStatusIcon(status) {
    switch (status) {
        case 'paid': return '✅';
        case 'pending': return '⏳';
        case 'overdue': return '❌';
        default: return '❓';
    }
}

// Utility functions
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function formatAmount(amount) {
    return parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function showNotification(message) {
    // Add to notification system instead of showing popup
    addNotification(message, 'success');

    // Still play sound for feedback
    playSound('success');
}

function addNotification(message, type = 'success') {
    const notifications = JSON.parse(localStorage.getItem('moneyVault_notifications') || '[]');

    const notification = {
        id: 'notif_' + Date.now(),
        message: message,
        type: type,
        timestamp: new Date().toISOString(),
        read: false
    };

    notifications.unshift(notification);

    // Keep only last 50 notifications
    if (notifications.length > 50) {
        notifications.splice(50);
    }

    localStorage.setItem('moneyVault_notifications', JSON.stringify(notifications));
    updateNotificationCount();
}

function updateNotificationCount() {
    const notifications = JSON.parse(localStorage.getItem('moneyVault_notifications') || '[]');
    const unreadCount = notifications.filter(n => !n.read).length;

    const countElements = document.querySelectorAll('.notification-count');
    countElements.forEach(element => {
        if (unreadCount > 0) {
            element.textContent = unreadCount > 99 ? '99+' : unreadCount;
            element.classList.add('show');
        } else {
            element.classList.remove('show');
        }
    });
}

function toggleNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    if (panel) {
        panel.classList.toggle('show');
        if (panel.classList.contains('show')) {
            loadNotifications();
        }
    }
}

function closeNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    if (panel) {
        panel.classList.remove('show');
    }
}

function loadNotifications() {
    const notifications = JSON.parse(localStorage.getItem('moneyVault_notifications') || '[]');
    const listElement = document.getElementById('notificationList');

    if (!listElement) return;

    if (notifications.length === 0) {
        listElement.innerHTML = '<div class="notification-item">No notifications yet</div>';
        return;
    }

    listElement.innerHTML = notifications.map(notification => `
        <div class="notification-item ${!notification.read ? 'unread' : ''}" onclick="markNotificationRead('${notification.id}')">
            <div>${notification.message}</div>
            <div class="notification-time">${formatNotificationTime(notification.timestamp)}</div>
        </div>
    `).join('');
}

function markNotificationRead(id) {
    const notifications = JSON.parse(localStorage.getItem('moneyVault_notifications') || '[]');
    const notification = notifications.find(n => n.id === id);

    if (notification) {
        notification.read = true;
        localStorage.setItem('moneyVault_notifications', JSON.stringify(notifications));
        updateNotificationCount();
        loadNotifications();
    }
}

function formatNotificationTime(timestamp) {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return notificationTime.toLocaleDateString();
}

// Initialize notifications on page load
document.addEventListener('DOMContentLoaded', function() {
    updateNotificationCount();
});

function playSound(type) {
    const settings = JSON.parse(localStorage.getItem('moneyVault_settings') || '{}');
    if (settings.soundEnabled !== false) {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZizMGHW/A7+OZURE');
        audio.volume = 0.3;
        audio.play().catch(() => {});
    }
}

function displayCurrentDateAndDay() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };

    const dateDisplay = document.getElementById('currentDateDisplay');
    const dayDisplay = document.getElementById('currentDayDisplay');

    if (dateDisplay) {
        dateDisplay.textContent = now.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    if (dayDisplay) {
        dayDisplay.textContent = now.toLocaleDateString(undefined, { weekday: 'long' });
    }
}

// Add custom styles for debt badges
const debtStyles = document.createElement('style');
debtStyles.textContent = `
    .badge-owe, .badge-borrowed {
        background: #FFF3E0;
        color: #E65100;
    }
    .badge-lent {
        background: #E8F5E8;
        color: #2E7D32;
    }
    .badge-pending {
        background: #FFF3E0;
        color: #EF6C00;
    }
    .badge-paid {
        background: #E8F5E8;
        color: #2E7D32;
    }
    .badge-overdue {
        background: #FFEBEE;
        color: #C62828;
    }
    .amount-owe, .amount-borrowed {
        color: #E65100;
        font-weight: 600;
    }
    .amount-lent {
        color: #2E7D32;
        font-weight: 600;
    }
    .stat-icon.debt {
        background: linear-gradient(135deg, #FF6B6B 0%, #EE5A52 100%);
    }
    .stat-icon.lent {
        background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%);
    }
`;
document.head.appendChild(debtStyles);