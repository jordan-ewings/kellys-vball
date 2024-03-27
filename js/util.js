

/* ------------------------------------------------ */

export function createAlert(type, msg) {

  let alert = document.createElement('div');
  alert.classList.add('alert', 'd-flex', 'align-items-center');
  // alert.classList.add('py-2', 'px-3', 'm-0');
  alert.classList.add('alert-' + type);
  alert.setAttribute('role', 'alert');

  let alertMsg = document.createElement('div');
  alertMsg.classList.add('me-auto');
  alertMsg.innerHTML = msg;
  alert.appendChild(alertMsg);

  let closeBtn = document.createElement('button');
  closeBtn.id = 'alertCloseBtn';
  closeBtn.classList.add('btn-close');
  closeBtn.classList.add('btn-sm');
  closeBtn.setAttribute('type', 'button');
  closeBtn.addEventListener('click', () => {
    alert.remove();
  });
  alert.appendChild(closeBtn);

  return alert;
}

/* ------------------------------------------------ */

export function createFromTemplate(templateId) {
  let template = document.getElementById(templateId);
  let clone = template.content.cloneNode(true);
  return clone.firstElementChild;
}

/* ------------------------------------------------ */

export function getItem(element, dataItem) {
  let item = element.querySelector('[data-item="' + dataItem + '"]');
  return item;
}

/* ------------------------------------------------ */

export function formatNumber(val, f = '0', zero = 'default', scale = 1) {

  if (typeof val == 'string') return val;
  if (val == null) return '';
  if (isNaN(val)) return '';
  val = val / scale;

  let isPct = f.includes('%');
  let prefix = f.match(/^[^\d]*/)[0];
  let suffix = f.match(/[^\d]*$/)[0];
  f = f.replace(prefix, '').replace(suffix, '');

  let fs = f.split('.');
  let dec = fs.length == 2 ? fs[1].length : 0;
  let v = isPct ? val * 100 : val;

  let s = v.toFixed(dec);
  if (s == '-0') s = '0';
  let sSpl = s.split('.');
  let sInt = sSpl[0];
  let sDec = sSpl.length == 2 ? '.' + sSpl[1] : '';
  let sIntSpl = sInt.split('');
  let sIntRev = sIntSpl.reverse();
  let sIntRevSpl = [];
  sIntRev.forEach((x, i) => {
    if (i % 3 == 0 && i != 0) sIntRevSpl.push(',');
    sIntRevSpl.push(x);
  });

  let sIntRevSplRev = sIntRevSpl.reverse();
  let sIntRevSplRevStr = sIntRevSplRev.join('');
  let sVal = sIntRevSplRevStr + sDec;

  if (val == 0) {
    if (zero == 'default') {
      return prefix + sVal + suffix;
    } else {
      return zero;
    }
  }

  return prefix + sVal + suffix;
}

/* ------------------------------------------------ */

export function formatRecord(record) {
  let recordSpl = record.split('-');
  let wl = [recordSpl[0], '-', recordSpl[1]];
  let div = document.createElement('div');
  div.classList.add('d-flex', 'w-100', 'justify-content-center');
  wl.forEach((x, j) => {
    let span = document.createElement('div');
    if (j == 1) {
      span.classList.add('text-dim2', 'text-center');
      span.style.width = '10px';
    }
    span.innerHTML = x;
    div.appendChild(span);
  });
  return div;
}





