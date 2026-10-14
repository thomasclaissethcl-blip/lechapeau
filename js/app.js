import {Bag} from './random.js';
import {explore, GENRES, MOODS, COUNTRIES} from './tmdb.js';
const $=id=>document.getElementById(id);
const htmlEscape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const EXCLUDED=new Set(['id','titre','title','resume','summary','affiche','poster','tmdbId','url','annee','raw']);
const LABEL={type:'Type',genre:'Genre',ambiance:'Ambiance',duree:'Durée',annee:'Année',mood:'Ambiance',length:'Durée',period:'Époque',rating:'Appréciation',country:'Pays d’origine'};
const EXPLORE={type:['Film','Série'],mood:Object.keys(MOODS),genre:['Action','Aventure','Animation','Comédie','Documentaire','Drame','Fantastique','Horreur','Policier','Romance','Science-fiction','Thriller'],period:['Avant 2000','2000-2019','Depuis 2020'],length:['Court','Moyen','Long'],rating:['Bien noté'],country:['Monde',...Object.keys(COUNTRIES)]};
let collection=[],saved=[],mode='personal',chosen={personal:{},explore:{}},bags={personal:new Bag(),explore:new Bag()},external=[],current=null,busy=false,drawSeq=0,confettiTimeout=0;
const seenExplore=new Set(JSON.parse(localStorage.getItem('chapeau_explore_seen_v1')||'[]'));
const TOKEN_KEY='chapeau_tmdb_token';
const REMEMBER_KEY='chapeau_tmdb_remember';
let rememberToken=localStorage.getItem(REMEMBER_KEY)!=='0';
// Upgrade existing session credentials to persistent storage when the default is enabled.
let token=localStorage.getItem(TOKEN_KEY)||sessionStorage.getItem(TOKEN_KEY)||'';
if(rememberToken&&token){localStorage.setItem(TOKEN_KEY,token);sessionStorage.removeItem(TOKEN_KEY)}
if(!rememberToken){localStorage.removeItem(TOKEN_KEY)}
function persistToken(){
  localStorage.setItem(REMEMBER_KEY,rememberToken?'1':'0');
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  if(token)(rememberToken?localStorage:sessionStorage).setItem(TOKEN_KEY,token);
}

let motionEnabled=localStorage.getItem('chapeau_motion')!=='0'; // Animations activées par défaut ; une désactivation explicite reste mémorisée.
function writeStatus(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error)}
function showDrawError(message){const result=$('result');$('hat').classList.add('hide');result.classList.remove('hide');result.innerHTML=`<span class="resultLabel">Le tirage n’a pas abouti</span><h2>Impossible de proposer un titre</h2><p>${htmlEscape(message)}</p><button class="mainbutton" id="retryDraw">Réessayer le tirage</button><button class="secondary" id="openTmdbSettings">Vérifier le jeton TMDB</button>`;$('retryDraw').onclick=draw;$('openTmdbSettings').onclick=openSettings}
function normalize(o){const x={...o};x.id=String(o.id||`${o.titre||o.title}-${o.annee||o.year||''}`).trim();x.title=String(o.titre||o.title||'Sans titre');x.summary=String(o.resume||o.summary||'');x.year=o.annee||o.year||null;x.type=Array.isArray(o.type)?o.type:[o.type||'Film'];return x}
function allPersonal(){return [...new Map([...collection,...saved].map(x=>[x.id,x])).values()]}
function values(x){return Array.isArray(x)?x:x==null?[]:[x]}
function fields(){const items=allPersonal();const names=[...new Set(items.flatMap(o=>Object.keys(o)))].filter(k=>!EXCLUDED.has(k)&&!['title','summary','year'].includes(k));return names.filter(k=>items.some(x=>values(x[k]).length)).sort((a,b)=>a==='type'?-1:b==='type'?1:a.localeCompare(b,'fr'))}
function filters(){return chosen[mode]}
function matches(item){return Object.entries(chosen.personal).every(([k,selected])=>!selected.length||selected.some(v=>values(item[k]).map(String).includes(v)))}
function pool(){return allPersonal().filter(matches)}
function signature(){return JSON.stringify(chosen[mode])+'|'+(mode==='personal'?allPersonal().map(x=>x.id).join('|'):'tmdb')}
function count(){if(mode==='explore')return external.length?bags.explore.count(external,signature()):null;return bags.personal.count(pool(),signature())}
function changeMode(next){if(busy)return;mode=next;current=null;writeStatus('');render()}
function render(){const ex=mode==='explore';$('app').classList.toggle('explore',ex);document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode))});$('headline').textContent=ex?'Et si on découvrait autre chose ?':'On regarde quoi ce soir ?';$('subtitle').textContent=ex?'Laissez le hasard explorer le cinéma.':'Piochez parmi vos envies.';$('draw').textContent=busy?'Le chapeau choisit…':ex?'Partir à la découverte':'Piocher un titre';const n=count();$('counter').textContent=ex?(external.length?`${n} découverte(s) restante(s) parmi ${external.length} titres chargés`:'Exploration du catalogue TMDB'):pool().length?`${n} titre(s) à découvrir dans le chapeau`:'Aucun titre ne correspond aux filtres';$('draw').disabled=busy||(!ex&&!pool().length);$('hat').disabled=busy||(!ex&&!pool().length);$('surprise').disabled=busy;$('filters').disabled=busy;$('refreshExplore').disabled=busy;$('refreshExplore').hidden=!ex;if(current){$('result').classList.remove('hide');$('hat').classList.add('hide');const attrs=ex?[current.type,current.year,...(current.genre||[])]:[...values(current.type),current.year,...values(current.genre),...values(current.ambiance)];const poster=current.poster&&/^https:\/\/image\.tmdb\.org\//.test(current.poster)?`<img class="poster" alt="Affiche de ${htmlEscape(current.title)}" src="${htmlEscape(current.poster)}">`:'';$('result').innerHTML=`<span class="resultLabel">${ex?'Une découverte pour vous':'Le chapeau a choisi'}</span>${poster}<h2>${htmlEscape(current.title)}</h2><p>${htmlEscape(current.summary)}</p><div class="meta">${attrs.filter(Boolean).map(v=>`<span>${htmlEscape(v)}</span>`).join('')}</div>${ex&&current.url?`<p><a href="${htmlEscape(current.url)}" target="_blank" rel="noopener" style="color:#edd299">Voir la fiche TMDB</a></p>`:''}<button class="mainbutton" id="accept">${ex?'Ajouter à mon chapeau':'On regarde ça !'}</button><button class="secondary" id="redraw">Pas envie, on repioche</button><p class="muted">${ex?'Découvrez une autre proposition si celle-ci ne vous tente pas.':'Pioche sans remise : les titres déjà sortis attendent le prochain cycle.'}</p>`;$('redraw').onclick=draw;$('accept').onclick=accept;}else{$('result').classList.add('hide');$('hat').classList.remove('hide');}}
function renderFilters(){const ex=mode==='explore',items=ex?EXPLORE:null;const categories=ex?Object.keys(EXPLORE):fields();let out='';for(const k of categories){let options=ex?items[k]:[...new Set(allPersonal().flatMap(x=>values(x[k]).map(String)))].sort((a,b)=>a.localeCompare(b,'fr'));out+=`<div class="group"><h3>${htmlEscape(LABEL[k]||k)}</h3><div class="chips">`;for(const v of options){const sel=k==='country'?(filters()[k]||['Monde']).includes(v):(filters()[k]||[]).includes(v);out+=`<button class="chip ${sel?'sel':''}" data-k="${htmlEscape(k)}" data-v="${htmlEscape(v)}" aria-pressed="${sel}">${htmlEscape(v)}</button>`}out+='</div></div>'}out+='<button class="reset" id="clear">Effacer tous les filtres</button>';$('sheetContent').innerHTML=out;$('sheetTitle').textContent=ex?'Filtres d’exploration':'Filtres de ma collection';$('sheetIntro').textContent=ex?'Filtres prédéfinis pour TMDB. Les ambiances sont des correspondances approximatives avec des genres. Les durées ne s’appliquent qu’aux films. Les séries d’animation et les émissions TV sont exclues ; les films d’animation restent éligibles. « Monde » accepte tous les pays.':'Filtres automatiquement créés depuis le JSON. OU dans une catégorie, ET entre les catégories. Sans sélection : aucune restriction.';document.querySelectorAll('.chip').forEach(b=>b.onclick=()=>{const {k,v}=b.dataset;const arr=filters()[k]||[];filters()[k]=k==='country'?(v==='Monde'?[]:[v]):(arr.includes(v)?arr.filter(x=>x!==v):[...arr,v]);if(ex){external=[];bags.explore.clear()}current=null;renderFilters()});$('clear').onclick=()=>{chosen[mode]={};if(ex){external=[];bags.explore.clear()}current=null;renderFilters()};$('apply').textContent=ex?'Appliquer les filtres':`Voir ${pool().length} titre(s) disponibles`}
function openSheet(){renderFilters();$('overlay').classList.add('open')}
function closeSheet(){$('overlay').classList.remove('open');render()}
function confetti(){const layer=$('confettiLayer');layer.replaceChildren();if(!motionEnabled)return;const colors=['#edcc8e','#f7e7c4','#db8f82','#94afdb','#b8a2df','#9dcab3'];const fragment=document.createDocumentFragment();for(let i=0;i<115;i++){const element=document.createElement('i');element.className='confetti';const r=()=>Math.random();for(const [k,v] of Object.entries({'--x':(r()*100).toFixed(2)+'%','--w':(5+r()*6).toFixed(1)+'px','--h':(8+r()*9).toFixed(1)+'px','--color':colors[Math.floor(r()*colors.length)],'--delay':(r()*.48).toFixed(2)+'s','--dur':(2.25+r()*1.25).toFixed(2)+'s','--drift':(-170+r()*340).toFixed(0)+'px','--spin':(-900+r()*1800).toFixed(0)+'deg'}))element.style.setProperty(k,v);fragment.appendChild(element)}layer.appendChild(fragment);clearTimeout(confettiTimeout);confettiTimeout=setTimeout(()=>layer.replaceChildren(),4600)}
function pause(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
async function draw(){
  if(busy)return;
  if(mode==='personal'&&!pool().length)return;
  const active=mode,sequence=++drawSeq;
  busy=true;current=null;
  writeStatus('');$('confettiLayer').replaceChildren();clearTimeout(confettiTimeout);
  render();
  const stage=$('stage');stage.classList.remove('drawing');void stage.offsetWidth;stage.classList.add('drawing');
  const start=performance.now();
  const minDuration=motionEnabled?3380:250;
  // The animation and network request run concurrently, but the user always
  // receives a visible result or an actionable error when both have finished.
  const animation=pause(minDuration);
  let next=null,err=null;
  try{
    if(active==='personal'){
      next=bags.personal.next(pool(),signature());
    }else{
      if(!token)throw new Error('Aucun jeton TMDB configuré. Ouvrez les paramètres pour renseigner un API Read Access Token.');
      if(!external.length||!bags.explore.count(external,signature())){
        writeStatus('Recherche de films et séries dans TMDB…');
        external=await explore(token,chosen.explore,new Set([...seenExplore,...allPersonal().map(x=>x.id)]));
        bags.explore.clear();
      }
      next=bags.explore.next(external,signature());
      if(next){seenExplore.add(next.id);try{localStorage.setItem('chapeau_explore_seen_v1',JSON.stringify([...seenExplore].slice(-1000)))}catch(e){console.warn('Historique TMDB non sauvegardé',e)}}
    }
  }catch(e){
    console.error('Échec du tirage',e);
    err=e instanceof Error?e.message:String(e);
  }
  const elapsed=performance.now()-start;
  if(elapsed<minDuration)await pause(minDuration-elapsed);
  await animation;
  if(sequence!==drawSeq)return;
  busy=false;stage.classList.remove('drawing');current=next;
  render();
  if(err||!next){
    const message=err||'Aucun titre n’a été trouvé pour ces filtres.';
    writeStatus(message,true);
    showDrawError(message);
  }else{
    writeStatus('');confetti();
  }
}

function accept(){if(!current)return;if(mode==='explore'){if(!saved.some(x=>x.id===current.id)&&!collection.some(x=>x.id===current.id)){saved.push({id:current.id,titre:current.title,type:[current.type],genre:current.genre||[],annee:current.year,resume:current.summary,tmdbId:current.tmdbId});localStorage.setItem('chapeau_saved_v1',JSON.stringify(saved));writeStatus('Titre ajouté localement. Exportez le JSON depuis les paramètres pour conserver vos ajouts dans votre dépôt.')}else writeStatus('Ce titre figure déjà dans votre collection.')}else writeStatus('Bon visionnage !')}
function exportJson(){const merged=[...new Map([...collection.map(x=>x.raw||x),...saved].map(o=>[String(o.id),o])).values()];const blob=new Blob([JSON.stringify(merged,null,2)+'\n'],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='collection-enrichie.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function openSettings(){$('token').value=token;$('rememberToken').checked=rememberToken;$('savedCount').textContent=`${saved.length} découverte(s) enregistrée(s) localement.`;$('settingsOverlay').classList.add('open')}
function closeSettings(){$('settingsOverlay').classList.remove('open')}
async function init(){try{const res=await fetch('./data/collection.json',{cache:'no-cache'});if(!res.ok)throw new Error(`HTTP ${res.status}`);const data=await res.json();if(!Array.isArray(data))throw new Error('Le fichier doit contenir un tableau JSON.');collection=data.filter(x=>x&&typeof x==='object').map(o=>({...normalize(o),raw:o}));saved=JSON.parse(localStorage.getItem('chapeau_saved_v1')||'[]').map(normalize);writeStatus(`${collection.length} titres chargés depuis collection.json.`)}catch(e){writeStatus('Impossible de charger data/collection.json. Lancez un serveur local ou ouvrez la page depuis GitHub Pages. '+e.message,true)}$('motionToggle').checked=motionEnabled;document.body.classList.toggle('motion-off',!motionEnabled);document.body.classList.toggle('motion-force',motionEnabled);$('motionToggle').onchange=e=>{motionEnabled=e.target.checked;localStorage.setItem('chapeau_motion',motionEnabled?'1':'0');document.body.classList.toggle('motion-off',!motionEnabled);document.body.classList.toggle('motion-force',motionEnabled)};document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>changeMode(b.dataset.mode));$('draw').onclick=draw;$('hat').onclick=draw;$('filters').onclick=openSheet;$('close').onclick=closeSheet;$('apply').onclick=closeSheet;$('overlay').onclick=e=>{if(e.target===$('overlay'))closeSheet()};$('surprise').onclick=()=>{if(busy)return;chosen[mode]={};if(mode==='explore'){external=[];bags.explore.clear()}draw()};$('refreshExplore').onclick=()=>{if(busy||mode!=='explore')return;external=[];bags.explore.clear();draw()};$('settings').onclick=openSettings;$('closeSettings').onclick=closeSettings;$('settingsOverlay').onclick=e=>{if(e.target===$('settingsOverlay'))closeSettings()};$('saveToken').onclick=()=>{token=$('token').value.trim();rememberToken=$('rememberToken').checked;try{persistToken()}catch(e){writeStatus('Impossible de sauvegarder le jeton dans ce navigateur : '+e.message,true);return}external=[];bags.explore.clear();closeSettings();writeStatus(token?(rememberToken?'Jeton mémorisé sur cet appareil.':'Jeton conservé pour cette session uniquement.'):'Jeton effacé.');};$('exportJson').onclick=exportJson;$('clearSaved').onclick=()=>{if(!confirm('Supprimer les découvertes enregistrées localement ?'))return;saved=[];localStorage.removeItem('chapeau_saved_v1');openSettings();render()};window.addEventListener('keydown',e=>{if(e.key==='Escape'){closeSheet();closeSettings()}});render()}
init();
