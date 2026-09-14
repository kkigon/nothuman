import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const html=readFileSync(new URL('index.html',root),'utf8');
const js=readFileSync(new URL('assets/site.js',root),'utf8');
const css=readFileSync(new URL('assets/site.css',root),'utf8');
test('HTML IDs are unique and script/label/anchor references exist',()=>{
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length);
  const references=[...js.matchAll(/\$\('([^']+)'\)/g)].map(match=>match[1]);
  for(const match of html.matchAll(/\b(?:for|aria-labelledby|aria-describedby)="([^"]+)"/g))references.push(...match[1].split(/\s+/));
  for(const match of html.matchAll(/\bhref="#([^"]+)"/g))references.push(match[1]);
  for(const id of references)assert.ok(ids.includes(id),'Missing ID: '+id);
});
test('public site uses canonical family without historical labels or client tokens',()=>{
  for(const text of [html,js,css]){
    assert.ok(!/\bV[1-6]\b|Deolbaeun|HumanAnimMyeongjo|덜배운체/.test(text));
    assert.ok(!/\bGH_TOKEN\b|\bGITHUB_TOKEN\b|github_pat_|ghp_/.test(text));
  }
  assert.ok(css.includes('body:not(.font-ready) .font-output{visibility:hidden}'));
});
test('six presets and bounded 96-card pagination remain present',()=>{
  assert.equal([...html.matchAll(/data-preset="/g)].length,6);
  assert.ok(js.includes('const pageSize=96'));
  assert.ok(js.includes('filtered.slice(start,start+pageSize)'));
});
test('site assets are local and use paths compatible with project Pages',()=>{
  const refs=[...html.matchAll(/\b(?:src|href)="([^"]+)"/g)].map(match=>match[1]);
  for(const ref of refs){
    if(ref.startsWith('#')||ref.startsWith('fonts/')||ref==='FONT-LICENSE.txt')continue;
    assert.ok(!ref.startsWith('/'),'Root-absolute asset '+ref);
    assert.ok(existsSync(fileURLToPath(new URL(ref,root))),ref);
  }
});

