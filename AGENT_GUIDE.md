# Antigravity Agent Manual: Medication Safety App

This manual is designed for AI agents (like Antigravity) to quickly understand the architecture, setup, and maintenance of the "Medication Safety in the Digital Age" application.

## 🚀 Quick Start: Running the App

1.  **Local Server**: Start a Python-based HTTP server in the root directory:
    ```bash
    python -m http.server 8080
    ```
2.  **Access**: Open `http://localhost:8080` in your browser.
3.  **Authentication**: Use the following test account for full access:
    - **Email**: `testuser_final@example.com`
    - **Password**: `Password123!`

## 🏗️ Project Architecture

### Front-End (Vanilla HTML/CSS/JS)
- **Framework**: No core framework (e.g., React/Vue); uses Vanilla JS.
- **Charts**: Chart.js (loaded via CDN) for the Weekly Adherence chart.
- **Icons**: Font Awesome (loaded via CDN).
- **Styling**: Found in `css/style.css`.

### Back-End (Firebase)
- **Configuration**: Located in `js/firebase-config.js`.
- **Project ID**: `medsafe-app-14f9b`.
- **Database**: Firestore (in test mode).
- **Authentication**: Firestore Auth (Email/Password & Google).

## 📂 Key Files & Logic

| File | Purpose |
| :--- | :--- |
| `index.html` | Landing page. |
| `dashboard.html` | Main user interface for medication delivery. |
| `js/dashboard.js` | **Critical**: Handles UI rendering, chart initialization, and medication management. |
| `js/auth.js` | Authentication helper and persistence logic. |
| `js/reminders.js` | Logic for sound/browser notifications and daily checks. |
| `js/firebase-config.js`| Firebase SDK initialization and API keys. |

## 🛠️ Maintenance & Common Fixes

- **Global Scope**: All interactive functions in `dashboard.js` (e.g., `showAddMedicineModal`) must be explicitly attached to `window` at the top of the file to work with HTML `onclick` handlers.
- **Initialization**: Check `document.readyState` before adding a `DOMContentLoaded` listener to ensure scripts run even if they load after the DOM is ready.
- **Data Path**: 
  - Medicines: `users/{uid}/medicines`
  - History: `users/{uid}/history`
- **Case Sensitivity**: Ensure directory names remain lowercase (e.g., `css/`, `js/`, `assets/`) for hosting compatibility.

## 🧪 Testing Protocol
- Use the **Browser Subagent** to verify UI changes.
- Specifically check for console errors related to `Chart is not defined` or `Function is not defined`.
- Verify data persistence by checking the Firebase Console after adding a medication.
