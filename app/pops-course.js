/* Course state, reusable factual exercises and creative choices. No audio synthesis or persistence. */
(() => {
  const data=window.CodoriPopsData;
  const pitchNames=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
  const pitchClass={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const chapterFor=id=>data.chapters.find(c=>c.id===Number(id));
  const available=chapter=>!!chapter && (chapter.legacy || chapter.lessons.length>0);
  const shuffle=(items,random)=>{ const list=[...items];for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list; };
  const path=events=>events.map(e=>e.chord).join(' → ');
  function expectedAnswer(ask,events) {
    const event=events[ask.target<0 ? events.length+ask.target : ask.target];
    if(!event || !data.chords[event.chord])throw new Error('Missing target chord');
    if(ask.type==='chord')return event.chord;
    if(ask.type==='bass')return pitchNames[data.chords[event.chord][0]%12];
    if(ask.type==='contains')return data.chords[event.chord].some(n=>n%12===pitchClass[ask.note]) ? '含まれる' : '含まれない';
    throw new Error('Unknown factual question type');
  }
  function questionPool(id) {
    const chapter=chapterFor(id);if(!chapter || chapter.legacy)return [];
    return chapter.lessons.flatMap((lesson,lessonIndex)=>lesson.variants.map((variant,index)=>({
      id:`${chapter.id}-${lesson.id}-${index}`,topic:lesson.id,lessonIndex,variant:index,key:chapter.key,
      events:variant.events,prompt:lesson.ask.prompt,target:lesson.ask.target,options:lesson.ask.options,
      answer:expectedAnswer(lesson.ask,variant.events),reason:lesson.reason
    })));
  }
  function buildDeck(id,random=Math.random) {
    const pool=questionPool(id), topics=shuffle([...new Set(pool.map(q=>q.topic))],random);
    const groups=topics.map(topic=>shuffle(pool.filter(q=>q.topic===topic),random));
    // Each round visits each lesson once; a full attempt visits both variants once.
    return [0,1].flatMap(round=>shuffle(groups.map(group=>group[round]),random));
  }
  function practiceSteps(question) {
    return question.events.map((event,i)=>({chord:event,cue:`${i+1}音目${i===(question.target<0 ? question.events.length+question.target : question.target)?' ★':''}`}));
  }
  function createSession({chapterId,playEvent,random=Math.random,schedule,cancel,onChange=()=>{}}) {
    let deck=[],index=0,selected=null,heard=false,phase='ready',cue='',records=[],options=[];
    const snapshot=()=>({question:deck[index],index,count:deck.length,selected,heard,phase,cue,records:[...records],options:[...options],finished:phase==='finished'});
    const emit=()=>onChange(snapshot());
    const player=window.CodoriHarmony.createPlayer({playChord:playEvent,schedule,cancel,
      onCue(value){cue=value;emit();},onEnd(){heard=true;phase=selected?'answered':'ready';cue='最後まで聴けました。★の位置と響きをたしかめよう。';emit();},
      onError(){phase='error';cue='再生できませんでした。もう一度、はじめから聴いてください。';emit();}});
    function stop(){player.stop();if(phase==='playing')phase=selected?'answered':'ready';cue='';emit();}
    function prepare(){selected=null;heard=false;phase='ready';cue='';options=shuffle(deck[index].options,random);emit();}
    function restart(){player.stop();deck=buildDeck(chapterId,random);index=0;records=[];if(!deck.length)throw new Error('Chapter has no factual exercises');prepare();}
    async function play(){if(!deck[index]||phase==='finished')return;player.stop();phase='playing';cue='';emit();return player.start(practiceSteps(deck[index]));}
    function answer(value){if(!heard||selected!==null||phase==='playing'||phase==='finished'||!options.includes(value))return;selected=value;records.push({id:deck[index].id,selected:value,correct:value===deck[index].answer});phase='answered';emit();}
    function next(){if(selected===null||phase==='playing'||phase==='finished')return;player.stop();if(index===deck.length-1){phase='finished';emit();}else{index++;prepare();}}
    return {snapshot,restart,play,stop,answer,next};
  }
  function labEvents(chapter,selections=[]) {
    const events=chapter.lab.events.map(event=>({...event,melody:[...event.melody]}));
    chapter.lab.choices.forEach((slot,i)=>{const option=slot.options[selections[i]||0];if(!option)throw new Error('Invalid creative choice');events[slot.index].chord=option.chord;});
    return events;
  }
  function routeForChapter(id,intent='learn') {
    const chapter=chapterFor(id);if(!available(chapter))return 'home';
    const area=['learn','practice','test'].includes(intent)?intent:'learn';
    return chapter.legacy?area:'course';
  }
  function contextLabel(id,intent) {
    const chapter=chapterFor(id);
    return `ポップス和声 · 第${chapter.id}章${chapter.advanced?'（発展）':''} · ${{learn:'学ぶ',practice:'練習する',test:'実践する'}[intent]||'学ぶ'}`;
  }
  function renderMap(root,area,navigate) {
    const verb={learn:'学ぶ',practice:'練習する',test:'実践する'}[area]||'学ぶ';
    root.innerHTML=`<div class="course-map-heading"><div><p class="eyebrow">基礎6章・発展3章</p><h3>章を選ぶ</h3><p>${{learn:"音例と解説で、しくみを知ろう。",practice:"聴き分けて、正解と理由をたしかめよう。",test:"学んだことを使い、最後に振り返ろう。"}[area]} 第1章は機能和声の基礎から。章を開いたら、上の3分類で同じ章の学び方を切り替えられます。</p></div><img src="../assets/approved/characters/major.png" alt="" width="88" height="88"></div><ol class="course-map-list">${data.chapters.map(chapter=>`<li><button type="button" data-course-chapter="${chapter.id}" ${available(chapter)?'':'disabled'}><small>${chapter.advanced?'発展':'基礎'} · 第${chapter.id}章</small><strong>${escape(chapter.title)}</strong><span>${escape(chapter.goal)}</span><small>${available(chapter)?`${verb} →`:'準備中（未実装）'}</small></button></li>`).join('')}</ol>`;
    root.querySelectorAll('[data-course-chapter]').forEach(button=>button.addEventListener('click',()=>{
      const chapter=chapterFor(button.dataset.courseChapter);
      navigate(routeForChapter(chapter.id,area),{chapterId:chapter.id,area,intent:area});
    }));
  }
  function mount({root,playEvent,beforePlay,navigate}) {
    let chapter,intent='learn',shownQuestion='',preview=false;
    const sessions=new Map(), selections=new Map(), notes=new Map();
    const q=selector=>root.querySelector(selector);
    const currentSelections=()=>selections.get(chapter.id)||[];
    const guide=state=>window.CodoriGuide.update(root,state);
    const player=window.CodoriHarmony.createPlayer({playChord:playEvent,
      onCue(value){q('[data-course-cue]').textContent=value;},
      onEnd(){preview=false;q('[data-course-stop]').disabled=true;q('[data-course-cue]').textContent='聴き終えました。前後の動きや、もう一方の版を比べてみよう。';guide('heard');},
      onError(){preview=false;q('[data-course-stop]').disabled=true;q('[data-course-cue]').textContent='再生できませんでした。もう一度ボタンを押してください。';guide('review');}
    });
    function renderPractice(state) {
      if(!chapter||intent!=='practice')return;
      if(state.finished){
        q('[data-course-content]').innerHTML=`<h3 tabindex="-1" data-course-finished>この章の練習を振り返ろう</h3><p>${state.records.filter(r=>r.correct).length} / ${state.count}問。正解数は今回の聴き分けの記録です。</p><button type="button" class="primary-button" data-course-restart>もう一度、6問を練習する</button><p>気になった音例は、上の「学ぶ」から比べ直せます。</p>`;
        guide('finished');q('[data-course-finished]').focus();shownQuestion='';return;
      }
      if(!state.question)return;
      if(shownQuestion!==state.question.id){
        shownQuestion=state.question.id;
        q('[data-course-content]').innerHTML=`<p>${escape(state.question.key)} · <span data-course-count></span></p><h3 tabindex="-1" data-course-prompt>${escape(state.question.prompt)}</h3><p>コード名は回答後に表示します。まず進行を最後まで聴いてください。</p><button class="primary-button" type="button" data-course-play="question">進行をきく・聞き直す</button><button class="secondary-button" type="button" data-course-target disabled>★の和音だけ聞き直す</button><div class="harmony-options" data-course-options role="group" aria-label="この章の回答">${state.options.map((value,i)=>`<button type="button" class="quiz-option" data-course-answer="${i}">${escape(value)}</button>`).join('')}</div><p data-course-result class="course-result" aria-live="polite"></p><button class="secondary-button" type="button" data-course-next disabled>次の問題へ</button><button class="secondary-button" type="button" data-course-restart>最初からやり直す</button>`;
        q('[data-course-prompt]').focus();
      }
      q('[data-course-count]').textContent=`${state.index+1} / ${state.count}問`;
      q('[data-course-cue]').textContent=state.cue;
      q('[data-course-stop]').disabled=state.phase!=='playing';
      root.querySelectorAll('[data-course-answer]').forEach((button,i)=>{
        button.disabled=!state.heard||state.selected!==null||state.phase==='playing';
        button.classList.toggle('is-correct',state.selected!==null&&state.options[i]===state.question.answer);
        button.classList.toggle('is-wrong',state.selected===state.options[i]&&state.selected!==state.question.answer);
      });
      q('[data-course-target]').disabled=!state.heard||state.phase==='playing';
      q('[data-course-next]').disabled=state.selected===null||state.phase==='playing';
      q('[data-course-next]').textContent=state.index===state.count-1?'結果を振り返る':'次の問題へ';
      q('[data-course-result]').textContent=state.selected===null?'':`${state.selected===state.question.answer?'正解。':'比べ直してみよう。'}答えは「${state.question.answer}」。${state.question.reason} 進行：${path(state.question.events)}`;
      guide(state.phase==='playing'?'playing':state.selected!==null?(state.selected===state.question.answer?'correct':'review'):state.heard?'heard':'ready');
    }
    function updateLab(){
      const values=currentSelections();q('[data-course-lab-path]').textContent=path(labEvents(chapter,values));
      q('[data-course-lab-feedback]').replaceChildren(...chapter.lab.choices.map((slot,i)=>{const p=document.createElement('p');p.textContent=slot.options[values[i]||0].why;return p;}));
    }
    function open(id,area='learn') {
      id=Number(id);
      chapter=chapterFor(id);if(!available(chapter)||chapter.legacy)throw new Error('Chapter unavailable');
      intent=['learn','practice','test'].includes(area)?area:'learn';shownQuestion='';
      root.innerHTML=`<div class="course-breadcrumb"><button class="secondary-button" type="button" data-course-map>章を選ぶ</button><p>${contextLabel(chapter.id,intent)}</p></div><div class="course-heading"><div><h2 id="course-title" tabindex="-1">${escape(chapter.title)}</h2><p>${escape(chapter.goal)}</p></div><div data-codori-guide></div></div><p class="course-prerequisite">先に知っておくこと：${escape(chapter.prerequisite)}</p><div data-course-content></div><div class="lesson-audio-status"><p data-course-cue role="status">音例を選んで聴いてみよう。</p><button class="secondary-button" type="button" data-course-stop disabled>停止</button></div><p class="course-memory">この章の回答・伴奏の選択・メモはページ内だけに保持します。再読み込みで消え、ストーリーや曲の保存記録は変更しません。</p>`;
      window.CodoriGuide.mount(root);
      if(intent==='learn'){
        q('[data-course-content]').innerHTML=`<p>${escape(chapter.intro)}</p>${chapter.lessons.map((lesson,i)=>`<article class="lesson-block"><p class="eyebrow">${i+1} / ${chapter.lessons.length}</p><h3>${escape(lesson.title)}</h3>${lesson.body.map(text=>`<p>${escape(text)}</p>`).join('')}<div class="lesson-comparison">${lesson.variants.map((variant,v)=>`<button class="secondary-button" type="button" data-course-example="${i}-${v}"><strong>${v?'B':'A'} · ${escape(variant.label)}</strong><span>${escape(path(variant.events))}</span>${variant.events.some(e=>e.melody.length)?'<small>上の旋律も一緒に鳴ります</small>':''}</button>`).join('')}</div></article>`).join('')}<aside class="course-caution"><h3>使うときの手がかり</h3><p>${escape(chapter.caution)}</p></aside><p>次は上の「練習する」で聴き分け、「実践する」で伴奏を選べます。</p>`;
      }else if(intent==='practice'){
        if(!sessions.has(id)){
          const session=createSession({chapterId:id,playEvent,onChange:state=>{if(chapter?.id===id&&intent==='practice')renderPractice(state);}});
          sessions.set(id,session);session.restart();
        }else renderPractice(sessions.get(id).snapshot());
      }else{
        q('[data-course-content]').innerHTML=`<h3>伴奏を選んで、聴き比べよう</h3><p>${escape(chapter.lab.prompt)}</p><p class="course-open-answer">作る課題：候補に唯一の正解はありません。メロディとベースの違いを比べる課題です。点数はつけません。</p><div class="course-lab-choices">${chapter.lab.choices.map((slot,i)=>`<label>${escape(slot.prompt)}<select data-course-choice="${i}">${slot.options.map((option,j)=>`<option value="${j}" ${(currentSelections()[i]||0)===j?'selected':''}>${escape(option.chord)}</option>`).join('')}</select></label>`).join('')}</div><p class="harmony-path" data-course-lab-path></p><button class="primary-button" type="button" data-course-play="lab">選んだ伴奏とメロディをきく</button><div data-course-lab-feedback></div><label class="course-note">どんな違いが聴こえた？<textarea data-course-note rows="3" maxlength="1000" placeholder="ベース、終わり方、旋律との響きなど"></textarea></label>`;
        q('[data-course-note]').value=notes.get(id)||'';updateLab();guide('creative');
      }
      q('#course-title').focus();
    }
    async function previewEvents(events,masked=false){
      beforePlay();preview=true;q('[data-course-stop]').disabled=false;guide('playing');
      return player.start(events.map((event,i)=>({chord:event,cue:masked?'★の和音（コード名は回答後）':`${i+1}音目 · ${event.chord}${event.melody.length?' · 旋律あり':''}`})));
    }
    root.addEventListener('click',event=>{
      const button=event.target.closest('button');if(!button||!root.contains(button))return;
      if(button.hasAttribute('data-course-map'))navigate('home',{area:intent});
      else if(button.hasAttribute('data-course-example')){const [i,v]=button.dataset.courseExample.split('-').map(Number);previewEvents(chapter.lessons[i].variants[v].events);}
      else if(button.dataset.coursePlay==='question'){beforePlay();sessions.get(chapter.id).play();}
      else if(button.hasAttribute('data-course-target')){const state=sessions.get(chapter.id).snapshot();if(!state.heard)return;const index=state.question.target<0?state.question.events.length+state.question.target:state.question.target;previewEvents([state.question.events[index]],true);}
      else if(button.dataset.coursePlay==='lab')previewEvents(labEvents(chapter,currentSelections()));
      else if(button.hasAttribute('data-course-stop')){beforePlay();q('[data-course-cue]').textContent='停止しました。はじめから聴き直せます。';}
      else if(button.hasAttribute('data-course-answer')){beforePlay();const session=sessions.get(chapter.id);session.answer(session.snapshot().options[Number(button.dataset.courseAnswer)]);}
      else if(button.hasAttribute('data-course-next')){beforePlay();sessions.get(chapter.id).next();}
      else if(button.hasAttribute('data-course-restart')){beforePlay();shownQuestion='';sessions.get(chapter.id).restart();}
    });
    root.addEventListener('change',event=>{if(!event.target.hasAttribute('data-course-choice'))return;beforePlay();const values=[...currentSelections()];values[Number(event.target.dataset.courseChoice)]=Number(event.target.value);selections.set(chapter.id,values);updateLab();guide('creative');});
    root.addEventListener('input',event=>{if(event.target.hasAttribute('data-course-note'))notes.set(chapter.id,event.target.value);});
    function stop(){player.stop();preview=false;sessions.forEach(session=>session.stop());const button=q('[data-course-stop]');if(button)button.disabled=true;}
    return {open,stop,current:()=>({chapterId:chapter?.id,intent}),sessions,previewEvents};
  }
  window.CodoriPops=Object.freeze({chapterFor,available,routeForChapter,contextLabel,expectedAnswer,questionPool,buildDeck,practiceSteps,createSession,labEvents,renderMap,mount});
})();
