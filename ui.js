// UI Management
function initDashboard() {
    // Set today's date as default
    const dateInput = document.getElementById('transDate');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // Display current date and day
    displayCurrentDateAndDay();

    // Load member filter options
    loadMemberFilterOptions();

    // Setup form submission
    const form = document.getElementById('transactionForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            addTransaction();
        });
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

function toggleBankField() {
    const method = document.getElementById('transMethod').value;
    const bankField = document.getElementById('bankField');

    if (method === 'online') {
        bankField.style.display = 'grid';
    } else {
        bankField.style.display = 'none';
    }
}

function addTransaction() {
    const transaction = {
        date: document.getElementById('transDate').value,
        type: document.getElementById('transType').value,
        description: document.getElementById('transDesc').value,
        amount: parseFloat(document.getElementById('transAmount').value),
        method: document.getElementById('transMethod').value,
        bank: document.getElementById('transMethod').value === 'online' ? document.getElementById('transBank').value : null
    };

    // Validate
    if (!transaction.date || !transaction.description || !transaction.amount) {
        alert('Please fill all required fields');
        return;
    }

    // Add transaction
    transactionManager.addTransaction(transaction);

    // Clear form
    document.getElementById('transactionForm').reset();
    document.getElementById('transDate').value = new Date().toISOString().split('T')[0];

    // Update UI
    loadTransactions();
    updateStats();
    showNotification('Transaction added successfully!');
    playSound('success');
}

function loadTransactions() {
    const tbody = document.getElementById('transactionsList');
    const noDataMsg = document.getElementById('noDataMsg');

    if (!tbody) return;

    // Only show current user's transactions for privacy
    const currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || '{}');
    const transactions = transactionManager.getTransactions({ member: currentUser.id });

    if (transactions.length === 0) {
        tbody.innerHTML = '';
        noDataMsg.style.display = 'block';
    } else {
        noDataMsg.style.display = 'none';
        tbody.innerHTML = transactions.map(t => `
            <tr class="animate-fadeIn">
                <td>${formatDate(t.date)}</td>
                <td>${t.description}</td>
                <td>
                    <span class="badge badge-${t.type}">
                        ${t.type === 'income' ? '💵' : '💸'} ${t.type}
                    </span>
                </td>
                <td>
                    <span class="badge badge-method">
                        ${t.method === 'cash' ? '💵' : '💳'} ${t.method}
                    </span>
                </td>
                <td>
                    ${t.method === 'online' && t.bank ? `
                        <span class="badge badge-bank">
                            ${t.bank === 'kotak' ? '🏦' : '🏛️'} ${t.bank.toUpperCase()}
                        </span>
                    ` : '-'}
                </td>
                <td class="amount-${t.type}">
                    ₹${formatAmount(t.amount)}
                </td>
                <td>
                    <button class="btn-icon" onclick="showTransactionDetails('${t.id}')">
                        👁️
                    </button>
                </td>
                <td>
                    ${canDeleteTransaction(t) ? `
                        <button class="btn-icon" onclick="deleteTransaction('${t.id}')">
                            🗑️
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');
    }
}

function canDeleteTransaction(transaction) {
    const currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || '{}');
    return currentUser.role === 'admin' || transaction.memberId === currentUser.id;
}

function deleteTransaction(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
        if (transactionManager.deleteTransaction(id)) {
            loadTransactions();
            updateStats();
            showNotification('Transaction deleted successfully!');
        } else {
            alert('You do not have permission to delete this transaction');
        }
    }
}

function updateStats() {
    // Only calculate stats for current user for privacy
    const currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || '{}');
    const userTransactions = transactionManager.getTransactions({ member: currentUser.id });

    let totalIncome = 0;
    let totalExpense = 0;

    userTransactions.forEach(t => {
        if (t.type === 'income') {
            totalIncome += parseFloat(t.amount);
        } else {
            totalExpense += parseFloat(t.amount);
        }
    });

    const balance = totalIncome - totalExpense;

    document.getElementById('totalIncome').textContent = '₹' + formatAmount(totalIncome);
    document.getElementById('totalExpense').textContent = '₹' + formatAmount(totalExpense);
    document.getElementById('balance').textContent = '₹' + formatAmount(balance);

    // Change balance color based on value
    const balanceElement = document.getElementById('balance');
    if (balanceElement) {
        balanceElement.style.color = balance >= 0 ? '#28A745' : '#DC3545';
    }
}

function filterTransactions() {
    const type = document.getElementById('filterType').value;
    const member = document.getElementById('filterMember').value;

    const filters = {};
    if (type !== 'all') filters.type = type;
    // Always filter by current user for privacy
    const currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || '{}');
    filters.member = currentUser.id;

    const transactions = transactionManager.getTransactions(filters);
    displayFilteredTransactions(transactions);
}

function displayFilteredTransactions(transactions) {
    const tbody = document.getElementById('transactionsList');
    const noDataMsg = document.getElementById('noDataMsg');
    
    if (transactions.length === 0) {
        tbody.innerHTML = '';
        noDataMsg.style.display = 'block';
        noDataMsg.innerHTML = '<span>🔍</span><p>No transactions match your filters</p>';
    } else {
        noDataMsg.style.display = 'none';
        tbody.innerHTML = transactions.map(t => `
            <tr class="animate-fadeIn">
                <td>${formatDate(t.date)}</td>
                <td>${t.description}</td>
                <td>
                    <span class="badge badge-${t.type}">
                        ${t.type === 'income' ? '💵' : '💸'} ${t.type}
                    </span>
                </td>
                <td>
                    <span class="badge badge-method">
                        ${t.method === 'cash' ? '💵' : '💳'} ${t.method}
                    </span>
                </td>
                <td>
                    ${t.method === 'online' && t.bank ? `
                        <span class="badge badge-bank">
                            ${t.bank === 'kotak' ? '🏦' : '🏛️'} ${t.bank.toUpperCase()}
                        </span>
                    ` : '-'}
                </td>
                <td class="amount-${t.type}">
                    ₹${formatAmount(t.amount)}
                </td>
                <td>
                    <button class="btn-icon" onclick="showTransactionDetails('${t.id}')">
                        👁️
                    </button>
                </td>
                <td>
                    ${canDeleteTransaction(t) ? `
                        <button class="btn-icon" onclick="deleteTransaction('${t.id}')">
                            🗑️
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');
    }
}

function loadMemberFilterOptions() {
    const filterMember = document.getElementById('filterMember');
    if (!filterMember) return;

    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || '{}');

    // Only show current user's transactions for privacy
    filterMember.innerHTML = `<option value="${currentUser.id}">${currentUser.name} (Your Transactions)</option>`;
}

function exportToExcel() {
    transactionManager.exportToExcel();
    showNotification('Excel file exported successfully!');
}

function showNotification(message, type = 'success') {
    // Add to notification system instead of showing popup
    addNotification(message, type);

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

// Transaction Details Modal
function showTransactionDetails(id) {
    const transactions = transactionManager.getTransactions();
    const transaction = transactions.find(t => t.id === id);

    if (!transaction) return;

    // Create modal HTML
    const modalHTML = `
        <div class="modal-overlay" onclick="closeTransactionModal()">
            <div class="transaction-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>Transaction Details</h3>
                    <button class="close-btn" onclick="closeTransactionModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="detail-row">
                        <span class="detail-label">Date:</span>
                        <span class="detail-value">${formatDate(transaction.date)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Description:</span>
                        <span class="detail-value">${transaction.description}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Type:</span>
                        <span class="detail-value">
                            <span class="badge badge-${transaction.type}">
                                ${transaction.type === 'income' ? '💵' : '💸'} ${transaction.type}
                            </span>
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Amount:</span>
                        <span class="detail-value amount-${transaction.type}">₹${formatAmount(transaction.amount)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Payment Method:</span>
                        <span class="detail-value">
                            <span class="badge badge-method">
                                ${transaction.method === 'cash' ? '💵' : '💳'} ${transaction.method}
                            </span>
                        </span>
                    </div>
                    ${transaction.method === 'online' && transaction.bank ? `
                        <div class="detail-row">
                            <span class="detail-label">Bank:</span>
                            <span class="detail-value">
                                <span class="badge badge-bank">
                                    ${transaction.bank === 'kotak' ? '🏦' : '🏛️'} ${transaction.bank.toUpperCase()}
                                </span>
                            </span>
                        </div>
                    ` : ''}
                    <div class="detail-row">
                        <span class="detail-label">Created:</span>
                        <span class="detail-value">${new Date(transaction.createdAt).toLocaleString()}</span>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeTransactionModal()">Close</button>
                    ${canDeleteTransaction(transaction) ? `
                        <button class="btn btn-danger" onclick="deleteTransaction('${transaction.id}'); closeTransactionModal();">
                            Delete Transaction
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeTransactionModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// Initialize notifications on page load
document.addEventListener('DOMContentLoaded', function() {
    updateNotificationCount();
});

// Utility functions
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function formatAmount(amount) {
    return parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Add custom styles for badges and amounts
const style = document.createElement('style');
style.textContent = `
    .badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
    }
    .badge-income {
        background: #E3F2FD;
        color: #1976D2;
    }
    .badge-expense {
        background: #FFEBEE;
        color: #C62828;
    }
    .badge-method {
        background: #E3F2FD;
        color: #1976D2;
    }
    .badge-bank {
        background: #F3E5F5;
        color: #7B1FA2;
    }
    .amount-income {
        color: #2E7D32;
        font-weight: 600;
    }
    .amount-expense {
        color: #C62828;
        font-weight: 600;
    }
    .btn-icon {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 18px;
        transition: transform 0.2s;
    }
    .btn-icon:hover {
        transform: scale(1.2);
    }
`;
document.head.appendChild(style);