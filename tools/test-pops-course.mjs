import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context=vm.createContext({window:{},setTimeout,clearTimeout});
for(const file of ['audio-engine.js','harmony.js','pops-course-data.js','pops-course.js'])vm.runInContext(fs.readFileSync(new URL('../app/'+file,import.meta.url),'utf8'),context);
const D=context.window.CodoriPopsData,C=context.window.CodoriPops;
const plain=x=>JSON.parse(JSON.stringify(x));
function seed(n){return()=>((n=Math.imul(n,1664525)+1013904223>>>0)/2**32);}
function clock(){let queue=[],serial=0;return {schedule(fn,ms){queue.push({id:++serial,fn,ms});return serial;},cancel(id){queue=queue.filter(item=>item.id!==id);},async flush(){let guard=100;while(queue.length&&guard--){const next=queue.shift();next.fn();await new Promise(resolve=>setImmediate(resolve));}assert.ok(guard>0);},get count(){return queue.length;}};}
const ready=D.chapters.filter(ch=>!ch.legacy&&C.available(ch));
test('complete chapters have substantive comparisons, factual tasks and editable creative exercises',()=>{
 for(const chapter of ready){assert.ok(chapter.intro.length>40);assert.ok(chapter.caution.length>40);assert.equal(chapter.lessons.length,3);assert.equal(chapter.lab.choices.length,2);
  assert.ok(chapter.lab.events.length>=8);
  for(const lesson of chapter.lessons){assert.ok(lesson.body.length>=2&&lesson.body.every(p=>p.length>35));assert.ok(lesson.reason.length>35);assert.equal(lesson.variants.length,2);
   for(const clip of lesson.variants){assert.ok(clip.events.length>=4);for(const e of clip.events){assert.ok(D.chords[e.chord],e.chord);assert.ok(e.beats>0);assert.ok(e.melody.every(n=>Number.isInteger(n)&&n>=48&&n<=96));}}
  }
  for(const a of [0,1])for(const b of [0,1]){const events=C.labEvents(chapter,[a,b]);assert.ok(events.every(e=>D.chords[e.chord]));assert.equal(events[chapter.lab.choices[0].index].chord,chapter.lab.choices[0].options[a].chord);}
 }
});
test('every factual answer is derived from the actual targeted notes, never a subjective T/S/D family',()=>{
 for(const chapter of ready)for(const question of C.questionPool(chapter.id)){
  const lesson=chapter.lessons[question.lessonIndex];assert.equal(question.answer,C.expectedAnswer(lesson.ask,question.events));assert.ok(question.options.includes(question.answer));assert.equal(new Set(question.options).size,question.options.length);
  assert.ok(['chord','bass','contains'].includes(lesson.ask.type));
 }
});
test('IV/ii and I/vi examples preserve their common tones and fixed melody',()=>{
 const pcs=name=>new Set(D.chords[name].map(n=>n%12));
 assert.deepEqual([...pcs('F')].filter(n=>pcs('Dm').has(n)).sort(),[5,9]);
 assert.deepEqual([...pcs('C')].filter(n=>pcs('Am').has(n)).sort(),[0,4]);
 const lesson=D.chapters[1].lessons[2];assert.deepEqual(plain(lesson.variants[0].events.map(e=>e.melody)),plain(lesson.variants[1].events.map(e=>e.melody)));
 assert.ok(lesson.variants.every(v=>v.events[1].melody[0]%12===9));
 assert.match(D.chapters[1].caution,/iii.*文脈/);assert.match(D.chapters[1].caution,/vii/);
});
test('32 seeds produce balanced, unique 3/6-question prefixes and repeatable fresh restarts in every ready chapter',()=>{
 for(const chapter of ready)for(let n=1;n<=32;n++){
  const random=seed(n);for(let attempt=0;attempt<2;attempt++){
   const deck=C.buildDeck(chapter.id,random);assert.equal(deck.length,6);assert.equal(new Set(deck.map(q=>q.id)).size,6);
   assert.equal(new Set(deck.slice(0,3).map(q=>q.topic)).size,3);
   for(const lesson of chapter.lessons)assert.equal(deck.filter(q=>q.topic===lesson.id).length,2);
  }
 }
});
test('listening gate, replay, single scoring, completion and restart are consistent',async()=>{
 for(const chapter of ready){const time=clock();let stops=0;const session=C.createSession({chapterId:chapter.id,random:seed(17),schedule:time.schedule,cancel:time.cancel,playEvent:async()=>()=>stops++});session.restart();
  const first=session.snapshot().question;session.answer(first.answer);assert.equal(session.snapshot().records.length,0);
  await session.play();session.stop();await time.flush();assert.equal(session.snapshot().heard,false);
  for(let i=0;i<6;i++){
   await session.play();await time.flush();const q=session.snapshot().question;assert.equal(session.snapshot().heard,true);session.answer(q.answer);session.answer(q.answer);assert.equal(session.snapshot().records.length,i+1);
   await session.play();await time.flush();assert.equal(session.snapshot().records.length,i+1);session.next();
  }
  assert.equal(session.snapshot().finished,true);assert.ok(session.snapshot().records.every(r=>r.correct));session.next();assert.equal(session.snapshot().records.length,6);
  session.restart();assert.equal(session.snapshot().index,0);assert.equal(session.snapshot().heard,false);assert.equal(session.snapshot().records.length,0);assert.ok(stops>0);
 }
});
test('late audio completion cannot revive a canceled exercise; audio error permits a full retry',async()=>{
 const time=clock();let resolve,stopped=0;const session=C.createSession({chapterId:2,schedule:time.schedule,cancel:time.cancel,playEvent:()=>new Promise(r=>resolve=r)});session.restart();const pending=session.play();session.stop();resolve(()=>stopped++);await pending;await time.flush();assert.equal(stopped,1);assert.equal(session.snapshot().heard,false);assert.equal(time.count,0);
 let fail=true;const retry=C.createSession({chapterId:2,schedule:time.schedule,cancel:time.cancel,playEvent:async()=>{if(fail)throw Error('unavailable');return()=>{};}});retry.restart();await retry.play();assert.equal(retry.snapshot().phase,'error');assert.equal(retry.snapshot().heard,false);fail=false;await retry.play();await time.flush();assert.equal(retry.snapshot().heard,true);
});
test('course and guide cannot construct audio, persist records, import external melodies or introduce timed envelopes',()=>{
 const code=fs.readFileSync(new URL('../app/pops-course.js',import.meta.url),'utf8');assert.doesNotMatch(code,/createOscillator|createGain|localStorage|fetch\(|AudioContext|releaseSeconds|attackSeconds/);
 const guide=fs.readFileSync(new URL('../app/codori-guide.js',import.meta.url),'utf8');assert.match(guide,/approved\/characters\/major.png/);assert.match(guide,/img.alt=''/);assert.doesNotMatch(guide,/animation|setInterval|setTimeout/);
});

test('all nine chapters are available through either the retained owner or complete new material',()=>{
 assert.equal(D.chapters.length,9);assert.equal(D.chapters.filter(C.available).length,9);assert.equal(ready.length,8);assert.ok(D.chapters[0].legacy);
 assert.equal(ready.reduce((n,c)=>n+c.lessons.length,0),24);assert.equal(ready.reduce((n,c)=>n+C.questionPool(c.id).length,0),48);
});
test('independently specified chord pitch classes, inversions and major/minor seventh distinctions are audible data invariants',()=>{
 const expected={C:[0,4,7],Dm:[2,5,9],Em:[4,7,11],F:[0,5,9],G:[2,7,11],Am:[0,4,9],Bdim:[2,5,11],
 'C/E':[0,4,7],'C/G':[0,4,7],'G/B':[2,7,11],'F/A':[0,5,9],Cmaj7:[0,4,7,11],C7:[0,4,7,10],Dm7:[0,2,5,9],Em7:[2,4,7,11],Fmaj7:[0,4,5,9],G7:[2,5,7,11],Am7:[0,4,7,9],
 'Bø7':[2,5,9,11],Bdim7:[2,5,8,11],A7:[1,4,7,9],D7:[0,2,6,9],E7:[2,4,8,11],Cm:[0,3,7],Fm:[0,5,8],Bb:[2,5,10],Bb7:[2,5,8,10],Eb:[3,7,10],Ab:[0,3,8],D:[2,6,9],Bm:[2,6,11],
 Cadd9:[0,2,4,7],Cmaj9:[0,2,4,7,11],'Cmaj9/E':[0,2,4,7,11],C9:[0,2,4,7,10],C6:[0,4,7,9],'C6/9':[0,2,4,7,9],Csus4:[0,5,7],G7sus4:[0,2,5,7],G13:[4,5,7,9,11],Dm9:[0,2,4,5,9]};
 assert.deepEqual(Object.keys(D.chords).sort(),Object.keys(expected).sort());
 for(const [name,pcs] of Object.entries(expected)){assert.deepEqual([...new Set(D.chords[name].map(n=>n%12))].sort((a,b)=>a-b),pcs,name);assert.equal(D.chords[name][0],Math.min(...D.chords[name]),name+' lowest bass');}
 assert.equal(D.chords['C/E'][0]%12,4);assert.equal(D.chords['G/B'][0]%12,11);
});
test('all four creative choices per chapter retain the authored melody as chord tones without forcing one right answer',()=>{
 for(const chapter of ready)for(const a of [0,1])for(const b of [0,1])for(const event of C.labEvents(chapter,[a,b])){
  const pcs=new Set(D.chords[event.chord].map(n=>n%12));assert.ok(event.melody.every(n=>pcs.has(n%12)),chapter.id+' '+event.chord);
 }
});
test('incorrect answer, repeated click and replay retain one honest record',async()=>{
 const time=clock(),s=C.createSession({chapterId:2,schedule:time.schedule,cancel:time.cancel,playEvent:async()=>()=>{}});s.restart();await s.play();await time.flush();const wrong=s.snapshot().options.find(v=>v!==s.snapshot().question.answer);s.answer(wrong);s.answer(s.snapshot().question.answer);assert.equal(s.snapshot().records.length,1);assert.equal(s.snapshot().records[0].correct,false);await s.play();await time.flush();assert.equal(s.snapshot().selected,wrong);assert.equal(s.snapshot().records.length,1);
});
