// QRGGIF Admin Panel JavaScript

// Initialize Supabase client
const SUPABASE_URL = ''; // TODO: Add your Supabase URL
const SUPABASE_KEY = ''; // TODO: Add your Supabase anon key
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Roles and their permissions
const ROLES = {
    admin: {
        name: 'Administrator',
        color: '#dc3545',
        permissions: ['read', 'write', 'delete', 'manage_users', 'manage_settings']
    },
    manager: {
        name: 'Manager',
        color: '#ffc107',
        permissions: ['read', 'write']
    },
    viewer: {
        name: 'Viewer',
        color: '#28a745',
        permissions: ['read']
    }
};

// Current user session
let currentUser = null;

// Initialize admin panel
async function initializeAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = '/login.html';
        return;
    }

    // Get user role from profiles table
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    currentUser = {
        ...user,
        role: profile?.role || 'viewer'
    };

    // Update UI based on role
    updateUIForRole();
    loadDashboard();
}

// Update UI elements based on user role
function updateUIForRole() {
    const role = ROLES[currentUser.role];
    document.getElementById('userRole').innerHTML = `
        <span class="role-indicator" style="background: ${role.color}"></span>
        ${role.name}
    `;

    // Show/hide admin-only elements
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = currentUser.role === 'admin' ? '' : 'none';
    });

    // Update action buttons based on permissions
    updateActionButtons();
}

// QRGGIF Management
async function loadQRGGIFs(page = 1, filters = {}) {
    const { data: qrggifs, error } = await supabase
        .from('qr_codes')
        .select('*')
        .order('created_at', { ascending: false })
        .range((page - 1) * 10, page * 10 - 1);

    if (error) {
        showError('Failed to load QRGGIFs');
        return;
    }

    const tbody = document.getElementById('qrggifs-table');
    tbody.innerHTML = '';

    for (const qrggif of qrggifs) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><img src="${qrggif.preview_url}" class="qrggif-preview"></td>
            <td>${qrggif.nickname}</td>
            <td>${qrggif.animation_hash.slice(0, 8)}...</td>
            <td>${new Date(qrggif.created_at).toLocaleDateString()}</td>
            <td>
                ${qrggif.expires_at ? new Date(qrggif.expires_at).toLocaleString() : 'Not set'}
                ${canEdit() ? `
                    <button class="btn btn-sm btn-outline-primary ms-2" 
                            onclick="updateExpiration('${qrggif.id}')">
                        Update
                    </button>
                ` : ''}
            </td>
            <td>${getStatusBadge(qrggif)}</td>
            <td>${getActionButtons(qrggif)}</td>
        `;
        tbody.appendChild(row);
    }

    updatePagination(page, qrggifs.length === 10);
}

// Status badge helper
function getStatusBadge(qrggif) {
    if (!qrggif.last_validated_at) {
        return '<span class="badge bg-secondary status-badge">Pending</span>';
    }
    const now = new Date();
    const expiresAt = new Date(qrggif.expires_at);
    
    if (expiresAt < now) {
        return '<span class="badge bg-danger status-badge">Expired</span>';
    }
    
    const minutesLeft = Math.floor((expiresAt - now) / 1000 / 60);
    return `
        <span class="badge bg-success status-badge">
            Active (${minutesLeft}m left)
        </span>
    `;
}

// Action buttons based on permissions
function getActionButtons(qrggif) {
    const buttons = [];
    
    if (canWrite()) {
        buttons.push(`
            <button class="btn btn-sm btn-warning" 
                    onclick="validateQRGGIF('${qrggif.id}')">
                Validate
            </button>
        `);
    }
    
    if (canDelete()) {
        buttons.push(`
            <button class="btn btn-sm btn-danger" 
                    onclick="deleteQRGGIF('${qrggif.id}')">
                Delete
            </button>
        `);
    }
    
    return buttons.join(' ');
}

// Permission helpers
function canRead() {
    return ROLES[currentUser.role].permissions.includes('read');
}

function canWrite() {
    return ROLES[currentUser.role].permissions.includes('write');
}

function canDelete() {
    return ROLES[currentUser.role].permissions.includes('delete');
}

function canManageUsers() {
    return ROLES[currentUser.role].permissions.includes('manage_users');
}

function canManageSettings() {
    return ROLES[currentUser.role].permissions.includes('manage_settings');
}

// QRGGIF Actions
async function generateQRGGIF() {
    if (!canWrite()) {
        showError('Insufficient permissions');
        return;
    }

    const nickname = document.getElementById('new-nickname').value;
    const expiration = document.getElementById('new-expiration').value;
    const sequence = document.getElementById('new-sequence').value;

    // Call your QRGGIF generation endpoint
    const { data, error } = await supabase.functions.invoke('generate-qrggif', {
        body: { nickname, expiration, sequence }
    });

    if (error) {
        showError('Failed to generate QRGGIF');
        return;
    }

    closeModal('generateModal');
    loadQRGGIFs();
    showSuccess('QRGGIF generated successfully');
}

async function validateQRGGIF(id) {
    if (!canWrite()) {
        showError('Insufficient permissions');
        return;
    }

    const { data, error } = await supabase
        .rpc('validate_qrggif', { 
            p_animation_hash: id,
            p_expiration_minutes: 15
        });

    if (error) {
        showError('Failed to validate QRGGIF');
        return;
    }

    loadQRGGIFs();
    showSuccess('QRGGIF validated successfully');
}

async function updateExpiration(id) {
    if (!canWrite()) {
        showError('Insufficient permissions');
        return;
    }

    const minutes = prompt('Enter new expiration time in minutes (minimum 15):');
    if (!minutes || minutes < 15) {
        showError('Invalid expiration time');
        return;
    }

    const { data, error } = await supabase
        .rpc('update_qrggif_expiration', { 
            p_id: id,
            p_minutes: parseInt(minutes)
        });

    if (error) {
        showError('Failed to update expiration');
        return;
    }

    loadQRGGIFs();
    showSuccess('Expiration updated successfully');
}

async function deleteQRGGIF(id) {
    if (!canDelete()) {
        showError('Insufficient permissions');
        return;
    }

    if (!confirm('Are you sure you want to delete this QRGGIF?')) {
        return;
    }

    const { error } = await supabase
        .from('qr_codes')
        .delete()
        .eq('id', id);

    if (error) {
        showError('Failed to delete QRGGIF');
        return;
    }

    loadQRGGIFs();
    showSuccess('QRGGIF deleted successfully');
}

// User Management
async function loadUsers() {
    if (!canManageUsers()) {
        showError('Insufficient permissions');
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

    const tbody = document.getElementById('users-table');
    tbody.innerHTML = '';

    for (const user of users) {
        const role = ROLES[user.role];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <span class="role-indicator" style="background: ${role.color}"></span>
                ${user.username}
            </td>
            <td>${role.name}</td>
            <td>${user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</td>
            <td>
                <span class="badge ${user.active ? 'bg-success' : 'bg-danger'}">
                    ${user.active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editUser('${user.id}')">
                    Edit
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}')">
                    Delete
                </button>
            </td>
        `;
        tbody.appendChild(row);
    }
}

// Settings Management
async function loadSettings() {
    if (!canManageSettings()) {
        showError('Insufficient permissions');
        return;
    }

    const { data: settings, error } = await supabase
        .from('settings')
        .select('*')
        .single();

    if (error) {
        showError('Failed to load settings');
        return;
    }

    document.getElementById('default-expiration').value = settings.default_expiration;
    document.getElementById('max-expiration').value = settings.max_expiration;
}

async function saveSettings(event) {
    event.preventDefault();
    
    if (!canManageSettings()) {
        showError('Insufficient permissions');
        return;
    }

    const defaultExpiration = parseInt(document.getElementById('default-expiration').value);
    const maxExpiration = parseInt(document.getElementById('max-expiration').value);

    if (defaultExpiration < 15 || maxExpiration < defaultExpiration) {
        showError('Invalid expiration settings');
        return;
    }

    const { error } = await supabase
        .from('settings')
        .update({
            default_expiration: defaultExpiration,
            max_expiration: maxExpiration
        })
        .eq('id', 1);

    if (error) {
        showError('Failed to save settings');
        return;
    }

    showSuccess('Settings saved successfully');
}

// UI Helpers
function showSection(section) {
    document.querySelectorAll('.content-section').forEach(el => {
        el.classList.add('d-none');
    });
    document.getElementById(`${section}-section`).classList.remove('d-none');
    
    document.querySelectorAll('.nav-link').forEach(el => {
        el.classList.remove('active');
    });
    document.querySelector(`[onclick="showSection('${section}')"]`).classList.add('active');

    switch (section) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'qrggifs':
            loadQRGGIFs();
            break;
        case 'users':
            loadUsers();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

function showModal(id) {
    const modal = new bootstrap.Modal(document.getElementById(id));
    modal.show();
}

function closeModal(id) {
    const modal = bootstrap.Modal.getInstance(document.getElementById(id));
    modal.hide();
}

function showError(message) {
    // Implement error toast/alert
    alert(message);
}

function showSuccess(message) {
    // Implement success toast/alert
    alert(message);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initializeAdmin);