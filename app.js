const findBtn = document.getElementById('findBtn');
const input = document.getElementById('wordInput');
const results = document.getElementById('results');

let rhymesData = null;

// Fetch JSON (tries network first, but service worker will cache for offline)
async function loadRhymes() {
  try {
    const resp = await fetch('rhymes.json', {cache: "no-cache"});
    if (!resp.ok) throw new Error('Failed to load JSON');
    const data = await resp.json();
    rhymesData = data.words || [];
    console.info('Rhymes loaded', rhymesData.length);
  } catch (err) {
    console.warn('Could not fetch rhymes.json:', err);
    rhymesData = rhymesData || [];
  }
}

// Find rhymes for the word (case-insensitive, exact match)
function findRhymesFor(word) {
  if (!word) return null;
  const w = word.trim().toLowerCase();
  if (!w) return null;
  const found = rhymesData.find(item => item.word.toLowerCase() === w);
  if (found) return found.rhymes;
  // fallback: try reverse lookup
  const reverseMatches = [];
  for (const item of rhymesData) {
    if (item.rhymes.map(r=>r.toLowerCase()).includes(w)) {
      reverseMatches.push(item.word);
    }
  }
  return reverseMatches.length ? [`(found as rhyme for) ${reverseMatches.join(', ')}`] : null;
}

function showMessage(text, isError = false) {
  results.innerHTML = `<div class="message ${isError ? 'error' : ''}">${text}</div>`;
}

function renderRhymes(word, rhymes) {
  results.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'result-card';
  const left = document.createElement('div');
  const right = document.createElement('div');

  left.innerHTML = `<div class="word">${word}</div>`;
  const rhymesWrap = document.createElement('div');
  rhymesWrap.className = 'rhymes';
  if (Array.isArray(rhymes)) {
    for (const r of rhymes) {
      const pill = document.createElement('span');
      pill.className = 'pill';
      pill.textContent = r;
      rhymesWrap.appendChild(pill);
    }
  } else {
    rhymesWrap.textContent = rhymes;
  }

  left.appendChild(rhymesWrap);
  right.innerHTML = `<button class="copy" aria-label="Copy rhymes">Copy</button>`;
  card.appendChild(left);
  card.appendChild(right);
  results.appendChild(card);

  // copy button functionality
  const copyBtn = card.querySelector('.copy');
  copyBtn.addEventListener('click', async () => {
    try {
      const textToCopy = Array.isArray(rhymes) ? rhymes.join(', ') : String(rhymes);
      await navigator.clipboard.writeText(textToCopy);
      copyBtn.textContent = 'Copied!';
      setTimeout(()=> copyBtn.textContent = 'Copy', 1200);
    } catch (e) {
      copyBtn.textContent = 'Err';
      setTimeout(()=> copyBtn.textContent = 'Copy', 1200);
    }
  });
}

async function onFind() {
  const word = input.value.trim();
  if (!word) {
    showMessage('Please enter a word to search.');
    return;
  }
  if (!rhymesData || rhymesData.length === 0) {
    await loadRhymes();
  }
  const rhymes = findRhymesFor(word);
  if (rhymes && rhymes.length) {
    renderRhymes(word, rhymes);
  } else {
    showMessage(`No rhymes found for "${word}". Try another word or check rhymes.json.`, true);
  }
}

// Event listeners
findBtn.addEventListener('click', onFind);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') onFind();
});

// Initialize
window.addEventListener('load', async () => {
  await loadRhymes();

  // Register service worker (if supported)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('sw.js');
      console.log('Service worker registered:', reg);
    } catch (err) {
      console.warn('Service worker registration failed:', err);
    }
  }
});

// 
// Handle PWA installation
// 
let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = 'inline-block';
});

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const choiceResult = await deferredPrompt.userChoice;
  if (choiceResult.outcome === 'accepted') {
    console.log('User accepted install');
  } else {
    console.log('User dismissed install');
  }
  deferredPrompt = null;
  installBtn.style.display = 'none';
});
