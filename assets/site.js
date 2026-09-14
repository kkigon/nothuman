import {INITIALS,CACHE_MS,readRepertoire,visibleCodes,filterCodes,validRepository,validAssetUrl,latestReleaseUrl,fetchReleaseStats} from './font-tools.mjs';

const $=id=>document.getElementById(id);
const format=value=>value.toLocaleString('ko-KR');
const cpLabel=cp=>'U+'+cp.toString(16).toUpperCase().padStart(4,'0');
const presets=[
  '안녕, 나는\n휴먼이 아닙니다.',
  '아, 이 글자를\n이렇게 잘못 썼구나!',
  'Hello, human.\nAlmost familiar.',
  '0123456789\n2026 / 09 / 14',
  '! ? @ # $ % & *\n( ) [ ] { } + =',
  '조금 이상한 Type\n한글 + ABC = 123!'
];
const input=$('type-input'),size=$('font-size'),spacing=$('letter-spacing');
const presetButtons=[...document.querySelectorAll('[data-preset]')];
const defaultSize=window.matchMedia('(max-width:640px)').matches?48:88;
let supported=null,allCodes=[],filtered=[],page=0,composing=false,searchComposing=false,fontReady=false,releaseStats=null,releaseFailed=false;
const pageSize=96;

function updateText(){
  if(composing)return;
  const text=input.value.normalize('NFC'),chars=Array.from(text);
  $('compare-original').textContent=text||'위에 문장을 입력해 보세요.';
  $('char-count').textContent=format(Array.from(input.value).length);
  presetButtons.forEach(button=>button.setAttribute('aria-pressed',String(text===presets[Number(button.dataset.preset)])));
  const fragment=document.createDocumentFragment();
  if(!text){const empty=document.createElement('span');empty.className='empty-preview';empty.textContent='위에 문장을 입력해 보세요.';fragment.append(empty);}
  for(const char of chars){
    if(/\s/u.test(char)){fragment.append(document.createTextNode(char));continue;}
    const span=document.createElement('span');span.textContent=char;
    if(supported&&!supported.has(char.codePointAt(0))){span.className='unsupported';span.title=char+' · '+cpLabel(char.codePointAt(0))+' · 이 글꼴에 없는 문자';}
    fragment.append(span);
  }
  $('preview').replaceChildren(fragment);
  if(!supported)return;
  const visible=chars.filter(char=>!/\s/u.test(char));
  const missing=[...new Set(visible.filter(char=>!supported.has(char.codePointAt(0))))];
  const matched=visible.filter(char=>supported.has(char.codePointAt(0))).length;
  $('coverage-summary').classList.toggle('has-missing',missing.length>0);
  $('coverage-summary').textContent=!visible.length?'문장을 입력하면 실제 지원 범위를 확인합니다.':missing.length?'지원 '+format(matched)+'자 · 없는 문자 '+format(missing.length)+'종은 기본 글꼴로 표시합니다.':'입력한 '+format(matched)+'자 모두 글꼴 지원 범위에 있습니다.';
  const list=$('missing-list');list.replaceChildren();list.hidden=!missing.length;
  for(const char of missing.slice(0,30)){const item=document.createElement('span');item.className='missing-item';const value=document.createElement('span');value.className='unsupported';value.textContent=char;const code=document.createElement('span');code.className='code';code.textContent=' '+cpLabel(char.codePointAt(0));item.append(value,code);list.append(item);}
  if(missing.length>30){const rest=document.createElement('span');rest.textContent='외 '+format(missing.length-30)+'종';list.append(rest);}
}
function updateStyle(){document.documentElement.style.setProperty('--type-size',size.value+'px');document.documentElement.style.setProperty('--type-spacing',spacing.value+'px');$('font-size-value').textContent=size.value+' px';$('letter-spacing-value').textContent=spacing.value+' px';}
function setText(text){composing=false;input.value=text;updateText();}
function renderGrid(){
  const totalPages=Math.ceil(filtered.length/pageSize);
  page=Math.max(0,Math.min(page,Math.max(0,totalPages-1)));
  const start=page*pageSize,codes=filtered.slice(start,start+pageSize),fragment=document.createDocumentFragment();
  for(const cp of codes){
    const char=String.fromCodePoint(cp),button=document.createElement('button');button.type='button';button.className='glyph-cell';button.setAttribute('aria-label',char+' '+cpLabel(cp)+' 크게 보기');
    const shape=document.createElement('span');shape.className='glyph-shape font-output';shape.textContent=char;shape.setAttribute('aria-hidden','true');
    const label=document.createElement('span');label.className='glyph-label';const original=document.createElement('span');original.textContent=char;const code=document.createElement('span');code.className='code';code.textContent=cpLabel(cp);label.append(original,code);button.append(shape,label);
    button.addEventListener('click',()=>{setText(char);$('tester').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});input.focus({preventScroll:true});});
    fragment.append(button);
  }
  $('glyph-grid').replaceChildren(fragment);$('glyph-grid').hidden=!codes.length;$('empty-results').hidden=!!codes.length;
  $('range-state').textContent=codes.length?format(filtered.length)+'자 중 '+format(start+1)+'–'+format(start+codes.length)+'자':'0자';
  $('page-count').textContent=totalPages?format(page+1)+' / '+format(totalPages):'0 / 0';
  $('previous-page').disabled=page===0||!totalPages;$('next-page').disabled=page+1>=totalPages;
  $('page-number').value=totalPages?page+1:1;$('page-number').max=Math.max(1,totalPages);$('page-number').disabled=!totalPages;$('page-jump').querySelector('button').disabled=!totalPages;
}
function updateFilter(){if(searchComposing||!supported)return;filtered=filterCodes(allCodes,{category:$('category-filter').value,initial:$('initial-filter').value,query:$('glyph-search').value});page=0;renderGrid();}
function enableLink(link,href,download){if(href)link.href=href;link.removeAttribute('aria-disabled');link.removeAttribute('tabindex');if(download)link.setAttribute('download',download);else link.removeAttribute('download');}
function updateDownload(){
  if(fontReady){enableLink($('direct-ttf'),null,'NotHumanMyeongjo-Regular.ttf');enableLink($('direct-woff'),null,'NotHumanMyeongjo-Regular.woff2');}
  if(releaseStats?.downloadUrl){
    enableLink($('release-download'),releaseStats.downloadUrl);
    $('download-label').textContent=releaseStats.prerelease?'미리보기 ZIP 무료 다운로드':'글꼴 ZIP 무료 다운로드';
    $('release-state').textContent='TTF + WOFF2 + 글꼴 이용 조건을 함께 받습니다.';
  }else if(!releaseStats&&latestReleaseUrl(window.NOTHUMAN_SITE_CONFIG?.repository)){
    enableLink($('release-download'),latestReleaseUrl(window.NOTHUMAN_SITE_CONFIG.repository));
    $('download-label').textContent='글꼴 ZIP 무료 다운로드';
    $('release-state').textContent=releaseFailed?'집계는 확인할 수 없지만 공개 배포 ZIP 링크를 제공합니다. 파일이 열리지 않으면 아래 TTF 직접 받기를 이용하세요.':'공개 배포 ZIP으로 연결합니다. 다운로드 집계는 확인 중입니다.';
  }else if(fontReady){
    enableLink($('release-download'),'fonts/NotHumanMyeongjo-Regular.ttf','NotHumanMyeongjo-Regular.ttf');
    $('download-label').textContent='TTF 무료 다운로드';
    $('release-state').textContent=releaseFailed?'배포 ZIP을 확인할 수 없어 TTF를 직접 제공합니다. 이 다운로드는 누적 수에 포함되지 않습니다.':releaseStats?'공개 배포 ZIP이 아직 없어 TTF를 직접 제공합니다. 이 다운로드는 누적 수에 포함되지 않습니다.':'배포 ZIP을 확인하는 동안 TTF를 직접 받을 수 있습니다. 직접 받기는 집계에서 제외됩니다.';
  }else if(releaseFailed||releaseStats){
    $('download-label').textContent='다운로드 파일 확인 불가';
    $('release-state').textContent='글꼴 파일과 공개 배포 ZIP을 확인하지 못했습니다. 잠시 후 다시 방문해 주세요.';
  }
}
function showStats(stats,cached=false){
  releaseStats=stats;$('download-count').textContent=stats.assetCount?format(stats.total)+'회':'배포 전';
  $('download-count-note').textContent=stats.assetCount?new Date(stats.checkedAt).toLocaleString('ko-KR')+' 기준'+(cached?' · 최대 10분 캐시':''):'공개된 폰트 ZIP이 아직 없습니다.';
  updateDownload();
}
async function loadDownloads(){
  const repository=window.NOTHUMAN_SITE_CONFIG?.repository||'';
  const cacheKey='nothuman-releases:'+repository;
  try{
    if(!validRepository(repository))throw new Error('아직 공개 저장소가 연결되지 않았습니다.');
    let cached=null;
    try{cached=JSON.parse(localStorage.getItem(cacheKey)||'null');}catch{}
    if(cached?.retryAt>Date.now())throw new Error('잠시 후 다운로드 집계를 다시 확인해 주세요.');
    if(cached&&Number.isSafeInteger(cached.total)&&cached.total>=0&&Number.isSafeInteger(cached.assetCount)&&cached.assetCount>=0&&
      cached.checkedAt<=Date.now()&&Date.now()-cached.checkedAt<CACHE_MS&&
      (cached.downloadUrl===null||validAssetUrl(cached.downloadUrl,repository))){
      showStats(cached,true);return;
    }
    let stats;
    try{stats=await fetchReleaseStats(repository);}
    catch(error){if(error.status===403||error.status===429){try{localStorage.setItem(cacheKey,JSON.stringify({retryAt:error.retryAt}));}catch{}}throw error;}
    try{localStorage.setItem(cacheKey,JSON.stringify(stats));}catch{}
    showStats(stats);
  }catch(error){
    releaseFailed=true;$('download-count').textContent='확인 불가';$('download-count-note').textContent=error.name==='AbortError'?'집계 서버 응답이 늦어 확인하지 못했습니다.':error.message||'다운로드 집계를 확인할 수 없습니다.';updateDownload();
  }
}
async function loadFont(){
  try{
    const response=await fetch('fonts/repertoire.json',{cache:'no-cache'});
    if(!response.ok)throw new Error('지원 문자 목록을 불러오지 못했습니다.');
    const codes=readRepertoire(await response.json());supported=new Set(codes);allCodes=visibleCodes(codes);
    const hangul=codes.filter(cp=>cp>=0xAC00&&cp<=0xD7A3).length;
    $('repertoire-count').textContent=format(codes.length)+'자 · 한글 '+format(hangul)+'음절';
    updateText();updateFilter();
    if(!document.fonts?.load)throw new Error('이 브라우저에서 글꼴 적용 여부를 확인할 수 없습니다.');
    const faces=await document.fonts.load('64px NotHumanMyeongjo','휴먼아님명조체Aa09!?');
    if(!faces.length)throw new Error('글꼴 파일을 불러오지 못했습니다.');
    fontReady=true;document.body.classList.add('font-ready');$('font-state').textContent='휴먼아님명조체 적용 완료 · 실제 지원 문자 '+format(codes.length)+'자';updateDownload();
  }catch(error){
    $('font-state').classList.add('error');$('font-state').textContent=error.message+' 견본은 숨겨 두었습니다.';
    $('preview-placeholder').textContent='지금은 원문만 표시합니다. 잠시 후 다시 방문해 주세요.';$('grid-placeholder').textContent='글꼴을 확인할 수 없어 AI 견본을 표시하지 않습니다.';
    if(!supported){$('repertoire-count').textContent='확인 불가';$('coverage-summary').textContent='지원 문자 목록을 확인할 수 없습니다.';$('range-state').textContent='문자 목록 확인 불가';}
    updateDownload();
  }
}
input.addEventListener('compositionstart',()=>{composing=true;});input.addEventListener('compositionend',()=>{composing=false;updateText();});input.addEventListener('input',updateText);
size.addEventListener('input',updateStyle);spacing.addEventListener('input',updateStyle);
presetButtons.forEach(button=>button.addEventListener('click',()=>setText(presets[Number(button.dataset.preset)])));
$('reset').addEventListener('click',()=>{size.value=defaultSize;spacing.value=0;updateStyle();setText(presets[0]);});
$('theme-toggle').addEventListener('click',()=>{const dark=document.body.classList.toggle('dark');$('theme-toggle').setAttribute('aria-pressed',String(dark));$('theme-label').textContent=dark?'밝은 배경':'어두운 배경';});
INITIALS.forEach((initial,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=initial;$('initial-filter').append(option);});
$('category-filter').addEventListener('change',updateFilter);$('initial-filter').addEventListener('change',updateFilter);
$('glyph-search').addEventListener('compositionstart',()=>{searchComposing=true;});$('glyph-search').addEventListener('compositionend',()=>{searchComposing=false;updateFilter();});$('glyph-search').addEventListener('input',updateFilter);
$('filter-reset').addEventListener('click',()=>{searchComposing=false;$('category-filter').value='all';$('initial-filter').value='all';$('glyph-search').value='';updateFilter();});
$('previous-page').addEventListener('click',()=>{page--;renderGrid();});$('next-page').addEventListener('click',()=>{page++;renderGrid();});
$('page-jump').addEventListener('submit',event=>{event.preventDefault();const requested=Number($('page-number').value);if(Number.isFinite(requested)){page=Math.floor(requested)-1;renderGrid();}});
size.value=defaultSize;updateStyle();updateText();updateDownload();
loadFont();loadDownloads();
