const UA='Mozilla/5.0 (compatible; Publix-InStock-Command-Center/1.0)';
const PRODUCT_URLS={
  'RB-CC-P':'https://delivery.publix.com/store/publix/products/16588527-red-baron-classic-crust-pepperoni-pizza-20-6-oz',
  'RB-CC-C':'https://delivery.publix.com/store/publix/products/42484-red-baron-classic-crust-four-cheese-pizza-20-66-oz',
  'BBG-DUMP':'https://delivery.publix.com/store/publix/products/16913549-bibigo-chicken-vegetable-dumplings-korean-style-mini-wontons-24-oz',
  'BBG-CHK':'https://delivery.publix.com/store/publix/products/27993071-bibigo-korean-style-crunchy-chicken-with-soy-garlic-sauce-18-oz',
  'ED-HCP':'https://delivery.publix.com/store/publix/products/95863-edwards-hershey-s-chocolate-cr-me-pie-25-5-oz',
  'RB-CC-DLX':'https://delivery.publix.com/store/publix/products/42519-red-baron-classic-crust-special-deluxe-pizza-22-95-oz',
  'RB-CC-SUP':'https://delivery.publix.com/store/publix/products/42473-red-baron-classic-crust-supreme-pizza-23-45-oz',
  'RB-CC-4M':'https://delivery.publix.com/store/publix/products/19157250-red-baron-classic-crust-four-meat-pizza-21-95-oz',
  'RB-BO-P':'https://delivery.publix.com/store/publix/products/2134310-red-baron-brick-oven-crust-pepperoni-pizza-17-89-oz',
  'RB-TC-P':'https://delivery.publix.com/store/publix/products/42523-red-baron-thin-crispy-crust-pepperoni-pizza-447-0-g',
  'RB-FL-P':'https://delivery.publix.com/store/publix/products/25886289-red-baron-pizza-fully-loaded-pepperoni-27-85-oz',
  'RB-FL-UP':'https://delivery.publix.com/store/publix/products/29221537-red-baron-pizza-hand-tossed-ultimate-pepperoni-fully-loaded-28-75-oz',
  'RB-DD-C':'https://delivery.publix.com/store/publix/products/20571842-red-baron-deep-dish-singles-four-cheese-pizza-11-2-oz',
  'RB-DD-S':'https://delivery.publix.com/store/publix/products/16927648-red-baron-deep-dish-singles-supreme-pizza-11-5-oz',
  'RB-BO-S':'https://delivery.publix.com/store/publix/products/21091416-red-baron-brick-oven-crust-supreme-pizza-18-64-oz'
};
function parse(html){
  const t=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');
  if(/out of stock|item isn't available|item isn.t available|not available in/i.test(t))return {status:'OOS',label:'OUT OF STOCK'};
  if(/available in|many in stock|in stock|add to cart|add to order/i.test(t))return {status:'IN_STOCK',label:'IN STOCK'};
  return {status:'UNKNOWN',label:'CHECK FAILED'};
}
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=600');
  const ids=String(req.query.products||'').split(',').filter(Boolean).slice(0,12);
  const results={};
  await Promise.all(ids.map(async id=>{
    const base=PRODUCT_URLS[id];
    const postal=String(req.query.postal||'').replace(/\D/g,'').slice(0,5);
    const url=base&&postal?base.replace('/store/publix/products/','/landing?postal_code='+postal+'&product_id=').replace(/-([a-z0-9-]+)$/i,'')+'&retailer_id=57':base;
    if(!base){results[id]={status:'NOT_MAPPED',label:'NOT MAPPED'};return}
    try{
      const r=await fetch(url,{headers:{'user-agent':UA,'accept':'text/html,application/xhtml+xml'}});
      if(!r.ok){results[id]={status:'UNKNOWN',label:'CHECK FAILED',http:r.status};return}
      results[id]={...parse(await r.text()),source:'Publix Delivery'};
    }catch(e){results[id]={status:'UNKNOWN',label:'CHECK FAILED'}}
  }));
  res.status(200).json({checkedAt:new Date().toISOString(),store:req.query.store||null,results});
};