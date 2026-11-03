import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const code=await readFile(new URL('../public/motion.js',import.meta.url),'utf8');
function scenario(reduced,oldValue,query){
 let observer,created=0,frames;
 const node={dataset:{},textContent:'Имплантация зубов',closest:()=>null,matches:()=>false,getClientRects:()=>[{}],getBoundingClientRect:()=>({width:250,height:50}),animate:(value)=>{frames=value;return {finished:new Promise(()=>{}),cancel(){}};}};
 const document={readyState:'complete',documentElement:{scrollHeight:1500,dataset:{}},body:{appendChild:()=>{created++;}},querySelector:()=>null,querySelectorAll:selector=>selector.includes('data-elem-type="text"')?[node]:[],createElement:()=>({style:{},setAttribute(){},remove(){}})};
 class Element{animate(){}}
 class IntersectionObserver{constructor(callback){observer={callback,nodes:[]};}observe(n){observer.nodes.push(n);}unobserve(){}disconnect(){}}
 class MutationObserver{observe(){}}
 const context={document,Element,IntersectionObserver,MutationObserver,localStorage:{getItem:()=>oldValue,setItem(){}},location:{href:'https://test.local/'+query},URL,matchMedia:()=>({matches:reduced}),performance:{now:()=>0},innerHeight:800,scrollY:0,requestAnimationFrame:callback=>callback(),window:{addEventListener(){}}};
 context.window.IntersectionObserver=IntersectionObserver;
 vm.runInNewContext(code,context);
 assert.equal(document.documentElement.dataset.siteMotion,'on');assert.equal(created,1);assert.equal(observer.nodes.length,1);
 observer.callback([{target:node,isIntersecting:true}]);assert.equal(node.dataset.zigmaSeen,'true');assert.ok(frames.every(frame=>Object.keys(frame).every(key=>key==='opacity')));
}
for(const reduced of [false,true])for(const saved of [null,'off','on'])for(const query of ['','?motion=off','?motion=on'])scenario(reduced,saved,query);
console.log('PASS: normal URLs always enable motion, including old saved off values and system reduced-motion settings; text keyframes do not move layout.');
