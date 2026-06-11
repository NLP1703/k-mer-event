// K-MER EVENT survey form logic (external file to satisfy CSP script-src 'self').

// When served by the backend (https://host/survey/) the API is same-origin.
// Override with ?api=…, and fall back to the dev backend when opened from disk.
const API_BASE = new URLSearchParams(location.search).get('api')
  ?? (location.protocol === 'file:' ? 'http://localhost:4000' : '');

const form = document.getElementById('survey');
const err  = document.getElementById('err');
const single = ['q1','q2','q3','q4','q7','q10','q11','q14','q15'];
const multi  = ['q5','q6','q8','q9','q12','q13'];

document.getElementById('clear').addEventListener('click', () => {
  form.reset();
  err.style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.getElementById('again').addEventListener('click', (e) => {
  e.preventDefault();
  location.reload();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Validate: every single-choice and multi-choice question must be answered.
  let firstMissing = null;
  const answered = (name) => !!form.querySelector('input[name="' + name + '"]:checked');
  for (const n of [...single, ...multi]) {
    if (!answered(n) && !firstMissing) firstMissing = n;
  }
  if (firstMissing) {
    err.textContent = 'Please complete all required questions before submitting.';
    err.style.display = 'block';
    const el = form.querySelector('input[name="' + firstMissing + '"]');
    el.closest('.card').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  err.style.display = 'none';

  // Collect; multi-choice questions become arrays.
  const data = {};
  new FormData(form).forEach((v, k) => {
    if (k in data) data[k] = [].concat(data[k], v);
    else data[k] = multi.includes(k) ? [v] : v;
  });

  const btn = form.querySelector('.submit');
  btn.disabled = true; btn.textContent = 'Submitting…';

  try {
    const r = await fetch(API_BASE + '/api/survey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!r.ok) {
      const b = await r.json().catch(() => ({}));
      throw new Error(b.message || ('HTTP ' + r.status));
    }
    // Success — response is stored on the server.
    form.style.display = 'none';
    document.getElementById('done').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (ex) {
    // Never show a false "recorded" screen: surface the error and allow retry.
    err.textContent = 'Submission failed (' + ex.message + '). Please check your connection and try again.';
    err.style.display = 'block';
    err.scrollIntoView({ behavior: 'smooth', block: 'center' });
    btn.disabled = false; btn.textContent = 'Submit';
  }
});
