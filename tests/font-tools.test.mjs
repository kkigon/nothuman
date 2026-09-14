import test from 'node:test';
import assert from 'node:assert/strict';
import {ASSET_NAME,readRepertoire,visibleCodes,filterCodes,collectReleaseStats,fetchReleaseStats,validAssetUrl,validRepository} from '../assets/font-tools.mjs';
const repo='sample-owner/font-site';
const url=tag=>'https://github.com/'+repo+'/releases/download/'+tag+'/'+ASSET_NAME;
const asset=(id,count,tag='v1.0.0')=>({id,name:ASSET_NAME,download_count:count,browser_download_url:url(tag)});
const release=(assets,extra={})=>({assets,draft:false,prerelease:false,published_at:'2026-09-14T00:00:00Z',...extra});
const response=(data,link=null,status=200,headers={})=>({ok:status>=200&&status<300,status,json:async()=>data,headers:new Headers({...headers,...(link?{Link:link}:{})})});

test('actual repertoire is sorted without adding inferred characters',()=>{
  assert.deepEqual(readRepertoire({codepoints:[0xAC00,65,32]}),[32,65,0xAC00]);
  for(const data of [null,{}, {codepoints:[]},{codepoints:[65,65]},{codepoints:[0xD800]},{codepoints:['65']},{codepoints:[0x110000]}])assert.throws(()=>readRepertoire(data));
});
test('spaces and controls are not shown as empty glyph cards',()=>{
  assert.deepEqual(visibleCodes([0,10,32,65,127,0x200B,0x3000,0xAC00]),[65,0xAC00]);
});
test('mixed search, NFC input, explicit codepoint, and Korean initial preserve actual support',()=>{
  const codes=[33,48,65,66,97,0x3131,0xAC00,0xAC01,0xB098];
  assert.deepEqual(filterCodes(codes,{query:'A가!'}),[33,65,0xAC00]);
  assert.deepEqual(filterCodes(codes,{query:'가'}),[0xAC00]);
  assert.deepEqual(filterCodes(codes,{query:'U+0041'}),[65]);
  assert.deepEqual(filterCodes(codes,{query:'ㄱ'}),[0x3131,0xAC00,0xAC01]);
  assert.deepEqual(filterCodes(codes,{category:'latin'}),[65,66,97]);
  assert.deepEqual(filterCodes(codes,{category:'digits'}),[48]);
  assert.deepEqual(filterCodes(codes,{initial:'0'}),[0xAC00,0xAC01]);
  assert.deepEqual(filterCodes(codes,{category:'latin',initial:'0'}),[]);
  assert.deepEqual(filterCodes(codes,{query:'😀'}),[]);
});
test('11172 syllables can be paged in blocks of 96 without missing or duplicated entries',()=>{
  const codes=Array.from({length:11172},(_,i)=>0xAC00+i),pages=[];
  for(let start=0;start<codes.length;start+=96)pages.push(codes.slice(start,start+96));
  assert.equal(pages.length,117);assert.equal(pages.at(-1).length,36);
  assert.deepEqual(pages.flat(),codes);assert.equal(new Set(pages.flat()).size,11172);
});
test('only exact public ZIP assets count; duplicates are counted once and stable downloads preferred',()=>{
  const first=release([asset(1,12)],{published_at:'2026-09-01T00:00:00Z'});
  const prerelease=release([asset(2,7,'v2-preview')],{prerelease:true});
  const draft=release([asset(3,100)],{draft:true});
  const other=release([{...asset(4,500),name:'other.zip'}]);
  const stats=collectReleaseStats([first,prerelease,draft,other,first],repo);
  assert.deepEqual(stats,{total:19,assetCount:2,downloadUrl:url('v1.0.0'),prerelease:false});
  assert.equal(collectReleaseStats([prerelease],repo).prerelease,true);
});
test('no release is different from a real asset with zero downloads',()=>{
  assert.deepEqual(collectReleaseStats([],repo),{total:0,assetCount:0,downloadUrl:null,prerelease:false});
  assert.equal(collectReleaseStats([release([asset(1,0)])],repo).assetCount,1);
});
test('invalid counts and unsafe download links do not become numbers or hrefs',()=>{
  for(const value of [-1,undefined,NaN,'5'])assert.throws(()=>collectReleaseStats([release([{...asset(1,3),download_count:value}])],repo));
  assert.equal(validRepository('sample-owner/font-site'),true);
  assert.equal(validRepository('sample-owner/..'),false);
  assert.equal(validRepository('a/b/c'),false);
  assert.equal(validAssetUrl('javascript:alert(1)',repo),false);
  assert.equal(validAssetUrl('https://evil.test/'+ASSET_NAME,repo),false);
  assert.equal(validAssetUrl(url('v1'),repo),true);
});
test('normal GitHub numeric-repository Link is followed to completion',async()=>{
  const next='https://api.github.com/repositories/12345/releases?per_page=100&page=2',calls=[];
  const result=await fetchReleaseStats(repo,async(address,options)=>{
    calls.push(address);assert.equal(options.headers['X-GitHub-Api-Version'],'2026-03-10');
    return calls.length===1?response([release([asset(1,12)])],'<'+next+'>; rel="next"'):response([release([asset(2,8)])]);
  });
  assert.equal(result.total,20);assert.equal(result.pages,2);assert.equal(calls[1],next);
});
test('failure after a successful page rejects instead of returning a partial total',async()=>{
  let calls=0;
  await assert.rejects(()=>fetchReleaseStats(repo,async()=>++calls===1?response([release([asset(1,12)])],'<https://api.github.com/repositories/123/releases?page=2>; rel="next"'):response(null,null,500)));
  assert.equal(calls,2);
});
test('bad origin, repeated links, and malformed responses fail closed',async()=>{
  await assert.rejects(()=>fetchReleaseStats(repo,async()=>response([], '<https://evil.test/releases?page=2>; rel="next"')));
  await assert.rejects(()=>fetchReleaseStats(repo,async()=>response([], '<https://api.github.com/repos/'+repo+'/releases?per_page=100&page=1>; rel="next"')));
  await assert.rejects(()=>fetchReleaseStats(repo,async()=>response({message:'invalid'})));
});
test('rate limit supplies retry time without silently returning zero',async()=>{
  const before=Date.now();
  await assert.rejects(()=>fetchReleaseStats(repo,async()=>response(null,null,429,{'Retry-After':'120'})),error=>error.status===429&&error.retryAt>=before+120000);
  const reset=Math.floor(Date.now()/1000)+180;
  await assert.rejects(()=>fetchReleaseStats(repo,async()=>response(null,null,403,{'X-RateLimit-Reset':String(reset)})),error=>error.retryAt===reset*1000);
});

