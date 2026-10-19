// Opt-in native/UI layer: isolated storage and muted browser; no external records.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--mute-audio']});
const context=await browser.newContext({viewport:{width:1200,height:1000},reducedMotion:'reduce'});
const page=await context.newPage(),checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
const output=process.env.CODORI_TEST_OUTPUT||'validation-course';await fs.mkdir(output,{recursive:true});
const check=(value,name)=>{assert.ok(value,name);checks.push(name);console.log('PASS',name);};
const click=selector=>page.locator(selector).click();
const ready=fn=>page.waitForFunction(fn,null,{timeout:30000});
try{
 await page.goto(process.env.CODORI_TEST_URL||'http://127.0.0.1:8769/app/');await ready(()=>typeof popsCourse!=='undefined'&&popsCourse);
 const original=await page.evaluate(()=>JSON.stringify({practiceProgress,storage:{...localStorage}}));
 check((await page.locator('.journey-nav [data-area]').allTextContents()).join('/')==='学ぶ/練習する/実践する','existing three intent tabs retained');
 check(await page.locator('[data-course-chapter]').count()===9,'one nine-chapter map');
 check(await page.locator('#home-view [data-route="learn"],#home-view [data-route="practice"],#home-view [data-route="test"]').count()===0,'course map is the only chapter entry');
 check((await page.locator('[data-course-chapter="1"]').textContent()).includes('機能和声の基礎'),'functional harmony is named as chapter1 of the course');
 check(await page.locator('[data-course-chapter]:enabled').count()===Number(process.env.CODORI_EXPECT_CHAPTERS||9),'only completed chapters enabled');
 await click('[data-course-chapter="2"]');check(await page.locator('#course-title').textContent()==='調の仲間と代理コード','chapter 2 opens from map');
 check(await page.locator('[data-course-example]').count()===6,'chapter 2 has six original comparisons');
 check(await page.evaluate(()=>document.querySelector('#course-view .codori-guide img').naturalWidth>0),'existing bird image loaded');
 await page.screenshot({path:`${output}/chapter2-learn.png`,fullPage:true});
 await click('[data-course-example="2-0"]');await click('[data-course-example="2-1"]');
 await page.waitForTimeout(100);check(await page.evaluate(()=>activeSyntheticPlaybacks.size<=2),'example replacement stops earlier chord and melody');
 await click('[data-area="practice"]');check(await page.evaluate(()=>currentAppRoute==='course'&&popsCourse.current().chapterId===2&&homeArea==='practice'&&activeSyntheticPlaybacks.size===0),'intent switch retains chapter and cancels audio');
 check(await page.locator('[data-course-answer]').first().isDisabled(),'course answers locked before full listening');
 await click('[data-course-play="question"]');await click('[data-course-stop]');check(await page.locator('[data-course-answer]').first().isDisabled(),'early stop leaves answers locked');
 await page.evaluate(()=>{for(let i=0;i<10;i++)document.querySelector('[data-course-play="question"]').click();});
 await ready(()=>popsCourse.sessions.get(2).snapshot().heard);
 await click('[data-course-target]');check((await page.locator('[data-course-cue]').textContent()).includes('コード名は回答後'),'target replay follows tonal context and masks the answer');await click('[data-course-stop]');
 const answer=await page.evaluate(()=>popsCourse.sessions.get(2).snapshot().question.answer);
 await page.getByRole('button',{name:answer,exact:true}).click();
 await page.evaluate(()=>{for(let i=0;i<10;i++)document.querySelector('.course-result').click();});
 check(await page.evaluate(()=>popsCourse.sessions.get(2).snapshot().records.length===1),'factual answer scores once');
 check(await page.locator('[data-course-result]').textContent().then(t=>t.startsWith('正解。')),'factual answer explains heard harmony');
 check(await page.locator('#course-view [data-codori-guide]').getAttribute('data-guide-state')==='correct','bird reacts after a correct factual answer');
 await click('[data-course-play="question"]');await click('[data-course-stop]');check(await page.evaluate(()=>popsCourse.sessions.get(2).snapshot().records.length===1),'replay retains one answer');
 await click('[data-course-target]');await click('[data-course-next]');check(await page.evaluate(()=>!popsCourse.sessions.get(2).snapshot().heard&&activeSyntheticPlaybacks.size===0),'next question locks answers again');
 await click('[data-area="test"]');check(await page.locator('.course-open-answer').isVisible(),'creative work explicitly allows multiple choices without grading');
 await page.locator('[data-course-choice="0"]').selectOption('1');await page.locator('[data-course-choice="1"]').selectOption('1');
 check((await page.locator('[data-course-lab-path]').textContent()).includes('Dm')&&(await page.locator('[data-course-lab-path]').textContent()).endsWith('Am'),'creative choices alter two actual harmony slots');
 await page.locator('[data-course-note]').fill('AとEを残して、違うベースと着地を比べた。');
 await click('[data-course-play="lab"]');await click('[data-course-stop]');
 await click('[data-area="learn"]');await page.goBack();await ready(()=>popsCourse.current().intent==='test');
 check((await page.locator('[data-course-note]').inputValue()).includes('AとE'),'history restores chapter, intent and creative note');
 await page.setViewportSize({width:390,height:844});
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'390px creative layout has no horizontal overflow');
 check(await page.evaluate(()=>{const img=document.querySelector('#course-view .codori-guide img');return img.alt===''&&img.getBoundingClientRect().width<=88;}),'bird remains decorative and compact on mobile');
 await page.screenshot({path:`${output}/chapter2-create-mobile.png`,fullPage:true});
 await click('[data-area="learn"]');check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'390px lesson layout has no horizontal overflow');
 await page.screenshot({path:`${output}/chapter2-learn-mobile.png`,fullPage:true});
 await click('[data-area="practice"]');await click('[data-course-restart]');check(await page.evaluate(()=>popsCourse.sessions.get(2).snapshot().index===0&&popsCourse.sessions.get(2).snapshot().records.length===0),'explicit restart creates a fresh attempt');
 await click('[data-course-play="question"]');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 check(await page.evaluate(()=>activeSyntheticPlaybacks.size===0&&popsCourse.sessions.get(2).snapshot().phase!=='playing'),'hidden page cancels course voices and reservations');
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 await click('#home-button');await page.setViewportSize({width:1200,height:1000});
 await page.screenshot({path:`${output}/nine-chapter-map.png`,fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await click('[data-area="learn"]');await click('[data-course-chapter="1"]');
 check(await page.locator('#lesson-view [data-codori-guide]').isVisible(),'chapter1 learning reuses original lesson with bird');
 check((await page.locator('#lesson-title').textContent()).includes('機能和声の基礎'),'chapter1 header uses canonical course title');
 await click('[data-example="roles"]');
 await click('[data-area="practice"]');
 check(await page.locator('#harmony-view [data-codori-guide]').isVisible(),'chapter1 practice reuses original exercise with bird');
 check(await page.evaluate(()=>currentAppRoute==='practice'&&activeSyntheticPlaybacks.size===0&&currentCourseChapter()===1),'chapter1 intent switch stays in chapter and stops sound');
 check(await page.locator('#harmony-view .harmony-guide').count()===0,'definitions live in chapter1 learning rather than duplicated hints');
 await click('[data-area="test"]');
 check(await page.locator('#test-view [data-codori-guide]').isVisible(),'chapter1 practical route retains test and neutral bird');
 await click('#test-view [data-route="home"]');
 check(await page.evaluate(()=>currentAppRoute==='home'&&homeArea==='test'),'chapter1 chapter-picker returns to map with intent retained');
 await page.goBack();await ready(()=>currentAppRoute==='test');
 check((await page.locator('#test-view [data-foundation-context]').textContent()).includes('第1章'),'back restores the chapter1 context');
 await page.goForward();await ready(()=>currentAppRoute==='home');
 const chapterIds=await page.evaluate(()=>CodoriPopsData.chapters.filter(c=>!c.legacy&&CodoriPops.available(c)).map(c=>c.id));
 for(const id of chapterIds){
  await click('[data-area="learn"]');await click(`[data-course-chapter="${id}"]`);
  check(await page.locator('[data-course-example]').count()===6,`chapter ${id} comparisons reachable`);
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('#course-view .codori-guide img').naturalWidth>0),`chapter ${id} mobile lesson and bird`);
  await click('[data-course-example="0-1"]');await click('[data-area="practice"]');
  await click('[data-course-play="question"]');await ready(()=>popsCourse.sessions.get(popsCourse.current().chapterId).snapshot().heard);
  const actual=await page.evaluate(()=>popsCourse.sessions.get(popsCourse.current().chapterId).snapshot().question.answer);
  await page.getByRole('button',{name:actual,exact:true}).click();check((await page.locator('[data-course-result]').textContent()).startsWith('正解。'),`chapter ${id} actual audio question and grading`);
  if(id===2){
   for(let i=1;i<6;i++){await click('[data-course-next]');await click('[data-course-play="question"]');await ready(()=>popsCourse.sessions.get(2).snapshot().heard);const answer=await page.evaluate(()=>popsCourse.sessions.get(2).snapshot().question.answer);await page.getByRole('button',{name:answer,exact:true}).click();}
   await click('[data-course-next]');check(await page.locator('[data-course-finished]').isVisible(),'full six-question attempt reaches results');await click('[data-course-restart]');check(await page.evaluate(()=>popsCourse.sessions.get(2).snapshot().records.length===0),'finished attempt can restart with a new deck');
  }
  await click('[data-area="test"]');await page.locator('[data-course-choice="0"]').selectOption('1');await click('[data-course-play="lab"]');
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('#course-view .codori-guide img').naturalWidth>0),`chapter ${id} mobile creative task and bird`);
  if([7,9].includes(id))await page.screenshot({path:`${output}/chapter${id}-create-mobile.png`,fullPage:true});
  await click('#home-button');check(await page.evaluate(()=>currentAppRoute==='home'&&activeSyntheticPlaybacks.size===0),`chapter ${id} creative playback canceled by home`);
 }
 check(await page.evaluate(()=>JSON.stringify({practiceProgress,storage:{...localStorage}}))===original,'all chapter activities preserve original saved records');
 for(const intent of ['learn','practice','test']){
  const target=new URL(process.env.CODORI_TEST_URL||'http://127.0.0.1:8769/app/');target.search=new URLSearchParams({mode:'course',chapter:'1',intent}).toString();
  await page.goto(target.href);await ready(()=>typeof popsCourse!=='undefined'&&popsCourse);
  check(await page.evaluate(intent=>currentAppRoute===intent&&currentCourseChapter()===1,intent),`canonical chapter1 deep link: ${intent}`);
 }
 const wave=await page.evaluate(async()=>{
  const results=[];stopLearningAudio();
  for(const chapter of CodoriPopsData.chapters.filter(c=>!c.legacy&&CodoriPops.available(c)))for(const lesson of chapter.lessons)for(const variant of lesson.variants){
   const event=variant.events[lesson.ask.target<0?variant.events.length+lesson.ask.target:lesson.ask.target];
   const ctx=new OfflineAudioContext(1,48000*5,48000);audioContext=ctx;await playCourseEvent(event);const actual=(await ctx.startRendering()).getChannelData(0);
   const expectedCtx=new OfflineAudioContext(1,48000*5,48000),owner=CodoriAudio.forContext(expectedCtx),frequency=n=>440*2**((n-69)/12),gateSeconds=event.beats*CodoriAudio.policy.sequenceStepMs/1000;
   owner.play({frequencies:CodoriPopsData.chords[event.chord].map(frequency),gateSeconds});if(event.melody.length)owner.play({profile:'melody',frequencies:event.melody.map(frequency),gateSeconds,gain:0.45});
   const expected=(await expectedCtx.startRendering()).getChannelData(0);let max=0,peak=0;for(let i=0;i<actual.length;i++){max=Math.max(max,Math.abs(actual[i]-expected[i]));peak=Math.max(peak,Math.abs(actual[i]));}
   results.push({chapter:chapter.id,lesson:lesson.id,variant:variant.label,chord:event.chord,maxError:max,peak});
  }
  const ctx=new OfflineAudioContext(1,48000*5,48000);audioContext=ctx;await playCourseEvent({chord:'C',melody:[76],beats:1});const paused=ctx.suspend(.5),rendering=ctx.startRendering();await paused;const time=ctx.currentTime;stopLearningAudio();await ctx.resume();const samples=(await rendering).getChannelData(0);let residual=0;for(let i=Math.ceil((time+.021)*48000);i<samples.length;i++)residual=Math.max(residual,Math.abs(samples[i]));
  return {results,stopResidualAfter21ms:residual};
 });
 check(wave.results.every(r=>r.maxError<1e-7&&r.peak>.001),'actual audio adapter matches shared owner in every completed chapter');check(wave.stopResidualAfter21ms===0,'course chord and melody both stop to exact zero after21ms');
 await fs.writeFile(`${output}/audio-results.json`,JSON.stringify(wave,null,2));
 check(errors.length===0,`no page errors: ${errors.join(';')}`);
 await fs.writeFile(`${output}/ui-results.json`,JSON.stringify({status:'passed',checks,muted:true,isolatedStorage:true,browser:await browser.version(),url:page.url()},null,2));
}finally{await browser.close();}
