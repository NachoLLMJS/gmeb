const DEVVIT_PLAYTEST_URL = 'https://www.reddit.com/r/gmeb6900_dev/?playtest=gmeb6900';

const els = {
  header: document.querySelector('#header-auth'),
  hero: document.querySelector('#hero-action'),
  state: document.querySelector('#ticket-state'),
  body: document.querySelector('#ticket-body')
};

const devvitButton = (small = false) => {
  const cls = small ? 'small-auth' : 'oauth-button';
  const label = small ? 'OPEN REDDIT APP' : 'VERIFY INSIDE REDDIT →';
  return `<a class="${cls}" href="${DEVVIT_PLAYTEST_URL}" target="_blank" rel="noopener noreferrer">${label}</a>`;
};

function renderDevvitEntry() {
  els.header.innerHTML = devvitButton(true);
  els.hero.innerHTML = `${devvitButton(false)}<p class="notice">Reddit login and comment verification run inside the official GMEB Devvit playtest.</p>`;
  els.state.textContent = 'OPEN REDDIT APP';
  els.body.innerHTML = `<div class="big-state">R/</div><div><p class="ticket-label">NATIVE REDDIT IDENTITY</p><h3>Continue inside Reddit</h3><p>Open the GMEB Devvit app. Reddit supplies your signed-in identity directly and the verifier performs a read-only check for an accessible comment in r/wallstreetbets.</p>${devvitButton(false)}</div>`;
}

renderDevvitEntry();
