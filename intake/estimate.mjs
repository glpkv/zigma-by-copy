import catalog from '../public/service-catalog.json' with {type:'json'};
export function calculateEstimate(selection = [], pricing = catalog) {
  if (!Array.isArray(selection) || selection.length > pricing.services.length) throw new Error('INVALID_SELECTION');
  const seen = new Set();
  const items = selection.map(value => {
    const service = pricing.services.find(service => service.id === value?.id);
    if (!service || seen.has(value.id) || !Number.isInteger(value.quantity) || value.quantity < 1 || value.quantity > service.maxQuantity) throw new Error('INVALID_SELECTION');
    seen.add(value.id);
    return {id:service.id,label:service.label,quantity:value.quantity,min:service.min,max:service.max};
  });
  const priced = items.length > 0 && items.every(item => Number.isFinite(item.min) && Number.isFinite(item.max) && item.min >= 0 && item.max >= item.min);
  return {items,min:priced?items.reduce((sum,item)=>sum+Math.round(item.min*100)*item.quantity,0)/100:null,max:priced?items.reduce((sum,item)=>sum+Math.round(item.max*100)*item.quantity,0)/100:null,currency:pricing.currency,version:pricing.version};
}
