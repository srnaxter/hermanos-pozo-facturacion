const $ = (selector) => document.querySelector(selector);
const loginView = $('#loginView');
const appView = $('#appView');
const STORAGE_KEY = 'hermanos-pozo-invoice';
$('#mobileMenuToggle').addEventListener('click', () => { const sidebar = document.querySelector('.sidebar'); const open = sidebar.classList.toggle('menu-open'); $('#mobileMenuToggle').setAttribute('aria-expanded', String(open)); $('#mobileMenuToggle').textContent = open ? '×' : '☰'; });
let items = [
  { description: 'Servicio profesional', quantity: 1, price: 0, tax: 21 },
  { description: 'Desplazamiento', quantity: 1, price: 0, tax: 21 }
];

function formatNumber(value, decimals = 0) { const numeric = Number(value) || 0; const fixed = numeric.toFixed(decimals); const parts = fixed.split('.'); const integer = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return parts[1] ? `${integer},${parts[1]}` : integer; }
function formatMoney(value) { return `${formatNumber(value, 2)} €`; }
function formatQuantity(value) { return formatNumber(value, 0); }
function parseQuantity(value) { return Number(String(value).replace(/\./g, '').replace(',', '.')) || 0; }
function dateValue(date) { return date.toISOString().slice(0, 10); }
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[c])); }

function showApp() { loginView.classList.add('hidden'); appView.classList.remove('hidden'); syncDocumentTypeNav(); renderItems(); renderPreview(); }
if (sessionStorage.getItem('hp-auth') === 'true') showApp();

$('#loginForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const valid = $('#username').value.trim() === 'admin' && $('#password').value === 'HermanosPozo2026!';
  if (!valid) { $('#loginError').textContent = 'Usuario o contraseña incorrectos.'; return; }
  sessionStorage.setItem('hp-auth', 'true'); showApp();
});
$('#togglePassword').addEventListener('click', () => { const input = $('#password'); input.type = input.type === 'password' ? 'text' : 'password'; });
$('#logoutButton').addEventListener('click', () => { sessionStorage.removeItem('hp-auth'); appView.classList.add('hidden'); loginView.classList.remove('hidden'); });

const today = new Date();
$('#invoiceDate').value = dateValue(today);
const due = new Date(today); due.setDate(due.getDate() + 30); $('#dueDate').value = dateValue(due);

function renderItems() {
  $('#itemsList').innerHTML = items.map((item, index) => `<div class="item-row" data-index="${index}">
    <textarea data-field="description" rows="1" aria-label="Descripción">${escapeHtml(item.description)}</textarea>
    <input data-field="quantity" type="text" inputmode="numeric" value="${formatQuantity(item.quantity)}" aria-label="Unidades">
    <input data-field="price" type="number" min="0" step="0.01" value="${item.price}" aria-label="Precio">
    <select data-field="tax" aria-label="IVA"><option value="0" ${item.tax === 0 ? 'selected' : ''}>0%</option><option value="10" ${item.tax === 10 ? 'selected' : ''}>10%</option><option value="21" ${item.tax === 21 ? 'selected' : ''}>21%</option></select>
    <span class="item-total">${formatMoney(item.quantity * item.price)}</span><button type="button" class="remove-item" aria-label="Eliminar concepto">×</button></div>`).join('');
  $('#itemsList').querySelectorAll('[data-field]').forEach(input => input.addEventListener('input', updateItem));
  $('#itemsList').querySelectorAll('[data-field="description"]').forEach(textarea => { textarea.addEventListener('input', autoGrowDescription); autoGrowDescription({ target: textarea }); });
  $('#itemsList').querySelectorAll('.remove-item').forEach(button => button.addEventListener('click', () => { const index = +button.closest('.item-row').dataset.index; items.splice(index, 1); renderItems(); renderPreview(); saveLocal(); }));
}
function autoGrowDescription(event) { const textarea = event.target; textarea.style.height = 'auto'; textarea.style.height = `${textarea.scrollHeight}px`; }
function updateItem(event) { const row = event.target.closest('.item-row'); const index = +row.dataset.index; const field = event.target.dataset.field; items[index][field] = field === 'description' ? event.target.value : field === 'quantity' ? parseQuantity(event.target.value) : Number(event.target.value); row.querySelector('.item-total').textContent = formatMoney(items[index].quantity * items[index].price); renderPreview(); saveLocal(); }
$('#addItem').addEventListener('click', () => { items.push({ description: 'Nuevo concepto', quantity: 1, price: 0, tax: 21 }); renderItems(); renderPreview(); saveLocal(); });

function collectData() { return { documentType: $('#documentType').value, number: $('#invoiceNumber').value, date: $('#invoiceDate').value, due: $('#dueDate').value, clientName: $('#clientName').value, clientTax: $('#clientTax').value, email: $('#clientEmail').value, address: $('#clientAddress').value, notes: $('#notes').value, payment: $('#paymentMethod').value, iban: $('#iban').value }; }
function invoiceTotal() { return items.reduce((sum, i) => sum + i.quantity * i.price * (1 + i.tax / 100), 0); }
function saveToHistory() { const history = JSON.parse(localStorage.getItem('hp-history') || '[]'); const data = collectData(); history.unshift({ id: Date.now(), data, items: JSON.parse(JSON.stringify(items)), total: invoiceTotal() }); localStorage.setItem('hp-history', JSON.stringify(history.slice(0, 30))); }
function renderHistory() { const history = JSON.parse(localStorage.getItem('hp-history') || '[]'); $('#historyList').innerHTML = history.length ? history.map(entry => `<div class="history-item"><div><strong>${entry.data.documentType === 'presupuesto' ? 'Presupuesto' : 'Factura'} · ${escapeHtml(entry.data.number || 'Sin número')}</strong><small>${escapeHtml(entry.data.clientName || 'Cliente particular')} · ${formatDate(entry.data.date)} · ${formatMoney(entry.total)}</small></div><div class="history-actions"><button data-load-history="${entry.id}">Abrir</button><button class="delete-history" data-delete-history="${entry.id}">Eliminar</button></div></div>`).join('') : '<div class="history-empty">Todavía no hay documentos guardados.<br>Descarga una factura o presupuesto para añadirlo al historial.</div>'; }
function closeMobileMenu() { const sidebar = document.querySelector('.sidebar'); sidebar.classList.remove('menu-open'); $('#mobileMenuToggle').setAttribute('aria-expanded', 'false'); $('#mobileMenuToggle').textContent = '☰'; }
function syncDocumentTypeNav() { const type = $('#documentType').value; $('#invoiceNav').classList.toggle('active', type === 'factura'); $('#budgetNav').classList.toggle('active', type === 'presupuesto'); }
function setDocumentType(type) { const number = $('#invoiceNumber').value.trim(); $('#documentType').value = type; if (!number || (type === 'presupuesto' && number.startsWith('HP-')) || (type === 'factura' && number.startsWith('PP-'))) $('#invoiceNumber').value = type === 'presupuesto' ? 'PP-2024-001' : 'HP-2024-001'; syncDocumentTypeNav(); closeMobileMenu(); renderPreview(); saveLocal(); }
function openHistory() { closeMobileMenu(); renderHistory(); $('#historyModal').classList.remove('hidden'); }
function loadHistory(id) { const history = JSON.parse(localStorage.getItem('hp-history') || '[]'); const entry = history.find(item => item.id === id); if (!entry) return; Object.entries(entry.data).forEach(([key, value]) => { const el = ({ documentType:'documentType', number:'invoiceNumber', date:'invoiceDate', due:'dueDate', clientName:'clientName', clientTax:'clientTax', email:'clientEmail', address:'clientAddress', notes:'notes', payment:'paymentMethod', iban:'iban' })[key]; if (el && $('#' + el)) $('#' + el).value = value; }); items = entry.items || []; renderItems(); renderPreview(); saveLocal(); $('#historyModal').classList.add('hidden'); }
$('#historyNav').addEventListener('click', (event) => { event.preventDefault(); openHistory(); });
$('#invoiceNav').addEventListener('click', (event) => { event.preventDefault(); setDocumentType('factura'); });
$('#budgetNav').addEventListener('click', (event) => { event.preventDefault(); setDocumentType('presupuesto'); });
$('#closeHistory').addEventListener('click', () => $('#historyModal').classList.add('hidden'));
$('#historyModal').addEventListener('click', (event) => { if (event.target.id === 'historyModal') $('#historyModal').classList.add('hidden'); const loadId = event.target.dataset.loadHistory; const deleteId = event.target.dataset.deleteHistory; if (loadId) loadHistory(Number(loadId)); if (deleteId) { const history = JSON.parse(localStorage.getItem('hp-history') || '[]').filter(entry => entry.id !== Number(deleteId)); localStorage.setItem('hp-history', JSON.stringify(history)); renderHistory(); } });
function formatDate(value) { if (!value) return '—'; return new Date(`${value}T12:00:00`).toLocaleDateString('es-ES'); }
function renderPreview() {
  const data = collectData();
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.price, 0);
  const tax = items.reduce((sum, i) => sum + i.quantity * i.price * (i.tax / 100), 0);
  const total = subtotal + tax;
  $('#invoicePreview').innerHTML = `<div class="invoice-header"><div class="invoice-brand"><img class="invoice-logo" src="logo-transparent.png" alt="Hermanos Pozo"></div><div class="invoice-title"><h4>${data.documentType === 'presupuesto' ? 'PRESUPUESTO' : 'FACTURA'}</h4><small>${escapeHtml(data.number || '—')}</small></div></div>
    <div class="invoice-meta"><div><strong>Hermanos Pozo</strong><p>Calle Principal, 12<br>28000 Madrid · España<br>NIF: B-00000000</p></div><div><strong>Facturado a</strong><p>${escapeHtml(data.clientName || '—')}<br>${escapeHtml(data.clientTax || '')}<br>${escapeHtml(data.address || data.email || '')}</p></div><div><strong>Fechas</strong><p>Emisión: ${formatDate(data.date)}<br>Vencimiento: ${formatDate(data.due)}</p></div></div>
    <table class="invoice-table"><thead><tr><th>Descripción</th><th>Ud.</th><th>Precio</th><th>IVA</th><th>Importe</th></tr></thead><tbody>${items.map(i => `<tr><td>${escapeHtml(i.description || '—')}</td><td>${formatQuantity(i.quantity)}</td><td>${formatMoney(i.price)}</td><td>${i.tax}%</td><td>${formatMoney(i.quantity * i.price)}</td></tr>`).join('')}</tbody></table>
    <div class="totals"><div class="total-line"><span>Subtotal</span><span>${formatMoney(subtotal)}</span></div><div class="total-line"><span>IVA</span><span>${formatMoney(tax)}</span></div><div class="total-line grand"><span>Total</span><span>${formatMoney(total)}</span></div></div>
    <div class="invoice-notes"><strong>${escapeHtml(data.payment)}</strong>${data.iban ? `<br>${escapeHtml(data.iban)}` : ''}<br><br>${escapeHtml(data.notes || 'Gracias por confiar en nosotros.')}</div>`;
}

document.querySelectorAll('#invoiceForm input, #invoiceForm textarea, #invoiceForm select').forEach(el => el.addEventListener('input', () => { renderPreview(); saveLocal(); }));
function saveLocal() { localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: collectData(), items })); $('#savedStatus').textContent = '● Guardado localmente'; }
function loadLocal() { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); if (!saved) return; items = saved.items || items; Object.entries(saved.data || {}).forEach(([key, value]) => { const el = ({ documentType:'documentType', number:'invoiceNumber', date:'invoiceDate', due:'dueDate', clientName:'clientName', clientTax:'clientTax', email:'clientEmail', address:'clientAddress', notes:'notes', payment:'paymentMethod', iban:'iban' })[key]; if (el && $('#' + el)) $('#' + el).value = value; }); }
loadLocal(); syncDocumentTypeNav(); renderItems(); renderPreview();
$('#downloadPdf').addEventListener('click', () => { renderPreview(); saveToHistory(); window.print(); });
