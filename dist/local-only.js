/* This public preview never sends or stores appointment information. */
(() => {
  'use strict';
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
  document.addEventListener('submit', (event) => {
    event.preventDefault(); event.stopImmediatePropagation();
    showNotice(event.target);
  }, true);
  document.addEventListener('click', (event) => {
    const button = event.target.closest('button[type="submit"],input[type="submit"],.t-submit');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    showNotice(button.closest('form') || button.parentElement);
  }, true);
  HTMLFormElement.prototype.submit = function () { showNotice(this); };
  HTMLFormElement.prototype.requestSubmit = function () { showNotice(this); };
  // Network-level defence in addition to the document's connect-src and form-action policy.
  const originalFetch = window.fetch;
  window.fetch = function (resource, options) {
    const url = new URL(resource instanceof Request ? resource.url : resource, location.href);
    if (url.origin !== location.origin || (options?.method || 'GET').toUpperCase() !== 'GET') {
      return Promise.reject(new Error('Requests are disabled in this preview'));
    }
    return originalFetch.apply(this, arguments);
  };
  const open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    const target = new URL(url, location.href);
    if (target.origin !== location.origin || String(method).toUpperCase() !== 'GET') {
      throw new Error('Requests are disabled in this preview');
    }
    return open.apply(this, arguments);
  };
  navigator.sendBeacon = () => false;
})();
