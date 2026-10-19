// Hermetic: chapter identity and intent routing are independent of DOM/audio devices.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sandbox=vm.createContext({window:{}});
for(const file of ['app/pops-course-data.js','app/pops-course.js'])vm.runInContext(read(file),sandbox);
const C=sandbox.window.CodoriPops;
test('functional harmony is a single named chapter inside the pops course',()=>{
 assert.match(C.chapterFor(1).title,/機能和声の基礎/);assert.ok(C.chapterFor(1).legacy);assert.equal(sandbox.window.CodoriPopsData.chapters.length,9);
 const home=read('app/index.html').split('id="home-view"')[1].split('id="course-view"')[0];
 assert.doesNotMatch(home,/data-route="(?:learn|practice|test)"/);assert.equal((home.match(/id="pops-map"/g)||[]).length,1);assert.ok(home.indexOf('id="pops-map"')<home.indexOf('id="home-resources"'));
});
test('every chapter has the same intent-to-destination contract while retaining the original chapter1 owners',()=>{
 for(const intent of ['learn','practice','test'])for(let chapter=1;chapter<=9;chapter++){
  assert.equal(C.routeForChapter(chapter,intent),chapter===1?intent:'course');
  assert.match(C.contextLabel(chapter,intent),new RegExp('ポップス和声 · 第'+chapter+'章'));
 }
 assert.equal(C.routeForChapter(404,'learn'),'home');assert.equal(C.routeForChapter(1,'unknown'),'learn');
});
test('all three foundation screens return to the map and use chapter metadata instead of independent titles',()=>{
 const html=read('app/index.html');assert.equal((html.match(/data-foundation-context/g)||[]).length,3);assert.equal((html.match(/data-foundation-name/g)||[]).length,3);
 for(const [id,next] of [['lesson-view','test-view'],['test-view','harmony-view'],['harmony-view','learning-menu']]){
  const section=html.split(`id="${id}"`)[1].split(`id="${next}"`)[0];assert.match(section,/data-route="home">章を選ぶ/);
 }
 assert.doesNotMatch(html,/class="harmony-guide"/);
 assert.match(read('app/main.js'),/CodoriPops\.chapterFor\(1\)\.title/);assert.match(read('app/main.js'),/codoriChapter: currentCourseChapter\(\)/);
});
test('story and reference materials stay outside the course map with their existing intent and owner',()=>{
 const html=read('app/index.html');const resources=html.split('id="home-resources"')[1].split('id="course-view"')[0];
 assert.match(resources,/data-home-area="learn"[\s\S]*?data-route="catalog"/);assert.match(resources,/data-home-area="test"[\s\S]*?data-route="legacy"/);
 assert.doesNotMatch(resources.split('data-home-area="practice"')[1].split('data-home-area="test"')[0],/data-route="legacy"/);
});
