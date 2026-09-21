const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);
let catalog=[],currentSection='now';

async function load(){
  try{
    const r=await fetch('data/catalog.json',{cache:'no-store'});
    if(!r.ok)throw Error('catalog');
    const d=await r.json();
    catalog=d.items||[];
    $('#updated').textContent='Programação atualizada em '+(d.updated_at?new Date(d.updated_at).toLocaleString('pt-BR'):'data não informada');
    renderCinema();
  }catch(e){
    $('#updated').textContent='Catálogo aguardando atualização.';
    ['nowGrid','soonGrid','upcomingGrid'].forEach(id=>$( '#'+id).innerHTML='<div class="empty">O catálogo ainda não foi atualizado pelo GitHub Actions.</div>');
  }
}

function renderCinema(){
  const today=new Date(); today.setHours(0,0,0,0);
  const soonEnd=new Date(today); soonEnd.setDate(soonEnd.getDate()+14);
  const upcomingEnd=new Date(today); upcomingEnd.setDate(upcomingEnd.getDate()+45);
  const movies=catalog.filter(x=>x.type==='movie');
  const now=movies.filter(x=>{const d=dateOf(x);return d<=today && (!x.release_end||new Date(x.release_end+'T23:59:59')>=today)});
  const soon=movies.filter(x=>{const d=dateOf(x);return d>today&&d<=soonEnd});
  const upcoming=movies.filter(x=>{const d=dateOf(x);return d>soonEnd&&d<=upcomingEnd});
  fill('nowGrid','nowCount',now);fill('soonGrid','soonCount',soon);fill('upcomingGrid','upcomingCount',upcoming);
}

function dateOf(x){return new Date((x.release_date||'2099-12-31')+'T12:00:00')}

function fill(gridId,countId,items){
  const g=$('#'+gridId);$('#'+countId).textContent=items.length+' filmes';
  g.innerHTML=items.map(card).join('')||'<div class="empty">Nenhum filme nesta categoria no momento.</div>';
  g.querySelectorAll('.movie-card').forEach(c=>c.onclick=()=>openDetail(c.dataset.id));
}

function card(x){
  const poster=x.poster||'';
  return '<article class="movie-card" data-id="'+esc(x.id)+'"><img class="poster" loading="lazy" src="'+esc(poster)+'" alt="'+esc(x.title)+'"><div class="movie-card-body"><div class="movie-title">'+esc(x.title)+'</div><div class="movie-date">'+formatDate(x.release_date)+'</div><div class="provider-row">'+(x.providers||[]).slice(0,3).map(p=>'<span class="provider">'+esc(p.name)+'</span>').join('')+'</div></div></article>';
}

function openDetail(id){
  const x=catalog.find(v=>String(v.id)===String(id));if(!x)return;
  $('#detailPoster').src=x.poster||'';$('#detailPoster').alt=x.title;
  $('#detailBackdrop').style.backgroundImage=x.backdrop?'url("'+escAttr(x.backdrop)+'")':'none';
  $('#detailType').textContent=x.type==='tv'?'SÉRIE':'FILME';
  $('#detailTitle').textContent=x.title||'';
  $('#detailMeta').innerHTML=[formatDate(x.release_date),x.runtime?x.runtime+' min':'',x.genres?.slice(0,3).join(' • '),x.vote_average?'⭐ '+Number(x.vote_average).toFixed(1):''].filter(Boolean).map(esc).join(' <span>•</span> ');
  $('#detailTagline').textContent=x.tagline||'';
  $('#detailOverview').textContent=x.overview||'Sinopse não disponível.';
  $('#detailCredits').innerHTML=[x.director?'Direção: '+x.director:'',x.cast?.length?'Elenco: '+x.cast.slice(0,5).join(', '):''].filter(Boolean).map(esc).join('<br>');
  renderTrailer(x);
  renderVideos(x);
  renderGallery(x);
  renderProviders(x);
  $('#tmdbLink').href=x.tmdb_url||'https://www.themoviedb.org/';
  $('#modal').hidden=false;document.body.style.overflow='hidden';
}

function renderTrailer(x){
  const videos=x.videos||[];
  const youtube=v=>v.key&&(!v.site||v.site==='YouTube');
  const trailer=videos.find(v=>youtube(v)&&v.type==='Trailer'&&v.official)||videos.find(v=>youtube(v)&&v.type==='Trailer')||videos.find(v=>youtube(v)&&v.type==='Teaser');
  if(trailer){
    $('#trailerLabel').textContent=esc(trailer.name||'YouTube');
    $('#trailerBox').innerHTML='<iframe src="https://www.youtube-nocookie.com/embed/'+encodeURIComponent(trailer.key)+'?rel=0" title="'+escAttr(trailer.name||'Trailer')+'" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
    $('#trailerSection').hidden=false;
  }else{
    $('#trailerLabel').textContent='';
    $('#trailerBox').innerHTML='<div class="no-video">Trailer oficial não disponível no catálogo do TMDB.</div>';
  }
}

function renderVideos(x){
  const videos=(x.videos||[]).filter(v=>v.key&&(!v.site||v.site==='YouTube'));
  const others=videos.filter(v=>v.key!==((videos.find(v=>v.type==='Trailer'&&v.official)||videos.find(v=>v.type==='Trailer')||{}).key)).slice(0,6);
  const section=$('#moreVideosSection'),list=$('#videoList');
  if(!others.length){section.hidden=true;list.innerHTML='';return}
  section.hidden=false;
  list.innerHTML=others.map(v=>'<article class="video-item" data-key="'+esc(v.key)+'"><div class="video-thumb" style="background-image:url(\'https://i.ytimg.com/vi/'+encodeURIComponent(v.key)+'/hqdefault.jpg\')"><span class="play">▶</span></div><strong>'+esc(v.name||v.type||'Vídeo')+'</strong></article>').join('');
  list.querySelectorAll('.video-item').forEach(el=>el.onclick=()=>{$('#trailerLabel').textContent='';$('#trailerBox').innerHTML='<iframe src="https://www.youtube-nocookie.com/embed/'+encodeURIComponent(el.dataset.key)+'?rel=0" title="Vídeo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';window.scrollTo({top:$('#trailerSection').offsetTop,behavior:'smooth'})});
}

function renderGallery(x){
  const images=(x.images||[]).slice(0,8),section=$('#gallerySection');
  if(!images.length){section.hidden=true;return}
  section.hidden=false;
  $('#gallery').innerHTML=images.map(p=>'<img loading="lazy" src="'+esc(p)+'" alt="Imagem de '+escAttr(x.title)+'">').join('');
}

function renderProviders(x){
  const ps=x.providers||[];
  $('#detailProviders').innerHTML=ps.length?ps.map(p=>'<div class="provider-large">'+(p.logo?'<img loading="lazy" src="https://image.tmdb.org/t/p/w92'+escAttr(p.logo)+'" alt="">':'')+'<span>'+esc(p.name)+'</span></div>').join(''):'<span class="empty">Disponibilidade não informada.</span>';
}

function close(){ $('#modal').hidden=true;document.body.style.overflow='';$('#trailerBox').innerHTML='';}
function formatDate(s){if(!s)return '';const d=new Date(s+'T12:00:00');return isNaN(d)?s:d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});}
function esc(s=''){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function escAttr(s=''){return esc(s).replace(/'/g,'&#39;');}

$$('.cinema-nav button').forEach(b=>b.onclick=()=>{$$('.cinema-nav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.getElementById(b.dataset.section+'Section').scrollIntoView({behavior:'smooth',block:'start'});});
$$('[data-close]').forEach(x=>x.onclick=close);
document.addEventListener('keydown',e=>e.key==='Escape'&&close());
let deferred;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;$('#installBtn').hidden=false});$('#installBtn').onclick=async()=>{if(!deferred)return;deferred.prompt();await deferred.userChoice;deferred=null;$('#installBtn').hidden=true};
if('serviceWorker'in navigator)navigator.serviceWorker.register('service-worker.js');
load();