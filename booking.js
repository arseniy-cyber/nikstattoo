/* Nik's Tattoo: заявки в Telegram через Cloudflare Worker, v15.
   Токен бота НИКОГДА не добавлять сюда или в GitHub. */
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
  let pending = false;

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
    name: value('name'),
    contact: value('contact'),
    service: value('service'),
    city: value('city'),
    date: value('date'),
    time: value('time'),
    timezone: value('timezone') || localZone(),
    idea: value('idea'),
    website: value('website')
  });

  const fmt = (data) => [
    'Новая заявка с сайта Nik’s Tattoo',
    `Имя: ${data.name}`,
    `Контакт: ${data.contact}`,
    `Услуга: ${data.service}`,
    `Город: ${data.city}`,
    `Желаемая дата: ${data.date}`,
    `Желаемое время: ${data.time}`,
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
    } catch (_) { /* Старый Safari: попробуем второй способ */ }
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
    if (widgetBox) widgetBox.hidden = false;
    let tries = 0;
    const prepare = () => {
      if (widgetId !== null || !widgetBox) return;
      if (typeof window.turnstile?.render === 'function') {
        try {
          widgetId = window.turnstile.render(widgetBox, {
            sitekey: siteKey,
            theme: 'dark',
            size: 'flexible',
            appearance: 'always',
            'error-callback': () => say('Не удалось проверить защиту от спама. Обнови страницу и попробуй снова.', 'error'),
            'expired-callback': () => say('Проверка устарела. Подтверди её заново.', 'error')
          });
        } catch (e) {
          say('Проверка от спама не загрузилась. Обнови страницу.', 'error');
        }
      } else if (++tries <= 25) {
        window.setTimeout(prepare, 400);
      }
    };
    prepare();
  }

  // Capture=true: новая отправка не конфликтует со старой логикой копирования из script.js.
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (pending) return;
    if (!form.reportValidity()) return;

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
    if (widgetId === null || !window.turnstile) {
      say('Загружается проверка безопасности. Попробуй ещё раз.', 'error');
      return;
    }
    const turnstileToken = window.turnstile.getResponse(widgetId);
    if (!turnstileToken) {
      say('Подтверди проверку от спама и нажми «ОТПРАВИТЬ ЗАЯВКУ» ещё раз.', 'error');
      return;
    }
    pending = true;
    button.disabled = true;
    if (buttonLabel) buttonLabel.textContent = 'ОТПРАВЛЯЕМ...';
    say('Отправляем заявку...');
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ ...data, turnstileToken })
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
      try { window.turnstile?.reset(widgetId); } catch (_) { /* ignore */ }
      pending = false;
      button.disabled = false;
      if (buttonLabel) buttonLabel.textContent = 'ОТПРАВИТЬ ЗАЯВКУ';
    }
  }, true);
})();
