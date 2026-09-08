const SUPABASE_URL = "https://fdddjqakdobjqgimnsdv.supabase.co";

const SUPABASE_KEY = "sb_publishable_Z2wSJeLTjgG-pkjjTzLmkQ_q19eQw12";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let expenses = [];
let transactions = [];

let editExpenseIndex = null;
let editTransactionIndex = null;

const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function showScreen(name){
  document.getElementById('homeScreen').classList.remove('active');
  document.getElementById('expenseScreen').classList.remove('active');
  document.getElementById('transactionScreen').classList.remove('active');

  if(name === 'home') document.getElementById('homeScreen').classList.add('active');
  if(name === 'expense') document.getElementById('expenseScreen').classList.add('active');
  if(name === 'transaction') document.getElementById('transactionScreen').classList.add('active');
}

function fillMonthYear(monthSelId, yearSelId){
  const monthSel = document.getElementById(monthSelId);
  const yearSel = document.getElementById(yearSelId);

  monthNames.forEach((m,i)=>{
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = m;
    monthSel.appendChild(opt);
  });

  for(let y = 2000; y <= 2099; y++){
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearSel.appendChild(opt);
  }

  const now = new Date();
  monthSel.value = now.getMonth();
  yearSel.value = now.getFullYear();
}

function todayISO(){
  const d = new Date();
  return d.toISOString().slice(0,10);
}

function formatDate(iso){
  if(!iso) return '-';

  const d = new Date(iso + 'T00:00:00');
  const day = String(d.getDate()).padStart(2,'0');
  const mon = monthNames[d.getMonth()].slice(0,3);

  return `${day}-${mon}-${d.getFullYear()}`;
}

function updateDateDisplay(inputId, textId){
  const val = document.getElementById(inputId).value;

  if(!val) return;

  document.getElementById(textId).textContent = formatDate(val);
}

function openDatePicker(inputId){
  const el = document.getElementById(inputId);

  if(el && typeof el.showPicker === 'function'){
    el.showPicker();
  }
}


/* =========================
   EXPENSE FUNCTIONS
========================= */

async function loadExpenses(){
  const { data, error } = await supabaseClient
    .from('expenses')
    .select('*')
    .order('date_iso', { ascending: true })
    .order('id', { ascending: true });

  if(error){
    console.error("Expense Load Error:", error);
    alert("Expense data load error: " + error.message);
    return;
  }

  expenses = data || [];
  renderExpenses();
}


async function addOrUpdateExpense(){

  const amtInput = document.getElementById('expAmount');
  const nameInput = document.getElementById('expName');

  if(!nameInput.checkValidity()){
    nameInput.reportValidity();
    return;
  }

  if(!amtInput.checkValidity()){
    amtInput.reportValidity();
    return;
  }

  const amount = parseFloat(amtInput.value);
  const name = nameInput.value.trim();
  const date = document.getElementById('expDate').value || todayISO();


  /* UPDATE */
  if(editExpenseIndex !== null){

    const item = expenses[editExpenseIndex];

    const { error } = await supabaseClient
      .from('expenses')
      .update({
        name: name,
        amount: amount,
        date_iso: date
      })
      .eq('id', item.id);

    if(error){
      console.error("Expense Update Error:", error);
      alert("Expense update error: " + error.message);
      return;
    }

    editExpenseIndex = null;
    document.getElementById('expDoneBtn').textContent = 'Done';

  }


  /* INSERT */
  else{

    const { error } = await supabaseClient
      .from('expenses')
      .insert({
        name: name,
        amount: amount,
        date_iso: date
      });

    if(error){
      console.error("Expense Insert Error:", error);
      alert("Expense save error: " + error.message);
      return;
    }

  }


  document.getElementById('expAmount').value = '';
  document.getElementById('expName').value = '';

  await loadExpenses();
}


function editExpense(realIdx){

  const item = expenses[realIdx];

  if(!item) return;

  document.getElementById('expName').value = item.name;
  document.getElementById('expAmount').value = item.amount;
  document.getElementById('expDate').value = item.date_iso;

  updateDateDisplay('expDate','expDateText');

  editExpenseIndex = realIdx;

  document.getElementById('expDoneBtn').textContent = 'Update';
}


async function deleteExpense(idx){

  const item = expenses[idx];

  if(!item) return;

  const confirmDelete = confirm("Delete this expense?");

  if(!confirmDelete) return;

  const { error } = await supabaseClient
    .from('expenses')
    .delete()
    .eq('id', item.id);

  if(error){
    console.error("Expense Delete Error:", error);
    alert("Expense delete error: " + error.message);
    return;
  }

  if(editExpenseIndex === idx){
    editExpenseIndex = null;
    document.getElementById('expDoneBtn').textContent = 'Done';
  }

  await loadExpenses();
}


function renderExpenses(){

  const m = parseInt(document.getElementById('expMonth').value);
  const y = parseInt(document.getElementById('expYear').value);

  const filtered = [];

  expenses.forEach((e, realIdx)=>{

    const d = new Date(e.date_iso + 'T00:00:00');

    if(d.getMonth() === m && d.getFullYear() === y){

      filtered.push({
        ...e,
        realIdx
      });

    }

  });


  const wrap = document.getElementById('expenseTableWrap');


  if(filtered.length === 0){

    wrap.innerHTML =
      '<div class="empty-note">No expense recorded for this month.</div>';

  }

  else{

    let html = `
      <table class="entries">
        <tr>
          <th class="col-date">Date</th>
          <th class="col-name">Name</th>
          <th class="col-amount">Amount (₹)</th>
          <th class="col-action">Action</th>
        </tr>
    `;


    filtered.forEach(e=>{

      html += `
        <tr>
          <td class="col-date">${formatDate(e.date_iso)}</td>

          <td class="col-name">
            ${escapeHtml(e.name)}
          </td>

          <td class="col-amount">
            ₹${Number(e.amount).toFixed(2)}
          </td>

          <td class="col-action">

            <div class="action-btns">

              <button
                class="edit-btn"
                onclick="editExpense(${e.realIdx})">
                Edit
              </button>

              <button
                class="del-btn"
                onclick="deleteExpense(${e.realIdx})">
                Delete
              </button>

            </div>

          </td>

        </tr>
      `;

    });


    html += '</table>';

    wrap.innerHTML = html;

  }


  const total = filtered.reduce(
    (s,e)=>s + Number(e.amount),
    0
  );

  document.getElementById('expTotal').textContent =
    total.toFixed(2);
}


/* =========================
   TRANSACTION FUNCTIONS
========================= */

async function loadTransactions(){

  const { data, error } = await supabaseClient
    .from('transactions')
    .select('*')
    .order('date_iso', { ascending: true })
    .order('id', { ascending: true });

  if(error){

    console.error("Transaction Load Error:", error);

    alert(
      "Transaction data load error: " +
      error.message
    );

    return;
  }

  transactions = data || [];

  renderTransactions();
}


async function addOrUpdateTransaction(){

  const toInput = document.getElementById('txnTo');
  const fromInput = document.getElementById('txnFrom');
  const amtInput = document.getElementById('txnAmount');

  if(!fromInput.checkValidity()){
    fromInput.reportValidity();
    return;
  }

  if(!toInput.checkValidity()){
    toInput.reportValidity();
    return;
  }

  if(!amtInput.checkValidity()){
    amtInput.reportValidity();
    return;
  }

  const to = toInput.value.trim();
  const from = fromInput.value.trim();
  const amount = parseFloat(amtInput.value);
  const date =
    document.getElementById('txnDate').value || todayISO();


  /* UPDATE */

  if(editTransactionIndex !== null){

    const item = transactions[editTransactionIndex];

    const { error } = await supabaseClient
      .from('transactions')
      .update({
        payer: from,
        receiver: to,
        amount: amount,
        date_iso: date
      })
      .eq('id', item.id);

    if(error){

      console.error(
        "Transaction Update Error:",
        error
      );

      alert(
        "Transaction update error: " +
        error.message
      );

      return;
    }

    editTransactionIndex = null;

    document.getElementById('txnDoneBtn').textContent = 'Done';

  }


  /* INSERT */

  else{

    const { error } = await supabaseClient
      .from('transactions')
      .insert({
        payer: from,
        receiver: to,
        amount: amount,
        date_iso: date,
        is_received: false,
        received_date_iso: null
      });

    if(error){

      console.error(
        "Transaction Insert Error:",
        error
      );

      alert(
        "Transaction save error: " +
        error.message
      );

      return;
    }

  }


  document.getElementById('txnTo').value = '';
  document.getElementById('txnFrom').value = '';
  document.getElementById('txnAmount').value = '';

  await loadTransactions();
}


async function toggleReceived(realIdx, isChecked){

  const item = transactions[realIdx];

  if(!item) return;

  const receivedDate =
    isChecked ? todayISO() : null;


  const { error } = await supabaseClient
    .from('transactions')
    .update({
      is_received: isChecked,
      received_date_iso: receivedDate
    })
    .eq('id', item.id);


  if(error){

    console.error(
      "Received Update Error:",
      error
    );

    alert(
      "Received status update error: " +
      error.message
    );

    return;
  }


  await loadTransactions();
}


function calculateDaysDiff(startDateStr, endDateStr){

  if(!startDateStr || !endDateStr) return '-';

  const start =
    new Date(startDateStr + 'T00:00:00');

  const end =
    new Date(endDateStr + 'T00:00:00');

  const diffTime =
    Math.abs(end - start);

  const diffDays =
    Math.ceil(
      diffTime / (1000 * 60 * 60 * 24)
    );

  return `${diffDays} Days`;
}


function editTransaction(realIdx){

  const item = transactions[realIdx];

  if(!item) return;

  document.getElementById('txnTo').value =
    item.receiver;

  document.getElementById('txnFrom').value =
    item.payer;

  document.getElementById('txnAmount').value =
    item.amount;

  document.getElementById('txnDate').value =
    item.date_iso;

  updateDateDisplay(
    'txnDate',
    'txnDateText'
  );

  editTransactionIndex = realIdx;

  document.getElementById('txnDoneBtn').textContent =
    'Update';
}


async function deleteTransaction(idx){

  const item = transactions[idx];

  if(!item) return;

  const confirmDelete =
    confirm("Delete this transaction?");

  if(!confirmDelete) return;


  const { error } = await supabaseClient
    .from('transactions')
    .delete()
    .eq('id', item.id);


  if(error){

    console.error(
      "Transaction Delete Error:",
      error
    );

    alert(
      "Transaction delete error: " +
      error.message
    );

    return;
  }


  if(editTransactionIndex === idx){

    editTransactionIndex = null;

    document.getElementById(
      'txnDoneBtn'
    ).textContent = 'Done';

  }


  await loadTransactions();
}


function renderTransactions(){

  const m =
    parseInt(
      document.getElementById('txnMonth').value
    );

  const y =
    parseInt(
      document.getElementById('txnYear').value
    );

  const filtered = [];


  transactions.forEach((t, realIdx)=>{

    const d =
      new Date(
        t.date_iso + 'T00:00:00'
      );

    if(
      d.getMonth() === m &&
      d.getFullYear() === y
    ){

      filtered.push({
        ...t,
        realIdx
      });

    }

  });


  const wrap =
    document.getElementById(
      'transactionTableWrap'
    );


  if(filtered.length === 0){

    wrap.innerHTML =
      '<div class="empty-note">No transactions recorded for this month.</div>';

  }

  else{

    let html = `
      <table class="entries">

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
    `;


    filtered.forEach(t=>{

      const chukavyaDate =
        t.received_date_iso
          ? formatDate(t.received_date_iso)
          : '-';

      const timeDiff =
        calculateDaysDiff(
          t.date_iso,
          t.received_date_iso
        );


      html += `
        <tr>

          <td class="col-date">
            ${formatDate(t.date_iso)}
          </td>

          <td class="col-txn-tofrom">
            ${escapeHtml(t.payer)}
          </td>

          <td class="col-txn-tofrom">
            ${escapeHtml(t.receiver)}
          </td>

          <td class="col-txn-amt">
            ₹${Number(t.amount).toFixed(2)}
          </td>

          <td class="col-date">

            <input
              type="checkbox"
              class="custom-checkbox"
              ${t.is_received ? 'checked' : ''}
              onchange="toggleReceived(${t.realIdx}, this.checked)"
            >

          </td>

          <td class="col-date">
            ${chukavyaDate}
          </td>

          <td class="col-date">
            ${timeDiff}
          </td>

          <td class="col-action">

            <div class="action-btns">

              <button
                class="edit-btn"
                onclick="editTransaction(${t.realIdx})">
                Edit
              </button>

              <button
                class="del-btn"
                onclick="deleteTransaction(${t.realIdx})">
                Delete
              </button>

            </div>

          </td>

        </tr>
      `;

    });


    html += '</table>';

    wrap.innerHTML = html;

  }


  const total =
    filtered.reduce(
      (s,t)=>s + Number(t.amount),
      0
    );

  document.getElementById('txnTotal').textContent =
    total.toFixed(2);
}


/* =========================
   PDF DOWNLOADS
========================= */

function downloadExpensePDF(){

  const m =
    parseInt(
      document.getElementById('expMonth').value
    );

  const y =
    parseInt(
      document.getElementById('expYear').value
    );

  const filtered =
    expenses.filter(e=>{

      const d =
        new Date(
          e.date_iso + 'T00:00:00'
        );

      return(
        d.getMonth() === m &&
        d.getFullYear() === y
      );

    });


  const { jsPDF } = window.jspdf;

  const doc = new jsPDF();

  doc.setFontSize(16);

  doc.text(
    `Daily Expense Report - ${monthNames[m]} ${y}`,
    14,
    18
  );

  doc.setFontSize(11);

  let yPos = 30;

  doc.text('Date', 14, yPos);
  doc.text('Name', 60, yPos);
  doc.text('Amount (Rs)', 140, yPos);

  yPos += 6;

  doc.line(14, yPos, 196, yPos);

  yPos += 8;

  let total = 0;


  filtered.forEach(e=>{

    if(yPos > 280){

      doc.addPage();

      yPos = 20;

    }

    doc.text(
      formatDate(e.date_iso),
      14,
      yPos
    );

    doc.text(
      String(e.name),
      60,
      yPos
    );

    doc.text(
      Number(e.amount).toFixed(2),
      140,
      yPos
    );

    total += Number(e.amount);

    yPos += 8;

  });


  yPos += 6;

  doc.setFontSize(13);

  doc.text(
    `Total Expense: Rs ${total.toFixed(2)}`,
    14,
    yPos
  );

  doc.save(
    `Daily_Expense_${monthNames[m]}_${y}.pdf`
  );
}


function downloadTransactionPDF(){

  const m =
    parseInt(
      document.getElementById('txnMonth').value
    );

  const y =
    parseInt(
      document.getElementById('txnYear').value
    );


  const filtered =
    transactions.filter(t=>{

      const d =
        new Date(
          t.date_iso + 'T00:00:00'
        );

      return(
        d.getMonth() === m &&
        d.getFullYear() === y
      );

    });


  const { jsPDF } = window.jspdf;

  const doc = new jsPDF();

  doc.setFontSize(16);

  doc.text(
    `Money Transaction Report - ${monthNames[m]} ${y}`,
    14,
    18
  );

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


  filtered.forEach(t=>{

    if(yPos > 280){

      doc.addPage();

      yPos = 20;

    }

    doc.text(
      formatDate(t.date_iso),
      14,
      yPos
    );

    doc.text(
      String(t.payer),
      45,
      yPos
    );

    doc.text(
      String(t.receiver),
      80,
      yPos
    );

    doc.text(
      Number(t.amount).toFixed(2),
      115,
      yPos
    );

    doc.text(
      t.is_received ? 'Yes' : 'No',
      150,
      yPos
    );

    total += Number(t.amount);

    yPos += 8;

  });


  yPos += 6;

  doc.setFontSize(13);

  doc.text(
    `Total: Rs ${total.toFixed(2)}`,
    14,
    yPos
  );

  doc.save(
    `Money_Transaction_${monthNames[m]}_${y}.pdf`
  );
}


/* =========================
   SECURITY / HTML
========================= */

function escapeHtml(str){

  const div =
    document.createElement('div');

  div.textContent = str;

  return div.innerHTML;
}


/* =========================
   ENTER KEY NAVIGATION
========================= */

document.addEventListener(
  'keydown',
  function(e){

    if(e.key === 'Enter'){

      if(
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'SELECT'
      ){

        if(e.target.type === 'date') return;

        e.preventDefault();

        const form =
          e.target.closest('form');

        if(!form) return;

        const textInputs =
          Array.from(
            form.querySelectorAll(
              'input:not([type="hidden"]):not([type="date"]), select'
            )
          );

        const currentIndex =
          textInputs.indexOf(e.target);

        if(
          currentIndex > -1 &&
          currentIndex < textInputs.length - 1
        ){

          textInputs[
            currentIndex + 1
          ].focus();

        }

        else{

          form.requestSubmit();

        }

      }

    }

  }
);


/* =========================
   INITIALIZATION
========================= */

fillMonthYear(
  'expMonth',
  'expYear'
);

fillMonthYear(
  'txnMonth',
  'txnYear'
);


const todayStr = todayISO();

document.getElementById('expDate').value =
  todayStr;

document.getElementById('txnDate').value =
  todayStr;

document.getElementById('expDateText').textContent =
  formatDate(todayStr);

document.getElementById('txnDateText').textContent =
  formatDate(todayStr);


/* Load Cloud Data */

loadExpenses();

loadTransactions();


/* =========================
   PWA SERVICE WORKER
========================= */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(() => {
        console.log('PWA Service Worker registered successfully.');
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}
