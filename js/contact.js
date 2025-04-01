// Contact form functionality
document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Get form data
            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData.entries());

            // Simulate form submission
            console.log('Form submitted:', data);
            
            // Show success message
            showNotification('Message sent successfully!');            
            // Reset form
            contactForm.reset();
        });
    }
});