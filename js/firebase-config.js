// Firebase Configuration
// Replace with your Firebase project credentials
const firebaseConfig = {
    apiKey: "AIzaSyAl4OW8qWAZCucfypqYCbYsaxPgfaKQoh0",
    authDomain: "medsafe-app-14f9b.firebaseapp.com",
    projectId: "medsafe-app-14f9b",
    storageBucket: "medsafe-app-14f9b.firebasestorage.app",
    messagingSenderId: "363606569248",
    appId: "1:363606569248:web:ba17ca49a44005ee39a745"
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
