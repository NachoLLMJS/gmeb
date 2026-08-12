const els = {
  header: document.querySelector('#header-auth'),
  hero: document.querySelector('#hero-action'),
  state: document.querySelector('#ticket-state'),
  body: document.querySelector('#ticket-body')
};
let session = { authenticated: false, configured: false };

const loginButton = (small = false) => {
  const cls = small ? 'small-auth' : 'oauth-button';
  if (!session.configured) return `<a class="${cls}" aria-disabled="true">REDDIT SETUP REQUIRED</a>`;
  return `<a class="${cls}" href="/auth/reddit">${small ? 'CONNECT REDDIT' : 'VERIFY WITH REDDIT →'}</a>`;
};

function renderLoggedOut() {
  els.header.innerHTML = loginButton(true);
  els.hero.innerHTML = loginButton(false) + (!session.configured ? '<p class="notice">The OAuth code is ready. Add your Reddit web-app credentials to the local .env file to activate the real authorization screen.</p>' : '');
  els.state.textContent = 'AWAITING LOGIN';
}

function renderLoggedIn() {
  const name = escapeHtml(session.user.name);
  els.header.innerHTML = `<div class="user-chip"><span>CONNECTED AS <b>u/${name}</b></span><button class="logout" id="logout">EXIT</button></div>`;
  els.hero.innerHTML = `<a class="oauth-button" href="#vault">CHECK MY COMMENT →</a>`;
  els.body.innerHTML = `<div class="big-state">u/</div><div><p class="ticket-label">REDDIT IDENTITY</p><h3>u/${name}</h3><p>Identity connected. Run the read-only check to find an accessible comment in r/wallstreetbets.</p><button class="verify-button" id="verify">VERIFY COMMENT</button></div>`;
  els.state.textContent = 'IDENTITY VERIFIED';
  document.querySelector('#logout').addEventListener('click', logout);
  document.querySelector('#verify').addEventListener('click', verify);
}

async function verify() {
  const button = document.querySelector('#verify');
  button.disabled = true; button.textContent = 'SCANNING…';
  els.state.textContent = 'CHECKING HISTORY';
  try {
    const response = await fetch('/api/eligibility', { method: 'POST', headers: {'content-type':'application/json'} });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Verification failed');
    if (data.eligible) {
      els.state.textContent = 'COMMENT FOUND';
      els.body.innerHTML = `<div class="big-state">✓</div><div><p class="ticket-label">PRELIMINARY CHECK</p><h3>Comment found</h3><p>A real r/wallstreetbets comment was found in accessible history. This does not authorize or reserve a token claim.</p><a class="evidence-link" href="${escapeAttribute(data.comment.permalink)}" target="_blank" rel="noopener noreferrer">VIEW FOUND COMMENT ↗</a></div>`;
    } else {
      els.state.textContent = 'NO COMMENT FOUND';
      els.body.innerHTML = `<div class="big-state">×</div><div><p class="ticket-label">COMMUNITY PROOF</p><h3>Not found</h3><p>No r/wallstreetbets comment was found in the comment history currently exposed by Reddit's API. Older activity may be outside the listing window.</p></div>`;
    }
  } catch (error) {
    els.state.textContent = 'CHECK FAILED';
    els.body.innerHTML = `<div class="big-state">!</div><div><p class="ticket-label">REDDIT API</p><h3>Try again</h3><p>${escapeHtml(error.message)}</p><button class="verify-button" id="retry">RETRY</button></div>`;
    document.querySelector('#retry').addEventListener('click', () => location.reload());
  }
}

async function logout() { await fetch('/auth/logout', {method:'POST'}); location.href='/'; }
function escapeHtml(value=''){ return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function escapeAttribute(value=''){ return escapeHtml(value).replace(/`/g,'&#96;'); }

async function init() {
  const params = new URLSearchParams(location.search);
  if (params.get('auth') === 'error') document.querySelector('#hero-action').innerHTML = '<p class="notice">Reddit authorization was cancelled or failed. You can try again.</p>';
  try {
    const response = await fetch('/api/session'); session = await response.json();
    session.authenticated ? renderLoggedIn() : renderLoggedOut();
  } catch { renderLoggedOut(); }
}
init();