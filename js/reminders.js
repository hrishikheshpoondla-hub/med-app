// Reminder System

let reminderInterval = null;
let alarmAudio = null;
let currentAlarmMedicine = null;

// Request notification permission
function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            console.log('Notification permission:', permission);
        });
    }
}

// Start reminder checker
function startReminderChecker() {
    // Check every minute
    reminderInterval = setInterval(checkReminders, 60000);
    
    // Initial check
    setTimeout(checkReminders, 1000);
}

// Check for due reminders
function checkReminders() {
    if (!medicines || medicines.length === 0) return;
    
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const today = now.toDateString();
    
    medicines.forEach(medicine => {
        // Check if medicine should be taken today
        if (!shouldTakeMedicineToday(medicine, now)) return;
        
        // Check if already taken
        if (medicine.takenDates && medicine.takenDates[today]) return;
        
        // Check if it's time
        if (medicine.time === currentTime) {
            triggerReminder(medicine);
        }
    });
}

// Trigger a reminder
function triggerReminder(medicine) {
    currentAlarmMedicine = medicine;
    
    // Show browser notification
    showBrowserNotification(medicine);
    
    // Play alarm sound
    playAlarmSound();
    
    // Show alarm modal
    showAlarmModal(medicine);
    
    // Add to notification list
    addNotification({
        type: 'reminder',
        title: 'Medication Reminder',
        message: `Time to take ${medicine.name}`,
        medicine: medicine
    });
}

// Show browser notification
function showBrowserNotification(medicine) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('MedSafe - Medication Reminder', {
            body: `Time to take ${medicine.name} (${medicine.dosage})`,
            icon: '/assets/icon.png',
            tag: `medicine-${medicine.id}`,
            requireInteraction: true
        });
        
        notification.onclick = function() {
            window.focus();
            showAlarmModal(medicine);
        };
    }
}

// Play alarm sound
function playAlarmSound() {
    const soundEnabled = localStorage.getItem('soundAlerts') !== 'false';
    if (!soundEnabled) return;
    
    if (!alarmAudio) {
        alarmAudio = document.getElementById('alarmSound');
    }
    
    if (alarmAudio) {
        alarmAudio.currentTime = 0;
        alarmAudio.play().catch(err => console.log('Audio play failed:', err));
    }
}

// Stop alarm sound
function stopAlarmSound() {
    if (alarmAudio) {
        alarmAudio.pause();
        alarmAudio.currentTime = 0;
    }
}

// Show alarm modal
function showAlarmModal(medicine) {
    const modal = document.getElementById('alarmModal');
    const info = document.getElementById('alarmMedicineInfo');
    
    info.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1rem; justify-content: center;">
            <div class="medicine-icon" style="background: ${hexToRgba(medicine.color || '#1976d2', 0.1)}; width: 64px; height: 64px;">
                <i class="fas fa-pills" style="color: ${medicine.color || '#1976d2'}; font-size: 1.5rem;"></i>
            </div>
            <div style="text-align: left;">
                <h3>${escapeHtml(medicine.name)}</h3>
                <p style="color: var(--text-secondary);">${escapeHtml(medicine.dosage)} ${escapeHtml(medicine.dosageUnit || '')}</p>
                ${medicine.instructions ? `<p style="font-size: 0.875rem; color: var(--text-muted);">${escapeHtml(medicine.instructions)}</p>` : ''}
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

// Close alarm modal
function closeAlarmModal() {
    document.getElementById('alarmModal').classList.remove('active');
    stopAlarmSound();
    currentAlarmMedicine = null;
}

// Take medicine from alarm
async function takeMedicineFromAlarm() {
    if (!currentAlarmMedicine) return;
    
    await takeMedicine(currentAlarmMedicine.id);
    closeAlarmModal();
}

// Snooze alarm
function snoozeAlarm() {
    const snoozeDuration = parseInt(localStorage.getItem('snoozeDuration')) || 5;
    
    closeAlarmModal();
    showToast('info', 'Snoozed', `Reminder snoozed for ${snoozeDuration} minutes`);
    
    // Set timeout for snooze
    setTimeout(() => {
        if (currentAlarmMedicine) {
            triggerReminder(currentAlarmMedicine);
        }
    }, snoozeDuration * 60 * 1000);
}

// Skip medicine
function skipMedicine() {
    closeAlarmModal();
    showToast('warning', 'Skipped', 'Medicine marked as skipped');
    
    // Optionally log as missed
    if (currentAlarmMedicine) {
        logMissedMedicine(currentAlarmMedicine);
    }
}

// Log missed medicine
async function logMissedMedicine(medicine) {
    try {
        await db.collection('users').doc(currentUser.uid)
            .collection('history').add({
                medicineId: medicine.id,
                medicineName: medicine.name,
                dosage: medicine.dosage,
                scheduledTime: medicine.time,
                takenAt: null,
                status: 'missed',
                date: firebase.firestore.Timestamp.fromDate(new Date())
            });
    } catch (error) {
        console.error('Error logging missed medicine:', error);
    }
}

// Add notification to panel
function addNotification(notification) {
    const list = document.getElementById('notificationList');
    const badge = document.getElementById('notificationBadge');
    
    if (!list) return;
    
    // Remove empty state if present
    const emptyState = list.querySelector('.empty-state');
    if (emptyState) emptyState.remove();
    
    const iconClass = notification.type === 'reminder' ? 'reminder' : 
                      notification.type === 'warning' ? 'warning' : 'success';
    const iconName = notification.type === 'reminder' ? 'fa-bell' : 
                     notification.type === 'warning' ? 'fa-exclamation-triangle' : 'fa-check';
    
    const item = document.createElement('div');
    item.className = 'notification-item unread';
    item.innerHTML = `
        <div class="notification-icon ${iconClass}">
            <i class="fas ${iconName}"></i>
        </div>
        <div class="notification-content">
            <h4>${escapeHtml(notification.title)}</h4>
            <p>${escapeHtml(notification.message)}</p>
            <span class="time">Just now</span>
        </div>
    `;
    
    list.insertBefore(item, list.firstChild);
    
    // Update badge
    const currentCount = parseInt(badge.textContent) || 0;
    badge.textContent = currentCount + 1;
}

// Test alarm sound
function testAlarmSound() {
    playAlarmSound();
    setTimeout(stopAlarmSound, 3000);
}

// Change reminder sound
function changeReminderSound() {
    const sound = document.getElementById('reminderSound').value;
    localStorage.setItem('reminderSound', sound);
    
    // In a real implementation, you would load different audio files based on the selection
    showToast('success', 'Updated', 'Reminder sound changed');
}
