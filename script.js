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
  const status = document.getElementById('form-status');
  const originalButtonText = button.textContent;

  button.disabled = true;
  button.textContent = 'Sending…';
  status.className = 'form-note';
  status.textContent = 'Sending your inquiry…';

  try {
    const response = await fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) throw new Error('Unable to submit inquiry');

    form.reset();
    status.className = 'form-note form-success';
    status.textContent = 'Thank you! Your inquiry has been sent. Elin will be in touch soon.';
    button.textContent = 'Inquiry Sent';
  } catch (error) {
    status.className = 'form-note form-error';
    status.textContent = 'Your inquiry could not be sent. Please try again or email music.by.elink@gmail.com.';
    button.disabled = false;
    button.textContent = originalButtonText;
  }
});
