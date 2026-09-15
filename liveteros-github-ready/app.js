(()=>{
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const SUPABASE_URL='https://lrkywcgsxcbvzusgmlrh.supabase.co';
const SUPABASE_KEY='sb_publishable_A2ZTec3Na7ZzpkdVY2MOgQ_7LDN8lti';
const CACHE='teros-live-v4-cache', ACTIVE='teros-live-v4-active';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const other=t=>t==='URU'?'RIVAL':'URU';
const safe=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const defaultState=(opponent='RIVAL',color='#C8102E')=>({opponent,opponentColor:color,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),team:'URU',sequence:null,closed:[],launches:[],entries:{URU:0,RIVAL:0},breaks:{URU:0,RIVAL:0},valuation:{URU:{POSITIVA:0,NEGATIVA:0},RIVAL:{POSITIVA:0,NEGATIVA:0}},penalties:{attackURU:0,defenseURU:0},penaltyReasons:{attackURU:{},defenseURU:{}},penaltyJerseys:{},penaltyEvents:[],roster:{},pointsOrigin:{URU:{},RIVAL:{}},score:{URU:0,RIVAL:0},scoreEvents:[],playerEvents:[],period:'1T',seconds:0,running:false});
let user=null, activeId=localStorage.getItem(ACTIVE)||null, st=null, timer=null, selectedColor='#C8102E', currentRole='viewer', channel=null, syncTimer=null, saving=false, dirty=false, undoStack=[];
function cacheAll(){try{return JSON.parse(localStorage.getItem(CACHE)||'{}')}catch{return {}}}
function cacheMatch(id,state,meta={}){const c=cacheAll();c[id]={state:{...state,running:false},meta};localStorage.setItem(CACHE,JSON.stringify(c))}
function getCached(id){return cacheAll()[id]||null}

function parseRoster(text){
  const roster={};
  String(text||'').split(/\n+/).forEach(line=>{
    const m=line.trim().match(/^(\d{1,2})[\s,;:\-]+(.+)$/);
    if(!m)return;
    const n=Number(m[1]);
    const name=m[2].trim();
    if(n>=1&&n<=23&&name)roster[String(n)]=name;
  });
  return roster;
}
function playerLabel(meta={}){
  const jersey=meta.penaltyJersey?String(meta.penaltyJersey):'';
  const name=meta.penaltyPlayer||st?.roster?.[jersey]||'';
  if(name)return name;
  if(jersey)return `#${jersey}`;
  return '—';
}
function lineStructureLabel(obj={}){
  if(obj.lineStructure)return obj.lineStructure;
  if(obj.meta?.lineStructure)return obj.meta.lineStructure;
  const men=obj.men||obj.meta?.men;
  const plusOne=obj.plusOne??obj.meta?.plusOne;
  if(!men)return '—';
  return plusOne?`${men}+1`:`${men}`;
}
function originDisplay(x){
  if(!x)return '—';
  if(x.origin==='LINE'&&x.meta?.men)return `LINE · ${lineStructureLabel(x.meta)}`;
  return x.origin||'—';
}
function eventDisplay(e){
  if(!e)return '';
  if(e.type==='PENAL A PALOS'){
    if(e.outcome==='CONVERTIDO +3')return 'PENAL A PALOS · CONVERTIDO +3';
    if(e.outcome==='ERRADO')return 'PENAL A PALOS · ERRADO';
    return 'PENAL A PALOS';
  }
  if(e.type==='CONVERSIÓN')return e.outcome==='CONVERTIDA +2'?'CONVERSIÓN · +2':'CONVERSIÓN · ERRADA';
  if(e.type==='KICK'){
    const actor=e.team==='URU'?'URU':(st?.opponent||'RIVAL');
    const zoneText=e.zFrom&&e.zTo?`${zoneName(e.zFrom)}→${zoneName(e.zTo)}`:zoneName(e.zTo||e.z);
    const bits=['KICK',e.kickType,actor,zoneText,e.outcome,e.touchMode].filter(Boolean);
    return bits.join(' · ');
  }
  if(e.type==='TOUCH'&&e.mode)return `TOUCH · ${e.mode}`;
  if(e.type==='VENTAJA')return `VENTAJA · ${e.advantageType} · ${e.beneficiary==='URU'?'URU':(st?.opponent||'RIVAL')} · ${e.z||'—'}`;
  if(e.type==='VENTAJA TERMINADA')return 'VENTAJA TERMINADA';
  if(e.type==='VUELVE A VENTAJA')return `VUELVE A ${e.advantageType}`;
  return String(e.type||'')+(e.lane?` (${e.lane})`:'');
}
function nextSequenceAfter(x){
  const all=(st.closed||[]).slice().reverse();
  const idx=all.indexOf(x);
  return idx>=0&&idx<all.length-1?all[idx+1]:null;
}
function nextOriginLabel(next){
  if(!next)return '—';
  const origin=originDisplay(next);
  return `${origin} · ${next.zStart||'—'}`;
}
function sequenceConsequence(x){
  if(!x)return '—';
  const events=x.events||[];
  const shot=[...events].reverse().find(e=>e.type==='PENAL A PALOS');
  const conv=[...events].reverse().find(e=>e.type==='CONVERSIÓN');

  if(x.result==='TRY'){
    return conv?.outcome==='CONVERTIDA +2'?'TRY · 7 PTS':'TRY · 5 PTS';
  }
  if(shot){
    return shot.outcome==='CONVERTIDO +3'?'A PALOS · +3':'A PALOS · ERRADO';
  }
  if(x.result==='TURNOVER'){
    return `TURNOVER · ${x.zEnd||'—'}`;
  }
  if(x.result==='PENAL URU'||x.result==='PENAL RIVAL'||x.result==='TOUCH'||x.result==='KNOCK ON'||x.result==='FORWARD PASS'||x.result==='FREE KICK URU'||x.result==='FREE KICK RIVAL'||x.result==='KICK ENTREGADO'){
    return nextOriginLabel(nextSequenceAfter(x));
  }
  return '—';
}
function removeCachedMatch(id){const c=cacheAll();delete c[id];localStorage.setItem(CACHE,JSON.stringify(c));if(localStorage.getItem(ACTIVE)===id)localStorage.removeItem(ACTIVE)}
function fmtSeconds(sec){return `${String(Math.floor((sec||0)/60)).padStart(2,'0')}:${String((sec||0)%60).padStart(2,'0')}`}
function now(){return fmtSeconds(st?.seconds||0)} function stamp(){return `${st.period} ${now()}`}
function teamLabel(t){return t==='URU'?'URU':(st?.opponent||'RIVAL')}
function setSync(text,cls='ok'){let el=$('#syncStatus');if(!el){el=document.createElement('span');el.id='syncStatus';el.className='sync-badge';$('#clockStatus').after(el)}el.textContent=text;el.className=`sync-badge ${cls}`}
function onlineUI(){const online=navigator.onLine;const os=$('#onlineStatus');if(os)os.textContent=online?'ONLINE':'OFFLINE';document.body.classList.toggle('offline',!online);if(!online)setSync('OFFLINE · guardado local','pending')}
async function cloudSave(force=false){if(!activeId||!st||!user||currentRole==='viewer')return;dirty=true;cacheMatch(activeId,st,{opponent:st.opponent,opponentColor:st.opponentColor,role:currentRole});if(!navigator.onLine){setSync('PENDIENTE DE SINCRONIZAR','pending');return}if(!force){clearTimeout(syncTimer);syncTimer=setTimeout(()=>cloudSave(true),350);return}if(saving)return;saving=true;st.updatedAt=new Date().toISOString();setSync('SINCRONIZANDO…','pending');const {error}=await sb.from('matches').update({opponent_name:st.opponent,opponent_color:st.opponentColor,live_state:{...st,running:false},uru_score:st.score?.URU||0,opponent_score:st.score?.RIVAL||0,updated_at:new Date().toISOString()}).eq('id',activeId);saving=false;if(error){console.error(error);setSync('ERROR DE SINCRONIZACIÓN','error');return}dirty=false;setSync('SINCRONIZADO','ok')}
function save(){if(!activeId||!st)return;st.updatedAt=new Date().toISOString();cacheMatch(activeId,st,{opponent:st.opponent,opponentColor:st.opponentColor,role:currentRole});cloudSave(false)}
function startTimer(){if(!st||st.running||currentRole==='viewer')return;st.running=true;timer=setInterval(()=>{st.seconds++;renderClock();save()},1000);renderClock()}
function stopTimer(){if(st)st.running=false;clearInterval(timer);timer=null;if(st){renderClock();save()}}
function renderClock(){if(!st)return;$('#clock').textContent=now();$('#period1').classList.toggle('active',st.period==='1T');$('#period2').classList.toggle('active',st.period==='2T');$('#clockStatus').textContent=st.running?'▶ EN CURSO':'DETENIDO'}
function flashButton(el){if(!el)return;el.classList.add('pressed');setTimeout(()=>el.classList.remove('pressed'),220)}
const ZONE_NAMES={Z1:'Extrema Defensa',Z2:'Gestación DEF',Z3:'Gestación OF',Z4:'Zona Garra'};
function zoneName(z){return ZONE_NAMES[z]||z||'—'}
function choiceClass(v){
  if(ZONE_NAMES[v])return ` zone-choice zone-${String(v).toLowerCase()}`;
  if(v==='POSITIVA')return ' valuation-positive';
  if(v==='NEGATIVA')return ' valuation-negative';
  return '';
}
function choiceLabel(v){return ZONE_NAMES[v]||v}
function flow(title,buttons){const f=$('#flow');f.classList.remove('hidden');f.innerHTML=`<div class="flow-title">${safe(title)}</div><div class="flow-grid">${buttons.map(b=>`<button type="button" class="choice${choiceClass(b)}" data-v="${safe(b)}">${safe(choiceLabel(b))}</button>`).join('')}</div>`;return new Promise(res=>f.querySelectorAll('[data-v]').forEach(b=>b.addEventListener('click',()=>{flashButton(b);setTimeout(()=>{f.classList.add('hidden');res(b.dataset.v)},90)})))}
const zone=t=>flow(t,['Z1','Z2','Z3','Z4']);
async function ensureClock(){if(st.running||st.seconds>0)return true;const v=await flow('El reloj no empezó · ¿hace cuánto empezó este tiempo?',['30 s','1 min','2 min','3 min','5 min','OTRO']);if(v==='OTRO'){const raw=prompt('Ingresá minutos:segundos, por ejemplo 4:30');if(!raw)return false;const p=raw.split(':');st.seconds=(parseInt(p[0]||'0',10)*60)+parseInt(p[1]||'0',10)}else st.seconds={'30 s':30,'1 min':60,'2 min':120,'3 min':180,'5 min':300}[v];startTimer();save();return true}
async function canStart(){if(!st.sequence)return true;const a=await flow('Ya hay una secuencia abierta',['VOLVER','CERRAR COMO OTRO']);if(a==='VOLVER')return false;const z=await zone('Zona final');const val=await flow('Valoración',['POSITIVA','NEGATIVA']);closeSeq('OTRO',z,val);return true}
function target22Zone(team){return team==='URU'?'Z4':'Z1'}
function cloneJSON(v){return JSON.parse(JSON.stringify(v))}
function undoFingerprint(v){
  try{return JSON.stringify(v)}catch{return String(Date.now())}
}
function pushUndo(){
  if(!st)return;
  const snapshot=cloneJSON(st);
  const fp=undoFingerprint(snapshot);
  const last=undoStack[undoStack.length-1];
  if(last?.fp===fp)return;
  undoStack.push({fp,state:snapshot});
  if(undoStack.length>60)undoStack.shift();
}
function clearUndo(){undoStack=[]}
function undoLastAction(){
  if(!st||!undoStack.length)return;
  const snap=undoStack.pop();
  stopTimer();
  st=cloneJSON(snap.state);
  if(st.running)startTimer();
  save();render();
}
function maybeCountEntry22(z){const seq=st.sequence;if(!seq||!z||z!==target22Zone(seq.team))return false;seq.meta=seq.meta||{};if(seq.meta.entry22Counted)return false;seq.meta.entry22Counted=true;st.entries[seq.team]=(st.entries[seq.team]||0)+1;return true}
function openSeq(origin,z,meta={}){st.sequence={team:st.team,origin,zStart:z,start:stamp(),events:[],meta};maybeCountEntry22(z);save();render()}
function addEvent(type,data={}){if(!st.sequence)return;st.sequence.events.push({type,time:stamp(),...data});if(data.z)maybeCountEntry22(data.z);save();render()}
function countPenalty(result,team,meta={}){
  st.penalties=st.penalties||{attackURU:0,defenseURU:0};
  st.penaltyReasons=st.penaltyReasons||{attackURU:{},defenseURU:{}};
  st.penaltyJerseys=st.penaltyJerseys||{};
  let bucket=null;

  // PENAL URU = infracción cometida por Uruguay
  if(result==='PENAL URU'){
    if(team==='URU'){st.penalties.attackURU++;bucket='attackURU'}
    else if(team==='RIVAL'){st.penalties.defenseURU++;bucket='defenseURU'}
  }

  if(bucket&&meta.penaltyReason){
    st.penaltyReasons[bucket][meta.penaltyReason]=(st.penaltyReasons[bucket][meta.penaltyReason]||0)+1
  }
  if(result==='PENAL URU'&&meta.penaltyJersey){
    const n=String(meta.penaltyJersey);
    st.penaltyJerseys[n]=(st.penaltyJerseys[n]||0)+1
  }
}
async function askPenaltyDetail(result){
  if(result!=='PENAL URU') return {};
  const reason=await flow('PENAL URU · motivo',['BREAKDOWN · DE CABEZA','BREAKDOWN · DE COSTADO','PESCA','OFFSIDE','NO RELEASE','NO SALE TACKLEADOR','SCRUM','MAUL','LINE','JUEGO AÉREO','FOUL PLAY','OTRO']);
  const jersey=await flow('PENAL URU · Nº camiseta',['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23']);
  const player=st.roster?.[String(jersey)]||null;
  return {penaltyReason:reason,penaltyJersey:jersey,penaltyPlayer:player};
}
function recordStandalonePenalty(committedBy,zone,meta={},previousTeam=st.team){
  st.penaltyEvents=st.penaltyEvents||[];
  const result=committedBy==='URU'?'PENAL URU':'PENAL RIVAL';
  const row={
    result,
    committedBy,
    previousTeam,
    zStart:zone,
    zEnd:zone,
    start:stamp(),
    end:stamp(),
    meta:{...meta},
    period:st.period,
    seconds:st.seconds
  };
  st.penaltyEvents.unshift(row);
  countPenalty(result,previousTeam,meta);
  save();
  return row;
}
function addPointsOrigin(team,pts,origin){if(!pts)return;const key=origin||'MANUAL';st.pointsOrigin[team][key]=(st.pointsOrigin[team][key]||0)+pts}
function addScore(team,pts,kind,origin){st.score=st.score||{URU:0,RIVAL:0};st.scoreEvents=st.scoreEvents||[];st.score[team]=(st.score[team]||0)+pts;st.scoreEvents.unshift({team,points:pts,kind,origin:origin||null,time:stamp(),period:st.period,seconds:st.seconds});addPointsOrigin(team,pts,origin);save();render()}
function latestOriginFor(team,kind){
  const rows=st.closed||[];
  if(kind==='CONVERSION'){
    const x=rows.find(x=>(x.terminalTeam||x.team)===team&&x.result==='TRY');
    return x?.origin||null
  }
  const penalResult=team==='URU'?'PENAL RIVAL':'PENAL URU';
  const x=rows.find(x=>x.result===penalResult);
  return x?.origin||null
}
function closeSeq(result,zEnd,valuation){
  if(!st.sequence)return;
  if(result==='TRY')maybeCountEntry22(target22Zone(st.team));
  if(zEnd)maybeCountEntry22(zEnd);
  const seq=st.sequence;
  st.valuation[seq.team][valuation]++;
  countPenalty(result,seq.team,seq.meta||{});
  st.closed.unshift({...seq,end:stamp(),result,zEnd,valuation,terminalTeam:st.team});
  st.sequence=null;
  save();render()
}
async function closeWithValuation(result,z){const old=st.sequence?.team||st.team;const val=await flow('Valoración de la secuencia',['POSITIVA','NEGATIVA']);closeSeq(result,z,val);return old}
async function resolveTerminal(result,z,opts={}){
  const liveBefore=st.team;
  const scoringTeam=result==='TRY'?liveBefore:(result==='PENAL URU'?'RIVAL':result==='PENAL RIVAL'?'URU':null);
  const scoringOrigin=st.sequence?.origin||null;
  await closeWithValuation(result,z);

  if(result==='TRY'){
    addScore(scoringTeam,5,'TRY',scoringOrigin);
    const conv=await flow(`CONVERSIÓN ${teamLabel(scoringTeam)} · resultado`,['CONVERTIDA +2','ERRADA']);
    if(st.closed?.[0])st.closed[0].events=[...(st.closed[0].events||[]),{type:'CONVERSIÓN',outcome:conv,time:stamp()}];
    if(conv==='CONVERTIDA +2') addScore(scoringTeam,2,'CONVERSIÓN',scoringOrigin);
    else save();
  }

  if(result==='PENAL URU'||result==='PENAL RIVAL'){
    const inKickZone=scoringTeam==='URU'?['Z3','Z4'].includes(z):['Z1','Z2'].includes(z);
    if(inKickZone){
      const shot=await flow(`PENAL ${teamLabel(scoringTeam)} · ¿a palos?`,['CONVERTIDO +3','ERRADO','NO PATEA']);
      if(shot!=='NO PATEA'&&st.closed?.[0])st.closed[0].events=[...(st.closed[0].events||[]),{type:'PENAL A PALOS',outcome:shot,time:stamp()}];
      if(shot==='CONVERTIDO +3') addScore(scoringTeam,3,'PENAL A PALOS',scoringOrigin);
      else save();
    }
  }

  if(result==='TURNOVER'){
    st.team=opts.nextTeam||other(liveBefore);
    openSeq('TURNOVER',z);
    return;
  }
  if(opts.nextTeam)st.team=opts.nextTeam;
  else if(result==='PENAL URU')st.team='RIVAL';
  else if(result==='PENAL RIVAL')st.team='URU';
  else if(result==='KNOCK ON'||result==='FORWARD PASS')st.team=other(liveBefore);
  else if(result==='TOUCH'||result==='KICK AL TOUCH'){
    const who=await flow('Line para quién',['URU',st.opponent]);
    st.team=who==='URU'?'URU':'RIVAL';
  }
  save();render();
}
async function resolveWithAdvantage(actualResult,z,opts={}){
  let result=actualResult;
  let finalZone=z;
  let nextTeam=opts.nextTeam||null;
  const adv=st.sequence?.advantage||null;

  if(adv&&actualResult!=='TRY'){
    const backLabel=adv.type==='PENAL'?'VUELVE AL PENAL':'VUELVE AL KNOCK ON';
    const actualLabel=actualResult==='KICK AL TOUCH'?'KICK AL TOUCH':penaltyDisplay(actualResult);
    const decision=await flow('VENTAJA ACTIVA · resultado arbitral',[actualLabel,backLabel]);
    if(decision===backLabel){
      if(st.sequence)st.sequence.events.push({type:'VUELVE A VENTAJA',advantageType:adv.type,beneficiary:adv.beneficiary,time:stamp()});
      finalZone=adv.z||z;
      nextTeam=adv.beneficiary;
      if(adv.type==='PENAL')result=adv.beneficiary==='URU'?'PENAL RIVAL':'PENAL URU';
      else result='KNOCK ON';
    }
  }

  if(result==='PENAL URU'||result==='PENAL RIVAL'){
    const pd=await askPenaltyDetail(result);
    if(st.sequence)st.sequence.meta={...(st.sequence.meta||{}),...pd};
  }
  await resolveTerminal(result,finalZone,{nextTeam});
}
async function resolveSetPieceNotObtained(type,z){
  const rivalPen=`PENAL ${st.opponent.toUpperCase()}`;
  const rivalFk=`FREE KICK ${st.opponent.toUpperCase()}`;
  const choices=type==='SCRUM'
    ? ['PENAL URU',rivalPen,'FREE KICK URU',rivalFk]
    : ['TURNOVER','KNOCK ON','TIRADA TORCIDA','PENAL URU',rivalPen,'FREE KICK URU',rivalFk,'OTRO'];
  const out=await flow(`${type} NO OBTENIDO · ¿qué pasó?`,choices);
  const normalized=out===rivalPen?'PENAL RIVAL':out===rivalFk?'FREE KICK RIVAL':out;

  if(normalized==='PENAL URU'||normalized==='PENAL RIVAL'){
    if(type==='SCRUM'){
      let pd={penaltyReason:'SCRUM'};
      if(normalized==='PENAL URU'){
        const jersey=await flow('PENAL URU · Nº camiseta',['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23']);
        pd={penaltyReason:'SCRUM',penaltyJersey:jersey,penaltyPlayer:st.roster?.[String(jersey)]||null};
      }
      st.sequence.meta={...(st.sequence.meta||{}),...pd};
      const old=st.sequence?.team||st.team;
      closeSeq(normalized,z,'NEGATIVA');
      st.team=normalized==='PENAL URU'?'RIVAL':'URU';
      save();render();
      return;
    }
    const pd=await askPenaltyDetail(normalized);
    st.sequence.meta={...(st.sequence.meta||{}),...pd};
    await resolveTerminal(normalized,z);
    return;
  }
  if(normalized==='TURNOVER'){
    await resolveTerminal('TURNOVER',z);
    return;
  }
  if(normalized==='KNOCK ON'){
    const who=await flow('LINE · KNOCK ON de quién',['URU',st.opponent]);
    const nextTeam=who==='URU'?'RIVAL':'URU';
    if(st.sequence)st.sequence.events.push({type:'KNOCK ON',team:who==='URU'?'URU':'RIVAL',z,time:stamp()});
    await resolveTerminal('KNOCK ON',z,{nextTeam});
    return;
  }
  if(normalized==='TIRADA TORCIDA'){
    const live=st.team;
    if(st.sequence)st.sequence.events.push({type:'TIRADA TORCIDA',team:st.sequence.team,z,time:stamp()});
    closeSeq('TIRADA TORCIDA',z,'NEGATIVA');
    st.team=other(live);
    save();render();
    return;
  }
  if(normalized==='FREE KICK URU'||normalized==='FREE KICK RIVAL'){
    closeSeq(normalized,z,'NEGATIVA');
    st.team=normalized==='FREE KICK URU'?'URU':'RIVAL';
    save();render();
    return;
  }
  const old=st.sequence?.team||st.team;
  closeSeq('NO OBTENIDO',z,'NEGATIVA');
  st.team=other(old);
  save();render();
}
function renderList(obj){const e=Object.entries(obj||{});return e.length?e.map(([k,v])=>`<div>${safe(k)}: <b>${v}</b></div>`).join(''):'Sin datos'}
function pct(won,total){return total?Math.round((won/total)*100):null}
function pctText(won,total){const p=pct(won,total);return p===null?'—':`${p}%`}
function rateTile(label,won,total,accent=''){return `<div class="rate-tile ${accent}"><div class="rate-label">${safe(label)}</div><div class="rate-value">${pctText(won,total)}</div><div class="rate-detail">${won}/${total}</div></div>`}
function zoneRates(items,successFn){return ['Z1','Z2','Z3','Z4'].map(z=>{const rows=items.filter(x=>x.z===z||x.zStart===z),won=rows.filter(successFn).length;return {z,won,total:rows.length}})}
function zoneRateHTML(rates){return `<div class="zone-rate-grid">${rates.map(x=>rateTile(zoneName(x.z),x.won,x.total)).join('')}</div>`}
function lineMenRates(team){
  const rows=(st.launches||[]).filter(x=>x.team===team&&x.type==='LINE'&&x.men);
  const vals=[...new Set(rows.map(x=>lineStructureLabel(x)))].sort((a,b)=>{
    const na=parseInt(a),nb=parseInt(b);
    if(na!==nb)return na-nb;
    return a.includes('+1')?1:-1;
  });
  return vals.map(label=>{
    const r=rows.filter(x=>lineStructureLabel(x)===label);
    return {label,won:r.filter(x=>x.obtention==='OBTENIDO').length,total:r.length}
  })
}
function lineMenHTML(team){const rates=lineMenRates(team);return rates.length?`<div class="rate-row">${rates.map(x=>rateTile(x.label,x.won,x.total)).join('')}</div>`:'<div class="empty-stat">Sin datos</div>'}
function missedLineHTML(team){const rows=(st.launches||[]).filter(x=>x.team===team&&x.type==='LINE'&&x.obtention==='NO OBTENIDO');if(!rows.length)return '<div class="empty-stat">Sin lines no obtenidos</div>';return `<div class="missed-list"><div class="missed-head"><span>ZONA</span><span>HOMBRES</span><span>SALTO</span></div>${rows.map(x=>`<div class="missed-row"><b>${safe(x.z||'—')}</b><span>${safe(lineStructureLabel(x))}</span><span>${safe(x.throw||'—')}</span></div>`).join('')}</div>`}
function utilizationRates(team,origin){
  let rows=(st.closed||[]).filter(x=>x.team===team&&x.origin===origin);
  if(origin==='LINE'||origin==='SCRUM')rows=rows.filter(x=>x.meta?.obtention==='OBTENIDO'&&x.result!=='TURNOVER');
  return ['Z1','Z2','Z3','Z4'].map(z=>{
    const r=rows.filter(x=>x.zStart===z);
    return {z,won:r.filter(x=>x.valuation==='POSITIVA').length,total:r.length}
  })
}
function defensiveUtilizationRates(origin){
  let rows=(st.closed||[]).filter(x=>x.team==='RIVAL'&&x.origin===origin);
  if(origin==='LINE'||origin==='SCRUM')rows=rows.filter(x=>x.meta?.obtention==='OBTENIDO'&&x.result!=='TURNOVER');
  return ['Z1','Z2','Z3','Z4'].map(z=>{
    const r=rows.filter(x=>x.zStart===z);
    return {z,won:r.filter(x=>x.valuation==='NEGATIVA').length,total:r.length}
  })
}
function scrumTotal(team){const rows=(st.launches||[]).filter(x=>x.team===team&&x.type==='SCRUM');return {won:rows.filter(x=>x.obtention==='OBTENIDO').length,total:rows.length}}
function lineZoneRates(team){const rows=(st.launches||[]).filter(x=>x.team===team&&x.type==='LINE');return ['Z1','Z2','Z3','Z4'].map(z=>{const r=rows.filter(x=>x.z===z);return {z,won:r.filter(x=>x.obtention==='OBTENIDO').length,total:r.length}})}
function sequenceReached22(seq){
  if(!seq)return false;
  const target=target22Zone(seq.team);
  if(seq.result==='TRY')return true;
  if(seq.meta?.entry22Counted)return true;
  if(seq.zStart===target||seq.zEnd===target)return true;
  return (seq.events||[]).some(e=>e.z===target||e.zTo===target);
}
function entryEffective(seq){
  if(!seq)return false;
  if(seq.result==='TRY')return true;
  const favorablePenalty=seq.team==='URU'?'PENAL RIVAL':'PENAL URU';
  if(seq.result===favorablePenalty)return true;
  return seq.valuation==='POSITIVA';
}
function entryStats(team){
  const rows=(st.closed||[]).filter(x=>{
    const attackingTeam=x.result==='TRY'?(x.terminalTeam||x.team):x.team;
    return attackingTeam===team&&sequenceReached22({...x,team:attackingTeam})
  });
  const total=rows.length;
  const positive=rows.filter(x=>entryEffective({...x,team:(x.result==='TRY'?(x.terminalTeam||x.team):x.team)})).length;
  return {total,resolved:total,positive,pct:pct(positive,total)};
}
function penaltyMatrix(){
  const m={URU:{attack:0,defense:0},RIVAL:{attack:0,defense:0}};
  const add=(result,team)=>{
    if(result==='PENAL URU'){
      if(team==='URU')m.URU.attack++;
      else m.URU.defense++;
    }else if(result==='PENAL RIVAL'){
      if(team==='RIVAL')m.RIVAL.attack++;
      else m.RIVAL.defense++;
    }
  };
  (st.closed||[]).forEach(x=>add(x.result,x.team));
  (st.penaltyEvents||[]).forEach(x=>add(x.result,x.previousTeam));
  return m
}
function breakEvents(team){
  const out=[];
  (st.closed||[]).forEach(seq=>(seq.events||[]).filter(e=>e.type==='QUIEBRE').forEach(e=>{if((e.team||seq.team)===team)out.push(e)}));
  if(st.sequence)(st.sequence.events||[]).filter(e=>e.type==='QUIEBRE').forEach(e=>{if((e.team||st.sequence.team)===team)out.push(e)});
  return out
}
function breakCount(team,key,value){return breakEvents(team).filter(e=>e[key]===value).length}
function breakTableHTML(kind){
  const isZone=kind==='zone';
  const cols=isZone?['Z1','Z2','Z3','Z4']:['IZQ','CENTRO','DER'];
  const title=isZone?'QUIEBRES POR ZONA':'QUIEBRES POR CARRIL';
  const key=isZone?'z':'lane';

  const row=(team,name,cls)=>{
    const ev=breakEvents(team);
    return `<tr class="${cls}">
      <th scope="row">${safe(name)}</th>
      ${cols.map(v=>`<td>${breakCount(team,key,v)}</td>`).join('')}
      <td class="break-total">${ev.length}</td>
    </tr>`;
  };

  return `<section class="break-table-card ${isZone?'zone-table':'lane-table'}">
    <div class="break-table-title">${title}</div>
    <div class="break-table-scroll">
      <table class="break-data-table">
        <thead>
          <tr>
            <th>EQUIPO</th>
            ${cols.map(v=>`<th>${safe(isZone?zoneName(v):v)}</th>`).join('')}
            <th>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${row('URU','URU','uru')}
          ${row('RIVAL',st.opponent,'rival')}
        </tbody>
      </table>
    </div>
  </section>`;
}
function breakMapHTML(){
  return `<div class="break-tables-layout">
    ${breakTableHTML('zone')}
    ${breakTableHTML('lane')}
  </div>`;
}
function penaltyDisplay(result){
  if(result==='PENAL URU') return 'PENAL URU';
  if(result==='PENAL RIVAL') return `PENAL ${st.opponent.toUpperCase()}`;
  if(result==='FREE KICK URU') return 'FREE KICK URU';
  if(result==='FREE KICK RIVAL') return `FREE KICK ${st.opponent.toUpperCase()}`;
  return result;
}
function sequenceOutcomeLabel(x){
  if(!x)return '—';
  const result=x.result||'';
  if(result && result!=='OTRO') return penaltyDisplay(result);

  const events=x.events||[];
  const br=[...events].reverse().find(e=>e.type==='QUIEBRE');

  if(x.origin==='LINE'){
    if(x.meta?.obtention==='NO OBTENIDO') return 'LINE NO OBTENIDO';
    if(x.meta?.maul==='MAUL' && x.zEnd) return `MAUL → ${x.zEnd}`;
    if(x.zEnd && x.zStart && x.zEnd!==x.zStart) return `LINE → ${x.zEnd}`;
    if(br?.z) return `QUIEBRE ${br.z}`;
    return 'FIN DE SECUENCIA';
  }

  if(x.origin==='SCRUM'){
    if(x.meta?.obtention==='NO OBTENIDO') return 'SCRUM NO OBTENIDO';
    if(x.zEnd && x.zStart && x.zEnd!==x.zStart) return `SCRUM → ${x.zEnd}`;
    if(br?.z) return `QUIEBRE ${br.z}`;
    return 'FIN DE SECUENCIA';
  }

  if(x.origin==='TURNOVER'){
    if(x.zEnd && x.zStart && x.zEnd!==x.zStart) return `TURNOVER → ${x.zEnd}`;
    if(br?.z) return `QUIEBRE ${br.z}`;
    return 'FIN DE SECUENCIA';
  }

  if(x.origin==='RECEPCIÓN KICK'){
    if(x.zEnd && x.zStart && x.zEnd!==x.zStart) return `RECEPCIÓN KICK → ${x.zEnd}`;
    if(br?.z) return `QUIEBRE ${br.z}`;
    return 'FIN DE SECUENCIA';
  }

  if(x.origin==='PENAL'){
    if(x.zEnd && x.zStart && x.zEnd!==x.zStart) return `PENAL → ${x.zEnd}`;
    return 'PENAL · FIN DE SECUENCIA';
  }

  if(x.origin==='FREE KICK'){
    if(x.zEnd && x.zStart && x.zEnd!==x.zStart) return `FREE KICK → ${x.zEnd}`;
    return 'FREE KICK · FIN DE SECUENCIA';
  }

  if(x.zEnd && x.zStart && x.zEnd!==x.zStart) return `TERMINA ${x.zEnd}`;
  if(br?.z) return `QUIEBRE ${br.z}`;
  return 'FIN DE SECUENCIA';
}
function sequenceStartLabel(x){
  if(!x)return '—';
  const parts=[zoneName(x.zStart),x.origin||'—'];
  if(x.origin==='LINE'&&x.meta?.men)parts.push(lineStructureLabel(x.meta));
  if(x.origin==='SCRUM'&&x.meta?.side){
    const side=String(x.meta.side).toUpperCase();
    parts.push(side==='IZQUIERDA'?'IZQ':side==='DERECHA'?'DER':side==='CENTRAL'||side==='CENTRO'?'CENTRAL':side);
  }
  return parts.join(' · ');
}
function sequenceExplorerHTML(team,prefix){
  const rows=(st.closed||[]).filter(x=>x.team===team);
  const origins=[...new Set(rows.map(x=>x.origin).filter(Boolean))];
  const results=[...new Set(rows.map(x=>penaltyDisplay(x.result)).filter(Boolean))];

  const option=(value,label=value)=>`<option value="${safe(value)}">${safe(label)}</option>`;
  const select=(id,label,values)=>`<label class="seq-filter"><span>${label}</span><select id="${prefix}${id}" data-seq-filter="${prefix}"><option value="">TODOS</option>${values.map(v=>option(v)).join('')}</select></label>`;

  return `<div class="sequence-explorer" data-prefix="${prefix}" data-team="${team}">
    <div class="sequence-filter-bar">
      ${select('Origin','ORIGEN',origins)}
      ${select('StartZone','ZONA INICIO',['Z1','Z2','Z3','Z4'])}
      ${select('EndZone','ZONA FIN',['Z1','Z2','Z3','Z4'])}
      ${select('Valuation','VALORACIÓN',['POSITIVA','NEGATIVA'])}
      ${select('Result','RESULTADO',results)}
      <label class="seq-filter contextual line-filter hidden"><span>LINE · HOMBRES</span><select id="${prefix}LineMen" data-seq-filter="${prefix}"><option value="">TODOS</option>${['3','4','5','6','7'].map(v=>option(v,`${v}H`)).join('')}</select></label>
      <label class="seq-filter contextual line-filter hidden"><span>LINE · CONFIG.</span><select id="${prefix}LineConfig" data-seq-filter="${prefix}"><option value="">TODAS</option><option value="NORMAL">NORMAL</option><option value="+1">+1</option></select></label>
      <label class="seq-filter contextual line-filter hidden"><span>LINE · SALTO</span><select id="${prefix}LineThrow" data-seq-filter="${prefix}"><option value="">TODOS</option>${['ADELANTE','MEDIO','ATRÁS'].map(v=>option(v)).join('')}</select></label>
      <label class="seq-filter contextual line-filter hidden"><span>LINE · MAUL</span><select id="${prefix}LineMaul" data-seq-filter="${prefix}"><option value="">TODOS</option>${['MAUL','NO MAUL'].map(v=>option(v)).join('')}</select></label>
      <label class="seq-filter contextual line-filter hidden"><span>LINE · OBTENCIÓN</span><select id="${prefix}LineObt" data-seq-filter="${prefix}"><option value="">TODOS</option>${['OBTENIDO','NO OBTENIDO'].map(v=>option(v)).join('')}</select></label>
      <label class="seq-filter contextual scrum-filter hidden"><span>SCRUM · LADO</span><select id="${prefix}ScrumSide" data-seq-filter="${prefix}"><option value="">TODOS</option>${['IZQUIERDA','CENTRAL','CENTRO','DERECHA'].map(v=>option(v)).join('')}</select></label>
      <label class="seq-filter contextual scrum-filter hidden"><span>SCRUM · OBTENCIÓN</span><select id="${prefix}ScrumObt" data-seq-filter="${prefix}"><option value="">TODOS</option>${['OBTENIDO','NO OBTENIDO'].map(v=>option(v)).join('')}</select></label>
      <button type="button" class="small-btn ghost seq-clear" data-clear-seq="${prefix}">LIMPIAR</button>
    </div>
    <div class="sequence-explorer-table">
      <div class="sequence-explorer-head"><span>MIN</span><span>INICIO</span><span>FIN</span><span>RESULTADO</span><span>CONSECUENCIA</span><span>VAL.</span></div>
      <div id="${prefix}Rows">${sequenceExplorerRows(rows)}</div>
    </div>
  </div>`;
}
function sequenceExplorerRows(rows){
  if(!rows.length)return '<div class="empty-stat sequence-empty">Sin secuencias para estos filtros</div>';
  return rows.map(x=>`<div class="sequence-explorer-row">
    <span>${safe(x.start||x.end||'—')}</span>
    <span><b>${safe(sequenceStartLabel(x))}</b></span>
    <span><b>${safe(zoneName(x.zEnd))}</b></span>
    <span>${safe(sequenceOutcomeLabel(x))}</span>
    <span class="seq-consequence">${safe(sequenceConsequence(x))}</span>
    <span class="${x.valuation==='POSITIVA'?'val-pos':'val-neg'}">${safe(x.valuation||'—')}</span>
  </div>`).join('');
}
function applySequenceFilters(prefix,team){
  const root=document.querySelector(`.sequence-explorer[data-prefix="${prefix}"]`);
  if(!root)return;
  const val=id=>document.getElementById(prefix+id)?.value||'';
  const origin=val('Origin');
  root.querySelectorAll('.line-filter').forEach(x=>x.classList.toggle('hidden',origin!=='LINE'));
  root.querySelectorAll('.scrum-filter').forEach(x=>x.classList.toggle('hidden',origin!=='SCRUM'));

  let rows=(st.closed||[]).filter(x=>x.team===team);
  rows=rows.filter(x=>{
    if(origin&&x.origin!==origin)return false;
    if(val('StartZone')&&x.zStart!==val('StartZone'))return false;
    if(val('EndZone')&&x.zEnd!==val('EndZone'))return false;
    if(val('Valuation')&&x.valuation!==val('Valuation'))return false;
    if(val('Result')&&penaltyDisplay(x.result)!==val('Result'))return false;
    if(origin==='LINE'){
      if(val('LineMen')&&String(x.meta?.men||'')!==val('LineMen'))return false;
      if(val('LineConfig')){
        const isPlus=!!x.meta?.plusOne;
        if(val('LineConfig')==='+1'&&!isPlus)return false;
        if(val('LineConfig')==='NORMAL'&&isPlus)return false;
      }
      if(val('LineThrow')&&x.meta?.throw!==val('LineThrow'))return false;
      if(val('LineMaul')&&x.meta?.maul!==val('LineMaul'))return false;
      if(val('LineObt')&&x.meta?.obtention!==val('LineObt'))return false;
    }
    if(origin==='SCRUM'){
      const side=String(x.meta?.side||'').toUpperCase();
      const wanted=val('ScrumSide');
      if(wanted&&side!==wanted&&!(wanted==='CENTRAL'&&side==='CENTRO')&&!(wanted==='CENTRO'&&side==='CENTRAL'))return false;
      if(val('ScrumObt')&&x.meta?.obtention!==val('ScrumObt'))return false;
    }
    return true;
  });
  const box=document.getElementById(prefix+'Rows');
  if(box)box.innerHTML=sequenceExplorerRows(rows);
}
function bindSequenceExplorer(prefix,team){
  document.querySelectorAll(`[data-seq-filter="${prefix}"]`).forEach(el=>el.onchange=()=>applySequenceFilters(prefix,team));
  const clear=document.querySelector(`[data-clear-seq="${prefix}"]`);
  if(clear)clear.onclick=()=>{
    document.querySelectorAll(`[data-seq-filter="${prefix}"]`).forEach(el=>el.value='');
    applySequenceFilters(prefix,team);
  };
  applySequenceFilters(prefix,team);
}
function sequenceListHTML(team,origin){
  const rows=(st.closed||[]).filter(x=>x.team===team&&x.origin===origin);
  if(!rows.length)return '<div class="empty-stat">Sin secuencias</div>';
  return `<div class="util-seq-list">
    <div class="util-seq-head"><span>INICIO</span><span>FIN</span><span>RESULTADO</span><span>CONSECUENCIA</span><span>VAL.</span></div>
    ${rows.map(x=>`
      <div class="util-seq-row">
        <span><b>${safe(sequenceStartLabel(x))}</b> <small>${safe(x.start||'')}</small></span>
        <span><b>${safe(x.zEnd||'—')}</b> <small>${safe(x.end||'')}</small></span>
        <span>${safe(sequenceOutcomeLabel(x))}</span>
        <span class="seq-consequence">${safe(sequenceConsequence(x))}</span>
        <span class="${x.valuation==='POSITIVA'?'val-pos':'val-neg'}">${safe(x.valuation||'—')}</span>
      </div>`).join('')}
  </div>`;
}
function scrumTotalHTML(team){
  const t=scrumTotal(team);
  return `<div class="single-rate">${rateTile('TOTAL',t.won,t.total)}</div>`;
}

function stampValue(v){
  const m=String(v||'').match(/([12])T\s+(\d{1,2}):(\d{2})/);
  return m?((Number(m[1])-1)*2400+Number(m[2])*60+Number(m[3])):0;
}
function standalonePenaltyConsequence(row){
  const t=stampValue(row.end||row.start);
  const candidates=(st.closed||[]).slice().reverse().filter(x=>x.origin==='PENAL'&&stampValue(x.start)>=t-2);
  const seq=candidates[0];
  return seq?sequenceConsequence(seq):'—';
}
function penaltyDetailHTML(){
  const closedRows=(st.closed||[]).filter(x=>x.result==='PENAL URU').map(x=>({time:x.end||x.start||'—',meta:x.meta||{},consequence:sequenceConsequence(x)}));
  const startRows=(st.penaltyEvents||[]).filter(x=>x.result==='PENAL URU').map(x=>({time:x.end||x.start||'—',meta:x.meta||{},consequence:standalonePenaltyConsequence(x)}));
  const rows=[...closedRows,...startRows].sort((a,b)=>stampValue(b.time)-stampValue(a.time));
  if(!rows.length)return '<div class="empty-stat">Sin penales URU registrados</div>';
  return `<div class="penalty-detail-table"><div class="penalty-detail-head"><span>MIN</span><span>JUGADOR</span><span>MOTIVO</span><span>CONSECUENCIA</span></div>${rows.map(x=>`<div class="penalty-detail-row"><span>${safe(x.time||'—')}</span><span class="penalty-player">${safe(playerLabel(x.meta||{}))}</span><span>${safe(x.meta?.penaltyReason||'—')}</span><span class="penalty-consequence">${safe(x.consequence||'—')}</span></div>`).join('')}</div>`;
}

function allKickRecords(team='URU'){
  const rows=[];
  (st.closed||[]).forEach(seq=>{
    (seq.events||[]).filter(e=>e.type==='KICK'&&e.team===team).forEach(e=>rows.push({event:e,seq}));
  });
  if(st.sequence){
    (st.sequence.events||[]).filter(e=>e.type==='KICK'&&e.team===team).forEach(e=>rows.push({event:e,seq:st.sequence}));
  }
  return rows;
}
function kickPositive(record){
  const e=record.event,seq=record.seq;
  const rival=(st.opponent||'RIVAL').toUpperCase();
  if(e.kickType==='PASS KICK')return e.outcome==='MANTIENE POSESIÓN';
  if(e.kickType==='A DISPUTAR'){
    return e.outcome==='RECUPERA URU'||e.outcome===`KNOCK ON ${rival}`||e.outcome===`PENAL ${rival}`;
  }
  if(e.kickType==='TERRITORIO'){
    const from=zoneRank(e.zFrom),to=zoneRank(e.zTo||e.z);
    return from!==null&&to!==null&&to>from;
  }
  return seq?.valuation==='POSITIVA';
}
function kickTypeSummaryHTML(){
  const types=['CAJÓN 9','A DISPUTAR','TERRITORIO','TOUCH','PASS KICK','CASUAL'];
  const records=allKickRecords('URU');
  return `<div class="kick-type-grid">${types.map(type=>{
    const rows=records.filter(r=>r.event.kickType===type);
    const positive=rows.filter(kickPositive).length;
    const pctVal=rows.length?Math.round(positive*100/rows.length):null;
    return `<div class="kick-type-card ${rows.length?'has-data':''}">
      <div class="kick-type-name">${safe(type)}</div>
      <div class="kick-type-pct">${pctVal===null?'—':pctVal+'%'}</div>
      <div class="kick-type-count">${positive}/${rows.length} positivos · ${rows.length} kicks</div>
    </div>`;
  }).join('')}</div>`;
}
function zoneRank(z){return {Z1:1,Z2:2,Z3:3,Z4:4,INGOAL:5}[z]||null}
function pingPongRows(){
  const sequences=(st.closed||[]).slice();
  if(st.sequence)sequences.unshift(st.sequence);

  return sequences.map(seq=>{
    const kicks=(seq.events||[]).filter(e=>e.type==='KICK');
    const alternating=kicks.some((e,i)=>i>0&&e.team!==kicks[i-1].team);
    if(kicks.length<2||!alternating)return null;

    const first=kicks[0];
    const last=kicks[kicks.length-1];
    const isOpen=seq===st.sequence;
    const startZone=first.zFrom||seq.zStart||null;

    // While the sequence remains open, identify the exchange but don't score it yet.
    if(isOpen){
      return {seq,result:'EN CURSO',startZone:startZone||'—',endZone:null,kicks:kicks.length,open:true};
    }

    // The ping pong ends at the reception/destination of the LAST kick in the exchange.
    // Actions after that (carry, breakdown, penalty, etc.) may change the sequence valuation,
    // but must not change the territorial result of the ping pong.
    const endZone=last.zTo||last.z||null;
    const startRank=zoneRank(startZone);
    const endRank=zoneRank(endZone);
    let result='SIN EVALUAR';

    if(startRank!==null&&endRank!==null){
      const delta=endRank-startRank;
      if(delta>0)result='POSITIVO';
      else if(delta<0)result='NEGATIVO';
      else result='NEUTRO';
    }

    return {seq,result,startZone,endZone,kicks:kicks.length,open:false};
  }).filter(Boolean);
}
function pingPongSummaryHTML(){
  const rows=pingPongRows();
  const evaluated=rows.filter(x=>['POSITIVO','NEUTRO','NEGATIVO'].includes(x.result));
  const positive=evaluated.filter(x=>x.result==='POSITIVO').length;
  const neutral=evaluated.filter(x=>x.result==='NEUTRO').length;
  const negative=evaluated.filter(x=>x.result==='NEGATIVO').length;
  const inProgress=rows.filter(x=>x.result==='EN CURSO').length;
  const pctVal=evaluated.length?Math.round(positive*100/evaluated.length):null;

  const resultClass=x=>{
    if(x.result==='EN CURSO')return 'ping-progress';
    if(x.result==='SIN EVALUAR')return 'ping-unrated';
    return `ping-${x.result.toLowerCase()}`;
  };

  return `<div class="ping-summary">
    <div class="ping-main">
      <div class="ping-pct">${pctVal===null?'—':pctVal+'%'}</div>
      <div><b>${positive}/${evaluated.length}</b> ping pong positivos${inProgress?` · ${inProgress} en curso`:''}</div>
    </div>
    <div class="ping-result-grid">
      <div><strong>${positive}</strong><span>POSITIVOS</span></div>
      <div><strong>${neutral}</strong><span>NEUTROS</span></div>
      <div><strong>${negative}</strong><span>NEGATIVOS</span></div>
      <div><strong>${evaluated.length}</strong><span>EVALUADOS</span></div>
    </div>
    ${rows.length?`<div class="ping-detail-list">${rows.map(x=>`<div>
      <span>${safe(x.seq.start||'—')}</span>
      <b>${safe(x.startZone||'—')} → ${x.open?'EN CURSO':safe(x.endZone||'—')}</b>
      <span>${x.kicks} kicks</span>
      <em class="${resultClass(x)}">${x.result}</em>
    </div>`).join('')}</div>`:'<div class="empty-stat">Sin ping pong registrados</div>'}
  </div>`;
}
function renderDashboard(){
  const rival=st.opponent||'RIVAL';
  $('#dashView').style.setProperty('--opponent-color',st.opponentColor||'#222222');
  const uEntry=entryStats('URU'),rEntry=entryStats('RIVAL');

  $('#entry22Compare').innerHTML=`<div class="team-compare">
    <div class="team-stat uru">
      <div class="team-stat-name">URU</div>
      <div class="team-stat-main">${uEntry.total}</div>
      <div class="team-stat-caption">entradas</div>
      <div class="team-stat-rate">${uEntry.pct===null?'—':uEntry.pct+'%'} <small>efectividad · ${uEntry.positive}/${uEntry.total} positivas</small></div>
    </div>
    <div class="team-stat rival" style="--team-color:${safe(st.opponentColor)}">
      <div class="team-stat-name">${safe(rival)}</div>
      <div class="team-stat-main">${rEntry.total}</div>
      <div class="team-stat-caption">entradas</div>
      <div class="team-stat-rate">${rEntry.pct===null?'—':rEntry.pct+'%'} <small>efectividad · ${rEntry.positive}/${rEntry.total} positivas</small></div>
    </div>
  </div>`;

  const us=scrumTotal('URU'),rs=scrumTotal('RIVAL');
  $('#scrumCompare').innerHTML=`<div class="team-compare compact">
    <div class="team-stat uru"><div class="team-stat-name">URU</div><div class="team-stat-main">${pctText(us.won,us.total)}</div><div class="team-stat-caption">${us.won}/${us.total} obtenidos</div></div>
    <div class="team-stat rival" style="--team-color:${safe(st.opponentColor)}"><div class="team-stat-name">${safe(rival)}</div><div class="team-stat-main">${pctText(rs.won,rs.total)}</div><div class="team-stat-caption">${rs.won}/${rs.total} obtenidos</div></div>
  </div>`;

  $('#lineZoneCompare').innerHTML=`<div class="compare-team-row"><div class="compare-team-name uru">URU</div>${zoneRateHTML(lineZoneRates('URU'))}</div>
    <div class="compare-team-row"><div class="compare-team-name rival" style="--team-color:${safe(st.opponentColor)}">${safe(rival)}</div>${zoneRateHTML(lineZoneRates('RIVAL'))}</div>`;

  const pm=penaltyMatrix();
  $('#disciplineCompare').innerHTML=`<div class="discipline-grid">
    <div class="discipline-team"><div class="discipline-name">URU</div><div class="discipline-box"><b>${pm.URU.attack}</b><span>ATAQUE</span></div><div class="discipline-box"><b>${pm.URU.defense}</b><span>DEFENSA</span></div><div class="discipline-box total"><b>${pm.URU.attack+pm.URU.defense}</b><span>TOTAL</span></div></div>
    <div class="discipline-team rival" style="--team-color:${safe(st.opponentColor)}"><div class="discipline-name">${safe(rival)}</div><div class="discipline-box"><b>${pm.RIVAL.attack}</b><span>ATAQUE</span></div><div class="discipline-box"><b>${pm.RIVAL.defense}</b><span>DEFENSA</span></div><div class="discipline-box total"><b>${pm.RIVAL.attack+pm.RIVAL.defense}</b><span>TOTAL</span></div></div>
  </div>`;

  $('#breakMaps').innerHTML=breakMapHTML();
  $('#generalPenaltyList').innerHTML=penaltyDetailHTML();

  // ATAQUE: utilización + secuencias completas
  $('#attackLineUtilZones').innerHTML=zoneRateHTML(utilizationRates('URU','LINE'));
  $('#attackScrumUtilZones').innerHTML=zoneRateHTML(utilizationRates('URU','SCRUM'));
  $('#attackReceptionUtilZones').innerHTML=zoneRateHTML(utilizationRates('URU','RECEPCIÓN KICK'));
  $('#attackTurnoverUtilZones').innerHTML=zoneRateHTML(utilizationRates('URU','TURNOVER'));
  $('#attackSequenceExplorer').innerHTML=sequenceExplorerHTML('URU','attackSeq');
  bindSequenceExplorer('attackSeq','URU');

  // DEFENSA: utilización rival + secuencias completas
  $('#defenseLineUtilZones').innerHTML=zoneRateHTML(defensiveUtilizationRates('LINE'));
  $('#defenseScrumUtilZones').innerHTML=zoneRateHTML(defensiveUtilizationRates('SCRUM'));
  $('#defenseReceptionUtilZones').innerHTML=zoneRateHTML(defensiveUtilizationRates('RECEPCIÓN KICK'));
  $('#defenseTurnoverUtilZones').innerHTML=zoneRateHTML(defensiveUtilizationRates('TURNOVER'));
  $('#defenseSequenceExplorer').innerHTML=sequenceExplorerHTML('RIVAL','defenseSeq');
  bindSequenceExplorer('defenseSeq','RIVAL');

  // KICKING GAME
  $('#kickTypeResults').innerHTML=kickTypeSummaryHTML();
  $('#pingPongResults').innerHTML=pingPongSummaryHTML();

  // FORMACIONES FIJAS: solo obtención
  $('#fixedAttackLineMenPct').innerHTML=lineMenHTML('URU');
  $('#fixedAttackLineMissed').innerHTML=missedLineHTML('URU');
  $('#fixedAttackLineZone').innerHTML=zoneRateHTML(lineZoneRates('URU'));
  $('#fixedAttackScrumTotal').innerHTML=scrumTotalHTML('URU');

  $('#fixedDefenseLineMenPct').innerHTML=lineMenHTML('RIVAL');
  $('#fixedDefenseLineMissed').innerHTML=missedLineHTML('RIVAL');
  $('#fixedDefenseLineZone').innerHTML=zoneRateHTML(lineZoneRates('RIVAL'));
  $('#fixedDefenseScrumTotal').innerHTML=scrumTotalHTML('RIVAL');
}
function originMetaHTML(s){if(!s)return '<span>Elegí un origen para iniciar la secuencia.</span>';const items=[];if(s.origin==='LINE')items.push(['CONFIG.',lineStructureLabel(s.meta)],['DÓNDE TIRAMOS',s.meta.throw||'—'],['OBTENCIÓN',s.meta.obtention||'—'],['MAUL',s.meta.maul||'—'],['ZONA INICIO',s.zStart]);else if(s.origin==='SCRUM')items.push(['UBICACIÓN',s.meta.side||'—'],['OBTENCIÓN',s.meta.obtention||'—'],['ZONA INICIO',s.zStart],['POSESIÓN',teamLabel(s.team)]);else if(s.origin==='RECEPCIÓN KICK')items.push(['ORIGEN','RECEPCIÓN'],['ZONA INICIO',s.zStart],['POSESIÓN',teamLabel(s.team)]);else if(s.origin==='TURNOVER')items.push(['ORIGEN','TURNOVER'],['ZONA',s.zStart],['POSESIÓN',teamLabel(s.team)]);else if(s.origin==='TAP PENAL')items.push(['ORIGEN','TAP PENAL'],['ZONA',zoneName(s.zStart)],['POSESIÓN',teamLabel(s.team)]);else if(s.origin==='FREE KICK')items.push(['ORIGEN','FREE KICK'],['ZONA',s.zStart],['A FAVOR',teamLabel(s.team)]);return items.map(([l,v])=>`<div class="origin-meta-item"><div class="origin-meta-label">${safe(l)}</div><div class="origin-meta-value">${safe(v)}</div></div>`).join('')}
function applyRoleUI(){document.body.classList.toggle('viewer-mode',currentRole==='viewer');$('#roleBadge').textContent=currentRole==='viewer'?'MODO ENTRENADOR · SOLO DASHBOARD':currentRole==='editor'?'MODO ANALISTA · EDITOR':'ADMIN';$('#accessBtn').style.display=currentRole==='admin'?'':'none';if(currentRole==='viewer'){$$('.tab').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-selected','false')});const d=$('.tab[data-main="dash"]');d.classList.add('active');d.setAttribute('aria-selected','true');$('#tagView').classList.add('hidden');$('#dashView').classList.remove('hidden')}}
function toggleClosedValuation(index){
  if(currentRole==='viewer')return;
  const seq=st.closed?.[index];
  if(!seq)return;
  const old=seq.valuation;
  const next=old==='POSITIVA'?'NEGATIVA':'POSITIVA';
  if(st.valuation?.[seq.team]){
    st.valuation[seq.team][old]=Math.max(0,(st.valuation[seq.team][old]||0)-1);
    st.valuation[seq.team][next]=(st.valuation[seq.team][next]||0)+1;
  }
  seq.valuation=next;
  save();render();
}
async function editClosedSequence(index){
  if(currentRole==='viewer')return;
  const seq=st.closed?.[index];
  if(!seq)return;

  const events=seq.events||[];
  const hasLine=seq.origin==='LINE';
  const hasScrum=seq.origin==='SCRUM';
  const kicks=events.map((e,i)=>({e,i})).filter(x=>x.e.type==='KICK');
  const breaks=events.map((e,i)=>({e,i})).filter(x=>x.e.type==='QUIEBRE');
  const advantages=events.map((e,i)=>({e,i})).filter(x=>x.e.type==='VENTAJA');

  const choices=['INICIO'];
  if(hasLine)choices.push('DETALLE LINE');
  if(hasScrum)choices.push('DETALLE SCRUM');
  if(kicks.length)choices.push('KICKS');
  if(breaks.length)choices.push('QUIEBRES');
  if(advantages.length)choices.push('VENTAJAS');
  if(events.length)choices.push('BORRAR EVENTO');
  choices.push('FINAL','CANCELAR');

  const what=await flow('EDITAR SECUENCIA · sección',choices);
  if(what==='CANCELAR')return;

  if(what==='INICIO'){
    const field=await flow('EDITAR INICIO',['EQUIPO','ORIGEN','ZONA INICIO']);
    if(field==='EQUIPO'){
      const who=await flow('EDITAR · equipo que inicia',['URU',st.opponent]);
      seq.team=who==='URU'?'URU':'RIVAL';
    }else if(field==='ORIGEN'){
      seq.origin=await flow('EDITAR · origen',['LINE','SCRUM','RECEPCIÓN KICK','TURNOVER','TAP PENAL','FREE KICK','OTRO']);
    }else{
      seq.zStart=await zone('EDITAR · zona de inicio');
    }
  }

  if(what==='DETALLE LINE'){
    const field=await flow('EDITAR LINE',['CONFIGURACIÓN','SALTO','OBTENCIÓN','MAUL']);
    if(field==='CONFIGURACIÓN'){
      const men=await flow('LINE · cantidad base',['3','4','5','6','7']);
      const config=await flow('LINE · configuración',['NORMAL','+1']);
      seq.meta=seq.meta||{};
      seq.meta.men=men;seq.meta.plusOne=config==='+1';seq.meta.lineStructure=seq.meta.plusOne?`${men}+1`:men;
    }else if(field==='SALTO'){
      seq.meta.throw=await flow('LINE · dónde tiramos',['ADELANTE','MEDIO','ATRÁS']);
    }else if(field==='OBTENCIÓN'){
      seq.meta.obtention=await flow('LINE · obtención',['OBTENIDO','NO OBTENIDO']);
    }else if(field==='MAUL'){
      seq.meta.maul=await flow('LINE · maul',['MAUL','NO MAUL','—']);
    }
    const launch=(st.launches||[]).find(x=>x.team===seq.team&&x.type==='LINE'&&x.z===seq.zStart);
    if(launch)Object.assign(launch,{z:seq.zStart,men:seq.meta.men,plusOne:seq.meta.plusOne,lineStructure:seq.meta.lineStructure,throw:seq.meta.throw,obtention:seq.meta.obtention,maul:seq.meta.maul});
  }

  if(what==='DETALLE SCRUM'){
    const field=await flow('EDITAR SCRUM',['UBICACIÓN','OBTENCIÓN']);
    seq.meta=seq.meta||{};
    if(field==='UBICACIÓN')seq.meta.side=await flow('SCRUM · ubicación',['IZQUIERDA','CENTRAL','DERECHA']);
    if(field==='OBTENCIÓN')seq.meta.obtention=await flow('SCRUM · obtención',['OBTENIDO','NO OBTENIDO']);
    const launch=(st.launches||[]).find(x=>x.team===seq.team&&x.type==='SCRUM'&&x.z===seq.zStart);
    if(launch)Object.assign(launch,{z:seq.zStart,side:seq.meta.side,obtention:seq.meta.obtention});
  }

  if(what==='KICKS'){
    let target=kicks[0];
    if(kicks.length>1){
      const labels=kicks.map((x,n)=>`${n+1} · ${x.e.kickType||'KICK'} · ${zoneName(x.e.zFrom)} → ${zoneName(x.e.zTo||x.e.z)}`);
      target=kicks[labels.indexOf(await flow('EDITAR · elegí el kick',labels))];
    }
    if(target){
      const field=await flow('EDITAR KICK',['TIPO','ZONA ORIGEN','ZONA DESTINO','RESULTADO']);
      if(field==='TIPO')target.e.kickType=await flow('EDITAR KICK · tipo',['CAJÓN 9','A DISPUTAR','TERRITORIO','TOUCH','PASS KICK','CASUAL']);
      if(field==='ZONA ORIGEN')target.e.zFrom=await zone('EDITAR KICK · zona origen');
      if(field==='ZONA DESTINO'){const z=await zone('EDITAR KICK · zona destino');target.e.z=z;target.e.zTo=z}
      if(field==='RESULTADO')target.e.outcome=await flow('EDITAR KICK · resultado',['RECIBE URU',`RECIBE ${st.opponent.toUpperCase()}`,'RECUPERA URU',`RECUPERA ${st.opponent.toUpperCase()}`,'TAPPING','KNOCK ON URU',`KNOCK ON ${st.opponent.toUpperCase()}`,'TOUCH','MANTIENE POSESIÓN','CAMBIA POSESIÓN']);
    }
  }

  if(what==='QUIEBRES'){
    let target=breaks[0];
    if(breaks.length>1){
      const labels=breaks.map((x,n)=>`${n+1} · ${zoneName(x.e.z)} · ${x.e.lane||'—'}`);
      target=breaks[labels.indexOf(await flow('EDITAR · elegí el quiebre',labels))];
    }
    if(target){
      const field=await flow('EDITAR QUIEBRE',['ZONA','CARRIL','EQUIPO']);
      if(field==='ZONA')target.e.z=await zone('QUIEBRE · zona');
      if(field==='CARRIL')target.e.lane=await flow('QUIEBRE · carril',['IZQ','CENTRO','DER']);
      if(field==='EQUIPO'){const who=await flow('QUIEBRE · equipo',['URU',st.opponent]);target.e.team=who==='URU'?'URU':'RIVAL'}
    }
  }

  if(what==='VENTAJAS'){
    const target=advantages[0]?.e;
    if(target){
      const field=await flow('EDITAR VENTAJA',['TIPO','BENEFICIARIO','ZONA']);
      if(field==='TIPO')target.advantageType=await flow('VENTAJA · tipo',['PENAL','KNOCK ON']);
      if(field==='BENEFICIARIO'){const who=await flow('VENTAJA · beneficiario',['URU',st.opponent]);target.beneficiary=who==='URU'?'URU':'RIVAL'}
      if(field==='ZONA')target.z=await zone('VENTAJA · zona');
    }
  }

  if(what==='BORRAR EVENTO'){
    const labels=events.map((e,i)=>`${i+1} · ${eventDisplay(e)}`);
    const picked=await flow('BORRAR · elegí evento',labels);
    const idx=labels.indexOf(picked);
    if(idx>=0&&confirm('¿Borrar este evento de la secuencia?'))events.splice(idx,1);
  }

  if(what==='FINAL'){
    const field=await flow('EDITAR FINAL',['RESULTADO','ZONA FINAL','VALORACIÓN']);
    if(field==='RESULTADO')seq.result=await flow('EDITAR · resultado',['TRY','PENAL URU',`PENAL ${st.opponent.toUpperCase()}`,'TURNOVER','KNOCK ON','FORWARD PASS','TOUCH','KICK AL TOUCH','TIRADA TORCIDA','OTRO']).then(v=>v===`PENAL ${st.opponent.toUpperCase()}`?'PENAL RIVAL':v);
    if(field==='ZONA FINAL')seq.zEnd=await zone('EDITAR · zona final');
    if(field==='VALORACIÓN'){
      const old=seq.valuation;
      const val=await flow('EDITAR · valoración',['POSITIVA','NEGATIVA']);
      if(val!==old&&st.valuation?.[seq.team]){
        st.valuation[seq.team][old]=Math.max(0,(st.valuation[seq.team][old]||0)-1);
        st.valuation[seq.team][val]=(st.valuation[seq.team][val]||0)+1;
      }
      seq.valuation=val;
    }
  }
  save();render();
}
function render(){if(!st)return;renderClock();const s=st.sequence,rival=st.opponent||'RIVAL';document.documentElement.style.setProperty('--rival-color',st.opponentColor||'#C8102E');st.score=st.score||{URU:0,RIVAL:0};$('#homeScore').textContent=st.score.URU||0;$('#awayScore').textContent=st.score.RIVAL||0;$('#awayCode').textContent=rival.toUpperCase();$('#awayCode').classList.add('rival-team');$('#currentMatchLabel').textContent=`URU vs ${rival}`;$('#possessionTeam').textContent=teamLabel(st.team);$('#possessionReason').textContent=s?`${s.origin} · ${s.zStart}`:'Sin secuencia activa';$('.possession-banner').classList.toggle('rival-possession',st.team==='RIVAL');$('#sequenceBadge').classList.toggle('hidden',!s);$('#stateTeam').textContent=teamLabel(st.team);$('#stateOrigin').textContent=s?s.origin:'—';$('#stateZone').textContent=s?zoneName(s.zStart):'—';$('#stateStart').textContent=s?s.start:'—';$('#stateEvents').textContent=s&&s.events.length?s.events.map(e=>e.type).join(', '):'—';$('#originMeta').classList.toggle('empty',!s);$('#originMeta').innerHTML=originMetaHTML(s);$('#startLine').classList.toggle('selected',s?.origin==='LINE');$('#startScrum').classList.toggle('selected',s?.origin==='SCRUM');$('#startReception').classList.toggle('selected',s?.origin==='RECEPCIÓN KICK');$('#startPenalty').classList.toggle('selected',s?.origin==='TAP PENAL');$('#startFreeKick').classList.toggle('selected',s?.origin==='FREE KICK');$('#turnover').classList.toggle('selected',s?.origin==='TURNOVER');$('#break').classList.toggle('selected',!!s?.events?.some(e=>e.type==='QUIEBRE'));$('#kick').classList.toggle('selected',!!s?.events?.some(e=>e.type==='KICK'));$('#advantage').classList.toggle('selected',!!s?.advantage);$('#undoAction').disabled=!undoStack.length;
$('#sequenceRows').innerHTML=st.closed.length?st.closed.slice(0,30).map((x,i)=>`<tr><td>${safe(x.end||x.start)}</td><td><span class="team-pill ${x.team==='RIVAL'?'rival':''}"${x.team==='RIVAL'?` style="background:${safe(st.opponentColor)}"`:''}>${safe(teamLabel(x.team))}</span></td><td><b>${safe(originDisplay(x))}</b></td><td>${safe(zoneName(x.zStart))}</td><td>${safe(zoneName(x.zEnd))}</td><td>${safe(penaltyDisplay(x.result))}</td><td><button type="button" class="rating-pill valuation-toggle ${x.valuation==='POSITIVA'?'positive':'negative'}" data-valuation-index="${i}">${safe(x.valuation)}</button></td><td>${x.events.length?x.events.map(e=>safe(eventDisplay(e))).join(', '):'—'}</td><td><button type="button" class="small-btn ghost edit-seq-btn" data-edit-seq="${i}">EDITAR</button></td></tr>`).join(''):'<tr><td colspan="9" class="empty-row">Sin secuencias todavía</td></tr>';
$('#sequenceRows').querySelectorAll('[data-valuation-index]').forEach(b=>b.onclick=()=>toggleClosedValuation(Number(b.dataset.valuationIndex)));
$('#sequenceRows').querySelectorAll('[data-edit-seq]').forEach(b=>b.onclick=()=>editClosedSequence(Number(b.dataset.editSeq)));
renderDashboard();applyRoleUI()}
function download(name,type,text){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function csv(){const rows=[['team','origin','zStart','start','end','result','zEnd','valuation','events']];st.closed.slice().reverse().forEach(x=>rows.push([teamLabel(x.team),x.origin,x.zStart,x.start,x.end,x.result,x.zEnd,x.valuation,x.events.map(e=>e.type).join('|')]));return rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n')}
function onTap(sel,fn){$(sel).addEventListener('click',async e=>{if(currentRole==='viewer')return;if(sel!=='#undoAction'&&sel!=='#voiceTagBtn')pushUndo();flashButton(e.currentTarget);await fn(e.currentTarget)})}
async function roleForMatch(id){const {data,error}=await sb.from('match_users').select('role').eq('match_id',id).eq('user_id',user.id).maybeSingle();if(error)console.warn(error);return data?.role||'viewer'}
function unsubscribe(){if(channel){sb.removeChannel(channel);channel=null}}
function subscribeMatch(id){unsubscribe();channel=sb.channel(`match:${id}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'matches',filter:`id=eq.${id}`},payload=>{const ns=payload.new?.live_state;if(!ns||!st)return;const incoming=Date.parse(ns.updatedAt||0),local=Date.parse(st.updatedAt||0);if(incoming>local||currentRole==='viewer'){st={...defaultState(payload.new.opponent_name,payload.new.opponent_color),...ns,opponent:payload.new.opponent_name,opponentColor:payload.new.opponent_color,running:false};cacheMatch(id,st,{role:currentRole});render();setSync('ACTUALIZADO EN VIVO','ok')}}).subscribe()}
async function openManager(){stopTimer();unsubscribe();activeId=null;localStorage.removeItem(ACTIVE);$('#matchManager').classList.remove('hidden');$('.app-shell').classList.add('manager-open');await renderMatches()}
async function renderMatches(){const box=$('#savedMatches');box.innerHTML='<div class="no-matches">Cargando partidos…</div>';let rows=[];if(navigator.onLine){const {data,error}=await sb.from('matches').select('id,opponent_name,opponent_color,status,updated_at,live_state').order('updated_at',{ascending:false});if(!error&&data)rows=data;else console.warn(error)}if(!rows.length){const c=cacheAll();rows=Object.entries(c).map(([id,v])=>({id,opponent_name:v.meta?.opponent||v.state?.opponent||'RIVAL',opponent_color:v.meta?.opponentColor||v.state?.opponentColor||'#C8102E',updated_at:v.state?.updatedAt,live_state:v.state,_offline:true}))}box.innerHTML=rows.length?rows.map(g=>`<div class="saved-match" style="--match-color:${safe(g.opponent_color||'#C8102E')}"><div class="saved-match-color"></div><div><div class="saved-match-title">URU vs ${safe(g.opponent_name||'RIVAL')}</div><div class="saved-match-meta">${g.live_state?.closed?.length||0} secuencias · ${safe(g.live_state?.period||'1T')} ${fmtSeconds(g.live_state?.seconds||0)}${g._offline?' · OFFLINE':''}</div></div><div class="saved-match-actions"><button type="button" class="saved-match-open" data-open="${safe(g.id)}">ABRIR</button><button type="button" class="small-btn danger match-delete" data-delete="${safe(g.id)}" data-name="${safe(g.opponent_name||'RIVAL')}">ELIMINAR</button></div></div>`).join(''):'<div class="no-matches">Todavía no hay partidos disponibles.</div>';box.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openGame(b.dataset.open));box.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteMatch(b.dataset.delete,b.dataset.name))}
async function deleteMatch(id,name){
  if(!navigator.onLine){alert('Para eliminar definitivamente un partido necesitás conexión.');return}
  if(!confirm(`¿Eliminar definitivamente URU vs ${name}? Esta acción no se puede deshacer.`))return;
  const {error}=await sb.rpc('delete_match',{p_match_id:id});
  if(error){alert('No pude eliminar el partido: '+error.message);return}
  removeCachedMatch(id);
  await renderMatches();
}
async function openGame(id){stopTimer();activeId=id;localStorage.setItem(ACTIVE,id);let row=null;if(navigator.onLine){const {data}=await sb.from('matches').select('*').eq('id',id).maybeSingle();row=data}if(row){currentRole=await roleForMatch(id);st={...defaultState(row.opponent_name,row.opponent_color),...(row.live_state||{}),opponent:row.opponent_name,opponentColor:row.opponent_color,running:false};cacheMatch(id,st,{role:currentRole})}else{const c=getCached(id);if(!c){alert('No pude abrir el partido sin conexión. Abrilo al menos una vez online.');return}currentRole=c.meta?.role||'viewer';st={...defaultState(),...c.state,running:false}}$('#matchManager').classList.add('hidden');$('.app-shell').classList.remove('manager-open');subscribeMatch(id);render();setSync(navigator.onLine?'SINCRONIZADO':'OFFLINE · guardado local',navigator.onLine?'ok':'pending')}
async function createMatch(name,color,roster={}){if(!navigator.onLine){alert('Para crear un partido nuevo necesitás conexión. Después podés taggear offline.');return}const initial=defaultState(name,color);initial.roster=roster||{};const {data,error}=await sb.from('matches').insert({created_by:user.id,opponent_name:name,opponent_color:color,live_state:initial}).select().single();if(error){alert('No pude crear el partido: '+error.message);return}await openGame(data.id)}
async function showAccess(){if(currentRole!=='admin')return;$('#accessModal').classList.remove('hidden');await loadMembers()}
async function loadMembers(){const box=$('#memberList');box.innerHTML='<div class="no-matches">Cargando…</div>';const {data,error}=await sb.rpc('get_match_members',{p_match_id:activeId});if(error){box.innerHTML=`<div class="no-matches">${safe(error.message)}</div>`;return}box.innerHTML=(data||[]).map(m=>`<div class="member-row"><div><div class="member-email">${safe(m.email)}</div><div class="member-role">${safe(m.role)}</div></div><div class="member-actions">${m.user_id!==user.id?`<button type="button" class="small-btn danger" data-remove="${m.user_id}">QUITAR</button>`:''}</div></div>`).join('')||'<div class="no-matches">Sin usuarios.</div>';box.querySelectorAll('[data-remove]').forEach(b=>b.onclick=async()=>{if(!confirm('¿Quitar acceso a este usuario?'))return;const {error}=await sb.rpc('remove_match_member',{p_match_id:activeId,p_user_id:b.dataset.remove});if(error)alert(error.message);else loadMembers()})}


function demoState(){
  const d=defaultState('ENG','#C8102E');
  d.period='2T';d.seconds=2360;d.score={URU:23,RIVAL:31};
  d.roster={};for(let i=1;i<=23;i++)d.roster[String(i)]=`Jugador URU ${i}`;
  const closed=[];let t=180;
  const tm=n=>`${n<2400?'1T':'2T'} ${String(Math.floor((n%2400)/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
  const add=(team,origin,zStart,zEnd,result,valuation,meta={},events=[])=>{closed.push({team,origin,zStart,zEnd,result,valuation,meta,events,start:tm(t),end:tm(t+38)});t+=92};
  const line=(team,z,men,thr,obt,maul,result,zEnd,val,events=[])=>{d.launches.push({team,type:'LINE',z,men:String(men),throw:thr,obtention:obt,maul});add(team,'LINE',z,zEnd,result,val,{men:String(men),throw:thr,obtention:obt,maul,entry22Counted:(team==='URU'?z==='Z4'||zEnd==='Z4'||zEnd==='INGOAL':z==='Z1'||zEnd==='Z1'||zEnd==='INGOAL')},events)};
  const scrum=(team,z,side,obt,result,zEnd,val,meta={})=>{d.launches.push({team,type:'SCRUM',z,side,obtention:obt});add(team,'SCRUM',z,zEnd,result,val,{side,obtention:obt,entry22Counted:(team==='URU'?z==='Z4'||zEnd==='Z4':z==='Z1'||zEnd==='Z1'),...meta})};
  // URU set piece
  line('URU','Z1',5,'MEDIO','OBTENIDO','NO MAUL','TOUCH','Z2','POSITIVA');
  line('URU','Z2',5,'ATRÁS','OBTENIDO','MAUL','PENAL RIVAL','Z3','POSITIVA');
  line('URU','Z3',7,'MEDIO','OBTENIDO','NO MAUL','OTRO','Z4','POSITIVA',[{type:'QUIEBRE',z:'Z4',lane:'CENTRO'}]);
  line('URU','Z4',5,'ATRÁS','OBTENIDO','MAUL','TRY','INGOAL','POSITIVA',[{type:'CONVERSIÓN',outcome:'CONVERTIDA +2'}]);
  line('URU','Z3',5,'ADELANTE','NO OBTENIDO','—','NO OBTENIDO','Z3','NEGATIVA');
  line('URU','Z4',6,'MEDIO','OBTENIDO','NO MAUL','KNOCK ON','Z4','NEGATIVA');
  scrum('URU','Z2','CENTRO','OBTENIDO','OTRO','Z3','POSITIVA');
  scrum('URU','Z3','IZQUIERDA','OBTENIDO','PENAL RIVAL','Z4','POSITIVA');
  scrum('URU','Z4','DERECHA','NO OBTENIDO','PENAL URU','Z4','NEGATIVA',{penaltyReason:'SCRUM',penaltyJersey:'3',penaltyPlayer:d.roster['3']});
  // ENG set piece / defense sequences
  line('RIVAL','Z4',5,'MEDIO','OBTENIDO','NO MAUL','TOUCH','Z3','NEGATIVA');
  line('RIVAL','Z2',7,'ATRÁS','OBTENIDO','MAUL','OTRO','Z1','POSITIVA',[{type:'QUIEBRE',z:'Z1',lane:'DER'}]);
  line('RIVAL','Z1',5,'MEDIO','OBTENIDO','MAUL','TRY','INGOAL','POSITIVA',[{type:'CONVERSIÓN',outcome:'CONVERTIDA +2'}]);
  line('RIVAL','Z1',6,'ADELANTE','NO OBTENIDO','—','NO OBTENIDO','Z1','NEGATIVA');
  scrum('RIVAL','Z3','DERECHA','OBTENIDO','OTRO','Z2','POSITIVA');
  scrum('RIVAL','Z2','CENTRO','OBTENIDO','PENAL URU','Z1','POSITIVA',{penaltyReason:'SCRUM',penaltyJersey:'1',penaltyPlayer:d.roster['1']});
  scrum('RIVAL','Z1','IZQUIERDA','OBTENIDO','TRY','INGOAL','POSITIVA');closed[closed.length-1].events.push({type:'CONVERSIÓN',outcome:'ERRADA'});
  // receptions, kicks and ping-pong
  add('URU','RECEPCIÓN KICK','Z1','Z3','TOUCH','POSITIVA',{},{type:'KICK'});closed[closed.length-1].events=[{type:'KICK',team:'URU',kickType:'TERRITORIO',z:'Z2',outcome:'OTRO KICK / PING PONG'},{type:'KICK',team:'RIVAL',kickType:'TERRITORIO',z:'Z3',outcome:'OTRO KICK / PING PONG'},{type:'KICK',team:'URU',kickType:'TOUCH',z:'Z3',outcome:'TOUCH',touchMode:'DIRECTO AL TOUCH'}];
  add('RIVAL','RECEPCIÓN KICK','Z4','Z2','TOUCH','POSITIVA',{},[{type:'KICK',team:'RIVAL',kickType:'CAJÓN 9',z:'Z3',outcome:'RECIBE URU'}]);
  add('URU','RECEPCIÓN KICK','Z2','Z4','PENAL RIVAL','POSITIVA',{entry22Counted:true},[{type:'KICK',team:'URU',kickType:'A DISPUTAR',z:'Z3',outcome:'RECUPERA URU'},{type:'QUIEBRE',z:'Z4',lane:'IZQ'}]);
  add('RIVAL','RECEPCIÓN KICK','Z4','Z1','PENAL URU','POSITIVA',{entry22Counted:true,penaltyReason:'OFFSIDE',penaltyJersey:'11',penaltyPlayer:d.roster['11']},[{type:'KICK',team:'RIVAL',kickType:'PASS KICK',z:'Z2',outcome:'MANTIENE POSESIÓN'},{type:'QUIEBRE',z:'Z1',lane:'CENTRO'}]);
  // penalty chains and points
  add('URU','TURNOVER','Z2','Z3','PENAL RIVAL','POSITIVA',{},[{type:'QUIEBRE',z:'Z3',lane:'DER'}]);
  line('URU','Z3',5,'MEDIO','OBTENIDO','NO MAUL','OTRO','Z4','POSITIVA');
  add('RIVAL','TURNOVER','Z3','Z2','PENAL URU','NEGATIVA',{penaltyReason:'BREAKDOWN · DE COSTADO',penaltyJersey:'7',penaltyPlayer:d.roster['7']},[]);
  line('RIVAL','Z1',5,'ATRÁS','OBTENIDO','MAUL','OTRO','Z1','NEGATIVA');
  add('RIVAL','TURNOVER','Z2','Z2','PENAL URU','NEGATIVA',{penaltyReason:'NO SALE TACKLEADOR',penaltyJersey:'2',penaltyPlayer:d.roster['2']},[{type:'PENAL A PALOS',outcome:'CONVERTIDO +3'}]);
  add('URU','PENAL','Z3','Z4','TOUCH','POSITIVA',{penaltyBy:'RIVAL',beneficiary:'URU'},[]);
  line('URU','Z4',5,'MEDIO','OBTENIDO','MAUL','TRY','INGOAL','POSITIVA',[{type:'CONVERSIÓN',outcome:'ERRADA'}]);
  add('RIVAL','PENAL','Z2','Z1','TOUCH','POSITIVA',{penaltyBy:'URU',beneficiary:'RIVAL',penaltyReason:'OFFSIDE',penaltyJersey:'12',penaltyPlayer:d.roster['12']},[]);
  line('RIVAL','Z1',5,'MEDIO','OBTENIDO','MAUL','TRY','INGOAL','POSITIVA',[{type:'CONVERSIÓN',outcome:'CONVERTIDA +2'}]);
  // other origins
  add('URU','FREE KICK','Z2','Z3','TOUCH','POSITIVA',{},[]);
  add('RIVAL','FREE KICK','Z3','Z2','KNOCK ON','NEGATIVA',{},[]);
  add('URU','TURNOVER','Z3','Z4','OTRO','POSITIVA',{entry22Counted:true},[{type:'QUIEBRE',z:'Z4',lane:'CENTRO'}]);
  add('RIVAL','TURNOVER','Z2','Z1','OTRO','POSITIVA',{entry22Counted:true},[{type:'QUIEBRE',z:'Z1',lane:'IZQ'}]);
  // explicit penalties list for standalone starts
  d.penaltyEvents=[
    {result:'PENAL URU',committedBy:'URU',previousTeam:'RIVAL',start:'2T 22:10',end:'2T 22:10',meta:{penaltyReason:'OFFSIDE',penaltyJersey:'12',penaltyPlayer:d.roster['12']}},
    {result:'PENAL RIVAL',committedBy:'RIVAL',previousTeam:'URU',start:'2T 18:20',end:'2T 18:20',meta:{}}
  ];
  d.closed=closed.reverse();
  d.breaks={URU:4,RIVAL:4};
  d.entries={URU:d.closed.filter(x=>x.team==='URU'&&x.meta?.entry22Counted).length,RIVAL:d.closed.filter(x=>x.team==='RIVAL'&&x.meta?.entry22Counted).length};
  d.penalties={attackURU:2,defenseURU:4};
  d.penaltyReasons={attackURU:{SCRUM:1},defenseURU:{OFFSIDE:2,'BREAKDOWN · DE COSTADO':1,'NO SALE TACKLEADOR':1}};
  d.penaltyJerseys={'1':1,'2':1,'3':1,'7':1,'11':1,'12':1};
  d.scoreEvents=[{team:'URU',points:5,kind:'TRY',origin:'LINE'},{team:'URU',points:2,kind:'CONVERSIÓN',origin:'LINE'},{team:'RIVAL',points:5,kind:'TRY',origin:'LINE'},{team:'RIVAL',points:2,kind:'CONVERSIÓN',origin:'LINE'},{team:'RIVAL',points:3,kind:'PENAL A PALOS',origin:'TURNOVER'}];
  return d;
}
async function createDemoMatch(){
  if(!navigator.onLine){alert('Para crear el partido ficticio necesitás conexión.');return}
  const initial=demoState();
  const {data,error}=await sb.from('matches').insert({
    created_by:user.id,
    opponent_name:'ENG',
    opponent_color:'#C8102E',
    live_state:initial,
    uru_score:23,
    opponent_score:31
  }).select().single();
  if(error){alert('No pude crear el partido ficticio: '+error.message);return}
  await openGame(data.id);
}
async function boot(){onlineUI();const {data:{session}}=await sb.auth.getSession();user=session?.user||null;if(!user){$('#authScreen').classList.remove('hidden');$('#matchManager').classList.add('hidden');$('.app-shell').classList.add('manager-open');return}$('#authScreen').classList.add('hidden');await openManager();if(activeId){/* openManager clears it by design */}}
$('#authForm').addEventListener('submit',async e=>{e.preventDefault();$('#authMessage').textContent='Ingresando…';const email=$('#authEmail').value.trim(),password=$('#authPassword').value;const {data,error}=await sb.auth.signInWithPassword({email,password});if(error){$('#authMessage').textContent=error.message;return}user=data.user;$('#authScreen').classList.add('hidden');await openManager()});
$('#signUpBtn').addEventListener('click',async()=>{const email=$('#authEmail').value.trim(),password=$('#authPassword').value;if(!email||password.length<6){$('#authMessage').textContent='Ingresá email y una contraseña de al menos 6 caracteres.';return}$('#authMessage').textContent='Creando cuenta…';const {data,error}=await sb.auth.signUp({email,password});if(error){$('#authMessage').textContent=error.message;return}if(data.session){user=data.user;$('#authScreen').classList.add('hidden');await openManager()}else $('#authMessage').textContent='Cuenta creada. Revisá tu email para confirmar y después ingresá.'});
$('#signOutBtn').addEventListener('click',async()=>{stopTimer();unsubscribe();await sb.auth.signOut();user=null;activeId=null;$('#matchManager').classList.add('hidden');$('#authScreen').classList.remove('hidden')});
$('#newMatchForm').addEventListener('submit',async e=>{e.preventDefault();const name=$('#opponentName').value.trim();if(!name)return;const roster=parseRoster($('#rosterInput').value);await createMatch(name,selectedColor,roster);$('#opponentName').value='';$('#rosterInput').value=''});
$('#createDemoMatch').onclick=createDemoMatch;
$$('.color-swatch').forEach(b=>b.onclick=()=>{selectedColor=b.dataset.color;$('#opponentColor').value=selectedColor;$$('.color-swatch').forEach(x=>x.classList.toggle('selected',x===b))});$('#opponentColor').oninput=e=>{selectedColor=e.target.value;$$('.color-swatch').forEach(x=>x.classList.remove('selected'))};
$('#backToMatches').onclick=openManager;$('#accessBtn').onclick=showAccess;$('#closeAccess').onclick=()=>$('#accessModal').classList.add('hidden');$('#shareForm').addEventListener('submit',async e=>{e.preventDefault();const email=$('#shareEmail').value.trim(),role=$('#shareRole').value;$('#shareMessage').textContent='Dando acceso…';const {error}=await sb.rpc('share_match_by_email',{p_match_id:activeId,p_email:email,p_role:role});if(error){$('#shareMessage').textContent=error.message.includes('USER_NOT_FOUND')?'Ese email todavía no creó una cuenta en Los Teros Live. Pedile que se registre primero.':error.message;return}$('#shareMessage').textContent='Acceso otorgado.';$('#shareEmail').value='';loadMembers()});
$('#startClock').onclick=startTimer;$('#endClock').onclick=stopTimer;$('#adjustClock').onclick=()=>{if(currentRole==='viewer')return;pushUndo();const raw=prompt('Tiempo actual (mm:ss)');if(!raw)return;const p=raw.split(':');st.seconds=(parseInt(p[0]||'0',10)*60)+parseInt(p[1]||'0',10);render();save()};$('#period1').onclick=()=>{if(currentRole==='viewer')return;pushUndo();stopTimer();st.period='1T';st.seconds=0;render();save()};$('#period2').onclick=()=>{if(currentRole==='viewer')return;pushUndo();stopTimer();st.period='2T';st.seconds=0;render();save()};$('#manualPossession').onclick=()=>{if(currentRole==='viewer')return;pushUndo();st.team=other(st.team);render();save()};
onTap('#startPenalty',async()=>{
  if(!(await ensureClock())||!(await canStart()))return;
  const beneficiary=await flow('TAP PENAL · quién reinicia',['URU',st.opponent]);
  const z=await zone('TAP PENAL · zona');
  st.team=beneficiary==='URU'?'URU':'RIVAL';
  openSeq('TAP PENAL',z,{beneficiary:st.team});
});

onTap('#startFreeKick',async()=>{
  if(!(await ensureClock())||!(await canStart()))return;
  const beneficiary=await flow('FREE KICK · a favor de quién',['URU',st.opponent]);
  const z=await zone('FREE KICK · zona');
  st.team=beneficiary==='URU'?'URU':'RIVAL';
  openSeq('FREE KICK',z,{beneficiary:st.team});
});

onTap('#startLine',async()=>{
  if(!(await ensureClock())||!(await canStart()))return;
  const z=await zone('LINE · zona de inicio');
  const men=await flow('LINE · cantidad base de hombres',['3','4','5','6','7']);
  const config=await flow(`LINE · ${men} · configuración`,['NORMAL','+1']);
  const plusOne=config==='+1';
  const lineStructure=plusOne?`${men}+1`:`${men}`;
  const thr=await flow('LINE · dónde tiramos',['ADELANTE','MEDIO','ATRÁS']);
  const obtention=await flow('LINE · obtención',['OBTENIDO','NO OBTENIDO']);
  const baseMeta={men,plusOne,lineStructure,throw:thr,obtention};
  if(obtention==='NO OBTENIDO'){
    openSeq('LINE',z,{...baseMeta,maul:'—'});
    st.launches.push({team:st.team,type:'LINE',z,...baseMeta,maul:'—'});
    await resolveSetPieceNotObtained('LINE',z);
    return
  }
  const maul=await flow('LINE · ¿hay maul?',['MAUL','NO MAUL']);
  openSeq('LINE',z,{...baseMeta,maul});
  st.launches.push({team:st.team,type:'LINE',z,...baseMeta,maul});
  save();render()
});
onTap('#startScrum',async()=>{if(!(await ensureClock())||!(await canStart()))return;const z=await zone('SCRUM · zona de inicio'),side=await flow('SCRUM · ubicación',['IZQUIERDA','CENTRO','DERECHA']),obtention=await flow('SCRUM · obtención',['OBTENIDO','NO OBTENIDO']);if(obtention==='NO OBTENIDO'){openSeq('SCRUM',z,{side,obtention});st.launches.push({team:st.team,type:'SCRUM',z,side,obtention});await resolveSetPieceNotObtained('SCRUM',z);return}openSeq('SCRUM',z,{side,obtention});st.launches.push({team:st.team,type:'SCRUM',z,side,obtention});save();render()});
onTap('#startReception',async()=>{if(!(await ensureClock())||!(await canStart()))return;const z=await zone('RECEPCIÓN KICK · zona');openSeq('RECEPCIÓN KICK',z)});
function rosterChoices(){
  const rows=Object.entries(st.roster||{}).sort((a,b)=>Number(a[0])-Number(b[0]));
  return rows.length?rows.map(([n,name])=>`#${n} · ${name}`):Array.from({length:23},(_,i)=>`#${i+1}`);
}
function rosterChoiceData(label){
  const m=String(label||'').match(/^#(\d+)/);
  const jersey=m?m[1]:'';
  return {jersey,player:st.roster?.[jersey]||null};
}

/* =========================================================
   V40 · Voice tagging MVP
   Browser SpeechRecognition/webkitSpeechRecognition.
   Voice never writes directly: transcribe -> parse -> preview -> APPLY.
   ========================================================= */
let voiceRecognition=null,voiceDraft=null,voiceListening=false;

function voiceNorm(text){
  return String(text||'').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[.,;:!?]/g,' ').replace(/\s+/g,' ').trim();
}
function voiceHas(t,...words){return words.some(w=>t.includes(voiceNorm(w)))}
function voiceTeamFromText(t){
  const rival=voiceNorm(st?.opponent||'rival');
  if(voiceHas(t,'uruguay','uru','teros'))return 'URU';
  if(rival&&t.includes(rival))return 'RIVAL';
  if(voiceHas(t,'rival','oponente'))return 'RIVAL';
  return null;
}
function voiceZoneMatches(text){
  const t=voiceNorm(text);
  const patterns=[
    ['Z1',['extrema defensa','zona 1','zona uno','z1']],
    ['Z2',['gestacion def','gestacion defensiva','zona 2','zona dos','z2']],
    ['Z3',['gestacion of','gestacion ofensiva','zona 3','zona tres','z3']],
    ['Z4',['zona garra','zona 4','zona cuatro','z4']]
  ];
  const hits=[];
  patterns.forEach(([z,arr])=>arr.forEach(p=>{
    let at=t.indexOf(p);
    while(at>=0){hits.push({z,at});at=t.indexOf(p,at+p.length)}
  }));
  return hits.sort((a,b)=>a.at-b.at).map(x=>x.z);
}
function voiceNumber(t,min=1,max=23){
  const words={uno:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,diecisiete:17,dieciocho:18,diecinueve:19,veinte:20,veintiuno:21,veintidos:22,veintitres:23};
  const digit=t.match(/\b(\d{1,2})\b/);
  if(digit){const n=Number(digit[1]);if(n>=min&&n<=max)return String(n)}
  for(const [w,n] of Object.entries(words))if(new RegExp(`\\b${w}\\b`).test(t)&&n>=min&&n<=max)return String(n);
  return null;
}
function voiceLineMen(t){
  const m=t.match(/\b([3-7])\s*(?:\+\s*1|mas uno)?\b/);
  if(m)return {men:m[1],plusOne:/\+\s*1|mas uno/.test(m[0])};
  const map={tres:'3',cuatro:'4',cinco:'5',seis:'6',siete:'7'};
  for(const [w,n] of Object.entries(map)){
    if(new RegExp(`\\b${w}\\b`).test(t))return {men:n,plusOne:voiceHas(t,'mas uno','+1')};
  }
  return {men:null,plusOne:false};
}
function voiceSummary(cmd){
  if(!cmd)return 'No pude interpretar la frase.';
  const bits=[cmd.type];
  if(cmd.team)bits.push(teamLabel(cmd.team));
  if(cmd.zone)bits.push(zoneName(cmd.zone));
  if(cmd.men)bits.push(cmd.plusOne?`${cmd.men}+1`:cmd.men);
  if(cmd.throw)bits.push(cmd.throw);
  if(cmd.obtention)bits.push(cmd.obtention);
  if(cmd.maul)bits.push(cmd.maul);
  if(cmd.side)bits.push(cmd.side);
  if(cmd.kickType)bits.push(cmd.kickType);
  if(cmd.zFrom||cmd.zTo)bits.push(`${zoneName(cmd.zFrom||currentBallZone())} → ${zoneName(cmd.zTo)}`);
  if(cmd.outcome)bits.push(cmd.outcome);
  if(cmd.reason)bits.push(cmd.reason);
  if(cmd.jersey)bits.push(`#${cmd.jersey}`);
  if(cmd.lane)bits.push(cmd.lane);
  return bits.filter(Boolean).join(' · ');
}
function parseVoiceCommand(raw){
  const t=voiceNorm(raw);
  const zones=voiceZoneMatches(raw);
  const team=voiceTeamFromText(t);

  if(voiceHas(t,'line','lineout')){
    const lm=voiceLineMen(t);
    return {type:'LINE',team,zone:zones[0]||null,men:lm.men,plusOne:lm.plusOne,
      throw:voiceHas(t,'adelante')?'ADELANTE':voiceHas(t,'medio','mitad')?'MEDIO':voiceHas(t,'atras','fondo')?'ATRÁS':null,
      obtention:voiceHas(t,'no obtenido','perdido','pierde')?'NO OBTENIDO':voiceHas(t,'obtenido','ganado','gana')?'OBTENIDO':null,
      maul:voiceHas(t,'no maul','sin maul')?'NO MAUL':voiceHas(t,'maul')?'MAUL':null};
  }
  if(voiceHas(t,'scrum')){
    return {type:'SCRUM',team,zone:zones[0]||null,
      side:voiceHas(t,'izquierda')?'IZQUIERDA':voiceHas(t,'derecha')?'DERECHA':voiceHas(t,'centro','central')?'CENTRAL':null,
      obtention:voiceHas(t,'no obtenido','perdido','pierde')?'NO OBTENIDO':voiceHas(t,'obtenido','ganado','gana')?'OBTENIDO':null};
  }
  if(voiceHas(t,'recepcion kick','recepcion de kick','recibe kick')){
    return {type:'RECEPCIÓN KICK',team,zone:zones[0]||null};
  }
  if(voiceHas(t,'tap penal','tap de penal')){
    return {type:'TAP PENAL',team,zone:zones[0]||null};
  }
  if(voiceHas(t,'free kick')){
    return {type:'FREE KICK',team,zone:zones[0]||null};
  }
  if(voiceHas(t,'kick','patada','patea')){
    let kickType=voiceHas(t,'cajon')?'CAJÓN 9':voiceHas(t,'disputar')?'A DISPUTAR':voiceHas(t,'pass kick','pase kick')?'PASS KICK':voiceHas(t,'touch')?'TOUCH':voiceHas(t,'territorio','territorial')?'TERRITORIO':'CASUAL';
    let outcome=null,recipient=null;
    const rival=voiceNorm(st?.opponent||'rival');
    if(voiceHas(t,'knock on','knockon','ko '))outcome='KNOCK ON';
    else if(voiceHas(t,'tapping'))outcome='TAPPING';
    else if(voiceHas(t,'touch','afuera'))outcome='TOUCH';
    else if(voiceHas(t,'recupera uruguay','recupera uru')){outcome='RECUPERA URU';recipient='URU'}
    else if(rival&&t.includes(`recupera ${rival}`)){outcome=`RECUPERA ${st.opponent.toUpperCase()}`;recipient='RIVAL'}
    else if(voiceHas(t,'recibe uruguay','agarra uruguay','recibe uru','agarra uru')){outcome='RECIBE URU';recipient='URU'}
    else if(rival&&(t.includes(`recibe ${rival}`)||t.includes(`agarra ${rival}`))){outcome=`RECIBE ${st.opponent.toUpperCase()}`;recipient='RIVAL'}
    return {type:'KICK',team:st.team,kickType,zFrom:zones.length>1?zones[0]:currentBallZone(),zTo:zones.length>1?zones[zones.length-1]:(zones[0]||null),outcome,recipient};
  }
  if(voiceHas(t,'quiebre','break')){
    return {type:'QUIEBRE',team:team||st.team,zone:zones[0]||null,
      lane:voiceHas(t,'izquierda')?'IZQ':voiceHas(t,'derecha')?'DER':voiceHas(t,'centro','central')?'CENTRO':null};
  }
  if(voiceHas(t,'turnover','recuperacion')){
    return {type:'TURNOVER',team:team||other(st.team),zone:zones[0]||currentBallZone()};
  }
  if(voiceHas(t,'try','ensayo')){
    return {type:'TRY',team:team||st.team};
  }
  if(voiceHas(t,'penal')){
    const committedBy=team||null;
    const reason=voiceHas(t,'pesca')?'PESCA':voiceHas(t,'de cabeza')?'BREAKDOWN · DE CABEZA':voiceHas(t,'de costado')?'BREAKDOWN · DE COSTADO':voiceHas(t,'offside')?'OFFSIDE':voiceHas(t,'no release')?'NO RELEASE':voiceHas(t,'no sale tackleador')?'NO SALE TACKLEADOR':voiceHas(t,'maul')?'MAUL':voiceHas(t,'scrum')?'SCRUM':voiceHas(t,'line')?'LINE':null;
    return {type:'PENAL',committedBy,zone:zones[0]||currentBallZone(),reason,jersey:voiceNumber(t,1,23)};
  }
  if(voiceHas(t,'fin secuencia','fin de secuencia')){
    return {type:'FIN'};
  }
  return null;
}
async function applyVoiceCommand(cmd){
  if(!cmd)return;
  if(!(await ensureClock()))return;

  if(cmd.type==='LINE'){
    if(!(await canStart()))return;
    if(cmd.team)st.team=cmd.team;
    const z=cmd.zone||await zone('VOZ · LINE · zona');
    const men=cmd.men||await flow('VOZ · LINE · hombres',['3','4','5','6','7']);
    const plusOne=cmd.plusOne||false;
    const thr=cmd.throw||await flow('VOZ · LINE · salto',['ADELANTE','MEDIO','ATRÁS']);
    const obtention=cmd.obtention||await flow('VOZ · LINE · obtención',['OBTENIDO','NO OBTENIDO']);
    const lineStructure=plusOne?`${men}+1`:men;
    const meta={men,plusOne,lineStructure,throw:thr,obtention,maul:cmd.maul||'—'};
    if(obtention==='OBTENIDO'&&!cmd.maul)meta.maul=await flow('VOZ · LINE · maul',['MAUL','NO MAUL']);
    openSeq('LINE',z,meta);st.launches.push({team:st.team,type:'LINE',z,...meta});save();render();
    if(obtention==='NO OBTENIDO')await resolveSetPieceNotObtained('LINE',z);
    return;
  }
  if(cmd.type==='SCRUM'){
    if(!(await canStart()))return;
    if(cmd.team)st.team=cmd.team;
    const z=cmd.zone||await zone('VOZ · SCRUM · zona');
    const side=cmd.side||await flow('VOZ · SCRUM · ubicación',['IZQUIERDA','CENTRAL','DERECHA']);
    const obtention=cmd.obtention||await flow('VOZ · SCRUM · obtención',['OBTENIDO','NO OBTENIDO']);
    openSeq('SCRUM',z,{side,obtention});st.launches.push({team:st.team,type:'SCRUM',z,side,obtention});save();render();
    if(obtention==='NO OBTENIDO')await resolveSetPieceNotObtained('SCRUM',z);
    return;
  }
  if(['RECEPCIÓN KICK','TAP PENAL','FREE KICK'].includes(cmd.type)){
    if(!(await canStart()))return;
    if(cmd.team)st.team=cmd.team;
    openSeq(cmd.type,cmd.zone||await zone(`VOZ · ${cmd.type} · zona`));
    return;
  }
  if(cmd.type==='KICK'){
    if(!st.sequence){alert('Primero tiene que haber una secuencia abierta.');return}
    pushUndo();
    const z=cmd.zTo||await zone('VOZ · KICK · zona destino');
    const data={team:st.team,kickType:cmd.kickType||'CASUAL',z,zFrom:cmd.zFrom||currentBallZone(),zTo:z,outcome:cmd.outcome};
    if(!data.outcome)data.outcome=await flow('VOZ · KICK · resultado',['RECIBE URU',`RECIBE ${st.opponent.toUpperCase()}`,'TAPPING','KNOCK ON','TOUCH']);
    if(data.outcome==='TAPPING'){
      const who=await flow('VOZ · TAPPING · posesión',['URU',st.opponent]);data.tappingTeam=who==='URU'?'URU':'RIVAL';
    }
    if(data.outcome==='KNOCK ON'){
      const who=await flow('VOZ · KO · de quién',['URU',st.opponent]);data.knockOnTeam=who==='URU'?'URU':'RIVAL';data.outcome=data.knockOnTeam==='URU'?'KNOCK ON URU':`KNOCK ON ${st.opponent.toUpperCase()}`;
    }
    st.sequence.events.push({type:'KICK',time:stamp(),...data});maybeCountEntry22(z);
    if(data.outcome==='TOUCH'){save();render();await resolveWithAdvantage('KICK AL TOUCH',z);return}
    if(data.outcome==='KNOCK ON URU'||data.outcome===`KNOCK ON ${st.opponent.toUpperCase()}`){
      const next=data.outcome==='KNOCK ON URU'?'RIVAL':'URU';save();render();await resolveWithAdvantage('KNOCK ON',z,{nextTeam:next});return
    }
    applyKickPossession(data);Object.assign(st.sequence.events[st.sequence.events.length-1],data);save();render();return;
  }
  if(cmd.type==='QUIEBRE'){
    if(!st.sequence){alert('Primero tiene que haber una secuencia abierta.');return}
    pushUndo();const team=cmd.team||st.team;const z=cmd.zone||await zone('VOZ · QUIEBRE · zona');const lane=cmd.lane||await flow('VOZ · QUIEBRE · carril',['IZQ','CENTRO','DER']);
    st.breaks[team]=(st.breaks[team]||0)+1;addEvent('QUIEBRE',{team,z,lane});return;
  }
  if(cmd.type==='TURNOVER'){
    const z=cmd.zone||currentBallZone()||await zone('VOZ · TURNOVER · zona');
    if(st.sequence)await resolveTerminal('TURNOVER',z,{nextTeam:other(st.team)});else{st.team=other(st.team);openSeq('TURNOVER',z)}
    return;
  }
  if(cmd.type==='TRY'){
    if(!st.sequence){alert('Primero tiene que haber una secuencia abierta.');return}
    if(cmd.team)st.team=cmd.team;
    await resolveTerminal('TRY','INGOAL');return;
  }
  if(cmd.type==='PENAL'){
    if(!st.sequence){alert('Para este MVP, registrá el penal desde una secuencia abierta.');return}
    const committed=cmd.committedBy||await flow('VOZ · PENAL · quién lo cometió',['URU',st.opponent]);
    const result=committed==='URU'?'PENAL URU':'PENAL RIVAL';
    if(result==='PENAL URU'){
      const reason=cmd.reason||await flow('VOZ · PENAL URU · motivo',['PESCA','BREAKDOWN · DE CABEZA','BREAKDOWN · DE COSTADO','OFFSIDE','NO RELEASE','NO SALE TACKLEADOR','SCRUM','MAUL','LINE','OTRO']);
      const jersey=cmd.jersey||await flow('VOZ · PENAL URU · dorsal',Array.from({length:23},(_,i)=>String(i+1)));
      st.sequence.meta={...(st.sequence.meta||{}),penaltyReason:reason,penaltyJersey:jersey,penaltyPlayer:st.roster?.[String(jersey)]||null};
    }
    await resolveTerminal(result,cmd.zone||currentBallZone()||await zone('VOZ · PENAL · zona'));return;
  }
  if(cmd.type==='FIN'){
    alert('Decí también cómo terminó: try, penal, turnover, knock on o touch.');return;
  }
}
function setVoiceDraft(raw){
  $('#voiceTranscript').textContent=raw||'—';
  voiceDraft=parseVoiceCommand(raw);
  $('#voiceParsed').textContent=voiceDraft?voiceSummary(voiceDraft):'No pude interpretar la jugada. Probá de nuevo o usá el tagging manual.';
  $('#voiceApply').disabled=!voiceDraft;
}
function voiceSupported(){return !!(window.SpeechRecognition||window.webkitSpeechRecognition)}
function stopVoice(){
  voiceListening=false;
  if(voiceRecognition){try{voiceRecognition.stop()}catch{}}
  $('#voiceTagBtn').classList.remove('listening');
}
function startVoice(){
  $('#voicePanel').classList.remove('hidden');
  if(!voiceSupported()){
    $('#voiceStatus').textContent='Este navegador no ofrece reconocimiento de voz. Probá Safari/Chrome actualizado o usá tagging manual.';
    return;
  }
  stopVoice();
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  voiceRecognition=new SR();
  voiceRecognition.lang='es-UY';
  voiceRecognition.interimResults=true;
  voiceRecognition.continuous=false;
  voiceRecognition.maxAlternatives=1;
  voiceRecognition.onstart=()=>{voiceListening=true;$('#voiceStatus').textContent='ESCUCHANDO…';$('#voiceTagBtn').classList.add('listening')};
  voiceRecognition.onresult=e=>{
    let finalText='',interim='';
    for(let i=e.resultIndex;i<e.results.length;i++){
      const txt=e.results[i][0].transcript;
      if(e.results[i].isFinal)finalText+=txt;else interim+=txt;
    }
    $('#voiceTranscript').textContent=finalText||interim||'…';
    if(finalText)setVoiceDraft(finalText);
  };
  voiceRecognition.onerror=e=>{$('#voiceStatus').textContent=`VOZ: ${e.error||'error'}`;voiceListening=false;$('#voiceTagBtn').classList.remove('listening')};
  voiceRecognition.onend=()=>{voiceListening=false;$('#voiceTagBtn').classList.remove('listening');if($('#voiceStatus').textContent==='ESCUCHANDO…')$('#voiceStatus').textContent='Revisá la interpretación y aplicá.'};
  voiceRecognition.start();
}

onTap('#voiceTagBtn',async()=>{startVoice()});
$('#voiceAgain').onclick=()=>startVoice();
$('#voiceDiscard').onclick=()=>{voiceDraft=null;$('#voiceTranscript').textContent='—';$('#voiceParsed').textContent='Hablá una jugada completa.';$('#voiceApply').disabled=true};
$('#voiceClose').onclick=()=>{stopVoice();$('#voicePanel').classList.add('hidden')};
$('#voiceApply').onclick=async()=>{
  if(currentRole==='viewer'||!voiceDraft)return;
  const cmd=voiceDraft;pushUndo();voiceDraft=null;$('#voiceApply').disabled=true;$('#voiceStatus').textContent='APLICANDO…';
  try{await applyVoiceCommand(cmd);$('#voiceStatus').textContent='APLICADO';$('#voiceParsed').textContent='Etiqueta guardada.'}
  catch(e){console.error(e);$('#voiceStatus').textContent='No se pudo aplicar. Usá tagging manual o volvé a hablar.'}
};
onTap('#substitution',async()=>{
  if(!(await ensureClock()))return;
  st.playerEvents=st.playerEvents||[];
  const sale=rosterChoiceData(await flow('CAMBIO · SALE',rosterChoices()));
  const entra=rosterChoiceData(await flow('CAMBIO · ENTRA',rosterChoices()));
  st.playerEvents.unshift({type:'CAMBIO',sale,entra,time:stamp(),period:st.period,seconds:st.seconds});
  save();render();
});
onTap('#cardEvent',async()=>{
  if(!(await ensureClock()))return;
  st.playerEvents=st.playerEvents||[];
  const card=await flow('TARJETA · tipo',['AMARILLA','ROJA']);
  const player=rosterChoiceData(await flow(`${card} · jugador`,rosterChoices()));
  st.playerEvents.unshift({type:'TARJETA',card,player,time:stamp(),period:st.period,seconds:st.seconds});
  save();render();
});
onTap('#turnover',async()=>{
  if(!(await ensureClock()))return;
  const z=await zone('TURNOVER · zona');
  if(st.sequence){
    // Turnover ends the old possession and starts a new TURNOVER sequence.
    // nextTeam is based on LIVE possession, not the team that opened the sequence.
    await resolveTerminal('TURNOVER',z,{nextTeam:other(st.team)});
  }else{
    st.team=other(st.team);
    openSeq('TURNOVER',z);
  }
});
onTap('#break',async()=>{
  if(!(await ensureClock())||!st.sequence)return;
  pushUndo();
  const lane=await flow('QUIEBRE · carril',['IZQ','CENTRO','DER']);
  const z=await zone('QUIEBRE · zona');
  const team=st.team;
  st.breaks[team]=(st.breaks[team]||0)+1;
  addEvent('QUIEBRE',{lane,z,team});
});
onTap('#advantage',async()=>{
  if(!(await ensureClock())||!st.sequence)return;
  pushUndo();
  if(st.sequence.advantage){
    const old=st.sequence.advantage;
    st.sequence.events.push({type:'VENTAJA TERMINADA',advantageType:old.type,beneficiary:old.beneficiary,time:stamp()});
    st.sequence.advantage=null;
    save();render();
    return;
  }
  const type=await flow('VENTAJA · tipo',['PENAL','KNOCK ON']);
  const who=await flow('VENTAJA · a favor de quién',['URU',st.opponent]);
  const beneficiary=who==='URU'?'URU':'RIVAL';
  const z=await zone('VENTAJA · zona');
  st.sequence.advantage={type,beneficiary,z,time:stamp()};
  st.sequence.events.push({type:'VENTAJA',advantageType:type,beneficiary,z,time:stamp()});
  save();render();
});
function currentBallZone(seq=st.sequence){
  if(!seq)return null;
  const events=seq.events||[];
  for(let i=events.length-1;i>=0;i--){
    const e=events[i];
    if(e.type==='KICK'&&(e.zTo||e.z))return e.zTo||e.z;
    if(e.type==='QUIEBRE'&&e.z)return e.z;
    if(e.type==='TOUCH'&&e.z)return e.z;
  }
  return seq.zStart||null;
}
function applyKickPossession(data){
  if(!data)return;
  const rival=(st.opponent||'RIVAL').toUpperCase();
  let next=null;

  if(data.outcome==='RECIBE URU'||data.outcome==='RECUPERA URU') next='URU';
  else if(data.outcome===`RECIBE ${rival}`||data.outcome===`RECUPERA ${rival}`) next='RIVAL';
  else if(data.outcome==='CAMBIA POSESIÓN') next=other(data.team);
  else if(data.outcome==='MANTIENE POSESIÓN') next=data.team;
  else if(data.outcome==='TAPPING') next=data.tappingTeam||null;

  if(next){
    st.team=next;
    data.possessionAfter=next;
  }
}
onTap('#kick',async()=>{
  if(!(await ensureClock())||!st.sequence)return;
  pushUndo();
  const team=st.team;
  const rivalName=st.opponent.toUpperCase();
  const kickType=await flow('KICK · tipo',['CAJÓN 9','A DISPUTAR','TERRITORIO','TOUCH','PASS KICK','CASUAL']);
  const zFrom=currentBallZone();
  const z=await zone('KICK · zona destino / recepción');
  const data={team,kickType,z,zFrom,zTo:z};

  if(kickType==='A DISPUTAR'){
    data.outcome=await flow('KICK A DISPUTAR · resultado',['RECUPERA URU',`RECUPERA ${rivalName}`,'TAPPING','KNOCK ON','PENAL URU',`PENAL ${rivalName}`]);
  }else if(kickType==='TOUCH'){
    data.outcome=await flow('KICK TOUCH · resultado',['TOUCH','KNOCK ON']);
    if(data.outcome==='TOUCH')data.touchMode=await flow('KICK AL TOUCH · resultado',['DIRECTO AL TOUCH','JUGADOR SALE AL TOUCH']);
  }else if(kickType==='PASS KICK'){
    data.outcome=await flow('PASS KICK · resultado',['MANTIENE POSESIÓN','CAMBIA POSESIÓN','TAPPING','KNOCK ON','TOUCH']);
  }else{
    data.outcome=await flow(`${kickType} · resultado`,['RECIBE URU',`RECIBE ${rivalName}`,'TAPPING','KNOCK ON','TOUCH']);
  }

  if(data.outcome==='TAPPING'){
    const tapping=await flow('TAPPING · quién mantiene la posesión',['URU',st.opponent]);
    data.tappingTeam=tapping==='URU'?'URU':'RIVAL';
  }
  if(data.outcome==='KNOCK ON'){
    const ko=await flow('KNOCK ON · de quién',['URU',st.opponent]);
    data.knockOnTeam=ko==='URU'?'URU':'RIVAL';
    data.outcome=data.knockOnTeam==='URU'?'KNOCK ON URU':`KNOCK ON ${rivalName}`;
  }

  // Keep the kick in the sequence before any automatic terminal resolution.
  st.sequence.events.push({type:'KICK',time:stamp(),...data});
  if(data.z)maybeCountEntry22(data.z);

  if(data.outcome==='TOUCH'){
    save();render();
    await resolveWithAdvantage('KICK AL TOUCH',z);
    return;
  }
  if(data.outcome==='KNOCK ON URU'||data.outcome===`KNOCK ON ${rivalName}`){
    const nextTeam=data.outcome==='KNOCK ON URU'?'RIVAL':'URU';
    save();render();
    await resolveWithAdvantage('KNOCK ON',z,{nextTeam});
    return;
  }
  if(data.outcome==='PENAL URU'||data.outcome===`PENAL ${rivalName}`){
    const result=data.outcome==='PENAL URU'?'PENAL URU':'PENAL RIVAL';
    save();render();
    await resolveWithAdvantage(result,z);
    return;
  }

  applyKickPossession(data);
  // Update the already-stored kick event with final possession/tapping detail.
  const last=st.sequence.events[st.sequence.events.length-1];
  if(last?.type==='KICK')Object.assign(last,data);
  save();render();
});
onTap('#undoAction',async()=>{undoLastAction()});
onTap('#finish',async()=>{
  if(!(await ensureClock())||!st.sequence)return;
  const rivalPen=`PENAL ${st.opponent.toUpperCase()}`;
  const out=await flow('FIN SECUENCIA · resultado',['TRY','PENAL URU',rivalPen,'TURNOVER','KNOCK ON','FORWARD PASS','TOUCH','KICK ENTREGADO','OTRO']);
  const normalized=out===rivalPen?'PENAL RIVAL':out;
  if(normalized==='TRY'){await resolveTerminal('TRY','INGOAL');return}
  if(normalized==='TOUCH'&&!st.sequence.events?.some(e=>e.type==='KICK'&&e.outcome==='TOUCH')){
    pushUndo();
    const mode=await flow('TOUCH · cómo salió',['JUGADOR SALE AL TOUCH','KICK DIRECTO AL TOUCH','OTRO']);
    addEvent('TOUCH',{mode});
  }
  const z=await zone(`${out} · zona final`);
  if(normalized==='TURNOVER'){
    await resolveTerminal('TURNOVER',z,{nextTeam:other(st.team)});
    return;
  }
  await resolveWithAdvantage(normalized,z);
});
$('#exportJson').onclick=()=>download(`URU-${st.opponent}-${Date.now()}.json`,'application/json',JSON.stringify(st,null,2));$('#exportCsv').onclick=()=>download(`URU-${st.opponent}-${Date.now()}.csv`,'text/csv;charset=utf-8',csv());$('#resetMatch').onclick=()=>{if(currentRole==='viewer'||!confirm('¿Reiniciar este partido? Se borrarán sus eventos.'))return;stopTimer();const opp=st.opponent,color=st.opponentColor,created=st.createdAt;st={...defaultState(opp,color),createdAt:created};save();render()};
$$('.tab').forEach(b=>b.onclick=()=>{if(currentRole==='viewer'&&b.dataset.main==='tag')return;$$('.tab').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-selected','false')});b.classList.add('active');b.setAttribute('aria-selected','true');const dash=b.dataset.main==='dash';$('#tagView').classList.toggle('hidden',dash);$('#dashView').classList.toggle('hidden',!dash)});$$('.dash-tab').forEach(b=>b.onclick=()=>{$$('.dash-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');['general','attack','defense','kicking','fixed'].forEach(v=>$('#'+v+'Dash').classList.toggle('hidden',v!==b.dataset.dash))});
window.addEventListener('online',()=>{onlineUI();if(dirty)cloudSave(true);if(!activeId)renderMatches()});window.addEventListener('offline',onlineUI);
sb.auth.onAuthStateChange((_event,session)=>{user=session?.user||null;if(!user){stopTimer();unsubscribe();$('#authScreen').classList.remove('hidden');$('#matchManager').classList.add('hidden')}});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
boot();
})();
