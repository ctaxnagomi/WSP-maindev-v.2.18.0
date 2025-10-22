// Admin UI Enhancements

// Enhanced Roles Configuration
const ROLES = {
    security_admin: {
        name: 'Security Administrator',
        color: '#800000',
        description: 'Full system access including security settings and audit logs',
        permissions: [
            'read', 'write', 'delete', 
            'manage_users', 'manage_settings', 
            'manage_security', 'view_audit_logs',
            'manage_roles'
        ]
    },
    admin: {
        name: 'Administrator',
        color: '#dc3545',
        description: 'Full system access except security settings',
        permissions: [
            'read', 'write', 'delete', 
            'manage_users', 'manage_settings', 
            'view_audit_logs'
        ]
    },
    auditor: {
        name: 'Auditor',
        color: '#6f42c1',
        description: 'Can view and analyze all system activity',
        permissions: [
            'read', 'view_audit_logs', 
            'export_logs', 'generate_reports'
        ]
    },
    manager: {
        name: 'Manager',
        color: '#ffc107',
        description: 'Can manage QRGGIFs and their settings',
        permissions: [
            'read', 'write', 'manage_qrggifs', 
            'validate_qrggifs'
        ]
    },
    generator: {
        name: 'Generator',
        color: '#20c997',
        description: 'Can generate and manage own QRGGIFs',
        permissions: [
            'read', 'generate_qrggifs', 
            'view_own_qrggifs'
        ]
    },
    viewer: {
        name: 'Viewer',
        color: '#28a745',
        description: 'Read-only access to QRGGIFs',
        permissions: ['read']
    }
};

// Audit Log Management
class AuditLogManager {
    constructor() {
        this.filters = {
            startDate: null,
            endDate: null,
            userId: null,
            actionType: null,
            tableName: null
        };
        this.currentPage = 1;
        this.pageSize = 50;
    }

    async loadAuditLogs() {
        if (!canViewAuditLogs()) {
            showError('Insufficient permissions to view audit logs');
            return;
        }

        let query = supabase
            .from('audit_logs')
            .select(`
                *,
                profiles:user_id (username, role)
            `)
            .order('created_at', { ascending: false });

        // Apply filters
        if (this.filters.startDate) {
            query = query.gte('created_at', this.filters.startDate);
        }
        if (this.filters.endDate) {
            query = query.lte('created_at', this.filters.endDate);
        }
        if (this.filters.userId) {
            query = query.eq('user_id', this.filters.userId);
        }
        if (this.filters.actionType) {
            query = query.eq('action_type', this.filters.actionType);
        }
        if (this.filters.tableName) {
            query = query.eq('table_name', this.filters.tableName);
        }

        // Apply pagination
        const start = (this.currentPage - 1) * this.pageSize;
        query = query.range(start, start + this.pageSize - 1);

        const { data: logs, error } = await query;

        if (error) {
            showError('Failed to load audit logs');
            console.error('Audit log error:', error);
            return;
        }

        this.renderAuditLogs(logs);
    }

    renderAuditLogs(logs) {
        const container = document.getElementById('audit-logs-table');
        container.innerHTML = '';

        for (const log of logs) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(log.created_at).toLocaleString()}</td>
                <td>
                    <span class="badge" style="background: ${ROLES[log.profiles?.role]?.color || '#6c757d'}">
                        ${log.profiles?.username || 'Unknown'}
                    </span>
                </td>
                <td>${this.formatAction(log.action_type)}</td>
                <td>${log.table_name}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="auditLogManager.showDetails('${log.id}')">
                        View Details
                    </button>
                </td>
            `;
            container.appendChild(row);
        }
    }

    formatAction(action) {
        const colors = {
            INSERT: 'success',
            UPDATE: 'warning',
            DELETE: 'danger'
        };
        return `<span class="badge bg-${colors[action] || 'secondary'}">${action}</span>`;
    }

    async showDetails(logId) {
        const { data: log, error } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('id', logId)
            .single();

        if (error) {
            showError('Failed to load audit log details');
            return;
        }

        const modal = document.getElementById('auditDetailModal');
        const body = modal.querySelector('.modal-body');
        
        body.innerHTML = `
            <div class="mb-3">
                <h6>Changes</h6>
                <div class="diff-view">
                    ${this.renderDiff(log.old_data, log.new_data)}
                </div>
            </div>
            <div class="mb-3">
                <h6>Metadata</h6>
                <table class="table table-sm">
                    <tr>
                        <th>IP Address</th>
                        <td>${log.ip_address || 'N/A'}</td>
                    </tr>
                    <tr>
                        <th>User Agent</th>
                        <td>${log.user_agent || 'N/A'}</td>
                    </tr>
                    <tr>
                        <th>Timestamp</th>
                        <td>${new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                </table>
            </div>
        `;

        new bootstrap.Modal(modal).show();
    }

    renderDiff(oldData, newData) {
        if (!oldData && !newData) return 'No data available';
        
        const allKeys = new Set([
            ...Object.keys(oldData || {}),
            ...Object.keys(newData || {})
        ]);

        let diffHtml = '<table class="table table-sm diff-table">';
        diffHtml += '<tr><th>Field</th><th>Old Value</th><th>New Value</th></tr>';

        for (const key of allKeys) {
            const oldVal = oldData?.[key];
            const newVal = newData?.[key];
            
            if (oldVal !== newVal) {
                diffHtml += `
                    <tr>
                        <td>${key}</td>
                        <td class="diff-old">${this.formatValue(oldVal)}</td>
                        <td class="diff-new">${this.formatValue(newVal)}</td>
                    </tr>
                `;
            }
        }

        diffHtml += '</table>';
        return diffHtml;
    }

    formatValue(value) {
        if (value === null) return '<em>null</em>';
        if (value === undefined) return '<em>undefined</em>';
        if (typeof value === 'object') return JSON.stringify(value, null, 2);
        return value.toString();
    }

    async exportLogs() {
        if (!canExportLogs()) {
            showError('Insufficient permissions to export logs');
            return;
        }

        const { data: logs, error } = await supabase
            .from('audit_logs')
            .select(`
                *,
                profiles:user_id (username, role)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            showError('Failed to export audit logs');
            return;
        }

        const csv = this.convertToCSV(logs);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `audit_logs_${new Date().toISOString()}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    convertToCSV(logs) {
        const headers = [
            'Timestamp',
            'Username',
            'Role',
            'Action',
            'Table',
            'Record ID',
            'IP Address',
            'User Agent'
        ];

        const rows = logs.map(log => [
            new Date(log.created_at).toISOString(),
            log.profiles?.username || 'Unknown',
            log.profiles?.role || 'Unknown',
            log.action_type,
            log.table_name,
            log.record_id,
            log.ip_address,
            log.user_agent
        ]);

        return [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
    }
}

// Initialize audit log manager
const auditLogManager = new AuditLogManager();

// Enhanced User Management
class UserManager {
    constructor() {
        this.users = [];
        this.currentPage = 1;
        this.pageSize = 10;
    }

    async loadUsers() {
        if (!canManageUsers()) {
            showError('Insufficient permissions to manage users');
            return;
        }

        const { data: users, error } = await supabase
            .from('profiles')
            .select('*')
            .order('username');

        if (error) {
            showError('Failed to load users');
            return;
        }

        this.users = users;
        this.renderUsers();
    }

    renderUsers() {
        const container = document.getElementById('users-table');
        container.innerHTML = '';

        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        const pageUsers = this.users.slice(start, end);

        for (const user of pageUsers) {
            const role = ROLES[user.role];
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <span class="role-indicator" style="background: ${role.color}"></span>
                    ${user.username}
                </td>
                <td>
                    ${role.name}
                    <small class="text-muted d-block">${role.description}</small>
                </td>
                <td>${user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</td>
                <td>
                    <span class="badge ${user.active ? 'bg-success' : 'bg-danger'}">
                        ${user.active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-primary" onclick="userManager.editUser('${user.id}')">
                            Edit
                        </button>
                        <button class="btn btn-sm btn-info" onclick="userManager.viewActivity('${user.id}')">
                            Activity
                        </button>
                        ${canManageRoles() ? `
                            <button class="btn btn-sm btn-warning" onclick="userManager.manageRoles('${user.id}')">
                                Roles
                            </button>
                        ` : ''}
                        ${canDelete() ? `
                            <button class="btn btn-sm btn-danger" onclick="userManager.deleteUser('${user.id}')">
                                Delete
                            </button>
                        ` : ''}
                    </div>
                </td>
            `;
            container.appendChild(row);
        }

        this.renderPagination();
    }

    renderPagination() {
        const totalPages = Math.ceil(this.users.length / this.pageSize);
        const pagination = document.getElementById('users-pagination');
        pagination.innerHTML = '';

        for (let i = 1; i <= totalPages; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === this.currentPage ? 'active' : ''}`;
            li.innerHTML = `
                <a class="page-link" href="#" onclick="userManager.goToPage(${i})">${i}</a>
            `;
            pagination.appendChild(li);
        }
    }

    async viewActivity(userId) {
        if (!canViewAuditLogs()) {
            showError('Insufficient permissions to view user activity');
            return;
        }

        const { data: logs, error } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            showError('Failed to load user activity');
            return;
        }

        const modal = document.getElementById('userActivityModal');
        const body = modal.querySelector('.modal-body');
        
        if (logs.length === 0) {
            body.innerHTML = '<p>No activity recorded for this user.</p>';
        } else {
            body.innerHTML = `
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Action</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${logs.map(log => `
                                <tr>
                                    <td>${new Date(log.created_at).toLocaleString()}</td>
                                    <td>${this.formatAction(log.action_type)}</td>
                                    <td>
                                        <button class="btn btn-sm btn-info" 
                                                onclick="auditLogManager.showDetails('${log.id}')">
                                            View
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        new bootstrap.Modal(modal).show();
    }

    formatAction(action) {
        const colors = {
            INSERT: 'success',
            UPDATE: 'warning',
            DELETE: 'danger'
        };
        return `<span class="badge bg-${colors[action] || 'secondary'}">${action}</span>`;
    }
}

// Initialize user manager
const userManager = new UserManager();