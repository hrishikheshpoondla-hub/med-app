// Dashboard Functions
console.log('dashboard.js loaded');

// Explicitly export functions to window for onclick handlers (at top to ensure they are defined)
window.showAddMedicineModal = function() { return showAddMedicineModal(); };
window.editMedicine = function(id) { return editMedicine(id); };
window.closeMedicineModal = function() { return closeMedicineModal(); };
window.saveMedicine = function(e) { return saveMedicine(e); };
window.deleteMedicine = function(id) { return deleteMedicine(id); };
window.takeMedicine = function(id) { return takeMedicine(id); };
window.markAllTaken = function() { return markAllTaken(); };
window.filterMedicines = function() { return filterMedicines(); };
window.showDashboard = function() { return showDashboard(); };
window.showMedicines = function() { return showMedicines(); };
window.showHistory = function() { return showHistory(); };
window.showReports = function() { return showReports(); };
window.toggleUserMenu = function() { return toggleUserMenu(); };
window.showNotifications = function() { return showNotifications(); };
window.clearAllNotifications = function() { return clearAllNotifications(); };
window.showEmergencyModal = function() { return showEmergencyModal(); };
window.closeEmergencyModal = function() { return closeEmergencyModal(); };
window.saveEmergencyContact = function() { return saveEmergencyContact(); };
window.toggleTheme = function() { return toggleTheme(); };
window.formatTime = function(t) { return formatTime(t); };
window.formatDate = function(d) { return formatDate(d); };
window.formatDateTime = function(d) { return formatDateTime(d); };
window.formatFrequency = function(f) { return formatFrequency(f); };
window.escapeHtml = function(s) { return escapeHtml(s); };

let currentUser = null;
let medicines = [];
let history = [];
let currentAlarmMedicine = null;

// Initialize Dashboard function
async function initializeDashboard() {
    try {
        console.log('Initializing Dashboard...');
        // Check authentication
        currentUser = await requireAuth();
        if (!currentUser) return;
        
        // Load user data
        await loadUserData();
        
        // Initialize UI
        initializeSidebar();
        initializeTheme();
        updateGreeting();
        
        // Load medicines and set up reminders
        await loadMedicines();
        
        // Initialize charts (don't block if they fail)
        try {
            await initializeCharts();
        } catch (chartError) {
            console.error('Failed to initialize charts:', chartError);
        }
        
        // Request notification permission
        requestNotificationPermission();
        
        // Start reminder checker
        startReminderChecker();
        console.log('Dashboard initialized successfully.');
    } catch (error) {
        console.error('Error during dashboard initialization:', error);
    }
}

// Start initialization based on document state
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
    initializeDashboard();
}

// Load user data
async function loadUserData() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Update UI with user data
            document.getElementById('userName').textContent = userData.firstName || 'User';
            document.getElementById('userFirstName').textContent = userData.firstName || 'User';
            
            // Apply saved settings
            if (userData.settings) {
                applyUserSettings(userData.settings);
            }
            
            // Load emergency contact
            if (userData.emergencyContact) {
                document.getElementById('emergencyContactNumber').textContent = userData.emergencyContact.phone || 'Not set';
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Initialize sidebar
function initializeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarClose = document.getElementById('sidebarClose');
    
    sidebarToggle?.addEventListener('click', () => {
        sidebar.classList.add('active');
    });
    
    sidebarClose?.addEventListener('click', () => {
        sidebar.classList.remove('active');
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 968) {
            if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });
}

// Initialize theme
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// Toggle theme
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    // Save preference to Firestore
    if (currentUser) {
        db.collection('users').doc(currentUser.uid).update({
            'settings.darkMode': newTheme === 'dark'
        });
    }
}

// Update greeting based on time
function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Morning';
    
    if (hour >= 12 && hour < 17) {
        greeting = 'Afternoon';
    } else if (hour >= 17) {
        greeting = 'Evening';
    }
    
    const greetingElement = document.getElementById('greeting');
    if (greetingElement) {
        greetingElement.textContent = greeting;
    }
}

// Load medicines from Firestore
async function loadMedicines() {
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid)
            .collection('medicines').get();
        
        medicines = [];
        snapshot.forEach(doc => {
            medicines.push({ id: doc.id, ...doc.data() });
        });
        
        renderMedicines();
        updateStats();
        renderReminders();
    } catch (error) {
        console.error('Error loading medicines:', error);
        showToast('error', 'Error', 'Failed to load medicines');
    }
}

// Render medicines list
function renderMedicines() {
    const container = document.getElementById('medicinesList');
    const emptyState = document.getElementById('emptyState');
    const filter = document.getElementById('filterMedicines')?.value || 'all';
    
    if (!container) return;
    
    // Get today's scheduled medicines
    const today = new Date();
    const todaysMedicines = medicines.filter(med => {
        return shouldTakeMedicineToday(med, today);
    });
    
    // Filter based on selection
    let filteredMedicines = todaysMedicines;
    if (filter !== 'all') {
        filteredMedicines = todaysMedicines.filter(med => {
            const status = getMedicineStatus(med);
            return status === filter;
        });
    }
    
    if (filteredMedicines.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }
    
    if (emptyState) emptyState.classList.add('hidden');
    
    // Sort by time
    filteredMedicines.sort((a, b) => {
        return a.time.localeCompare(b.time);
    });
    
    container.innerHTML = filteredMedicines.map(med => {
        const status = getMedicineStatus(med);
        const statusClass = status === 'taken' ? 'taken' : (status === 'missed' ? 'missed' : '');
        
        return `
            <div class="medicine-item-full ${statusClass}" data-id="${med.id}">
                <div class="medicine-icon" style="background: ${hexToRgba(med.color || '#1976d2', 0.1)};">
                    <i class="fas fa-pills" style="color: ${med.color || '#1976d2'};"></i>
                </div>
                <div class="medicine-details">
                    <h4>${escapeHtml(med.name)}</h4>
                    <p>${escapeHtml(med.dosage)} ${escapeHtml(med.dosageUnit || '')}</p>
                    <div class="medicine-time">
                        <i class="fas fa-clock"></i>
                        <span>${formatTime(med.time)}</span>
                        ${med.instructions ? `<span class="text-muted">• ${escapeHtml(med.instructions)}</span>` : ''}
                    </div>
                </div>
                <div class="medicine-actions">
                    ${status === 'pending' ? `
                        <button class="btn btn-success btn-sm" onclick="takeMedicine('${med.id}')">
                            <i class="fas fa-check"></i> Take
                        </button>
                    ` : status === 'taken' ? `
                        <span class="badge badge-success">
                            <i class="fas fa-check"></i> Taken
                        </span>
                    ` : `
                        <span class="badge badge-danger">
                            <i class="fas fa-times"></i> Missed
                        </span>
                    `}
                    <button class="btn btn-ghost btn-sm" onclick="editMedicine('${med.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Check if medicine should be taken today
function shouldTakeMedicineToday(medicine, date) {
    const dayOfWeek = date.getDay();
    
    switch (medicine.frequency) {
        case 'daily':
        case 'twice':
        case 'thrice':
            return true;
        case 'weekly':
            // Check if today matches the scheduled day
            return medicine.days?.includes(dayOfWeek) || dayOfWeek === 0;
        case 'custom':
            return medicine.days?.includes(dayOfWeek);
        default:
            return true;
    }
}

// Get medicine status for today
function getMedicineStatus(medicine) {
    const today = new Date().toDateString();
    const now = new Date();
    const [hours, minutes] = medicine.time.split(':').map(Number);
    const medicineTime = new Date();
    medicineTime.setHours(hours, minutes, 0, 0);
    
    // Check if taken today
    if (medicine.takenDates && medicine.takenDates[today]) {
        return 'taken';
    }
    
    // Check if time has passed (with 30 min grace period)
    const gracePeriod = 30 * 60 * 1000; // 30 minutes
    if (now > new Date(medicineTime.getTime() + gracePeriod)) {
        return 'missed';
    }
    
    return 'pending';
}

// Update statistics
function updateStats() {
    const today = new Date();
    const todaysMedicines = medicines.filter(med => shouldTakeMedicineToday(med, today));
    
    let taken = 0;
    let missed = 0;
    let upcoming = 0;
    
    todaysMedicines.forEach(med => {
        const status = getMedicineStatus(med);
        if (status === 'taken') taken++;
        else if (status === 'missed') missed++;
        else upcoming++;
    });
    
    document.getElementById('todayCount').textContent = todaysMedicines.length;
    document.getElementById('takenCount').textContent = taken;
    document.getElementById('missedCount').textContent = missed;
    document.getElementById('upcomingCount').textContent = upcoming;
}

// Render upcoming reminders
function renderReminders() {
    const container = document.getElementById('remindersList');
    if (!container) return;
    
    const now = new Date();
    const today = new Date();
    
    // Get upcoming medicines for today
    const upcoming = medicines
        .filter(med => {
            if (!shouldTakeMedicineToday(med, today)) return false;
            const status = getMedicineStatus(med);
            return status === 'pending';
        })
        .sort((a, b) => a.time.localeCompare(b.time))
        .slice(0, 5);
    
    if (upcoming.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 2rem;">
                <i class="fas fa-check-circle" style="color: var(--success);"></i>
                <p>No upcoming reminders</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = upcoming.map(med => `
        <div class="reminder-item">
            <div class="reminder-time">${formatTime(med.time)}</div>
            <div class="reminder-info">
                <h4>${escapeHtml(med.name)}</h4>
                <p>${escapeHtml(med.dosage)} ${escapeHtml(med.dosageUnit || '')}</p>
            </div>
        </div>
    `).join('');
}

// Take medicine
async function takeMedicine(medicineId) {
    const medicine = medicines.find(m => m.id === medicineId);
    if (!medicine) return;
    
    // Check for overdose
    if (medicine.maxDailyDose) {
        const todayCount = await getTodayDoseCount(medicineId);
        if (todayCount >= medicine.maxDailyDose) {
            showOverdoseWarning(medicine, todayCount);
            return;
        }
    }
    
    try {
        const today = new Date().toDateString();
        const takenAt = new Date().toISOString();
        
        // Update medicine document
        await db.collection('users').doc(currentUser.uid)
            .collection('medicines').doc(medicineId)
            .update({
                [`takenDates.${today}`]: takenAt
            });
        
        // Add to history
        await db.collection('users').doc(currentUser.uid)
            .collection('history').add({
                medicineId: medicineId,
                medicineName: medicine.name,
                dosage: medicine.dosage,
                scheduledTime: medicine.time,
                takenAt: takenAt,
                status: 'taken',
                date: firebase.firestore.Timestamp.fromDate(new Date())
            });
        
        // Update local data
        medicine.takenDates = medicine.takenDates || {};
        medicine.takenDates[today] = takenAt;
        
        renderMedicines();
        updateStats();
        renderReminders();
        
        // Update charts to reflect new history
        try {
            await initializeCharts();
        } catch (e) {
            console.error('Failed to update charts after taking medicine');
        }
        
        showToast('success', 'Medicine Taken', `${medicine.name} marked as taken.`);
    } catch (error) {
        console.error('Error taking medicine:', error);
        showToast('error', 'Error', 'Failed to update medicine status');
    }
}

// Get today's dose count
async function getTodayDoseCount(medicineId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const snapshot = await db.collection('users').doc(currentUser.uid)
        .collection('history')
        .where('medicineId', '==', medicineId)
        .where('date', '>=', firebase.firestore.Timestamp.fromDate(today))
        .where('status', '==', 'taken')
        .get();
    
    return snapshot.size;
}

// Show overdose warning
function showOverdoseWarning(medicine, currentCount) {
    const modal = document.getElementById('overdoseModal');
    const details = document.getElementById('overdoseDetails');
    
    details.innerHTML = `
        <p><strong>Medicine:</strong> ${escapeHtml(medicine.name)}</p>
        <p><strong>Maximum Daily Dose:</strong> ${medicine.maxDailyDose}</p>
        <p><strong>Doses Taken Today:</strong> ${currentCount}</p>
    `;
    
    document.getElementById('overdoseMessage').textContent = 
        `You have already taken ${currentCount} dose(s) of ${medicine.name} today. ` +
        `The maximum recommended daily dose is ${medicine.maxDailyDose}.`;
    
    modal.classList.add('active');
}

function closeOverdoseModal() {
    document.getElementById('overdoseModal').classList.remove('active');
}

// Show/Edit Medicine Modal
function showAddMedicineModal() {
    document.getElementById('medicineModalTitle').textContent = 'Add Medicine';
    document.getElementById('medicineForm').reset();
    document.getElementById('medicineId').value = '';
    document.getElementById('customDaysGroup').classList.add('hidden');
    document.getElementById('medicineModal').classList.add('active');
}

function editMedicine(medicineId) {
    const medicine = medicines.find(m => m.id === medicineId);
    if (!medicine) return;
    
    document.getElementById('medicineModalTitle').textContent = 'Edit Medicine';
    document.getElementById('medicineId').value = medicineId;
    document.getElementById('medicineName').value = medicine.name;
    document.getElementById('dosage').value = medicine.dosage.replace(/[^0-9.]/g, '');
    document.getElementById('dosageUnit').value = medicine.dosageUnit || 'mg';
    document.getElementById('medicineTime').value = medicine.time;
    document.getElementById('frequency').value = medicine.frequency;
    document.getElementById('instructions').value = medicine.instructions || '';
    document.getElementById('maxDailyDose').value = medicine.maxDailyDose || '';
    
    // Set color
    const colorRadios = document.querySelectorAll('input[name="color"]');
    colorRadios.forEach(radio => {
        radio.checked = radio.value === (medicine.color || '#1976d2');
    });
    
    // Set custom days if applicable
    if (medicine.frequency === 'custom' && medicine.days) {
        document.getElementById('customDaysGroup').classList.remove('hidden');
        const dayCheckboxes = document.querySelectorAll('input[name="days"]');
        dayCheckboxes.forEach(cb => {
            cb.checked = medicine.days.includes(parseInt(cb.value));
        });
    }
    
    document.getElementById('medicineModal').classList.add('active');
}

function closeMedicineModal() {
    document.getElementById('medicineModal').classList.remove('active');
}

// Handle frequency change
document.getElementById('frequency')?.addEventListener('change', function() {
    const customDaysGroup = document.getElementById('customDaysGroup');
    if (this.value === 'custom') {
        customDaysGroup.classList.remove('hidden');
    } else {
        customDaysGroup.classList.add('hidden');
    }
});

// Save medicine
async function saveMedicine(event) {
    event.preventDefault();
    
    const medicineId = document.getElementById('medicineId').value;
    const name = document.getElementById('medicineName').value;
    const dosage = document.getElementById('dosage').value;
    const dosageUnit = document.getElementById('dosageUnit').value;
    const time = document.getElementById('medicineTime').value;
    const frequency = document.getElementById('frequency').value;
    const instructions = document.getElementById('instructions').value;
    const maxDailyDose = document.getElementById('maxDailyDose').value;
    const color = document.querySelector('input[name="color"]:checked').value;
    
    // Get custom days if applicable
    let days = [];
    if (frequency === 'custom') {
        const dayCheckboxes = document.querySelectorAll('input[name="days"]:checked');
        days = Array.from(dayCheckboxes).map(cb => parseInt(cb.value));
    }
    
    const medicineData = {
        name,
        dosage: `${dosage}`,
        dosageUnit,
        time,
        frequency,
        instructions,
        maxDailyDose: maxDailyDose ? parseInt(maxDailyDose) : null,
        color,
        days,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        if (medicineId) {
            // Update existing
            await db.collection('users').doc(currentUser.uid)
                .collection('medicines').doc(medicineId)
                .update(medicineData);
            showToast('success', 'Updated', 'Medicine updated successfully');
        } else {
            // Create new
            medicineData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            medicineData.takenDates = {};
            await db.collection('users').doc(currentUser.uid)
                .collection('medicines').add(medicineData);
            showToast('success', 'Added', 'Medicine added successfully');
        }
        
        closeMedicineModal();
        await loadMedicines();
        await initializeCharts();
    } catch (error) {
        console.error('Error saving medicine:', error);
        showToast('error', 'Error', 'Failed to save medicine');
    }
}

// Delete medicine
async function deleteMedicine(medicineId) {
    if (!confirm('Are you sure you want to delete this medicine?')) return;
    
    try {
        await db.collection('users').doc(currentUser.uid)
            .collection('medicines').doc(medicineId)
            .delete();
        
        showToast('success', 'Deleted', 'Medicine deleted successfully');
        await loadMedicines();
        await initializeCharts();
    } catch (error) {
        console.error('Error deleting medicine:', error);
        showToast('error', 'Error', 'Failed to delete medicine');
    }
}

// Mark all as taken
async function markAllTaken() {
    const today = new Date();
    const pendingMedicines = medicines.filter(med => {
        if (!shouldTakeMedicineToday(med, today)) return false;
        return getMedicineStatus(med) === 'pending';
    });
    
    if (pendingMedicines.length === 0) {
        showToast('info', 'No Pending', 'All medicines have already been taken!');
        return;
    }
    
    for (const med of pendingMedicines) {
        await takeMedicine(med.id);
    }
    
    // Charts will be updated by individual takeMedicine calls, 
    // but we can call it once more to be sure if needed.
}

// Filter medicines
function filterMedicines() {
    renderMedicines();
}

// View switching
function showDashboard() {
    document.getElementById('dashboardContent').classList.remove('hidden');
    document.getElementById('medicinesView')?.classList.add('hidden');
    document.getElementById('historyView')?.classList.add('hidden');
    document.getElementById('reportsView')?.classList.add('hidden');
}

function showMedicines() {
    document.getElementById('dashboardContent').classList.add('hidden');
    document.getElementById('medicinesView').classList.remove('hidden');
    document.getElementById('historyView')?.classList.add('hidden');
    document.getElementById('reportsView')?.classList.add('hidden');
    renderAllMedicines();
}

function showHistory() {
    document.getElementById('dashboardContent').classList.add('hidden');
    document.getElementById('medicinesView')?.classList.add('hidden');
    document.getElementById('historyView').classList.remove('hidden');
    document.getElementById('reportsView')?.classList.add('hidden');
    loadHistory();
}

function showReports() {
    document.getElementById('dashboardContent').classList.add('hidden');
    document.getElementById('medicinesView')?.classList.add('hidden');
    document.getElementById('historyView')?.classList.add('hidden');
    document.getElementById('reportsView').classList.remove('hidden');
    loadReports();
}

// Render all medicines grid
function renderAllMedicines() {
    const container = document.getElementById('allMedicinesGrid');
    if (!container) return;
    
    if (medicines.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-pills"></i>
                <h3>No medicines added</h3>
                <p>Add your first medicine to get started</p>
                <button class="btn btn-primary" onclick="showAddMedicineModal()">
                    <i class="fas fa-plus"></i> Add Medicine
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = medicines.map(med => `
        <div class="medicine-card">
            <div class="medicine-card-header">
                <div class="medicine-icon" style="background: ${hexToRgba(med.color || '#1976d2', 0.1)};">
                    <i class="fas fa-pills" style="color: ${med.color || '#1976d2'};"></i>
                </div>
                <div class="card-menu">
                    <button class="menu-btn" onclick="toggleMedicineMenu('${med.id}')">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div class="menu-dropdown" id="menu-${med.id}">
                        <button onclick="editMedicine('${med.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="delete" onclick="deleteMedicine('${med.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
            <h3>${escapeHtml(med.name)}</h3>
            <p class="dosage">${escapeHtml(med.dosage)} ${escapeHtml(med.dosageUnit || '')}</p>
            <div class="medicine-card-details">
                <div class="detail">
                    <i class="fas fa-clock"></i>
                    <span>${formatTime(med.time)}</span>
                </div>
                <div class="detail">
                    <i class="fas fa-redo"></i>
                    <span>${formatFrequency(med.frequency)}</span>
                </div>
                ${med.instructions ? `
                    <div class="detail">
                        <i class="fas fa-info-circle"></i>
                        <span>${escapeHtml(med.instructions)}</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function toggleMedicineMenu(medicineId) {
    const menu = document.getElementById(`menu-${medicineId}`);
    const allMenus = document.querySelectorAll('.menu-dropdown');
    
    allMenus.forEach(m => {
        if (m.id !== `menu-${medicineId}`) {
            m.classList.remove('active');
        }
    });
    
    menu.classList.toggle('active');
}

// Close menus when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.card-menu')) {
        document.querySelectorAll('.menu-dropdown').forEach(m => m.classList.remove('active'));
    }
});

// Load history
async function loadHistory() {
    const container = document.getElementById('historyTableBody');
    if (!container) return;
    
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid)
            .collection('history')
            .orderBy('date', 'desc')
            .limit(100)
            .get();
        
        if (snapshot.empty) {
            container.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem;">
                        No history records found
                    </td>
                </tr>
            `;
            return;
        }
        
        container.innerHTML = snapshot.docs.map(doc => {
            const data = doc.data();
            const date = data.date.toDate();
            
            return `
                <tr>
                    <td>${formatDate(date)}</td>
                    <td>${escapeHtml(data.medicineName)}</td>
                    <td>${escapeHtml(data.dosage)}</td>
                    <td>${formatTime(data.scheduledTime)}</td>
                    <td>
                        <span class="badge badge-${data.status === 'taken' ? 'success' : 'danger'}">
                            ${data.status}
                        </span>
                    </td>
                    <td>${data.takenAt ? formatDateTime(new Date(data.takenAt)) : '-'}</td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// Load reports
async function loadReports() {
    // Calculate statistics
    const snapshot = await db.collection('users').doc(currentUser.uid)
        .collection('history')
        .get();
    
    let totalTaken = 0;
    let totalScheduled = 0;
    const dailyData = {};
    const monthlyData = {};
    
    snapshot.forEach(doc => {
        const data = doc.data();
        totalScheduled++;
        if (data.status === 'taken') totalTaken++;
        
        const date = data.date.toDate();
        const dayKey = date.toISOString().split('T')[0];
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!dailyData[dayKey]) {
            dailyData[dayKey] = { taken: 0, total: 0 };
        }
        dailyData[dayKey].total++;
        if (data.status === 'taken') dailyData[dayKey].taken++;
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { taken: 0, total: 0 };
        }
        monthlyData[monthKey].total++;
        if (data.status === 'taken') monthlyData[monthKey].taken++;
    });
    
    // Update stats
    document.getElementById('totalDoses').textContent = totalTaken;
    document.getElementById('overallAdherence').textContent = 
        totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) + '%' : '0%';
    
    // Calculate streak
    const streak = calculateStreak(dailyData);
    document.getElementById('currentStreak').textContent = streak + ' days';
    
    // Update monthly chart
    updateMonthlyChart(monthlyData);
    
    // Update distribution chart
    updateDistributionChart();
}

function calculateStreak(dailyData) {
    const dates = Object.keys(dailyData).sort().reverse();
    let streak = 0;
    
    for (const date of dates) {
        if (dailyData[date].taken === dailyData[date].total && dailyData[date].total > 0) {
            streak++;
        } else {
            break;
        }
    }
    
    return streak;
}

// Download report
function downloadReport() {
    // Generate PDF report
    const reportData = {
        user: currentUser.displayName || 'User',
        date: new Date().toLocaleDateString(),
        medicines: medicines,
        // Add more data as needed
    };
    
    // For simplicity, we'll create a text file. In production, use a PDF library
    const content = `
MEDICATION REPORT
Generated: ${reportData.date}
User: ${reportData.user}

MEDICINES:
${medicines.map(m => `- ${m.name}: ${m.dosage} ${m.dosageUnit} at ${formatTime(m.time)} (${m.frequency})`).join('\n')}

This report was generated by MedSafe - Medication Safety in the Digital Age
    `.trim();
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medication-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('success', 'Downloaded', 'Report downloaded successfully');
}

// Initialize charts
async function initializeCharts() {
    // Weekly adherence chart
    const ctx = document.getElementById('adherenceChart')?.getContext('2d');
    if (!ctx) return;
    
    // Fetch history for the last 7 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    
    let historySnapshot;
    try {
        historySnapshot = await db.collection('users').doc(currentUser.uid)
            .collection('history')
            .where('date', '>=', firebase.firestore.Timestamp.fromDate(sevenDaysAgo))
            .get();
    } catch (error) {
        console.error('Error fetching history for chart:', error);
        return;
    }
    
    const dailyStats = {};
    historySnapshot.forEach(doc => {
        const data = doc.data();
        const dateKey = data.date.toDate().toDateString();
        if (!dailyStats[dateKey]) {
            dailyStats[dateKey] = { taken: 0, total: 0 };
        }
        dailyStats[dateKey].total++;
        if (data.status === 'taken') {
            dailyStats[dateKey].taken++;
        }
    });
    
    const labels = [];
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toDateString();
        
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        
        const stats = dailyStats[dateString];
        if (stats && stats.total > 0) {
            data.push(Math.round((stats.taken / stats.total) * 100));
        } else {
            // For future or days with no scheduled medicine, we can show 100% if nothing was missed, 
            // but 0% is safer if we don't know the schedule. 
            // Let's check the medicines schedule for that day to be accurate.
            const scheduledForDay = medicines.filter(m => shouldTakeMedicineToday(m, date)).length;
            if (scheduledForDay > 0) {
                data.push(0); // Had medicines but didn't take any
            } else {
                data.push(100); // Nothing scheduled, so 100% adherence technically
            }
        }
    }
    
    // If a chart already exists, destroy it first to avoid overlap
    if (window.myAdherenceChart) {
        window.myAdherenceChart.destroy();
    }
    
    window.myAdherenceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Adherence %',
                data: data,
                borderColor: '#1976d2',
                backgroundColor: 'rgba(25, 118, 210, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#1976d2'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: value => value + '%'
                    }
                }
            }
        }
    });
    
    // Update adherence rate
    const avgAdherence = data.length > 0 ? Math.round(data.reduce((a, b) => a + b, 0) / data.length) : 0;
    document.getElementById('adherenceRate').textContent = avgAdherence + '%';
}

function updateMonthlyChart(monthlyData) {
    const ctx = document.getElementById('monthlyChart')?.getContext('2d');
    if (!ctx) return;
    
    const labels = Object.keys(monthlyData).slice(-6);
    const data = labels.map(key => {
        const d = monthlyData[key];
        return d.total > 0 ? Math.round((d.taken / d.total) * 100) : 0;
    });
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.map(l => {
                const [year, month] = l.split('-');
                return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short' });
            }),
            datasets: [{
                label: 'Adherence %',
                data: data,
                backgroundColor: '#1976d2'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

function updateDistributionChart() {
    const ctx = document.getElementById('distributionChart')?.getContext('2d');
    if (!ctx) return;
    
    const frequencies = {};
    medicines.forEach(m => {
        frequencies[m.frequency] = (frequencies[m.frequency] || 0) + 1;
    });
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(frequencies).map(formatFrequency),
            datasets: [{
                data: Object.values(frequencies),
                backgroundColor: ['#1976d2', '#4caf50', '#ff9800', '#f44336', '#9c27b0']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// User menu toggle
function toggleUserMenu() {
    document.getElementById('userDropdown').classList.toggle('active');
}

// Close user menu when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
        document.getElementById('userDropdown')?.classList.remove('active');
    }
});

// Notifications
function showNotifications() {
    document.getElementById('notificationPanel').classList.toggle('active');
    document.getElementById('notificationPanel').classList.toggle('hidden');
}

function clearAllNotifications() {
    document.getElementById('notificationList').innerHTML = `
        <div class="empty-state" style="padding: 2rem;">
            <i class="fas fa-bell-slash"></i>
            <p>No notifications</p>
        </div>
    `;
    document.getElementById('notificationBadge').textContent = '0';
}

// Emergency modal
function showEmergencyModal() {
    document.getElementById('emergencyModal').classList.add('active');
}

function closeEmergencyModal() {
    document.getElementById('emergencyModal').classList.remove('active');
}

async function saveEmergencyContact() {
    const name = document.getElementById('emergencyName').value;
    const phone = document.getElementById('emergencyPhone').value;
    
    if (!name || !phone) {
        showToast('error', 'Error', 'Please fill in all fields');
        return;
    }
    
    try {
        await db.collection('users').doc(currentUser.uid).update({
            emergencyContact: { name, phone }
        });
        
        document.getElementById('emergencyContactNumber').textContent = phone;
        showToast('success', 'Saved', 'Emergency contact saved');
    } catch (error) {
        showToast('error', 'Error', 'Failed to save contact');
    }
}

// Apply user settings
function applyUserSettings(settings) {
    if (settings.darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) themeIcon.className = 'fas fa-sun';
    }
}

// Utility functions
function formatTime(time) {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(date) {
    return date.toLocaleString('en-US', { 
        month: 'short', day: 'numeric', 
        hour: 'numeric', minute: '2-digit' 
    });
}

function formatFrequency(freq) {
    const formats = {
        daily: 'Daily',
        twice: 'Twice Daily',
        thrice: 'Three Times Daily',
        weekly: 'Weekly',
        custom: 'Custom'
    };
    return formats[freq] || freq;
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
