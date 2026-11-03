import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const code=await readFile(new URL('../public/motion.js',import.meta.url),'utf8');
function scenario(reduced){
 let change,observer,created=0,cancelled=0,removed=0,frames;
 const preference={matches:reduced,addEventListener:(name,callback)=>{change=callback;}};
 const node={dataset:{},textContent:'Имплантация зубов',closest:()=>null,matches:()=>false,getClientRects:()=>[{}],getBoundingClientRect:()=>({width:250,height:50}),animate:(value)=>{frames=value;return {finished:new Promise(()=>{}),cancel:()=>{cancelled++;}};}};
 const document={readyState:'complete',documentElement:{scrollHeight:1500},body:{appendChild:()=>{created++;}},querySelector:()=>null,querySelectorAll:selector=>selector.includes('data-elem-type="text"')?[node]:[],createElement:()=>({style:{},setAttribute(){},remove(){removed++;}})};
 class Element{animate(){}}
 class IntersectionObserver{constructor(callback){observer={callback,nodes:[],disconnected:false};}observe(n){observer.nodes.push(n);}unobserve(){}disconnect(){observer.disconnected=true;}}
 class MutationObserver{observe(){}}
 const context={document,Element,IntersectionObserver,MutationObserver,matchMedia:query=>query.includes('prefers-reduced-motion')?preference:{matches:false},performance:{now:()=>0},innerHeight:800,scrollY:0,requestAnimationFrame:callback=>callback(),window:{addEventListener(){}}};
 context.window.IntersectionObserver=IntersectionObserver;
 vm.runInNewContext(code,context);
 if(reduced){assert.equal(created,0);assert.equal(observer,undefined);assert.equal(node.dataset.zigmaSeen,undefined);}
 else{
  assert.equal(observer.nodes.length,1);observer.callback([{target:node,isIntersecting:true}]);assert.equal(node.dataset.zigmaSeen,'true');
  assert.ok(frames.every(frame=>Object.keys(frame).every(key=>key==='opacity')));
  preference.matches=true;change();assert.equal(cancelled,1);assert.equal(removed,1);assert.equal(observer.disconnected,true);
 }
}
scenario(true);scenario(false);
console.log('PASS: reduced-motion skips effects, changing preference cancels active motion, and keyframes do not animate layout dimensions.');
