'use strict';
// =====================================================================
//  墨痕 · Inkbound  —  a pen-and-ink platformer (XHS mini-tool build)
// =====================================================================
var W=960,H=540,TS=32;
var cv=document.getElementById('c');cv.width=W;cv.height=H;
var ctx=cv.getContext('2d');
var g=ctx;                       // current drawing context (swapped for offscreen rendering)

function fit(){
  var wrap=document.getElementById('stage-wrap');
  var aw=(wrap&&wrap.clientWidth)||window.innerWidth;
  var ah=(wrap&&wrap.clientHeight)||window.innerHeight;
  var s=Math.min(aw/W,ah/H);if(!(s>0))s=1;
  cv.style.width=Math.max(1,(W*s)|0)+'px';
  cv.style.height=Math.max(1,(H*s)|0)+'px';
}
window.addEventListener('resize',fit);

var INK='#1f3c8f',PAPER='#fdfdfb',RED='#1f3c8f',SEAL='#c0392b',GREY='#5a6ea8';
var FONT='"KaiTi","STKaiti","Segoe Print","Comic Sans MS",cursive';

// ---------------------------------------------------------------- noise & rng
var boil=0;   // increments ~10x/sec → hand-drawn "boiling" lines
function hashf(x,y,s){var h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(s|0,1442695041))|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return ((h&0xffff)/0xffff)*2-1;}
function rng(seed){var s=seed>>>0;return function(){s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
var clamp=function(v,a,b){return v<a?a:v>b?b:v;},lerp=function(a,b,t){return a+(b-a)*t;};

// ---------------------------------------------------------------- ink drawing primitives
function wobblyPath(pts,closed,seed,amt){
  var x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(var qi=0;qi<pts.length;qi++){var q=pts[qi];if(q[0]<x0)x0=q[0];if(q[0]>x1)x1=q[0];if(q[1]<y0)y0=q[1];if(q[1]>y1)y1=q[1];}_pb={x:x0-2,y:y0-2,w:x1-x0+4,h:y1-y0+4};
  g.beginPath();var n=pts.length,m=closed?n:n-1;var first=true;
  for(var k=0;k<m;k++){var a=pts[k],b=pts[(k+1)%n];var dx=b[0]-a[0],dy=b[1]-a[1];var len=Math.hypot(dx,dy)||1;var segs=Math.max(1,Math.ceil(len/9));var nx=-dy/len,ny=dx/len;
    for(var i=0;i<segs;i++){var t=i/segs;var d=i===0?0:hashf(i+k*131,seed,boil)*amt*0.6;var px=a[0]+dx*t+nx*d,py=a[1]+dy*t+ny*d;if(first){g.moveTo(px,py);first=false;}else g.lineTo(px,py);}}
  if(closed)g.closePath();else{var e=pts[n-1];g.lineTo(e[0],e[1]);}
}
function stroke(w,c){if(w==null)w=2;if(c==null)c=INK;g.lineWidth=Math.min(w,2.2)*0.85;g.strokeStyle=c;g.lineCap='round';g.lineJoin='round';g.stroke();}
function fillPath(c){
  if(c!==INK){g.fillStyle=c;g.fill();return;}
  // ballpoint "fill": a light wash plus dense cross-hatch clipped to the shape
  g.save();g.clip();g.fillStyle='rgba(31,60,143,0.28)';g.fillRect(-4000,-4000,8000,8000);
  var b=pathBounds();g.strokeStyle=INK;g.lineWidth=1;g.lineCap='round';var hp=new Path2D();
  for(var d=-b.h;d<b.w;d+=3){hp.moveTo(b.x+d,b.y+b.h);hp.lineTo(b.x+d+b.h,b.y);}
  for(var d2=0;d2<b.w+b.h;d2+=4){hp.moveTo(b.x+d2,b.y);hp.lineTo(b.x+d2-b.h,b.y+b.h);}
  g.stroke(hp);g.restore();}
var _pb={x:0,y:0,w:0,h:0};function pathBounds(){return _pb;}
function inkLine(x1,y1,x2,y2,o){o=o||{};wobblyPath([[x1,y1],[x2,y2]],false,o.seed||0,o.wob!=null?o.wob:1.1);stroke(o.w||2,o.color||INK);}
function inkCircle(cx,cy,r,seed,amt){if(seed==null)seed=0;if(amt==null)amt=0.8;var n=Math.max(8,Math.ceil(r*1.2));var pts=[];for(var i=0;i<n;i++){var a=i/n*Math.PI*2;var rr=r*(1+hashf(i,seed,boil)*0.05);pts.push([cx+Math.cos(a)*rr,cy+Math.sin(a)*rr]);}wobblyPath(pts,true,seed,amt);}
function inkEllipse(cx,cy,rx,ry,seed,amt){if(seed==null)seed=0;if(amt==null)amt=0.6;var n=14;var pts=[];for(var i=0;i<n;i++){var a=i/n*Math.PI*2;pts.push([cx+Math.cos(a)*rx,cy+Math.sin(a)*ry]);}wobblyPath(pts,true,seed,amt);}
function dot(x,y,r,c){if(c==null)c=INK;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fillStyle=c;g.fill();}
function hatchRect(x,y,w,h,sp,seed,alpha,lw){if(alpha==null)alpha=0.5;if(lw==null)lw=1;g.save();g.globalAlpha*=alpha;for(var d=-h;d<w;d+=sp){wobblyPath([[x+d,y+h],[x+d+h,y]],false,seed+d,0.5);stroke(lw);}g.restore();}
function txt(s,x,y,size,align,color,weight){if(align==null)align='center';if(color==null)color=INK;if(weight==null)weight='';g.font=weight+' '+size+'px '+FONT;g.textAlign=align;g.textBaseline='middle';g.fillStyle=color;g.fillText(s,x,y);}
function inkText(s,x,y,size,align){if(align==null)align='center'; // sketchy double-pass text
  g.save();g.globalAlpha=0.35;txt(s,x+1.5,y+1,size,align,INK);g.globalAlpha=1;txt(s,x,y,size,align,INK);g.restore();}
function heartPts(cx,cy,s){var p=[];for(var i=0;i<16;i++){var t=i/16*Math.PI*2;var x=16*Math.pow(Math.sin(t),3);var y=-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t));p.push([cx+x*s,cy+y*s]);}return p;}

// paper texture
var paperTex=(function(){var c=document.createElement('canvas');c.width=W;c.height=H;var q=c.getContext('2d');var r=rng(99);
  for(var i=0;i<1200;i++){q.fillStyle='rgba(0,0,0,'+(0.012+r()*0.025)+')';q.fillRect(r()*W,r()*H,1,1);}
  q.strokeStyle='rgba(90,130,200,0.16)';q.lineWidth=1;for(var y=30;y<H;y+=27){q.beginPath();q.moveTo(0,y+0.5);q.lineTo(W,y+0.5);q.stroke();}
  return c;})();

// ---------------------------------------------------------------- audio (synth)
var actx=null,muted=false;
function audio(){if(!actx){try{actx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){}}if(actx&&actx.state==='suspended')actx.resume();return actx;}
function tone(f0,f1,dur,type,vol,delay){if(type==null)type='square';if(vol==null)vol=0.08;if(delay==null)delay=0;var a=audio();if(!a||muted)return;var t=a.currentTime+delay;var o=a.createOscillator(),gn=a.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(1,f1),t+dur);gn.gain.setValueAtTime(vol,t);gn.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(gn).connect(a.destination);o.start(t);o.stop(t+dur+0.02);}
function noise(dur,vol,hp){if(vol==null)vol=0.1;if(hp==null)hp=400;var a=audio();if(!a||muted)return;var n=Math.floor(a.sampleRate*dur);var b=a.createBuffer(1,n,a.sampleRate);var d=b.getChannelData(0);for(var i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);var s=a.createBufferSource();s.buffer=b;var f=a.createBiquadFilter();f.type='highpass';f.frequency.value=hp;var gn=a.createGain();gn.gain.value=vol;s.connect(f).connect(gn).connect(a.destination);s.start();}
var SFX={
  jump:function(){tone(300,620,0.12,'square',0.05);},
  djump:function(){tone(420,840,0.12,'square',0.045);tone(640,1100,0.12,'square',0.035,0.05);},
  wjump:function(){tone(250,720,0.15,'triangle',0.07);},
  land:function(){noise(0.07,0.1,200);},
  dash:function(){noise(0.18,0.14,700);},
  collect:function(){tone(880,880,0.08,'sine',0.07);tone(1320,1320,0.14,'sine',0.06,0.07);},
  hurt:function(){tone(300,70,0.45,'sawtooth',0.09);noise(0.3,0.15,100);},
  stomp:function(){tone(220,60,0.15,'square',0.08);noise(0.1,0.1,300);},
  spring:function(){tone(200,950,0.25,'triangle',0.08);},
  check:function(){[523,659,784].forEach(function(f,i){tone(f,f,0.18,'sine',0.06,i*0.08);});},
  win:function(){[523,659,784,1047,1319].forEach(function(f,i){tone(f,f,0.35,'triangle',0.07,i*0.12);});},
  ui:function(){tone(600,600,0.05,'sine',0.05);},
  over:function(){[392,330,262,196].forEach(function(f,i){tone(f,f*0.98,0.4,'triangle',0.07,i*0.25);});}
};
var SCALE=[262,294,330,392,440,523,587,659,784];var musicT=0;
function music(dt){musicT-=dt;if(musicT>0)return;musicT=0.32;if(Math.random()<0.55){var f=SCALE[Math.floor(Math.random()*SCALE.length)];tone(f,f*0.995,0.5,'sine',0.02);if(Math.random()<0.25)tone(f/2,f/2,0.9,'triangle',0.012);}}

// ---------------------------------------------------------------- input
var keys={},just={};
var KEYMAP={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'jump',KeyW:'jump',Space:'jump',KeyZ:'jump',KeyK:'jump',ShiftLeft:'dash',ShiftRight:'dash',KeyX:'dash',KeyJ:'dash',KeyL:'dash',Enter:'start',KeyP:'pause',Escape:'pause',KeyR:'restart',KeyM:'mute',ArrowDown:'down',KeyS:'down'};
window.addEventListener('keydown',function(e){var k=KEYMAP[e.code];if(!k)return;e.preventDefault();if(!keys[k])just[k]=true;keys[k]=true;audio();});
window.addEventListener('keyup',function(e){var k=KEYMAP[e.code];if(k)keys[k]=false;});
window.addEventListener('blur',function(){for(var k in keys)keys[k]=false;});
var touchEl=document.getElementById('touch');
var isTouch=('ontouchstart' in window)||navigator.maxTouchPoints>0;
if(isTouch){touchEl.classList.add('on');document.body.classList.add('touch-portrait');
  var tbs=touchEl.querySelectorAll('.tb');
  for(var ti=0;ti<tbs.length;ti++){(function(b){var k=b.dataset.k;
    var on=function(e){e.preventDefault();if(!keys[k])just[k]=true;keys[k]=true;b.classList.add('active');audio();};
    var off=function(e){e.preventDefault();keys[k]=false;b.classList.remove('active');};
    b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('pointerleave',off);
  })(tbs[ti]);}
}
cv.addEventListener('pointerdown',function(){audio();if(state==='title'){just.start=true;}});
var down=function(k){return !!keys[k];},pressed=function(k){return !!just[k];};

// top-bar buttons (keyboard-free control for real devices)
var btnPause=document.getElementById('btn-pause');
var btnRestart=document.getElementById('btn-restart');
var btnMute=document.getElementById('btn-mute');
var btnRank=document.getElementById('btn-rank');
btnPause.addEventListener('click',function(){audio();just.pause=true;});
btnRestart.addEventListener('click',function(){audio();just.restart=true;});
btnMute.addEventListener('click',function(){audio();just.mute=true;});
if(btnRank)btnRank.addEventListener('click',function(){audio();lbOpen();});
function syncChrome(){
  var inLevel=(state==='play'||state==='pause');
  btnPause.hidden=!inLevel;btnRestart.hidden=!inLevel;
  btnPause.textContent=state==='pause'?'继续':'暂停';
  btnMute.textContent=muted?'已静音':'声音';
  if(btnRank)btnRank.hidden=!LB.supported;
}

// ---------------------------------------------------------------- leaderboard (内测能力, 9.51+)
var LB={BOARD:1,PERIOD:'all',MIN_VER:9510,supported:false,ready:false,submitted:false,lastMsg:'',cache:null,cacheAt:0};
var lbEl=document.getElementById('lb');
var lbList=document.getElementById('lb-list');
var lbStatus=document.getElementById('lb-status');
var lbMine=document.getElementById('lb-mine');
var lbClose=document.getElementById('lb-close');
var lbRefresh=document.getElementById('lb-refresh');
function miniTool(){return window.xhs&&window.xhs.miniTool;}
function readBuildVersion(launchOptions){var env=launchOptions&&launchOptions.miniToolEnv;return Number(env&&env.buildVersion)||0;}
function clientVersion(bv){return Math.floor((Number(bv)||0)/1000);}
function getBuildVersionAsync(){
  var xhs=window.xhs;var sync=readBuildVersion(xhs&&xhs.launchOptions);if(sync)return Promise.resolve(sync);
  var m=miniTool();if(!m||typeof m.getLaunchOptions!=='function')return Promise.resolve(0);
  try{return Promise.resolve(m.getLaunchOptions()).then(function(o){return readBuildVersion(o);}).catch(function(){return 0;});}
  catch(e){return Promise.resolve(0);}
}
function lbEnsure(){
  return getBuildVersionAsync().then(function(bv){
    var m=miniTool();
    LB.supported=clientVersion(bv)>=LB.MIN_VER&&!!m&&typeof m.submitScore==='function'&&typeof m.getRankList==='function'&&typeof m.getMyRank==='function';
    LB.ready=true;return LB.supported;
  }).catch(function(){LB.ready=true;return false;});
}
// 用时越短排名越前：以厘秒换算成「越大越好」的分数，范围落在 ±1,000,000 内
function timeToScore(sec){var s=Math.round(1000000-sec*100);if(!isFinite(s)||s<1)s=1;if(s>1000000)s=1000000;return s;}
function scoreToTime(score){var sec=(1000000-score)/100;return sec<0?0:sec;}
function lbSubmit(sec){
  if(LB.submitted)return;LB.submitted=true; // 每次完整通关只提交一次，避免限频与重复
  if(!LB.supported){LB.lastMsg='排行榜需新版客户端，暂未上传';return;}
  var m=miniTool();var score=timeToScore(sec);LB.lastMsg='成绩上传中…';
  try{Promise.resolve(m.submitScore({board:LB.BOARD,score:score})).then(function(){
    LB.lastMsg='本次成绩已上传九章速通榜';LB.cache=null;
  }).catch(function(err){var c=err&&err.errCode;
    if(c===1005){LB.supported=false;LB.lastMsg='未开启昵称授权，排行榜不可用';}
    else{LB.lastMsg='成绩上传失败，可稍后在排行榜查看';}
  });}catch(e){LB.lastMsg='成绩上传失败';}
}
function lbLoad(force){
  var now=Date.now();
  if(!force&&LB.cache&&(now-LB.cacheAt)<45000)return Promise.resolve(LB.cache);
  var m=miniTool();
  if(!LB.supported||!m)return Promise.reject({errCode:-1});
  return Promise.all([
    Promise.resolve(m.getRankList({board:LB.BOARD,period:LB.PERIOD})),
    Promise.resolve(m.getMyRank({board:LB.BOARD,period:LB.PERIOD}))
  ]).then(function(r){LB.cache={list:(r[0]&&r[0].data)||[],mine:r[1]||null};LB.cacheAt=Date.now();return LB.cache;});
}
function lbRenderBoard(data){
  var list=data.list||[];lbList.innerHTML='';
  if(!list.length){lbStatus.textContent='还没有人上榜，快来成为第一个！';}
  else{lbStatus.textContent='九章全通 · 用时越短排名越前';
    for(var i=0;i<list.length;i++){var row=list[i];
      var li=document.createElement('li');li.className='lb-row';
      var rk=document.createElement('span');rk.className='lb-rk';rk.textContent='#'+row.rank;
      var nm=document.createElement('span');nm.className='lb-nm';nm.textContent=row.nickname||'匿名墨客';
      var tm=document.createElement('span');tm.className='lb-tm';tm.textContent=fmt(scoreToTime(row.score));
      li.appendChild(rk);li.appendChild(nm);li.appendChild(tm);lbList.appendChild(li);
    }
  }
  var mine=data.mine;
  if(mine&&mine.status==='EXACT')lbMine.textContent='我的名次：第 '+mine.rank+' 名 · 用时 '+fmt(scoreToTime(mine.score));
  else if(mine&&mine.status==='OVER_LIMIT')lbMine.textContent='我的名次：500+ 名';
  else if(mine&&mine.status==='NO_SCORE')lbMine.textContent='本期还没有成绩，通关九章即可上榜';
  else lbMine.textContent='完成九章速通即可加入排行榜';
}
function lbFetchAndRender(force){
  lbLoad(force).then(lbRenderBoard).catch(function(err){
    var c=err&&err.errCode;lbList.innerHTML='';lbMine.textContent='';
    if(c===2002)lbStatus.textContent='榜单正在准备，请稍后点「刷新」重试';
    else if(c===1005){LB.supported=false;lbStatus.textContent='未开启昵称授权，排行榜不可用';}
    else lbStatus.textContent='排行榜加载失败，请点「刷新」重试';
  });
}
function lbOpen(){if(!lbEl)return;lbEl.hidden=false;lbStatus.textContent='加载中…';lbFetchAndRender(false);}
function lbCloseFn(){if(lbEl)lbEl.hidden=true;}
if(lbClose)lbClose.addEventListener('click',lbCloseFn);
if(lbRefresh)lbRefresh.addEventListener('click',function(){lbStatus.textContent='刷新中…';lbFetchAndRender(true);});
if(lbEl)lbEl.addEventListener('click',function(e){if(e.target===lbEl)lbCloseFn();});

// ---------------------------------------------------------------- level builder
function makeLevel(name,w,h,fn){
  var t=[];for(var y=0;y<h;y++)t.push(new Array(w).fill('.'));
  var L={name:name,w:w,h:h,t:t,
    put:function(x,y,c){if(x>=0&&x<w&&y>=0&&y<h)t[y][x]=c;},
    fill:function(x0,y0,x1,y1,c){for(var y=y0;y<=y1;y++)for(var x=x0;x<=x1;x++)L.put(x,y,c);},
    ground:function(x0,x1,top){L.fill(x0,top,x1,h-1,'#');},
    plat:function(x,y,n){L.fill(x,y,x+n-1,y,'=');},
    wall:function(x,y0,y1){L.fill(x,y0,x,y1,'#');},
    spikes:function(x0,x1,y){L.fill(x0,y,x1,y,'^');},
    drops:function(x0,x1,y){for(var x=x0;x<=x1;x++)L.put(x,y,'o');}
  };
  fn(L);
  for(var fx=0;fx<w;fx++)if(t[h-1][fx]==='.')t[h-1][fx]='x';
  return L;
}
var LEVELS=[
  makeLevel('初探纸境',112,17,function(L){
    L.ground(0,12,13);L.put(3,12,'P');L.drops(7,8,11);
    L.ground(16,30,13);L.put(24,12,'E');L.drops(19,20,11);L.plat(26,10,3);L.drops(26,28,9);
    L.plat(32,11,2);L.put(33,10,'o');
    L.ground(36,50,13);L.spikes(42,43,12);L.put(40,11,'o');L.put(46,12,'C');
    L.ground(51,60,11);L.put(56,10,'E');L.drops(53,54,9);
    L.ground(61,70,13);L.put(63,12,'S');L.plat(64,7,3);L.drops(64,66,6);
    L.plat(69,9,3);L.put(70,8,'o');
    L.ground(72,86,13);L.put(78,9,'M');L.drops(75,81,11);
    L.put(89,12,'m');
    L.ground(92,111,13);L.spikes(97,98,12);L.drops(100,102,11);L.put(103,12,'E');L.put(108,12,'F');
  }),
  makeLevel('峭壁与墙',130,17,function(L){
    L.ground(0,10,13);L.put(2,12,'P');L.drops(5,6,11);
    L.ground(11,14,11);L.ground(15,18,9);
    L.ground(19,30,9);L.put(24,8,'E');L.drops(21,22,7);
    L.ground(31,43,12);L.put(33,11,'C');L.spikes(36,36,11);
    L.wall(40,4,10);L.wall(43,4,11);L.put(41,8,'o');L.put(42,6,'o');L.put(41,4,'o');
    L.ground(44,52,4);L.drops(46,50,3);L.put(49,1,'M');
    L.plat(54,7,2);L.plat(57,10,2);L.put(54,6,'o');L.put(57,9,'o');
    L.ground(59,72,13);L.put(65,12,'E');L.spikes(68,69,12);L.drops(62,63,11);
    L.put(75,12,'m');
    L.ground(78,92,13);L.put(80,12,'C');L.put(82,12,'S');L.plat(84,7,2);L.drops(84,85,6);
    L.put(88,8,'n');L.plat(90,4,3);L.drops(90,92,3);
    L.ground(93,105,9);L.put(98,8,'E');L.spikes(101,102,8);L.put(104,7,'o');
    L.ground(106,115,13);L.put(110,9,'M');L.drops(108,113,11);
    L.ground(116,129,11);L.spikes(119,120,10);L.put(126,10,'F');L.drops(122,124,9);
  }),
  makeLevel('墨海登高',140,24,function(L){
    L.ground(0,14,20);L.put(2,19,'P');L.drops(5,6,18);
    L.plat(6,17,3);L.plat(11,14,3);L.plat(4,11,3);L.plat(9,8,3);L.put(7,16,'o');L.put(12,13,'o');L.put(5,10,'o');L.put(10,7,'o');L.put(8,12,'M');
    L.ground(13,24,8);L.put(18,7,'E');L.spikes(21,21,7);L.put(23,7,'C');L.drops(15,16,6);
    L.ground(28,40,12);L.put(33,11,'E');L.spikes(37,38,11);L.put(30,10,'o');L.put(35,9,'M');
    L.ground(41,50,12);L.wall(41,3,10);L.wall(44,3,11);L.put(42,9,'o');L.put(43,6,'o');L.put(42,3,'o');
    L.ground(45,56,3);L.put(50,2,'E');L.drops(47,54,2);
    L.put(59,8,'n');L.put(63,13,'n');L.put(61,10,'M');
    L.ground(66,80,18);L.put(67,17,'C');L.put(70,17,'S');L.plat(72,13,3);L.drops(72,74,12);L.plat(76,10,2);L.put(76,9,'o');L.spikes(78,79,17);
    L.ground(81,95,10);L.put(86,9,'E');L.put(90,6,'M');L.drops(84,92,8);L.spikes(93,94,9);
    L.put(98,9,'m');
    L.ground(101,118,14);L.put(103,13,'C');L.spikes(105,106,13);L.put(108,13,'E');L.spikes(110,111,13);L.put(114,13,'E');L.drops(104,116,11);
    L.plat(120,11,2);L.plat(123,8,2);L.plat(120,5,2);L.put(120,10,'o');L.put(123,7,'o');L.put(120,4,'o');L.put(122,2,'M');
    L.ground(126,139,6);L.put(130,5,'E');L.put(136,5,'F');L.drops(128,133,4);L.put(133,2,'M');
  }),
  makeLevel('浮桥墨渡',144,18,function(L){
    L.ground(0,10,14);L.put(3,13,'P');L.drops(6,8,12);
    L.put(13,13,'m');L.drops(12,14,10);
    L.ground(16,26,14);L.put(21,13,'E');L.plat(18,11,4);L.drops(18,21,10);
    L.put(29,13,'m');
    L.ground(32,35,14);L.spikes(33,34,13);L.plat(32,10,4);L.drops(33,34,9);
    L.put(38,12,'m');
    L.ground(41,52,13);L.put(43,12,'C');L.put(48,12,'E');L.drops(46,49,10);
    L.plat(51,10,3);L.plat(56,8,4);L.drops(57,58,7);L.plat(63,7,4);L.drops(64,65,6);L.put(65,9,'M');L.plat(70,8,4);L.drops(71,72,7);
    L.put(55,13,'m');L.ground(58,61,13);L.spikes(59,60,12);
    L.put(64,13,'m');L.ground(67,71,13);L.put(69,12,'E');
    L.put(74,12,'m');
    L.ground(77,88,13);L.put(79,12,'C');L.put(84,12,'E');L.drops(82,85,11);
    L.put(91,10,'n');
    L.plat(94,7,4);L.drops(95,96,6);L.put(100,8,'M');L.plat(102,7,4);L.drops(103,104,6);
    L.ground(108,119,11);L.put(113,10,'E');L.spikes(116,117,10);L.drops(111,114,9);
    L.put(122,11,'m');L.put(126,10,'M');L.put(128,11,'m');L.drops(127,129,8);
    L.ground(131,143,11);L.put(135,10,'E');L.drops(133,137,9);L.put(140,10,'F');
  }),
  makeLevel('弹簧回廊',148,24,function(L){
    L.ground(0,14,20);L.put(3,19,'P');L.drops(6,8,18);L.put(12,19,'S');
    L.ground(15,28,14);L.put(21,13,'E');L.spikes(25,26,13);L.drops(17,19,12);L.plat(16,10,3);L.drops(16,18,9);
    L.ground(30,36,19);L.put(33,18,'S');L.put(34,14,'o');L.put(36,11,'o');L.put(38,10,'o');
    L.ground(39,51,12);L.put(41,11,'C');L.put(46,11,'E');L.put(49,11,'S');
    L.ground(52,61,6);L.drops(54,58,4);L.put(57,4,'M');
    L.plat(64,7,3);L.drops(64,66,6);L.plat(69,10,3);L.put(70,7,'M');L.plat(74,13,3);L.drops(74,76,12);
    L.ground(79,86,18);L.put(81,17,'C');L.put(84,17,'S');
    L.ground(87,91,14);L.spikes(88,90,13);L.drops(88,90,10);
    L.ground(92,101,18);L.put(95,17,'E');L.put(99,17,'S');
    L.plat(102,11,3);L.drops(102,104,10);L.ground(104,108,16);L.put(106,15,'S');
    L.ground(110,122,10);L.put(112,9,'C');L.put(117,9,'E');L.spikes(120,121,9);L.drops(114,118,7);
    L.plat(125,10,3);L.put(127,7,'M');L.drops(125,127,9);
    L.ground(130,134,16);L.put(132,15,'S');
    L.ground(136,147,9);L.put(140,8,'E');L.drops(138,142,7);L.put(144,8,'F');
  }),
  makeLevel('墨井深渊',152,26,function(L){
    L.ground(0,19,22);L.put(3,21,'P');L.put(9,21,'E');L.drops(6,8,20);
    L.wall(15,8,19);L.wall(19,8,21);L.put(16,18,'o');L.put(18,15,'o');L.put(16,12,'o');L.put(18,9,'o');
    L.ground(20,32,8);L.put(25,7,'E');L.put(29,7,'C');L.drops(22,24,6);
    L.plat(34,8,3);L.drops(34,36,7);L.ground(39,43,8);
    L.wall(44,8,21);L.wall(48,6,19);L.plat(45,12,2);L.plat(46,16,2);L.put(46,10,'o');L.put(45,14,'o');L.put(47,18,'o');
    L.ground(44,64,22);L.put(54,21,'E');L.spikes(58,59,21);L.put(62,21,'C');L.drops(51,53,20);
    L.put(67,21,'m');
    L.ground(70,79,22);L.put(72,21,'S');L.plat(72,16,6);
    L.wall(75,6,13);L.wall(78,6,16);L.put(76,12,'o');L.put(77,9,'o');L.put(76,6,'o');
    L.ground(79,92,6);L.put(85,5,'E');L.put(90,5,'C');L.drops(81,83,4);
    L.plat(95,9,3);L.put(97,6,'M');L.plat(100,13,3);L.drops(100,102,12);
    L.ground(104,116,17);L.put(109,16,'E');L.spikes(113,114,16);L.drops(106,108,15);
    L.put(119,14,'n');L.plat(121,13,2);L.plat(123,14,3);
    L.wall(123,6,10);L.wall(126,6,14);L.put(124,11,'o');L.put(125,9,'o');L.put(124,7,'o');
    L.ground(127,136,6);L.put(131,5,'E');L.drops(129,133,4);
    L.plat(139,8,2);L.put(140,5,'M');
    L.ground(143,151,8);L.drops(144,146,6);L.put(148,7,'F');
  }),
  makeLevel('飞蛾夜航',156,22,function(L){
    L.ground(0,12,17);L.put(3,16,'P');L.drops(6,8,15);
    L.plat(15,15,3);L.drops(15,17,14);L.put(20,13,'M');
    L.plat(23,13,3);L.drops(23,25,12);L.put(28,11,'M');
    L.plat(31,11,3);L.drops(31,33,10);
    L.ground(36,46,13);L.put(41,12,'E');L.put(44,12,'C');L.drops(38,40,11);
    L.plat(49,12,3);L.put(54,10,'M');L.plat(57,9,3);L.drops(57,59,8);L.put(62,8,'M');L.plat(65,10,3);L.drops(65,67,9);
    L.ground(51,56,17);L.put(53,16,'E');L.put(59,16,'m');L.ground(62,68,17);L.put(65,16,'S');
    L.ground(71,82,13);L.put(73,12,'C');L.put(77,12,'E');L.spikes(80,81,12);L.drops(75,78,10);
    L.put(85,12,'m');L.put(87,8,'M');L.drops(85,87,9);
    L.ground(88,92,13);
    L.plat(95,11,3);L.drops(95,97,10);L.put(100,9,'M');
    L.plat(103,8,3);L.drops(103,105,7);L.put(108,7,'M');
    L.plat(111,10,3);L.drops(111,113,9);L.put(116,11,'n');
    L.ground(119,129,12);L.put(121,11,'C');L.put(125,11,'E');L.drops(123,126,9);
    L.plat(132,10,3);L.put(136,8,'M');L.drops(132,134,9);
    L.plat(138,8,3);L.put(142,6,'M');L.drops(138,140,7);
    L.ground(144,155,9);L.put(148,8,'E');L.drops(146,150,7);L.put(152,8,'F');
  }),
  makeLevel('笔锋险道',162,24,function(L){
    L.ground(0,38,18);L.put(3,17,'P');L.drops(6,8,16);
    L.fill(14,18,16,18,'x');L.drops(14,16,15);L.spikes(20,21,17);L.put(25,17,'E');
    L.fill(29,18,32,18,'x');L.plat(30,15,2);L.drops(30,31,14);L.spikes(35,36,17);
    L.ground(39,47,16);L.put(41,15,'C');L.drops(43,45,14);
    L.ground(48,78,19);L.spikes(51,53,18);L.put(56,18,'E');L.spikes(60,62,18);L.put(65,18,'E');L.spikes(69,71,18);
    L.plat(49,15,5);L.drops(51,53,14);L.plat(57,13,5);L.put(60,10,'M');L.plat(65,15,5);L.drops(67,69,14);L.plat(73,16,4);
    L.ground(79,90,19);L.put(81,18,'C');L.spikes(84,85,18);
    L.wall(87,9,16);L.wall(90,9,18);L.put(88,15,'o');L.put(89,12,'o');L.put(88,9,'o');
    L.ground(91,105,9);L.put(96,8,'E');L.spikes(99,100,8);L.drops(93,97,7);L.put(102,6,'M');
    L.put(108,11,'m');
    L.ground(111,117,13);L.spikes(113,114,12);L.put(116,12,'C');
    L.put(120,13,'m');L.put(120,9,'M');L.drops(119,121,10);
    L.ground(123,128,16);L.put(126,15,'S');
    L.ground(130,132,12);L.spikes(130,132,11);L.drops(130,132,8);
    L.ground(133,161,13);L.spikes(136,137,12);L.put(141,12,'E');
    L.fill(145,13,147,13,'x');L.drops(145,147,10);L.spikes(150,151,12);L.put(152,9,'M');
    L.drops(154,156,11);L.put(157,12,'F');
  }),
  makeLevel('纸境之巅',172,28,function(L){
    L.ground(0,11,24);L.put(3,23,'P');L.drops(6,8,22);
    L.put(14,23,'m');L.drops(13,15,20);
    L.ground(17,27,23);L.put(21,22,'E');L.spikes(24,25,22);L.plat(19,20,3);L.drops(19,21,19);
    L.put(30,22,'m');L.put(30,18,'M');
    L.ground(33,49,21);L.put(35,20,'C');L.put(40,20,'E');L.drops(37,39,19);
    L.wall(45,13,18);L.wall(49,13,20);L.put(46,18,'o');L.put(48,16,'o');L.put(46,14,'o');
    L.ground(50,61,13);L.put(55,12,'E');L.spikes(58,59,12);L.drops(52,56,11);
    L.ground(64,71,19);L.put(68,18,'S');L.drops(69,71,13);
    L.ground(73,85,12);L.put(75,11,'C');L.put(80,11,'E');L.drops(77,81,9);
    L.plat(88,11,3);L.drops(88,90,10);L.put(93,9,'M');L.plat(96,10,3);L.drops(96,98,9);
    L.put(101,10,'n');L.plat(104,8,3);L.put(109,7,'M');L.drops(104,106,7);
    L.put(112,10,'m');
    L.ground(115,127,11);L.put(117,10,'C');L.spikes(121,122,10);L.put(124,10,'E');L.drops(119,120,9);
    L.ground(128,144,14);L.fill(130,14,132,14,'x');L.drops(130,132,11);L.put(135,13,'E');L.spikes(138,139,13);L.put(142,13,'S');
    L.ground(146,154,8);L.put(150,5,'M');L.spikes(151,152,7);L.drops(147,149,6);
    L.plat(157,7,2);L.drops(157,158,6);
    L.ground(160,171,6);L.put(163,5,'E');L.drops(162,166,4);L.put(168,5,'F');
  })
];
var CHAPTERS=['一','二','三','四','五','六','七','八','九'];

// ---------------------------------------------------------------- static layer renderer
function renderStatic(L,variant){
  var c=document.createElement('canvas');c.width=L.w*TS;c.height=L.h*TS;
  var prev=g,pb=boil;g=c.getContext('2d');boil=variant*17+3;
  var S=function(x,y){if(x<0||x>=L.w)return true;if(y<0)return false;if(y>=L.h)return true;return L.t[y][x]==='#';};
  for(var y=0;y<L.h;y++)for(var x=0;x<L.w;x++){
    var ch=L.t[y][x],px=x*TS,py=y*TS;
    if(ch==='#'){
      var top=!S(x,y-1),bot=!S(x,y+1),left=!S(x-1,y),right=!S(x+1,y);
      var depth=0;while(depth<3&&S(x,y-depth-1))depth++;
      g.save();g.beginPath();g.rect(px,py,TS,TS);g.clip();
      if(depth===0)hatchRect(px,py,TS,TS,6,x*31+y,0.55,1.2);
      else if(depth===1)hatchRect(px,py,TS,TS,11,x*31+y,0.4,1);
      else{var r=rng(x*7919+y*104729+variant*31);var n=Math.floor(r()*3);for(var i=0;i<n;i++){var cx=px+5+r()*22,cy=py+5+r()*22;inkCircle(cx,cy,1.5+r()*2.2,i+x,0.3);stroke(1.1);}
        if(r()<0.2){g.globalAlpha=0.35;inkLine(px+6+r()*10,py+8+r()*14,px+16+r()*10,py+10+r()*14,{w:1});g.globalAlpha=1;}}
      g.restore();
      if(top){inkLine(px,py,px+TS,py,{w:3,seed:x*3+y*7});
        var r2=rng(x*131+y*17+variant*5);var n2=2+Math.floor(r2()*3);
        for(var i2=0;i2<n2;i2++){var gx=px+3+r2()*26,gh=4+r2()*8,lean=(r2()-0.5)*7;wobblyPath([[gx,py+1],[gx+lean,py-gh]],false,i2+x,0.4);stroke(1.5);}}
      if(bot)inkLine(px,py+TS,px+TS,py+TS,{w:2.2,seed:x+y*5});
      if(left)inkLine(px,py,px,py+TS,{w:2.6,seed:x*5+y});
      if(right)inkLine(px+TS,py,px+TS,py+TS,{w:2.6,seed:x*5+y+1});
    }
    else if(ch==='='){
      var lN=L.t[y][x-1]==='=',rN=L.t[y][x+1]==='=';
      wobblyPath([[px,py],[px+TS,py],[px+TS,py+9],[px,py+9]],true,x+y*9,0.5);fillPath(PAPER);
      inkLine(px,py,px+TS,py,{w:2.6,seed:x*2});inkLine(px,py+9,px+TS,py+9,{w:2,seed:x*2+1});
      if(!lN)inkLine(px,py,px,py+9,{w:2.2});if(!rN)inkLine(px+TS,py,px+TS,py+9,{w:2.2});
      g.globalAlpha=0.5;inkLine(px+5,py+4,px+18,py+4.5,{w:1,seed:x});inkLine(px+22,py+6,px+29,py+6,{w:1,seed:x+3});g.globalAlpha=1;
      if(!lN){wobblyPath([[px+5,py+9],[px+5,py+17],[px+11,py+9]],false,x,0.4);stroke(1.6);}
      if(!rN){wobblyPath([[px+27,py+9],[px+27,py+17],[px+21,py+9]],false,x+1,0.4);stroke(1.6);}
    }
    else if(ch==='^'){
      inkLine(px,py+TS-1,px+TS,py+TS-1,{w:2.2,seed:x});
      for(var si=0;si<3;si++){var bx=px+si*TS/3,bw=TS/3;wobblyPath([[bx+1,py+TS],[bx+bw/2,py+11],[bx+bw-1,py+TS]],true,x*3+si,0.6);fillPath(PAPER);stroke(2);
        g.globalAlpha=0.6;wobblyPath([[bx+3,py+29],[bx+bw/2-0.5,py+16]],false,si,0.3);stroke(1);g.globalAlpha=1;}
    }
    else if(ch==='x'){
      g.fillStyle=INK;g.beginPath();g.moveTo(px,py+TS);
      for(var xi=0;xi<=8;xi++){var xx=px+xi*4;g.lineTo(xx,py+12+Math.sin(xx/9+variant)*2.2+Math.sin(xx/23)*1.5);}
      g.lineTo(px+TS,py+TS);g.closePath();_pb={x:px,y:py+8,w:TS,h:TS-8};fillPath(INK);
      g.globalAlpha=0.35;g.strokeStyle=PAPER;g.lineWidth=1.2;g.beginPath();for(var xj=0;xj<=8;xj++){var xx2=px+xj*4;var yy=py+19+Math.sin(xx2/7+variant*2)*1.5;xj?g.lineTo(xx2,yy):g.moveTo(xx2,yy);}g.stroke();g.globalAlpha=1;
    }
  }
  g=prev;boil=pb;return c;
}

// ---------------------------------------------------------------- game state
var state='title',stateT=0,time=0;
var lvl=null,lvlIndex=0,statics=[],ents=null,player=null,cam={x:0,y:0,shake:0},parts=[];
var lives=3,levelTime=0,totalDrops=0,gotDrops=0,runTotalTime=0,runTotalDrops=0,runTotalGot=0;
var trans=null,hills=[],clouds=[],birds=[],poolTiles=[];
var PC={run:205,acc:1500,dec:2100,airAcc:1150,grav:1400,jump:470,fallMax:640,coyote:0.1,buffer:0.12,wallSlide:75,wallJumpX:245,wallJumpY:440,dashSpeed:520,dashTime:0.16};

function loadLevel(i){
  lvlIndex=i;var src=LEVELS[i];lvl={name:src.name,w:src.w,h:src.h,t:src.t.map(function(r){return r.slice();})};
  ents={drops:[],enemies:[],movers:[],springs:[],checks:[],flag:null};poolTiles=[];
  var spawnPt={x:64,y:64};var id=0;
  for(var y=0;y<lvl.h;y++)for(var x=0;x<lvl.w;x++){var c=lvl.t[y][x];var px=x*TS,py=y*TS;
    if(c==='x')poolTiles.push([px,py]);
    if('PEMmnSCFo'.indexOf(c)>=0){lvl.t[y][x]='.';
      if(c==='P')spawnPt={x:px+6,y:py+4};
      else if(c==='o')ents.drops.push({x:px,y:py,id:id++,ph:Math.random()*6,got:false});
      else if(c==='E')ents.enemies.push({type:'walker',x:px+3,y:py+10,w:26,h:22,dir:-1,speed:48,alive:true,id:id++,t:Math.random()*5});
      else if(c==='M')ents.enemies.push({type:'moth',x0:px+4,y0:py+4,x:px+4,y:py+4,w:24,h:20,dir:1,alive:true,id:id++,ph:Math.random()*6});
      else if(c==='m')ents.movers.push({type:'h',x0:px+16-32,y0:py+10,x:px-16,y:py+10,w:64,h:10,dx:0,dy:0,id:id++,ph:Math.random()*6});
      else if(c==='n')ents.movers.push({type:'v',x0:px+16-32,y0:py+10,x:px-16,y:py+10,w:64,h:10,dx:0,dy:0,id:id++,ph:Math.random()*6});
      else if(c==='S')ents.springs.push({x:px,y:py+5,w:32,h:27,comp:0,id:id++});
      else if(c==='C')ents.checks.push({x:px,y:py,active:false,id:id++});
      else if(c==='F')ents.flag={x:px,y:py,w:40,h:80};
    }}
  totalDrops=ents.drops.length;gotDrops=0;levelTime=0;
  statics=[renderStatic(lvl,0)];
  player={x:spawnPt.x,y:spawnPt.y,w:20,h:28,vx:0,vy:0,face:1,sx:1,sy:1,onGround:false,wasGround:false,wallDir:0,coyote:0,buffer:0,canDouble:true,canDash:true,dashT:0,dashCd:0,wallLock:0,
    anim:'idle',runPhase:0,dead:false,deadT:0,invuln:0,spawn:{x:spawnPt.x,y:spawnPt.y},ride:null,ghostT:0,sliding:false,idleT:0,lastVy:0,jumpCut:false};
  cam.x=clamp(player.x-W/2,0,lvl.w*TS-W);cam.y=clamp(player.y-H*0.6,0,Math.max(0,lvl.h*TS-H));parts=[];
  // parallax décor
  hills=[0.22,0.42,0.65].map(function(f,li){var len=lvl.w*TS*f+W+300;var pts=[];for(var x=0;x<=len;x+=36){var i=x/36;pts.push([x,-(0.5+0.5*Math.sin(i*0.33+li*2))*(40+li*35)-18*Math.sin(i*0.9+li*3)-8*Math.sin(i*2.1+li)]);}return{f:f,pts:pts,base:H*(0.56+li*0.1),len:len};});
  var r=rng(i*77+5);clouds=[];for(var k=0;k<5;k++)clouds.push({x:r()*(lvl.w*TS*0.15+W),y:40+r()*150,s:0.7+r()*0.9,ph:r()*6});
  birds=[];for(var kb=0;kb<2;kb++)birds.push({x:r()*W*2,y:60+r()*120,ph:r()*6,sp:20+r()*20});
}

function startTransition(cx,cy,onMid){trans={t:0,dur:1.1,cx:cx,cy:cy,onMid:onMid,mid:false};}

function hurt(){var p=player;if(p.dead||p.invuln>0||state!=='play')return;
  p.dead=true;p.deadT=1.1;lives--;cam.shake=8;SFX.hurt();
  spawn('splat',p.x+p.w/2,p.y+p.h/2,12,{spd:220,size:4,grav:700,life:1.0});}

// ---------------------------------------------------------------- particles
function spawn(type,x,y,n,o){o=o||{};for(var i=0;i<n;i++){var a=o.dir!=null?o.dir+(Math.random()-0.5)*(o.spread||1.2):Math.random()*Math.PI*2;var sp=(o.spd||100)*(0.3+Math.random()*0.7);
  parts.push({type:type,x:x,y:y,vx:Math.cos(a)*sp+(o.vx||0),vy:Math.sin(a)*sp+(o.vy||0),life:(o.life||0.6)*(0.6+Math.random()*0.5),max:1,size:(o.size||4)*(0.6+Math.random()*0.8),seed:Math.floor(Math.random()*1000),grav:o.grav||0,face:o.face||1});
  parts[parts.length-1].max=parts[parts.length-1].life;}}
function updateParts(dt){for(var i=parts.length-1;i>=0;i--){var p=parts[i];p.life-=dt;if(p.life<=0){parts.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.grav*dt;if(p.type==='dust'){p.vx*=0.9;p.vy*=0.9;}}}
function drawParts(){for(var pi=0;pi<parts.length;pi++){var p=parts[pi];var k=p.life/p.max;g.save();
  if(p.type==='dust'){g.globalAlpha=k*0.55;inkCircle(p.x,p.y,p.size*(1.6-k*0.6),p.seed,0.5);stroke(1.4,GREY);}
  else if(p.type==='splat'){g.globalAlpha=Math.min(1,k*2);inkCircle(p.x,p.y,p.size*(0.4+k*0.6),p.seed,0.7);fillPath(INK);}
  else if(p.type==='spark'){g.globalAlpha=k;inkLine(p.x,p.y,p.x-p.vx*0.06,p.y-p.vy*0.06,{w:1.8,seed:p.seed});}
  else if(p.type==='ring'){g.globalAlpha=k*0.8;inkCircle(p.x,p.y,p.size*(1.3-k),p.seed,1.2);stroke(2);}
  else if(p.type==='ghost'){g.globalAlpha=k*0.35;g.translate(p.x,p.y);g.scale(p.face,1);g.rotate(0.5);inkEllipse(0,-11,6,10,p.seed,0.6);fillPath(INK);inkCircle(0,-24,7,p.seed+1,0.6);fillPath(INK);}
  else if(p.type==='drip'){g.globalAlpha=Math.min(1,k*3);dot(p.x,p.y,p.size*0.5);}
  else if(p.type==='red'){g.globalAlpha=k;inkCircle(p.x,p.y,p.size*k,p.seed,0.6);fillPath(RED);}
  g.restore();}}

// ---------------------------------------------------------------- physics helpers
function tileAt(tx,ty){if(tx<0||tx>=lvl.w)return '#';if(ty<0||ty>=lvl.h)return '.';return lvl.t[ty][tx];}
var solid=function(c){return c==='#';};
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}

function updatePlayer(dt){
  var p=player;
  if(p.dead){p.deadT-=dt;if(p.deadT<=0){if(lives<=0){state='over';stateT=0;SFX.over();}else{p.x=p.spawn.x;p.y=p.spawn.y;p.vx=0;p.vy=0;p.dead=false;p.invuln=1.6;p.ride=null;p.dashT=0;p.canDouble=p.canDash=true;spawn('ring',p.x+10,p.y+14,1,{size:30,life:0.5});spawn('splat',p.x+10,p.y+14,8,{spd:90,size:3,life:0.5});}}return;}
  p.invuln=Math.max(0,p.invuln-dt);p.dashCd=Math.max(0,p.dashCd-dt);p.wallLock=Math.max(0,p.wallLock-dt);
  var dir=(down('right')?1:0)-(down('left')?1:0);
  // ride mover
  if(p.ride){p.x+=p.ride.dx;p.y+=p.ride.dy;}
  // wall contact probe
  var wallDir=0;{var ty0=Math.floor(p.y/TS),ty1=Math.floor((p.y+p.h-1)/TS);var rx=Math.floor((p.x+p.w+1)/TS),lx=Math.floor((p.x-1)/TS);
    for(var ty=ty0;ty<=ty1;ty++){if(solid(tileAt(rx,ty)))wallDir=1;else if(solid(tileAt(lx,ty)))wallDir=-1;}}
  p.wallDir=wallDir;
  p.sliding=!p.onGround&&wallDir!==0&&dir===wallDir&&p.vy>0&&p.dashT<=0;
  // horizontal
  if(p.dashT>0){p.dashT-=dt;p.vy=0;p.ghostT-=dt;if(p.ghostT<=0){p.ghostT=0.035;spawn('ghost',p.x+p.w/2,p.y+p.h,1,{spd:0,life:0.3,face:p.face});}
    if(p.dashT<=0){p.vx=p.face*PC.run;}}
  else{
    if(p.wallLock<=0){
      if(dir!==0){var acc=p.onGround?PC.acc:PC.airAcc;p.vx+=dir*acc*dt;if(Math.sign(p.vx)!==dir&&p.onGround)p.vx+=dir*PC.dec*dt*0.5;p.face=dir;}
      else{var dec=(p.onGround?PC.dec:PC.airAcc*0.6)*dt;if(Math.abs(p.vx)<=dec)p.vx=0;else p.vx-=Math.sign(p.vx)*dec;}}
    p.vx=clamp(p.vx,-PC.run,PC.run);
    if(p.sliding)p.face=wallDir;
  }
  // jump logic
  p.coyote=p.onGround?PC.coyote:Math.max(0,p.coyote-dt);
  if(pressed('jump'))p.buffer=PC.buffer;else p.buffer=Math.max(0,p.buffer-dt);
  if(p.buffer>0&&p.dashT<=0){
    if(p.coyote>0){p.vy=-PC.jump;p.jumpCut=true;p.coyote=0;p.buffer=0;p.onGround=false;p.ride=null;p.sx=0.72;p.sy=1.3;SFX.jump();spawn('dust',p.x+p.w/2,p.y+p.h,5,{spd:60,size:4,life:0.4});}
    else if(wallDir!==0){p.vy=-PC.wallJumpY;p.jumpCut=true;p.vx=-wallDir*PC.wallJumpX;p.face=-wallDir;p.wallLock=0.16;p.buffer=0;p.canDash=true;p.sx=0.7;p.sy=1.3;SFX.wjump();spawn('dust',p.x+(wallDir>0?p.w:0),p.y+p.h*0.6,6,{spd:80,size:3.5,life:0.4,dir:wallDir>0?Math.PI:0,spread:1.5});}
    else if(p.canDouble){p.vy=-PC.jump*0.92;p.jumpCut=true;p.canDouble=false;p.buffer=0;p.sx=0.75;p.sy=1.25;SFX.djump();spawn('ring',p.x+p.w/2,p.y+p.h-2,1,{size:22,life:0.35});spawn('dust',p.x+p.w/2,p.y+p.h,4,{spd:50,size:3,life:0.35});}
  }
  if(!down('jump')&&p.vy<-160&&p.dashT<=0&&p.jumpCut)p.vy=-160;  // variable jump height (only for player-initiated jumps)
  // dash
  if(pressed('dash')&&p.canDash&&p.dashT<=0&&p.dashCd<=0){p.dashT=PC.dashTime;p.dashCd=0.35;p.canDash=false;if(dir!==0)p.face=dir;p.vx=p.face*PC.dashSpeed;p.vy=0;p.ride=null;p.sx=1.35;p.sy=0.75;SFX.dash();}
  // gravity
  if(p.dashT<=0){p.vy+=PC.grav*dt;if(p.sliding)p.vy=Math.min(p.vy,PC.wallSlide);p.vy=Math.min(p.vy,PC.fallMax);}
  // ---- move X
  var nx=p.x+p.vx*dt;{var txy0=Math.floor(p.y/TS),txy1=Math.floor((p.y+p.h-0.01)/TS);
    if(p.vx>0){var txr=Math.floor((nx+p.w)/TS);for(var tyr=txy0;tyr<=txy1;tyr++)if(solid(tileAt(txr,tyr))){nx=txr*TS-p.w-0.001;p.vx=0;if(p.dashT>0)p.dashT=0;break;}}
    else if(p.vx<0){var txl=Math.floor(nx/TS);for(var tyl=txy0;tyl<=txy1;tyl++)if(solid(tileAt(txl,tyl))){nx=(txl+1)*TS+0.001;p.vx=0;if(p.dashT>0)p.dashT=0;break;}}}
  p.x=nx;
  // ---- move Y
  var prevBottom=p.y+p.h;var ny=p.y+p.vy*dt;p.wasGround=p.onGround;p.onGround=false;
  {var tx0=Math.floor(p.x/TS),tx1=Math.floor((p.x+p.w-0.01)/TS);
    if(p.vy>=0){var tyd=Math.floor((ny+p.h)/TS);for(var txd=tx0;txd<=tx1;txd++){var cd=tileAt(txd,tyd);if(solid(cd)||(cd==='='&&prevBottom<=tyd*TS+0.6&&!(down('down')&&pressed('jump')))){ny=tyd*TS-p.h;p.vy=0;p.onGround=true;break;}}}
    else{var tyu=Math.floor(ny/TS);for(var txu=tx0;txu<=tx1;txu++)if(solid(tileAt(txu,tyu))){ny=(tyu+1)*TS+0.001;p.vy=0;break;}}}
  p.y=ny;
  // movers
  var rode=null;
  for(var mi=0;mi<ents.movers.length;mi++){var m=ents.movers[mi];if(p.vy>=0&&p.x<m.x+m.w&&p.x+p.w>m.x&&p.y+p.h>=m.y-0.5&&prevBottom<=m.y+6&&p.y+p.h<=m.y+m.h+8){p.y=m.y-p.h;p.vy=0;p.onGround=true;rode=m;}}
  p.ride=rode;
  // springs
  for(var sgi=0;sgi<ents.springs.length;sgi++){var s=ents.springs[sgi];s.comp=Math.max(0,s.comp-dt*3);if(p.vy>=0&&overlap(p,s)&&prevBottom<=s.y+12){p.y=s.y-p.h;p.vy=-810;p.jumpCut=false;p.onGround=false;p.canDouble=true;p.canDash=true;s.comp=1;p.sx=0.6;p.sy=1.5;SFX.spring();spawn('dust',s.x+16,s.y+20,8,{spd:80,size:4,life:0.5});}}
  // landing
  if(p.onGround){p.canDouble=true;p.canDash=true;if(!p.wasGround){var impact=Math.min(1,p.lastVy/600);p.sx=1+0.35*impact;p.sy=1-0.3*impact;if(p.lastVy>180){SFX.land();spawn('dust',p.x+p.w/2,p.y+p.h,3+Math.floor(impact*6),{spd:70+impact*60,size:4,life:0.45});if(p.lastVy>500)cam.shake=Math.max(cam.shake,3);}}}
  p.lastVy=p.vy;
  // hazards
  var hb={x:p.x+3,y:p.y+3,w:p.w-6,h:p.h-6};
  {var htx0=Math.floor(hb.x/TS),htx1=Math.floor((hb.x+hb.w)/TS),hty0=Math.floor(hb.y/TS),hty1=Math.floor((hb.y+hb.h)/TS);
    for(var hty=hty0;hty<=hty1;hty++)for(var htx=htx0;htx<=htx1;htx++){var hc=tileAt(htx,hty);if(hc==='^'||hc==='x'){var hz={x:htx*TS+3,y:hty*TS+13,w:26,h:19};if(overlap(hb,hz)){hurt();if(hc==='x')spawn('splat',p.x+p.w/2,hty*TS+12,10,{spd:150,size:4,grav:600,life:0.8,dir:-Math.PI/2,spread:1.6});}}}}
  if(p.y>lvl.h*TS+60)hurt();
  // drops
  for(var di=0;di<ents.drops.length;di++){var d=ents.drops[di];if(!d.got&&overlap(p,{x:d.x+8,y:d.y+4,w:16,h:24})){d.got=true;gotDrops++;SFX.collect();spawn('spark',d.x+16,d.y+16,10,{spd:160,life:0.4});spawn('ring',d.x+16,d.y+16,1,{size:18,life:0.3});}}
  // enemies
  for(var ei=0;ei<ents.enemies.length;ei++){var e=ents.enemies[ei];if(!e.alive)continue;if(overlap(p,e)){
    if(p.vy>0&&p.y+p.h-e.y<16||p.dashT>0){e.alive=false;p.vy=-330;p.jumpCut=false;p.canDouble=true;p.canDash=true;p.sx=0.8;p.sy=1.2;SFX.stomp();cam.shake=Math.max(cam.shake,3);
      spawn('splat',e.x+e.w/2,e.y+e.h/2,9,{spd:170,size:4,grav:600,life:0.8});}
    else hurt();}}
  // checkpoints
  for(var ci=0;ci<ents.checks.length;ci++){var cp=ents.checks[ci];if(!cp.active&&overlap(p,{x:cp.x,y:cp.y-16,w:32,h:48})){cp.active=true;p.spawn={x:cp.x+6,y:cp.y-4};SFX.check();spawn('ring',cp.x+16,cp.y+16,2,{size:30,life:0.6});spawn('red',cp.x+16,cp.y+10,10,{spd:90,size:3,life:0.7,grav:300});}}
  // flag
  if(ents.flag&&overlap(p,{x:ents.flag.x,y:ents.flag.y-48,w:40,h:80})){state='clear';stateT=0;SFX.win();runTotalTime+=levelTime;runTotalDrops+=totalDrops;runTotalGot+=gotDrops;cam.shake=4;
    for(var fi=0;fi<3;fi++)spawn('red',ents.flag.x+20,ents.flag.y-20,12,{spd:160,size:4,life:1.2,grav:250});spawn('spark',p.x+p.w/2,p.y,16,{spd:220,life:0.6});}
  // anim state
  p.sx=lerp(p.sx,1,Math.min(1,dt*10));p.sy=lerp(p.sy,1,Math.min(1,dt*10));
  if(p.dashT>0)p.anim='dash';else if(!p.onGround)p.anim=p.sliding?'wall':p.vy<0?'jump':'fall';else p.anim=Math.abs(p.vx)>25?'run':'idle';
  if(p.anim==='run'){p.runPhase+=Math.abs(p.vx)*dt*0.085;}
}

function updateEnemies(dt){
  for(var ei=0;ei<ents.enemies.length;ei++){var e=ents.enemies[ei];if(!e.alive)continue;e.t=(e.t||0)+dt;
    if(e.type==='walker'){var nx=e.x+e.dir*e.speed*dt;var fx=e.dir>0?nx+e.w:nx;var ty=Math.floor((e.y+e.h-1)/TS);var tx=Math.floor(fx/TS);
      var below=tileAt(tx,Math.floor((e.y+e.h+2)/TS));var ahead=tileAt(tx,ty);
      if(solid(ahead)||!(solid(below)||below==='=')||tx<0||tx>=lvl.w)e.dir*=-1;else e.x=nx;}
    else{e.x=e.x0+Math.sin(time*0.9+e.ph)*64;e.y=e.y0+Math.sin(time*1.8+e.ph)*48;e.dir=Math.cos(time*0.9+e.ph)>0?1:-1;}}
  for(var mi=0;mi<ents.movers.length;mi++){var m=ents.movers[mi];var ox=m.x,oy=m.y;if(m.type==='h')m.x=m.x0+Math.sin(time*1.25+m.ph)*48;else m.y=m.y0+Math.sin(time*1.0+m.ph)*80;m.dx=m.x-ox;m.dy=m.y-oy;}
}

function updateCamera(dt){var p=player;var tx=clamp(p.x+p.w/2-W/2+p.face*50+p.vx*0.12,0,Math.max(0,lvl.w*TS-W));var ty=clamp(p.y+p.h/2-H*0.58,0,Math.max(0,lvl.h*TS-H));
  cam.x+=(tx-cam.x)*Math.min(1,dt*5);cam.y+=(ty-cam.y)*Math.min(1,dt*4.5);cam.shake=Math.max(0,cam.shake-dt*30);}

// ---------------------------------------------------------------- update
var boilT=0;
function update(dt){
  time+=dt;stateT+=dt;boilT+=dt;if(boilT>0.33){boilT=0;boil++;}
  if(trans){trans.t+=dt;if(!trans.mid&&trans.t>=trans.dur/2){trans.mid=true;trans.onMid();}if(trans.t>=trans.dur)trans=null;just.jump=just.start=false;}
  if(pressed('mute')){muted=!muted;SFX.ui();}
  if(state==='title'){if((pressed('jump')||pressed('start'))&&!trans){SFX.ui();lives=3;runTotalTime=runTotalDrops=runTotalGot=0;LB.submitted=false;LB.lastMsg='';startTransition(W/2,H/2,function(){loadLevel(0);state='play';stateT=0;});}}
  else if(state==='play'){
    if(pressed('pause')){state='pause';SFX.ui();}
    else{levelTime+=dt;updateEnemies(dt);updatePlayer(dt);updateCamera(dt);updateParts(dt);music(dt);
      if(pressed('restart')&&!trans){SFX.ui();startTransition(player.x+10-cam.x,player.y+14-cam.y,function(){lives=3;loadLevel(lvlIndex);state='play';stateT=0;});}}
  }
  else if(state==='pause'){if(pressed('pause')||pressed('jump')){state='play';SFX.ui();}
    else if(pressed('restart')&&!trans){SFX.ui();startTransition(W/2,H/2,function(){lives=3;loadLevel(lvlIndex);state='play';stateT=0;});}}
  else if(state==='clear'){updateEnemies(dt);updateParts(dt);updateCamera(dt);player.sx=lerp(player.sx,1,dt*10);player.sy=lerp(player.sy,1,dt*10);player.anim='idle';
    if(stateT>0.8&&(pressed('jump')||pressed('start'))&&!trans){SFX.ui();var next=lvlIndex+1;startTransition(player.x+10-cam.x,player.y+14-cam.y,function(){if(next<LEVELS.length){loadLevel(next);state='play';}else{state='win';lbSubmit(runTotalTime);}stateT=0;});}}
  else if(state==='over'){updateParts(dt);if(stateT>0.8&&(pressed('jump')||pressed('restart')||pressed('start'))&&!trans){SFX.ui();startTransition(W/2,H/2,function(){lives=3;loadLevel(lvlIndex);state='play';stateT=0;});}}
  else if(state==='win'){if(stateT>1&&(pressed('jump')||pressed('start'))&&!trans){SFX.ui();startTransition(W/2,H/2,function(){state='title';stateT=0;});}}
  for(var k in just)just[k]=false;
}

// ---------------------------------------------------------------- drawing: world
function drawBackground(){
  g.fillStyle=PAPER;g.fillRect(0,0,W,H);g.drawImage(paperTex,0,0);
  var camY=cam.y-(Math.max(0,lvl?lvl.h*TS-H:0));
  // sun
  {var sx=W*0.8-cam.x*0.04,sy=85-camY*0.05;g.save();g.globalAlpha=0.85;inkCircle(sx,sy,30,500,1.6);stroke(2.2);g.globalAlpha=0.5;inkCircle(sx+2,sy+1,27,501,2);stroke(1.2);
    for(var i=0;i<14;i++){var a=i/14*Math.PI*2;var r1=38,r2=r1+8+(i%3)*5;inkLine(sx+Math.cos(a)*r1,sy+Math.sin(a)*r1,sx+Math.cos(a)*r2,sy+Math.sin(a)*r2,{w:1.4,seed:i});}g.restore();}
  // clouds
  for(var cci=0;cci<clouds.length;cci++){var c=clouds[cci];var span=lvl.w*TS*0.15+W+200;var x=((c.x-cam.x*0.15+time*2)%span+span)%span-100;var y=c.y-camY*0.1;
    g.save();g.translate(x,y);g.scale(c.s,c.s);g.globalAlpha=0.7;
    var bl=[[0,0,22],[24,-10,26],[52,-4,20],[-20,4,14]];for(var bi=0;bi<bl.length;bi++){var bb=bl[bi];inkEllipse(bb[0],bb[1],bb[2],bb[2]*0.6,c.ph*100+bb[0],1.5);fillPath(PAPER);}
    for(var bj=0;bj<bl.length;bj++){var bb2=bl[bj];inkEllipse(bb2[0],bb2[1],bb2[2],bb2[2]*0.6,c.ph*100+bb2[0],1.5);stroke(1.6);}
    g.globalAlpha=0.3;inkLine(-28,10,70,10,{w:1.2});g.restore();}
  // birds
  for(var bdi=0;bdi<birds.length;bdi++){var b=birds[bdi];var bx=((b.x+time*b.sp-cam.x*0.3)%(W+200)+W+200)%(W+200)-100;var by=b.y-camY*0.15+Math.sin(time*2+b.ph)*6;var bf=Math.sin(time*9+b.ph)*4;
    wobblyPath([[bx-7,by-bf],[bx,by+2],[bx+7,by-bf]],false,b.ph*10,0.3);stroke(1.6);}
  // hills
  hills.forEach(function(hl,li){var ox=-cam.x*hl.f;var oy=hl.base-camY*hl.f*0.5;var pts=[];
    for(var i=0;i<hl.pts.length;i++){var x=hl.pts[i][0]+ox;if(x<-50||x>W+50)continue;pts.push([x,hl.pts[i][1]+oy]);}
    if(pts.length<2)return;g.save();g.globalAlpha=1;
    g.beginPath();wobblyPath(pts,false,li*77,1.0);g.lineTo(pts[pts.length-1][0],H+10);g.lineTo(pts[0][0],H+10);g.closePath();fillPath(PAPER);
    g.clip();g.globalAlpha=0.25+li*0.12;
    for(var j=0;j<pts.length-1;j++){var x2=pts[j][0],y2=pts[j][1];var dd=22+li*14;for(var k=0;k<3;k++){var xx=x2+k*12+(li*5);inkLine(xx,y2+2+k*2,xx-8+li*4,y2+dd-k*4,{w:1,seed:j*3+k,wob:0.6});}}
    g.restore();g.globalAlpha=0.85-li*0.15;wobblyPath(pts,false,li*77,1.0);stroke(2.2-li*0.3);g.globalAlpha=1;});
}

function drawScarf(p){var t=time;var n=6;var pts=[[-2,-16]];var sp=Math.abs(p.vx)/PC.run;var up=clamp(-p.vy*0.004,-1.2,1.2);
  for(var i=1;i<=n;i++){pts.push([-2-i*(4+sp*1.5),-16+Math.sin(t*12-i*0.9)*(1.8+sp)+i*i*0.35*up+(p.anim==='idle'?i*0.9:0)]);}
  wobblyPath(pts,false,88,0.6);stroke(6,INK);wobblyPath(pts,false,88,0.6);g.lineWidth=3.6;g.strokeStyle=SEAL;g.stroke();}

function drawPlayer(p){
  if(p.dead)return;if(p.invuln>0&&Math.floor(time*16)%2===0)return;
  var t=time,s=p.anim,ph=p.runPhase;
  g.save();g.translate(p.x+p.w/2,p.y+p.h);g.scale(p.face*p.sx,p.sy);
  var lean=0,bob=0,headY=-22;
  var footL=[-4,0],footR=[4,0],handL=[-6,-9],handR=[6,-9];
  if(s==='idle'){bob=Math.sin(t*3)*0.8;handL=[-6,-8+Math.sin(t*3)*0.5];handR=[6,-8+Math.sin(t*3+1)*0.5];}
  else if(s==='run'){lean=0.17;var cc=Math.cos(ph),sn=Math.sin(ph);footL=[sn*7,-Math.max(0,cc)*5];footR=[-sn*7,-Math.max(0,-cc)*5];handL=[-sn*6,-10-Math.abs(cc)];handR=[sn*6,-10];bob=-Math.abs(sn)*1.6;}
  else if(s==='jump'){footL=[-3,-4];footR=[5,-2];handL=[-7,-19];handR=[7,-17];lean=0.1;}
  else if(s==='fall'){footL=[-5,-1];footR=[5,-3];handL=[-9,-20+Math.sin(t*25)*2];handR=[8,-19+Math.cos(t*25)*2];lean=-0.05;}
  else if(s==='wall'){footL=[-2,-2];footR=[6,-1];handL=[-5,-10];handR=[10,-15];lean=-0.12;}
  else if(s==='dash'){lean=0.55;footL=[-8,-2];footR=[-3,-1];handL=[9,-12];handR=[7,-15];headY=-19;}
  g.rotate(lean);g.translate(0,bob);
  if(s==='dash'){g.save();g.globalAlpha=0.5;for(var i=0;i<3;i++)inkLine(-14,-8-i*6,-34-i*5,-8-i*6,{w:1.5,seed:i});g.restore();}
  drawScarf(p);
  // legs
  wobblyPath([[-3,-6],footL],false,1,0.6);stroke(2.7);wobblyPath([[3,-6],footR],false,2,0.6);stroke(2.7);
  // body
  wobblyPath([[-5,-17],[5,-17],[6.5,-6],[-6.5,-6]],true,3,0.8);fillPath(PAPER);stroke(2.4);
  g.save();g.globalAlpha=0.5;inkLine(-4,-9,-2,-15,{w:1,seed:4});inkLine(-1,-8,1,-14,{w:1,seed:5});g.restore();
  // arms
  wobblyPath([[-4,-15],handL],false,6,0.6);stroke(2.4);wobblyPath([[4,-15],handR],false,7,0.6);stroke(2.4);
  // head
  inkCircle(0,headY,7.6,8,0.5);fillPath(PAPER);stroke(2.6);
  wobblyPath([[-3,headY-6.5],[-1,headY-11],[3,headY-8]],false,9,0.5);stroke(2);
  wobblyPath([[2,headY-7],[5,headY-10.5]],false,10,0.5);stroke(1.6);
  // eyes
  if(s==='dash'){inkLine(2,headY-1,5.5,headY-1.5,{w:1.8});}
  else{var blink=Math.sin(t*1.7)>0.985||(s==='idle'&&Math.sin(t*0.7)>0.995);if(blink){inkLine(1.5,headY-1,4,headY-1,{w:1.6});inkLine(5,headY-1.5,7,headY-1.5,{w:1.6});}else{dot(2.6,headY-1,1.5);dot(5.8,headY-1.5,1.4);}}
  g.restore();
}

function drawWalker(e){g.save();g.translate(e.x+e.w/2,e.y+e.h);g.scale(e.dir,1);
  for(var i=0;i<2;i++){var fx=i?7:-7;var off=Math.sin(e.t*8+i*Math.PI)*3;wobblyPath([[fx,-5],[fx+off,0]],false,30+i+e.id,0.5);stroke(2.6);}
  var pts=[];for(var j=0;j<14;j++){var a=j/14*Math.PI*2;var r=1+hashf(j,e.id,0)*0.1;pts.push([Math.cos(a)*13*r,-11+Math.sin(a)*9.5*r]);}
  wobblyPath(pts,true,31+e.id,1.3);fillPath(INK);stroke(1.8);
  for(var k=0;k<3;k++){var x=-8+k*6;wobblyPath([[x,-19],[x+2,-24],[x+4,-19]],false,33+k,0.5);stroke(2.2);}
  dot(4,-13,2.8,PAPER);dot(9,-12,2.3,PAPER);dot(5,-13,1.2);dot(9.6,-12,1);
  g.strokeStyle=PAPER;g.lineWidth=1.4;g.beginPath();g.moveTo(2,-17);g.lineTo(7,-15.5);g.stroke();
  g.restore();}
function drawMoth(e){g.save();g.translate(e.x+e.w/2,e.y+e.h/2);var flap=0.45+Math.abs(Math.sin(time*9+e.ph))*0.6;
  var sgns=[-1,1];for(var si=0;si<2;si++){var sgn=sgns[si];g.save();g.scale(sgn*flap,1);wobblyPath([[2,0],[14,-10],[17,-2],[13,7],[3,5]],true,40+e.id,0.8);fillPath(PAPER);stroke(1.8);
    g.globalAlpha=0.6;inkLine(6,-2,12,-7,{w:1});inkLine(7,3,12,1,{w:1});g.globalAlpha=1;dot(11,-3,1.6);g.restore();}
  wobblyPath([[0,-6],[2.5,6],[-2.5,6]],true,41,0.5);fillPath(INK);
  wobblyPath([[0,-6],[-4,-12]],false,42,0.4);stroke(1.3);wobblyPath([[0,-6],[4,-12]],false,43,0.4);stroke(1.3);
  g.restore();}
function drawSpring(s){g.save();g.translate(s.x+16,s.y+27);var h=19*(1-s.comp*0.65);
  wobblyPath([[-12,0],[12,0],[12,-3],[-12,-3]],true,50,0.4);fillPath(INK);
  var pts=[];for(var i=0;i<=6;i++)pts.push([i%2?8:-8,-3-h*i/6]);wobblyPath(pts,false,51,0.4);stroke(2.2);
  wobblyPath([[-13,-3-h],[13,-3-h],[13,-8-h],[-13,-8-h]],true,52,0.5);fillPath(PAPER);stroke(2.4);
  g.restore();}
function drawDrop(d){if(d.got)return;var bob=Math.sin(time*3+d.ph)*3;g.save();g.translate(d.x+16,d.y+16+bob);
  g.globalAlpha=0.25;inkEllipse(0,14-bob*0.4,7,2,60,0.3);stroke(1.2);g.globalAlpha=1;
  wobblyPath([[0,-11],[6,-2],[6,4],[0,9],[-6,4],[-6,-2]],true,61+d.id,0.7);fillPath(INK);stroke(1.8);dot(-2.5,1,1.6,PAPER);
  g.restore();}
function drawCheckpoint(c){g.save();g.translate(c.x+16,c.y+32);
  wobblyPath([[-10,0],[10,0],[11,-12],[6,-16],[6,-20],[-6,-20],[-6,-16],[-11,-12]],true,70+c.id,0.6);fillPath(PAPER);stroke(2.4);
  if(c.active){wobblyPath([[-9,-2],[9,-2],[10,-10],[-10,-10]],true,71,0.6);fillPath(INK);
    wobblyPath([[2,-20],[13,-44]],false,72,0.6);stroke(2.2);wobblyPath([[6,-28],[11,-40],[19,-46],[16,-33]],true,73,0.8);fillPath(PAPER);stroke(1.8);}
  else{g.save();g.beginPath();g.rect(-10,-16,20,16);g.clip();hatchRect(-10,-16,20,16,5,70,0.3,1);g.restore();}
  g.restore();}
function drawFlag(f){g.save();g.translate(f.x+8,f.y+32);
  wobblyPath([[0,0],[0,-82]],false,80,0.6);stroke(3);dot(0,-84,3);
  var pts=[[0,-78]];for(var i=1;i<=4;i++)pts.push([i*9,-78+Math.sin(time*6-i*0.8)*3]);for(var j=4;j>=1;j--)pts.push([j*9,-54+Math.sin(time*6-j*0.8+0.5)*3]);pts.push([0,-54]);
  wobblyPath(pts,true,81,0.8);fillPath(RED);stroke(2.2);
  wobblyPath([[-10,0],[10,0],[8,-5],[-8,-5]],true,82,0.5);fillPath(INK);
  g.restore();}
function drawMover(m){g.save();g.translate(m.x,m.y);
  if(m.type==='v'){var top=(m.y0-120)-m.y;g.globalAlpha=0.6;inkLine(32,0,32,top,{w:1.3,seed:m.id});g.globalAlpha=1;inkCircle(32,top,4,92+m.id,0.5);fillPath(INK);}
  wobblyPath([[0,0],[64,0],[62,10],[2,10]],true,90+m.id,0.6);fillPath(PAPER);stroke(2.4);
  g.globalAlpha=0.5;for(var i=0;i<6;i++)inkLine(8+i*10,2,4+i*10,8,{w:1,seed:i});g.globalAlpha=1;
  if(m.type==='h'){var wxs=[10,54];for(var wi=0;wi<2;wi++){var wx=wxs[wi];inkCircle(wx,13,4,91+wx,0.5);stroke(1.6);inkLine(wx,13,wx+Math.cos(time*6)*3,13+Math.sin(time*6)*3,{w:1.2});}}
  g.restore();}

function drawWorld(){
  var sx=(Math.random()-0.5)*cam.shake*2,sy=(Math.random()-0.5)*cam.shake*2;
  g.save();g.translate(-Math.round(cam.x+sx),-Math.round(cam.y+sy));
  g.drawImage(statics[0],0,0);
  for(var mi=0;mi<ents.movers.length;mi++)drawMover(ents.movers[mi]);
  for(var si=0;si<ents.springs.length;si++)drawSpring(ents.springs[si]);
  for(var ci=0;ci<ents.checks.length;ci++)drawCheckpoint(ents.checks[ci]);
  if(ents.flag)drawFlag(ents.flag);
  for(var di=0;di<ents.drops.length;di++)drawDrop(ents.drops[di]);
  for(var ei=0;ei<ents.enemies.length;ei++){var e=ents.enemies[ei];if(e.alive)(e.type==='walker'?drawWalker:drawMoth)(e);}
  drawPlayer(player);drawParts();
  g.restore();
}

// ---------------------------------------------------------------- drawing: UI
function drawBorder(){g.save();g.globalAlpha=0.8;wobblyPath([[8,8],[W-8,8],[W-8,H-8],[8,H-8]],true,999,1.4);stroke(2.4);g.globalAlpha=0.3;wobblyPath([[12,12],[W-12,12],[W-12,H-12],[12,H-12]],true,998,1.2);stroke(1);g.restore();}
function fmt(t){var m=Math.floor(t/60),s=Math.floor(t%60);return m+':'+(s<10?'0':'')+s;}
function drawHUD(){
  for(var i=0;i<3;i++){var x=40+i*32,y=36;var pts=heartPts(x,y,0.75);wobblyPath(pts,true,700+i,0.8);if(i<lives){fillPath(INK);stroke(2);}else{g.save();g.globalAlpha=0.35;stroke(1.6);g.restore();}}
  // drop counter
  g.save();g.translate(W-120,36);wobblyPath([[0,-9],[5,-2],[5,3],[0,7.5],[-5,3],[-5,-2]],true,710,0.6);fillPath(INK);g.restore();
  inkText(gotDrops+' / '+totalDrops,W-104,36,24,'left');
  inkText(fmt(levelTime),W/2,34,22);
  g.save();g.globalAlpha=0.75;txt('第'+CHAPTERS[lvlIndex]+'章 · '+lvl.name,W/2,58,16);g.restore();
  // ability hints
  g.save();g.globalAlpha=0.5;var p=player;txt(p.canDouble?'◎':'○',40,H-30,16,'left');txt(p.canDash?'◆':'◇',62,H-30,16,'left');g.restore();
}
function overlayBox(w,h){g.save();g.globalAlpha=0.9;wobblyPath([[W/2-w/2,H/2-h/2],[W/2+w/2,H/2-h/2],[W/2+w/2,H/2+h/2],[W/2-w/2,H/2+h/2]],true,800,2);fillPath(PAPER);stroke(3);
  g.globalAlpha=0.5;wobblyPath([[W/2-w/2+6,H/2-h/2+6],[W/2+w/2-6,H/2-h/2+6],[W/2+w/2-6,H/2+h/2-6],[W/2-w/2+6,H/2+h/2-6]],true,801,1.5);stroke(1.2);g.restore();}
function wash(a){if(a==null)a=0.55;g.fillStyle='rgba(244,239,228,'+a+')';g.fillRect(0,0,W,H);}

var titleDemo={x:0,y:0,w:20,h:28,vx:150,vy:0,face:1,sx:1,sy:1,anim:'run',runPhase:0,dead:false,invuln:0,dashT:0};
function drawTitle(){
  g.fillStyle=PAPER;g.fillRect(0,0,W,H);g.drawImage(paperTex,0,0);
  // decorative hills
  g.save();g.globalAlpha=0.5;var pts=[];for(var x=-20;x<=W+20;x+=36){var i=x/36;pts.push([x,H*0.72-(0.5+0.5*Math.sin(i*0.33))*60-14*Math.sin(i*0.9)]);}wobblyPath(pts,false,5,1);stroke(2);g.restore();
  // ground line
  inkLine(60,H*0.78,W-60,H*0.78,{w:3,seed:1});g.save();g.globalAlpha=0.5;for(var gi=0;gi<30;gi++)inkLine(70+gi*28,H*0.78+3,62+gi*28,H*0.78+16,{w:1,seed:gi});g.restore();
  // big title
  g.save();g.translate(W/2,H*0.3);g.rotate(-0.02);inkText('墨 痕',0,0,112);g.restore();
  g.save();g.globalAlpha=0.8;wobblyPath([[W/2-150,H*0.3+62],[W/2+150,H*0.3+66]],false,6,2);stroke(3);g.restore();
  txt('I N K B O U N D',W/2,H*0.3+90,22,'center',GREY);
  // seal
  g.save();g.translate(W/2+200,H*0.3-40);g.rotate(0.12);wobblyPath([[-22,-22],[22,-22],[22,22],[-22,22]],true,7,1.2);fillPath(SEAL);txt('跃',0,2,30,'center',PAPER);g.restore();
  // running character demo
  titleDemo.runPhase+=0.016*150*0.085;titleDemo.x=W/2-10+Math.sin(time*0.8)*140;titleDemo.face=Math.cos(time*0.8)>0?1:-1;titleDemo.vx=titleDemo.face*150;titleDemo.y=H*0.78-28;
  g.save();var fx=titleDemo.x+10,fy=titleDemo.y+28;g.translate(fx,fy);g.scale(1.8,1.8);g.translate(-fx,-fy);drawPlayer(titleDemo);g.restore();
  updateParts(1/60);drawParts();
  // floating drops
  for(var fdi=0;fdi<5;fdi++){var d={x:100+fdi*180+Math.sin(time+fdi)*10,y:H*0.52+Math.cos(time*1.3+fdi*1.7)*14,id:fdi,ph:fdi,got:false};drawDrop(d);}
  var blink=Math.sin(time*4)>-0.3;if(blink)inkText(isTouch?'点击 ● 或屏幕 开始':'按 空格 / 点击 开始',W/2,H*0.9,26);
  g.save();g.globalAlpha=0.7;txt(isTouch?'◀ ▶ 移动 · ● 跳跃(二段跳·蹬墙跳) · ◆ 冲刺 · ▼ 下穿木板 · 顶部按钮暂停/重开/静音':'← → 移动   空格/Z 跳跃(二段跳·蹬墙跳)   Shift/X 冲刺   P 暂停   R 重开本章   M 静音',W/2,H*0.96,15,'center',GREY);g.restore();
  drawBorder();
}

function render(){
  g=ctx;
  if(state==='title'){drawTitle();}
  else{
    drawBackground();drawWorld();drawHUD();drawBorder();
    if(state==='pause'){wash(0.5);overlayBox(360,170);inkText('暂 停',W/2,H/2-36,44);txt(isTouch?'顶部「继续」回到游戏':'按 P 或 空格 继续',W/2,H/2+20,20,'center',GREY);txt(isTouch?'「重开」重来本章':'按 R 重开本章',W/2,H/2+52,18,'center',GREY);}
    else if(state==='clear'){var k=Math.min(1,stateT*2);g.save();g.globalAlpha=k;wash(0.5);overlayBox(460,250);inkText('关卡完成',W/2,H/2-80,46);
      inkLine(W/2-150,H/2-48,W/2+150,H/2-48,{w:2});
      txt('墨滴收集　'+gotDrops+' / '+totalDrops,W/2,H/2-12,26);txt('用时　'+fmt(levelTime),W/2,H/2+28,26);
      if(gotDrops===totalDrops)txt('✦ 全部收集 ✦',W/2,H/2+62,20,'center',RED);
      if(stateT>0.8&&Math.sin(time*4)>-0.3)txt((lvlIndex+1<LEVELS.length?(isTouch?'按 ● 进入下一章':'按 空格 进入下一章'):(isTouch?'按 ● 查看结局':'按 空格 查看结局')),W/2,H/2+100,20,'center',GREY);g.restore();}
    else if(state==='over'){wash(0.6);overlayBox(420,200);inkText('墨 尽',W/2,H/2-40,54);txt('纸上的旅程暂告段落',W/2,H/2+14,20,'center',GREY);if(stateT>0.8&&Math.sin(time*4)>-0.3)txt(isTouch?'按 ● 重试本章':'按 空格 / R 重试本章',W/2,H/2+64,22);}
    else if(state==='win'){g.fillStyle=PAPER;g.fillRect(0,0,W,H);g.drawImage(paperTex,0,0);
      g.save();g.translate(W/2,H*0.26);inkText('墨 尽 纸 终',0,0,80);g.restore();
      inkLine(W/2-200,H*0.26+56,W/2+200,H*0.26+60,{w:3});
      txt('穿过九章纸境，墨痕已留在每一页。',W/2,H*0.46,24);
      txt('总用时　'+fmt(runTotalTime),W/2,H*0.58,26);txt('墨滴　'+runTotalGot+' / '+runTotalDrops,W/2,H*0.66,26);
      if(runTotalGot===runTotalDrops)txt('✦ 一滴不漏 ✦',W/2,H*0.74,22,'center',RED);
      g.save();g.translate(W/2+260,H*0.6);g.rotate(0.1);wobblyPath([[-26,-26],[26,-26],[26,26],[-26,26]],true,7,1.2);fillPath(SEAL);txt('终',0,2,36,'center',PAPER);g.restore();
      if(LB.lastMsg)txt(LB.lastMsg,W/2,H*0.82,17,'center',GREY);
      if(LB.supported)txt('点顶部「排行榜」查看九章速通榜',W/2,H*0.86,15,'center',GREY);
      if(stateT>1&&Math.sin(time*4)>-0.3)txt(isTouch?'按 ● 回到标题':'按 空格 回到标题',W/2,H*0.92,22,'center',GREY);drawBorder();}
  }
  // ink transition
  if(trans){var kt=trans.t/trans.dur;var maxR=Math.hypot(W,H)*0.75;g.save();g.fillStyle=INK;
    if(kt<0.5){var r=Math.pow(kt*2,1.6)*maxR;inkCircle(trans.cx,trans.cy,Math.max(1,r),321,r*0.08);g.fill();
      for(var i=0;i<8;i++){var a=i/8*Math.PI*2+kt*3;var rr=r*(1.05+hashf(i,3,boil)*0.1);inkCircle(trans.cx+Math.cos(a)*rr,trans.cy+Math.sin(a)*rr,r*0.08+6,i,1);g.fill();}}
    else{var r2=Math.pow((kt-0.5)*2,0.7)*maxR;g.beginPath();g.rect(-10,-10,W+20,H+20);var n=40;for(var j=0;j<=n;j++){var a2=-j/n*Math.PI*2;var rr2=r2*(1+hashf(j%n,5,boil)*0.06);var x=W/2+Math.cos(a2)*rr2,y=H/2+Math.sin(a2)*rr2;j?g.lineTo(x,y):g.moveTo(x,y);}g.closePath();g.fill('evenodd');}
    g.restore();}
}

// ---------------------------------------------------------------- loop
var last=performance.now(),acc=0;var STEP=1/60;var hidden=false;
function frame(now){
  if(hidden){last=now;requestAnimationFrame(frame);return;}
  var dt=(now-last)/1000;last=now;if(dt>0.1)dt=0.1;acc+=dt;var n=0;while(acc>=STEP&&n<4){update(STEP);acc-=STEP;n++;}if(n===4)acc=0;
  render();syncChrome();requestAnimationFrame(frame);
}

// visibility: pause gameplay + audio when the mini-tool is backgrounded
document.addEventListener('visibilitychange',function(){
  if(document.hidden){hidden=true;if(state==='play')state='pause';if(actx&&actx.suspend){try{actx.suspend();}catch(e){}}}
  else{hidden=false;last=performance.now();acc=0;if(actx&&actx.state==='suspended'&&!muted){try{actx.resume();}catch(e){}}}
});

// best-effort: read container window info for safe-area / native-button avoidance
(function initWindowInfo(){
  var xhs=window.xhs,mt=xhs&&xhs.miniTool;
  if(!mt||typeof mt.getWindowInfo!=='function')return;
  try{Promise.resolve(mt.getWindowInfo()).then(function(info){
    if(!info)return;var root=document.documentElement;var sa=info.safeArea;var ww=info.windowWidth,wh=info.windowHeight;
    if(sa){
      if(typeof sa.left==='number')root.style.setProperty('--xhs-safe-left',Math.max(0,sa.left)+'px');
      if(typeof sa.top==='number')root.style.setProperty('--xhs-safe-top',Math.max(0,sa.top)+'px');
      if(typeof sa.right==='number'&&typeof ww==='number')root.style.setProperty('--xhs-safe-right',Math.max(0,ww-sa.right)+'px');
      if(typeof sa.bottom==='number'&&typeof wh==='number')root.style.setProperty('--xhs-safe-bottom',Math.max(0,wh-sa.bottom)+'px');
    }
    var topInset=(sa&&typeof sa.top==='number')?sa.top:0;
    var mb=info.menuButtons;
    if(mb){var cand=[mb.back,mb.me,mb.share];for(var i=0;i<cand.length;i++){var r=cand[i];if(r&&typeof r.bottom==='number'&&r.bottom>topInset)topInset=r.bottom;}}
    root.style.setProperty('--xhs-top-inset',Math.max(0,topInset)+'px');
    fit();
  }).catch(function(){});}catch(e){}
})();

// ---------------------------------------------------------------- boot
function hideSplash(){var sp=document.getElementById('splash');if(sp){sp.setAttribute('aria-busy','false');sp.hidden=true;}}
function showStartupError(){
  var st=document.getElementById('startup-status');var rt=document.getElementById('startup-retry');
  if(st)st.textContent='加载遇到问题，请点击下方按钮重试。';
  if(rt)rt.hidden=false;
}
function boot(){
  try{
    if(!ctx){showStartupError();return;}
    fit();
    loadLevel(0);state='title';stateT=0;
    hideSplash();
    lbEnsure();
    last=performance.now();acc=0;
    requestAnimationFrame(frame);
  }catch(e){showStartupError();}
}
var retryBtn=document.getElementById('startup-retry');
if(retryBtn)retryBtn.addEventListener('click',function(){retryBtn.hidden=true;boot();});
boot();
