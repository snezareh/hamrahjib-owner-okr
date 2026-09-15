const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');
const title = document.getElementById('page-title');
const subtitle = document.getElementById('page-subtitle');
const labels = {
  home:['خانه','نمای اجرایی امروز شما'], board:['داشبورد هیئت‌مدیره','وضعیت کل سه‌ماهه اول'],
  objectives:['اهداف','Objectiveها و Key Resultهای Q1'], teams:['تیم‌ها','ساختار مسئولیت اجرای OKR در سه‌ماهه اول'], owner:['Ownerها','مسئولیت و تمرکز اجرایی Ownerهای Q1'],
  manager:['گزارش مدیر','کنترل هفتگی اجرا و صف اقدام مدیریت'],
  execution:['مرکز اجرا','پیگیری موانع، نیازها و تعهدها'], meetings:['جلسات','Meeting Mode و Snapshot'],
  'owner-detail':['جزئیات پروژه','Objectiveها و Key Resultهای Owner'],
  update:['ثبت Update جدید','گزارش هفتگی نتیجه کلیدی']
};
function showView(id){views.forEach(v=>v.classList.toggle('active',v.id===id));navItems.forEach(n=>n.classList.toggle('active',n.dataset.view===id));document.body.classList.toggle('project-detail-active',id==='owner-detail');title.textContent=labels[id]?.[0]||'';subtitle.textContent=labels[id]?.[1]||'';if(id==='manager')renderManagerPanel();window.scrollTo({top:0,behavior:'smooth'});}
function leaveProjectRoute(){if(location.hash.startsWith('#project='))history.pushState({view:'home'},'',location.pathname);}
navItems.forEach(btn=>btn.addEventListener('click',()=>{leaveProjectRoute();showView(btn.dataset.view);}));
document.querySelectorAll('[data-view-target]').forEach(btn=>btn.addEventListener('click',()=>{leaveProjectRoute();showView(btn.dataset.viewTarget);}));
const toast=document.getElementById('toast');let toastTimer;
function notify(message){toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2600)}
document.querySelectorAll('[data-toast]').forEach(btn=>btn.addEventListener('click',()=>notify(btn.dataset.toast)));
const toFa=n=>String(n).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);

const statusMeta={
  on:{label:'On Track',className:'status-on'},
  off:{label:'Off Track',className:'status-off'},
  risk:{label:'At Risk',className:'status-risk'},
  pending:{label:'Target Pending',className:'status-pending'},
  review:{label:'نیازمند بررسی',className:'status-review'}
};
const faNumber=value=>value===null||value===undefined?'—':new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(value);
const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const syncStatus=document.getElementById('sheet-sync-status');
if(syncStatus){
  const synced=Boolean(window.sheetSyncState?.ok);
  syncStatus.className=`sheet-sync-status ${synced?'synced':'fallback'}`;
  syncStatus.querySelector('span').textContent=synced?'متصل به Google Sheet':'نمایش آخرین دادهٔ ذخیره‌شده';
  syncStatus.title=synced?`آخرین دریافت: ${new Intl.DateTimeFormat('fa-IR',{dateStyle:'short',timeStyle:'short'}).format(window.sheetSyncState.updatedAt)}`:'دریافت شیت ناموفق بود؛ برای تلاش دوباره صفحه را تازه کنید.';
}
const objectiveProgress=objective=>{
  if(objective.krs.every(kr=>kr.progress===null)) return null;
  return objective.krs.reduce((sum,kr)=>sum+((kr.progress??0)*kr.weight/100),0);
};
const objectiveStatus=objective=>{
  if(objective.krs.every(kr=>kr.status==='pending')) return 'pending';
  if(objective.krs.some(kr=>kr.status==='review')) return 'review';
  if(objective.krs.some(kr=>kr.status==='off')) return 'off';
  if(objective.krs.some(kr=>kr.status==='risk')) return 'risk';
  return 'on';
};

const teamFilter=document.getElementById('team-filter');
const statusFilter=document.getElementById('status-filter');
const okrSearch=document.getElementById('okr-search');
const okrCatalog=document.getElementById('okr-catalog');
const okrSummary=document.getElementById('okr-summary');
const okrEmpty=document.getElementById('okr-empty');
const teams=[...new Set(okrObjectives.map(objective=>objective.team))];
const homeProjectIndex=document.getElementById('home-project-index');
const ownerDetailProject=document.getElementById('owner-detail-project');
const ownerDetailOwners=document.getElementById('owner-detail-owners');
const ownerDetailObjectives=document.getElementById('owner-detail-objectives');

const detailStatusLabel=status=>({on:'در مسیر',off:'خارج از مسیر',risk:'در معرض ریسک',pending:'هدف تعیین نشده',review:'نیازمند بررسی'})[status]||status;
const prerequisiteDetailMeta={
  blocked:{label:'بحرانی',className:'detail-pre-danger'},
  'in-progress':{label:'در حال تأمین',className:'detail-pre-warning'},
  requested:{label:'درخواست‌شده',className:'detail-pre-neutral'},
  ready:{label:'تأمین شده',className:'detail-pre-success'}
};
const phaseDurationDays=90;
const phaseStartGregorian='2026-08-23';
const phaseStartJalali='۱۴۰۵/۰۶/۰۱';
const projectStartKey=team=>`hamrahjib.phaseStart.${team}`;
const daysBetween=(start,end)=>Math.max(0,Math.floor((end-start)/86400000));
const expectedProgressAt=days=>days<=30?days/30*15:days<=60?15+(days-30)/30*35:Math.min(100,50+(days-60)/30*50);
const projectTiming=team=>{
  const raw=localStorage.getItem(projectStartKey(team))||phaseStartGregorian;
  const startDate=new Date(`${raw}T00:00:00`);
  const days=daysBetween(startDate,new Date());
  return {start:raw,days,timePercent:Math.min(100,days/phaseDurationDays*100),expected:expectedProgressAt(Math.min(phaseDurationDays,days))};
};

function elapsedLabel(days){
  if(days===null)return 'تاریخ شروع ثبت نشده';
  const weeks=Math.floor(days/7),rest=days%7;
  if(weeks<1)return `${faNumber(days)} روز سپری شده`;
  return `${faNumber(weeks)} هفته${rest?` و ${faNumber(rest)} روز`:''} سپری شده`;
}
const krMeasureUnit=kr=>{
  const text=`${kr.title} ${kr.kpi}`;
  if(/شرکت|Organization|Companies/.test(text))return 'شرکت';
  if(/کاربر|User/.test(text))return 'کاربر';
  if(/میلیارد|Credit|Volume/.test(text))return 'میلیارد تومان';
  if(kr.target===1)return 'مرحله';
  return '';
};
const measuredValue=(value,unit)=>value===null||value===undefined?'—':`${faNumber(value)}${unit?` ${unit}`:''}`;

function renderDetailKr(kr,index,objectiveStatusValue,timing){
  const progress=Math.max(0,Math.min(100,kr.progress??0));
  const measureUnit=krMeasureUnit(kr);
  const gap=timing.expected===null?null:timing.expected-progress;
  const krMeta=statusMeta[kr.status];
  return `<article class="owner-detail-kr owner-detail-kr-visual">
    <div class="owner-detail-kr-head"><div><small>نتیجه کلیدی ${faNumber(index+1)}</small><h4>${esc(kr.title)}</h4></div>${kr.status!==objectiveStatusValue?`<span class="kr-status ${krMeta.className}">${detailStatusLabel(kr.status)}</span>`:''}</div>
    <div class="detail-progress-summary"><div><strong>${kr.progress===null?'—':`${faNumber(progress)}٪`}</strong><span>پیشرفت کل</span></div>${kr.progress===null||gap===null?'':`<p class="${gap<=0?'is-ahead':''}"><b>${faNumber(Math.abs(gap))}٪ ${gap>0?'عقب‌تر':'جلوتر'}</b><span>از پیشرفت مورد انتظار</span></p>`}</div>
    <div class="detail-progress-track detail-progress-${kr.status}" role="progressbar" aria-label="پیشرفت ${esc(kr.title)}" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${progress}%"></i>${kr.progress===null||timing.expected===null?'':`<em style="right:${timing.expected}%" title="انتظار امروز ${faNumber(timing.expected)}٪"></em>`}</div>
    <div class="detail-progress-scale"><span>شروع</span>${kr.progress===null?'<span>پس از تعیین هدف قابل محاسبه است</span>':timing.expected===null?'<span>زمان شروع فاز را ثبت کنید</span>':`<span>انتظار امروز ${faNumber(timing.expected)}٪</span>`}<span>هدف</span></div>
    <div class="owner-detail-kr-values detail-kr-values"><div><small>مقدار فعلی</small><b>${measuredValue(kr.actual,measureUnit)}</b></div><div><small>هدف نهایی</small><b>${measuredValue(kr.target,measureUnit)}</b></div><div><small>مسئول</small><b>${esc(kr.owner)}</b></div></div>
    ${kr.blocker?`<div class="owner-detail-blocker"><b>مانع اصلی</b><span>${esc(kr.blocker)}</span></div>`:''}
  </article>`;
}

function renderDetailPrerequisites(team,objectiveId){
  const priority={blocked:0,'in-progress':1,requested:2,ready:3};
  const items=prerequisiteRecords.filter(item=>item.requestTeam===team&&(item.objectiveId===objectiveId||!objectiveId)).sort((a,b)=>priority[a.status]-priority[b.status]);
  if(!items.length)return '';
  const readiness=items.reduce((sum,item)=>sum+item.progress,0)/items.length;
  const critical=items.filter(item=>item.status==='blocked').length;
  return `<details class="detail-prerequisites"><summary class="detail-section-head"><div><h3>پیش‌نیازهای رسیدن به هدف</h3><p>مواردی که تأمین آن‌ها برای تحقق این Objective لازم است</p></div><span>${faNumber(items.length)} پیش‌نیاز</span></summary>
    <div class="detail-pre-overview"><div><strong>${faNumber(readiness)}٪</strong><span>آمادگی کل پیش‌نیازها</span></div><div><b>${faNumber(critical)} مورد بحرانی</b><span>نیازمند اقدام فوری</span></div></div>
    <div class="detail-pre-list">${items.map(item=>{const meta=prerequisiteDetailMeta[item.status];const shortage=item.targetAmount!==undefined?Math.max(0,item.targetAmount-item.actualAmount):null;return `<article class="detail-pre-item"><div class="detail-pre-item-head"><div><h4>${esc(item.title)}</h4><small>مسئول تأمین: ${esc(item.supplyOwner)}</small></div><span class="${meta.className}">${meta.label}</span></div><div class="detail-pre-numbers"><div>${item.targetAmount!==undefined?`<strong>${faNumber(item.actualAmount)}</strong> ${esc(item.amountUnit)} <small>از ${faNumber(item.targetAmount)}</small>`:`<strong>${faNumber(item.progress)}٪</strong> آمادگی`}</div><p><b>${faNumber(item.progress)}٪ تأمین</b>${shortage!==null?`<small>${faNumber(shortage)} ${esc(item.amountUnit)} کسری</small>`:''}</p></div><div class="detail-pre-track"><i class="${meta.className}" style="width:${item.progress}%"></i></div><div class="detail-pre-impact"><b>اثر عدم تأمین:</b> ${esc(item.impact)}</div></article>`;}).join('')}</div>
  </details>`;
}

function renderWeeklyTimeline(team,objective){
  const progress=objectiveProgress(objective)??0;
  const blockedKrs=objective.krs.filter(kr=>kr.blocker);
  const leadKr=objective.krs[0];
  const owner=objective.owner;
  const status=objectiveStatus(objective);
  const sheetReport=(window.sheetWeeklyReports||[]).find(item=>item['Objective ID']===objective.id);
  const reportPeriod=sheetReport?.['Report Period']||'هفته جاری';
  const reportSummary=sheetReport?.['Executive Summary']||`پیشرفت وزنی Objective اکنون ${faNumber(progress)} درصد است. ${leadKr.title} با مقدار فعلی ${faNumber(leadKr.actual)} از هدف ${faNumber(leadKr.target)} پیگیری می‌شود. ${blockedKrs.length?`${faNumber(blockedKrs.length)} مانع فعال روی مسیر اجرا وجود دارد. مهم‌ترین مانع: ${blockedKrs[0].blocker}.`:'در این هفته مانع فعالی برای Key Resultها ثبت نشده است.'}`;
  const reportNextAction=sheetReport?.['Next Action']||'پیگیری Ownerهای تأمین';
  return `<details class="detail-weekly"><summary class="detail-weekly-title"><div><h3>گزارش‌های هفتگی Owner</h3><p>تایم‌لاین وضعیت اجرای ${esc(team)}</p></div><span>سه‌ماهه اول</span></summary><div class="detail-weekly-body">
    <div class="detail-weekly-overview"><div><small>پیشرفت فعلی</small><b>${faNumber(progress)}٪</b></div><div><small>وضعیت این هفته</small><b>${esc(sheetReport?.Status||detailStatusLabel(status))}</b></div><div><small>آخرین گزارش</small><b>${esc(reportPeriod)}، ${esc(owner)}</b></div></div>
    <div class="detail-timeline"><article class="detail-report current"><i></i><div class="detail-report-card"><header><div><h4>${esc(reportPeriod)} — گزارش ${esc(owner)}</h4><small>Owner پروژه ${esc(team)}</small></div><span class="kr-status ${statusMeta[status].className}">${esc(sheetReport?.Status||(blockedKrs.length?'نیازمند پیگیری':'به‌روزرسانی شد'))}</span></header><p class="detail-report-copy">${esc(reportSummary)}</p><footer><span><b>منبع:</b> Google Sheet</span><span><b>اقدام بعدی:</b> ${esc(reportNextAction)}</span></footer></div></article>
      <article class="detail-report"><i></i><details class="detail-report-card compact"><summary><div><h4>هفته قبل — گزارش ${esc(owner)}</h4><small>مرور هفتگی اجرا</small></div><span>مشاهده گزارش</span></summary><p>وضعیت نتایج کلیدی مرور شد؛ تمرکز اصلی بر رفع وابستگی‌های باز و تثبیت برنامه اجرایی قرار گرفت.</p></details></article>
      <article class="detail-report"><i></i><details class="detail-report-card compact"><summary><div><h4>دو هفته قبل — شروع چرخه گزارش</h4><small>خط مبنای سه‌ماهه اول</small></div><span>مشاهده گزارش</span></summary><p>هدف‌ها، مقدار اولیه، مسئولیت Owner و موانع شناخته‌شده به‌عنوان نقطه شروع ثبت شدند.</p></details></article>
    </div></div></details>`;
}

function openOwnerDetail(team,{updateHistoryState=true}={}){
  const objectives=okrObjectives.filter(objective=>objective.team===team);
  if(!objectives.length)return false;
  const projectOwners=[...new Set(objectives.map(objective=>objective.owner))];
  const timing=projectTiming(team);
  document.getElementById('owner-detail-icon').textContent=team.slice(0,1);
  ownerDetailProject.textContent=team;
  ownerDetailOwners.innerHTML=projectOwners.map(owner=>`<span><small>Owner</small><b>${esc(owner)}</b></span>`).join('');
  ownerDetailObjectives.innerHTML=`<nav class="detail-anchor-nav" aria-label="بخش‌های صفحه"><button type="button" data-detail-target=".owner-detail-kr-grid">نتایج کلیدی</button><button type="button" data-detail-target=".detail-prerequisites">پیش‌نیازها</button><button type="button" data-detail-target=".detail-weekly">گزارش‌های هفتگی</button></nav><section class="detail-time-panel"><label>زمان شروع فاز<input class="detail-phase-start" type="text" value="${phaseStartJalali}" readonly></label><div><strong>${timing.timePercent===null?'—':`${faNumber(timing.timePercent)}٪`}</strong><span>از زمان پروژه گذشته</span></div><div><strong>${elapsedLabel(timing.days)}</strong><span>${timing.expected===null?'پس از ثبت تاریخ، انتظار پیشرفت محاسبه می‌شود':`انتظار پیشرفت امروز: ${faNumber(timing.expected)}٪`}</span></div></section>`+objectives.map(objective=>{
    const progress=objectiveProgress(objective);const status=objectiveStatus(objective);const meta=statusMeta[status];
    return `<section class="owner-detail-objective"><div class="owner-detail-objective-head"><div><span class="kr-status ${meta.className}">${detailStatusLabel(status)}</span><h3>${esc(objective.title)}</h3><p>Owner: ${esc(objective.owner)} · ${faNumber(objective.krs.length)} نتیجه کلیدی</p></div><div class="owner-detail-progress"><strong>${progress===null?'—':`${faNumber(progress)}٪`}</strong><progress value="${progress??0}" max="100"></progress></div></div>
      <div id="detail-results" class="owner-detail-kr-grid">${objective.krs.map((kr,index)=>renderDetailKr(kr,index,status,timing)).join('')}</div>
      <div id="detail-prerequisites">${renderDetailPrerequisites(team,objective.id)}</div>
      <div id="detail-reports">${renderWeeklyTimeline(team,objective)}</div>
    </section>`;
  }).join('');
  ownerDetailObjectives.querySelectorAll('[data-detail-target]').forEach(button=>button.addEventListener('click',()=>{const target=ownerDetailObjectives.querySelector(button.dataset.detailTarget);target?.scrollIntoView({behavior:'smooth',block:'start'});}));
  showView('owner-detail');
  title.textContent=team;
  subtitle.textContent=`جزئیات پروژه و Owner: ${projectOwners.join('، ')}`;
  if(updateHistoryState)history.pushState({view:'owner-detail',team},'',`#project=${encodeURIComponent(team)}`);
  return true;
}

function renderHomeHierarchy(){
  if(!homeProjectIndex) return;
  const projects=teams.map((team,index)=>{
    const objectives=okrObjectives.filter(objective=>objective.team===team);
    return {id:`home-project-${index}`,team,objectives,owners:[...new Set(objectives.map(objective=>objective.owner))]};
  });
  homeProjectIndex.innerHTML=projects.map(project=>`<button class="home-project-card" type="button" data-home-project="${esc(project.team)}" aria-label="مشاهده جزئیات پروژه ${esc(project.team)}"><span class="home-project-icon">${esc(project.team.slice(0,1))}</span><span class="home-project-copy"><small>پروژه</small><strong>${esc(project.team)}</strong></span><span class="home-project-owner"><small>Owner</small><b>${esc(project.owners.join('، '))}</b></span></button>`).join('');
  homeProjectIndex.querySelectorAll('[data-home-project]').forEach(button=>button.addEventListener('click',()=>openOwnerDetail(button.dataset.homeProject)));
}

if(teamFilter){
  teams.forEach(team=>teamFilter.insertAdjacentHTML('beforeend',`<option value="${esc(team)}">${esc(team)}</option>`));
}

function renderObjectives(){
  if(!okrCatalog) return;
  const selectedTeam=teamFilter.value;
  const selectedStatus=statusFilter.value;
  const query=okrSearch.value.trim().toLocaleLowerCase('fa');
  let visibleObjectives=0;
  let visibleKrs=0;
  const markup=okrObjectives.map(objective=>{
    if(selectedTeam!=='all'&&objective.team!==selectedTeam) return '';
    const objectiveText=`${objective.title} ${objective.team} ${objective.owner}`.toLocaleLowerCase('fa');
    const objectiveMatches=!query||objectiveText.includes(query);
    const krs=objective.krs.filter(kr=>{
      const statusMatches=selectedStatus==='all'||kr.status===selectedStatus;
      const krText=`${kr.title} ${kr.owner} ${kr.unit??''} ${kr.kpi} ${kr.blocker??''}`.toLocaleLowerCase('fa');
      return statusMatches&&(objectiveMatches||!query||krText.includes(query));
    });
    if(!krs.length) return '';
    visibleObjectives+=1;
    visibleKrs+=krs.length;
    const progress=objectiveProgress(objective);
    const status=objectiveStatus(objective);
    const meta=statusMeta[status];
    const krMarkup=krs.map((kr,index)=>{
      const krMeta=statusMeta[kr.status];
      return `<article class="kr-card">
        <div class="kr-index">KR ${faNumber(index+1)}</div>
        <div class="kr-main"><h4>${esc(kr.title)}</h4><div class="kr-tags"><span>${esc(kr.kpi)}</span>${kr.unit?`<span>${esc(kr.unit)}</span>`:''}</div></div>
        <div class="kr-stat"><small>Owner</small><strong>${esc(kr.owner)}</strong></div>
        <div class="kr-stat"><small>Target / Actual</small><strong>${faNumber(kr.target)} / ${faNumber(kr.actual)}</strong></div>
        <div class="kr-stat"><small>وزن</small><strong>${faNumber(kr.weight)}٪</strong></div>
        <div class="kr-stat"><small>پیشرفت</small><strong>${kr.progress===null?'—':`${faNumber(kr.progress)}٪`}</strong></div>
        <span class="kr-status ${krMeta.className}">${krMeta.label}</span>
        ${kr.blocker?`<div class="kr-blocker"><b>Blocker</b><span>${esc(kr.blocker)}</span></div>`:''}
        ${kr.note?`<div class="kr-note"><b>یادداشت داده</b><span>${esc(kr.note)}</span></div>`:''}
      </article>`;
    }).join('');
    return `<details class="objective-record" ${visibleObjectives===1?'open':''}>
      <summary>
        <div class="objective-identity"><span class="team-badge">تیم ${esc(objective.team)}</span><h3>${esc(objective.title)}</h3><p>Owner: <b>${esc(objective.owner)}</b> · ${faNumber(objective.krs.length)} KR</p></div>
        <div class="objective-health"><span class="kr-status ${meta.className}">${meta.label}</span><strong>${progress===null?'—':`${faNumber(progress)}٪`}</strong><small>پیشرفت وزنی</small></div>
      </summary>
      <div class="kr-list">${krMarkup}</div>
    </details>`;
  }).join('');
  okrCatalog.innerHTML=markup;
  okrEmpty.hidden=Boolean(markup);
  okrSummary.innerHTML=`<span><b>${faNumber(visibleObjectives)}</b> Objective نمایش داده شده</span><span><b>${faNumber(visibleKrs)}</b> Key Result نمایش داده شده</span><span><b>${faNumber(teams.length)}</b> تیم در Master OKR</span>`;
}

[teamFilter,statusFilter,okrSearch].forEach(control=>control?.addEventListener('input',renderObjectives));
renderObjectives();
renderHomeHierarchy();
document.getElementById('owner-detail-back')?.addEventListener('click',()=>{
  history.pushState({view:'home'},'',location.pathname);
  showView('home');
});
window.addEventListener('popstate',()=>{
  const projectMatch=location.hash.match(/^#project=(.+)$/);
  if(projectMatch)openOwnerDetail(decodeURIComponent(projectMatch[1]),{updateHistoryState:false});
  else showView('home');
});
const initialProjectMatch=location.hash.match(/^#project=(.+)$/);
if(initialProjectMatch)openOwnerDetail(decodeURIComponent(initialProjectMatch[1]),{updateHistoryState:false});

const updateTeam=document.getElementById('update-team');
const updateObjective=document.getElementById('update-objective');
const updateKr=document.getElementById('update-kr');
function fillSelect(select,items,label){select.innerHTML=items.map(item=>`<option value="${esc(item.value)}">${esc(item.label)}</option>`).join('')||`<option>${label}</option>`;}
function refreshUpdateObjectives(){
  const objectives=okrObjectives.filter(objective=>objective.team===updateTeam.value);
  fillSelect(updateObjective,objectives.map(objective=>({value:objective.id,label:objective.title})),'Objective موجود نیست');
  refreshUpdateKrs();
}
function refreshUpdateKrs(){
  const objective=okrObjectives.find(item=>item.id===updateObjective.value);
  fillSelect(updateKr,(objective?.krs??[]).map((kr,index)=>({value:String(index),label:kr.title})),'KR موجود نیست');
}
if(updateTeam&&updateObjective&&updateKr){
  fillSelect(updateTeam,teams.map(team=>({value:team,label:team})),'تیمی موجود نیست');
  updateTeam.addEventListener('change',refreshUpdateObjectives);
  updateObjective.addEventListener('change',refreshUpdateKrs);
  refreshUpdateObjectives();
}

const ownerSelect=document.getElementById('owner-select');
const ownerStrip=document.getElementById('owner-strip');
const ownerMetrics=document.getElementById('owner-metrics');
const ownerObjectives=document.getElementById('owner-objectives');
const ownerObjectivesTitle=document.getElementById('owner-objectives-title');
const ownerFocusList=document.getElementById('owner-focus-list');
const owners=[...new Set(okrObjectives.map(objective=>objective.owner))];

const allKrs=okrObjectives.flatMap(objective=>objective.krs);
document.getElementById('home-objective-count').textContent=faNumber(okrObjectives.length);
document.getElementById('home-team-count').textContent=`در ${faNumber(teams.length)} تیم اجرایی`;
document.getElementById('home-kr-count').textContent=faNumber(allKrs.length);
document.getElementById('home-blocker-count').textContent=faNumber(allKrs.filter(kr=>kr.blocker).length);
document.getElementById('home-pending-count').textContent=`${faNumber(allKrs.filter(kr=>kr.target===null||kr.progress===null).length)} مورد`;

function renderOwnerStrip(){
  ownerStrip.innerHTML=owners.map(owner=>{
    const objectiveList=okrObjectives.filter(objective=>objective.owner===owner);
    const teamList=[...new Set(objectiveList.map(objective=>objective.team))];
    return `<button class="owner-chip ${owner===ownerSelect.value?'active':''}" data-owner="${esc(owner)}"><span>${esc(owner.slice(0,1))}</span><b>${esc(owner)}</b><small>${esc(teamList.join('، '))}</small></button>`;
  }).join('');
  ownerStrip.querySelectorAll('[data-owner]').forEach(button=>button.addEventListener('click',()=>{ownerSelect.value=button.dataset.owner;renderOwnerWorkspace();renderJournal();}));
}

function renderOwnerWorkspace(){
  if(!ownerSelect) return;
  const owner=ownerSelect.value;
  const objectives=okrObjectives.filter(objective=>objective.owner===owner);
  const krs=objectives.flatMap(objective=>objective.krs);
  const blockers=krs.filter(kr=>kr.blocker);
  const pending=krs.filter(kr=>kr.target===null);
  const teamsOwned=[...new Set(objectives.map(objective=>objective.team))];
  ownerMetrics.innerHTML=`
    <article class="metric"><span>Objectiveها</span><strong>${faNumber(objectives.length)}</strong><small>${esc(teamsOwned.join('، '))}</small></article>
    <article class="metric"><span>Key Resultها</span><strong>${faNumber(krs.length)}</strong><small>مجموع وزن هر Objective: ۱۰۰٪</small></article>
    <article class="metric"><span>Blockerهای باز</span><strong class="${blockers.length?'red':''}">${faNumber(blockers.length)}</strong><small>نیازمند پیگیری Owner</small></article>
    <article class="metric"><span>Target تعیین‌نشده</span><strong class="${pending.length?'amber':''}">${faNumber(pending.length)}</strong><small>پیش از محاسبه Progress</small></article>`;
  ownerObjectivesTitle.textContent=`Objectiveهای ${owner}`;
  ownerObjectives.innerHTML=objectives.map(objective=>{
    const progress=objectiveProgress(objective);
    const status=objectiveStatus(objective);
    const meta=statusMeta[status];
    return `<article class="owner-objective-card"><div><span class="team-badge">تیم ${esc(objective.team)}</span><h3>${esc(objective.title)}</h3><p>${faNumber(objective.krs.length)} KR · ${faNumber(objective.krs.filter(kr=>kr.blocker).length)} Blocker</p></div><div class="owner-score"><span class="kr-status ${meta.className}">${meta.label}</span><strong>${progress===null?'—':`${faNumber(progress)}٪`}</strong><progress value="${progress??0}" max="100"></progress></div></article>`;
  }).join('');
  const focusItems=[
    ...pending.map(kr=>({kind:'Target Pending',text:kr.title,className:'warning'})),
    ...blockers.map(kr=>({kind:'Blocker',text:kr.blocker,className:'danger'}))
  ].slice(0,5);
  ownerFocusList.innerHTML=focusItems.length?focusItems.map(item=>`<div class="focus-item"><i class="${item.className}"></i><div><b>${item.kind}</b><p>${esc(item.text)}</p></div></div>`).join(''):`<div class="focus-clear"><strong>مورد فوری ثبت نشده</strong><p>برای حفظ تازگی وضعیت، Update هفتگی KRها را ثبت کنید.</p></div>`;
  renderOwnerStrip();
}

if(ownerSelect){
  fillSelect(ownerSelect,owners.map(owner=>({value:owner,label:owner})),'Owner موجود نیست');
  ownerSelect.addEventListener('change',renderOwnerWorkspace);
  renderOwnerWorkspace();
}

const updateForm=document.getElementById('update-form');
const actualInput=document.getElementById('actual');
const previousActual=document.getElementById('previous-actual');
const updateTarget=document.getElementById('update-target');
const changeNote=document.getElementById('change-note');
const nextAction=document.getElementById('next-action');
const nextDue=document.getElementById('next-due');
const blockerField=document.getElementById('blocker-field');
const blockerNote=document.getElementById('blocker-note');
const needChecks=['has-blocker','has-prerequisite','needs-de'].map(id=>document.getElementById(id));
const updateHistory=[];
let selectedConfidence='Medium';

const selectedObjective=()=>okrObjectives.find(item=>item.id===updateObjective.value);
const selectedKr=()=>selectedObjective()?.krs[Number(updateKr.value)];
const progressFrom=(actualValue,targetValue)=>targetValue>0?Math.min(100,Math.max(0,actualValue/targetValue*100)):null;
const statusFrom=progress=>progress===null?'pending':progress>=80?'on':progress>=60?'risk':'off';

function setUpdateRecord(){
  const objective=selectedObjective();
  const kr=selectedKr();
  if(!objective||!kr) return;
  previousActual.value=kr.actual??'';
  updateTarget.value=kr.target??'Target Pending';
  actualInput.value=kr.actual??'';
  document.getElementById('preview-team').textContent=`${objective.team} · ${objective.owner}`;
  document.getElementById('preview-kr-title').textContent=kr.title;
  document.getElementById('preview-previous').textContent=faNumber(kr.actual);
  document.getElementById('preview-target').textContent=faNumber(kr.target);
  if(!nextDue.value){const due=new Date();due.setDate(due.getDate()+7);nextDue.value=due.toISOString().slice(0,10);}
  refreshUpdatePreview();
}

function refreshUpdatePreview(){
  const kr=selectedKr();
  if(!kr) return;
  const value=actualInput.value===''?null:Number(actualInput.value);
  const progress=value===null?null:progressFrom(value,kr.target);
  const previousProgress=kr.progress;
  const variance=progress===null||previousProgress===null?null:progress-previousProgress;
  document.getElementById('preview-actual').textContent=faNumber(value);
  document.getElementById('preview-progress').textContent=progress===null?'—':`${faNumber(progress)}٪`;
  document.getElementById('preview-variance').textContent=variance===null?'—':`${variance>=0?'+':''}${faNumber(variance)}pp`;
  document.getElementById('progress-value').textContent=progress===null?'پس از تعیین Target قابل محاسبه است':`${faNumber(progress)}٪ · ${variance>=0?'+':''}${faNumber(variance)}pp`;
  document.getElementById('preview-note').textContent=changeNote.value.trim()||'هنوز توضیحی ثبت نشده است.';
}

function renderUpdateHistory(){
  const list=document.getElementById('update-history-list');
  document.getElementById('history-count').textContent=faNumber(updateHistory.length);
  list.innerHTML=updateHistory.length?updateHistory.map(item=>`<article class="history-item"><div><b>${esc(item.kr)}</b><small>${esc(item.team)} · ${esc(item.owner)}</small></div><strong>${faNumber(item.previous)} ← ${faNumber(item.actual)}</strong><span>${item.progress===null?'—':`${faNumber(item.progress)}٪`}</span><p>${esc(item.note)}</p><time>${esc(item.time)}</time></article>`).join(''):'<p class="empty-history">هنوز Update جدیدی ثبت نشده است.</p>';
}

const originalRefreshUpdateKrs=refreshUpdateKrs;
refreshUpdateKrs=function(){originalRefreshUpdateKrs();setUpdateRecord();};
updateTeam?.addEventListener('change',()=>setTimeout(setUpdateRecord));
updateObjective?.addEventListener('change',()=>setTimeout(setUpdateRecord));
updateKr?.addEventListener('change',setUpdateRecord);
actualInput?.addEventListener('input',refreshUpdatePreview);
changeNote?.addEventListener('input',refreshUpdatePreview);
document.querySelectorAll('[data-confidence]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-confidence]').forEach(item=>item.classList.remove('selected'));
  button.classList.add('selected');selectedConfidence=button.dataset.confidence;
  document.getElementById('preview-confidence').textContent=selectedConfidence;
}));
needChecks.forEach(check=>check?.addEventListener('change',()=>{blockerField.hidden=!needChecks.some(item=>item.checked);}));

updateForm?.addEventListener('submit',event=>{
  event.preventDefault();
  const objective=selectedObjective();
  const kr=selectedKr();
  if(!objective||!kr) return;
  const previous=kr.actual;
  const value=Number(actualInput.value);
  const progress=progressFrom(value,kr.target);
  kr.actual=value;kr.progress=progress;kr.status=statusFrom(progress);
  if(document.getElementById('has-blocker').checked&&blockerNote.value.trim()) kr.blocker=blockerNote.value.trim();
  updateHistory.unshift({team:objective.team,owner:objective.owner,kr:kr.title,previous,actual:value,progress,confidence:selectedConfidence,note:changeNote.value.trim(),nextAction:nextAction.value.trim(),due:nextDue.value,time:new Intl.DateTimeFormat('fa-IR',{dateStyle:'short',timeStyle:'short'}).format(new Date())});
  addJournalFromUpdate(objective,kr,changeNote.value.trim(),nextAction.value.trim(),nextDue.value,progress,selectedConfidence);
  addCommitmentFromUpdate(objective,kr,nextAction.value.trim(),nextDue.value);
  changeNote.value='';nextAction.value='';blockerNote.value='';needChecks.forEach(item=>item.checked=false);blockerField.hidden=true;
  renderUpdateHistory();renderObjectives();renderHomeHierarchy();renderOwnerWorkspace();setUpdateRecord();
  notify('Update ثبت شد؛ Progress، وضعیت Objective و History به‌روز شدند.');
});

setUpdateRecord();

const prerequisiteStatusMeta={
  blocked:{label:'مسدود',className:'prerequisite-blocked'},
  'in-progress':{label:'در حال تأمین',className:'prerequisite-progressing'},
  requested:{label:'درخواست‌شده',className:'prerequisite-requested'},
  ready:{label:'آماده',className:'prerequisite-ready'}
};
const prerequisiteTeamFilter=document.getElementById('prerequisite-team-filter');
const prerequisiteStatusFilter=document.getElementById('prerequisite-status-filter');
const prerequisiteMetrics=document.getElementById('prerequisite-metrics');
const prerequisiteList=document.getElementById('prerequisite-list');
const prerequisiteForm=document.getElementById('prerequisite-form');
const prerequisiteRequestTeam=document.getElementById('prerequisite-request-team');
const prerequisiteObjective=document.getElementById('prerequisite-objective');

function renderPrerequisiteMetrics(){
  const readiness=prerequisiteRecords.length?prerequisiteRecords.reduce((sum,item)=>sum+item.progress,0)/prerequisiteRecords.length:0;
  const blocked=prerequisiteRecords.filter(item=>item.status==='blocked').length;
  const unassigned=prerequisiteRecords.filter(item=>item.supplyOwner.includes('نیازمند')).length;
  const noDue=prerequisiteRecords.filter(item=>!item.due).length;
  prerequisiteMetrics.innerHTML=`
    <article class="metric"><span>آمادگی پیش‌نیازها</span><strong class="${readiness<60?'red':'green'}">${faNumber(readiness)}٪</strong><small>میانگین Progress موارد ثبت‌شده</small></article>
    <article class="metric"><span>مسدود</span><strong class="red">${faNumber(blocked)}</strong><small>مانع مستقیم اجرای KR</small></article>
    <article class="metric"><span>Owner تأمین نامشخص</span><strong class="amber">${faNumber(unassigned)}</strong><small>نیازمند تعیین پاسخ‌گو</small></article>
    <article class="metric"><span>بدون موعد</span><strong class="amber">${faNumber(noDue)}</strong><small>نیازمند تعیین Due Date</small></article>`;
  document.getElementById('prerequisite-tab-count').textContent=faNumber(prerequisiteRecords.length);
}

function renderPrerequisites(){
  if(!prerequisiteList) return;
  const team=prerequisiteTeamFilter.value;
  const status=prerequisiteStatusFilter.value;
  const items=prerequisiteRecords.filter(item=>(team==='all'||item.requestTeam===team)&&(status==='all'||item.status===status));
  prerequisiteList.innerHTML=items.length?items.map(item=>{
    const objective=okrObjectives.find(entry=>entry.id===item.objectiveId);
    const meta=prerequisiteStatusMeta[item.status];
    return `<article class="prerequisite-card">
      <div class="prerequisite-head"><div><span class="category-chip">${esc(item.category)}</span><h3>${esc(item.title)}</h3><p>${esc(item.sourceKr)}</p></div><span class="prerequisite-status ${meta.className}">${meta.label}</span></div>
      <div class="prerequisite-link"><small>متصل به</small><b>${esc(objective?.title??'Objective جدید')}</b><span>تیم ${esc(item.requestTeam)}</span></div>
      <div class="prerequisite-people"><div><small>درخواست‌کننده</small><strong>${esc(item.requester)}</strong></div><div><small>Owner تأمین</small><strong class="${item.supplyOwner.includes('نیازمند')?'amber':''}">${esc(item.supplyOwner)}</strong></div><div><small>موعد</small><strong>${item.due?esc(item.due):'نیازمند تعیین'}</strong></div></div>
      <div class="readiness-row"><span>Readiness</span><progress value="${item.progress}" max="100"></progress><b>${faNumber(item.progress)}٪</b></div>
      <div class="impact-row"><b>اثر در صورت عدم تأمین</b><span>${esc(item.impact)}</span></div>
      <small class="record-source">آخرین ثبت: ${esc(item.lastUpdate)}</small>
    </article>`;
  }).join(''):'<div class="panel no-results"><h2>موردی پیدا نشد</h2><p>فیلترهای انتخاب‌شده را تغییر دهید.</p></div>';
  renderPrerequisiteMetrics();
}

function fillPrerequisiteObjectives(){
  const items=okrObjectives.filter(objective=>objective.team===prerequisiteRequestTeam.value);
  fillSelect(prerequisiteObjective,items.map(objective=>({value:objective.id,label:objective.title})),'Objective موجود نیست');
}

if(prerequisiteTeamFilter&&prerequisiteStatusFilter){
  teams.forEach(team=>prerequisiteTeamFilter.insertAdjacentHTML('beforeend',`<option value="${esc(team)}">${esc(team)}</option>`));
  prerequisiteTeamFilter.addEventListener('change',renderPrerequisites);
  prerequisiteStatusFilter.addEventListener('change',renderPrerequisites);
  fillSelect(prerequisiteRequestTeam,teams.map(team=>({value:team,label:team})),'تیمی موجود نیست');
  prerequisiteRequestTeam.addEventListener('change',fillPrerequisiteObjectives);
  fillPrerequisiteObjectives();renderPrerequisites();
}

prerequisiteForm?.addEventListener('submit',event=>{
  event.preventDefault();
  const objective=okrObjectives.find(item=>item.id===prerequisiteObjective.value);
  const owner=document.getElementById('prerequisite-owner').value.trim()||'نیازمند تعیین';
  const due=document.getElementById('prerequisite-due').value||null;
  prerequisiteRecords.unshift({
    id:`pre-${Date.now()}`,
    title:document.getElementById('prerequisite-title').value.trim(),
    requestTeam:prerequisiteRequestTeam.value,
    objectiveId:prerequisiteObjective.value,
    requester:objective?.owner??'نیازمند تعیین',
    supplyOwner:owner,
    category:document.getElementById('prerequisite-category').value,
    progress:Number(document.getElementById('prerequisite-progress').value)||0,
    status:document.getElementById('prerequisite-status').value,
    impact:document.getElementById('prerequisite-impact').value.trim(),
    sourceKr:'ثبت مستقیم در مرکز اجرا',due,
    lastUpdate:new Intl.DateTimeFormat('fa-IR',{dateStyle:'short'}).format(new Date())
  });
  prerequisiteForm.reset();
  fillPrerequisiteObjectives();renderPrerequisites();
  notify('پیش‌نیاز جدید ثبت شد و Readiness به‌روز شد.');
});

document.querySelectorAll('[data-execution-pane]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-execution-pane]').forEach(item=>item.classList.toggle('active',item===button));
  document.querySelectorAll('.execution-pane').forEach(pane=>pane.classList.toggle('active',pane.id===`execution-${button.dataset.executionPane}`));
}));

const inferSeverity=(text,team)=>{
  const value=`${text} ${team}`;
  if(/خط اعتباری|اعتبار بانک|در انتظار تأمین/.test(value)) return 'critical';
  if(/Go-Live|TMS|CRM|کال‌سنتر|بازپرداخت/.test(value)) return 'high';
  return 'medium';
};
const issueRecords=[];
okrObjectives.forEach(objective=>objective.krs.forEach((kr,index)=>{
  if(!kr.blocker) return;
  issueRecords.push({id:`blocker-${objective.id}-${index}`,type:'blocker',title:`مانع اجرای «${kr.title}»`,team:objective.team,objectiveId:objective.id,krTitle:kr.title,owner:objective.owner,severity:inferSeverity(kr.blocker,objective.team),status:'open',impact:kr.blocker,nextAction:'تعیین اقدام رفع و Owner تأمین',due:null,source:'Master OKR'});
}));
issueRecords.push(...riskRecords);

const severityMeta={critical:{label:'بحرانی',className:'severity-critical'},high:{label:'بالا',className:'severity-high'},medium:{label:'متوسط',className:'severity-medium'}};
const issueTypeFilter=document.getElementById('issue-type-filter');
const issueTeamFilter=document.getElementById('issue-team-filter');
const issueSeverityFilter=document.getElementById('issue-severity-filter');
const issueList=document.getElementById('issue-list');
const blockerMetrics=document.getElementById('blocker-metrics');
const issueForm=document.getElementById('issue-form');
const issueTeam=document.getElementById('issue-team');
const issueObjective=document.getElementById('issue-objective');

function renderIssueMetrics(){
  const open=issueRecords.filter(item=>item.status!=='resolved');
  const blockers=open.filter(item=>item.type==='blocker').length;
  const risks=open.filter(item=>item.type==='risk').length;
  const critical=open.filter(item=>item.severity==='critical').length;
  const noDue=open.filter(item=>!item.due).length;
  blockerMetrics.innerHTML=`
    <article class="metric"><span>Blocker فعال</span><strong class="red">${faNumber(blockers)}</strong><small>متصل به KRهای Q1</small></article>
    <article class="metric"><span>Risk فعال</span><strong class="amber">${faNumber(risks)}</strong><small>نیازمند کنترل مدیریتی</small></article>
    <article class="metric"><span>شدت بحرانی</span><strong class="red">${faNumber(critical)}</strong><small>اولویت پیشنهادی برای Escalation</small></article>
    <article class="metric"><span>بدون موعد رفع</span><strong class="amber">${faNumber(noDue)}</strong><small>Due Date هنوز تعیین نشده</small></article>`;
  document.getElementById('blocker-tab-count').textContent=faNumber(open.length);
}

function renderIssues(){
  if(!issueList) return;
  const type=issueTypeFilter.value;
  const team=issueTeamFilter.value;
  const severity=issueSeverityFilter.value;
  const items=issueRecords.filter(item=>(type==='all'||item.type===type)&&(team==='all'||item.team===team)&&(severity==='all'||item.severity===severity));
  issueList.innerHTML=items.length?items.map(item=>{
    const objective=okrObjectives.find(entry=>entry.id===item.objectiveId);
    const meta=severityMeta[item.severity];
    const resolved=item.status==='resolved';
    return `<article class="issue-card ${resolved?'resolved':''}">
      <div class="issue-rail ${item.type}"></div>
      <div class="issue-head"><div><span class="issue-type ${item.type}">${item.type==='blocker'?'Blocker':'Risk'}</span><span class="severity ${meta.className}">${meta.label}</span><h3>${esc(item.title)}</h3><p>${esc(item.krTitle??objective?.title??'')}</p></div><button class="resolve-action" data-resolve-issue="${esc(item.id)}">${resolved?'بازگشایی':'رفع شد'}</button></div>
      <div class="issue-meta"><div><small>تیم</small><b>${esc(item.team)}</b></div><div><small>Owner پیگیری</small><b>${esc(item.owner)}</b></div><div><small>موعد</small><b>${item.due?esc(item.due):'نیازمند تعیین'}</b></div><div><small>وضعیت</small><b>${resolved?'بسته‌شده':'باز'}</b></div></div>
      <div class="issue-impact"><b>${item.type==='blocker'?'شرح مانع':'اثر ریسک'}</b><p>${esc(item.impact)}</p></div>
      <div class="issue-next"><span>اقدام بعدی</span><b>${esc(item.nextAction)}</b></div>
      <small class="record-source">منبع: ${esc(item.source)}</small>
    </article>`;
  }).join(''):'<div class="panel no-results"><h2>موردی پیدا نشد</h2><p>فیلترهای انتخاب‌شده را تغییر دهید.</p></div>';
  issueList.querySelectorAll('[data-resolve-issue]').forEach(button=>button.addEventListener('click',()=>{
    const item=issueRecords.find(entry=>entry.id===button.dataset.resolveIssue);
    item.status=item.status==='resolved'?'open':'resolved';renderIssues();notify(item.status==='resolved'?'مورد بسته شد.':'مورد دوباره باز شد.');
  }));
  renderIssueMetrics();
}

function fillIssueObjectives(){
  const items=okrObjectives.filter(objective=>objective.team===issueTeam.value);
  fillSelect(issueObjective,items.map(objective=>({value:objective.id,label:objective.title})),'Objective موجود نیست');
}

if(issueList){
  teams.forEach(team=>issueTeamFilter.insertAdjacentHTML('beforeend',`<option value="${esc(team)}">${esc(team)}</option>`));
  [issueTypeFilter,issueTeamFilter,issueSeverityFilter].forEach(control=>control.addEventListener('change',renderIssues));
  fillSelect(issueTeam,teams.map(team=>({value:team,label:team})),'تیمی موجود نیست');
  issueTeam.addEventListener('change',fillIssueObjectives);fillIssueObjectives();renderIssues();
}

issueForm?.addEventListener('submit',event=>{
  event.preventDefault();
  const objective=okrObjectives.find(item=>item.id===issueObjective.value);
  issueRecords.unshift({
    id:`issue-${Date.now()}`,type:document.getElementById('issue-type').value,
    title:document.getElementById('issue-title').value.trim(),team:issueTeam.value,objectiveId:issueObjective.value,
    owner:document.getElementById('issue-owner').value.trim()||objective?.owner||'نیازمند تعیین',severity:document.getElementById('issue-severity').value,status:'open',
    impact:document.getElementById('issue-impact').value.trim(),nextAction:document.getElementById('issue-next-action').value.trim(),due:document.getElementById('issue-due').value||null,source:'ثبت مستقیم در مرکز اجرا'
  });
  issueForm.reset();fillIssueObjectives();renderIssues();notify('مورد جدید ثبت و به Attention Center اضافه شد.');
});

const decisionStateMeta={waiting:{label:'در انتظار تصمیم',className:'state-waiting'},approved:{label:'تصویب‌شده',className:'state-approved'},deferred:{label:'موکول‌شده',className:'state-deferred'},rejected:{label:'ردشده',className:'state-rejected'}};
const decisionTeamFilter=document.getElementById('decision-team-filter');
const decisionStatusFilter=document.getElementById('decision-status-filter');
const decisionPriorityFilter=document.getElementById('decision-priority-filter');
const decisionList=document.getElementById('decision-list');
const decisionMetrics=document.getElementById('decision-metrics');
const decisionForm=document.getElementById('decision-form');
const decisionTeam=document.getElementById('decision-team');
const decisionObjective=document.getElementById('decision-objective');

function renderDecisionMetrics(){
  const waiting=decisionRecords.filter(item=>item.status==='waiting');
  const critical=waiting.filter(item=>item.priority==='critical').length;
  const unassigned=waiting.filter(item=>item.decisionMaker.includes('نیازمند')).length;
  const noDue=waiting.filter(item=>!item.due).length;
  decisionMetrics.innerHTML=`
    <article class="metric"><span>در انتظار تصمیم</span><strong class="amber">${faNumber(waiting.length)}</strong><small>صف فعال تصمیم‌های Q1</small></article>
    <article class="metric"><span>اولویت بحرانی</span><strong class="red">${faNumber(critical)}</strong><small>اثر مستقیم بر Go-Live یا سنجش</small></article>
    <article class="metric"><span>تصمیم‌گیرنده نامشخص</span><strong class="amber">${faNumber(unassigned)}</strong><small>نیازمند تعیین Authority</small></article>
    <article class="metric"><span>بدون مهلت تصمیم</span><strong class="amber">${faNumber(noDue)}</strong><small>Due Date هنوز تعیین نشده</small></article>`;
  document.getElementById('decision-tab-count').textContent=faNumber(waiting.length);
}

function renderDecisions(){
  if(!decisionList) return;
  const team=decisionTeamFilter.value;
  const status=decisionStatusFilter.value;
  const priority=decisionPriorityFilter.value;
  const items=decisionRecords.filter(item=>(team==='all'||item.team===team)&&(status==='all'||item.status===status)&&(priority==='all'||item.priority===priority));
  decisionList.innerHTML=items.length?items.map(item=>{
    const objective=okrObjectives.find(entry=>entry.id===item.objectiveId);
    const priorityInfo=severityMeta[item.priority];
    const state=decisionStateMeta[item.status];
    return `<article class="decision-card ${item.status}">
      <div class="decision-head"><div><span class="decision-priority priority-${item.priority}">${priorityInfo.label}</span><span class="decision-state ${state.className}">${state.label}</span><h3>${esc(item.title)}</h3><p>${esc(objective?.title??'')}</p></div></div>
      <div class="decision-meta"><div><small>تیم</small><b>${esc(item.team)}</b></div><div><small>درخواست‌کننده</small><b>${esc(item.requester)}</b></div><div><small>تصمیم‌گیرنده</small><b class="${item.decisionMaker.includes('نیازمند')?'amber':''}">${esc(item.decisionMaker)}</b></div><div><small>مهلت</small><b>${item.due?esc(item.due):'نیازمند تعیین'}</b></div></div>
      <div class="decision-context"><b>زمینه تصمیم</b><p>${esc(item.context)}</p></div>
      <div class="decision-recommendation"><b>پیشنهاد Owner</b><p>${esc(item.recommendation)}</p></div>
      <div class="decision-actions"><button class="approve" data-decision-action="approved" data-decision-id="${esc(item.id)}">تصویب</button><button data-decision-action="deferred" data-decision-id="${esc(item.id)}">موکول شود</button><button class="reject" data-decision-action="rejected" data-decision-id="${esc(item.id)}">رد</button></div>
    </article>`;
  }).join(''):'<div class="panel no-results"><h2>تصمیمی پیدا نشد</h2><p>فیلترهای انتخاب‌شده را تغییر دهید.</p></div>';
  decisionList.querySelectorAll('[data-decision-action]').forEach(button=>button.addEventListener('click',()=>{
    const item=decisionRecords.find(entry=>entry.id===button.dataset.decisionId);
    item.status=button.dataset.decisionAction;renderDecisions();notify(`وضعیت تصمیم به «${decisionStateMeta[item.status].label}» تغییر کرد.`);
  }));
  renderDecisionMetrics();
}

function fillDecisionObjectives(){
  const items=okrObjectives.filter(objective=>objective.team===decisionTeam.value);
  fillSelect(decisionObjective,items.map(objective=>({value:objective.id,label:objective.title})),'Objective موجود نیست');
}

if(decisionList){
  teams.forEach(team=>decisionTeamFilter.insertAdjacentHTML('beforeend',`<option value="${esc(team)}">${esc(team)}</option>`));
  [decisionTeamFilter,decisionStatusFilter,decisionPriorityFilter].forEach(control=>control.addEventListener('change',renderDecisions));
  fillSelect(decisionTeam,teams.map(team=>({value:team,label:team})),'تیمی موجود نیست');
  decisionTeam.addEventListener('change',fillDecisionObjectives);fillDecisionObjectives();renderDecisions();
}

decisionForm?.addEventListener('submit',event=>{
  event.preventDefault();
  const objective=okrObjectives.find(item=>item.id===decisionObjective.value);
  decisionRecords.unshift({
    id:`decision-${Date.now()}`,title:document.getElementById('decision-title').value.trim(),team:decisionTeam.value,objectiveId:decisionObjective.value,
    requester:objective?.owner??'نیازمند تعیین',decisionMaker:document.getElementById('decision-maker').value.trim()||'نیازمند تعیین',priority:document.getElementById('decision-priority').value,status:'waiting',
    context:document.getElementById('decision-context').value.trim(),recommendation:document.getElementById('decision-recommendation').value.trim(),due:document.getElementById('decision-due').value||null,related:null
  });
  decisionForm.reset();fillDecisionObjectives();renderDecisions();notify('درخواست جدید به صف تصمیم اضافه شد.');
});

const commitmentStateMeta={open:{label:'باز'},'in-progress':{label:'در حال انجام'},done:{label:'انجام‌شده'},overdue:{label:'معوق'}};
const commitmentMetrics=document.getElementById('commitment-metrics');
const commitmentList=document.getElementById('commitment-list');
const commitmentForm=document.getElementById('commitment-form');
const commitmentOwnerFilter=document.getElementById('commitment-owner-filter');
const commitmentTeamFilter=document.getElementById('commitment-team-filter');
const commitmentStatusFilter=document.getElementById('commitment-status-filter');
const commitmentOwner=document.getElementById('commitment-owner');
const commitmentTeam=document.getElementById('commitment-team');
const commitmentObjective=document.getElementById('commitment-objective');

function effectiveCommitmentStatus(item){
  if(item.status==='done') return 'done';
  if(item.due&&new Date(`${item.due}T23:59:59`)<new Date()) return 'overdue';
  return item.status;
}

function renderCommitmentMetrics(){
  if(!commitmentMetrics) return;
  const active=commitmentRecords.filter(item=>effectiveCommitmentStatus(item)!=='done');
  const progressing=active.filter(item=>effectiveCommitmentStatus(item)==='in-progress').length;
  const done=commitmentRecords.filter(item=>item.status==='done').length;
  const noDue=active.filter(item=>!item.due).length;
  commitmentMetrics.innerHTML=`
    <article class="metric"><span>تعهد فعال</span><strong>${faNumber(active.length)}</strong><small>خروجی‌های باز Q1</small></article>
    <article class="metric"><span>در حال انجام</span><strong class="amber">${faNumber(progressing)}</strong><small>Owner کار را آغاز کرده است</small></article>
    <article class="metric"><span>انجام‌شده</span><strong class="green">${faNumber(done)}</strong><small>دارای شاهد تحویل</small></article>
    <article class="metric"><span>بدون موعد</span><strong class="${noDue?'red':'green'}">${faNumber(noDue)}</strong><small>نیازمند تعیین Due Date</small></article>`;
  document.getElementById('commitment-tab-count').textContent=faNumber(active.length);
}

function renderCommitments(){
  if(!commitmentList) return;
  const owner=commitmentOwnerFilter.value;
  const team=commitmentTeamFilter.value;
  const status=commitmentStatusFilter.value;
  const items=commitmentRecords.filter(item=>(owner==='all'||item.owner===owner)&&(team==='all'||item.team===team)&&(status==='all'||effectiveCommitmentStatus(item)===status));
  commitmentList.innerHTML=items.length?items.map(item=>{
    const objective=okrObjectives.find(entry=>entry.id===item.objectiveId);
    const state=effectiveCommitmentStatus(item);
    return `<article class="commitment-card ${state}">
      <div class="commitment-head"><div><span class="commitment-state ${state}">${commitmentStateMeta[state].label}</span><h3>${esc(item.title)}</h3><p>${esc(objective?.title??'')}</p></div><div class="commitment-owner"><i>${esc(item.owner.slice(0,1))}</i><b>${esc(item.owner)}</b></div></div>
      <div class="commitment-meta"><div><small>تیم</small><b>${esc(item.team)}</b></div><div><small>موعد</small><b class="${state==='overdue'?'red':!item.due?'amber':''}">${item.due?esc(item.due):'نیازمند تعیین'}</b></div><div><small>منبع تعهد</small><b>${esc(item.source)}</b></div></div>
      <div class="commitment-evidence"><b>شاهد انجام</b><p>${esc(item.evidence)}</p></div>
      ${item.note?`<p class="commitment-note">${esc(item.note)}</p>`:''}
      <div class="commitment-actions">${item.status==='done'?`<button data-commitment-action="open" data-commitment-id="${esc(item.id)}">بازگشایی</button>`:`${item.status==='open'?`<button class="commitment-primary" data-commitment-action="in-progress" data-commitment-id="${esc(item.id)}">شروع انجام</button>`:''}<button class="commitment-done" data-commitment-action="done" data-commitment-id="${esc(item.id)}">ثبت انجام</button>`}</div>
    </article>`;
  }).join(''):'<div class="panel no-results"><h2>تعهدی پیدا نشد</h2><p>فیلترها را تغییر دهید یا تعهد جدیدی ثبت کنید.</p></div>';
  commitmentList.querySelectorAll('[data-commitment-action]').forEach(button=>button.addEventListener('click',()=>{
    const item=commitmentRecords.find(entry=>entry.id===button.dataset.commitmentId);
    item.status=button.dataset.commitmentAction;renderCommitments();notify(`وضعیت تعهد به «${commitmentStateMeta[item.status].label}» تغییر کرد.`);
  }));
  renderCommitmentMetrics();
}

function fillCommitmentObjectives(){
  if(!commitmentObjective) return;
  const items=okrObjectives.filter(objective=>objective.team===commitmentTeam.value);
  fillSelect(commitmentObjective,items.map(objective=>({value:objective.id,label:objective.title})),'Objective موجود نیست');
}

function addCommitmentFromUpdate(objective,kr,action,due){
  if(!action) return;
  commitmentRecords.unshift({id:`commitment-update-${Date.now()}`,title:action,owner:objective.owner,team:objective.team,objectiveId:objective.id,status:'open',due:due||null,evidence:`خروجی اقدام بعدی برای KR: ${kr.title}`,note:'به‌صورت خودکار از Weekly Update ساخته شد.',source:'Weekly Update'});
  renderCommitments();
}

if(commitmentList){
  owners.forEach(owner=>commitmentOwnerFilter.insertAdjacentHTML('beforeend',`<option value="${esc(owner)}">${esc(owner)}</option>`));
  teams.forEach(team=>commitmentTeamFilter.insertAdjacentHTML('beforeend',`<option value="${esc(team)}">${esc(team)}</option>`));
  [commitmentOwnerFilter,commitmentTeamFilter,commitmentStatusFilter].forEach(control=>control.addEventListener('change',renderCommitments));
  fillSelect(commitmentOwner,owners.map(owner=>({value:owner,label:owner})),'Owner موجود نیست');
  fillSelect(commitmentTeam,teams.map(team=>({value:team,label:team})),'تیمی موجود نیست');
  commitmentTeam.addEventListener('change',fillCommitmentObjectives);fillCommitmentObjectives();renderCommitments();
}

commitmentForm?.addEventListener('submit',event=>{
  event.preventDefault();
  commitmentRecords.unshift({
    id:`commitment-${Date.now()}`,title:document.getElementById('commitment-title').value.trim(),owner:commitmentOwner.value,team:commitmentTeam.value,objectiveId:commitmentObjective.value,
    status:document.getElementById('commitment-status').value,due:document.getElementById('commitment-due').value||null,evidence:document.getElementById('commitment-evidence').value.trim(),
    note:document.getElementById('commitment-note').value.trim(),source:'ثبت مستقیم در مرکز اجرا'
  });
  commitmentForm.reset();fillCommitmentObjectives();renderCommitments();notify('تعهد جدید ثبت و به Owner مربوط متصل شد.');
});

const journalTypeMeta={
  system:{label:'سیستمی',className:'journal-type-system'},update:{label:'Update',className:'journal-type-update'},
  achievement:{label:'دستاورد',className:'journal-type-achievement'},issue:{label:'مسئله',className:'journal-type-issue'},
  learning:{label:'یادگیری',className:'journal-type-learning'},'follow-up':{label:'پیگیری',className:'journal-type-follow-up'}
};
const journalVisibility={owner:'فقط Owner',manager:'Owner و مدیر',board:'قابل نمایش در Board'};
const journalEntries=owners.map((owner,index)=>{
  const objectives=okrObjectives.filter(objective=>objective.owner===owner);
  const krCount=objectives.reduce((sum,objective)=>sum+objective.krs.length,0);
  const blockerCount=objectives.reduce((sum,objective)=>sum+objective.krs.filter(kr=>kr.blocker).length,0);
  return {id:`journal-system-${index}`,owner,type:'system',objectiveId:objectives[0]?.id??null,title:'راه‌اندازی Owner Journal',note:`اطلاعات اولیه از Master OKR وارد شد: ${faNumber(objectives.length)} Objective، ${faNumber(krCount)} KR و ${faNumber(blockerCount)} Blocker ثبت‌شده.`,followUp:'ثبت اولین یادداشت هفتگی Owner',followDate:null,visibility:'owner',createdAt:new Date(),source:'System'};
});
const journalTimeline=document.getElementById('journal-timeline');
const journalTypeFilter=document.getElementById('journal-type-filter');
const journalObjective=document.getElementById('journal-objective');
const journalForm=document.getElementById('journal-form');

function fillJournalObjectives(){
  if(!journalObjective||!ownerSelect) return;
  const items=okrObjectives.filter(objective=>objective.owner===ownerSelect.value);
  fillSelect(journalObjective,items.map(objective=>({value:objective.id,label:objective.title})),'Objective موجود نیست');
}

function renderJournal(){
  if(!journalTimeline||!ownerSelect) return;
  const owner=ownerSelect.value;
  const type=journalTypeFilter.value;
  const entries=journalEntries.filter(entry=>entry.owner===owner&&(type==='all'||entry.type===type)).sort((a,b)=>b.createdAt-a.createdAt);
  document.getElementById('journal-title').textContent=`دفترچه ${owner}`;
  journalTimeline.innerHTML=entries.length?entries.map(entry=>{
    const objective=okrObjectives.find(item=>item.id===entry.objectiveId);
    const meta=journalTypeMeta[entry.type];
    return `<article class="journal-entry"><div class="journal-entry-head"><span class="journal-entry-type ${meta.className}">${meta.label}</span><time>${new Intl.DateTimeFormat('fa-IR',{dateStyle:'medium',timeStyle:'short'}).format(entry.createdAt)}</time></div><h3>${esc(entry.title)}</h3><p>${esc(entry.note)}</p><div class="journal-entry-meta"><span>${esc(objective?.team??'بدون تیم')}</span><span>${esc(journalVisibility[entry.visibility])}</span><span>${esc(entry.source)}</span></div>${entry.followUp?`<div class="journal-follow"><b>پیگیری بعدی:</b> ${esc(entry.followUp)}${entry.followDate?` · ${esc(entry.followDate)}`:''}</div>`:''}</article>`;
  }).join(''):'<div class="journal-empty"><strong>یادداشتی وجود ندارد</strong><p>نوع یادداشت را تغییر دهید یا ورودی جدید ثبت کنید.</p></div>';
  fillJournalObjectives();
}

function addJournalFromUpdate(objective,kr,note,nextAction,due,progress,confidence){
  journalEntries.unshift({id:`journal-update-${Date.now()}`,owner:objective.owner,type:'update',objectiveId:objective.id,title:`Update: ${kr.title}`,note:`${note} · Progress: ${progress===null?'—':`${faNumber(progress)}٪`} · Confidence: ${confidence}`,followUp:nextAction,followDate:due||null,visibility:'manager',createdAt:new Date(),source:'Weekly Update'});
  if(ownerSelect.value===objective.owner) renderJournal();
}

if(journalTimeline){
  journalTypeFilter.addEventListener('change',renderJournal);
  ownerSelect.addEventListener('change',renderJournal);
  renderJournal();
}

journalForm?.addEventListener('submit',event=>{
  event.preventDefault();
  const objective=okrObjectives.find(item=>item.id===journalObjective.value);
  const type=document.getElementById('journal-type').value;
  journalEntries.unshift({
    id:`journal-${Date.now()}`,owner:ownerSelect.value,type,objectiveId:journalObjective.value,
    title:`${journalTypeMeta[type].label} · ${objective?.team??'Owner Journal'}`,
    note:document.getElementById('journal-note').value.trim(),followUp:document.getElementById('journal-follow-up').value.trim(),
    followDate:document.getElementById('journal-follow-date').value||null,visibility:document.getElementById('journal-visibility').value,createdAt:new Date(),source:'Owner'
  });
  journalForm.reset();renderJournal();notify('یادداشت در Owner Journal ثبت شد.');
});

const managerScopes=[
  {id:'all',label:'مدیریت ارشد · کل شرکت',title:'نمای کل شرکت',owners:owners},
  {id:'growth',label:'حوزه رشد و کسب‌وکار',title:'رشد و کسب‌وکار',owners:['کاریز','عبدی','فیض','عسگریان']},
  {id:'delivery',label:'حوزه محصول و اجرا',title:'محصول و اجرا',owners:['کیارش','افشار','ساسان']},
  {id:'support',label:'حوزه پشتیبان سازمان',title:'پشتیبان سازمان',owners:['ابداری','یاسین']}
];
const managerScope=document.getElementById('manager-scope');
const managerMetrics=document.getElementById('manager-metrics');
const managerOwnerTable=document.getElementById('manager-owner-table');
const managerAttentionList=document.getElementById('manager-attention-list');
const managerObjectiveList=document.getElementById('manager-objective-list');
const managerBrief=document.getElementById('manager-brief');
let managerBriefText='';

function currentManagerScope(){return managerScopes.find(scope=>scope.id===managerScope?.value)??managerScopes[0];}
function averageProgress(objectives){
  const values=objectives.map(objectiveProgress).filter(value=>value!==null);
  return values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
}
function openExecutionPane(name){
  showView('execution');
  document.querySelector(`[data-execution-pane="${name}"]`)?.click();
}

function buildManagerBrief(scope,objectives,issues,decisions,commitments){
  const outside=objectives.filter(objective=>objectiveStatus(objective)!=='on').length;
  const critical=issues.filter(item=>item.severity==='critical').length;
  const missingDue=commitments.filter(item=>!item.due).length;
  const updatedOwners=scope.owners.filter(owner=>updateHistory.some(item=>item.owner===owner)).length;
  const lines=[
    `${faNumber(outside)} از ${faNumber(objectives.length)} Objective خارج از وضعیت On Track یا در انتظار تکمیل داده است.`,
    `${faNumber(issues.length)} Blocker/Risk فعال داریم که ${faNumber(critical)} مورد آن بحرانی است.`,
    `${faNumber(decisions.length)} تصمیم مدیریتی هنوز در انتظار تعیین تکلیف است.`,
    `${faNumber(commitments.length)} تعهد فعال وجود دارد؛ ${faNumber(missingDue)} تعهد هنوز موعد ندارد.`,
    `${faNumber(updatedOwners)} از ${faNumber(scope.owners.length)} Owner در این نشست Update جدید ثبت کرده‌اند.`
  ];
  managerBriefText=`گزارش هفتگی ${scope.title}\n${lines.map((line,index)=>`${index+1}. ${line}`).join('\n')}`;
  managerBrief.innerHTML=`<h3>گزارش هفتگی ${esc(scope.title)}</h3><ul>${lines.map(line=>`<li>${esc(line)}</li>`).join('')}</ul><div class="manager-brief-meta"><span>منبع: Master OKR Q1</span><span>به‌روزرسانی پویا با ثبت Update</span></div>`;
}

function renderManagerPanel(){
  if(!managerMetrics) return;
  const scope=currentManagerScope();
  const objectives=okrObjectives.filter(objective=>scope.owners.includes(objective.owner));
  const scopedOwners=scope.owners.filter(owner=>objectives.some(objective=>objective.owner===owner));
  const issues=issueRecords.filter(item=>item.status!=='resolved'&&scope.owners.includes(item.owner));
  const decisions=decisionRecords.filter(item=>item.status==='waiting'&&scope.owners.includes(item.requester));
  const commitments=commitmentRecords.filter(item=>effectiveCommitmentStatus(item)!=='done'&&scope.owners.includes(item.owner));
  const progress=averageProgress(objectives);
  const offTrack=objectives.filter(objective=>['off','risk'].includes(objectiveStatus(objective))).length;
  const pending=objectives.filter(objective=>objectiveStatus(objective)==='pending').length;
  const criticalIssues=issues.filter(item=>item.severity==='critical').length;
  const currentUpdates=updateHistory.filter(item=>scope.owners.includes(item.owner)).length;
  document.getElementById('manager-scope-title').textContent=scope.title;
  document.getElementById('manager-owner-count').textContent=`${faNumber(scopedOwners.length)} Owner`;
  managerMetrics.innerHTML=`
    <article class="metric"><span>پیشرفت میانگین</span><strong>${progress===null?'—':`${faNumber(progress)}٪`}</strong><small>${faNumber(objectives.length)} Objective در این حوزه</small></article>
    <article class="metric"><span>خارج از مسیر</span><strong class="${offTrack?'amber':'green'}">${faNumber(offTrack)}</strong><small>${faNumber(pending)} Objective با Target ناقص</small></article>
    <article class="metric"><span>مورد بحرانی</span><strong class="${criticalIssues?'red':'green'}">${faNumber(criticalIssues)}</strong><small>Blocker یا Risk فعال</small></article>
    <article class="metric"><span>Update این نشست</span><strong>${faNumber(currentUpdates)}</strong><small>از ${faNumber(scopedOwners.length)} Owner مسئول</small></article>`;

  managerOwnerTable.innerHTML=scopedOwners.map(owner=>{
    const ownerObjectives=objectives.filter(objective=>objective.owner===owner);
    const ownerProgress=averageProgress(ownerObjectives);
    const ownerIssues=issues.filter(item=>item.owner===owner).length;
    const ownerCommitments=commitments.filter(item=>item.owner===owner).length;
    const hasUpdate=updateHistory.some(item=>item.owner===owner);
    return `<article class="manager-owner-row">
      <div class="manager-owner-identity"><span>${esc(owner.slice(0,1))}</span><div><b>${esc(owner)}</b><small>${esc([...new Set(ownerObjectives.map(item=>item.team))].join('، '))}</small></div></div>
      <div class="manager-progress"><b>${ownerProgress===null?'—':`${faNumber(ownerProgress)}٪`}</b><progress value="${ownerProgress??0}" max="100"></progress></div>
      <div class="manager-cell"><small>مسئله فعال</small><b class="${ownerIssues?'red':''}">${faNumber(ownerIssues)}</b></div>
      <div class="manager-cell"><small>تعهد فعال</small><b>${faNumber(ownerCommitments)}</b></div>
      <span class="manager-freshness ${hasUpdate?'current':'baseline'}">${hasUpdate?'Update جدید':'Baseline فایل'}</span>
    </article>`;
  }).join('')||'<div class="manager-empty">Owner فعالی در این حوزه وجود ندارد.</div>';

  const attention=[];
  issues.filter(item=>item.severity==='critical').slice(0,3).forEach(item=>attention.push({kind:'critical',title:item.title,detail:`${item.team} · Owner: ${item.owner}`,pane:'blockers'}));
  objectives.filter(objective=>objectiveStatus(objective)==='pending').forEach(objective=>attention.push({kind:'critical',title:`Targetهای ${objective.team} تکمیل نشده‌اند`,detail:`Owner: ${objective.owner} · Progress قابل محاسبه نیست`,view:'objectives'}));
  decisions.filter(item=>item.priority==='critical').slice(0,2).forEach(item=>attention.push({kind:'warning',title:item.title,detail:`درخواست‌کننده: ${item.requester}`,pane:'decisions'}));
  const missingUpdates=scopedOwners.filter(owner=>!updateHistory.some(item=>item.owner===owner));
  if(missingUpdates.length)attention.push({kind:'info',title:`${faNumber(missingUpdates.length)} Owner هنوز Update جدید ثبت نکرده‌اند`,detail:missingUpdates.join('، '),view:'update'});
  managerAttentionList.innerHTML=attention.slice(0,6).map((item,index)=>`<article class="manager-attention-item ${item.kind}"><div><b>${esc(item.title)}</b><p>${esc(item.detail)}</p><button type="button" data-manager-action="${item.pane?`pane:${item.pane}`:`view:${item.view}`}" data-manager-index="${index}">پیگیری مورد</button></div></article>`).join('')||'<div class="manager-empty">مورد فوری برای مداخله مدیر ثبت نشده است.</div>';
  managerAttentionList.querySelectorAll('[data-manager-action]').forEach(button=>button.addEventListener('click',()=>{
    const [type,target]=button.dataset.managerAction.split(':');
    if(type==='pane')openExecutionPane(target);else showView(target);
  }));

  const statusOrder={pending:0,review:1,off:2,risk:3,on:4};
  managerObjectiveList.innerHTML=[...objectives].sort((a,b)=>statusOrder[objectiveStatus(a)]-statusOrder[objectiveStatus(b)]).map(objective=>{
    const status=objectiveStatus(objective);const meta=statusMeta[status];const value=objectiveProgress(objective);
    const warning=objective.krs.find(kr=>kr.blocker)?.blocker??(status==='pending'?'Targetهای نتیجه‌های کلیدی تعیین نشده‌اند':'مورد ویژه‌ای ثبت نشده است');
    return `<article class="manager-objective-row"><div><span class="kr-status ${meta.className}">${meta.label}</span><h3>${esc(objective.title)}</h3><p>${esc(objective.team)} · ${esc(warning)}</p></div><div class="manager-objective-score"><strong>${value===null?'—':`${faNumber(value)}٪`}</strong><progress value="${value??0}" max="100"></progress></div></article>`;
  }).join('');
  buildManagerBrief(scope,objectives,issues,decisions,commitments);
}

if(managerScope){
  fillSelect(managerScope,managerScopes.map(scope=>({value:scope.id,label:scope.label})),'حوزه‌ای موجود نیست');
  managerScope.addEventListener('change',renderManagerPanel);
  document.getElementById('manager-generate-brief').addEventListener('click',()=>{renderManagerPanel();notify('گزارش جلسه با آخرین وضعیت آماده شد.');});
  document.getElementById('manager-copy-brief').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(managerBriefText);notify('گزارش مدیریتی کپی شد.');}
    catch{notify('امکان کپی خودکار وجود ندارد؛ متن گزارش را انتخاب کنید.');}
  });
  renderManagerPanel();
}

if(document.modelContext?.registerTool){
  const projectNavigationLifecycle=new AbortController();
  Promise.resolve(document.modelContext.registerTool({
    name:'navigate_to_okr_project',
    title:'باز کردن پروژه OKR',
    description:'پروژه انتخاب‌شده را در نمای یکپارچه خانه باز می‌کند و Ownerها، Objectiveها و KRهای آن را نمایش می‌دهد.',
    inputSchema:{type:'object',properties:{project:{type:'string',enum:teams}},required:['project'],additionalProperties:false},
    annotations:{readOnlyHint:true,untrustedContentHint:false},
    execute(input){
      const projectIndex=teams.indexOf(input?.project);
      if(projectIndex<0)throw new Error('پروژه انتخاب‌شده معتبر نیست.');
      const objectives=okrObjectives.filter(objective=>objective.team===input.project);
      openOwnerDetail(input.project);
      return {project:input.project,owners:[...new Set(objectives.map(objective=>objective.owner))],objectiveCount:objectives.length,keyResultCount:objectives.reduce((sum,objective)=>sum+objective.krs.length,0)};
    }
  },{signal:projectNavigationLifecycle.signal})).catch(()=>{});
}
