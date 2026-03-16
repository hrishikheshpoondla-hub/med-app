// Contact Page Functions

// Toggle FAQ
function toggleFaq(button) {
    const faqItem = button.parentElement;
    const isActive = faqItem.classList.contains('active');
    
    // Close all FAQs
    document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Open clicked one if it wasn't active
    if (!isActive) {
        faqItem.classList.add('active');
    }
}

// Handle contact form submission
async function handleContactSubmit(event) {
    event.preventDefault();
    
    const name = document.getElementById('contactName').value;
    const email = document.getElementById('contactEmail').value;
    const subject = document.getElementById('contactSubject').value;
    const message = document.getElementById('contactMessage').value;
    const newsletter = document.getElementById('contactNewsletter').checked;
    
    const submitBtn = document.getElementById('contactSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    
    try {
        // Save to Firestore (in a real app, you might send to an email service)
        await db.collection('contact_messages').add({
            name,
            email,
            subject,
            message,
            newsletter,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'new'
        });
        
        showToast('success', 'Message Sent!', 'Thank you for contacting us. We will get back to you soon.');
        document.getElementById('contactForm').reset();
    } catch (error) {
        console.error('Error sending message:', error);
        showToast('error', 'Error', 'Failed to send message. Please try again.');
    }
    
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
}

// Toast notification function
