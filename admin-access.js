// Admin Access and Report Generator

// Initialize Supabase client
const SUPABASE_URL = ''; // TODO: Add your Supabase URL
const SUPABASE_KEY = ''; // TODO: Add your Supabase anon key
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Current admin session
let currentAdmin = null;

// Admin role configurations
const ADMIN_ROLES = {
    security_admin: {
        name: 'Security Administrator',
        allowedReports: ['activity', 'qrggif', 'user'],
        color: '#dc3545'
    },
    report_admin: {
        name: 'Report Administrator',
        allowedReports: ['activity', 'qrggif'],
        color: '#28a745'
    },
    user_admin: {
        name: 'User Administrator',
        allowedReports: ['user'],
        color: '#ffc107'
    },
    audit_admin: {
        name: 'Audit Administrator',
        allowedReports: ['activity'],
        color: '#17a2b8'
    }
};

// Initialize admin keypad handlers
document.addEventListener('DOMContentLoaded', function() {
    initAdminKeypad();
    setupReportGenerator();
});

function initAdminKeypad() {
    const keypadGrid = document.getElementById('keypadGrid');
    const pinDisplay = document.getElementById('pinDisplay');
    const pinError = document.getElementById('pinError');
    const nicknameInput = document.getElementById('nicknameInput');
    
    let currentPin = '';
    
    // Handle digit input
    keypadGrid.addEventListener('click', async (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        
        const digit = button.dataset.digit;
        const action = button.dataset.action;
        
        if (digit) {
            if (currentPin.length < 5) {
                currentPin += digit;
                updatePinDisplay(currentPin);
            }
            
            // Check PIN when 5 digits entered
            if (currentPin.length === 5) {
                await validateAdminPin(currentPin, nicknameInput.value);
            }
        } else if (action) {
            handleKeypadAction(action, currentPin);
        }
    });
    
    function handleKeypadAction(action) {
        switch (action) {
            case 'clear':
                currentPin = '';
                updatePinDisplay(currentPin);
                pinError.textContent = '';
                break;
            case 'backspace':
                currentPin = currentPin.slice(0, -1);
                updatePinDisplay(currentPin);
                break;
        }
    }
    
    function updatePinDisplay(pin) {
        const slots = pinDisplay.querySelectorAll('.pin-slot');
        slots.forEach((slot, index) => {
            if (pin[index]) {
                slot.innerHTML = '●';
            } else {
                slot.innerHTML = '';
            }
        });
    }
}

async function validateAdminPin(pin, nickname) {
    if (!nickname) {
        showError('Please enter your nickname');
        return;
    }

    try {
        const { data, error } = await supabase
            .rpc('validate_admin_pin', { 
                p_pin: pin,
                p_nickname: nickname
            });

        if (error) throw error;

        if (data[0].is_valid) {
            currentAdmin = {
                role: data[0].role_type,
                nickname: nickname
            };
            showSuccess('Access granted!');
            setTimeout(() => {
                showAdminDashboard();
            }, 1000);
        } else {
            showError(data[0].message);
        }
    } catch (err) {
        showError('Authentication failed');
        console.error('Admin validation error:', err);
    }
}

// Report Generator
function setupReportGenerator() {
    const reportForm = document.getElementById('reportForm');
    if (!reportForm) return;

    reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const reportType = document.getElementById('reportType').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const format = document.getElementById('reportFormat').value;

        try {
            // Check if admin has access to this report type
            if (!hasReportAccess(reportType)) {
                showError('You do not have permission to generate this report');
                return;
            }

            const { data: reportId, error } = await supabase
                .rpc('generate_admin_report', {
                    p_report_type: reportType,
                    p_start_date: startDate,
                    p_end_date: endDate,
                    p_format: format
                });

            if (error) throw error;

            // Download the generated report
            await downloadReport(reportId, format);
            showSuccess('Report generated successfully');

        } catch (err) {
            showError('Failed to generate report');
            console.error('Report generation error:', err);
        }
    });
}

function hasReportAccess(reportType) {
    if (!currentAdmin) return false;
    const role = ADMIN_ROLES[currentAdmin.role];
    return role && role.allowedReports.includes(reportType);
}

async function downloadReport(reportId, format) {
    try {
        const { data: blob, error } = await supabase
            .storage
            .from('reports')
            .download(`${reportId}.${format}`);

        if (error) throw error;

        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_${new Date().toISOString()}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (err) {
        showError('Failed to download report');
        console.error('Download error:', err);
    }
}

// UI Helpers
function showSuccess(message) {
    const pinSuccess = document.getElementById('pinSuccess');
    if (pinSuccess) {
        pinSuccess.style.display = 'block';
        pinSuccess.querySelector('p').textContent = message;
    }
}

function showError(message) {
    const pinError = document.getElementById('pinError');
    if (pinError) {
        pinError.textContent = message;
    }
}

function showAdminDashboard() {
    // Hide keypad container
    const keypadContainer = document.getElementById('keypadContainer');
    if (keypadContainer) {
        keypadContainer.style.display = 'none';
    }

    // Show admin dashboard
    const adminDashboard = document.getElementById('adminDashboard');
    if (adminDashboard) {
        adminDashboard.style.display = 'block';
        updateDashboardForRole();
    }
}

function updateDashboardForRole() {
    if (!currentAdmin) return;

    const role = ADMIN_ROLES[currentAdmin.role];
    const reportTypeSelect = document.getElementById('reportType');
    
    if (reportTypeSelect) {
        // Clear existing options
        reportTypeSelect.innerHTML = '';
        
        // Add only allowed report types for the role
        role.allowedReports.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type.charAt(0).toUpperCase() + type.slice(1) + ' Report';
            reportTypeSelect.appendChild(option);
        });
    }

    // Update role indicator
    const roleIndicator = document.getElementById('roleIndicator');
    if (roleIndicator) {
        roleIndicator.innerHTML = `
            <span class="badge" style="background: ${role.color}">
                ${role.name}
            </span>
        `;
    }
}