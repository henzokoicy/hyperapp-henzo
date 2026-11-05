// ia-champs.js — version 2
// A) Petit bouton IA a cote de chaque champ texte : "Quelle est ton idee ?" -> 2 ou 3 propositions.
// B) "Remplir avec l'IA" en haut des fenetres de saisie : 3 a 5 questions, puis remplissage (rien n'est enregistre).
// Module autonome : ne touche a aucune donnee, n'enregistre rien. Utilise mkAI / mkJson / agSheet / agPrompt / agToast.
(function(){
  if(window.IA_CHAMPS_VERSION) return;
  window.IA_CHAMPS_VERSION = 2;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, t) => { try { agToast(m, t); } catch(e){ try { alert(m); } catch(_){} } };
  const ico = (n, s) => (typeof agIcon === 'function' ? agIcon(n, s) : '');
  const SKIP_TYPES = /^(password|number|date|time|datetime-local|month|week|range|color|email|tel|url|search|hidden|checkbox|radio|file|submit|button|reset|image)$/i;
  const SKIP_WORDS = /search|recherch|cherch|filtr|montant|amount|prix|price|tarif|fcfa|€|\bdate\b|\bjours?\b|heure|password|mot de passe|\bcode\b|iban|phone|t[ée]l[ée]phone|email|e-mail|\burl\b|\blien\b|quantit|qt[ée]|nombre/i;

  // ---------- Styles ----------
  const st = document.createElement('style');
  st.textContent = `
  .iac-btn{display:flex;align-items:center;gap:4px;width:auto!important;min-width:0!important;margin:-4px 0 8px auto!important;padding:3px 9px!important;
    font-size:11px!important;font-weight:700;line-height:1.2;border-radius:999px!important;border:1px solid var(--line,rgba(127,127,127,.3))!important;
    background:var(--card2,rgba(127,127,127,.08))!important;color:var(--accent,#6b8eff)!important;cursor:pointer;box-shadow:none!important;height:auto!important}
  .iac-btn .ag-i{width:13px;height:13px}
  .iac-fill{display:flex;align-items:center;justify-content:center;gap:8px;width:100%!important;margin:0 0 12px!important;padding:10px 12px!important;
    border-radius:12px!important;border:1px dashed var(--accent,#6b8eff)!important;background:transparent!important;color:var(--accent,#6b8eff)!important;font-weight:700;font-size:14px!important;cursor:pointer}
  .iac-props{display:flex;flex-direction:column;gap:8px;margin-top:10px}
  .iac-prop{text-align:left!important;width:100%!important;padding:10px 12px!important;border-radius:12px!important;border:1px solid var(--line,rgba(127,127,127,.3))!important;
    background:var(--card2,rgba(127,127,127,.08))!important;color:inherit!important;font-size:14px!important;line-height:1.4;white-space:pre-wrap;cursor:pointer}
  .iac-load{opacity:.7;font-size:13px;margin-top:10px}`;
  document.head.appendChild(st);

  // ---------- Reperer les champs ----------
  function eligible(el){
    if(!el || el.dataset.iac || el.dataset.iacNo !== undefined) return false;
    if(el.closest('#agDlg, .iac-sheet, [data-iac-off]')) return false;
    if(el.disabled || el.readOnly) return false;
    if(el.tagName === 'TEXTAREA') return true;
    if(el.tagName !== 'INPUT') return false;
    const t = (el.getAttribute('type') || 'text').toLowerCase();
    if(t !== 'text' || SKIP_TYPES.test(t)) return false;
    const im = (el.getAttribute('inputmode') || '').toLowerCase();
    if(im === 'numeric' || im === 'decimal' || im === 'tel' || im === 'email' || im === 'search') return false;
    const sig = [el.id, el.name, el.className, el.placeholder, el.getAttribute('aria-label'), labelOf(el)].join(' ');
    if(SKIP_WORDS.test(sig)) return false;
    return true;
  }
  function labelOf(el){
    if(el.id){ try { const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if(l) return l.textContent.trim(); } catch(e){} }
    const p = el.closest('label'); if(p) return p.textContent.trim();
    let s = ancre(el).previousElementSibling, n = 0;
    while(s && n < 3){ if(s.tagName === 'LABEL') return s.textContent.trim(); if(s.classList.contains('iac-btn')){ s = s.previousElementSibling; continue; } n++; s = s.previousElementSibling; }
    return '';
  }
  const ancre = el => el.closest('.vx-wrap') || el;
  const nameOf = el => (labelOf(el) || el.getAttribute('aria-label') || el.placeholder || el.name || el.id || 'champ').replace(/\s+/g, ' ').trim().slice(0, 60);
  const boxOf = el => el.closest('.modal, .ag-sheet .modal, [role="dialog"], section, .card, .page, main') || document.body;
  function contexte(el){
    const box = boxOf(el);
    const h = box.querySelector('h1, h2, h3, h4');
    const titre = (h ? h.textContent : document.title || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const autres = [];
    box.querySelectorAll('input, textarea, select').forEach(f => {
      if(f === el || autres.length >= 8) return;
      const t = (f.getAttribute('type') || '').toLowerCase();
      if(/password|hidden|file|checkbox|radio/.test(t)) return;
      let v = f.tagName === 'SELECT' ? (f.selectedOptions[0] || {}).textContent : f.value;
      v = String(v || '').trim(); if(!v) return;
      autres.push(`${nameOf(f)} : ${v.slice(0, 120)}`);
    });
    return { titre, autres };
  }
  function remplir(el, v){
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  async function ia(prompt, system, maxTokens){
    if(typeof window.mkAI !== 'function') throw new Error("L'IA n'est pas encore prête, réessaie dans un instant.");
    const r = await window.mkAI({ system, prompt, maxTokens: maxTokens || 1200 });
    return r && r.text || '';
  }
  const parseJson = t => (typeof mkJson === 'function' ? mkJson(t) : JSON.parse(String(t).slice(String(t).search(/[\[{]/))));
  const SYS = "Tu aides Henzo, photographe et videaste, a remplir son application. Tu ecris en francais simple, naturel, sans emoji, pret a l'emploi. Tu reponds UNIQUEMENT en JSON valide.";

  // ---------- A) Bouton IA par champ ----------
  function equiper(el){
    if(!eligible(el)) return;
    el.dataset.iac = '1';
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'iac-btn'; b.title = "Écrire avec l'IA";
    b.innerHTML = `${ico('sparkles', 13)}<span>IA</span>`;
    b.onclick = e => { e.preventDefault(); e.stopPropagation(); ouvrirIdee(el); };
    ancre(el).insertAdjacentElement('afterend', b);
    b._iacChamp = el;
  }
  // Si un autre module (micro) enveloppe le champ apres coup, on garde le bouton juste apres.
  function recaler(){
    document.querySelectorAll('.iac-btn').forEach(b => {
      const el = b._iacChamp; if(!el || !el.isConnected){ if(el && !el.isConnected) b.remove(); return; }
      const a = ancre(el); if(a.nextElementSibling !== b) a.insertAdjacentElement('afterend', b);
    });
  }
  function ouvrirIdee(el){
    const nom = nameOf(el);
    const bg = agSheet('iacIdee', `<h3 style="display:flex;align-items:center;gap:8px">${ico('sparkles', 18)}<span>${esc(nom)}</span></h3>
      <label>Quelle est ton idée ?</label>
      <input type="text" id="iacIdeeIn" data-iac-no placeholder="En une phrase…" autocomplete="off">
      <button class="btn" id="iacIdeeGo" style="margin-top:10px;width:100%;display:flex;align-items:center;justify-content:center;gap:8px">${ico('sparkles', 16)}<span>Proposer</span></button>
      <div id="iacIdeeOut"></div>`);
    bg.classList.add('iac-sheet');
    const inp = bg.querySelector('#iacIdeeIn'), out = bg.querySelector('#iacIdeeOut'), go = bg.querySelector('#iacIdeeGo');
    setTimeout(() => inp.focus(), 60);
    inp.onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); go.click(); } };
    go.onclick = async () => {
      const idee = inp.value.trim();
      if(!idee){ inp.focus(); return; }
      go.disabled = true; out.innerHTML = `<div class="iac-load">L'IA réfléchit…</div>`;
      const c = contexte(el);
      const long = el.tagName === 'TEXTAREA';
      const prompt = `Ecran : ${c.titre || 'inconnu'}\nChamp a remplir : ${nom}${long ? ' (texte de quelques phrases)' : ' (texte court, une ligne)'}\n` +
        (c.autres.length ? `Deja rempli sur l'ecran :\n- ${c.autres.join('\n- ')}\n` : '') +
        (el.value.trim() ? `Contenu actuel du champ : ${el.value.trim().slice(0, 300)}\n` : '') +
        `Idee de Henzo : ${idee}\n\nPropose 3 versions differentes pour ce champ. Reponds en JSON : {"propositions":["...","...","..."]}`;
      try {
        const j = parseJson(await ia(prompt, SYS));
        const props = (Array.isArray(j) ? j : j.propositions || []).map(x => String(x || '').trim()).filter(Boolean).slice(0, 3);
        if(!props.length) throw new Error('vide');
        out.innerHTML = `<div class="iac-props">${props.map((p, i) => `<button type="button" class="iac-prop" data-i="${i}">${esc(p)}</button>`).join('')}</div>`;
        out.querySelectorAll('.iac-prop').forEach(b => b.onclick = () => {
          remplir(el, props[+b.dataset.i]); agCloseSheet('iacIdee'); el.focus();
          toast('Texte ajouté. Tu peux le modifier.');
        });
      } catch(e){
        out.innerHTML = '';
        toast("L'IA n'a pas répondu. Réessaie.", 'error');
      }
      go.disabled = false;
    };
  }

  // ---------- B) Remplir toute la fenetre ----------
  const CACHE_Q = {};
  function champsDe(box){
    return [...box.querySelectorAll('input[data-iac], textarea[data-iac], select')]
      .filter(f => !f.closest('.iac-sheet, #agDlg') && !f.disabled && f.offsetParent !== null &&
        (f.tagName !== 'SELECT' || (f.options.length > 1 && !SKIP_WORDS.test([f.id, f.name, nameOf(f)].join(' ')))));
  }
  function equiperBoite(box){
    if(!box || box.dataset.iacFill || box.closest('.iac-sheet, #agDlg')) return;
    const textes = box.querySelectorAll('input[data-iac], textarea[data-iac]');
    if(textes.length < 2) return;
    box.dataset.iacFill = '1';
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'iac-fill';
    b.innerHTML = `${ico('sparkles', 16)} Remplir avec l'IA`;
    b.onclick = e => { e.preventDefault(); e.stopPropagation(); remplirTout(box, b); };
    const h = box.querySelector('h1, h2, h3, h4');
    if(h && h.closest('.modal-wrap') && h.parentElement.classList.contains('modal-wrap') && h.parentElement.children.length <= 2) h.parentElement.insertAdjacentElement('afterend', b);
    else if(h) h.insertAdjacentElement('afterend', b);
    else box.insertAdjacentElement('afterbegin', b);
  }
  async function remplirTout(box, btn){
    const champs = champsDe(box);
    if(!champs.length) return;
    const h = box.querySelector('h1, h2, h3, h4');
    const titre = (h ? h.textContent : '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const liste = champs.map((f, i) => {
      const o = { k: 'c' + i, nom: nameOf(f), type: f.tagName === 'TEXTAREA' ? 'texte long' : f.tagName === 'SELECT' ? 'choix' : 'texte court' };
      if(f.tagName === 'SELECT') o.choix = [...f.options].map(x => x.textContent.trim()).filter(Boolean).slice(0, 25);
      const v = f.tagName === 'SELECT' ? '' : f.value.trim(); if(v) o.actuel = v.slice(0, 200);
      return o;
    });
    btn.disabled = true;
    try {
      // Rapide : la 1re question s'affiche tout de suite ; l'IA prepare les suivantes pendant que Henzo repond.
      const cle = titre + '|' + liste.map(x => x.nom).join(',');
      const Q1 = "En une phrase, qu'est-ce que tu veux créer ici ?";
      const suite = CACHE_Q[cle] ? Promise.resolve(CACHE_Q[cle]) :
        ia(`Ecran : ${titre || 'formulaire'}\nChamps : ${JSON.stringify(liste.map(x => ({ nom: x.nom, type: x.type })))}\nPremiere question deja posee : "${Q1}"\n\nPose 2 a 4 autres questions tres courtes (une idee chacune) pour remplir ces champs. JSON : {"questions":["...","..."]}`, SYS, 300)
          .then(t => { const q = parseJson(t); const l = (Array.isArray(q) ? q : q.questions || []).map(x => String(x || '').trim()).filter(Boolean).slice(0, 4); if(l.length) CACHE_Q[cle] = l; return l; })
          .catch(() => []);
      const rep = [];
      const poser = async (q, i, n) => {
        const t = n ? `Question ${i}/${n}` : `Question ${i}`;
        const r = await agPrompt(`${t}\n${q}`, '', { title: t });
        if(r === null) return false;
        rep.push({ question: q, reponse: String(r).trim() || '(pas de reponse)' });
        return true;
      };
      if(!(await poser(Q1, 1, 0))){ toast('Remplissage annulé. Rien n’a changé.'); btn.disabled = false; return; }
      let pret = false; suite.then(() => { pret = true; });
      await Promise.resolve();
      if(!pret) toast("L'IA prépare la suite…");
      const questions = await suite;
      for(let i = 0; i < questions.length; i++){
        if(!(await poser(questions[i], i + 2, questions.length + 1))){ toast('Remplissage annulé. Rien n’a changé.'); btn.disabled = false; return; }
      }
      toast("L'IA remplit les champs…");
      const fin = parseJson(await ia(`Ecran : ${titre || 'formulaire'}\nChamps : ${JSON.stringify(liste)}\nReponses de Henzo : ${JSON.stringify(rep)}\n\n` +
        `Remplis les champs. Pour un champ "choix", recopie exactement un des choix. Laisse vide ("") ce que tu ne sais pas. JSON : {"c0":"...","c1":"..."}`, SYS));
      let n = 0;
      champs.forEach((f, i) => {
        const v = fin && fin['c' + i]; if(v == null || String(v).trim() === '') return;
        const val = String(v).trim();
        if(f.tagName === 'SELECT'){
          const opt = [...f.options].find(o => o.textContent.trim().toLowerCase() === val.toLowerCase() || o.value.toLowerCase() === val.toLowerCase());
          if(opt && f.value !== opt.value){ f.value = opt.value; f.dispatchEvent(new Event('change', { bubbles: true })); n++; }
          return;
        }
        if(f.value.trim()) return; // on ne remplace jamais ce qui est deja ecrit
        remplir(f, val); n++;
      });
      toast(n ? `${n} champ(s) remplis. Vérifie puis enregistre.` : "L'IA n'a rien pu remplir.", n ? 'success' : 'error');
    } catch(e){
      toast("L'IA n'a pas pu remplir. Tes champs n'ont pas changé.", 'error');
    }
    btn.disabled = false;
  }

  // ---------- Mise en place globale ----------
  let prevu = false;
  function scan(){
    prevu = false;
    document.querySelectorAll('input, textarea').forEach(equiper);
    recaler();
    document.querySelectorAll('.modal-bg.show .modal, .ag-sheet .modal').forEach(equiperBoite);
  }
  const planifier = () => { if(prevu) return; prevu = true; (window.requestAnimationFrame || setTimeout)(scan); };
  new MutationObserver(planifier).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  scan();
  window.iaChamps = { scan, equiper, remplirTout };
})();
