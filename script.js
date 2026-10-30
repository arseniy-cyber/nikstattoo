'use strict';

const menuDialog = document.getElementById('menuDialog');
const galleryDialog = document.getElementById('galleryDialog');
const lightboxDialog = document.getElementById('lightboxDialog');

function modalOpen(dialog) { if (!dialog.open) dialog.showModal(); }
function modalClose(dialog) { if (dialog.open) dialog.close(); }
function closeByBackdrop(dialog) {
  dialog.addEventListener('click', event => { if (event.target === dialog) modalClose(dialog); });
}
[menuDialog, galleryDialog, lightboxDialog].forEach(closeByBackdrop);
document.getElementById('menuTrigger').addEventListener('click', () => modalOpen(menuDialog));
document.getElementById('closeMenu').addEventListener('click', () => modalClose(menuDialog));
menuDialog.querySelectorAll('.menu-links a').forEach(link => link.addEventListener('click', () => modalClose(menuDialog)));

// All photographs are real works supplied by the master. The page only shows four previews.
const artworks = [
  ...Array.from({ length: 14 }, (_, i) => ({ src: `tattoo-${String(i + 1).padStart(2,'0')}.webp`, category: 'tattoo', label: 'Татуировка' })),
  ...Array.from({ length: 6 }, (_, i) => ({ src: `piercing-${String(i + 1).padStart(2,'0')}.webp`, category: 'piercing', label: 'Пирсинг' }))
];
let currentGallery = artworks;
let currentImage = 0;
let activeCategory = 'all';
const galleryGrid = document.getElementById('galleryGrid');
const galleryTabs = Array.from(document.querySelectorAll('#galleryTabs button'));
const lightboxImage = document.getElementById('lightboxImage');

function showImage(index) {
  if (!currentGallery.length) return;
  currentImage = (index + currentGallery.length) % currentGallery.length;
  const item = currentGallery[currentImage];
  lightboxImage.src = `assets/${item.src}`;
  lightboxImage.alt = `Работа Никиты — ${item.label.toLowerCase()}`;
  document.getElementById('lightboxCaption').textContent = `${item.label} / NIK'S TATTOO`;
  document.getElementById('lightboxPosition').textContent = `${String(currentImage+1).padStart(2,'0')} / ${String(currentGallery.length).padStart(2,'0')}`;
}
function openLightbox(item) {
  let index = currentGallery.findIndex(a => a.src === item.src);
  if (index < 0) { currentGallery = artworks; index = artworks.findIndex(a => a.src === item.src); }
  showImage(index);
  modalOpen(lightboxDialog);
}
function renderGallery(category='all') {
  activeCategory = category;
  currentGallery = category === 'all' ? artworks : artworks.filter(x => x.category === category);
  galleryTabs.forEach(button => {
    const active = button.dataset.category === category;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  });
  const fragment = document.createDocumentFragment();
  currentGallery.forEach((item,index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `Открыть фото ${index+1}: ${item.label.toLowerCase()}`);
    const photo = document.createElement('img');
    photo.src = `assets/${item.src}`;
    photo.alt = `${item.label}, работа Никиты`;
    photo.loading = index < 8 ? 'eager' : 'lazy';
    const badge = document.createElement('span');
    badge.className = 'grid-label';
    badge.textContent = `${String(index + 1).padStart(2,'0')} / ${item.category === 'tattoo' ? 'TATTOO' : 'PIERCING'}`;
    button.append(photo,badge);
    button.addEventListener('click', () => openLightbox(item));
    fragment.appendChild(button);
  });
  galleryGrid.replaceChildren(fragment);
}
galleryTabs.forEach((button,i) => {
  button.addEventListener('click', () => renderGallery(button.dataset.category));
  button.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const next = galleryTabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + galleryTabs.length) % galleryTabs.length];
    next.click(); next.focus();
  });
});
document.getElementById('openGallery').addEventListener('click', () => { renderGallery('all'); modalOpen(galleryDialog); });
document.getElementById('closeGallery').addEventListener('click', () => modalClose(galleryDialog));
document.querySelectorAll('[data-preview]').forEach(button => button.addEventListener('click', () => {
  currentGallery = artworks;
  const item = artworks.find(a => a.src === button.dataset.preview);
  if (item) openLightbox(item);
}));
document.getElementById('closeLightbox').addEventListener('click', () => modalClose(lightboxDialog));
document.getElementById('lightboxPrev').addEventListener('click', () => showImage(currentImage-1));
document.getElementById('lightboxNext').addEventListener('click', () => showImage(currentImage+1));
document.addEventListener('keydown', event => {
  if (!lightboxDialog.open) return;
  if (event.key === 'ArrowLeft') showImage(currentImage-1);
  if (event.key === 'ArrowRight') showImage(currentImage+1);
});
let touchStartX = 0;
lightboxDialog.addEventListener('touchstart', event => { touchStartX = event.changedTouches[0].screenX; }, {passive:true});
lightboxDialog.addEventListener('touchend', event => {
  const diff = event.changedTouches[0].screenX - touchStartX;
  if (Math.abs(diff) > 65) showImage(currentImage + (diff < 0 ? 1 : -1));
}, {passive:true});

// Piercing prices transcribed from the supplied price image. Jewellery sale section intentionally excluded.
const piercingPrices = [
  {id:'ears',title:'Уши',rows:[['Мочка (1 прокол)','2 000 ₽'],['Мочка (2 прокола)','3 500 ₽'],['Хеликс','2 500 ₽'],['Трагус','2 500 ₽'],['Индастриал','4 500 ₽'],['Дайт','3 000 ₽'],['Конч','2 500 ₽'],['Рукка','3 000 ₽'],['Снаг','3 000 ₽'],['Форвард хеликс','3 000 ₽'],['Антихеликс','3 000 ₽']]},
  {id:'face',title:'Лицо',rows:[['Нострил','2 500 ₽'],['Септум','3 000 ₽'],['Медуза','3 000 ₽'],['Лабрет','3 000 ₽'],['Монро','3 000 ₽'],['Бридж','3 000 ₽'],['Щёка (димпл)','3 500 ₽']]},
  {id:'body',title:'Тело',rows:[['Пупок','3 000 ₽'],['Соски (1 прокол)','3 500 ₽'],['Соски (2 прокола)','6 000 ₽'],['Микродермал','5 000 ₽']]},
  {id:'other',title:'Другие зоны',rows:[['Язык','3 000 ₽'],['Уздечка языка','2 500 ₽'],['Уздечка губы','2 500 ₽'],['Гениталии (муж.)','4 000 ₽'],['Гениталии (жен.)','4 000 ₽']]},
  {id:'extra',title:'Дополнительно',rows:[['Снятие украшения','500 ₽'],['Замена украшения','1 000 ₽'],['Повторная обработка','500 ₽'],['Консультация','0 ₽']]}
];
const priceTabs = document.getElementById('priceTabs');
const pricePanel = document.getElementById('pricePanel');
function choosePriceCategory(category) {
  const data = piercingPrices.find(x=>x.id===category) || piercingPrices[0];
  priceTabs.querySelectorAll('button').forEach(button=>{
    const active = button.dataset.price === data.id;
    button.setAttribute('aria-selected',String(active));
    button.tabIndex = active ? 0 : -1;
  });
  const fragment = document.createDocumentFragment();
  data.rows.forEach(([name,cost])=>{
    const line = document.createElement('div'); line.className = 'price-line';
    const title = document.createElement('span');title.textContent=name;
    const sum = document.createElement('b');sum.textContent=cost;
    line.append(title,sum);fragment.append(line);
  });
  pricePanel.replaceChildren(fragment);
  pricePanel.setAttribute('aria-label',`Цены — ${data.title.toLowerCase()}`);
}
piercingPrices.forEach((category,i)=>{
  const button = document.createElement('button');button.type='button';button.className='price-tab';
  button.textContent=category.title;button.dataset.price=category.id;
  button.setAttribute('role','tab');button.setAttribute('aria-controls','pricePanel');
  button.addEventListener('click',()=>choosePriceCategory(category.id));
  button.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight'].includes(e.key))return;
    e.preventDefault();const buttons=Array.from(priceTabs.children);
    const next=buttons[(i+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length];
    next.click();next.focus();
  });
  priceTabs.append(button);
});
choosePriceCategory('ears');

// Local-time booking UI: browser zone detected on load, optionally refined from the chosen city.
// No server integration exists yet; no requests are sent to the master automatically.
const cityZones = {
  'калининград':'Europe/Kaliningrad','москва':'Europe/Moscow','санкт-петербург':'Europe/Moscow','питер':'Europe/Moscow','казань':'Europe/Moscow','нижний новгород':'Europe/Moscow','воронеж':'Europe/Moscow','ростов-на-дону':'Europe/Moscow','краснодар':'Europe/Moscow',
  'самара':'Europe/Samara','саратов':'Europe/Saratov','ульяновск':'Europe/Ulyanovsk','ижевск':'Europe/Samara','екатеринбург':'Asia/Yekaterinburg','пермь':'Asia/Yekaterinburg','уфа':'Asia/Yekaterinburg','тюмень':'Asia/Yekaterinburg','челябинск':'Asia/Yekaterinburg',
  'омск':'Asia/Omsk','новосибирск':'Asia/Novosibirsk','барнаул':'Asia/Barnaul','томск':'Asia/Tomsk','кемерово':'Asia/Novokuznetsk','новокузнецк':'Asia/Novokuznetsk','красноярск':'Asia/Krasnoyarsk','абакан':'Asia/Krasnoyarsk',
  'иркутск':'Asia/Irkutsk','улан-удэ':'Asia/Irkutsk','якутск':'Asia/Yakutsk','чита':'Asia/Chita','благовещенск':'Asia/Yakutsk','владивосток':'Asia/Vladivostok','хабаровск':'Asia/Vladivostok','магадан':'Asia/Magadan','петропавловск-камчатский':'Asia/Kamchatka'
};
const zoneOptions = [
  ['Калининград','Europe/Kaliningrad'],['Москва / Санкт-Петербург','Europe/Moscow'],['Самара','Europe/Samara'],['Екатеринбург','Asia/Yekaterinburg'],['Омск','Asia/Omsk'],
  ['Новосибирск','Asia/Novosibirsk'],['Барнаул','Asia/Barnaul'],['Томск','Asia/Tomsk'],['Красноярск','Asia/Krasnoyarsk'],['Иркутск','Asia/Irkutsk'],
  ['Якутск','Asia/Yakutsk'],['Владивосток','Asia/Vladivostok'],['Магадан','Asia/Magadan'],['Камчатка','Asia/Kamchatka']
];
const timezoneSelect = document.getElementById('timezone');
const cityInput = document.getElementById('city');
const timezoneHint = document.getElementById('timezoneHint');
let browserZone = 'Europe/Moscow';
try { browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow'; } catch(e) { }
const allZones = [...zoneOptions];
if(!allZones.some(([,zone])=>zone===browserZone)) allZones.unshift(['Мой часовой пояс',browserZone]);
allZones.forEach(([label,zone])=>timezoneSelect.add(new Option(`${label} · ${zone.replaceAll('_',' ')}`,zone,zone===browserZone,zone===browserZone)));
function refreshZoneHint(fromCity=false) {
  let stamp = '';
  try { stamp = new Intl.DateTimeFormat('ru-RU',{timeZone:timezoneSelect.value,hour:'2-digit',minute:'2-digit'}).format(new Date()); } catch(e) { }
  const reason = fromCity ? 'по указанному городу' : 'по твоему устройству';
  timezoneHint.textContent=`Часовой пояс ${reason}. Сейчас там ${stamp}. Дату и время записываем именно в этом поясе.`;
}
refreshZoneHint();
function normalizeCity(s) { return s.toLocaleLowerCase('ru-RU').trim().replace(/^г\.?\s*/,'').replace(/ё/g,'е').replace(/[,.]/g,'').replace(/\s+/g,' '); }
cityInput.addEventListener('input',()=>{
  const zone=cityZones[normalizeCity(cityInput.value)];
  if(zone && allZones.some(z=>z[1]===zone)){timezoneSelect.value=zone;refreshZoneHint(true)}
});
timezoneSelect.addEventListener('change',()=>refreshZoneHint(false));
const now=new Date();
const pad=num=>String(num).padStart(2,'0');
const localToday=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
document.getElementById('date').min=localToday;

function fallbackCopy(text) {
  const area=document.createElement('textarea');
  area.value=text;area.style.position='fixed';area.style.left='-2000px';
  document.body.append(area);area.select();
  let copied=false;
  try{copied=document.execCommand('copy')}catch(err){}
  area.remove();return copied;
}
document.getElementById('bookingForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const form=new FormData(event.currentTarget);
  const format=(key)=>String(form.get(key)||'').trim();
  const message = [
    'Заявка — •Nik’s•Tattoo•',
    `Имя: ${format('name')}`,
    `Услуга: ${format('service')}`,
    `Город: ${format('city')}`,
    `Желаемая дата: ${format('date')}`,
    `Желаемое время: ${format('time')} (по часовому поясу ${format('timezone')})`,
    `Описание: ${format('idea')||'Не указано'}`,
    '',
    'Дата и время предварительные, требуют подтверждения мастера.',
    'Выезд в другой город оплачивается клиентом и согласуется отдельно.'
  ].join('\n');
  let copied=false;
  try { if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(message);copied=true;} }catch(e){}
  if(!copied) copied=fallbackCopy(message);
  const status=document.getElementById('bookingResponse');
  if(copied){
    const link=document.createElement('a');
    link.href='https://t.me/NSKTaToO';
    link.target='_blank';
    link.rel='noopener noreferrer';
    link.textContent='Открыть Telegram и отправить заявку';
    link.style.textDecoration='underline';
    status.replaceChildren(document.createTextNode('Заявка скопирована. '),link);
  }
  else { status.textContent='Автоматическое копирование недоступно. Скопируй заявку из открывшегося окна.';window.prompt('Скопируй текст заявки:',message); }
});
