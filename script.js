const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');

toggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
});

document.querySelectorAll('.nav a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
}));

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
document.getElementById('year').textContent = new Date().getFullYear();

const inquiryForm = document.getElementById('inquiry-form');

if (inquiryForm) inquiryForm.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  if (button.disabled) return;
  const status = document.getElementById('form-status');
  const originalButtonText = button.textContent;

  button.disabled = true;
  button.textContent = 'Sending…';
  status.className = 'form-note';
  status.textContent = 'Sending your inquiry…';

  try {
    const formData = new FormData(form);
    // Only predefined categories may be sent to Analytics, never free-text fields.
    const eventTypes = new Map([
      ['Wedding', 'wedding'],
      ['Corporate Event', 'corporate'],
      ['Private Event', 'private_event'],
      ['Proposal', 'proposal'],
      ['Other', 'other']
    ]);
    const eventType = eventTypes.get(formData.get('type')) || 'other';
    const response = await fetch(form.action, {
      method: 'POST',
      body: formData,
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) throw new Error('Unable to submit inquiry');
    const result = await response.json();
    if (result?.success !== true && result?.success !== 'true') {
      throw new Error('FormSubmit did not confirm success');
    }

    form.reset();
    status.className = 'form-note form-success';
    status.textContent = 'Thank you! Your inquiry has been sent. Elin will be in touch soon.';
    button.textContent = 'Inquiry Sent';
    // Analytics must never interrupt a successful inquiry or trigger a retry.
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'generate_lead', { event_type: eventType });
      }
    } catch (analyticsError) {
      // Keep the successful form state if Analytics is unavailable.
    }
  } catch (error) {
    status.className = 'form-note form-error';
    status.textContent = 'Your inquiry could not be sent. Please try again or email music.by.elink@gmail.com.';
    button.disabled = false;
    button.textContent = originalButtonText;
  }
});
