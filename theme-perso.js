// ============================================================
// THEME-PERSO.JS - Retoucher les couleurs d'un thème, revenir à l'origine,
// ou enregistrer sa version comme "mon thème". Gardé sur l'appareil et
// dans le compte (user_preferences.themes_perso / theme_ovr).
// ============================================================
(function(){
'use strict';
if(typeof agOpenThemes !== 'function' || typeof AG_THEMES === 'undefined') return;
const CHAMPS = [['bg', 'Fond'], ['card', 'Cartes'], ['accent', 'Couleur principale'], ['text', 'Texte'], ['light', 'Titres et détails'], ['deep', 'Bandeaux']];
let timer = null;
const hex6 = h => { h = String(h || '').trim(); if(/^#[0-9a-f]{3}$/i.test(h)) h = '#' + h.slice(1).split('').map(c => c + c).join(''); if(/^#[0-9a-f]{6}$/i.test(h)) return h.toLowerCase(); const m = h.match(/rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)/); return m ? '#' + [m[1], m[2], m[3]].map(n => (+n).toString(16).padStart(2, '0')).join('') : '#000000'; };
const sauver = () => { agSavePerso(); clearTimeout(timer); timer = setTimeout(() => agSaveThemeRemote(), 1200); };
const modifie = k => AG_THEMES[k] && !AG_THEMES[k].perso ? Object.keys(AG_OVR[k] || {}).length > 0 : (AG_THEMES[k] && AG_THEMES[k].perso && JSON.stringify(AG_PERSO[k].gen) !== JSON.stringify(AG_PERSO[k].gen0));

const ouvrirListe = agOpenThemes;
window.agOpenThemes = function(){
  ouvrirListe();
  const w = document.querySelector('#agThemes .modal-wrap'); if(!w) return;
  const k = agGetTheme(), t = AG_THEMES[k];
  const bloc = document.createElement('div');
  bloc.innerHTML = `<button class="btn-primary" style="margin:12px 0 0" onclick="agPersoOpen()">Personnaliser « ${agEsc(t.label)} »${modifie(k) ? ' (modifié)' : ''}</button>`;
  const hint = w.querySelector('.ag-hint'); if(hint) hint.after(bloc.firstElementChild); else w.prepend(bloc.firstElementChild);
};
window.agPersoOpen = function(){
  const k = agGetTheme(), t = AG_THEMES[k], g = agGenFinal(k);
  agSheet('agPerso', `
    <h3>Mes couleurs · ${agEsc(t.label)}</h3>
    <div class="ag-hint" style="margin-top:0">Change une couleur : l'app se met à jour tout de suite. C'est gardé sur cet appareil et dans ton compte.</div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:14px">
      ${CHAMPS.map(([n, l]) => `<label style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0"><span>${l}</span>
        <input type="color" id="agPc_${n}" value="${hex6(g[n])}" oninput="agPersoSet('${n}', this.value)" style="width:56px;height:36px;padding:2px;border-radius:8px;cursor:pointer"></label>`).join('')}
    </div>
    <button class="btn-ghost" style="margin-top:16px" onclick="agPersoReset()">Remettre les couleurs d'origine</button>
    ${t.perso ? `<button class="btn-ghost" style="margin-top:8px" onclick="agPersoRename()">Renommer ce thème</button><button class="btn-ghost" style="margin-top:8px;color:var(--red)" onclick="agPersoDelete()">Supprimer ce thème</button>`
      : `<button class="btn-primary" style="margin-top:8px" onclick="agPersoSaveAs()">Enregistrer comme mon thème</button>`}
  `);
};
window.agPersoSet = function(n, v){
  const k = agGetTheme(), t = AG_THEMES[k];
  if(t.perso){ AG_PERSO[k].gen[n] = v; t.gen = AG_PERSO[k].gen; const c = t.clair; t.sw = c ? [t.gen.bg, t.gen.card, t.gen.accent, t.gen.text] : [t.gen.bg, t.gen.deep, t.gen.accent, t.gen.light]; }
  else { AG_OVR[k] = Object.assign(AG_OVR[k] || {}, { [n]: v }); }
  agApplyPersoCss(); sauver();
};
window.agPersoReset = function(){
  const k = agGetTheme(), t = AG_THEMES[k];
  if(t.perso){ AG_PERSO[k].gen = Object.assign({}, AG_PERSO[k].gen0); t.gen = AG_PERSO[k].gen; }
  else delete AG_OVR[k];
  agApplyPersoCss(); sauver(); agPersoOpen(); agToast('Couleurs d\'origine remises');
};
window.agPersoSaveAs = async function(){
  const k = agGetTheme(), t = AG_THEMES[k];
  const nom = await agPrompt('Nom de ton thème', t.label + ' perso');
  if(!nom || !String(nom).trim()) return;
  const g = agGenFinal(k), id = 'perso_' + Date.now().toString(36);
  AG_PERSO[id] = { label: String(nom).trim().slice(0, 30), clair: !!t.clair, gen: Object.assign({}, g), gen0: Object.assign({}, g) };
  delete AG_OVR[k];
  agRegisterPerso(); agApplyTheme(id); agSavePerso(); agSaveThemeRemote(id);
  agCloseSheet('agPerso'); agOpenThemes(); agToast('Thème « ' + AG_PERSO[id].label + ' » enregistré');
};
window.agPersoRename = async function(){
  const k = agGetTheme(); if(!AG_PERSO[k]) return;
  const nom = await agPrompt('Nom de ton thème', AG_PERSO[k].label);
  if(!nom || !String(nom).trim()) return;
  AG_PERSO[k].label = String(nom).trim().slice(0, 30); AG_THEMES[k].label = AG_PERSO[k].label;
  sauver(); agCloseSheet('agPerso'); agOpenThemes();
};
window.agPersoDelete = async function(){
  const k = agGetTheme(); if(!AG_PERSO[k]) return;
  if(typeof agConfirm === 'function' && !(await agConfirm('Supprimer le thème « ' + AG_PERSO[k].label + ' » ?'))) return;
  delete AG_PERSO[k]; delete AG_THEMES[k];
  agApplyTheme('henzo'); agSavePerso(); agSaveThemeRemote('henzo');
  agCloseSheet('agPerso'); agOpenThemes();
};
})();
