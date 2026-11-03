/* Belarus phone fields, including forms rendered later by the legacy layout. */
(() => {
  const selector = 'input[type="tel"],input[name="phone"],input[data-tilda-rule="phone"]';
  function normalize(value) {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('375')) digits = digits.slice(3);
    else if (digits.startsWith('80') && digits.length === 11) digits = digits.slice(2);
    return digits;
  }
  function format(value) {
    const digits = normalize(value);
    if (digits.length !== 9) return value;
    return `+375 (${digits.slice(0,2)}) ${digits.slice(2,5)}-${digits.slice(5,7)}-${digits.slice(7)}`;
  }
  function prepare(root) {
    const checks=root.matches?.('input[type="checkbox"]')?[root]:root.querySelectorAll('input[type="checkbox"]');
    for (const checkbox of checks) {
      if (!checkbox.dataset.explicitConsent) {checkbox.checked=false;checkbox.defaultChecked=false;checkbox.dataset.explicitConsent='true';}
    }
    const fields = root.matches?.(selector) ? [root] : [...root.querySelectorAll(selector)];
    for (const field of fields) {
      if (field.dataset.belarusPhone) continue;
      field.dataset.belarusPhone = 'true';
      field.type = 'tel';
      field.placeholder = '+375 (29) 123-45-67';
      field.autocomplete = 'tel';
      field.inputMode = 'tel';
      field.maxLength = 25;
      field.title = 'Белорусский номер телефона: +375 (29) 123-45-67';
      field.addEventListener('blur', () => { field.value = format(field.value); });
    }
  }
  const observer = new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) {
      if (node.nodeType === 1) prepare(node);
    }
  });
  prepare(document);
  observer.observe(document.documentElement, {childList:true, subtree:true});
})();
