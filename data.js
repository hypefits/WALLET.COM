/*  */// Data Management
const TRANSACTIONS_KEY = 'moneyVault_transactions';
const SETTINGS_KEY = 'moneyVault_settings';

// Transaction management
class TransactionManager {
    constructor() {
        this.transactions = this.loadTransactions();
    }

    loadTransactions() {
        const data = localStorage.getItem(TRANSACTIONS_KEY);
        return data ? JSON.parse(data) : [];
    }

    saveTransactions() {
        localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(this.transactions));
    }

    addTransaction(transaction) {
        const currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || '{}');
        
        const newTransaction = {
            id: 'trans_' + Date.now(),
            ...transaction,
            memberId: currentUser.id,
            memberName: currentUser.name,
            createdAt: new Date().toISOString()
        };

        this.transactions.unshift(newTransaction);
        this.saveTransactions();
        return newTransaction;
    }

    deleteTransaction(id) {
        const currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || '{}');
        const transaction = this.transactions.find(t => t.id === id);
        
        // Only allow deletion if user is admin or owns the transaction
        if (currentUser.role === 'admin' || transaction.memberId === currentUser.id) {
            this.transactions = this.transactions.filter(t => t.id !== id);
            this.saveTransactions();
            return true;
        }
        return false;
    }

    getTransactions(filters = {}) {
        let filtered = [...this.transactions];
        const currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || '{}');

        // Filter by type
        if (filters.type && filters.type !== 'all') {
            filtered = filtered.filter(t => t.type === filters.type);
        }

        // Filter by member
        if (filters.member && filters.member !== 'all') {
            filtered = filtered.filter(t => t.memberId === filters.member);
        }

        // Filter by date range
        if (filters.startDate) {
            filtered = filtered.filter(t => new Date(t.date) >= new Date(filters.startDate));
        }
        if (filters.endDate) {
            filtered = filtered.filter(t => new Date(t.date) <= new Date(filters.endDate));
        }

        return filtered;
    }

    calculateStats() {
        const stats = {
            totalIncome: 0,
            totalExpense: 0,
            balance: 0,
            transactionCount: this.transactions.length
        };

        this.transactions.forEach(t => {
            if (t.type === 'income') {
                stats.totalIncome += parseFloat(t.amount);
            } else {
                stats.totalExpense += parseFloat(t.amount);
            }
        });

        stats.balance = stats.totalIncome - stats.totalExpense;
        return stats;
    }

    exportToExcel() {
        const data = this.transactions.map(t => ({
            Date: t.date,
            Member: t.memberName,
            Description: t.description,
            Type: t.type,
            Method: t.method,
            Bank: t.bank ? t.bank.toUpperCase() : '-',
            Amount: '₹' + t.amount,
            'Created At': new Date(t.createdAt).toLocaleString()
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

        // Add summary sheet
        const stats = this.calculateStats();
        const summary = [
            ['Summary Report'],
            ['Generated on', new Date().toLocaleString()],
            [''],
            ['Total Income', '₹' + stats.totalIncome],
            ['Total Expense', '₹' + stats.totalExpense],
            ['Balance', '₹' + stats.balance],
            ['Total Transactions', stats.transactionCount]
        ];
        const ws2 = XLSX.utils.aoa_to_sheet(summary);
        XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

        // Download file
        const fileName = `MoneyVault_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    }

    backupData() {
        const backup = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            app: 'MoneyVault',
            data: {
                transactions: this.transactions,
                users: JSON.parse(localStorage.getItem(USERS_KEY) || '[]'),
                settings: JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'),
                debts: JSON.parse(localStorage.getItem('moneyVault_debts') || '[]')
            }
        };

        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MoneyVault_Backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    restoreData(fileContent) {
        try {
            const backup = JSON.parse(fileContent);

            if (!backup.app || backup.app !== 'MoneyVault') {
                throw new Error('Invalid backup file');
            }

            if (backup.data.transactions) {
                this.transactions = backup.data.transactions;
                this.saveTransactions();
            }

            if (backup.data.users) {
                localStorage.setItem(USERS_KEY, JSON.stringify(backup.data.users));
            }

            if (backup.data.settings) {
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(backup.data.settings));
            }

            if (backup.data.debts) {
                localStorage.setItem('moneyVault_debts', JSON.stringify(backup.data.debts));
            }

            return true;
        } catch (error) {
            console.error('Restore failed:', error);
            return false;
        }
    }

    resetApp() {
        if (confirm('This will delete ALL data including users and transactions. Are you absolutely sure?')) {
            if (confirm('This action cannot be undone. Type "RESET" to confirm.') === true) {
                localStorage.clear();
                window.location.href = 'index.html';
            }
        }
    }
}

// Create global instance
const transactionManager = new TransactionManager();