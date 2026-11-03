/* Only the configured first-party appointment endpoint may accept form data. */
(() => {
  'use strict';
  const originalFetch = window.fetch;
  let intakeEnabled = false;
  originalFetch.call(window, '/api/appointments').then(response => response.ok ? response.json() : null)
    .then(config => { intakeEnabled = config?.enabled === true; }).catch(() => {});
  const message = 'Демонстрационная версия: запись пока отключена. Данные не отправлены.';
  function showNotice(form) {
    if (!form) return;
    let notice = form.querySelector('[data-local-notice]');
    if (!notice) {
      notice = document.createElement('div');
      notice.dataset.localNotice = '';
      notice.setAttribute('role', 'status');
      notice.style.cssText = 'margin-top:16px;padding:14px;border-radius:8px;background:#f3f3f3;color:#333;font:14px/1.5 Arial,sans-serif;';
      form.appendChild(notice);
    }
    notice.textContent = message;
  }
  async function handleForm(form) {
    if (!intakeEnabled) return showNotice(form);
    if (!form || form.dataset.sending) return;
    const name = form.querySelector('input[name="name"],input[data-tilda-rule="name"],input[type="text"]')?.value.trim() || '';
    const phone = form.querySelector('input[type="tel"]')?.value || '';
    const consent = form.querySelector('input[type="checkbox"]')?.checked === true;
    showNotice(form);
    const notice = form.querySelector('[data-local-notice]');
    if (!name || !/^((375|80)?\d{9})$/.test(phone.replace(/\D/g,'')) || !consent) {
      notice.textContent = 'Укажите имя, белорусский номер +375 и подтвердите согласие на обработку данных.';
      return;
    }
    const values = JSON.stringify({name,phone,consent});
    if (form.dataset.requestValues !== values) {
      form.dataset.requestId = crypto.randomUUID();
      form.dataset.requestValues = values;
    }
    form.dataset.sending = 'true';
    notice.textContent = 'Сохраняем заявку…';
    try {
      const response = await originalFetch.call(window, '/api/appointments', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:form.dataset.requestId,name,phone,consent,page:location.pathname})});
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error('SAVE_FAILED');
      notice.textContent = 'Заявка сохранена. Администратор свяжется с вами для согласования времени.';
      form.reset();
    } catch {notice.textContent = 'Не удалось подтвердить сохранение заявки. Попробуйте ещё раз или позвоните +375 29 640-03-03.';}
    finally {delete form.dataset.sending;}
  }
  document.addEventListener('submit', (event) => {
    event.preventDefault(); event.stopImmediatePropagation();
    void handleForm(event.target);
  }, true);
  document.addEventListener('click', (event) => {
    const button = event.target.closest('button[type="submit"],input[type="submit"],.t-submit');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    void handleForm(button.closest('form') || button.parentElement);
  }, true);
  HTMLFormElement.prototype.submit = function () { void handleForm(this); };
  HTMLFormElement.prototype.requestSubmit = function () { void handleForm(this); };
  // Network-level defence in addition to the document's connect-src and form-action policy.
  function localReadOnlyResource(resource) {
    const url = new URL(resource instanceof Request ? resource.url : resource, location.href);
    if (/^feeds\.(tildaapi\.(biz|com)|tildacdn\.com)$/.test(url.hostname)) {
      if (url.pathname === '/api/getfeed/') {
        const uid = url.searchParams.get('feeduid');
        const size = Number(url.searchParams.get('size')) || 20;
        const slice = Number(url.searchParams.get('slice')) || 1;
        if (/^\d+$/.test(uid)) return new URL(`/feeds/${uid}-${size}-${slice}.json`, location.origin);
      }
      if (url.pathname === '/api/getpost/') {
        const uid = url.searchParams.get('postuid');
        if (/^[a-z0-9]+$/.test(uid)) return new URL(`/feeds/post-${uid}.json`, location.origin);
      }
    }
    return url;
  }
  window.fetch = function (resource, options) {
    const url = localReadOnlyResource(resource);
    if (url.origin !== location.origin || (options?.method || 'GET').toUpperCase() !== 'GET') {
      return Promise.reject(new Error('Requests are disabled in this preview'));
    }
    return originalFetch.call(this, url.href, options);
  };
  const open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    const target = localReadOnlyResource(url);
    if (target.origin !== location.origin || String(method).toUpperCase() !== 'GET') {
      throw new Error('Requests are disabled in this preview');
    }
    return open.call(this, method, target.href, ...Array.from(arguments).slice(2));
  };
  navigator.sendBeacon = () => false;
})();
