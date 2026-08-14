(() => {
  const BNB_CHAIN_ID = '0x38';
  const NEWS_CADENCE = '12 hours';
  const workers = [
    { id: 0, name: 'THE RED LEDGER', role: 'RISK & LEDGER', portrait: '/assets/office/portraits/pixel-agent-0.png?v=pa-3' },
    { id: 1, name: 'THE GREEN CANDLE', role: 'MARKET SIGNALS', portrait: '/assets/office/portraits/pixel-agent-1.png?v=pa-3' },
    { id: 2, name: 'THE SQUEEZE MECHANIC', role: 'LIQUIDITY OPS', portrait: '/assets/office/portraits/pixel-agent-2.png?v=pa-3' },
    { id: 3, name: 'THE NIGHT AUDITOR', role: 'VAULT ACCOUNTING', portrait: '/assets/office/portraits/pixel-agent-3.png?v=pa-3' },
    { id: 4, name: 'THE LAST HOLDER', role: 'LONG-TERM STORAGE', portrait: '/assets/office/portraits/pixel-agent-4.png?v=pa-3' },
    { id: 5, name: 'THE PURPLE OPERATOR', role: 'VAULT ROUTING', portrait: '/assets/office/portraits/pixel-agent-5.png?v=pa-3' }
  ];
  const walletButton = document.querySelector('#connect-wallet');
  const toast = document.querySelector('#toast');
  let walletConnected = false;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  function selectWorker(workerId, notifyScene = true) {
    const worker = workers[workerId];
    if (!worker) return;
    document.querySelectorAll('.worker-tab').forEach(button => button.classList.toggle('selected', Number(button.dataset.worker) === workerId));
    const portrait = document.querySelector('#selected-portrait');
    portrait.src = worker.portrait;
    portrait.alt = `${worker.name} NFT portrait`;
    document.querySelector('#selected-worker-name').textContent = worker.name;
    document.querySelector('#selected-worker-role').textContent = worker.role;
    if (notifyScene) window.gmebOffice?.selectWorker?.(window.gmebOffice.workers.get(workerId)?.workerData);
  }

  document.querySelectorAll('.worker-tab').forEach(button => {
    button.addEventListener('click', () => selectWorker(Number(button.dataset.worker)));
  });

  window.addEventListener('office-worker-selected', event => selectWorker(Number(event.detail.id), false));
  window.addEventListener('office-ready', event => {
    document.querySelector('#visible-workers').textContent = String(event.detail.workers);
    document.querySelector('#occupant-count').textContent = `${event.detail.workers} / ${event.detail.workers} PREVIEW`;
  });

  function shortAddress(address) {
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }

  async function refreshWalletLabel(account) {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    walletButton.textContent = chainId === BNB_CHAIN_ID ? shortAddress(account) : 'SWITCH TO BNB';
    walletButton.classList.toggle('wrong-chain', chainId !== BNB_CHAIN_ID);
  }

  async function connectWallet() {
    if (!window.ethereum) {
      showToast('No injected wallet found');
      return;
    }
    try {
      if (walletConnected) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== BNB_CHAIN_ID) {
          await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: BNB_CHAIN_ID }] });
        }
        return;
      }
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts?.[0]) throw new Error('No account returned');
      walletConnected = true;
      await refreshWalletLabel(accounts[0]);
      window.ethereum.on?.('accountsChanged', next => {
        if (!next?.[0]) {
          walletConnected = false;
          walletButton.textContent = 'CONNECT WALLET';
          return;
        }
        refreshWalletLabel(next[0]).catch(() => {});
      });
      window.ethereum.on?.('chainChanged', () => refreshWalletLabel(accounts[0]).catch(() => {}));
      showToast('Wallet connected · read-only preview mode');
    } catch (error) {
      showToast(error?.code === 4001 ? 'Wallet connection cancelled' : 'Wallet connection failed');
    }
  }

  walletButton.addEventListener('click', connectWallet);

  function safeDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'RECENT' : date.toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).toUpperCase();
  }

  function renderNews(payload) {
    const feed = document.querySelector('#news-feed');
    feed.replaceChildren();
    if (!payload.available || !payload.items?.length) {
      const unavailable = document.createElement('p');
      unavailable.className = 'loading-line';
      unavailable.textContent = 'MARKET WIRE UNAVAILABLE · RETRY LATER';
      feed.append(unavailable);
      return;
    }
    payload.items.forEach(item => {
      const link = document.createElement('a');
      link.className = 'news-item';
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const title = document.createElement('strong');
      title.textContent = item.title;
      const meta = document.createElement('span');
      meta.textContent = `${item.source} · ${safeDate(item.publishedAt)}`;
      link.append(title, meta);
      feed.append(link);
    });
  }

  async function loadNews() {
    const feed = document.querySelector('#news-feed');
    try {
      const response = await fetch('/api/market-news', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      renderNews(await response.json());
    } catch {
      feed.textContent = 'MARKET WIRE UNAVAILABLE · SERVER RETRY REQUIRED';
    }
  }

  document.querySelector('#refresh-news').addEventListener('click', () => {
    showToast(`News source is server-cached for ${NEWS_CADENCE}`);
    loadNews();
  });

  function updateClocks() {
    const now = new Date();
    document.querySelector('#terminal-clock').textContent = now.toLocaleTimeString([], { hour12: false });
    document.querySelector('#taskbar-clock').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  updateClocks();
  setInterval(updateClocks, 1000);
  loadNews();

  // CONTRACTS PENDING: this build exposes read-only wallet connection only.
})();
