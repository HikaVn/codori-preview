/* One decorative companion for the course and existing functional-harmony screens. */
(() => {
  const messages={ready:'一緒に、前後の流れを聴いてみよう。',playing:'耳をすまして。最後まで聴いてから考えよう。',heard:'最後まで聴けたね。違いをたしかめよう。',correct:'たしかめられたね。理由も見てみよう。',review:'もう一度比べてみよう。理由が次の手がかりになるよ。',creative:'どの候補も試せるよ。気に入った理由を残してみよう。',finished:'おつかれさま。選んだ音と、その理由を振り返ろう。'};
  function mount(root) {
    root.querySelectorAll('[data-codori-guide]').forEach(box=>{
      box.classList.add('codori-guide');
      const img=document.createElement('img');img.src='../assets/approved/characters/major.png';img.alt='';img.width=88;img.height=88;
      const text=document.createElement('p');text.dataset.guideMessage='';box.replaceChildren(img,text);
    });
    update(root,'ready');
  }
  function update(root,state='ready') {
    root.querySelectorAll('[data-codori-guide]').forEach(box=>{
      box.dataset.guideState=state;
      const text=box.querySelector('[data-guide-message]');if(text)text.textContent=messages[state]||messages.ready;
    });
  }
  window.CodoriGuide=Object.freeze({mount,update});
})();
