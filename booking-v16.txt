/* Nik's Tattoo — booking form / Turnstile v16.
   Public site key may be used here; Telegram bot token and Turnstile secret must remain in the Worker. */
(() => {
  'use strict';
  const form = document.getElementById('bookingForm');
  const status = document.getElementById('bookingResponse');
  const button = form?.querySelector('button[type="submit"]');
  const buttonLabel = button?.querySelector('span');
  const widgetBox = document.getElementById('bookingTurnstile');
  const intro = document.querySelector('.booking-intro');
  if (!form || !button || !status) return;

  const apiUrl = document.querySelector('meta[name="booking-api"]')?.content?.trim() || '';
  const siteKey = document.querySelector('meta[name="turnstile-site-key"]')?.content?.trim() || '';
  const configured = /^https:\/\//i.test(apiUrl) && !apiUrl.includes('PASTE_') &&
    /^[A-Za-z0-9_-]{8,}$/.test(siteKey) && !siteKey.includes('PASTE_');
  let widgetId = null;
  let turnstileToken = '';
  let pending = false;
  let loadingProblem = false;

  const say = (message, state = 'info') => {
    status.textContent = message;
    status.dataset.state = state;
  };
  const localZone = () => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Не указан'; }
    catch { return 'Не указан'; }
  };
  const value = (name) => String(new FormData(form).get(name) || '').trim();
  const formValues = () => ({
    name: value('name'), contact: value('contact'), service: value('service'),
    city: value('city'), date: value('date'), time: value('time'),
    timezone: value('timezone') || localZone(), idea: value('idea'), website: value('website')
  });
  const fmt = (data) => [
    'Новая заявка с сайта Nik’s Tattoo',
    `Имя: ${data.name}`, `Контакт: ${data.contact}`,
    `Услуга: ${data.service}`, `Город: ${data.city}`,
    `Желаемая дата: ${data.date}`, `Желаемое время: ${data.time}`,
    `Часовой пояс клиента: ${data.timezone}`,
    `Идея: ${data.idea || 'Не указана'}`,
    'Время предварительное, требуется согласование с мастером.'
  ].join('\n');

  async function copyFallback(message) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
        return true;
      }
    } catch (_) { /* old Safari */ }
    const field = document.createElement('textarea');
    field.value = message;
    field.readOnly = true;
    field.style.cssText = 'position:fixed;top:-9999px;left:-9999px';
    document.body.append(field);
    field.focus();
    field.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (_) { /* ignore */ }
    field.remove();
    return copied;
  }

  if (configured) {
    if (buttonLabel) buttonLabel.textContent = 'ОТПРАВИТЬ ЗАЯВКУ';
    if (intro) intro.textContent = 'Заполни форму, и заявка сразу придёт мне в Telegram. Я свяжусь с тобой, чтобы обсудить детали и согласовать время.';
    if (widgetBox) {
      // The published HTML intentionally ships this block with `hidden`.
      // It MUST be made visible before invoking turnstile.render().
      widgetBox.hidden = false;
      widgetBox.removeAttribute('hidden');
      widgetBox.style.display = 'block';
      widgetBox.style.width = '100%';
      widgetBox.style.minHeight = '65px';
    }

    function renderWidget() {
      if (widgetId !== null || !widgetBox || typeof window.turnstile?.render !== 'function') return false;
      try {
        const id = window.turnstile.render(widgetBox, {
          sitekey: siteKey,
          theme: 'dark',
          size: 'flexible',
          appearance: 'always',
          execution: 'render',
          callback: (token) => {
            turnstileToken = token;
            loadingProblem = false;
            if (status.dataset.state === 'error') say('');
          },
          'error-callback': (code) => {
            turnstileToken = '';
            loadingProblem = true;
            say('Ошибка Cloudflare Turnstile' + (code ? ` (${code})` : '') + '. Отключи блокировщик рекламы или VPN и обнови страницу.', 'error');
          },
          'expired-callback': () => {
            turnstileToken = '';
            say('Срок проверки истёк. Подтверди её заново.', 'error');
          },
          'timeout-callback': () => {
            turnstileToken = '';
            say('Проверка Cloudflare заняла слишком много времени. Попробуй ещё раз.', 'error');
          }
        });
        if (id === null || typeof id === 'undefined') throw new Error('render returned no widget ID');
        widgetId = id;
        loadingProblem = false;
        return true;
      } catch (error) {
        console.error('Turnstile render failed:', error);
        loadingProblem = true;
        say('Проверка Cloudflare не запустилась. Обнови страницу или открой её в другом браузере.', 'error');
        return false;
      }
    }

    if (!widgetBox) {
      loadingProblem = true;
      say('Блок проверки Cloudflare не найден на странице.', 'error');
    } else {
      let tries = 0;
      let recoveryStarted = false;
      const waitForSDK = () => {
        if (widgetId !== null) return;
        if (renderWidget()) return;
        tries += 1;
        // A fallback load helps when the original async script failed once.
        if (tries === 20 && !recoveryStarted && typeof window.turnstile?.render !== 'function') {
          recoveryStarted = true;
          const script = document.createElement('script');
          script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
          script.async = true;
          script.addEventListener('load', renderWidget, { once: true });
          script.addEventListener('error', () => {
            loadingProblem = true;
            say('Cloudflare не загружается. Проверь блокировщик рекламы, VPN или сеть.', 'error');
          }, { once: true });
          document.head.append(script);
        }
        if (tries < 100) {
          window.setTimeout(waitForSDK, 300);
        } else if (widgetId === null) {
          loadingProblem = true;
          say('Не удалось загрузить Cloudflare Turnstile. Открой сайт в другом браузере или отключи блокировщик рекламы.', 'error');
        }
      };
      waitForSDK();
    }
  }

  // Capture prevents the legacy form handler in script.js from submitting the form.
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (pending || !form.reportValidity()) return;
    const data = formValues();
    if (!data.contact || !data.name || !data.city || !data.date || !data.time) {
      say('Заполни обязательные поля и укажи контакт для ответа.', 'error');
      return;
    }
    if (!configured) {
      const copied = await copyFallback(fmt(data));
      say(copied
        ? 'Заявка скопирована. Нажми «НАПИСАТЬ В TELEGRAM» ниже и вставь сообщение.'
        : 'Не удалось скопировать. Открой Telegram по ссылке ниже и отправь данные вручную.',
        copied ? 'success' : 'error');
      return;
    }
    if (widgetId === null || typeof window.turnstile?.getResponse !== 'function') {
      say(loadingProblem ? 'Проверка Cloudflare не работает. Попробуй открыть сайт в другом браузере.'
        : 'Проверка безопасности ещё загружается. Попробуй чуть позже.', 'error');
      return;
    }
    const token = window.turnstile.getResponse(widgetId) || turnstileToken;
    if (!token) {
      say('Дождись завершения проверки Cloudflare перед отправкой заявки.', 'error');
      return;
    }

    pending = true;
    button.disabled = true;
    if (buttonLabel) buttonLabel.textContent = 'ОТПРАВЛЯЕМ...';
    say('Отправляем заявку...');
    try {
      const response = await fetch(apiUrl, {
        method: 'POST', mode: 'cors', credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, turnstileToken: token })
      });
      let payload = {};
      try { payload = await response.json(); } catch (_) { /* ignore */ }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || 'Не получилось отправить. Попробуй снова или напиши в Telegram.');
      }
      say('Заявка отправлена! Никита получил сообщение. Дата и время будут подтверждены в переписке.', 'success');
      form.reset();
    } catch (error) {
      say(error.message || 'Ошибка соединения. Попробуй ещё раз или напиши в Telegram.', 'error');
    } finally {
      turnstileToken = '';
      try { window.turnstile?.reset(widgetId); } catch (_) { /* ignore */ }
      pending = false;
      button.disabled = false;
      if (buttonLabel) buttonLabel.textContent = 'ОТПРАВИТЬ ЗАЯВКУ';
    }
  }, true);
})();
