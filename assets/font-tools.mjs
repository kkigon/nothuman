export const INITIALS = Array.from('ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ');
export const ASSET_NAME = 'NotHumanMyeongjo-fonts.zip';
export const API_VERSION = '2026-03-10';
export const CACHE_MS = 10 * 60 * 1000;

export function readRepertoire(data) {
  if (!data || !Array.isArray(data.codepoints) || !data.codepoints.length) throw new Error('지원 문자 목록이 없습니다.');
  const values = data.codepoints;
  if (values.some(cp => !Number.isInteger(cp) || cp < 0 || cp > 0x10FFFF || (cp >= 0xD800 && cp <= 0xDFFF))) throw new Error('지원 문자 목록 형식이 올바르지 않습니다.');
  if (new Set(values).size !== values.length) throw new Error('지원 문자 목록이 중복되었습니다.');
  return [...values].sort((a,b) => a-b);
}
export function categoryOf(cp) {
  if (cp >= 0xAC00 && cp <= 0xD7A3) return 'hangul';
  if ((cp >= 65 && cp <= 90) || (cp >= 97 && cp <= 122)) return 'latin';
  if (cp >= 48 && cp <= 57) return 'digits';
  return 'symbols';
}
export function visibleCodes(codes) {
  return codes.filter(cp => cp >= 32 && !(cp >= 0x7F && cp <= 0x9F) && !/[\s\p{Cf}]/u.test(String.fromCodePoint(cp)));
}
export function filterCodes(codes, {category='all', initial='all', query=''}={}) {
  const text = query.normalize('NFC').trim();
  const hex = /^U\+([0-9A-F]{4,6})$/i.exec(text);
  const wanted = new Set(hex ? [parseInt(hex[1],16)] : Array.from(text, char => char.codePointAt(0)));
  const wantedInitials = new Set(hex ? [] : Array.from(text).map(char => INITIALS.indexOf(char)).filter(index => index >= 0));
  return codes.filter(cp => {
    const group = categoryOf(cp);
    const index = group === 'hangul' ? Math.floor((cp-0xAC00)/588) : -1;
    return (category === 'all' || category === group) &&
      (initial === 'all' || (index >= 0 && index === Number(initial))) &&
      (!text || wanted.has(cp) || wantedInitials.has(index));
  });
}
export function validRepository(repository) {
  return typeof repository === 'string' && /^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/.test(repository) && !['.','..'].includes(repository.split('/')[1]);
}
export function validAssetUrl(value,repository) {
  try {
    const url = new URL(value);
    return validRepository(repository) && url.origin === 'https://github.com' && !url.username && !url.password &&
      url.pathname.startsWith('/'+repository+'/releases/download/') && url.pathname.endsWith('/'+ASSET_NAME) && !url.search && !url.hash;
  } catch { return false; }
}
export function latestReleaseUrl(repository) {
  return validRepository(repository) ? 'https://github.com/'+repository+'/releases/latest/download/'+ASSET_NAME : null;
}
export function collectReleaseStats(releases,repository) {
  if (!validRepository(repository) || !Array.isArray(releases)) throw new Error('배포 목록 형식이 올바르지 않습니다.');
  let total = 0;
  const seen = new Set(), matches = [];
  for (const release of releases) {
    if (!release || release.draft) continue;
    if (!Array.isArray(release.assets)) throw new Error('배포 파일 목록을 확인할 수 없습니다.');
    for (const asset of release.assets) {
      if (asset.name !== ASSET_NAME) continue;
      if (!Number.isSafeInteger(asset.id) || !Number.isSafeInteger(asset.download_count) || asset.download_count < 0 ||
          !validAssetUrl(asset.browser_download_url,repository)) throw new Error('배포 파일의 집계 정보가 올바르지 않습니다.');
      if (seen.has(asset.id)) continue;
      seen.add(asset.id); total += asset.download_count;
      if (!Number.isSafeInteger(total)) throw new Error('다운로드 집계 범위를 초과했습니다.');
      matches.push({url:asset.browser_download_url, prerelease:!!release.prerelease, publishedAt:release.published_at || release.created_at || ''});
    }
  }
  const stable = matches.filter(item => !item.prerelease);
  const candidates = stable.length ? stable : matches;
  candidates.sort((a,b) => (Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0));
  return {total,assetCount:seen.size,downloadUrl:candidates[0]?.url || null,prerelease:!!candidates[0]?.prerelease};
}
export async function fetchReleaseStats(repository,fetcher=fetch) {
  if (!validRepository(repository)) throw new Error('공개 저장소가 아직 연결되지 않았습니다.');
  const base = 'https://api.github.com/repos/'+repository+'/releases';
  let url = base+'?per_page=100&page=1', pages=0;
  const releases=[], visited=new Set();
  while (url) {
    if (visited.has(url) || ++pages > 50) throw new Error('전체 배포 목록을 확인하지 못했습니다.');
    visited.add(url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(),12000);
    let response;
    try { response = await fetcher(url,{headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':API_VERSION},signal:controller.signal}); }
    finally { clearTimeout(timer); }
    if (!response.ok) {
      const error = new Error(response.status === 403 || response.status === 429 ? '잠시 후 다운로드 집계를 다시 확인해 주세요.' : '다운로드 집계를 확인할 수 없습니다.');
      error.status=response.status;
      const retryAfter = response.headers.get('Retry-After');
      const retrySeconds = retryAfter === null ? NaN : Number(retryAfter);
      const retryDate = retryAfter && !Number.isFinite(retrySeconds) ? Date.parse(retryAfter) : NaN;
      const reset = Number(response.headers.get('X-RateLimit-Reset'))*1000;
      error.retryAt = Number.isFinite(retrySeconds) ? Date.now()+Math.max(0,retrySeconds)*1000 : Number.isFinite(retryDate) ? retryDate : reset > Date.now() ? reset : Date.now()+CACHE_MS;
      throw error;
    }
    const page = await response.json();
    if (!Array.isArray(page)) throw new Error('배포 목록 응답이 올바르지 않습니다.');
    releases.push(...page);
    const next = (response.headers.get('Link') || '').split(',').map(item => item.trim()).find(item => /;\s*rel="next"/.test(item));
    url = null;
    if (next) {
      const match=/^<([^>]+)>/.exec(next);
      if (!match) throw new Error('배포 목록의 다음 페이지가 올바르지 않습니다.');
      const candidate = new URL(match[1]);
      const repositoryPath = candidate.pathname === new URL(base).pathname || /^\/repositories\/\d+\/releases$/.test(candidate.pathname);
      if (candidate.origin !== 'https://api.github.com' || !repositoryPath ||
          !/^\d+$/.test(candidate.searchParams.get('page') || '')) throw new Error('배포 목록 주소가 올바르지 않습니다.');
      url=candidate.href;
    }
  }
  return {...collectReleaseStats(releases,repository),checkedAt:Date.now(),pages};
}
