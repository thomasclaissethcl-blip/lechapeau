import {randomInt,shuffle} from './random.js';
const BASE='https://api.themoviedb.org/3';
export const GENRES={Film:{Action:28,Aventure:12,Animation:16,Comédie:35,Policier:80,Documentaire:99,Drame:18,Fantastique:14,Horreur:27,Romance:10749,'Science-fiction':878,Thriller:53},Série:{Action:10759,Aventure:10759,Animation:16,Comédie:35,Policier:80,Documentaire:99,Drame:18,Fantastique:10765,Horreur:9648,Romance:10749,'Science-fiction':10765,Thriller:9648}};
export const COUNTRIES={'France':'FR','États-Unis':'US','Royaume-Uni':'GB','Japon':'JP','Corée du Sud':'KR','Inde':'IN','Allemagne':'DE','Italie':'IT','Espagne':'ES','Canada':'CA','Australie':'AU','Belgique':'BE'};
export const MOODS={Léger:['Comédie','Animation','Romance'],Suspense:['Thriller','Policier','Horreur'],Réflexion:['Science-fiction','Drame','Documentaire'],Aventure:['Aventure','Action','Fantastique'],Émouvant:['Drame','Romance','Animation']};
async function get(path,token,params={}){
  const url=new URL(BASE+path);
  for(const [k,v] of Object.entries(params))if(v!==undefined&&v!==null&&v!=='')url.searchParams.set(k,String(v));
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  try{
    const res=await fetch(url,{signal:controller.signal,headers:{Authorization:`Bearer ${token}`,Accept:'application/json'}});
    if(!res.ok){
      if(res.status===401)throw new Error('Jeton TMDB refusé (401). Utilisez le « API Read Access Token » de votre compte TMDB, et non la clé API v3.');
      if(res.status===403)throw new Error('Accès TMDB interdit (403). Vérifiez les autorisations du jeton.');
      if(res.status===429)throw new Error('TMDB limite temporairement les requêtes (429). Réessayez un peu plus tard.');
      throw new Error(`Le service TMDB a répondu avec le code ${res.status}.`);
    }
    const data=await res.json();
    if(!data||!Array.isArray(data.results))throw new Error('TMDB a retourné une réponse inattendue.');
    return data;
  }catch(error){
    if(error.name==='AbortError')throw new Error('TMDB ne répond pas après 12 secondes. Vérifiez votre connexion puis réessayez.');
    if(error instanceof TypeError)throw new Error('Connexion à TMDB impossible. Vérifiez votre accès Internet ou le blocage éventuel des requêtes vers api.themoviedb.org.');
    throw error;
  }finally{clearTimeout(timeout)}
}

// Construit les paramètres séparément pour chaque type de média.
function discoverParams(kind,filters){
  const media=kind==='Film'?'movie':'tv';
  const dict=GENRES[kind];
  const specified=(filters.genre||[]).filter(x=>dict[x]);
  const moodGenres=(filters.mood||[]).flatMap(m=>MOODS[m]||[]);
  const params={language:'fr-FR',include_adult:false,sort_by:'popularity.desc'};
  const countryCodes=[...new Set((filters.country||[]).filter(c=>c!=='Monde').map(c=>COUNTRIES[c]).filter(Boolean))];
  if(countryCodes.length)params.with_origin_country=countryCodes.join('|');
  // Ne jamais tirer de séries d'animation ni d'émissions TV. Les films d'animation restent autorisés.
  if(media==='tv'){
    params.with_type='2|4'; // Mini-séries et séries scénarisées (TMDB)
    params.without_genres='16,99,10763,10764,10766,10767';
  }
  const groups=[specified,moodGenres].filter(x=>x.length).map(group=>[...new Set(group.map(x=>dict[x]).filter(Boolean))].join('|'));
  if(groups.length)params.with_genres=groups.join(',');
  if(filters.period?.length===1){
    const period=filters.period[0];
    const start=period==='2000-2019'?'2000-01-01':period==='Depuis 2020'?'2020-01-01':null;
    const end=period==='Avant 2000'?'1999-12-31':period==='2000-2019'?'2019-12-31':null;
    if(start)params[media==='movie'?'primary_release_date.gte':'first_air_date.gte']=start;
    if(end)params[media==='movie'?'primary_release_date.lte':'first_air_date.lte']=end;
  }
  if(filters.rating?.includes('Bien noté')){
    params['vote_average.gte']=7;
    params['vote_count.gte']=100;
  }
  if(filters.length?.length===1&&media==='movie'){
    const ranges={Court:[0,90],Moyen:[90,120],Long:[120,1000]};
    const bounds=ranges[filters.length[0]];
    if(bounds){params['with_runtime.gte']=bounds[0];params['with_runtime.lte']=bounds[1]}
  }
  return {media,dict,params};
}

// Tirage uniforme des indices de pages, sans inclure artificiellement la page 1.
function randomPages(total,n){
  const pages=new Set();
  while(pages.size<Math.min(total,n))pages.add(1+randomInt(total));
  return [...pages];
}

async function fetchKind(kind,token,filters,excludeIds,limit){
  const {media,dict,params}=discoverParams(kind,filters);
  const countryCodes=(filters.country||[]).filter(c=>c!=='Monde').map(c=>COUNTRIES[c]).filter(Boolean);
  // La première requête fournit le nombre de pages accessibles (TMDB: 500 max).
  const first=await get(`/discover/${media}`,token,{...params,page:1});
  const total=Math.min(Math.max(0,first.total_pages||0),500);
  if(!total)return [];
  const pages=randomPages(total,Math.ceil(limit/20)+2);
  const datasets=await Promise.all(pages.map(page=>page===1?first:get(`/discover/${media}`,token,{...params,page})));
  const items=datasets.flatMap(data=>data.results||[]).map(item=>({
    id:`tmdb-${media}-${item.id}`,tmdbId:item.id,title:item.title||item.name,
    type:kind,genre:(item.genre_ids||[]).map(n=>Object.keys(dict).find(k=>dict[k]===n)).filter(Boolean),
    year:Number((item.release_date||item.first_air_date||'').slice(0,4))||null,
    summary:item.overview||'Aucun résumé disponible.',
    poster:item.poster_path?`https://image.tmdb.org/t/p/w342${item.poster_path}`:null,
    url:`https://www.themoviedb.org/${media}/${item.id}`
  }));
  // Défense supplémentaire contre les métadonnées de type de programme imparfaites.
  const disallowedTvGenres=new Set([16,99,10763,10764,10766,10767]);
  const rawById=new Map(datasets.flatMap(data=>data.results||[]).map(item=>[item.id,item]));
  const unique=[...new Map(items.filter(item=>{
    if(!item.title||excludeIds.has(item.id))return false;
    const raw=rawById.get(item.tmdbId);
    if(media==='tv'&&raw?.genre_ids?.some(id=>disallowedTvGenres.has(id)))return false;
    if(countryCodes.length&&media==='tv'&&raw?.origin_country?.length&&!raw.origin_country.some(code=>countryCodes.includes(code)))return false;
    return true;
  }).map(item=>[item.id,item])).values()];
  return shuffle(unique).slice(0,limit);
}

export async function explore(token,filters,excludeIds=new Set()){
  if(!token)throw new Error('Ajoutez un jeton TMDB dans les paramètres pour explorer.');
  const kinds=(filters.type?.length?filters.type:['Film','Série']).filter(kind=>kind==='Film'||kind==='Série');
  if(!kinds.length)throw new Error('Sélectionnez Film ou Série dans les filtres.');
  const target=120;
  const each=Math.floor(target/kinds.length);
  // Chaque type est interrogé indépendamment pour éviter qu'il monopolise la réserve.
  const outcomes=await Promise.allSettled(kinds.map(kind=>fetchKind(kind,token,filters,excludeIds,each)));
  const successes=outcomes.filter(o=>o.status==='fulfilled').map(o=>o.value);
  if(!successes.length)throw outcomes[0].reason;
  const combined=successes.flat();
  if(!combined.length){
    if(outcomes.some(o=>o.status==='rejected'))throw outcomes.find(o=>o.status==='rejected').reason;
    throw new Error('Aucun nouveau titre trouvé avec ces filtres. Essayez d’autres critères ou réinitialisez l’historique.');
  }
  // Si un catalogue est petit, les autres titres disponibles restent éligibles.
  return shuffle(combined);
}
