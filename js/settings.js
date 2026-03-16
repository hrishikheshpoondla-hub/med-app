// Settings Functions

document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    currentUser = await requireAuth();
    if (!currentUser) return;
    
    // Initialize sidebar
    initializeSidebar();
    initializeTheme();
    
    // Load settings
    await loadSettings();
});

// Initialize sidebar (same as dashboard)
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
}

// Load user settings
async function loadSettings() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (!userDoc.exists) return;
        
        const userData = userDoc.data();
        
        // Profile settings
        document.getElementById('profileFirstName').value = userData.firstName || '';
        document.getElementById('profileLastName').value = userData.lastName || '';
        document.getElementById('profileEmail').value = currentUser.email || '';
        document.getElementById('profilePhone').value = userData.phone || '';
        document.getElementById('profileTimezone').value = userData.timezone || 'America/New_York';
        
        // Notification settings
        const settings = userData.settings || {};
        document.getElementById('pushNotifications').checked = settings.pushNotifications !== false;
        document.getElementById('soundAlerts').checked = settings.soundAlerts !== false;
        document.getElementById('reminderSound').value = settings.reminderSound || 'default';
        document.getElementById('snoozeDuration').value = settings.snoozeDuration || 5;
        document.getElementById('emailReminders').checked = settings.emailReminders || false;
        
        // Display settings
        document.getElementById('darkMode').checked = settings.darkMode || false;
        document.getElementById('compactView').checked = settings.compactView || false;
        document.getElementById('timeFormat').value = settings.timeFormat || '12';
        
        // Emergency contact
        if (userData.emergencyContact) {
            document.getElementById('emergencyContactName').value = userData.emergencyContact.name || '';
            document.getElementById('emergencyContactPhone').value = userData.emergencyContact.phone || '';
            document.getElementById('emergencyContactRelation').value = userData.emergencyContact.relation || '';
        }
        
        // Save to localStorage for quick access
        localStorage.setItem('soundAlerts', settings.soundAlerts !== false);
        localStorage.setItem('snoozeDuration', settings.snoozeDuration || 5);
        
        // Update display name in UI
        document.getElementById('userName').textContent = userData.firstName || 'User';
        
    } catch (error) {
        console.error('Error loading settings:', error);
        showToast('error', 'Error', 'Failed to load settings');
    }
}

// Save profile
async function saveProfile(event) {
    event.preventDefault();
    
    const firstName = document.getElementById('profileFirstName').value;
    const lastName = document.getElementById('profileLastName').value;
    const phone = document.getElementById('profilePhone').value;
    const timezone = document.getElementById('profileTimezone').value;
    
    try {
        await db.collection('users').doc(currentUser.uid).update({
            firstName,
            lastName,
            phone,
            timezone,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update display name
        await currentUser.updateProfile({
            displayName: `${firstName} ${lastName}`
        });
        
        document.getElementById('userName').textContent = firstName;
        showToast('success', 'Saved', 'Profile updated successfully');
    } catch (error) {
        console.error('Error saving profile:', error);
        showToast('error', 'Error', 'Failed to save profile');
    }
}

// Save individual setting
async function saveSetting(key, value) {
    try {
        await db.collection('users').doc(currentUser.uid).update({
            [`settings.${key}`]: value
        });
        
        localStorage.setItem(key, value);
        showToast('success', 'Saved', 'Setting updated');
    } catch (error) {
        console.error('Error saving setting:', error);
        showToast('error', 'Error', 'Failed to save setting');
    }
}

// Toggle push notifications
async function togglePushNotifications() {
    const enabled = document.getElementById('pushNotifications').checked;
    
    if (enabled) {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            document.getElementById('pushNotifications').checked = false;
            showToast('warning', 'Permission Denied', 'Please enable notifications in your browser settings');
            return;
        }
    }
    
    saveSetting('pushNotifications', enabled);
}

// Toggle dark mode
function toggleDarkMode() {
    const enabled = document.getElementById('darkMode').checked;
    const theme = enabled ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        themeIcon.className = enabled ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    saveSetting('darkMode', enabled);
}

// Save emergency settings
async function saveEmergencySettings(event) {
    event.preventDefault();
    
    const name = document.getElementById('emergencyContactName').value;
    const phone = document.getElementById('emergencyContactPhone').value;
    const relation = document.getElementById('emergencyContactRelation').value;
    
    if (!name || !phone) {
        showToast('error', 'Error', 'Please fill in name and phone number');
        return;
    }
    
    try {
        await db.collection('users').doc(currentUser.uid).update({
            emergencyContact: { name, phone, relation }
        });
        
        showToast('success', 'Saved', 'Emergency contact saved');
    } catch (error) {
        console.error('Error saving emergency contact:', error);
        showToast('error', 'Error', 'Failed to save emergency contact');
    }
}

// Change password
async function changePassword(event) {
    event.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    
    if (newPassword !== confirmPassword) {
        showToast('error', 'Mismatch', 'New passwords do not match');
        return;
    }
    
    if (newPassword.length < 8) {
        showToast('error', 'Too Short', 'Password must be at least 8 characters');
        return;
    }
    
    try {
        // Re-authenticate user
        const credential = firebase.auth.EmailAuthProvider.credential(
            currentUser.email,
            currentPassword
        );
        await currentUser.reauthenticateWithCredential(credential);
        
        // Update password
        await currentUser.updatePassword(newPassword);
        
        showToast('success', 'Updated', 'Password changed successfully');
        document.getElementById('passwordForm').reset();
    } catch (error) {
        console.error('Error changing password:', error);
        if (error.code === 'auth/wrong-password') {
            showToast('error', 'Wrong Password', 'Current password is incorrect');
        } else {
            showToast('error', 'Error', 'Failed to change password');
        }
    }
}

// Handle avatar change
function handleAvatarChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Preview image
    const reader = new FileReader();
    reader.onload = function(e) {
        const avatar = document.getElementById('profileAvatar');
        avatar.innerHTML = `<img src="${e.target.result}" alt="Avatar">`;
    };
    reader.readAsDataURL(file);
    
    // In a real implementation, you would upload to Firebase Storage
    showToast('info', 'Note', 'Avatar upload requires Firebase Storage setup');
}

// Export data
async function exportData() {
    try {
        // Get all user data
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const medicinesSnapshot = await db.collection('users').doc(currentUser.uid)
            .collection('medicines').get();
        const historySnapshot = await db.collection('users').doc(currentUser.uid)
            .collection('history').get();
        
        const exportData = {
            profile: userDoc.data(),
            medicines: [],
            history: []
        };
        
        medicinesSnapshot.forEach(doc => {
            exportData.medicines.push({ id: doc.id, ...doc.data() });
        });
        
        historySnapshot.forEach(doc => {
            exportData.history.push({ id: doc.id, ...doc.data() });
        });
        
        // Download as JSON
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `medsafe-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('success', 'Exported', 'Data exported successfully');
    } catch (error) {
        console.error('Error exporting data:', error);
        showToast('error', 'Error', 'Failed to export data');
    }
}

// Confirm clear history
function confirmClearHistory() {
    showConfirmModal(
        'Clear History',
        'Are you sure you want to delete all medication history? This action cannot be undone.',
        clearHistory
    );
}

// Clear history
async function clearHistory() {
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid)
            .collection('history').get();
        
        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        
        closeConfirmModal();
        showToast('success', 'Cleared', 'History cleared successfully');
    } catch (error) {
        console.error('Error clearing history:', error);
        showToast('error', 'Error', 'Failed to clear history');
    }
}

// Confirm delete account
function confirmDeleteAccount() {
    showConfirmModal(
        'Delete Account',
        'Are you sure you want to permanently delete your account? All data will be lost and this action cannot be undone.',
        deleteAccount
    );
}

// Delete account
async function deleteAccount() {
    try {
        // Delete user data from Firestore
        const medicinesSnapshot = await db.collection('users').doc(currentUser.uid)
            .collection('medicines').get();
        const historySnapshot = await db.collection('users').doc(currentUser.uid)
            .collection('history').get();
        
        const batch = db.batch();
        medicinesSnapshot.forEach(doc => batch.delete(doc.ref));
        historySnapshot.forEach(doc => batch.delete(doc.ref));
        batch.delete(db.collection('users').doc(currentUser.uid));
        await batch.commit();
        
        // Delete Firebase Auth account
        await currentUser.delete();
        
        showToast('success', 'Deleted', 'Account deleted successfully');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    } catch (error) {
        console.error('Error deleting account:', error);
        if (error.code === 'auth/requires-recent-login') {
            showToast('error', 'Error', 'Please log out and log back in before deleting your account');
        } else {
            showToast('error', 'Error', 'Failed to delete account');
        }
    }
}

// Confirm modal functions
let confirmCallback = null;

function showConfirmModal(title, message, callback) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmModal').classList.add('active');
    confirmCallback = callback;
    
    document.getElementById('confirmBtn').onclick = () => {
        if (confirmCallback) confirmCallback();
    };
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('active');
    confirmCallback = null;
}

// Toggle user menu
function toggleUserMenu() {
    document.getElementById('userDropdown').classList.toggle('active');
}

// Close user menu on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
        document.getElementById('userDropdown')?.classList.remove('active');
    }
});
