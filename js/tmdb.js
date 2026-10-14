import {randomInt,shuffle} from './random.js';
const BASE='https://api.themoviedb.org/3';
export const GENRES={Film:{Action:28,Aventure:12,Animation:16,Comédie:35,Policier:80,Documentaire:99,Drame:18,Fantastique:14,Horreur:27,Romance:10749,'Science-fiction':878,Thriller:53},Série:{Action:10759,Aventure:10759,Animation:16,Comédie:35,Policier:80,Documentaire:99,Drame:18,Fantastique:10765,Horreur:9648,Romance:10749,'Science-fiction':10765,Thriller:9648}};
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

export async function explore(token,filters,excludeIds=new Set()){if(!token)throw new Error('Ajoutez un jeton TMDB dans les paramètres pour explorer.');const kinds=filters.type?.length?filters.type:['Film','Série'];const choices=shuffle(kinds);let candidates=[];for(const kind of choices){const media=kind==='Film'?'movie':'tv';const dict=GENRES[kind];const specified=(filters.genre||[]).filter(x=>dict[x]);const moodGenres=(filters.mood||[]).flatMap(m=>MOODS[m]||[]);const params={language:'fr-FR',include_adult:false,sort_by:'popularity.desc'};const groups=[specified,moodGenres].filter(x=>x.length).map(group=>[...new Set(group.map(x=>dict[x]).filter(Boolean))].join('|'));if(groups.length)params.with_genres=groups.join(',');if(filters.period?.length===1){const p=filters.period[0];const start=p==='Avant 2000'?null:p==='2000-2019'?'2000-01-01':'2020-01-01';const end=p==='Avant 2000'?'1999-12-31':p==='2000-2019'?'2019-12-31':null;if(start)params[media==='movie'?'primary_release_date.gte':'first_air_date.gte']=start;if(end)params[media==='movie'?'primary_release_date.lte':'first_air_date.lte']=end}if(filters.rating?.includes('Bien noté')){params['vote_average.gte']=7;params['vote_count.gte']=100}if(filters.length?.length===1 && media==='movie'){const ranges={'Court':[0,90],'Moyen':[90,120],'Long':[120,1000]};const [a,b]=ranges[filters.length[0]]||[];if(a!==undefined){params['with_runtime.gte']=a;params['with_runtime.lte']=b}}const first=await get(`/discover/${media}`,token,{...params,page:1});const total=Math.min(Math.max(1,first.total_pages||1),500);const pages=[1];for(let i=0;i<Math.min(5,total-1);i++){const p=1+randomInt(total);if(!pages.includes(p))pages.push(p)}const sets=await Promise.all(pages.map(p=>p===1?Promise.resolve(first):get(`/discover/${media}`,token,{...params,page:p})));candidates.push(...sets.flatMap(data=>(data.results||[]).map(item=>({id:`tmdb-${media}-${item.id}`,tmdbId:item.id,title:item.title||item.name,type:kind,genre:(item.genre_ids||[]).map(n=>Object.keys(dict).find(k=>dict[k]===n)).filter(Boolean),year:Number((item.release_date||item.first_air_date||'').slice(0,4))||null,summary:item.overview||'Aucun résumé disponible.',poster:item.poster_path?`https://image.tmdb.org/t/p/w342${item.poster_path}`:null,url:`https://www.themoviedb.org/${media}/${item.id}`}))));candidates=candidates.filter(x=>x.title&&!excludeIds.has(x.id));if(candidates.length)break}if(!candidates.length)throw new Error('Aucune nouvelle proposition trouvée. Modifiez les filtres ou réinitialisez l’historique.');return shuffle(candidates)}
