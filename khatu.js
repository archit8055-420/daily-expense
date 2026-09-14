var SUPABASE_URL = "https://fdddjqakdobjqgimnsdv.supabase.co";
var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZGRqcWFrZG9ianFnaW1uc2R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MDYzNDgsImV4cCI6MjEwNDM4MjM0OH0.UXtoDhglVxSTW65lS64uT37YkfHnVHPEyZak_3Ir39M";
var supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

var expenses = [];
var transactions = [];
var editExpenseId = null;
var editTransactionId = null;
var profileDashboardBackScreen = null;
var pendingDeleteType = null;
var pendingDeleteId = null;
var passwordTimers = {};
var isSendingReset = false;
var lastResetSentAt = localStorage.getItem('lastResetSentAt') || 0;
var currentUserId = null;
var currentCategoryTarget = null; // for new category dialog

const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DEFAULT_CATEGORIES = ["Others","Petrol","Cement"];
const NEW_CAT_LABEL = "➕ New Category...";

function getAllCategories() {
  let custom = JSON.parse(localStorage.getItem('customCategories') || "[]");
  return [...DEFAULT_CATEGORIES,...custom];
}
function getCategoryOptionsForFilter() {
  return ["All Categories", "Others",...getAllCategories().filter(c=>c!=="Others")];
}

function fillMonthYear(monthSelId, yearSelId) {
  const monthSel = document.getElementById(monthSelId), yearSel = document.getElementById(yearSelId); if (!monthSel ||!yearSel) return;
  monthSel.innerHTML = ''; yearSel.innerHTML = '';
  monthNames.forEach((m, i) => monthSel.add(new Option(m, i)));
  for (let y = 2000; y <= 2099; y++) yearSel.add(new Option(y, y));
  const now = new Date(); monthSel.value = now.getMonth(); yearSel.value = now.getFullYear();
}


function fillCategorySelects() {
  let cats = getAllCategoriesFiltered(); // ["Others","Petrol","Cement","Upda",...custom]

  // --- EXPENSE SCREEN: All Categories NAI, fakt Others + Petrol... ---
  let selExp = document.getElementById('expCategoryFilter');
  if(selExp){
    let prev = selExp.value || "Others";
    selExp.innerHTML = "";
    selExp.add(new Option(NEW_CAT_LABEL, NEW_CAT_LABEL)); // top ma New
    cats.forEach(c => selExp.add(new Option(c, c))); // Others, Petrol, Cement, Upda
    if([...cats, NEW_CAT_LABEL].includes(prev)) selExp.value = prev;
    else selExp.value = "Others";
  }

  // --- FILTER SCREEN: All Categories RAKHVU ---
  let selFilter = document.getElementById('filterCategory');
  if(selFilter){
    let prev = selFilter.value || "All Categories";
    let filterCats = ["All Categories", ...cats];
    selFilter.innerHTML = "";
    selFilter.add(new Option(NEW_CAT_LABEL, NEW_CAT_LABEL));
    filterCats.forEach(c => selFilter.add(new Option(c, c)));
    if([...filterCats, NEW_CAT_LABEL].includes(prev)) selFilter.value = prev;
    else selFilter.value = "All Categories";
  }
}



// Delete Category Dialog
function openDeleteCategoryDialog(){
  let sel = document.getElementById('deleteCategorySelect');
  sel.innerHTML = "";
  let all = getAllCategories();
  all.forEach(c => {
    if(c === "Others") return; // Others delete nai thai
    sel.add(new Option(c, c));
  });
  if(sel.options.length === 0){
    return showBottomMessage("Delete karva mate koi category nathi","error");
  }
  document.getElementById('deleteCategoryDialog').classList.add('active');
}

function closeDeleteCategoryDialog(){
  document.getElementById('deleteCategoryDialog').classList.remove('active');
}

async function confirmDeleteCategory(){
  let catToDelete = document.getElementById('deleteCategorySelect').value;
  if(!catToDelete) return;

  // pop-up hatavi didhu - direct delete

  const user = await getCurrentUser();
  if(user){
    const { error } = await supabaseClient.from('expenses').delete().eq('user_id', user.id).eq('category', catToDelete);
    if(error) return showBottomMessage(error.message,"error");
  }
  
  expenses = expenses.filter(e => e.category !== catToDelete);

  let custom = JSON.parse(localStorage.getItem('customCategories') || "[]");
  if(custom.includes(catToDelete)){
    custom = custom.filter(c => c !== catToDelete);
    localStorage.setItem('customCategories', JSON.stringify(custom));
  } else {
    let hidden = JSON.parse(localStorage.getItem('hiddenCategories') || "[]");
    if(!hidden.includes(catToDelete)) hidden.push(catToDelete);
    localStorage.setItem('hiddenCategories', JSON.stringify(hidden));
  }
  
  fillCategorySelects();
  renderExpenses();
  renderFilterResults();
  closeDeleteCategoryDialog();
  showBottomMessage(`"${catToDelete}" Category and Records are Deleted.`, "success");
}


function getAllCategoriesFiltered(){
  let custom = JSON.parse(localStorage.getItem('customCategories') || "[]");
  let hidden = JSON.parse(localStorage.getItem('hiddenCategories') || "[]");
  let all = [...DEFAULT_CATEGORIES, ...custom];
  return all.filter(c => !hidden.includes(c));
}



function handleCategorySelectChange(selectId){
  let sel = document.getElementById(selectId);
  if(sel.value === NEW_CAT_LABEL){
    currentCategoryTarget = selectId;
    document.getElementById('newCategoryDialog')?.classList.add('active');
    document.getElementById('newCategoryInput').value = "";
    document.getElementById('newCategoryInput').focus();
  }
}
function closeNewCategoryDialog(){
  document.getElementById('newCategoryDialog')?.classList.remove('active');
  // revert to Others
  if(currentCategoryTarget){
    let sel = document.getElementById(currentCategoryTarget);
    if(sel) sel.value = "Others";
  }
  currentCategoryTarget = null;
}
function confirmNewCategory(){
  let name = document.getElementById('newCategoryInput').value.trim();
  if(!name) return showBottomMessage("Category name lakho","error");
  name = name.charAt(0).toUpperCase() + name.slice(1);
  if(getAllCategories().map(c=>c.toLowerCase()).includes(name.toLowerCase())){
    showBottomMessage("Category already exists","error"); return;
  }
  let custom = JSON.parse(localStorage.getItem('customCategories') || "[]");
  custom.push(name);
  localStorage.setItem('customCategories', JSON.stringify(custom));
  fillCategorySelects();
  // set new category to both selects
  if(currentCategoryTarget){
    document.getElementById(currentCategoryTarget).value = name;
    if(currentCategoryTarget === 'expCategory'){
      document.getElementById('expCategoryFilter').value = name;
    }
  }
  document.getElementById('newCategoryDialog')?.classList.remove('active');
  showBottomMessage(`Category "${name}" is Created.`, "success");
  currentCategoryTarget = null;
  if(document.getElementById('expenseScreen')?.classList.contains('active')) renderExpenses();
  if(document.getElementById('filterScreen')?.classList.contains('active')) renderFilterResults();
}

/* ================= BAAKI TUMARO J CODE SAME ============= */
//... showScreen, toggleUserMenu, openProfile, goBack, helpers same rakho

function showScreen(name) {
  const screens = ['loginScreen','signupScreen','resetPasswordScreen','passwordSuccessScreen','homeScreen','expenseScreen','transactionScreen','profileScreen','dashboardScreen','filterScreen'];
  screens.forEach(id => document.getElementById(id)?.classList.remove('active'));
  document.getElementById(name + 'Screen')?.classList.add('active');
  document.querySelectorAll('.user-menu').forEach(menu => menu.classList.remove('active'));
}
function toggleUserMenu(menuId) {
  const menu = document.getElementById(menuId);
  if (!menu) return;
  document.querySelectorAll('.user-menu').forEach(other => { if (other!== menu) other.classList.remove('active'); });
  menu.classList.toggle('active');
}
async function openProfile(fromScreen) {
  if (fromScreen!== 'expense' && fromScreen!== 'transaction') return;
  profileDashboardBackScreen = fromScreen;
  document.querySelectorAll('.user-menu').forEach(menu => menu.classList.remove('active'));
  const { data } = await supabaseClient.auth.getUser();
  if (data?.user) { currentUserId = data.user.id; updateProfileDisplay(data.user); }
  showScreen('profile');
}
async function openDashboard(fromScreen) {
  if (fromScreen!== 'expense' && fromScreen!== 'transaction') return;
  profileDashboardBackScreen = fromScreen;
  showScreen('dashboard');
  await loadDashboard();
}
function goBack() {
  if (profileDashboardBackScreen === 'expense' || profileDashboardBackScreen === 'transaction') {
    showScreen(profileDashboardBackScreen);
    profileDashboardBackScreen = null;
  }
}
function scrollTableToBottom(tableId) {
  const wrap = document.getElementById(tableId); if (!wrap) return;
  requestAnimationFrame(() => { wrap.scrollTop = wrap.scrollHeight; setTimeout(() => wrap.scrollTop = wrap.scrollHeight, 100); });
}
function updateProfileDisplay(user) {
  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';
  if (document.getElementById('profileUsername')) document.getElementById('profileUsername').textContent = username;
  if (document.getElementById('profileEmail')) document.getElementById('profileEmail').textContent = user?.email || '-';
}
function updateUsernameDisplay(user) {
  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';
  if (document.getElementById('homeUsername')) document.getElementById('homeUsername').textContent = username;
  updateProfileDisplay(user);
}
function capitalizeFirstLetter(value) { return value? value.charAt(0).toUpperCase() + value.slice(1) : ''; }
function capitalizeFirst(input) { if (input.value.length === 1) input.value = input.value.toUpperCase(); }
function todayISO() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
function parseISODate(iso) { if (!iso || typeof iso!== 'string') return null; const [y,m,d] = iso.split('-').map(Number); if (isNaN(y)||isNaN(m)||isNaN(d)) return null; return { year: y, month: m-1, day: d }; }
function formatDate(iso) { const p = parseISODate(iso); return p? `${String(p.day).padStart(2,'0')}-${monthNames[p.month].slice(0,3)}-${p.year}` : (iso || '-'); }
function updateDateDisplay(inputId, textId) { const val = document.getElementById(inputId)?.value; if (val) document.getElementById(textId).textContent = formatDate(val); }
function openDatePicker(inputId) { document.getElementById(inputId)?.showPicker?.(); }
function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }
function jsAttr(value) { return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function calculateDaysDiff(startDateStr, endDateStr) {
  if (!startDateStr ||!endDateStr) return '-';
  const start = new Date(startDateStr + 'T00:00:00'), end = new Date(endDateStr + 'T00:00:00');
  return `${Math.ceil(Math.abs(end - start) / (1000*60*60*24))} Days`;
}
async function getCurrentUser() {
  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error) { console.error("Get User Error:", error); return null; }
  currentUserId = user? user.id : null; return user;
}
async function checkAuth() {
  if (!navigator.onLine) { showOfflineScreen(); return; }
  const hash = window.location.hash;
  if (hash && hash.includes('type=recovery')) { await checkRecoverySession(); return; }
  showScreen('login');
  const savedEmail = localStorage.getItem('savedEmail');
  const savedPass = localStorage.getItem('savedPassword');
  if(savedEmail && document.getElementById('loginEmail')) document.getElementById('loginEmail').value = savedEmail;
  if(savedPass && document.getElementById('loginPassword')) document.getElementById('loginPassword').value = savedPass;
}
async function loadTable(tableName) {
  const user = await getCurrentUser(); if (!user) return [];
  const { data, error } = await supabaseClient.from(tableName).select('*').eq('user_id', user.id).order('date_iso', { ascending: true }).order('id', { ascending: true });
  if (error) { console.error(`${tableName} Load Error:`, error); showBottomMessage(`${tableName} load error: ${error.message}`, "error"); return []; }
  return data || [];
}
async function deleteRow(tableName, id) {
  const user = await getCurrentUser(); if (!user) return false;
  const { error, count } = await supabaseClient.from(tableName).delete({ count: 'exact' }).eq('id', id).eq('user_id', user.id);
  if (error) { showBottomMessage(error.message, "error"); return false; }
  if (count === 0) { showBottomMessage("Delete failed: no matching record", "error"); return false; }
  return true;
}
function parseExpenseName(name) {
  if (!name) return { displayName: name || '', qty: 0, unit: '', plate: '' };
  let text = name.trim(); let plate = ''; let qty = 0; let unit = '';
  const plateMatch = text.match(/^(\d{4})\s+/);
  if (plateMatch) { plate = plateMatch[1]; text = text.replace(plateMatch[0], '').trim(); }
  const lower = text.toLowerCase();
  let m = lower.match(/(\d+(?:\.\d+)?)\s*(bag|bags|bage)/i) || lower.match(/(bag|bags|bage)\s*(\d+(?:\.\d+)?)/i);
  if (m) { qty = parseFloat(m[1] || m[2]); unit = 'Bags'; }
  if (!qty) {
    m = lower.match(/(\d+(?:\.\d+)?)\s*(liter|litre|ltr|ltrs|liters)/i) || lower.match(/(liter|litre|ltr|ltrs|liters)\s*(\d+(?:\.\d+)?)/i);
    if (m) { qty = parseFloat(m[1] || m[2]); unit = 'Liter'; }
  }
  if (!qty) {
    m = lower.match(/(\d+(?:\.\d+)?)\s*(kg|kgs|kilo|kilos)/i) || lower.match(/(kg|kgs|kilo|kilos)\s*(\d+(?:\.\d+)?)/i);
    if (m) { qty = parseFloat(m[1] || m[2]); unit = 'Kg'; }
  }
  if (!qty) { m = lower.match(/(\d+(?:\.\d+)?)/); if (m) qty = parseFloat(m[1]); }
  let cleanName = text.replace(/(\d+(?:\.\d+)?)/g, '').replace(/(bag|bags|bage|liter|litre|ltr|ltrs|liters|kg|kgs|kilo|kilos)/gi, '').replace(/\s+/g, ' ').trim();
  if (qty &&!unit) {
    if (/cement/i.test(cleanName) || /cement/i.test(name)) unit = 'Bags';
    else if (/petrol|diesel|fuel/i.test(cleanName) || /petrol|diesel|fuel/i.test(name)) unit = 'Liter';
    else if (/vegetable|veg|fruit|sabzi|bhaji|tomato|onion|potato|alu|pyaj/i.test(cleanName)) unit = 'Kg';
    else unit = 'Qty';
  }
  let displayName = '';
  if (plate) displayName += plate + ' ';
  displayName += cleanName? capitalizeFirstLetter(cleanName) : 'Item';
  if (qty && unit) displayName += ' ' + qty + ' ' + unit;
  return { displayName: displayName.trim(), qty, unit, plate };
}

/* ================= EXPENSE WITH CATEGORY ================= */
async function loadExpenses() { expenses = await loadTable('expenses'); renderExpenses(); }

async function addOrUpdateExpense() {
  const user = await getCurrentUser(); if (!user) return showBottomMessage("Login nathi", "error");
  const name = capitalizeFirstLetter(document.getElementById('expName').value.trim());
  const amount = parseFloat(document.getElementById('expAmount').value);
  const date = document.getElementById('expDate').value || todayISO();
  let catSel = document.getElementById('expCategoryFilter')?.value || 'Others';
  if(catSel === NEW_CAT_LABEL) return handleExpenseCategoryChange();
  if(catSel === 'All Categories') catSel = 'Others';
  
  const btn = document.getElementById('expDoneBtn');
  btn.disabled = true; btn.textContent = 'Saving...';
  try {
    if (editExpenseId !== null) {
      await supabaseClient.from('expenses').update({ name, amount, date_iso: date, category: catSel }).eq('id', editExpenseId).eq('user_id', user.id);
      showBottomMessage("Updated in "+catSel, "success"); editExpenseId = null;
    } else {
      await supabaseClient.from('expenses').insert({ name, amount, date_iso: date, category: catSel, user_id: user.id });
      showBottomMessage(`Added in ${catSel}`, "success");
    }
    document.getElementById('expName').value = ''; document.getElementById('expAmount').value = '';
    await loadExpenses();
  } catch(err){ showBottomMessage(err.message,"error"); }
  finally{ btn.disabled=false; btn.textContent='Done'; }
}

function editExpense(id) {
  const item = expenses.find(e => String(e.id) === String(id)); if (!item) return;
  document.getElementById('expName').value = item.name;
  document.getElementById('expAmount').value = item.amount;
  document.getElementById('expDate').value = item.date_iso;
  document.getElementById('expCategory').value = item.category || 'Others';
  updateDateDisplay('expDate', 'expDateText');
  editExpenseId = item.id;
  document.getElementById('expDoneBtn').textContent = 'Update';
}
function deleteExpense(id) { openDeleteDialog('expense', id); }
async function performDeleteExpense(id) {
  if (await deleteRow('expenses', id)) {
    if (String(editExpenseId) === String(id)) { editExpenseId = null; document.getElementById('expDoneBtn').textContent = 'Done'; }
    showBottomMessage("Expense deleted", "success"); await loadExpenses();
  }
}
function renderExpenses() {
  const m = parseInt(document.getElementById('expMonth').value, 10);
  const y = parseInt(document.getElementById('expYear').value, 10);
  let filtered = expenses.filter(e => {
    const p = parseISODate(e.date_iso);
    return p && p.month === m && p.year === y;
  });

  const wrap = document.getElementById('expenseTableWrap');
  if (filtered.length === 0) {
    wrap.innerHTML = `<div class="empty-note">No expense for this month.</div>`;
  } else {
    // Category column kadhi nakhyo, Sr.No pan kadhi nakhyo - fakt Date, Name, Amount
    const rows = filtered.map(e => {
      const parsed = parseExpenseName(e.name);
      return `<tr>
        <td style="text-align:center;">${formatDate(e.date_iso)}</td>
        <td style="text-align:center;">${escapeHtml(parsed.displayName || e.name)}</td>
        <td style="text-align:center;">₹${Number(e.amount).toFixed(2)}</td>
        <td style="text-align:center;"><div class="action-btns" style="justify-content:center;"><button class="edit-btn" onclick="editExpense('${jsAttr(e.id)}')">Edit</button><button class="del-btn" onclick="deleteExpense('${jsAttr(e.id)}')">Delete</button></div></td>
      </tr>`;
    }).join('');
    wrap.innerHTML = `<table class="entries"><thead><tr><th style="text-align:center;">Date</th><th style="text-align:center;">Name</th><th style="text-align:center;">Amount</th><th style="text-align:center;">Action</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  document.getElementById('expTotal').textContent = filtered.reduce((s, e) => s + Number(e.amount || 0), 0).toFixed(2);
}



/* TRANSACTIONS same pan category */
async function loadTransactions() { transactions = await loadTable('transactions'); renderTransactions(); }
//... transaction functions same rakho, pan insert ma category add karo if needed

function renderTransactions() {
  const m = parseInt(document.getElementById('txnMonth').value, 10);
  const y = parseInt(document.getElementById('txnYear').value, 10);
  const filtered = transactions.filter(t => { const p = parseISODate(t.date_iso); return p && p.month === m && p.year === y; });
  const wrap = document.getElementById('transactionTableWrap');
  if (filtered.length === 0) { wrap.innerHTML = '<div class="empty-note">No transactions for this month.</div>'; }
  else {
    wrap.innerHTML = `<table class="entries"><thead><tr><th class="col-date">Tarikh</th><th class="col-txn-tofrom">Payer</th><th class="col-txn-tofrom">Receiver</th><th class="col-txn-amt">Paisa</th><th class="col-date">Repay (✓)</th><th class="col-date">Repay Date</th><th class="col-date">Gap</th><th class="col-action">Action</th></tr></thead><tbody>${filtered.map(t => `<tr><td class="col-date">${formatDate(t.date_iso)}</td><td class="col-txn-tofrom">${escapeHtml(t.payer)}</td><td class="col-txn-tofrom">${escapeHtml(t.receiver)}</td><td class="col-txn-amt">₹${Number(t.amount).toFixed(2)}</td><td class="col-date"><input type="checkbox" class="custom-checkbox" ${t.is_received? 'checked' : ''} onchange="toggleReceived('${jsAttr(t.id)}', this.checked)"></td><td class="col-date">${t.received_date_iso? formatDate(t.received_date_iso) : '-'}</td><td class="col-date">${calculateDaysDiff(t.date_iso, t.received_date_iso)}</td><td class="col-action"><div class="action-btns"><button class="edit-btn" onclick="editTransaction('${jsAttr(t.id)}')">Edit</button><button class="del-btn" onclick="deleteTransaction('${jsAttr(t.id)}')">Delete</button></div></td></tr>`).join('')}</tbody></table>`;
  }
  document.getElementById('txnTotal').textContent = filtered.reduce((s, t) => s + Number(t.amount), 0).toFixed(2);
  scrollTableToBottom('transactionTableWrap');
}
async function addOrUpdateTransaction(){ /* tumaro j code */ const user = await getCurrentUser(); if (!user) return showBottomMessage("User is not logged in", "error"); const fromInput = document.getElementById('txnFrom'), toInput = document.getElementById('txnTo'), amtInput = document.getElementById('txnAmount'); if (!fromInput.checkValidity() ||!toInput.checkValidity() ||!amtInput.checkValidity()) { fromInput.reportValidity(); toInput.reportValidity(); amtInput.reportValidity(); return; } const from = capitalizeFirstLetter(fromInput.value.trim()); const to = capitalizeFirstLetter(toInput.value.trim()); const amount = parseFloat(amtInput.value); const date = document.getElementById('txnDate').value || todayISO(); const btn = document.getElementById('txnDoneBtn'); btn.disabled = true; btn.textContent = editTransactionId!== null? 'Updating...' : 'Saving...'; try { if (editTransactionId!== null) { const { error } = await supabaseClient.from('transactions').update({ payer: from, receiver: to, amount, date_iso: date }).eq('id', editTransactionId).eq('user_id', user.id); if (error) throw error; showBottomMessage("Transaction updated", "success"); editTransactionId = null; } else { const { error } = await supabaseClient.from('transactions').insert({ payer: from, receiver: to, amount, date_iso: date, is_received: false, received_date_iso: null, user_id: user.id }); if (error) throw error; showBottomMessage("Transaction added", "success"); } fromInput.value = ''; toInput.value = ''; amtInput.value = ''; await loadTransactions(); } catch (err) { showBottomMessage(err.message, "error"); } finally { btn.disabled = false; btn.textContent = 'Done'; } }
function editTransaction(id){ const item = transactions.find(t => String(t.id) === String(id)); if (!item) return; document.getElementById('txnFrom').value = item.payer; document.getElementById('txnTo').value = item.receiver; document.getElementById('txnAmount').value = item.amount; document.getElementById('txnDate').value = item.date_iso; updateDateDisplay('txnDate', 'txnDateText'); editTransactionId = item.id; document.getElementById('txnDoneBtn').textContent = 'Update'; }
function deleteTransaction(id){ openDeleteDialog('transaction', id); }
async function performDeleteTransaction(id){ if (await deleteRow('transactions', id)) { if (String(editTransactionId) === String(id)) { editTransactionId = null; document.getElementById('txnDoneBtn').textContent = 'Done'; } showBottomMessage("Transaction deleted", "success"); await loadTransactions(); } }
async function toggleReceived(id, isChecked){ const user = await getCurrentUser(); if (!user) return; const { error } = await supabaseClient.from('transactions').update({ is_received: isChecked, received_date_iso: isChecked? todayISO() : null }).eq('id', id).eq('user_id', user.id); if (error) return showBottomMessage(error.message, "error"); await loadTransactions(); }

/* FILTER WITH CATEGORY */
let filterType = 'expense'; let repayFilter = 'all';
function openFilter(fromScreen) {
  profileDashboardBackScreen = fromScreen;
  document.querySelectorAll('.user-menu').forEach(menu => menu.classList.remove('active'));
  filterType = fromScreen;
  repayFilter = 'all';
  const titleEl = document.getElementById('filterTitle');
  if (titleEl) titleEl.textContent = filterType === 'transaction'? 'Filter Your Transaction Data' : 'Filter Your Expense Data';
  fillMonthYear('filterMonth','filterYear');
  fillCategorySelects();
  document.getElementById('filterSearch').value='';
  showScreen('filter');
  renderFilterResults();
}
function setRepayFilter(type){ repayFilter=type; document.querySelectorAll('#repayFilterRow button').forEach(b=>b.classList.remove('selected')); if(type==='completed') document.getElementById('btnRepayCompleted')?.classList.add('selected'); if(type==='remaining') document.getElementById('btnRemaining')?.classList.add('selected'); if(type==='all') document.getElementById('btnAllRepay')?.classList.add('selected'); renderFilterResults(); }
function renderFilterResults(){
  const monthVal = document.getElementById('filterMonth')?.value;
  const y = parseInt(document.getElementById('filterYear')?.value || new Date().getFullYear(), 10);
  const search = (document.getElementById('filterSearch')?.value || '').trim().toLowerCase();
  const catFilter = document.getElementById('filterCategory')?.value || "All Categories";
  const wrap = document.getElementById('filterTableWrap');
  const totalBox = document.getElementById('filterTotalBox');
  let filtered = [];
  if (filterType === 'expense') {
    filtered = expenses.filter(e => {
      const p = parseISODate(e.date_iso);
      if(!(p && p.month === parseInt(monthVal) && p.year === y)) return false;
      if(catFilter!== "All Categories" && (e.category||'Others')!== catFilter) return false;
      if(search &&!(e.name||'').toLowerCase().includes(search) &&!(e.category||'').toLowerCase().includes(search)) return false;
      return true;
    });
    if (filtered.length === 0) { wrap.innerHTML = `<div class="empty-note">No matching records.</div>`; totalBox.innerHTML = 'Total : ₹0.00'; return; }
    const rows = filtered.map(e => { const parsed = parseExpenseName(e.name); return `<tr><td class="col-date">${formatDate(e.date_iso)}</td><td class="col-name">${escapeHtml(e.category||'Others')}</td><td class="col-name">${escapeHtml(parsed.displayName || e.name)}</td><td class="col-amount">₹${Number(e.amount).toFixed(2)}</td></tr>`; }).join('');
    wrap.innerHTML = `<table class="entries"><thead><tr><th class="col-date">Date</th><th class="col-name">Category</th><th class="col-name">Name</th><th class="col-amount">Amount</th></tr></thead><tbody>${rows}</tbody></table>`;
    let totalAmount=0, totalQty=0, mainUnit='';
    filtered.forEach(e=>{ totalAmount+=Number(e.amount||0); const parsed=parseExpenseName(e.name); if(parsed.qty>0){ totalQty+=parsed.qty; if(!mainUnit) mainUnit=parsed.unit; } });
    let totalHTML = `Total (${catFilter}) : ₹${totalAmount.toFixed(2)}`;
    totalBox.innerHTML = totalHTML;
  } else {
    filtered = transactions.filter(t => {
      const p = parseISODate(t.date_iso);
      if(monthVal!== 'overall' &&!(p && p.month === parseInt(monthVal) && p.year === y)) return false;
      if(repayFilter==='completed' &&!t.is_received) return false;
      if(repayFilter==='remaining' && t.is_received) return false;
      if(search &&!((t.payer||'').toLowerCase().includes(search) || (t.receiver||'').toLowerCase().includes(search))) return false;
      return true;
    });
    if (filtered.length === 0) { wrap.innerHTML = `<div class="empty-note">No transactions found.</div>`; totalBox.innerHTML = 'Total : ₹0.00'; return; }
    const rows = filtered.map(t => `<tr><td class="col-date">${formatDate(t.date_iso)}</td><td class="col-txn-tofrom">${escapeHtml(t.payer)}</td><td class="col-txn-tofrom">${escapeHtml(t.receiver)}</td><td class="col-txn-amt">₹${Number(t.amount).toFixed(2)}</td><td class="col-date">${t.is_received? 'Yes' : 'No'}</td></tr>`).join('');
    wrap.innerHTML = `<table class="entries"><thead><tr><th class="col-date">Date</th><th class="col-txn-tofrom">Payer</th><th class="col-txn-tofrom">Receiver</th><th class="col-txn-amt">Amount</th><th class="col-date">Repaid</th></tr></thead><tbody>${rows}</tbody></table>`;
    totalBox.innerHTML = `Total : ₹${filtered.reduce((s,t)=>s+Number(t.amount||0),0).toFixed(2)}`;
  }
}

/* DASHBOARD - DIFFERENCE KADHYO + CATEGORY SUMMARY */
function computeDashboardTotals(month, year) {
  const catFilter = document.getElementById('dashCategory')?.value || "All Categories";
  let expList = expenses, txnList = transactions;
  if(catFilter!== "All Categories"){
    expList = expenses.filter(e => (e.category||'Others') === catFilter);
  }
  const totalExpense = expList.reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalTransaction = txnList.reduce((s, i) => s + Number(i.amount || 0), 0);
  const fE = expList.filter(i => { const p = parseISODate(i.date_iso); return p && p.month === month && p.year === year; });
  const fT = txnList.filter(i => { const p = parseISODate(i.date_iso); return p && p.month === month && p.year === year; });
  return { totalExpense, totalTransaction, monthExpenseTotal: fE.reduce((s, i) => s + Number(i.amount || 0), 0), monthTransactionTotal: fT.reduce((s, i) => s + Number(i.amount || 0), 0), catFilter };
}
function applyDashboardFilter() {
  const month = parseInt(document.getElementById('dashMonth').value, 10);
  const year = parseInt(document.getElementById('dashYear').value, 10);
  renderDashboard(month, year);
}
function getMonthlyTotals(data) { const totals = new Array(12).fill(0); data.forEach(item => { const p = parseISODate(item.date_iso); if (p) totals[p.month] += Number(item.amount || 0); }); return totals; }
function createChart(containerId, values, color = '#3b82f6') { const container = document.getElementById(containerId); if (!container) return; const maxValue = Math.max(...values, 1); container.innerHTML = `<div class="dashboard-chart">${values.map((value, index) => `<div class="chart-row"><div class="chart-month">${monthNames[index].slice(0, 3)}</div><div class="chart-bar-area"><div class="chart-bar" style="width:${value > 0? Math.max((value / maxValue) * 100, 3) : 0}%; background:${color};"></div></div><div class="chart-value">₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div></div>`).join('')}</div>`; }
function getHighestMonth(data) { const totals = getMonthlyTotals(data); const max = Math.max(...totals); if (max <= 0) return { month: '-', amount: 0 }; return { month: monthNames[totals.indexOf(max)], amount: max }; }
function renderDashboardSummary(month, year, totals) {
  const el = document.getElementById('dashboardSummary'); if (!el) return;
  const { totalExpense, totalTransaction, monthExpenseTotal, monthTransactionTotal, catFilter } = totals;
  const currentLabel = `${monthNames[month]} ${year}`;
  // Category wise breakdown
  let catTotals = {};
  expenses.forEach(e => { let c = e.category || 'Others'; catTotals[c] = (catTotals[c]||0)+Number(e.amount||0); });
  let catHtml = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).map(([cat,amt])=>`<div class="summary-item"><span class="summary-icon">📦</span><div><div class="summary-label">${escapeHtml(cat)}</div><strong>₹${amt.toFixed(2)}</strong></div></div>`).join('');

  el.innerHTML = `<div class="summary-grid">
    <div class="summary-item"><span class="summary-icon">🧾</span><div><div class="summary-label">Total Expense Records (${catFilter})</div><strong>${expenses.length}</strong></div></div>
    <div class="summary-item"><span class="summary-icon">💸</span><div><div class="summary-label">Total Transaction Records</div><strong>${transactions.length}</strong></div></div>
    <div class="summary-item"><span class="summary-icon">📅</span><div><div class="summary-label">${currentLabel} Expense</div><strong>₹${monthExpenseTotal.toFixed(2)}</strong></div></div>
    <div class="summary-item"><span class="summary-icon">💰</span><div><div class="summary-label">${currentLabel} Transaction</div><strong>₹${monthTransactionTotal.toFixed(2)}</strong></div></div>
    <div class="summary-item"><span class="summary-icon">🏆</span><div><div class="summary-label">Highest Expense Month</div><strong>${getHighestMonth(expenses).month}</strong></div></div>
    <div class="summary-item"><span class="summary-icon">🥇</span><div><div class="summary-label">Highest Transaction Month</div><strong>${getHighestMonth(transactions).month}</strong></div></div>
  </div>
  <div style="margin-top:15px; font-weight:700;">Category Wise Expense</div>
  <div class="summary-grid" style="margin-top:10px;">${catHtml || '<div>No data</div>'}</div>`;
}
async function loadDashboard() {
  const user = await getCurrentUser(); if (!user) return;
  try {
    expenses = await loadTable('expenses'); transactions = await loadTable('transactions');
    fillMonthYear('dashMonth', 'dashYear'); fillCategorySelects();
    const now = new Date(); renderDashboard(now.getMonth(), now.getFullYear());
  } catch (error) { document.getElementById('dashboardSummary').innerHTML = `<div class="dashboard-error">Error: ${escapeHtml(error.message)}</div>`; }
}
function renderDashboard(month, year) {
  let expForChart = expenses;
  const catFilter = document.getElementById('dashCategory')?.value || "All Categories";
  if(catFilter!== "All Categories") expForChart = expenses.filter(e => (e.category||'Others') === catFilter);
  createChart('expenseChart', getMonthlyTotals(expForChart), '#ef4444');
  createChart('transactionChart', getMonthlyTotals(transactions), '#3b82f6');
  const totals = computeDashboardTotals(month, year);
  if (document.getElementById('dashboardTotalExpense')) document.getElementById('dashboardTotalExpense').textContent = totals.totalExpense.toFixed(2);
  if (document.getElementById('dashboardTotalTransaction')) document.getElementById('dashboardTotalTransaction').textContent = totals.totalTransaction.toFixed(2);
  if (document.getElementById('dashboardMonthExpense')) document.getElementById('dashboardMonthExpense').textContent = totals.monthExpenseTotal.toFixed(2);
  if (document.getElementById('dashboardMonthTransaction')) document.getElementById('dashboardMonthTransaction').textContent = totals.monthTransactionTotal.toFixed(2);
  if (document.getElementById('dashMonthExpenseTitle')) document.getElementById('dashMonthExpenseTitle').textContent = `${monthNames[month]} ${year} Expense (${totals.catFilter})`;
  if (document.getElementById('dashMonthTransactionTitle')) document.getElementById('dashMonthTransactionTitle').textContent = `${monthNames[month]} ${year} Transaction`;
  renderDashboardSummary(month, year, totals);
}

/* EVENTS */
document.addEventListener('DOMContentLoaded', async () => {
  if (!navigator.onLine) { showOfflineScreen(); return; }
  fillMonthYear('expMonth', 'expYear'); fillMonthYear('txnMonth', 'txnYear'); fillCategorySelects();
  const todayStr = todayISO();
  document.getElementById('expDate').value = todayStr; document.getElementById('txnDate').value = todayStr;
  document.getElementById('expDateText').textContent = formatDate(todayStr); document.getElementById('txnDateText').textContent = formatDate(todayStr);
  document.getElementById('expCategory')?.addEventListener('change', ()=>handleCategorySelectChange('expCategory'));
  document.getElementById('expCategoryFilter')?.addEventListener('change', ()=>{ if(document.getElementById('expCategoryFilter').value===NEW_CAT_LABEL) handleCategorySelectChange('expCategoryFilter'); else renderExpenses(); });
  document.getElementById('filterCategory')?.addEventListener('change', ()=>{ 
    if(document.getElementById('filterCategory').value===NEW_CAT_LABEL){
      handleCategorySelectChange('filterCategory');
    } else {
      renderFilterResults(); // <-- aa line add kar
    }
  });
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') { await checkRecoverySession(); return; }
    if (event === 'SIGNED_OUT') { expenses = []; transactions = []; currentUserId = null; }
    if (event === 'SIGNED_IN' && session?.user && session.user.id!== currentUserId) { currentUserId = session.user.id; expenses = []; transactions = []; }
  });
  await checkAuth();
});
function showBottomMessage(msg, type = 'success') { const bar = document.getElementById('bottomMsgBar'); if (!bar) return; bar.textContent = msg; bar.className = 'bottom-msg-bar ' + type; requestAnimationFrame(() => bar.classList.add('show')); setTimeout(() => bar.classList.remove('show'), 4000); }
function toggleTempShow(inputId, btn) { const input = document.getElementById(inputId); if (!input) return; if (input.type === 'text') { if (passwordTimers[inputId]) clearTimeout(passwordTimers[inputId]); input.type = 'password'; btn.classList.remove('active'); btn.textContent = '👁'; return; } input.type = 'text'; btn.classList.add('active'); btn.textContent = '🙈'; if (passwordTimers[inputId]) clearTimeout(passwordTimers[inputId]); passwordTimers[inputId] = setTimeout(() => { input.type = 'password'; btn.classList.remove('active'); btn.textContent = '👁'; delete passwordTimers[inputId]; }, 4000); }
async function checkRecoverySession() { const hash = window.location.hash; if (!hash ||!hash.includes('type=recovery')) return; try { let user = null; for (let i = 0; i < 8; i++) { const { data: { user: u } } = await supabaseClient.auth.getUser(); if (u) { user = u; break; } await new Promise(r => setTimeout(r, 300)); } if (!user) { showBottomMessage("Invalid or expired recovery link.", "error"); showScreen('login'); history.replaceState(null, '', window.location.pathname); return; } document.getElementById('resetUsername').textContent = user.user_metadata?.username || user.email?.split('@')[0] || 'User'; document.getElementById('resetEmailShow').textContent = user.email || '-'; showScreen('resetPassword'); history.replaceState(null, '', window.location.pathname); } catch (err) { showBottomMessage("Recovery error: " + err.message, "error"); showScreen('login'); } }
async function handleUpdatePassword() { const newPass = document.getElementById('newPassword').value; const retype = document.getElementById('retypeNewPassword').value; const errorEl = document.getElementById('resetError'); const btn = document.getElementById('confirmResetBtn'); errorEl.textContent = ''; if (newPass!== retype) { errorEl.textContent = 'Passwords do not match'; showBottomMessage("Passwords do not match", "error"); return; } if (newPass.length < 6) { errorEl.textContent = 'Password must be at least 6 characters'; showBottomMessage("Password must be at least 6 characters", "error"); return; } btn.disabled = true; btn.textContent = 'Updating...'; try { const { data: { user } } = await supabaseClient.auth.getUser(); const { error } = await supabaseClient.auth.updateUser({ password: newPass }); if (error) throw error; document.getElementById('successUsername').textContent = user?.user_metadata?.username || user?.email?.split('@')[0] || 'User'; await supabaseClient.auth.signOut(); currentUserId = null; showScreen('passwordSuccess'); document.getElementById('resetForm').reset(); history.replaceState(null, '', window.location.pathname); } catch (err) { errorEl.textContent = err.message; showBottomMessage(err.message, "error"); } finally { btn.disabled = false; btn.textContent = 'Confirm'; } }
if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('./service-worker.js').then(() => console.log('PWA registered')).catch(err => console.error(err)); }); }
function showOfflineScreen() { const appFrame = document.querySelector('.app-frame'); const offline = document.getElementById('offlineScreen'); if (appFrame) appFrame.style.display = 'none'; if (offline) offline.classList.add('show'); }
function hideOfflineScreen() { const appFrame = document.querySelector('.app-frame'); const offline = document.getElementById('offlineScreen'); if (appFrame) appFrame.style.display = ''; if (offline) offline.classList.remove('show'); }
function checkInternetAndReload() { if (navigator.onLine) { location.reload(); } else { showBottomMessage("Still no internet connection", "error"); } }
window.addEventListener('offline', showOfflineScreen); window.addEventListener('online', () => location.reload());
function openDeleteDialog(type, id) { pendingDeleteType = type; pendingDeleteId = id; document.getElementById('deleteDialog')?.classList.add('active'); setTimeout(() => document.querySelector('.confirm-delete-btn')?.focus(), 50); }
function closeDeleteDialog() { pendingDeleteType = null; pendingDeleteId = null; document.getElementById('deleteDialog')?.classList.remove('active'); }
async function confirmDelete() { if (!pendingDeleteType || pendingDeleteId === null) return closeDeleteDialog(); const type = pendingDeleteType, id = pendingDeleteId; closeDeleteDialog(); if (type === 'expense') await performDeleteExpense(id); if (type === 'transaction') await performDeleteTransaction(id); }
function openDeleteAccountDialog() { document.getElementById('deleteAccountDialog')?.classList.add('active'); }
function closeDeleteAccountDialog() { document.getElementById('deleteAccountDialog')?.classList.remove('active'); }
async function confirmDeleteAccount() { const user = await getCurrentUser(); if (!user) return closeDeleteAccountDialog(); const deleteBtn = document.querySelector('#deleteAccountDialog.confirm-delete-btn'); if (deleteBtn) { deleteBtn.disabled = true; deleteBtn.textContent = 'Deleting...'; } try { const { error } = await supabaseClient.rpc('delete_own_account'); if (error) throw error; expenses = []; transactions = []; await supabaseClient.auth.signOut(); closeDeleteAccountDialog(); showScreen('login'); showBottomMessage("Account and all data permanently deleted.", "success"); } catch (err) { showBottomMessage("Failed: " + err.message, "error"); if (deleteBtn) { deleteBtn.disabled = false; deleteBtn.textContent = 'Delete'; } } }
// ========== FINAL EXPENSE PDF - TARA FORMAT PRAMANE ==========
async function downloadExpensePDF() {
  const m = parseInt(document.getElementById('expMonth').value, 10);
  const y = parseInt(document.getElementById('expYear').value, 10);
  const cat = document.getElementById('expCategoryFilter')?.value || "All Categories";
  const { data: { user } } = await supabaseClient.auth.getUser();
  const userName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';

  let filtered = expenses.filter(e => {
    const p = parseISODate(e.date_iso);
    return p && p.month === m && p.year === y;
  });
  if(cat!== 'All Categories' && cat!== "➕ New Category..."){
    filtered = filtered.filter(e => (e.category||'Others') === cat);
  }
  if(filtered.length === 0) return showBottomMessage("No data for PDF","error");

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;

  // 1. Center - Daily Expense
  doc.setFontSize(18); doc.setFont("helvetica","bold"); doc.setTextColor(0,0,0);
  doc.text("Daily Expense", pageWidth/2, 18, {align:"center"});

  // 2. Right Top - Download Date
  doc.setFontSize(10); doc.setFont("helvetica","normal");
  doc.text(`Date: ${todayISO()}`, pageWidth-14, 10, {align:"right"});

  // 3. Space pachi Center Red - Month Year
  doc.setFontSize(14); doc.setFont("helvetica","bold"); doc.setTextColor(255,0,0);
  doc.text(`${monthNames[m]} ${y}`, pageWidth/2, 30, {align:"center"});

  // 4. Left side - Username ane Category
  doc.setTextColor(0,0,0); doc.setFontSize(11); doc.setFont("helvetica","normal");
  doc.text(`Username: ${userName}`, 14, 42);
  doc.text(`Expense Category: ${cat}`, 14, 49);

  // 5. Data - Category column nai
  const tableData = filtered.map((e, idx) => {
    const parsed = parseExpenseName(e.name);
    return [idx+1, formatDate(e.date_iso), (parsed.displayName||e.name).substring(0,45), Number(e.amount).toFixed(2)];
  });

  doc.autoTable({
    startY: 56,
    head: [['Sr.No', 'Date', 'Expense Name', 'Amount (Rs)']],
    body: tableData,
    theme: 'grid',
    styles: { halign: 'center', fontSize: 10 },
    headStyles: { fillColor: [17, 94, 89] }
  });

  const total = filtered.reduce((s,e)=>s+Number(e.amount||0),0);
  doc.setFontSize(12); doc.setFont("helvetica","bold");
  doc.text(`Total (${cat}) : Rs ${total.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 10);
  doc.save(`Expense_${monthNames[m]}_${y}_${cat}.pdf`);
}

// ========== FINAL FILTER PDF - SAME FORMAT ==========
function downloadFilterPDF(){
  const monthVal = document.getElementById('filterMonth')?.value;
  const y = parseInt(document.getElementById('filterYear')?.value || 2026, 10);
  const catFilter = document.getElementById('filterCategory')?.value || "All Categories";
  const search = (document.getElementById('filterSearch')?.value || '').trim();

  let filtered = expenses.filter(e => {
    const p = parseISODate(e.date_iso);
    if(!(p && p.month === parseInt(monthVal) && p.year === y)) return false;
    if(catFilter!== "All Categories" && (e.category||'Others')!== catFilter) return false;
    if(search &&!e.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  if(filtered.length === 0) return showBottomMessage("No data to download","error");

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ format: 'a4' });
  const pageWidth = 210;

  doc.setFontSize(18); doc.setFont("helvetica","bold"); doc.text("Daily Expense", pageWidth/2, 18, {align:"center"});
  doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.text(`Date: ${todayISO()}`, pageWidth-14, 10, {align:"right"});
  doc.setFontSize(14); doc.setTextColor(255,0,0); doc.setFont("helvetica","bold");
  doc.text(`${monthNames[monthVal]} ${y}`, pageWidth/2, 30, {align:"center"});
  doc.setTextColor(0,0,0); doc.setFontSize(11); doc.setFont("helvetica","normal");
  doc.text(`Expense Category: ${catFilter}`, 14, 42);

  const tableData = filtered.map((e,i)=>[i+1, formatDate(e.date_iso), parseExpenseName(e.name).displayName.substring(0,45), Number(e.amount).toFixed(2)]);
  doc.autoTable({ startY: 50, head: [['Sr.No','Date','Expense Name','Amount']], body: tableData, theme:'grid', styles:{halign:'center'} });

  let total = filtered.reduce((s,i)=>s+Number(i.amount||0),0);
  doc.setFontSize(12); doc.setFont("helvetica","bold");
  doc.text(`Total: Rs ${total.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 10);
  doc.save(`Filter_${catFilter}_${monthNames[monthVal]}_${y}.pdf`);
}

function downloadTransactionPDF(){ const m = parseInt(document.getElementById('txnMonth').value, 10); const y = parseInt(document.getElementById('txnYear').value, 10); const filtered = transactions.filter(t => { const p = parseISODate(t.date_iso); return p && p.month === m && p.year === y; }); const { jsPDF } = window.jspdf; const doc = new jsPDF(); doc.setFontSize(16); doc.text(`Money Transaction Report - ${monthNames[m]} ${y}`, 14, 18); let yPos = 30; doc.setFontSize(11); doc.text('Tarikh', 14, yPos); doc.text('Payer', 45, yPos); doc.text('Receiver', 80, yPos); doc.text('Paisa (Rs)', 115, yPos); doc.text('Received', 150, yPos); yPos += 6; doc.line(14, yPos, 196, yPos); yPos += 8; let total = 0; filtered.forEach(t => { if (yPos > 280) { doc.addPage(); yPos = 20; } doc.text(formatDate(t.date_iso), 14, yPos); doc.text(String(t.payer), 45, yPos); doc.text(String(t.receiver), 80, yPos); doc.text(Number(t.amount).toFixed(2), 115, yPos); doc.text(t.is_received? 'Yes' : 'No', 150, yPos); total += Number(t.amount); yPos += 8; }); doc.setFontSize(13); doc.text(`Total: Rs ${total.toFixed(2)}`, 14, yPos + 6); doc.save(`Money_Transaction_${monthNames[m]}_${y}.pdf`); }
async function handleLogin(){ const email = document.getElementById('loginEmail').value.trim(); const password = document.getElementById('loginPassword').value; const btn = document.getElementById('loginBtn'); const errorEl = document.getElementById('loginError'); localStorage.setItem('savedEmail', email); localStorage.setItem('savedPassword', password); errorEl.textContent = ''; btn.disabled = true; btn.textContent = 'Logging in...'; try { expenses = []; transactions = []; currentUserId = null; const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password }); if (error) throw error; currentUserId = data.user.id; updateUsernameDisplay(data.user); showScreen('home'); await loadExpenses(); await loadTransactions(); } catch (err) { errorEl.textContent = err.message || 'Login failed'; } finally { btn.disabled = false; btn.textContent = 'Login'; } }
async function handleSignup(){ const email = document.getElementById('signupEmail').value.trim(); const username = document.getElementById('signupUsername').value.trim(); const password = document.getElementById('signupPassword').value; const retype = document.getElementById('signupRetype').value; const btn = document.getElementById('signupBtn'); const errorEl = document.getElementById('signupError'); errorEl.textContent = ''; if (password!== retype) return errorEl.textContent = 'Passwords do not match'; if (password.length < 6) return errorEl.textContent = 'Password must be at least 6 characters'; btn.disabled = true; btn.textContent = 'Creating account...'; try { const { error } = await supabaseClient.auth.signUp({ email, password, options: { data: { username } } }); if (error) throw error; showBottomMessage('Account created successfully!', 'success'); document.getElementById('signupForm').reset(); showScreen('login'); } catch (err) { errorEl.textContent = err.message || 'Signup failed'; } finally { btn.disabled = false; btn.textContent = 'Sign Up'; } }
async function handleForgotPassword(){ const email = document.getElementById('loginEmail').value.trim(); const forgotBtn = document.getElementById('forgotBtn'); const errorEl = document.getElementById('loginError'); if (!email) return showBottomMessage("Please enter email first", "error"); if (isSendingReset) return showBottomMessage("Reset link already sending, please wait...", "error"); const now = Date.now(); if (now - lastResetSentAt < 60000) return showBottomMessage(`Please wait ${Math.ceil((60000 - (now - lastResetSentAt)) / 1000)}s before next reset mail`, "error"); isSendingReset = true; forgotBtn.disabled = true; forgotBtn.textContent = 'Sending...'; errorEl.textContent = ''; try { const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname }); if (error) throw error; lastResetSentAt = Date.now(); localStorage.setItem('lastResetSentAt', lastResetSentAt); showBottomMessage(`Reset link sent to ${email}. Check your mail.`, "success"); } catch (err) { errorEl.textContent = err.message; showBottomMessage(err.message, "error"); } finally { isSendingReset = false; forgotBtn.disabled = false; forgotBtn.textContent = 'Forgot Password?'; } }
async function handleLogout(){ await supabaseClient.auth.signOut(); showScreen('login'); expenses = []; transactions = []; currentUserId = null; }
function downloadFilterPDF(){ const monthVal = document.getElementById('filterMonth')?.value; const y = parseInt(document.getElementById('filterYear')?.value || new Date().getFullYear(), 10); const search = (document.getElementById('filterSearch')?.value || '').trim().toLowerCase(); const catFilter = document.getElementById('filterCategory')?.value || "All Categories"; let filtered = []; let title = ''; if (filterType === 'expense') { filtered = expenses.filter(e => { const p = parseISODate(e.date_iso); if(!(p && p.month === parseInt(monthVal) && p.year === y)) return false; if(catFilter!== "All Categories" && (e.category||'Others')!== catFilter) return false; if(search &&!(e.name||'').toLowerCase().includes(search) &&!(e.category||'').toLowerCase().includes(search)) return false; return true; }); title = `Expense Filter - ${catFilter} - ${monthNames[monthVal]} ${y}`; } else { filtered = transactions.filter(t => { const p = parseISODate(t.date_iso); if(monthVal!== 'overall' &&!(p && p.month === parseInt(monthVal) && p.year === y)) return false; if(repayFilter === 'completed' &&!t.is_received) return false; if(repayFilter === 'remaining' && t.is_received) return false; if(search &&!((t.payer||'').toLowerCase().includes(search) || (t.receiver||'').toLowerCase().includes(search))) return false; return true; }); title = `Transaction Filter - ${monthVal === 'overall'? 'Overall' : monthNames[monthVal]+' '+y} - ${repayFilter}`; } if (filtered.length === 0) return showBottomMessage("No data to download", "error"); const { jsPDF } = window.jspdf; const doc = new jsPDF(); doc.setFontSize(14); doc.text(title, 14, 18); let yPos = 30; if (filterType === 'expense') { doc.setFontSize(10); doc.text('Date', 14, yPos); doc.text('Category', 35, yPos); doc.text('Name', 65, yPos); doc.text('Amount', 150, yPos); yPos+=8; filtered.forEach(e => { if (yPos > 270) { doc.addPage(); yPos = 20; } doc.text(formatDate(e.date_iso), 14, yPos); doc.text(String(e.category||'Others').substring(0,12), 35, yPos); doc.text(String(parseExpenseName(e.name).displayName || e.name).substring(0,25), 65, yPos); doc.text(Number(e.amount).toFixed(2), 150, yPos); yPos+=7; }); } else { doc.setFontSize(9); doc.text('Date', 10, yPos); doc.text('Payer', 30, yPos); doc.text('Receiver', 60, yPos); doc.text('Amount', 110, yPos); doc.text('Repaid', 150, yPos); yPos+=8; filtered.forEach(t => { if (yPos > 270) { doc.addPage(); yPos = 20; } doc.text(formatDate(t.date_iso), 10, yPos); doc.text(String(t.payer).substring(0,15), 30, yPos); doc.text(String(t.receiver).substring(0,15), 60, yPos); doc.text(Number(t.amount).toFixed(2), 110, yPos); doc.text(t.is_received? 'Yes' : 'No', 150, yPos); yPos+=7; }); } let total = filtered.reduce((s, i) => s + Number(i.amount || 0), 0); yPos+=5; doc.setFontSize(12); doc.text(`Total: Rs ${total.toFixed(2)} (${filtered.length} records)`, 14, yPos); doc.save(title.replace(/ /g,'_')+'.pdf'); }
let selectedRowTimer = null;
function highlightRow(row){ document.querySelectorAll('table.entries tbody tr.selected-row').forEach(r => { r.classList.remove('selected-row'); }); row.classList.add('selected-row'); if (selectedRowTimer) clearTimeout(selectedRowTimer); selectedRowTimer = setTimeout(() => { row.classList.remove('selected-row'); selectedRowTimer = null; }, 3500); }
document.addEventListener('click', function(e){ const row = e.target.closest('table.entries tbody tr'); if (row) highlightRow(row); });




function handleExpenseCategoryChange(){
  let sel = document.getElementById('expCategoryFilter');
  if(sel.value === NEW_CAT_LABEL){
    currentCategoryTarget = 'expCategoryFilter';
    document.getElementById('newCategoryDialog')?.classList.add('active');
    document.getElementById('newCategoryInput').value = "";
    document.getElementById('newCategoryInput').focus();
  } else {
    renderExpenses(); // niche badho data j dekhase, pan placeholder badlay
    let ph = document.getElementById('expName');
    if(sel.value === 'Petrol') ph.placeholder = "Petrol 20 liter";
    else if(sel.value === 'Cement') ph.placeholder = "Cement 10 bags";
    else if(sel.value === 'Upda') ph.placeholder = "Upda detail";
    else ph.placeholder = "Expense Name";
  }
}

function selectCustomCategory(val){
  let box = document.getElementById('customCategoryBox');
  document.getElementById('customCategoryValue').textContent = val;
  document.getElementById('deleteCategorySelect').value = val;
  document.getElementById('customCategoryList').style.display = 'none';

  // Jo koi category select kari to brown background + white text
  box.style.background = "#a16207"; // light brown
  box.style.color = "white";
  box.style.borderColor = "#78350f";
}

function openDeleteCategoryDialog(){
  let sel = document.getElementById('deleteCategorySelect');
  let listDiv = document.getElementById('customCategoryList');
  let box = document.getElementById('customCategoryBox');

  // Reset - pachi light blue thai jase
  box.style.background = "#dbeafe";
  box.style.color = "#111";
  box.style.borderColor = "#111";

  sel.innerHTML = "";
  listDiv.innerHTML = "";
  let all = getAllCategoriesFiltered().filter(c => c!== 'Others');
  if(all.length === 0) return showBottomMessage("Delete karva mate koi category nathi","error");

  all.forEach((c, idx) => {
    sel.add(new Option(c, c));
    let div = document.createElement('div');
    div.textContent = c;
    div.style.cssText = "padding:12px; text-align:center; font-weight:600; cursor:pointer; border-bottom:1px solid #ddd; background:white; transition:0.2s;";
    if(idx === all.length - 1) div.style.borderBottom = "none";

    // HOVER = Light Yellow
    div.onmouseover = () => div.style.background = "#fef9c3"; // light yellow
    div.onmouseout = () => div.style.background = "white";

    div.onclick = () => selectCustomCategory(c);
    listDiv.appendChild(div);
  });
  document.getElementById('customCategoryValue').textContent = all[0];
  sel.value = all[0];
  document.getElementById('deleteCategoryDialog').classList.add('active');
}

function toggleCustomCategoryList(){
  let list = document.getElementById('customCategoryList');
  list.style.display = list.style.display === 'none'? 'block' : 'none';
}

async function saveNewCategory(){
  let input = document.getElementById('newCategoryInput');
  let newCat = input.value.trim();
  if(!newCat) return showBottomMessage("Category name lakho","error");
  if(newCat === "All Categories" || newCat === NEW_CAT_LABEL) return showBottomMessage("Aa nam use na thai","error");

  let custom = JSON.parse(localStorage.getItem('customCategories') || "[]");
  let hidden = JSON.parse(localStorage.getItem('hiddenCategories') || "[]");
  let allDefaults = [...DEFAULT_CATEGORIES];

  // Case 1: Jo category hidden ma hoy (jaim Cement delete kari hoy) to ene unhide kari do
  if(hidden.includes(newCat)){
    hidden = hidden.filter(c => c !== newCat);
    localStorage.setItem('hiddenCategories', JSON.stringify(hidden));
    fillCategorySelects();
    closeNewCategoryDialog();
    return showBottomMessage(`"${newCat}" category pachi restore thai gai`, "success");
  }

  // Case 2: Kharekhar already exist hoy to j error aapo
  if(allDefaults.includes(newCat) || custom.includes(newCat)){
    return showBottomMessage("Category already exist", "error");
  }

  // Case 3: Navi category
  custom.push(newCat);
  localStorage.setItem('customCategories', JSON.stringify(custom));
  fillCategorySelects();
  closeNewCategoryDialog();
  document.getElementById('expCategoryFilter').value = newCat;
  showBottomMessage(`"${newCat}" category banavi`, "success");
}

// PDF generate function ma
function generatePDF(data, title){
  // A4 size fix
  const doc = new jspdf.jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4' // <-- A4 fix, random size bandh
  });

  const pageWidth = 210; // A4 width mm
  const pageHeight = 297; // A4 height mm

  // Header / Title center
  doc.setFontSize(16);
  doc.setFont("helvetica","bold");
  doc.text(title, pageWidth/2, 15, {align:"center"});

  // Table - autoTable A4 mujab
  doc.autoTable({
    startY: 22,
    head: [['Date','Category','Amount','Note']],
    body: data.map(e => [e.date, e.category, e.amount, e.note || '']),
    theme: 'grid',
    styles: { 
      halign: 'center', 
      valign: 'middle',
      fontSize: 10,
      cellPadding: 3
    },
    headStyles: {
      fillColor: [17, 94, 89],
      halign: 'center'
    },
    margin: { left: 10, right: 10 },
    pageBreak: 'auto',
    tableWidth: 'auto'
  });

  doc.save(`${title}.pdf`);
}
function fillFilterCategory(){
  let sel = document.getElementById('filterCategory');
  if(!sel) return;
  sel.innerHTML = '<option value="All">All</option>';
  getAllCategoriesFiltered().forEach(c=>{
    sel.add(new Option(c,c));
  });
}

