(()=>{
const data=window.PUBLIX_DATA||{stores:[],products:[]},$=s=>document.querySelector(s),actionsKey='publix_case_actions_v1';
let selected=null,view='store';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=()=>{try{return JSON.parse(localStorage.getItem(actionsKey)||'{}')}catch{return{}}};
const write=v=>localStorage.setItem(actionsKey,JSON.stringify(v));
const inventory=(storeId,pid)=>{const seed=(String(storeId)+pid).split('').reduce((a,c)=>a+c.charCodeAt(0),0);return seed%7===0?0:(seed%5)+1};
function init(){
  fillFilters();bindNav();fillStores();renderRegional();
  ['divisionFilter','regionFilter','deliveryFilter'].forEach(id=>$('#'+id).onchange=()=>{fillStores();});
  $('#storeFilter').onchange=()=>load($('#storeFilter').value);
  $('#exportBtn').onclick=exportStore;$('#refreshBtn').onclick=()=>selected&&load(selected.id);
}
function fillFilters(){
  [...new Set(data.stores.map(s=>s.division))].sort().forEach(x=>$('#divisionFilter').insertAdjacentHTML('beforeend',`<option>${esc(x)}</option>`));
  [...new Set(data.stores.map(s=>s.region))].sort().forEach(x=>$('#regionFilter').insertAdjacentHTML('beforeend',`<option>${esc(x)}</option>`));
  ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(x=>$('#deliveryFilter').insertAdjacentHTML('beforeend',`<option>${x}</option>`));
}
function filteredStores(){
  let a=[...data.stores],d=$('#divisionFilter').value,r=$('#regionFilter').value,day=$('#deliveryFilter').value;
  if(d!=='all')a=a.filter(s=>s.division===d);if(r!=='all')a=a.filter(s=>s.region===r);if(day!=='all')a=a.filter(s=>s.deliveryDays.includes(day));return a;
}
function fillStores(){
  const a=filteredStores(),sel=$('#storeFilter');sel.innerHTML='<option value="">Select Publix store</option>'+a.map(s=>`<option value="${esc(s.id)}">${esc(s.name)} — ${esc(s.city)}, ${esc(s.state)}</option>`).join('');
  if(selected&&a.some(s=>s.id===selected.id))sel.value=selected.id;
}
function bindNav(){
  document.querySelectorAll('.rail nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.rail nav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');view=b.dataset.view;
    document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
    if(view==='regional')$('#regionalView').classList.add('active');else $('#storeView').classList.add('active');
    renderItems();
  });
}
function load(id){
  selected=data.stores.find(s=>s.id===id);if(!selected)return;
  $('#storeName').textContent=`${selected.name} — ${selected.city}`;$('#storeAddress').textContent=selected.address;$('#storeId').textContent=`Store ID ${selected.id}`;
  $('#divisionValue').textContent=selected.division;$('#regionValue').textContent=selected.region;$('#deliveryValue').textContent=selected.deliveryDays.join(', ');
  renderItems();
}
function renderItems(){
  if(!selected){$('#itemRows').innerHTML='<tr><td colspan="10" class="empty">Select a store to begin.</td></tr>';return}
  const acts=read();let items=data.products.map(p=>({...p,qty:inventory(selected.id,p.productId)})).map(p=>({...p,status:p.qty===0?'OOS':'IN_STOCK'}));
  const o=items.filter(x=>x.status==='OOS').length,i=items.length-o,rate=items.length?i/items.length*100:0;
  $('#oosKpi').textContent=o;$('#inKpi').textContent=i;$('#rateKpi').textContent=rate.toFixed(1)+'%';$('#rateDetail').textContent=`${i} / ${items.length} confirmed available`;$('#trackedCount').textContent=`${items.length} tracked products`;
  if(view==='unavailable')items=items.filter(x=>x.status==='OOS');
  if(view==='cases')items=items.filter(x=>(acts[`${selected.id}|${x.productId}`]?.qty||0)>0);
  const totalCases=Object.entries(acts).filter(([k])=>k.startsWith(selected.id+'|')).reduce((s,[,v])=>s+(Number(v.qty)||0),0);
  $('#casesValue').textContent=`${totalCases} open`;$('#caseKpi').textContent=totalCases;
  $('#itemRows').innerHTML=items.map((x,n)=>{const key=`${selected.id}|${x.productId}`,a=acts[key]||{},q=Number(a.qty)||0,p=Number(a.casePrice??x.casePrice)||0;return `<tr data-key="${key}"><td>${n+1}</td><td>${esc(x.brand)}</td><td>${esc(x.name)}</td><td>${esc(x.category)}</td><td>${esc(x.productId)}</td><td>${x.qty}</td><td><span class="pill ${x.status==='OOS'?'oos':'stock'}">${x.status==='OOS'?'OOS':'IN STOCK'}</span></td><td><select class="order">${[0,1,2,3,4,5,6,7,8,9,10].map(v=>`<option ${q===v?'selected':''}>${v}</option>`).join('')}</select></td><td><input class="price" type="number" step=".01" value="${p.toFixed(2)}"></td><td class="money">$${(q*p).toFixed(2)}</td></tr>`}).join('')||'<tr><td colspan="10" class="empty">No items match this view.</td></tr>';
  document.querySelectorAll('#itemRows tr[data-key]').forEach(row=>{const key=row.dataset.key,order=row.querySelector('.order'),price=row.querySelector('.price');const save=()=>{const all=read(),q=Number(order.value)||0,p=Number(price.value)||0;if(q)all[key]={qty:q,casePrice:p};else delete all[key];write(all);row.querySelector('.money').textContent='$'+(q*p).toFixed(2);renderKpiCases()};order.onchange=save;price.onchange=save});
}
function renderKpiCases(){if(!selected)return;const acts=read(),c=Object.entries(acts).filter(([k])=>k.startsWith(selected.id+'|')).reduce((s,[,v])=>s+(Number(v.qty)||0),0);$('#casesValue').textContent=`${c} open`;$('#caseKpi').textContent=c}
function renderRegional(){
  const regions=[...new Set(data.stores.map(s=>s.region))];$('#regionalGrid').innerHTML=regions.map(r=>{const stores=data.stores.filter(s=>s.region===r),items=stores.flatMap(s=>data.products.map(p=>inventory(s.id,p.productId))),ins=items.filter(q=>q>0).length,rate=items.length?ins/items.length*100:0;return `<article class="region-card"><h3>${esc(r)}</h3><div class="metric">${rate.toFixed(1)}%</div><small>${stores.length} stores • ${items.length-ins} OOS signals</small></article>`}).join('');
}
function exportStore(){if(!selected)return;const acts=read(),rows=[['Brand','Item','Category','Product ID','Status','Qty Ordered','Case Price','Added $'],...data.products.map(x=>{const qoh=inventory(selected.id,x.productId),a=acts[`${selected.id}|${x.productId}`]||{},q=Number(a.qty)||0,p=Number(a.casePrice??x.casePrice)||0;return[x.brand,x.name,x.category,x.productId,qoh===0?'OOS':'IN_STOCK',q,p,(q*p).toFixed(2)]})];const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n'),blob=new Blob([csv],{type:'text/csv'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Publix-${selected.id}-Store-Action.csv`;a.click();URL.revokeObjectURL(a.href)}
document.addEventListener('DOMContentLoaded',init);
})();