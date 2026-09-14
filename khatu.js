const SUPABASE_URL = "https://fdddjqakdobjqgimnsdv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZGRqcWFrZG9ianFnaW1uc2R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MDYzNDgsImV4cCI6MjEwNDM4MjM0OH0.UXtoDhglVxSTW65lS64uT37YkfHnVHPEyZak_3Ir39M";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let expenses = [];
let transactions = [];
let editExpenseId = null;
let editTransactionId = null;
let profileDashboardBackScreen = null;
let pendingDeleteType = null;
let pendingDeleteId = null;
let passwordTimers = {};
let isSendingReset = false;
let lastResetSentAt = localStorage.getItem('lastResetSentAt') || 0;
let currentUserId = null;

const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/* ================= SCREEN & MENU ================= */
function showScreen(name) {
  const screens = ['loginScreen','signupScreen','resetPasswordScreen','passwordSuccessScreen','homeScreen','expenseScreen','transactionScreen','profileScreen','dashboardScreen'];
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
  const { data, error } = await supabaseClient.auth.getUser();
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

/* ================= HELPERS ================= */
function scrollTableToBottom(tableId) {
  const wrap = document.getElementById(tableId); if (!wrap) return;
  requestAnimationFrame(() => { wrap.scrollTop = wrap.scrollHeight; setTimeout(() => wrap.scrollTop = wrap.scrollHeight, 100); });
}
function updateProfileDisplay(user) {
  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';
  if(document.getElementById('profileUsername')) document.getElementById('profileUsername').textContent = username;
  if(document.getElementById('profileEmail')) document.getElementById('profileEmail').textContent = user?.email || '-';
}
function updateUsernameDisplay(user) {
  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';
  if(document.getElementById('homeUsername')) document.getElementById('homeUsername').textContent = username;
  document.querySelectorAll('.screenUsername').forEach(el => el.textContent = username);
  updateProfileDisplay(user);
}
function capitalizeFirstLetter(value) { return value? value.charAt(0).toUpperCase() + value.slice(1) : ''; }
function capitalizeFirst(input) { if (input.value.length === 1) input.value = input.value.toUpperCase(); }
function fillMonthYear(monthSelId, yearSelId) {
  const monthSel = document.getElementById(monthSelId), yearSel = document.getElementById(yearSelId); if (!monthSel ||!yearSel) return;
  monthSel.innerHTML = ''; yearSel.innerHTML = '';
  monthNames.forEach((m, i) => monthSel.add(new Option(m, i)));
  for (let y = 2000; y <= 2099; y++) yearSel.add(new Option(y, y));
  const now = new Date(); monthSel.value = now.getMonth(); yearSel.value = now.getFullYear();
}
function todayISO() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
function parseISODate(iso) { if (!iso || typeof iso!== 'string') return null; const [y,m,d] = iso.split('-').map(Number); if(isNaN(y)||isNaN(m)||isNaN(d)) return null; return { year: y, month: m-1, day: d }; }
function formatDate(iso) { const p = parseISODate(iso); return p? `${String(p.day).padStart(2,'0')}-${monthNames[p.month].slice(0,3)}-${p.year}` : (iso || '-'); }
function updateDateDisplay(inputId, textId) { const val = document.getElementById(inputId)?.value; if(val) document.getElementById(textId).textContent = formatDate(val); }
function openDatePicker(inputId) { document.getElementById(inputId)?.showPicker?.(); }
function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }
function jsAttr(value) { return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function calculateDaysDiff(startDateStr, endDateStr) {
  if (!startDateStr ||!endDateStr) return '-';
  const start = new Date(startDateStr + 'T00:00:00'), end = new Date(endDateStr + 'T00:00:00');
  return `${Math.ceil(Math.abs(end - start) / (1000*60*60*24))} Days`;
}

/* ================= AUTH ================= */
async function getCurrentUser() {
  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error) { console.error("Get User Error:", error); return null; }
  currentUserId = user? user.id : null; return user;
}
async function checkAuth() {
  const hash = window.location.hash;
  if (hash && hash.includes('type=recovery')) { await checkRecoverySession(); return; }
  showScreen('login');
}

/* ================= GENERIC DATA LOGIC - DUPLICATE KHATAM ================= */
async function loadTable(tableName) {
  const user = await getCurrentUser(); if (!user) return [];
  const { data, error } = await supabaseClient.from(tableName).select('*').eq('user_id', user.id).order('date_iso', { ascending: true }).order('id', { ascending: true });
  if (error) { console.error(`${tableName} Load Error:`, error); showBottomMessage(`${tableName} load error: ${error.message}`, "error"); return []; }
  const filtered = (data || []).filter(r => r.user_id === user.id);
  if (filtered.length!== (data||[]).length) console.warn(`[SECURITY] ${tableName} RLS NOT ENABLED`);
  return filtered;
}
async function deleteRow(tableName, id) {
  const user = await getCurrentUser(); if (!user) return false;
  const { error, count } = await supabaseClient.from(tableName).delete({ count: 'exact' }).eq('id', id).eq('user_id', user.id);
  if (error) { showBottomMessage(error.message, "error"); return false; }
  if (count === 0) { showBottomMessage("Delete failed: no matching record (check Supabase delete policy)", "error"); return false; }
  return true;
}

/* ================= EXPENSE ================= */
async function loadExpenses() { expenses = await loadTable('expenses'); renderExpenses(); }
async function addOrUpdateExpense() {
  const user = await getCurrentUser(); if (!user) return showBottomMessage("User is not logged in", "error");
  const nameInput = document.getElementById('expName'), amtInput = document.getElementById('expAmount');
  if (!nameInput.checkValidity()) return nameInput.reportValidity();
  if (!amtInput.checkValidity()) return amtInput.reportValidity();
  const name = capitalizeFirstLetter(nameInput.value.trim()), amount = parseFloat(amtInput.value), date = document.getElementById('expDate').value || todayISO();
  const btn = document.getElementById('expDoneBtn');
  btn.disabled = true; btn.textContent = editExpenseId!== null? 'Updating...' : 'Saving...';
  try {
    if (editExpenseId!== null) {
      if (!expenses.find(e => String(e.id) === String(editExpenseId))) throw new Error("You can only edit your own records.");
      const { error } = await supabaseClient.from('expenses').update({ name, amount, date_iso: date }).eq('id', editExpenseId).eq('user_id', user.id);
      if (error) throw error; showBottomMessage("Expense updated successfully", "success"); editExpenseId = null;
    } else {
      const { error } = await supabaseClient.from('expenses').insert({ name, amount, date_iso: date, user_id: user.id });
      if (error) throw error; showBottomMessage("Expense added successfully", "success");
    }
    nameInput.value = ''; amtInput.value = ''; await loadExpenses(); setTimeout(() => nameInput.focus(), 150);
  } catch (err) { showBottomMessage(err.message, "error"); } finally { btn.disabled = false; btn.textContent = 'Done'; }
}
function editExpense(id) {
  const item = expenses.find(e => String(e.id) === String(id)); if (!item) return;
  document.getElementById('expName').value = item.name; document.getElementById('expAmount').value = item.amount;
  document.getElementById('expDate').value = item.date_iso; updateDateDisplay('expDate', 'expDateText');
  editExpenseId = item.id; document.getElementById('expDoneBtn').textContent = 'Update';
}
function deleteExpense(id) { openDeleteDialog('expense', id); }
async function performDeleteExpense(id) { if (await deleteRow('expenses', id)) { if (String(editExpenseId) === String(id)) { editExpenseId = null; document.getElementById('expDoneBtn').textContent = 'Done'; } showBottomMessage("Expense deleted", "success"); await loadExpenses(); } }
function renderExpenses() {
  const m = parseInt(document.getElementById('expMonth').value, 10), y = parseInt(document.getElementById('expYear').value, 10);
  const filtered = expenses.filter(e => { const p = parseISODate(e.date_iso); return p && p.month === m && p.year === y; });
  const wrap = document.getElementById('expenseTableWrap');
  if (filtered.length === 0) wrap.innerHTML = '<div class="empty-note">No expense recorded for this month.</div>';
  else {
    wrap.innerHTML = `<table class="entries"><thead><tr><th class="col-date">Date</th><th class="col-name">Name</th><th class="col-amount">Amount (₹)</th><th class="col-action">Action</th></tr></thead><tbody>
    ${filtered.map(e => `<tr><td class="col-date">${formatDate(e.date_iso)}</td><td class="col-name">${escapeHtml(e.name)}</td><td class="col-amount">₹${Number(e.amount).toFixed(2)}</td><td class="col-action"><div class="action-btns"><button class="edit-btn" onclick="editExpense('${jsAttr(e.id)}')">Edit</button><button class="del-btn" onclick="deleteExpense('${jsAttr(e.id)}')">Delete</button></div></td></tr>`).join('')}
    </tbody></table>`;
  }
  document.getElementById('expTotal').textContent = filtered.reduce((s, e) => s + Number(e.amount), 0).toFixed(2);
  scrollTableToBottom('expenseTableWrap');
}

/* ================= TRANSACTION ================= */
async function loadTransactions() { transactions = await loadTable('transactions'); renderTransactions(); }
async function addOrUpdateTransaction() {
  const user = await getCurrentUser(); if (!user) return showBottomMessage("User is not logged in", "error");
  const fromInput = document.getElementById('txnFrom'), toInput = document.getElementById('txnTo'), amtInput = document.getElementById('txnAmount');
  if (!fromInput.checkValidity() ||!toInput.checkValidity() ||!amtInput.checkValidity()) return (fromInput.reportValidity(), toInput.reportValidity(), amtInput.reportValidity());
  const from = capitalizeFirstLetter(fromInput.value.trim()), to = capitalizeFirstLetter(toInput.value.trim()), amount = parseFloat(amtInput.value), date = document.getElementById('txnDate').value || todayISO();
  const btn = document.getElementById('txnDoneBtn'); btn.disabled = true; btn.textContent = editTransactionId!== null? 'Updating...' : 'Saving...';
  try {
    if (editTransactionId!== null) {
      if (!transactions.find(t => String(t.id) === String(editTransactionId))) throw new Error("You can only edit your own records.");
      const { error } = await supabaseClient.from('transactions').update({ payer: from, receiver: to, amount, date_iso: date }).eq('id', editTransactionId).eq('user_id', user.id);
      if (error) throw error; showBottomMessage("Transaction updated successfully", "success"); editTransactionId = null;
    } else {
      const { error } = await supabaseClient.from('transactions').insert({ payer: from, receiver: to, amount, date_iso: date, is_received: false, received_date_iso: null, user_id: user.id });
      if (error) throw error; showBottomMessage("Transaction added successfully", "success");
    }
    fromInput.value = ''; toInput.value = ''; amtInput.value = ''; await loadTransactions(); setTimeout(() => fromInput.focus(), 150);
  } catch (err) { showBottomMessage(err.message, "error"); } finally { btn.disabled = false; btn.textContent = 'Done'; }
}
function editTransaction(id) {
  const item = transactions.find(t => String(t.id) === String(id)); if (!item) return;
  document.getElementById('txnFrom').value = item.payer; document.getElementById('txnTo').value = item.receiver;
  document.getElementById('txnAmount').value = item.amount; document.getElementById('txnDate').value = item.date_iso;
  updateDateDisplay('txnDate', 'txnDateText'); editTransactionId = item.id; document.getElementById('txnDoneBtn').textContent = 'Update';
}
function deleteTransaction(id) { openDeleteDialog('transaction', id); }
async function performDeleteTransaction(id) { if (await deleteRow('transactions', id)) { if (String(editTransactionId) === String(id)) { editTransactionId = null; document.getElementById('txnDoneBtn').textContent = 'Done'; } showBottomMessage("Transaction deleted", "success"); await loadTransactions(); } }
async function toggleReceived(id, isChecked) {
  const user = await getCurrentUser(); if (!user) return showBottomMessage("User is not logged in", "error");
  const { error } = await supabaseClient.from('transactions').update({ is_received: isChecked, received_date_iso: isChecked? todayISO() : null }).eq('id', id).eq('user_id', user.id);
  if (error) return showBottomMessage(error.message, "error"); await loadTransactions();
}
function renderTransactions() {
  const m = parseInt(document.getElementById('txnMonth').value, 10), y = parseInt(document.getElementById('txnYear').value, 10);
  const filtered = transactions.filter(t => { const p = parseISODate(t.date_iso); return p && p.month === m && p.year === y; });
  const wrap = document.getElementById('transactionTableWrap');
  if (filtered.length === 0) wrap.innerHTML = '<div class="empty-note">No transactions recorded for this month.</div>';
  else {
    wrap.innerHTML = `<table class="entries"><thead><tr><th class="col-date">Tarikh</th><th class="col-txn-tofrom">Payer</th><th class="col-txn-tofrom">Receiver</th><th class="col-txn-amt">Paisa</th><th class="col-date">Repay (✓)</th><th class="col-date">Repay Date</th><th class="col-date">Payment Gap</th><th class="col-action">Action</th></tr></thead><tbody>
    ${filtered.map(t => `<tr><td class="col-date">${formatDate(t.date_iso)}</td><td class="col-txn-tofrom">${escapeHtml(t.payer)}</td><td class="col-txn-tofrom">${escapeHtml(t.receiver)}</td><td class="col-txn-amt">₹${Number(t.amount).toFixed(2)}</td><td class="col-date"><input type="checkbox" class="custom-checkbox" ${t.is_received? 'checked' : ''} onchange="toggleReceived('${jsAttr(t.id)}', this.checked)"></td><td class="col-date">${t.received_date_iso? formatDate(t.received_date_iso) : '-'}</td><td class="col-date">${calculateDaysDiff(t.date_iso, t.received_date_iso)}</td><td class="col-action"><div class="action-btns"><button class="edit-btn" onclick="editTransaction('${jsAttr(t.id)}')">Edit</button><button class="del-btn" onclick="deleteTransaction('${jsAttr(t.id)}')">Delete</button></div></td></tr>`).join('')}
    </tbody></table>`;
  }
  document.getElementById('txnTotal').textContent = filtered.reduce((s, t) => s + Number(t.amount), 0).toFixed(2);
  scrollTableToBottom('transactionTableWrap');
}

/* ================= DELETE DIALOGS ================= */
function openDeleteDialog(type, id) { pendingDeleteType = type; pendingDeleteId = id; document.getElementById('deleteDialog')?.classList.add('active'); setTimeout(() => document.querySelector('.confirm-delete-btn')?.focus(), 50); }
function closeDeleteDialog() { pendingDeleteType = null; pendingDeleteId = null; document.getElementById('deleteDialog')?.classList.remove('active'); }
async function confirmDelete() { if (!pendingDeleteType || pendingDeleteId === null) return closeDeleteDialog(); const type = pendingDeleteType, id = pendingDeleteId; closeDeleteDialog(); if (type === 'expense') await performDeleteExpense(id); if (type === 'transaction') await performDeleteTransaction(id); }
function openDeleteAccountDialog() { document.getElementById('deleteAccountDialog')?.classList.add('active'); }
function closeDeleteAccountDialog() { document.getElementById('deleteAccountDialog')?.classList.remove('active'); }
async function confirmDeleteAccount() {
  const user = await getCurrentUser(); if (!user) return closeDeleteAccountDialog();
  const dialog = document.getElementById('deleteAccountDialog'), deleteBtn = dialog.querySelector('.confirm-delete-btn');
  if (deleteBtn) { deleteBtn.disabled = true; deleteBtn.textContent = 'Deleting...'; }
  try {
    const { error: rpcError } = await supabaseClient.rpc('delete_own_account'); if (rpcError) throw rpcError;
    expenses = []; transactions = []; await supabaseClient.auth.signOut(); closeDeleteAccountDialog();
    showScreen('login'); showBottomMessage("Account and all data permanently deleted.", "success");
    document.getElementById('loginEmail').value = ''; document.getElementById('loginPassword').value = '';
  } catch (err) { showBottomMessage("Failed: " + err.message, "error"); if (deleteBtn) { deleteBtn.disabled = false; deleteBtn.textContent = 'Delete'; } }
}

/* ================= PDF ================= */
function downloadExpensePDF() {
  const m = parseInt(document.getElementById('expMonth').value, 10);
  const y = parseInt(document.getElementById('expYear').value, 10);
  const search = (document.getElementById('expSearch')?.value || '').trim().toLowerCase();

  let filtered = expenses.filter(e => {
    const p = parseISODate(e.date_iso);
    return p && p.month === m && p.year === y;
  });

  if (search) {
    filtered = filtered.filter(e => (e.name || '').toLowerCase().includes(search));
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const title = search 
    ? `Expense Report - ${search.toUpperCase()} - ${monthNames[m]} ${y}`
    : `Daily Expense Report - ${monthNames[m]} ${y}`;

  doc.setFontSize(16);
  doc.text(title, 14, 18);

  let yPos = 30;
  doc.setFontSize(11);
  doc.text('Date', 14, yPos);
  doc.text('Name', 50, yPos);
  doc.text('Amount (Rs)', 150, yPos);
  yPos += 6;
  doc.line(14, yPos, 196, yPos);
  yPos += 8;

  let totalAmount = 0;
  let totalQty = 0;
  let mainUnit = '';
  let isCement = false, isPetrol = false, isVeg = false;

  filtered.forEach(e => {
    if (yPos > 270) { doc.addPage(); yPos = 20; }

    const parsed = parseExpenseName(e.name);
    const displayName = parsed.qty && parsed.unit
      ? `${parsed.cleanName} ${parsed.qty} ${parsed.unit}`
      : e.name;

    doc.text(formatDate(e.date_iso), 14, yPos);
    doc.text(String(displayName).substring(0, 45), 50, yPos);
    doc.text(Number(e.amount).toFixed(2), 150, yPos);

    totalAmount += Number(e.amount) || 0;
    if (parsed.qty) {
      totalQty += parsed.qty;
      if (!mainUnit) mainUnit = parsed.unit;
    }
    if (/cement/i.test(e.name)) isCement = true;
    if (/petrol|diesel/i.test(e.name)) isPetrol = true;
    if (/vegetable|veg|fruit|sabzi/i.test(e.name)) isVeg = true;

    yPos += 8;
  });

  yPos += 6;
  doc.setFontSize(13);
  doc.setFont(undefined, 'bold');

  if (totalQty > 0 && mainUnit) {
    if (isCement) {
      doc.text(`Total Cement Bags : ${totalQty}`, 14, yPos);
      yPos += 8;
      doc.text(`Total Amount : Rs ${totalAmount.toFixed(2)}`, 14, yPos);
    } else if (isPetrol) {
      doc.text(`Total Petrol : ${totalQty} Liter`, 14, yPos);
      yPos += 8;
      doc.text(`Total Amount : Rs ${totalAmount.toFixed(2)}`, 14, yPos);
    } else if (isVeg) {
      doc.text(`Total Quantity : ${totalQty} Kg`, 14, yPos);
      yPos += 8;
      doc.text(`Total Amount : Rs ${totalAmount.toFixed(2)}`, 14, yPos);
    } else {
      doc.text(`Total Qty : ${totalQty} ${mainUnit}  |  Amount : Rs ${totalAmount.toFixed(2)}`, 14, yPos);
    }
  } else {
    doc.text(`Total Expense : Rs ${totalAmount.toFixed(2)}`, 14, yPos);
  }

  const fileName = search 
    ? `Expense_${search}_${monthNames[m]}_${y}.pdf`
    : `Daily_Expense_${monthNames[m]}_${y}.pdf`;

  doc.save(fileName);
}
function downloadTransactionPDF() {
  const m = parseInt(document.getElementById('txnMonth').value, 10), y = parseInt(document.getElementById('txnYear').value, 10);
  const filtered = transactions.filter(t => { const p = parseISODate(t.date_iso); return p && p.month === m && p.year === y; });
  const { jsPDF } = window.jspdf; const doc = new jsPDF();
  doc.setFontSize(16); doc.text(`Money Transaction Report - ${monthNames[m]} ${y}`, 14, 18);
  let yPos = 30; doc.setFontSize(11); doc.text('Tarikh', 14, yPos); doc.text('Payer', 45, yPos); doc.text('Receiver', 80, yPos); doc.text('Paisa (Rs)', 115, yPos); doc.text('Received', 150, yPos); yPos += 6; doc.line(14, yPos, 196, yPos); yPos += 8;
  let total = 0; filtered.forEach(t => { if (yPos > 280) { doc.addPage(); yPos = 20; } doc.text(formatDate(t.date_iso), 14, yPos); doc.text(String(t.payer), 45, yPos); doc.text(String(t.receiver), 80, yPos); doc.text(Number(t.amount).toFixed(2), 115, yPos); doc.text(t.is_received? 'Yes' : 'No', 150, yPos); total += Number(t.amount); yPos += 8; });
  doc.setFontSize(13); doc.text(`Total: Rs ${total.toFixed(2)}`, 14, yPos + 6); doc.save(`Money_Transaction_${monthNames[m]}_${y}.pdf`);
}

/* ================= AUTH FLOW ================= */
async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim(), password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn'), errorEl = document.getElementById('loginError');
  errorEl.textContent = ''; btn.disabled = true; btn.textContent = 'Logging in...';
  try { expenses = []; transactions = []; currentUserId = null; const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password }); if (error) throw error; currentUserId = data.user.id; updateUsernameDisplay(data.user); showScreen('home'); await loadExpenses(); await loadTransactions(); } catch (err) { errorEl.textContent = err.message || 'Login failed'; } finally { btn.disabled = false; btn.textContent = 'Login'; }
}
async function handleSignup() {
  const email = document.getElementById('signupEmail').value.trim(), username = document.getElementById('signupUsername').value.trim(), password = document.getElementById('signupPassword').value, retype = document.getElementById('signupRetype').value;
  const btn = document.getElementById('signupBtn'), errorEl = document.getElementById('signupError'); errorEl.textContent = '';
  if (password!== retype) return errorEl.textContent = 'Passwords do not match'; if (password.length < 6) return errorEl.textContent = 'Password must be at least 6 characters';
  btn.disabled = true; btn.textContent = 'Creating account...';
  try { const { error } = await supabaseClient.auth.signUp({ email, password, options: { data: { username } } }); if (error) throw error; showBottomMessage('Account created successfully!', 'success'); document.getElementById('signupForm').reset(); showScreen('login'); } catch (err) { errorEl.textContent = err.message || 'Signup failed'; } finally { btn.disabled = false; btn.textContent = 'Sign Up'; }
}
async function handleForgotPassword() {
  const email = document.getElementById('loginEmail').value.trim(), forgotBtn = document.getElementById('forgotBtn'), errorEl = document.getElementById('loginError');
  if (!email) return showBottomMessage("Please enter email first", "error");
  if (isSendingReset) return showBottomMessage("Reset link already sending, please wait...", "error");
  const now = Date.now(); if (now - lastResetSentAt < 60000) return showBottomMessage(`Please wait ${Math.ceil((60000 - (now - lastResetSentAt)) / 1000)}s before next reset mail`, "error");
  isSendingReset = true; forgotBtn.disabled = true; forgotBtn.textContent = 'Sending...'; errorEl.textContent = '';
  try { const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname }); if (error) throw error; lastResetSentAt = Date.now(); localStorage.setItem('lastResetSentAt', lastResetSentAt); showBottomMessage(`Reset link sent to ${email}. Check your mail.`, "success"); } catch (err) { errorEl.textContent = err.message; showBottomMessage(err.message, "error"); } finally { isSendingReset = false; forgotBtn.disabled = false; forgotBtn.textContent = 'Forgot Password?'; }
}
async function handleLogout() { await supabaseClient.auth.signOut(); showScreen('login'); expenses = []; transactions = []; currentUserId = null; }

/* ================= DASHBOARD ================= */
function computeDashboardTotals(month, year) {
  const totalExpense = expenses.reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalTransaction = transactions.reduce((s, i) => s + Number(i.amount || 0), 0);
  const fE = expenses.filter(i => { const p = parseISODate(i.date_iso); return p && p.month === month && p.year === year; });
  const fT = transactions.filter(i => { const p = parseISODate(i.date_iso); return p && p.month === month && p.year === year; });
  return {
    totalExpense,
    totalTransaction,
    monthExpenseTotal: fE.reduce((s, i) => s + Number(i.amount || 0), 0),
    monthTransactionTotal: fT.reduce((s, i) => s + Number(i.amount || 0), 0)
  };
}
function applyDashboardFilter() {
  const month = parseInt(document.getElementById('dashMonth').value, 10);
  const year = parseInt(document.getElementById('dashYear').value, 10);
  renderDashboard(month, year);
}
function getMonthlyTotals(data) {
  const totals = new Array(12).fill(0);
  data.forEach(item => {
    const p = parseISODate(item.date_iso);
    if (p) totals[p.month] += Number(item.amount || 0);
  });
  return totals;
}
function createChart(containerId, values, color = '#3b82f6') {
  const container = document.getElementById(containerId);
  if (!container) return;
  const maxValue = Math.max(...values, 1);
  container.innerHTML = `<div class="dashboard-chart">${values.map((value, index) =>
    `<div class="chart-row">
      <div class="chart-month">${monthNames[index].slice(0, 3)}</div>
      <div class="chart-bar-area"><div class="chart-bar" style="width:${value > 0 ? Math.max((value / maxValue) * 100, 3) : 0}%; background:${color};"></div></div>
      <div class="chart-value">₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
    </div>`
  ).join('')}</div>`;
}
function getHighestMonth(data) {
  const totals = getMonthlyTotals(data);
  const max = Math.max(...totals);
  if (max <= 0) return { month: '-', amount: 0 };
  return { month: monthNames[totals.indexOf(max)], amount: max };
}
function getPreviousMonthData(data, month, year) {
  let m = month - 1, y = year;
  if (m < 0) { m = 11; y--; }
  return data.filter(item => {
    const p = parseISODate(item.date_iso);
    return p && p.month === m && p.year === y;
  });
}
function renderDashboardSummary(month, year, totals) {
  const el = document.getElementById('dashboardSummary');
  if (!el) return;
  const { totalExpense, totalTransaction, monthExpenseTotal, monthTransactionTotal } = totals;
  const currentLabel = `${monthNames[month]} ${year}`;
  const expenseCount = expenses.length;
  const transactionCount = transactions.length;
  const previousExpenses = getPreviousMonthData(expenses, month, year);
  const previousTransactions = getPreviousMonthData(transactions, month, year);
  const previousExpenseTotal = previousExpenses.reduce((s, i) => s + Number(i.amount || 0), 0);
  const previousTransactionTotal = previousTransactions.reduce((s, i) => s + Number(i.amount || 0), 0);
  const overallDifference = totalTransaction - totalExpense;
  const monthDifference = monthTransactionTotal - monthExpenseTotal;

  el.innerHTML = `<div class="summary-grid">
    <div class="summary-item"><span class="summary-icon">🧾</span><div><div class="summary-label">Total Expense Records</div><strong>${expenseCount}</strong></div></div>
    <div class="summary-item"><span class="summary-icon">💸</span><div><div class="summary-label">Total Transaction Records</div><strong>${transactionCount}</strong></div></div>
    <div class="summary-item"><span class="summary-icon">📅</span><div><div class="summary-label">${currentLabel} Expense</div><strong>₹${monthExpenseTotal.toFixed(2)}</strong></div></div>
    <div class="summary-item"><span class="summary-icon">💰</span><div><div class="summary-label">${currentLabel} Transaction</div><strong>₹${monthTransactionTotal.toFixed(2)}</strong></div></div>
    <div class="summary-item"><span class="summary-icon">📊</span><div><div class="summary-label">${currentLabel} Difference</div><strong>₹${monthDifference.toFixed(2)}</strong></div></div>
    <div class="summary-item"><span class="summary-icon">💵</span><div><div class="summary-label">Overall Difference</div><strong>₹${overallDifference.toFixed(2)}</strong></div></div>
    <div class="summary-item"><span class="summary-icon">🏆</span><div><div class="summary-label">Highest Expense Month</div><strong>${getHighestMonth(expenses).month}</strong></div></div>
    <div class="summary-item"><span class="summary-icon">🥇</span><div><div class="summary-label">Highest Transaction Month</div><strong>${getHighestMonth(transactions).month}</strong></div></div>
  </div>`;
}
async function loadDashboard() {
  const user = await getCurrentUser();
  if (!user) return;
  try {
    expenses = await loadTable('expenses');
    transactions = await loadTable('transactions');
    fillMonthYear('dashMonth', 'dashYear');
    const now = new Date();
    renderDashboard(now.getMonth(), now.getFullYear());
  } catch (error) {
    document.getElementById('dashboardSummary').innerHTML = `<div class="dashboard-error">Error: ${escapeHtml(error.message)}</div>`;
  }
}
function renderDashboard(month, year) {
  createChart('expenseChart', getMonthlyTotals(expenses), '#ef4444');
  createChart('transactionChart', getMonthlyTotals(transactions), '#3b82f6');
  const totals = computeDashboardTotals(month, year);
  if (document.getElementById('dashboardTotalExpense')) document.getElementById('dashboardTotalExpense').textContent = totals.totalExpense.toFixed(2);
  if (document.getElementById('dashboardTotalTransaction')) document.getElementById('dashboardTotalTransaction').textContent = totals.totalTransaction.toFixed(2);
  if (document.getElementById('dashboardMonthExpense')) document.getElementById('dashboardMonthExpense').textContent = totals.monthExpenseTotal.toFixed(2);
  if (document.getElementById('dashboardMonthTransaction')) document.getElementById('dashboardMonthTransaction').textContent = totals.monthTransactionTotal.toFixed(2);
  if (document.getElementById('dashMonthExpenseTitle')) document.getElementById('dashMonthExpenseTitle').textContent = `${monthNames[month]} ${year} Expense`;
  if (document.getElementById('dashMonthTransactionTitle')) document.getElementById('dashMonthTransactionTitle').textContent = `${monthNames[month]} ${year} Transaction`;
  renderDashboardSummary(month, year, totals);
}

/* ================= EVENTS & UTILS ================= */
document.addEventListener('DOMContentLoaded', async () => {
  fillMonthYear('expMonth', 'expYear');
  fillMonthYear('txnMonth', 'txnYear');
  const todayStr = todayISO();
  document.getElementById('expDate').value = todayStr;
  document.getElementById('txnDate').value = todayStr;
  document.getElementById('expDateText').textContent = formatDate(todayStr);
  document.getElementById('txnDateText').textContent = formatDate(todayStr);
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') { await checkRecoverySession(); return; }
    if (event === 'SIGNED_OUT') { expenses = []; transactions = []; currentUserId = null; }
    if (event === 'SIGNED_IN' && session?.user && session.user.id !== currentUserId) {
      currentUserId = session.user.id;
      expenses = [];
      transactions = [];
    }
  });
  await checkAuth();
});
function showBottomMessage(msg, type = 'success') {
  const bar = document.getElementById('bottomMsgBar');
  if (!bar) return;
  bar.textContent = msg;
  bar.className = 'bottom-msg-bar ' + type;
  requestAnimationFrame(() => bar.classList.add('show'));
  setTimeout(() => bar.classList.remove('show'), 4000);
}
function toggleTempShow(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'text') {
    if (passwordTimers[inputId]) clearTimeout(passwordTimers[inputId]);
    input.type = 'password';
    btn.classList.remove('active');
    btn.textContent = '👁';
    return;
  }
  input.type = 'text';
  btn.classList.add('active');
  btn.textContent = '🙈';
  if (passwordTimers[inputId]) clearTimeout(passwordTimers[inputId]);
  passwordTimers[inputId] = setTimeout(() => {
    input.type = 'password';
    btn.classList.remove('active');
    btn.textContent = '👁';
    delete passwordTimers[inputId];
  }, 4000);
}
async function checkRecoverySession() {
  const hash = window.location.hash;
  if (!hash || !hash.includes('type=recovery')) return;
  try {
    let user = null;
    for (let i = 0; i < 8; i++) {
      const { data: { user: u } } = await supabaseClient.auth.getUser();
      if (u) { user = u; break; }
      await new Promise(r => setTimeout(r, 300));
    }
    if (!user) {
      showBottomMessage("Invalid or expired recovery link.", "error");
      showScreen('login');
      history.replaceState(null, '', window.location.pathname);
      return;
    }
    document.getElementById('resetUsername').textContent = user.user_metadata?.username || user.email?.split('@')[0] || 'User';
    document.getElementById('resetEmailShow').textContent = user.email || '-';
    showScreen('resetPassword');
    history.replaceState(null, '', window.location.pathname);
  } catch (err) {
    showBottomMessage("Recovery error: " + err.message, "error");
    showScreen('login');
  }
}

async function handleUpdatePassword() {
  const newPass = document.getElementById('newPassword').value;
  const retype = document.getElementById('retypeNewPassword').value;
  const errorEl = document.getElementById('resetError');
  const btn = document.getElementById('confirmResetBtn');
  errorEl.textContent = '';
  if (newPass !== retype) {
    errorEl.textContent = 'Passwords do not match';
    showBottomMessage("Passwords do not match", "error");
    return;
  }
  if (newPass.length < 6) {
    errorEl.textContent = 'Password must be at least 6 characters';
    showBottomMessage("Password must be at least 6 characters", "error");
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Updating...';
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const { error } = await supabaseClient.auth.updateUser({ password: newPass });
    if (error) throw error;
    document.getElementById('successUsername').textContent = user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';
    await supabaseClient.auth.signOut();
    currentUserId = null;
    showScreen('passwordSuccess');
    document.getElementById('resetForm').reset();
    history.replaceState(null, '', window.location.pathname);
  } catch (err) {
    errorEl.textContent = err.message;
    showBottomMessage(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirm';
  }
}

// PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(() => console.log('PWA registered'))
      .catch(err => console.error(err));
  });
}

/* ================= SMART PARSE ================= */
/* ================= SMART PARSE (FIXED) ================= */
/* ================= SMART PARSE (FINAL FIXED) ================= */
function parseExpenseName(name) {
  if (!name) return { displayName: name || '', qty: 0, unit: '', plate: '' };

  let text = name.trim();
  let plate = '';
  let qty = 0;
  let unit = '';

  // 1. Plate number કાઢો (શરૂઆતના 4 અંક)
  const plateMatch = text.match(/^(\d{4})\s+/);
  if (plateMatch) {
    plate = plateMatch[1];
    text = text.replace(plateMatch[0], '').trim();
  }

  const lower = text.toLowerCase();

  // 2. Quantity + Unit શોધો
  // Bags
  let m = lower.match(/(\d+(?:\.\d+)?)\s*(bag|bags|bage)/i) || 
          lower.match(/(bag|bags|bage)\s*(\d+(?:\.\d+)?)/i);
  if (m) {
    qty = parseFloat(m[1] || m[2]);
    unit = 'Bags';
  }

  // Liter
  if (!qty) {
    m = lower.match(/(\d+(?:\.\d+)?)\s*(liter|litre|ltr|ltrs|liters)/i) || 
        lower.match(/(liter|litre|ltr|ltrs|liters)\s*(\d+(?:\.\d+)?)/i);
    if (m) {
      qty = parseFloat(m[1] || m[2]);
      unit = 'Liter';
    }
  }

  // Kg
  if (!qty) {
    m = lower.match(/(\d+(?:\.\d+)?)\s*(kg|kgs|kilo|kilos)/i) || 
        lower.match(/(kg|kgs|kilo|kilos)\s*(\d+(?:\.\d+)?)/i);
    if (m) {
      qty = parseFloat(m[1] || m[2]);
      unit = 'Kg';
    }
  }

  // ફક્ત નંબર હોય તો (છેલ્લે અથવા વચ્ચે)
  if (!qty) {
    m = lower.match(/(\d+(?:\.\d+)?)/);
    if (m) qty = parseFloat(m[1]);
  }

  // 3. Clean Name બનાવો (બધા નંબર અને unit હટાવીને)
  let cleanName = text
    .replace(/(\d+(?:\.\d+)?)/g, '')                          // બધા નંબર હટાવો
    .replace(/(bag|bags|bage|liter|litre|ltr|ltrs|liters|kg|kgs|kilo|kilos)/gi, '')  // unit હટાવો
    .replace(/\s+/g, ' ')
    .trim();

  // Unit ન હોય તો keyword પરથી નક્કી કરો
  if (qty && !unit) {
    if (/cement/i.test(cleanName) || /cement/i.test(name)) unit = 'Bags';
    else if (/petrol|diesel|fuel/i.test(cleanName) || /petrol|diesel|fuel/i.test(name)) unit = 'Liter';
    else if (/vegetable|veg|fruit|sabzi|bhaji|tomato|onion|potato|alu|pyaj/i.test(cleanName)) unit = 'Kg';
    else unit = 'Qty';
  }

  // 4. Final Display Name (સાફ)
  let displayName = '';

  if (plate) displayName += plate + ' ';

  if (cleanName) {
    displayName += capitalizeFirstLetter(cleanName);
  } else {
    displayName += 'Item';
  }

  if (qty && unit) {
    displayName += ' ' + qty + ' ' + unit;
  }

  return {
    displayName: displayName.trim(),
    qty: qty,
    unit: unit,
    plate: plate
  };
}

/* ================= RENDER EXPENSES (UPDATED) ================= */
/* ================= RENDER EXPENSES (FIXED) ================= */
function renderExpenses() {
  const m = parseInt(document.getElementById('expMonth').value, 10);
  const y = parseInt(document.getElementById('expYear').value, 10);
  const searchInput = document.getElementById('expSearch');
  const search = (searchInput ? searchInput.value : '').trim().toLowerCase();

  let filtered = expenses.filter(e => {
    const p = parseISODate(e.date_iso);
    return p && p.month === m && p.year === y;
  });

  // Search filter
  if (search) {
    filtered = filtered.filter(e => (e.name || '').toLowerCase().includes(search));
  }

  const wrap = document.getElementById('expenseTableWrap');
  const totalBox = document.querySelector('#expenseScreen .total-box');

  if (filtered.length === 0) {
    wrap.innerHTML = `<div class="empty-note">${search ? 'No matching records found.' : 'No expense recorded for this month.'}</div>`;
    if (totalBox) totalBox.innerHTML = `Total Expense : ₹0.00`;
    return;
  }

  let totalAmount = 0;
  let totalQty = 0;
  let mainUnit = '';
  let isCement = false, isPetrol = false, isVeg = false;

  const rows = filtered.map(e => {
    const parsed = parseExpenseName(e.name);
    totalAmount += Number(e.amount) || 0;

    if (parsed.qty > 0) {
      totalQty += parsed.qty;
      if (!mainUnit) mainUnit = parsed.unit;
    }

    if (/cement/i.test(e.name)) isCement = true;
    if (/petrol|diesel/i.test(e.name)) isPetrol = true;
    if (/vegetable|veg|fruit|sabzi|bhaji/i.test(e.name)) isVeg = true;

    return `<tr>
      <td class="col-date">${formatDate(e.date_iso)}</td>
      <td class="col-name">${escapeHtml(parsed.displayName || e.name)}</td>
      <td class="col-amount">₹${Number(e.amount).toFixed(2)}</td>
      <td class="col-action">
        <div class="action-btns">
          <button class="edit-btn" onclick="editExpense('${jsAttr(e.id)}')">Edit</button>
          <button class="del-btn" onclick="deleteExpense('${jsAttr(e.id)}')">Delete</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  wrap.innerHTML = `<table class="entries">
    <thead>
      <tr>
        <th class="col-date">Date</th>
        <th class="col-name">Name</th>
        <th class="col-amount">Amount (₹)</th>
        <th class="col-action">Action</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;

  // Smart Total
  let totalHTML = `Total Expense : ₹${totalAmount.toFixed(2)}`;

  if (totalQty > 0 && mainUnit) {
    if (isCement) {
      totalHTML = `Total Cement : <b>${totalQty} Bags</b> | ₹${totalAmount.toFixed(2)}`;
    } else if (isPetrol) {
      totalHTML = `Total Petrol : <b>${totalQty} Liter</b> | ₹${totalAmount.toFixed(2)}`;
    } else if (isVeg) {
      totalHTML = `Total : <b>${totalQty} Kg</b> | ₹${totalAmount.toFixed(2)}`;
    } else {
      totalHTML = `Total Qty : <b>${totalQty} ${mainUnit}</b> | ₹${totalAmount.toFixed(2)}`;
    }
  }

  if (totalBox) {
    totalBox.innerHTML = totalHTML;
  }

  scrollTableToBottom('expenseTableWrap');
}
