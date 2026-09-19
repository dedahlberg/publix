(()=>{
const data=window.PUBLIX_DATA||{stores:[],products:[]},$=s=>document.querySelector(s),actionsKey='publix_case_actions_v1';
let selected=null,view='store';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=()=>{try{return JSON.parse(localStorage.getItem(actionsKey)||'{}')}catch{return{}}};
const write=v=>localStorage.setItem(actionsKey,JSON.stringify(v));
const inventory=()=>null;
const availabilityCache={};
const availability=(storeId,pid)=>availabilityCache[storeId]?.[pid]||{status:'NOT_CHECKED',label:'NOT CHECKED'};
async function checkAvailability(store){
  const ids=data.products.map(p=>p.productId).join(',');
  try{
    const r=await fetch('/api/publix-availability?store='+encodeURIComponent(store.id)+'&postal='+encodeURIComponent(store.zip||'')+'&products='+encodeURIComponent(ids),{cache:'no-store'});
    if(!r.ok)throw new Error('availability');
    const j=await r.json();availabilityCache[store.id]=j.results||{};
  }catch(e){availabilityCache[store.id]=Object.fromEntries(data.products.map(p=>[p.productId,{status:'UNKNOWN',label:'CHECK FAILED'}]));}
}
const AREA_MAP=[
  {min:100,max:199,name:'Northeast',code:'100s'},
  {min:200,max:299,name:'Mid-Atlantic',code:'200s'},
  {min:400,max:499,name:'Southeast',code:'400s'},
  {min:500,max:599,name:'South',code:'500s'},
  {min:600,max:699,name:'Great Plains',code:'600s'},
  {min:700,max:799,name:'Great Midwest',code:'700s'},
  {min:800,max:899,name:'Gateway',code:'800s'},
  {min:900,max:999,name:'Texas',code:'900s'},
  {min:1200,max:1299,name:'Southwest',code:'1200s'},
  {min:1300,max:1399,name:'Northwest',code:'1300s'}
];
const areaFor=s=>{const n=Number(s.asm);const a=AREA_MAP.find(x=>n>=x.min&&n<=x.max);return a?{...a,label:a.name+' ('+a.code+')'}:{name:'Unassigned',code:'',label:'Unassigned'}};
const storeLabel=s=>s.asm?('Zone '+s.asm):s.region;
function init(){
  data.stores.forEach(s=>{const a=areaFor(s);s.area=a.name;s.areaLabel=a.label;s.division=a.name;s.region='Zone '+s.asm});fillFilters();bindNav();fillStores();renderRegional();
  $('#divisionFilter').onchange=()=>{refreshZones();$('#regionFilter').value='all';fillStores();}; $('#regionFilter').onchange=fillStores; $('#deliveryFilter').onchange=fillStores;
  $('#storeFilter').onchange=()=>load($('#storeFilter').value);
  $('#exportBtn').onclick=exportStore;$('#refreshBtn').onclick=()=>selected&&load(selected.id);
}
function fillFilters(){
  const areaSel=$('#divisionFilter'),zoneSel=$('#regionFilter'),daySel=$('#deliveryFilter');
  areaSel.innerHTML='<option value="all">All areas</option>'+AREA_MAP.map(a=>`<option value="${esc(a.name)}">${esc(a.label)}</option>`).join('');
  zoneSel.innerHTML='<option value="all">All zones</option>';
  daySel.innerHTML='<option value="all">All delivery days</option>'+['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=>`<option>${x}</option>`).join('');
  refreshZones();
}
function refreshZones(){
  const area=$('#divisionFilter').value,zoneSel=$('#regionFilter'),current=zoneSel.value;
  const zones=[...new Set(data.stores.filter(s=>area==='all'||s.area===area).map(s=>Number(s.asm)))].sort((a,b)=>a-b);
  zoneSel.innerHTML='<option value="all">All zones</option>'+zones.map(x=>`<option value="Zone ${x}">Zone ${x}</option>`).join('');
  if([...zoneSel.options].some(o=>o.value===current))zoneSel.value=current;
}
function filteredStores(){
  let a=[...data.stores],d=$('#divisionFilter').value,r=$('#regionFilter').value,day=$('#deliveryFilter').value;
  if(d!=='all')a=a.filter(s=>s.division===d);if(r!=='all')a=a.filter(s=>s.region===r);if(day!=='all')a=a.filter(s=>s.deliveryDays.includes(day));return a;
}
function fillStores(){
  const a=filteredStores().sort((x,y)=>Number(x.id)-Number(y.id)),sel=$('#storeFilter');sel.innerHTML=`<option value="">Select Publix store (${a.length})</option>`+a.map(s=>`<option value="${esc(s.id)}">${esc(s.name)} — ${esc(s.city)}, ${esc(s.state)}</option>`).join('');
  if(selected&&a.some(s=>s.id===selected.id))sel.value=selected.id;
}
function bindNav(){
  document.querySelectorAll('.rail nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.rail nav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');view=b.dataset.view;
    document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
    if(view==='regional')$('#regionalView').classList.add('active');else $('#storeView').classList.add('active');
    renderItems();
  });
}
async function load(id){
  selected=data.stores.find(s=>s.id===id);if(!selected)return;
  $('#storeName').textContent=`${selected.name} — ${selected.city}`;$('#storeAddress').textContent=selected.address;$('#storeId').textContent=`Store ID ${selected.id}`;
  $('#divisionValue').textContent=selected.areaLabel||areaFor(selected).label;$('#regionValue').textContent=storeLabel(selected);$('#deliveryValue').textContent=selected.deliveryDays.join(', ');
  $('#rateDetail').textContent='Checking Publix availability…';renderItems();await checkAvailability(selected);renderItems();
}
function renderItems(){
  if(!selected){$('#itemRows').innerHTML='<tr><td colspan="10" class="empty">Select a store to begin.</td></tr>';return}
  const acts=read();let items=data.products.map(p=>({...p,qty:null,...availability(selected.id,p.productId)}));
  const checked=items.filter(x=>['OOS','IN_STOCK'].includes(x.status)),o=checked.filter(x=>x.status==='OOS').length,i=checked.filter(x=>x.status==='IN_STOCK').length,rate=checked.length?i/checked.length*100:0;
  $('#oosKpi').textContent=checked.length?o:'—';$('#inKpi').textContent=checked.length?i:'—';$('#rateKpi').textContent=checked.length?rate.toFixed(1)+'%':'—';$('#rateDetail').textContent=checked.length?`${i} / ${checked.length} confirmed available`:'Availability feed not connected';$('#trackedCount').textContent=`${items.length} tracked products`;
  if(view==='unavailable')items=items.filter(x=>x.status==='OOS');
  if(view==='cases')items=items.filter(x=>(acts[`${selected.id}|${x.productId}`]?.qty||0)>0);
  const totalCases=Object.entries(acts).filter(([k])=>k.startsWith(selected.id+'|')).reduce((s,[,v])=>s+(Number(v.qty)||0),0);
  $('#casesValue').textContent=`${totalCases} open`;$('#caseKpi').textContent=totalCases;
  $('#itemRows').innerHTML=items.map((x,n)=>{const key=`${selected.id}|${x.productId}`,a=acts[key]||{},q=Number(a.qty)||0,p=Number(a.casePrice??x.casePrice)||0;return `<tr data-key="${key}"><td>${n+1}</td><td>${esc(x.brand)}</td><td>${esc(x.name)}</td><td>${esc(x.category)}</td><td>${esc(x.productId)}</td><td>${x.qty??'—'}</td><td><span class="pill ${x.status==='OOS'?'oos':x.status==='IN_STOCK'?'stock':''}">${x.label}</span></td><td><select class="order">${[0,1,2,3,4,5,6,7,8,9,10].map(v=>`<option ${q===v?'selected':''}>${v}</option>`).join('')}</select></td><td><input class="price" type="number" step=".01" value="${p.toFixed(2)}"></td><td class="money">$${(q*p).toFixed(2)}</td></tr>`}).join('')||'<tr><td colspan="10" class="empty">No items match this view.</td></tr>';
  document.querySelectorAll('#itemRows tr[data-key]').forEach(row=>{const key=row.dataset.key,order=row.querySelector('.order'),price=row.querySelector('.price');const save=()=>{const all=read(),q=Number(order.value)||0,p=Number(price.value)||0;if(q)all[key]={qty:q,casePrice:p};else delete all[key];write(all);row.querySelector('.money').textContent='$'+(q*p).toFixed(2);renderKpiCases()};order.onchange=save;price.onchange=save});
}
function renderKpiCases(){if(!selected)return;const acts=read(),c=Object.entries(acts).filter(([k])=>k.startsWith(selected.id+'|')).reduce((s,[,v])=>s+(Number(v.qty)||0),0);$('#casesValue').textContent=`${c} open`;$('#caseKpi').textContent=c}
function renderRegional(){
  const areas=AREA_MAP.filter(a=>data.stores.some(s=>s.area===a.name));$('#regionalGrid').innerHTML=areas.map(a=>{const stores=data.stores.filter(s=>s.area===a.name),zones=[...new Set(stores.map(s=>s.asm))].sort((x,y)=>Number(x)-Number(y));return `<article class="region-card"><h3>${esc(a.label)}</h3><div class="metric">${stores.length}</div><small>${zones.length} zones • ${esc(zones.map(z=>'Zone '+z).join(', '))}</small></article>`}).join('');
}
function exportStore(){if(!selected)return;const acts=read(),rows=[['Brand','Item','Category','Product ID','Status','Qty Ordered','Case Price','Added $'],...data.products.map(x=>{const qoh=null,a=acts[`${selected.id}|${x.productId}`]||{},q=Number(a.qty)||0,p=Number(a.casePrice??x.casePrice)||0;return[x.brand,x.name,x.category,x.productId,'NOT_CHECKED',q,p,(q*p).toFixed(2)]})];const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n'),blob=new Blob([csv],{type:'text/csv'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Publix-${selected.id}-Store-Action.csv`;a.click();URL.revokeObjectURL(a.href)}
document.addEventListener('DOMContentLoaded',init);
})();