// Firebase Configuration
// Replace with your Firebase project credentials
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence()
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.log('Multiple tabs open, persistence enabled in first tab only');
        } else if (err.code === 'unimplemented') {
            console.log('Browser doesn\'t support persistence');
        }
    });

// Auth state observer
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('User logged in:', user.email);
    } else {
        console.log('User logged out');
    }
});
