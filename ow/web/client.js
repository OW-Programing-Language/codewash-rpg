// Browser transport only. OW builds the HTML, validates actions and owns all
// challenges, progression, profiles and rewards. No React or game rules here.
(() => {
  const root = document.getElementById('game');
  const status = document.getElementById('connection');
  let state, html = '', busy = false, audioUnlocked = false, music, musicPath = '', musicUrl;
  let recognition, animationGeneration = 0;
  const errors = [];
  const queuedActions = [];
  const asset = path => '/media/asset?path=' + encodeURIComponent('../public/' + path);
  const timers = new Set();
  function later(fn, ms) {
    const timer = setTimeout(() => { timers.delete(timer); fn(); }, ms);
    timers.add(timer);
  }
  function cancel() {
    animationGeneration++;
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    stopMic();
  }
  // Drain each response completely before playing. OW's HTTP executor is
  // serial: an <audio src=http> can otherwise stall it on a partially read WAV.
  async function audioUrl(path) {
    const response = await fetch(asset(path), {signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error('Audio unavailable: ' + path);
    return URL.createObjectURL(await response.blob());
  }
  async function sound(path) {
    if (!audioUnlocked || !state || !state.sfx) return;
    try {
      const url = await audioUrl(path);
      const audio = new Audio(url);
      audio.volume = state.sfx / 100;
      audio.onended = audio.onerror = () => URL.revokeObjectURL(url);
      audio.play().catch(() => URL.revokeObjectURL(url));
    } catch (error) { errors.push(String(error)); }
  }
  async function updateMusic() {
    if (!state || !audioUnlocked) return;
    if (musicPath !== state.music) {
      music?.pause();
      music = null;
      if (musicUrl) URL.revokeObjectURL(musicUrl);
      musicPath = state.music;
      const requestedPath = musicPath;
      try {
        const url = await audioUrl(requestedPath);
        if (requestedPath !== musicPath) { URL.revokeObjectURL(url); return; }
        musicUrl = url;
        music = new Audio(url);
        music.onended = () => send('music-next', '');
      } catch (error) { errors.push(String(error)); musicPath = ''; return; }
    }
    if (!music) return;
    music.volume = state.bgm / 100;
    if (state.bgm) music.play().catch(() => {});
    else music.pause();
  }
  function unlock() { audioUnlocked = true; updateMusic(); }
  document.addEventListener('pointerdown', unlock, {once:true});
  document.addEventListener('keydown', unlock, {once:true});
  function toast(text) {
    const el = document.createElement('div');
    el.className = 'game-toast'; el.role = 'status'; el.textContent = text;
    document.body.append(el);
    setTimeout(() => el.remove(), 4000);
  }
  function effect(e) {
    if (e.kind === 'sound') sound(e.value);
    if (e.kind === 'cancel') cancel();
    if (e.kind === 'mic-stop') stopMic();
    if (e.kind === 'toast') toast(e.value);
    if (e.kind === 'shake') {
      const el = root.querySelector('.modal, .battling');
      el?.classList.add('wrong-flash');
      setTimeout(() => el?.classList.remove('wrong-flash'), 500);
    }
    if (e.kind === 'damage') {
      const el = document.createElement('span');
      el.className = 'damage-number'; el.textContent = '-' + e.value;
      root.querySelector('.battling .card-art')?.append(el);
      setTimeout(() => el.remove(), 850);
    }
    if (e.kind === 'event') later(() => send(e.value.action, e.value.value), e.delay);
    if (e.kind === 'sequence') {
      const generation = ++animationGeneration;
      const notes = ['c4','d4','e4','f4','g4','a4','b4','g5'];
      let i = 0;
      const play = () => {
        if (generation !== animationGeneration) return;
        if (i === e.value.steps.length) { send('sequence-done', ''); return; }
        const step = e.value.steps[i++];
        const el = root.querySelector(`[data-note="${step}"]`);
        el?.classList.add('lit');
        sound('assets/sounds/axolotl/' + notes[step] + '.wav');
        later(() => { el?.classList.remove('lit'); later(play, e.value.off); }, e.value.on);
      };
      later(play, e.delay);
    }
    if (e.kind === 'phantom') {
      document.querySelector('.phantom-bonus')?.remove();
      const el = document.createElement('button'); el.className = 'phantom-bonus';
      el.ariaLabel = 'Catch Phantom';
      const img = document.createElement('img'); img.src = asset(e.value); img.alt = 'Phantom'; el.append(img);
      el.onclick = () => { send('phantom', ''); el.remove(); };
      document.body.append(el); setTimeout(() => el.remove(), 9000);
    }
  }
  function apply(next, playEffects = true) {
    state = next;
    root.dataset.revision = String(next.revision);
    if (html !== next.html) {
      const focus = document.activeElement;
      const focusId = focus?.id;
      const formAction = focus?.closest('form')?.dataset.action;
      const oldValue = focus?.value;
      const scroll = root.querySelector('.drawer')?.scrollTop || 0;
      root.innerHTML = next.html;
      html = next.html;
      const drawer = root.querySelector('.drawer'); if (drawer) drawer.scrollTop = scroll;
      const target = focusId ? document.getElementById(focusId) : formAction ? root.querySelector(`form[data-action="${formAction}"] input`) : root.querySelector('[autofocus]');
      if (target) { target.focus({preventScroll:true}); if (oldValue && formAction !== 'answer' && formAction !== 'verify') target.value = oldValue; }
    }
    updateMusic();
    if (playEffects) for (const e of next.effects) effect(e);
    status.textContent = '';
    document.documentElement.lang = root.querySelector('[lang]')?.lang || 'en';
  }
  async function refresh() {
    const response = await fetch('/api/state', {cache:'no-store'});
    if (!response.ok) throw new Error('Cannot load OW game');
    apply(await response.json(), false);
  }
  async function send(action, value) {
    if (!state) return;
    if (busy) {
      if (action !== 'tick') queuedActions.push([action,value]);
      return;
    }
    busy = true;
    root.dataset.busy = 'true';
    try {
      const response = await fetch('/api/event', {method:'POST', signal:AbortSignal.timeout(15000), headers:{'Content-Type':'application/json'}, body:JSON.stringify({action,value:String(value),token:state.token,revision:state.revision})});
      if (response.status === 409) { cancel(); await refresh(); toast('The game changed in another window. Please try again.'); return; }
      if (!response.ok) throw new Error('OW action failed (' + response.status + ')');
      apply(await response.json());
    } catch (error) {
      errors.push(String(error)); status.textContent = 'Connection interrupted. Click here to reconnect.';
      status.onclick = () => refresh().catch(e => errors.push(String(e)));
    } finally {
      busy = false; root.dataset.busy = 'false';
      if (queuedActions.length) { const [nextAction,nextValue] = queuedActions.shift(); send(nextAction,nextValue); }
    }
  }
  function stopMic() { if (recognition) { recognition.onend = null; recognition.stop(); recognition = null; } }
  function microphone() {
    if (recognition) { stopMic(); return; }
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) { toast('Microphone recognition is unavailable here. Type the word instead.'); return; }
    recognition = new Speech(); recognition.lang = 'en-US'; recognition.continuous = true;
    recognition.onresult = event => {
      const text = event.results[event.results.length-1][0].transcript.replace(/[.,!?]/g,'');
      send('answer', text);
    };
    recognition.onerror = event => { toast('Microphone: ' + event.error + '. You can type your answer.'); stopMic(); };
    recognition.onend = () => { recognition = null; };
    recognition.start(); toast('Listening…');
  }
  function download(name, value) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(value,null,2)], {type:'application/json'}));
    const a = document.createElement('a'); a.href=url; a.download=name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  root.addEventListener('click', async event => {
    const client = event.target.closest('[data-client]');
    if (client) {
      const action = client.dataset.client;
      if (action === 'fullscreen') {
        try { if(document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { toast('Fullscreen unavailable'); }
      }
      if (action === 'microphone') microphone();
      if (action === 'export') { const response=await fetch('/api/export'); if(response.ok) download('level-up-save.json',await response.json()); }
      if (action === 'report') download('level-up-report.json',{date:new Date().toISOString(),browser:navigator.userAgent,revision:state.revision,errors});
      return;
    }
    const target=event.target.closest('[data-action]');
    if (!target || ['FORM','INPUT','SELECT'].includes(target.tagName)) return;
    send(target.dataset.action,target.dataset.value || '');
  });
  root.addEventListener('submit', event => {
    const form=event.target.closest('form[data-action]'); if(!form) return;
    event.preventDefault(); const value=new FormData(form).get('value');
    if(form.dataset.action === 'answer' || form.dataset.action === 'verify') form.reset();
    send(form.dataset.action,value);
  });
  root.addEventListener('change', event => {
    const target=event.target; if(target.matches('input[data-action],select[data-action]')) send(target.dataset.action,target.value);
  });
  document.addEventListener('keydown', event => {
    if (event.target.matches('input,select,textarea')) return;
    if(event.key === 'Escape') send('end','');
    if(event.key === 'ArrowLeft') send('navigate','-1');
    if(event.key === 'ArrowRight') send('navigate','1');
  });
  let dragX;
  root.addEventListener('pointerdown', event => { if(event.target.closest('.carousel') && !event.target.closest('button,input,select')) dragX=event.clientX; });
  root.addEventListener('pointerup', event => { if(dragX !== undefined && Math.abs(event.clientX-dragX)>60) send('navigate', event.clientX<dragX?'1':'-1'); dragX=undefined; });
  refresh().then(()=>send('login',new Date().toISOString().slice(0,10))).catch(error=>{errors.push(String(error));status.textContent='Cannot connect to the OW game. Reload to retry.';});
  setInterval(()=>{if(!busy && state) send('tick','');},5000);
})();
