document.addEventListener('DOMContentLoaded', () => {
  try {
    // Initialize Bootstrap 5 tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    // Role-based UI adjustments
    const userRole = document.body.dataset.userRole || 'guest';
    if (userRole === 'staff') {
      document.querySelectorAll('.staff-only').forEach(el => el.classList.remove('d-none'));
    } else if (userRole === 'user') {
      document.querySelectorAll('.user-only').forEach(el => el.classList.remove('d-none'));
    }

    // Client-side form validation for event creation/edit
    const eventForms = document.querySelectorAll('form[action^="/events/create"], form[action^="/events/edit"]');
    eventForms.forEach(form => {
      form.addEventListener('submit', (e) => {
        const price = form.querySelector('[name="price"]');
        const totalTickets = form.querySelector('[name="totalTickets"]');
        let valid = true;

        if (price && parseFloat(price.value) < 0) {
          price.classList.add('is-invalid');
          valid = false;
        }
        if (totalTickets && parseInt(totalTickets.value) < 1) {
          totalTickets.classList.add('is-invalid');
          valid = false;
        }

        if (!valid) {
          e.preventDefault();
          alert('Please correct the errors in the form.');
        }
      });
    });

    // Client-side validation for booking form
    const bookingForms = document.querySelectorAll('form[action^="/bookings/create"]');
    bookingForms.forEach(form => {
      form.addEventListener('submit', (e) => {
        const quantity = form.querySelector('[name="quantity"]');
        if (quantity && (parseInt(quantity.value) < 1 || parseInt(quantity.value) > parseInt(quantity.max))) {
          quantity.classList.add('is-invalid');
          e.preventDefault();
          alert('Please enter a valid ticket quantity.');
        }
      });
    });

    console.log('Scripts loaded successfully');
  } catch (err) {
    console.error('Script error:', err);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  console.log('Scripts loaded successfully');

  // Password toggle
  document.querySelectorAll('[data-bs-toggle="password"]').forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-bs-target');
      const input = document.querySelector(targetId);
      const icon = button.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('bi-eye', 'bi-eye-slash');
      } else {
        input.type = 'password';
        icon.classList.replace('bi-eye-slash', 'bi-eye');
      }
    });
  });

  // Form validation
  document.querySelectorAll('form[novalidate]').forEach(form => {
    form.addEventListener('submit', (e) => {
      if (!form.checkValidity()) {
        e.preventDefault();
        e.stopPropagation();
        form.classList.add('was-validated');
      }
    });
  });
});