const UA='Mozilla/5.0 (compatible; Publix-InStock-Command-Center/1.0)';
const PRODUCT_URLS={
  'RB-CC-P':'https://delivery.publix.com/store/publix/products/16588527-red-baron-classic-crust-pepperoni-pizza-20-6-oz',
  'RB-CC-C':'https://delivery.publix.com/store/publix/products/42484-red-baron-classic-crust-four-cheese-pizza-20-66-oz',
  'BBG-DUMP':'https://delivery.publix.com/store/publix/products/16913549-bibigo-chicken-vegetable-dumplings-korean-style-mini-wontons-24-oz',
  'BBG-CHK':'https://delivery.publix.com/store/publix/products/27993071-bibigo-korean-style-crunchy-chicken-with-soy-garlic-sauce-18-oz',
  'ED-HCP':'https://delivery.publix.com/store/publix/products/95863-edwards-hershey-s-chocolate-cr-me-pie-25-5-oz'
};
function parse(html){
  const t=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');
  if(/out of stock/i.test(t))return {status:'OOS',label:'OUT OF STOCK'};
  if(/many in stock|in stock|add to cart|add to order/i.test(t))return {status:'IN_STOCK',label:'IN STOCK'};
  return {status:'UNKNOWN',label:'CHECK FAILED'};
}
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=600');
  const ids=String(req.query.products||'').split(',').filter(Boolean).slice(0,12);
  const results={};
  await Promise.all(ids.map(async id=>{
    const url=PRODUCT_URLS[id];
    if(!url){results[id]={status:'NOT_MAPPED',label:'NOT MAPPED'};return}
    try{
      const r=await fetch(url,{headers:{'user-agent':UA,'accept':'text/html,application/xhtml+xml'}});
      if(!r.ok){results[id]={status:'UNKNOWN',label:'CHECK FAILED',http:r.status};return}
      results[id]={...parse(await r.text()),source:'Publix Delivery'};
    }catch(e){results[id]={status:'UNKNOWN',label:'CHECK FAILED'}}
  }));
  res.status(200).json({checkedAt:new Date().toISOString(),store:req.query.store||null,results});
};