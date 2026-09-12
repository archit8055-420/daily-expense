const SUPABASE_URL = "https://fdddjqakdobjqgimnsdv.supabase.co";
const SUPABASE_KEY = "sb_publishable_Z2wSJeLTjgG-pkjjTzLmkQ_q19eQw12";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let expenses = [];
let transactions = [];
let editExpenseId = null;
let editTransactionId = null;
let profileDashboardBackScreen = null;
let pendingDeleteType = null;
let pendingDeleteId = null;
let passwordTimers = {}; // timer store karva
let isSendingReset = false;
let lastResetSentAt = localStorage.getItem('lastResetSentAt') || 0;

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/* =========================================================
   SCREEN NAVIGATION
========================================================= */

function showScreen(name) {
  const screens = [
    'loginScreen', 'signupScreen', 'resetPasswordScreen', 'passwordSuccessScreen',
    'homeScreen', 'expenseScreen', 'transactionScreen',
    'profileScreen', 'dashboardScreen'
  ];

  screens.forEach(id => {
    const screen = document.getElementById(id);
    if (screen) screen.classList.remove('active');
  });

  const targetScreen = document.getElementById(name + 'Screen');
  if (targetScreen) {
    targetScreen.classList.add('active');
  }

  document.querySelectorAll('.user-menu').forEach(menu => {
    menu.classList.remove('active');
  });
}

/* =========================================================
   USER MENU
========================================================= */

function toggleUserMenu(menuId) {
  const menu = document.getElementById(menuId);
  if (!menu) {
    console.error("User menu not found:", menuId);
    return;
  }

  document.querySelectorAll('.user-menu').forEach(otherMenu => {
    if (otherMenu !== menu) otherMenu.classList.remove('active');
  });

  menu.classList.toggle('active');
}

/* =========================================================
   PROFILE / DASHBOARD
========================================================= */

async function openProfile(fromScreen) {
  if (fromScreen !== 'expense' && fromScreen !== 'transaction') {
    console.error("Invalid profile source:", fromScreen);
    return;
  }

  profileDashboardBackScreen = fromScreen;

  document.querySelectorAll('.user-menu').forEach(menu => {
    menu.classList.remove('active');
  });

  const { data, error } = await supabaseClient.auth.getUser();
  if (error) console.error("Profile User Error:", error);
  if (data?.user) updateProfileDisplay(data.user);

  showScreen('profile');
}

async function openDashboard(fromScreen) {
  if (fromScreen !== 'expense' && fromScreen !== 'transaction') {
    console.error("Invalid dashboard source:", fromScreen);
    return;
  }

  profileDashboardBackScreen = fromScreen;
  showScreen('dashboard');
  await loadDashboard();
}

function goBack() {
  if (profileDashboardBackScreen === 'expense') {
    profileDashboardBackScreen = null;
    showScreen('expense');
    return;
  }

  if (profileDashboardBackScreen === 'transaction') {
    profileDashboardBackScreen = null;
    showScreen('transaction');
    return;
  }

  console.warn("Back source not found.");
}

/* =========================================================
   HELPERS
========================================================= */

function scrollTableToBottom(tableId) {
  const wrap = document.getElementById(tableId);
  if (!wrap) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      wrap.scrollTop = wrap.scrollHeight;
      setTimeout(() => {
        wrap.scrollTop = wrap.scrollHeight;
      }, 100);
    });
  });
}

function updateProfileDisplay(user) {
  const username =
    user?.user_metadata?.username ||
    user?.email?.split('@')[0] ||
    'User';

  const usernameEl = document.getElementById('profileUsername');
  const emailEl = document.getElementById('profileEmail');

  if (usernameEl) usernameEl.textContent = username;
  if (emailEl) emailEl.textContent = user?.email || '-';
}

function updateUsernameDisplay(user) {
  const username =
    user?.user_metadata?.username ||
    user?.email?.split('@')[0] ||
    'User';

  const homeUsername = document.getElementById('homeUsername');
  if (homeUsername) homeUsername.textContent = username;

  document.querySelectorAll('.screenUsername').forEach(el => {
    el.textContent = username;
  });

  updateProfileDisplay(user);
}

function capitalizeFirstLetter(value) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function capitalizeFirst(input) {
  if (input.value.length === 1) {
    input.value = input.value.toUpperCase();
  }
}

function fillMonthYear(monthSelId, yearSelId) {
  const monthSel = document.getElementById(monthSelId);
  const yearSel = document.getElementById(yearSelId);

  monthNames.forEach((m, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = m;
    monthSel.appendChild(opt);
  });

  for (let y = 2000; y <= 2099; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearSel.appendChild(opt);
  }

  const now = new Date();
  monthSel.value = now.getMonth();
  yearSel.value = now.getFullYear();
}

function todayISO() {
  const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  return formatter.format(new Date());
}

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso + 'T00:00:00');
  const day = String(d.getDate()).padStart(2, '0');
  const mon = monthNames[d.getMonth()].slice(0, 3);
  return `${day}-${mon}-${d.getFullYear()}`;
}

function updateDateDisplay(inputId, textId) {
  const val = document.getElementById(inputId).value;
  if (!val) return;
  document.getElementById(textId).textContent = formatDate(val);
}

function openDatePicker(inputId) {
  const el = document.getElementById(inputId);
  if (el && typeof el.showPicker === 'function') {
    el.showPicker();
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function calculateDaysDiff(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return '-';
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');
  const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
  return `${diffDays} Days`;
}

/* =========================================================
   AUTH HELPERS
========================================================= */

async function getCurrentUser() {
  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error) {
    console.error("Get User Error:", error);
    return null;
  }
  return user;
}

/* =========================================================
   EXPENSE FUNCTIONS
========================================================= */

async function loadExpenses() {
  const user = await getCurrentUser();
  if (!user) {
    expenses = [];
    renderExpenses();
    return;
  }

  const { data, error } = await supabaseClient
    .from('expenses')
    .select('*')
    .eq('user_id', user.id)
    .order('date_iso', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    console.error("Expense Load Error:", error);
    alert("Expense data load error: " + error.message);
    return;
  }

  expenses = data || [];
  renderExpenses();
}

async function addOrUpdateExpense() {
  const user = await getCurrentUser();
  if (!user) throw new Error("User is not logged in");

  const nameInput = document.getElementById('expName');
  const amtInput = document.getElementById('expAmount');

  if (!nameInput.checkValidity()) {
    nameInput.reportValidity();
    return;
  }
  if (!amtInput.checkValidity()) {
    amtInput.reportValidity();
    return;
  }

  const name = capitalizeFirstLetter(nameInput.value);
  const amount = parseFloat(amtInput.value);
  const date = document.getElementById('expDate').value || todayISO();
  const btn = document.getElementById('expDoneBtn');

  btn.disabled = true;
  btn.textContent = editExpenseId ? 'Updating...' : 'Saving...';

  try {
    if (editExpenseId !== null) {
      const { error } = await supabaseClient
        .from('expenses')
        .update({ name, amount, date_iso: date })
        .eq('id', editExpenseId)
        .eq('user_id', user.id);

      if (error) throw error;
      editExpenseId = null;
    } else {
      const { error } = await supabaseClient
        .from('expenses')
        .insert({ name, amount, date_iso: date, user_id: user.id });

      if (error) throw error;
    }

    nameInput.value = '';
    amtInput.value = '';
    await loadExpenses();

    setTimeout(() => nameInput.focus(), 150);
  } catch (err) {
    console.error(err);
    alert((editExpenseId ? "Update" : "Save") + " error: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Done';
  }
}

function editExpense(id) {
  const item = expenses.find(e => e.id === id);
  if (!item) return;

  document.getElementById('expName').value = item.name;
  document.getElementById('expAmount').value = item.amount;
  document.getElementById('expDate').value = item.date_iso;
  updateDateDisplay('expDate', 'expDateText');

  editExpenseId = id;
  document.getElementById('expDoneBtn').textContent = 'Update';
}

function deleteExpense(id) {
  openDeleteDialog('expense', id);
}

async function performDeleteExpense(id) {
  const user = await getCurrentUser();
  if (!user) {
    alert("User is not logged in");
    return;
  }

  const { error } = await supabaseClient
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error("Expense Delete Error:", error);
    alert("Expense delete error: " + error.message);
    return;
  }

  if (editExpenseId === id) {
    editExpenseId = null;
    const btn = document.getElementById('expDoneBtn');
    if (btn) btn.textContent = 'Done';
  }

  await loadExpenses();
}

function renderExpenses() {
  const m = parseInt(document.getElementById('expMonth').value);
  const y = parseInt(document.getElementById('expYear').value);

  const filtered = expenses.filter(e => {
    const d = new Date(e.date_iso + 'T00:00:00');
    return d.getMonth() === m && d.getFullYear() === y;
  });

  const wrap = document.getElementById('expenseTableWrap');

  if (filtered.length === 0) {
    wrap.innerHTML = '<div class="empty-note">No expense recorded for this month.</div>';
  } else {
    let html = `
      <table class="entries">
        <thead>
          <tr>
            <th class="col-date">Date</th>
            <th class="col-name">Name</th>
            <th class="col-amount">Amount (₹)</th>
            <th class="col-action">Action</th>
          </tr>
        </thead>
        <tbody>
    `;

    filtered.forEach(e => {
      html += `
        <tr>
          <td class="col-date">${formatDate(e.date_iso)}</td>
          <td class="col-name">${escapeHtml(e.name)}</td>
          <td class="col-amount">₹${Number(e.amount).toFixed(2)}</td>
          <td class="col-action">
            <div class="action-btns">
              <button class="edit-btn" onclick="editExpense(${e.id})">Edit</button>
              <button class="del-btn" onclick="deleteExpense(${e.id})">Delete</button>
            </div>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    wrap.innerHTML = html;
  }

  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);
  document.getElementById('expTotal').textContent = total.toFixed(2);
  scrollTableToBottom('expenseTableWrap');
}

/* =========================================================
   TRANSACTION FUNCTIONS
========================================================= */

async function loadTransactions() {
  const user = await getCurrentUser();
  if (!user) {
    transactions = [];
    renderTransactions();
    return;
  }

  const { data, error } = await supabaseClient
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('date_iso', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    console.error("Transaction Load Error:", error);
    alert("Transaction data load error: " + error.message);
    return;
  }

  transactions = data || [];
  renderTransactions();
}

async function addOrUpdateTransaction() {
  const user = await getCurrentUser();
  if (!user) throw new Error("User is not logged in");

  const fromInput = document.getElementById('txnFrom');
  const toInput = document.getElementById('txnTo');
  const amtInput = document.getElementById('txnAmount');

  if (!fromInput.checkValidity()) { fromInput.reportValidity(); return; }
  if (!toInput.checkValidity()) { toInput.reportValidity(); return; }
  if (!amtInput.checkValidity()) { amtInput.reportValidity(); return; }

  const from = capitalizeFirstLetter(fromInput.value);
  const to = capitalizeFirstLetter(toInput.value);
  const amount = parseFloat(amtInput.value);
  const date = document.getElementById('txnDate').value || todayISO();
  const btn = document.getElementById('txnDoneBtn');

  btn.disabled = true;
  btn.textContent = editTransactionId ? 'Updating...' : 'Saving...';

  try {
    if (editTransactionId !== null) {
      const { error } = await supabaseClient
        .from('transactions')
        .update({
          payer: from,
          receiver: to,
          amount,
          date_iso: date
        })
        .eq('id', editTransactionId)
        .eq('user_id', user.id);

      if (error) throw error;
      editTransactionId = null;
    } else {
      const { error } = await supabaseClient
        .from('transactions')
        .insert({
          payer: from,
          receiver: to,
          amount,
          date_iso: date,
          is_received: false,
          received_date_iso: null,
          user_id: user.id
        });

      if (error) throw error;
    }

    fromInput.value = '';
    toInput.value = '';
    amtInput.value = '';
    await loadTransactions();

    setTimeout(() => fromInput.focus(), 150);
  } catch (err) {
    console.error(err);
    alert((editTransactionId ? "Update" : "Save") + " error: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Done';
  }
}

function editTransaction(id) {
  const item = transactions.find(t => t.id === id);
  if (!item) return;

  document.getElementById('txnFrom').value = item.payer;
  document.getElementById('txnTo').value = item.receiver;
  document.getElementById('txnAmount').value = item.amount;
  document.getElementById('txnDate').value = item.date_iso;
  updateDateDisplay('txnDate', 'txnDateText');

  editTransactionId = id;
  document.getElementById('txnDoneBtn').textContent = 'Update';
}

function deleteTransaction(id) {
  openDeleteDialog('transaction', id);
}

async function performDeleteTransaction(id) {
  const user = await getCurrentUser();
  if (!user) {
    alert("User is not logged in");
    return;
  }

  const { error } = await supabaseClient
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error("Transaction Delete Error:", error);
    alert("Transaction delete error: " + error.message);
    return;
  }

  if (editTransactionId === id) {
    editTransactionId = null;
    const btn = document.getElementById('txnDoneBtn');
    if (btn) btn.textContent = 'Done';
  }

  await loadTransactions();
}

async function toggleReceived(id, isChecked) {
  const user = await getCurrentUser();
  if (!user) {
    alert("User is not logged in");
    return;
  }

  const receivedDate = isChecked ? todayISO() : null;

  const { error } = await supabaseClient
    .from('transactions')
    .update({
      is_received: isChecked,
      received_date_iso: receivedDate
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error("Received Update Error:", error);
    alert("Received status update error: " + error.message);
    return;
  }

  await loadTransactions();
}

function renderTransactions() {
  const m = parseInt(document.getElementById('txnMonth').value);
  const y = parseInt(document.getElementById('txnYear').value);

  const filtered = transactions.filter(t => {
    const d = new Date(t.date_iso + 'T00:00:00');
    return d.getMonth() === m && d.getFullYear() === y;
  });

  const wrap = document.getElementById('transactionTableWrap');

  if (filtered.length === 0) {
    wrap.innerHTML = '<div class="empty-note">No transactions recorded for this month.</div>';
  } else {
    let html = `
      <table class="entries">
        <thead>
          <tr>
            <th class="col-date">Tarikh</th>
            <th class="col-txn-tofrom">Payer</th>
            <th class="col-txn-tofrom">Receiver</th>
            <th class="col-txn-amt">Paisa</th>
            <th class="col-date">Received (✓)</th>
            <th class="col-date">Chukavya Tarikh</th>
            <th class="col-date">Ketla Samay Pachhi</th>
            <th class="col-action">Action</th>
          </tr>
        </thead>
        <tbody>
    `;

    filtered.forEach(t => {
      const chukavyaDate = t.received_date_iso ? formatDate(t.received_date_iso) : '-';
      const timeDiff = calculateDaysDiff(t.date_iso, t.received_date_iso);

      html += `
        <tr>
          <td class="col-date">${formatDate(t.date_iso)}</td>
          <td class="col-txn-tofrom">${escapeHtml(t.payer)}</td>
          <td class="col-txn-tofrom">${escapeHtml(t.receiver)}</td>
          <td class="col-txn-amt">₹${Number(t.amount).toFixed(2)}</td>
          <td class="col-date">
            <input type="checkbox" class="custom-checkbox"
              ${t.is_received ? 'checked' : ''}
              onchange="toggleReceived(${t.id}, this.checked)">
          </td>
          <td class="col-date">${chukavyaDate}</td>
          <td class="col-date">${timeDiff}</td>
          <td class="col-action">
            <div class="action-btns">
              <button class="edit-btn" onclick="editTransaction(${t.id})">Edit</button>
              <button class="del-btn" onclick="deleteTransaction(${t.id})">Delete</button>
            </div>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    wrap.innerHTML = html;
  }

  const total = filtered.reduce((s, t) => s + Number(t.amount), 0);
  document.getElementById('txnTotal').textContent = total.toFixed(2);
  scrollTableToBottom('transactionTableWrap');
}

/* =========================================================
   DELETE DIALOG
========================================================= */

function openDeleteDialog(type, id) {
  pendingDeleteType = type;
  pendingDeleteId = id;

  const dialog = document.getElementById('deleteDialog');
  if (dialog) {
    dialog.classList.add('active');
    setTimeout(() => {
      const deleteBtn = document.querySelector('.confirm-delete-btn');
      if (deleteBtn) deleteBtn.focus();
    }, 50);
  }
}

function closeDeleteDialog() {
  pendingDeleteType = null;
  pendingDeleteId = null;

  const dialog = document.getElementById('deleteDialog');
  if (dialog) dialog.classList.remove('active');
}

async function confirmDelete() {
  if (!pendingDeleteType || pendingDeleteId === null) {
    closeDeleteDialog();
    return;
  }

  const type = pendingDeleteType;
  const id = pendingDeleteId;
  closeDeleteDialog();

  if (type === 'expense') await performDeleteExpense(id);
  if (type === 'transaction') await performDeleteTransaction(id);
}


/* =========================================================
   DELETE ACCOUNT
========================================================= */

function openDeleteAccountDialog() {
  const dialog = document.getElementById('deleteAccountDialog');
  if (dialog) {
    dialog.classList.add('active');

    setTimeout(() => {
      const deleteBtn = dialog.querySelector('.confirm-delete-btn');
      if (deleteBtn) deleteBtn.focus();
    }, 50);
  }
}

function closeDeleteAccountDialog() {
  const dialog = document.getElementById('deleteAccountDialog');
  if (dialog) {
    dialog.classList.remove('active');
  }
}

async function confirmDeleteAccount() {
  const user = await getCurrentUser();
  if (!user) {
    showBottomMessage("User is not logged in", "error");
    closeDeleteAccountDialog();
    return;
  }

  const dialog = document.getElementById('deleteAccountDialog');
  const deleteBtn = dialog.querySelector('.confirm-delete-btn');

  if (deleteBtn) {
    deleteBtn.disabled = true;
    deleteBtn.textContent = 'Deleting...';
  }

  try {
    const { error: rpcError } = await supabaseClient.rpc('delete_own_account');
    if (rpcError) throw rpcError;

    expenses = [];
    transactions = [];
    await supabaseClient.auth.signOut();
    
    closeDeleteAccountDialog();
    showScreen('login');

    // POPUP KADHI NAKHYU, PATTI MA MESSAGE
    showBottomMessage("Account and all data permanently deleted. New account required.", "success");

    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';

  } catch (err) {
    console.error(err);
    // POPUP KADHI NAKHYU, PATTI MA ERROR
    showBottomMessage("Failed: " + err.message, "error");
    if (deleteBtn) {
      deleteBtn.disabled = false;
      deleteBtn.textContent = 'Delete';
    }
  }
}

/* =========================================================
   PDF DOWNLOADS
========================================================= */

function downloadExpensePDF() {
  const m = parseInt(document.getElementById('expMonth').value);
  const y = parseInt(document.getElementById('expYear').value);

  const filtered = expenses.filter(e => {
    const d = new Date(e.date_iso + 'T00:00:00');
    return d.getMonth() === m && d.getFullYear() === y;
  });

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(`Daily Expense Report - ${monthNames[m]} ${y}`, 14, 18);

  doc.setFontSize(11);
  let yPos = 30;

  doc.text('Date', 14, yPos);
  doc.text('Name', 60, yPos);
  doc.text('Amount (Rs)', 140, yPos);
  yPos += 6;
  doc.line(14, yPos, 196, yPos);
  yPos += 8;

  let total = 0;
  filtered.forEach(e => {
    if (yPos > 280) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(formatDate(e.date_iso), 14, yPos);
    doc.text(String(e.name), 60, yPos);
    doc.text(Number(e.amount).toFixed(2), 140, yPos);
    total += Number(e.amount);
    yPos += 8;
  });

  yPos += 6;
  doc.setFontSize(13);
  doc.text(`Total Expense: Rs ${total.toFixed(2)}`, 14, yPos);
  doc.save(`Daily_Expense_${monthNames[m]}_${y}.pdf`);
}

function downloadTransactionPDF() {
  const m = parseInt(document.getElementById('txnMonth').value);
  const y = parseInt(document.getElementById('txnYear').value);

  const filtered = transactions.filter(t => {
    const d = new Date(t.date_iso + 'T00:00:00');
    return d.getMonth() === m && d.getFullYear() === y;
  });

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(`Money Transaction Report - ${monthNames[m]} ${y}`, 14, 18);

  doc.setFontSize(11);
  let yPos = 30;

  doc.text('Tarikh', 14, yPos);
  doc.text('Payer', 45, yPos);
  doc.text('Receiver', 80, yPos);
  doc.text('Paisa (Rs)', 115, yPos);
  doc.text('Received', 150, yPos);
  yPos += 6;
  doc.line(14, yPos, 196, yPos);
  yPos += 8;

  let total = 0;
  filtered.forEach(t => {
    if (yPos > 280) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(formatDate(t.date_iso), 14, yPos);
    doc.text(String(t.payer), 45, yPos);
    doc.text(String(t.receiver), 80, yPos);
    doc.text(Number(t.amount).toFixed(2), 115, yPos);
    doc.text(t.is_received ? 'Yes' : 'No', 150, yPos);
    total += Number(t.amount);
    yPos += 8;
  });

  yPos += 6;
  doc.setFontSize(13);
  doc.text(`Total: Rs ${total.toFixed(2)}`, 14, yPos);
  doc.save(`Money_Transaction_${monthNames[m]}_${y}.pdf`);
}

/* =========================================================
   AUTHENTICATION
========================================================= */

async function checkAuth() {
  // પહેલા recovery check કરો
  const hash = window.location.hash;
  if (hash && (hash.includes('type=recovery') || hash.includes('type=invite'))) {
    await checkRecoverySession();
    return; // Home પર જવાનું નથી
  }

  const { data: { session } } = await supabaseClient.auth.getSession();

  if (session) {
    updateUsernameDisplay(session.user);
    showScreen('home');
    loadExpenses();
    loadTransactions();
  } else {
    showScreen('login');
  }
}

async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');
  const errorEl = document.getElementById('loginError');

  errorEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Logging in...';

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    updateUsernameDisplay(data.user);
    showScreen('home');
    loadExpenses();
    loadTransactions();
  } catch (err) {
    errorEl.textContent = err.message || 'Login failed';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Login';
  }
}

async function handleSignup() {
  const email = document.getElementById('signupEmail').value.trim();
  const username = document.getElementById('signupUsername').value.trim();
  const password = document.getElementById('signupPassword').value;
  const retype = document.getElementById('signupRetype').value;
  const btn = document.getElementById('signupBtn');
  const errorEl = document.getElementById('signupError');

  errorEl.textContent = '';

  if (password !== retype) {
    errorEl.textContent = 'Passwords do not match';
    return;
  }

  if (password.length < 6) {
    errorEl.textContent = 'Password must be at least 6 characters';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Creating account...';

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { username }
      }
    });

    if (error) throw error;

    alert('Account created successfully!');
    document.getElementById('signupForm').reset();
    showScreen('login');
  } catch (err) {
    errorEl.textContent = err.message || 'Signup failed';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign Up';
  }
}

async function handleForgotPassword() {
  const emailInput = document.getElementById('loginEmail');
  const email = emailInput.value.trim();
  const forgotBtn = document.getElementById('forgotBtn');
  const errorEl = document.getElementById('loginError');

  if (!email) {
    errorEl.textContent = 'Please enter your email first';
    showBottomMessage("Please enter email first", "error");
    return;
  }

  if (isSendingReset) {
    showBottomMessage("Reset link already sending, please wait...", "error");
    return;
  }

  const now = Date.now();
  if (now - lastResetSentAt < 60000) {
    const waitSec = Math.ceil((60000 - (now - lastResetSentAt)) / 1000);
    showBottomMessage(`Please wait ${waitSec}s before next reset mail`, "error");
    return;
  }

  isSendingReset = true;
  forgotBtn.disabled = true;
  forgotBtn.textContent = 'Sending...';
  errorEl.textContent = '';

  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    if (error) throw error;

    lastResetSentAt = Date.now();
    localStorage.setItem('lastResetSentAt', lastResetSentAt);

    showBottomMessage(`Reset link sent to ${email}. Check your mail.`, "success");
  } catch (err) {
    errorEl.textContent = err.message;
    showBottomMessage(err.message, "error");
  } finally {
    isSendingReset = false;
    forgotBtn.disabled = false;
    forgotBtn.textContent = 'Forgot Password?';
  }
}

async function handleLogout() {
  await supabaseClient.auth.signOut();
  showScreen('login');
  expenses = [];
  transactions = [];
}

/* =========================================================
   DASHBOARD - FILTER + CARDS
========================================================= */

function fillDashboardMonthYear() {
  const monthSel = document.getElementById('dashMonth');
  const yearSel = document.getElementById('dashYear');

  if (!monthSel || !yearSel) return;

  monthSel.innerHTML = '';
  yearSel.innerHTML = '';

  monthNames.forEach((m, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = m;
    monthSel.appendChild(opt);
  });

  for (let y = 2000; y <= 2099; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearSel.appendChild(opt);
  }

  const now = new Date();
  monthSel.value = now.getMonth();
  yearSel.value = now.getFullYear();
}

function applyDashboardFilter() {
  const month = parseInt(document.getElementById('dashMonth').value);
  const year = parseInt(document.getElementById('dashYear').value);
  renderDashboardCards(month, year);
}

function renderDashboardCards(selectedMonth = null, selectedYear = null) {
  const now = new Date();
  const month = selectedMonth !== null ? selectedMonth : now.getMonth();
  const year = selectedYear !== null ? selectedYear : now.getFullYear();

  const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalTransaction = transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const filteredExpenses = expenses.filter(item => {
    if (!item.date_iso) return false;
    const d = new Date(item.date_iso + 'T00:00:00');
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const filteredTransactions = transactions.filter(item => {
    if (!item.date_iso) return false;
    const d = new Date(item.date_iso + 'T00:00:00');
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const monthExpenseTotal = filteredExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const monthTransactionTotal = filteredTransactions.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalExpenseEl = document.getElementById('dashboardTotalExpense');
  const totalTransactionEl = document.getElementById('dashboardTotalTransaction');
  const monthExpenseEl = document.getElementById('dashboardMonthExpense');
  const monthTransactionEl = document.getElementById('dashboardMonthTransaction');

  if (totalExpenseEl) totalExpenseEl.textContent = totalExpense.toFixed(2);
  if (totalTransactionEl) totalTransactionEl.textContent = totalTransaction.toFixed(2);
  if (monthExpenseEl) monthExpenseEl.textContent = monthExpenseTotal.toFixed(2);
  if (monthTransactionEl) monthTransactionEl.textContent = monthTransactionTotal.toFixed(2);

  const monthName = monthNames[month];
  const titleText = `${monthName} ${year}`;

  const expenseTitleEl = document.getElementById('dashMonthExpenseTitle');
  const transactionTitleEl = document.getElementById('dashMonthTransactionTitle');

  if (expenseTitleEl) expenseTitleEl.textContent = `${titleText} Expense`;
  if (transactionTitleEl) transactionTitleEl.textContent = `${titleText} Transaction`;
}

/* =========================================================
   DASHBOARD - LOAD + RENDER
========================================================= */

async function loadDashboard() {
  const user = await getCurrentUser();
  if (!user) return;

  try {
    const { data: expenseData, error: expenseError } = await supabaseClient
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('date_iso', { ascending: true });

    if (expenseError) throw expenseError;

    const { data: transactionData, error: transactionError } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date_iso', { ascending: true });

    if (transactionError) throw transactionError;

    expenses = expenseData || [];
    transactions = transactionData || [];

    fillDashboardMonthYear();
    renderDashboard();

  } catch (error) {
    console.error("Dashboard Load Error:", error);
    const summary = document.getElementById('dashboardSummary');
    if (summary) {
      summary.innerHTML = `
        <div class="dashboard-error">
          Dashboard data load error: ${escapeHtml(error.message || 'Unknown error')}
        </div>
      `;
    }
  }
}

function renderDashboard() {
  const now = new Date();
  renderDashboardCards(now.getMonth(), now.getFullYear());

  renderExpenseChart();
  renderTransactionChart();

  const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalTransaction = transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const currentMonthExpenses = expenses.filter(item => {
    if (!item.date_iso) return false;
    const d = new Date(item.date_iso + 'T00:00:00');
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const currentMonthTransactions = transactions.filter(item => {
    if (!item.date_iso) return false;
    const d = new Date(item.date_iso + 'T00:00:00');
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const monthExpenseTotal = currentMonthExpenses.reduce((s, i) => s + Number(i.amount || 0), 0);
  const monthTransactionTotal = currentMonthTransactions.reduce((s, i) => s + Number(i.amount || 0), 0);

  renderDashboardSummary(totalExpense, totalTransaction, monthExpenseTotal, monthTransactionTotal);
}

/* =========================================================
   DASHBOARD - CHARTS
========================================================= */

function getMonthlyTotals(data) {
  const totals = new Array(12).fill(0);
  data.forEach(item => {
    if (!item.date_iso) return;
    const date = new Date(item.date_iso + 'T00:00:00');
    totals[date.getMonth()] += Number(item.amount || 0);
  });
  return totals;
}

function createChart(containerId, values, color = '#3b82f6') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const maxValue = Math.max(...values, 1);
  let html = `<div class="dashboard-chart">`;

  values.forEach((value, index) => {
    const percentage = value > 0 ? Math.max((value / maxValue) * 100, 3) : 0;
    html += `
      <div class="chart-row">
        <div class="chart-month">${monthNames[index].slice(0, 3)}</div>
        <div class="chart-bar-area">
          <div class="chart-bar" style="width:${percentage}%; background:${color};"></div>
        </div>
        <div class="chart-value">
          ₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}

function renderExpenseChart() {
  createChart('expenseChart', getMonthlyTotals(expenses), '#ef4444');
}

function renderTransactionChart() {
  createChart('transactionChart', getMonthlyTotals(transactions), '#3b82f6');
}

function getHighestMonth(data) {
  const totals = getMonthlyTotals(data);
  const max = Math.max(...totals);

  if (max <= 0) return { month: '-', amount: 0 };

  const index = totals.indexOf(max);
  return { month: monthNames[index], amount: max };
}

function getPreviousMonthData(data) {
  const now = new Date();
  let month = now.getMonth() - 1;
  let year = now.getFullYear();

  if (month < 0) {
    month = 11;
    year--;
  }

  return data.filter(item => {
    if (!item.date_iso) return false;
    const date = new Date(item.date_iso + 'T00:00:00');
    return date.getMonth() === month && date.getFullYear() === year;
  });
}

/* =========================================================
   DASHBOARD - SUMMARY (FULL FIXED)
========================================================= */

function renderDashboardSummary(totalExpense, totalTransaction, monthExpense, monthTransaction) {
  const el = document.getElementById('dashboardSummary');
  if (!el) return;

  const now = new Date();
  const currentMonthName = monthNames[now.getMonth()];
  const currentYear = now.getFullYear();
  const currentLabel = `${currentMonthName} ${currentYear}`;

  const expenseCount = expenses.length;
  const transactionCount = transactions.length;

  const previousExpenses = getPreviousMonthData(expenses);
  const previousTransactions = getPreviousMonthData(transactions);

  const previousExpenseTotal = previousExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const previousTransactionTotal = previousTransactions.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const overallDifference = totalTransaction - totalExpense;
  const monthDifference = monthTransaction - monthExpense;

  let expenseChange = 0;
  if (previousExpenseTotal > 0) {
    expenseChange = ((monthExpense - previousExpenseTotal) / previousExpenseTotal) * 100;
  }

  let transactionChange = 0;
  if (previousTransactionTotal > 0) {
    transactionChange = ((monthTransaction - previousTransactionTotal) / previousTransactionTotal) * 100;
  }

  const highestExpenseMonth = getHighestMonth(expenses);
  const highestTransactionMonth = getHighestMonth(transactions);

  const expenseChangeClass = expenseChange > 0 ? 'negative' : expenseChange < 0 ? 'positive' : 'neutral';
  const transactionChangeClass = transactionChange > 0 ? 'positive' : transactionChange < 0 ? 'negative' : 'neutral';

  el.innerHTML = `
    <div class="summary-grid">

      <div class="summary-item">
        <span class="summary-icon">🧾</span>
        <div>
          <div class="summary-label">Total Expense Records</div>
          <strong>${expenseCount}</strong>
        </div>
      </div>

      <div class="summary-item">
        <span class="summary-icon">💸</span>
        <div>
          <div class="summary-label">Total Transaction Records</div>
          <strong>${transactionCount}</strong>
        </div>
      </div>

      <div class="summary-item">
        <span class="summary-icon">📅</span>
        <div>
          <div class="summary-label">${currentLabel} Expense</div>
          <strong>₹${monthExpense.toFixed(2)}</strong>
        </div>
      </div>

      <div class="summary-item">
        <span class="summary-icon">💰</span>
        <div>
          <div class="summary-label">${currentLabel} Transaction</div>
          <strong>₹${monthTransaction.toFixed(2)}</strong>
        </div>
      </div>

      <div class="summary-item">
        <span class="summary-icon">📊</span>
        <div>
          <div class="summary-label">${currentLabel} Difference</div>
          <strong class="${monthDifference >= 0 ? 'positive-text' : 'negative-text'}">
            ₹${monthDifference.toFixed(2)}
          </strong>
        </div>
      </div>

      <div class="summary-item">
        <span class="summary-icon">💵</span>
        <div>
          <div class="summary-label">Overall Difference</div>
          <strong class="${overallDifference >= 0 ? 'positive-text' : 'negative-text'}">
            ₹${overallDifference.toFixed(2)}
          </strong>
        </div>
      </div>

      <div class="summary-item">
        <span class="summary-icon">🏆</span>
        <div>
          <div class="summary-label">Highest Expense Month</div>
          <strong>${highestExpenseMonth.month} — ₹${highestExpenseMonth.amount.toFixed(2)}</strong>
        </div>
      </div>

      <div class="summary-item">
        <span class="summary-icon">🥇</span>
        <div>
          <div class="summary-label">Highest Transaction Month</div>
          <strong>${highestTransactionMonth.month} — ₹${highestTransactionMonth.amount.toFixed(2)}</strong>
        </div>
      </div>

      <div class="summary-item ${expenseChangeClass}">
        <span class="summary-icon">📈</span>
        <div>
          <div class="summary-label">Expense vs Previous Month</div>
          <strong>${expenseChange > 0 ? '+' : ''}${expenseChange.toFixed(1)}%</strong>
        </div>
      </div>

      <div class="summary-item ${transactionChangeClass}">
        <span class="summary-icon">📉</span>
        <div>
          <div class="summary-label">Transaction vs Previous Month</div>
          <strong>${transactionChange > 0 ? '+' : ''}${transactionChange.toFixed(1)}%</strong>
        </div>
      </div>

    </div>
  `;
}

async function refreshDashboardIfOpen() {
  const dashboard = document.getElementById('dashboardScreen');
  if (dashboard && dashboard.classList.contains('active')) {
    await loadDashboard();
  }
}

/* =========================================================
   EVENT LISTENERS
========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  fillMonthYear('expMonth', 'expYear');
  fillMonthYear('txnMonth', 'txnYear');

  const todayStr = todayISO();
  document.getElementById('expDate').value = todayStr;
  document.getElementById('txnDate').value = todayStr;
  document.getElementById('expDateText').textContent = formatDate(todayStr);
  document.getElementById('txnDateText').textContent = formatDate(todayStr);

  // Auth state change listener (સૌથી reliable)
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    const hash = window.location.hash;
    if (event === 'PASSWORD_RECOVERY' && hash && hash.includes('type=recovery')) {
      await checkRecoverySession();
    }
  });

  await checkAuth();
});

document.addEventListener('keydown', function (e) {
  const dialog = document.getElementById('deleteDialog');
  if (!dialog || !dialog.classList.contains('active')) return;

  const cancelBtn = document.querySelector('.cancel-delete-btn');
  const deleteBtn = document.querySelector('.confirm-delete-btn');
  if (!cancelBtn || !deleteBtn) return;

  if (e.key === 'Escape') {
    e.preventDefault();
    closeDeleteDialog();
    return;
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    if (document.activeElement === cancelBtn) closeDeleteDialog();
    else if (document.activeElement === deleteBtn) confirmDelete();
    return;
  }

  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    cancelBtn.focus();
    return;
  }

  if (e.key === 'ArrowRight') {
    e.preventDefault();
    deleteBtn.focus();
    return;
  }
});

/* =========================================================
   INITIALIZATION
========================================================= */


/* =========================================================
   PWA SERVICE WORKER
========================================================= */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(() => console.log('PWA Service Worker registered successfully.'))
      .catch(err => console.error('Service Worker registration failed:', err));
  });
}

function showBottomMessage(msg, type = 'success') {
  const bar = document.getElementById('bottomMsgBar');
  if (!bar) return;
  
  bar.textContent = msg;
  bar.className = 'bottom-msg-bar ' + type;
  
  // thodi var ma show
  requestAnimationFrame(() => {
    bar.classList.add('show');
  });

  // 4 second pachhi auto hide
  setTimeout(() => {
    bar.classList.remove('show');
  }, 4000);
}

function toggleTempShow(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;

  // Already visible → immediately hide
  if (input.type === 'text') {
    if (passwordTimers[inputId]) {
      clearTimeout(passwordTimers[inputId]);
      delete passwordTimers[inputId];
    }
    input.type = 'password';
    btn.classList.remove('active');
    btn.textContent = '👁️';
    return;
  }

  // Hidden → show for 4 seconds
  input.type = 'text';
  btn.classList.add('active');
  btn.textContent = '🙈';

  if (passwordTimers[inputId]) {
    clearTimeout(passwordTimers[inputId]);
  }

  passwordTimers[inputId] = setTimeout(() => {
    input.type = 'password';
    btn.classList.remove('active');
    btn.textContent = '👁️';
    delete passwordTimers[inputId];
  }, 4000);
}

async function handleForgotPassword() {
  const emailInput = document.getElementById('loginEmail');
  const email = emailInput.value.trim();
  const forgotBtn = document.getElementById('forgotBtn');
  const errorEl = document.getElementById('loginError');

  if (!email) {
    errorEl.textContent = 'Please enter your email first';
    showBottomMessage("Please enter email first", "error");
    return;
  }

  if (isSendingReset) {
    showBottomMessage("Reset link already sending, please wait...", "error");
    return;
  }

  // 60 second ma ek j var mail javu joiye
  const now = Date.now();
  if (now - lastResetSentAt < 60000) {
    const waitSec = Math.ceil((60000 - (now - lastResetSentAt)) / 1000);
    showBottomMessage(`Please wait ${waitSec}s before next reset mail`, "error");
    return;
  }

  isSendingReset = true;
  forgotBtn.disabled = true;
  forgotBtn.textContent = 'Sending...';
  errorEl.textContent = '';

  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname // same page par pachu aavse
    });
    if (error) throw error;

    lastResetSentAt = Date.now();
    localStorage.setItem('lastResetSentAt', lastResetSentAt);

    // POPUP nahi, BOTTOM PATTI + CONFIRM DIALOG
    // Tame kehta hata OK karvu pade to ene mate custom confirm jevu
    if (confirm(`Password reset link sent to ${email}.\n\nAfter Clicking on OK ! You Can Again Generate New Link.`)) {
      showBottomMessage(`Reset link sent to ${email}. Check your mail.`, "success");
      // OK dabyu etle have biji var click karva desu, pan 60 sec ni limit raheshe
    } else {
      showBottomMessage(`Reset link sent to ${email}`, "success");
    }

  } catch (err) {
    errorEl.textContent = err.message;
    showBottomMessage(err.message, "error");
  } finally {
    isSendingReset = false;
    forgotBtn.disabled = false;
    forgotBtn.textContent = 'Forgot Password?';
  }
}
// Supabase recovery link handling
async function checkRecoverySession() {
  // ફક્ત recovery linkવાળી tabમાં જ કામ કરે
  const hash = window.location.hash;
  if (!hash || !hash.includes('type=recovery')) {
    return;
  }

  try {
    let user = null;
    for (let i = 0; i < 8; i++) {
      const { data: { user: u } } = await supabaseClient.auth.getUser();
      if (u) {
        user = u;
        break;
      }
      await new Promise(r => setTimeout(r, 300));
    }

    if (!user) {
      showBottomMessage("Invalid or expired recovery link. Please try again.", "error");
      showScreen('login');
      history.replaceState(null, '', window.location.pathname + window.location.search);
      return;
    }

    document.getElementById('resetUsername').textContent =
      user.user_metadata?.username || user.email?.split('@')[0] || 'User';
    document.getElementById('resetEmailShow').textContent = user.email || '-';

    showScreen('resetPassword');

    history.replaceState(null, '', window.location.pathname + window.location.search);

  } catch (err) {
    console.error("Recovery Error:", err);
    showBottomMessage("Recovery error: " + err.message, "error");
    showScreen('login');
  }
}


async function handleUpdatePassword() {
  const newPass = document.getElementById('newPassword').value;
  const retype  = document.getElementById('retypeNewPassword').value;
  const errorEl = document.getElementById('resetError');
  const btn     = document.getElementById('confirmResetBtn');

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
    
    const { error } = await supabaseClient.auth.updateUser({
      password: newPass
    });

    if (error) throw error;

    // Success screen માટે username set કરો
    const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';
    document.getElementById('successUsername').textContent = username;

    // Session clear કરો
    await supabaseClient.auth.signOut();

    // Success screen બતાવો (Home પર ન જવું)
    showScreen('passwordSuccess');

    // Form reset
    document.getElementById('resetForm').reset();

  } catch (err) {
    console.error(err);
    errorEl.textContent = err.message;
    showBottomMessage(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirm';
  }
}
