// --- ENCRYPTED CONFIG (obfuscated, console ma direct na dekhay) ---
function _kDec(t){ try{ return atob(t); }catch(e){ return ""; } }
function _encData(s){ 
  // XOR + base64 encryption for localStorage
  const k="khatu@2026!"; 
  let r=""; 
  for(let i=0;i<s.length;i++) r+=String.fromCharCode(s.charCodeAt(i) ^ k.charCodeAt(i%k.length)); 
  return btoa(unescape(encodeURIComponent(r))); 
}
function _decData(e){ 
  try{
    const k="khatu@2026!"; 
    let d=decodeURIComponent(escape(atob(e))); 
    let r=""; 
    for(let i=0;i<d.length;i++) r+=String.fromCharCode(d.charCodeAt(i) ^ k.charCodeAt(i%k.length)); 
    return r; 
  }catch(err){ return ""; }
}
// URL ane KEY encrypt kari ne rakhyu - direct console ma na dekhay
const _encUrl = "aHR0cHM6Ly9mZGRkanFha2RvYmpxZ2ltbnNkdi5zdXBhYmFzZS5jbw=="; // base64 of url
const _encKey = "WlhsS2FHSkhZMmxQYVVwSlZYcEpNVTVwU1hOSmJsSTFZME5KTmtscmNGaFdRMG81TG1WNVNuQmpNMDFwVDJsS2VtUllRbWhaYlVaNldsTkpjMGx1U214YWFVazJTVzFhYTFwSFVuRmpWMFp5V2tjNWFXRnVSbTVoVnpGMVl6SlNNa2xwZDJsamJUbHpXbE5KTmtsdFJuVmlNalJwVEVOS2NGbFlVV2xQYWtVelQwUm5ORTFFV1hwT1JHZHpTVzFXTkdORFNUWk5ha1YzVGtSTk5FMXFUVEJQU0RBdVZWaDBiMFJvWjJ4V2VGTlVWelkxYkZNMk5IVlVNemRaYTJaSWJsWklVRVY1V21Gclh6Tkpjak01VFE9PQ=="; // double base64
var SUPABASE_URL = _kDec(_encUrl);
var SUPABASE_KEY = _kDec(_kDec(_encKey)); // double decode
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
var currentCategoryTarget = null;
var pendingDownloadType = null; // expense / transaction / filter

const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DEFAULT_CATEGORIES = ["Others","Petrol","Cement"];
const NEW_CAT_LABEL = "➕ New Category...";

// ---------- CATEGORY HELPERS - ENCRYPTED STORAGE ----------
function getAllCategoriesFiltered(){
  // Pela encrypted keys ma thi try karo, jo na male to juna keys ma thi (migration)
  let custom = [];
  let hidden = [];
  try{
    let encCustom = localStorage.getItem('__c_a') || localStorage.getItem('__c_c');
    let encHidden = localStorage.getItem('__h_a') || localStorage.getItem('__c_b');
    if(encCustom){
      let dec = _decData(encCustom);
      custom = JSON.parse(dec || "[]");
    }else{
      custom = JSON.parse(localStorage.getItem('customCategories') || "[]");
    }
    if(encHidden){
      let dec = _decData(encHidden);
      hidden = JSON.parse(dec || "[]");
    }else{
      hidden = JSON.parse(localStorage.getItem('hiddenCategories') || "[]");
    }
  }catch(e){
    custom = []; hidden = [];
  }
  let all = [...DEFAULT_CATEGORIES, ...custom];
  return all.filter(c => !hidden.includes(c));
}
function getAllCategories() { return getAllCategoriesFiltered(); }
function _saveCustomCategories(arr){
  try{
    localStorage.setItem('__c_a', _encData(JSON.stringify(arr)));
    localStorage.removeItem('customCategories'); // juna key delete
    localStorage.removeItem('__c_c');
  }catch(e){}
}
function _saveHiddenCategories(arr){
  try{
    localStorage.setItem('__h_a', _encData(JSON.stringify(arr)));
    localStorage.removeItem('hiddenCategories');
    localStorage.removeItem('__c_b');
  }catch(e){}
}

// ---------- GROUP HELPERS - SAME AS CATEGORY ----------
const DEFAULT_GROUPS = ["Upad", "Jama", "Others"];
const NEW_GROUP_LABEL = "➕ New Group...";
function getAllGroupsFiltered(){
  let custom = []; let hidden = [];
  try{
    let encCustom = localStorage.getItem('__g_a');
    let encHidden = localStorage.getItem('__g_h');
    if(encCustom){ custom = JSON.parse(_decData(encCustom)||"[]"); }
    if(encHidden){ hidden = JSON.parse(_decData(encHidden)||"[]"); }
  }catch(e){ custom=[]; hidden=[]; }
  let all = [...DEFAULT_GROUPS, ...custom];
  return all.filter(c => !hidden.includes(c));
}
function _saveCustomGroups(arr){
  try{ localStorage.setItem('__g_a', _encData(JSON.stringify(arr))); }catch(e){}
}
function _saveHiddenGroups(arr){
  try{ localStorage.setItem('__g_h', _encData(JSON.stringify(arr))); }catch(e){}
}
function fillGroupSelects(){
  let groups = getAllGroupsFiltered();
  let selGrp = document.getElementById('grpGroup');
  if(selGrp){
    let prev = selGrp.value || "Upad";
    selGrp.innerHTML = "";
    selGrp.add(new Option(NEW_GROUP_LABEL, NEW_GROUP_LABEL));
    groups.forEach(g => selGrp.add(new Option(g, g)));
    if([...groups, NEW_GROUP_LABEL].includes(prev)) selGrp.value = prev;
    else selGrp.value = groups[0] || "Upad";
  }
}

function fillMonthYear(monthSelId, yearSelId, includeOverall = true) {
  const monthSel = document.getElementById(monthSelId);
  const yearSel = document.getElementById(yearSelId);
  if (!monthSel || !yearSel) return;
  const prevMonth = monthSel.value;
  const prevYear = yearSel.value;
  monthSel.innerHTML = '';
  yearSel.innerHTML = '';
  monthSel.add(new Option("Overall", "all"));
  monthNames.forEach((m, i) => monthSel.add(new Option(m, i)));
  yearSel.add(new Option("Overall", "all"));
  for (let y = new Date().getFullYear(); y >= 2000; y--) yearSel.add(new Option(y, y));
  for (let y = new Date().getFullYear()+1; y <= 2099; y++) yearSel.add(new Option(y, y));
  if(prevMonth) monthSel.value = prevMonth; else monthSel.value = new Date().getMonth();
  if(prevYear) yearSel.value = prevYear; else yearSel.value = new Date().getFullYear();
}

function fillCategorySelects() {
  let cats = getAllCategoriesFiltered();
  let selExp = document.getElementById('expCategoryFilter');
  if(selExp){
    let prev = selExp.value || "Others";
    selExp.innerHTML = "";
    selExp.add(new Option(NEW_CAT_LABEL, NEW_CAT_LABEL));
    cats.forEach(c => selExp.add(new Option(c, c)));
    if([...cats, NEW_CAT_LABEL].includes(prev)) selExp.value = prev; else selExp.value = "Others";
  }
  let selFilter = document.getElementById('filterCategory');
  if(selFilter){
    let prev = selFilter.value || "All Categories";
    let filterCats = ["All Categories", ...cats];
    selFilter.innerHTML = "";
    selFilter.add(new Option(NEW_CAT_LABEL, NEW_CAT_LABEL));
    filterCats.forEach(c => selFilter.add(new Option(c, c)));
    if([...filterCats, NEW_CAT_LABEL].includes(prev)) selFilter.value = prev; else selFilter.value = "All Categories";
  }
}

// ---------- NEW CATEGORY DIALOG ----------
function handleCategorySelectChange(selectId){
  let sel = document.getElementById(selectId);
  if(!sel) return;
  if(sel.value === NEW_CAT_LABEL){
    currentCategoryTarget = selectId;
    document.getElementById('newCategoryDialog')?.classList.add('active');
    document.getElementById('newCategoryInput').value = "";
    setTimeout(()=>document.getElementById('newCategoryInput').focus(),100);
  }
}
function closeNewCategoryDialog(){
  document.getElementById('newCategoryDialog')?.classList.remove('active');
  if(currentCategoryTarget){
    let sel = document.getElementById(currentCategoryTarget);
    if(sel && sel.value === NEW_CAT_LABEL) sel.value = "Others";
  }
  currentCategoryTarget = null;
}
function confirmNewCategory(){
  let name = document.getElementById('newCategoryInput').value.trim();
  if(!name) return showBottomMessage("Category name lakho","error");
  if(name === "All Categories" || name === NEW_CAT_LABEL) return showBottomMessage("Aa nam use na thai","error");
  name = name.charAt(0).toUpperCase() + name.slice(1);
  let custom = []; let hidden = [];
  try{
    let ec = localStorage.getItem('__c_a'); if(ec) custom = JSON.parse(_decData(ec)||"[]"); else custom = JSON.parse(localStorage.getItem('customCategories')||"[]");
    let eh = localStorage.getItem('__h_a'); if(eh) hidden = JSON.parse(_decData(eh)||"[]"); else hidden = JSON.parse(localStorage.getItem('hiddenCategories')||"[]");
  }catch(e){}
  if(hidden.includes(name)){
    hidden = hidden.filter(c => c !== name);
    _saveHiddenCategories(hidden);
    fillCategorySelects();
    if(currentCategoryTarget) document.getElementById(currentCategoryTarget).value = name;
    closeNewCategoryDialog();
    showBottomMessage(`"${name}" category pachi restore thai gai`, "success");
    renderExpenses(); renderFilterResults(); return;
  }
  if(getAllCategories().map(c=>c.toLowerCase()).includes(name.toLowerCase())){
    showBottomMessage("Category already exists","error"); return;
  }
  custom.push(name);
  _saveCustomCategories(custom);
  fillCategorySelects();
  if(currentCategoryTarget) document.getElementById(currentCategoryTarget).value = name;
  document.getElementById('newCategoryDialog')?.classList.remove('active');
  showBottomMessage(`Category "${name}" is Created.`, "success");
  currentCategoryTarget = null;
  renderExpenses(); renderFilterResults();
}
function saveNewCategory(){ confirmNewCategory(); }

// ---------- DELETE CATEGORY ----------
function selectCustomCategory(val){
  let box = document.getElementById('customCategoryBox');
  document.getElementById('customCategoryValue').textContent = val;
  document.getElementById('deleteCategorySelect').value = val;
  document.getElementById('customCategoryList').style.display = 'none';
  box.style.background = "#a16207"; box.style.color = "white"; box.style.borderColor = "#78350f";
}
function toggleCustomCategoryList(){
  let list = document.getElementById('customCategoryList');
  list.style.display = list.style.display === 'none' || list.style.display === '' ? 'block' : 'none';
}
function openDeleteCategoryDialog(){
  let sel = document.getElementById('deleteCategorySelect');
  let listDiv = document.getElementById('customCategoryList');
  let box = document.getElementById('customCategoryBox');
  box.style.background = "#dbeafe"; box.style.color = "#111"; box.style.borderColor = "#111";
  sel.innerHTML = ""; listDiv.innerHTML = "";
  let all = getAllCategoriesFiltered().filter(c => c!== 'Others');
  if(all.length === 0) return showBottomMessage("Delete karva mate koi category nathi","error");
  all.forEach((c, idx) => {
    sel.add(new Option(c, c));
    let div = document.createElement('div');
    div.textContent = c;
    div.style.cssText = "padding:12px; text-align:center; font-weight:600; cursor:pointer; border-bottom:1px solid #ddd; background:white;";
    if(idx === all.length - 1) div.style.borderBottom = "none";
    div.onmouseover = () => div.style.background = "#fef9c3";
    div.onmouseout = () => div.style.background = "white";
    div.onclick = () => selectCustomCategory(c);
    listDiv.appendChild(div);
  });
  document.getElementById('customCategoryValue').textContent = all[0];
  sel.value = all[0];
  document.getElementById('deleteCategoryDialog').classList.add('active');
}
function closeDeleteCategoryDialog(){
  document.getElementById('deleteCategoryDialog').classList.remove('active');
  document.getElementById('customCategoryList').style.display = 'none';
}
async function confirmDeleteCategory(){
  let catToDelete = document.getElementById('deleteCategorySelect').value;
  if(!catToDelete) return;
  const user = await getCurrentUser();
  if(user){
    const { error } = await supabaseClient.from('expenses').delete().eq('user_id', user.id).eq('category', catToDelete);
    if(error) return showBottomMessage(error.message,"error");
  }
  expenses = expenses.filter(e => e.category !== catToDelete);
  let custom = []; let hidden = [];
  try{
    let ec = localStorage.getItem('__c_a'); if(ec) custom = JSON.parse(_decData(ec)||"[]"); else custom = JSON.parse(localStorage.getItem('customCategories')||"[]");
    let eh = localStorage.getItem('__h_a'); if(eh) hidden = JSON.parse(_decData(eh)||"[]"); else hidden = JSON.parse(localStorage.getItem('hiddenCategories')||"[]");
  }catch(e){}
  if(custom.includes(catToDelete)){
    custom = custom.filter(c => c !== catToDelete);
    _saveCustomCategories(custom);
  } else {
    if(!hidden.includes(catToDelete)) hidden.push(catToDelete);
    _saveHiddenCategories(hidden);
  }
  fillCategorySelects(); renderExpenses(); renderFilterResults();
  closeDeleteCategoryDialog();
  showBottomMessage(`"${catToDelete}" Category and Records are Deleted.`, "success");
}

// ---------- DOWNLOAD DIALOG - NEW FEATURE ----------
function openDownloadDialog(type){
  pendingDownloadType = type;
  document.getElementById('downloadDialog')?.classList.add('active');
}
function closeDownloadDialog(){
  pendingDownloadType = null;
  document.getElementById('downloadDialog')?.classList.remove('active');
}
function handleDownloadAsPDF(){
  if(!pendingDownloadType) return;
  const type = pendingDownloadType;
  closeDownloadDialog();
  setTimeout(()=>{
    if(type === 'expense') downloadExpensePDF();
    else if(type === 'transaction') downloadTransactionPDF();
    else if(type === 'filter') downloadFilterPDF();
  }, 200);
}
function handleDownloadAsExcel(){
  if(!pendingDownloadType) return;
  const type = pendingDownloadType;
  closeDownloadDialog();
  setTimeout(()=>{
    if(type === 'expense') downloadExpenseExcel();
    else if(type === 'transaction') downloadTransactionExcel();
    else if(type === 'filter') downloadFilterExcel();
  }, 200);
}

// ---------- COMMON UI ----------
function showScreen(name) {
  const screens = ['loginScreen','signupScreen','resetPasswordScreen','passwordSuccessScreen','homeScreen','expenseScreen','transactionScreen','groupScreen','profileScreen','dashboardScreen','filterScreen'];
  screens.forEach(id => document.getElementById(id)?.classList.remove('active'));
  document.getElementById(name + 'Screen')?.classList.add('active');
  document.querySelectorAll('.user-menu').forEach(menu => menu.classList.remove('active'));
  // When entering grouping screen, by default set to Others (as requested) and Select Name default
  if(name === 'group'){
    let grpSel = document.getElementById('grpGroup');
    if(grpSel){
      // Default to Others if available, else first group
      let groups = getAllGroupsFiltered();
      if(groups.includes('Others')) grpSel.value = 'Others';
      else if(groups.length>0) grpSel.value = groups[0];
    }
    let personFilter = document.getElementById('grpPersonFilter');
    if(personFilter) personFilter.value = 'Select Name';
    // Reset expanded
    expandedGroups = {};
    // Will render with today's data
    renderGroups();
  }
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
  if (profileDashboardBackScreen === 'expense' || profileDashboardBackScreen === 'transaction' || profileDashboardBackScreen === 'group') {
    showScreen(profileDashboardBackScreen);
    if(profileDashboardBackScreen === 'group') loadGroups();
    profileDashboardBackScreen = null;
  } else { showScreen('home'); }
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
  // Encrypted localStorage thi Email/Password auto-fill - pela karta jem hatu tem
  try{
    // Juna plain keys delete karo
    localStorage.removeItem('savedEmail');
    localStorage.removeItem('savedPassword');
    localStorage.removeItem('customCategories');
    localStorage.removeItem('hiddenCategories');
    const encEmail = localStorage.getItem('__k_e');
    const encPass = localStorage.getItem('__k_p');
    if(encEmail){
      const emailEl = document.getElementById('loginEmail');
      if(emailEl) emailEl.value = _decData(encEmail);
    }
    if(encPass){
      const passEl = document.getElementById('loginPassword');
      if(passEl) passEl.value = _decData(encPass);
    }
  }catch(e){}
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
    else unit = 'Qty';
  }
  let displayName = '';
  if (plate) displayName += plate + ' ';
  displayName += cleanName? capitalizeFirstLetter(cleanName) : 'Item';
  if (qty && unit) displayName += ' ' + qty + ' ' + unit;
  if (cleanName.toLowerCase() === 'item' && qty) {
     if(lower.includes('cement')) displayName = qty + ' Bags';
     if(lower.includes('petrol')) displayName = qty + ' Liter';
  }
  return { displayName: displayName.trim(), qty, unit, plate };
}

// ---------- EXPENSE ----------
async function loadExpenses() { expenses = await loadTable('expenses'); renderExpenses(); }
async function addOrUpdateExpense() {
  const user = await getCurrentUser(); if (!user) return showBottomMessage("Login nathi", "error");
  const nameInput = document.getElementById('expName');
  let name = nameInput ? nameInput.value.trim() : "";
  const amount = parseFloat(document.getElementById('expAmount').value);
  const date = document.getElementById('expDate').value || todayISO();
  let catSel = document.getElementById('expCategoryFilter')?.value || 'Others';
  if(catSel === NEW_CAT_LABEL) return handleExpenseCategoryChange('expCategoryFilter');
  if(catSel === 'All Categories') catSel = 'Others';
  // LOGIC: Others ma name joiye, bija category ma direct amount
  if(catSel === 'Others'){
    if(!name) return showBottomMessage("Expense Name lakho", "error");
  }else{
    // Biji category ma name optional - category j name bani jase
    if(!name) name = catSel;
    // Petrol/Cement ma Bags/Liter logic rakhyu
    if(name && !isNaN(name)){
      if(catSel.toLowerCase() === 'cement') name = `${name} Bags`;
      else if(catSel.toLowerCase() === 'petrol') name = `${name} Liter`;
    }
  }
  if(name && !isNaN(name)){
    if(catSel.toLowerCase() === 'cement') name = `${name} Bags`;
    else if(catSel.toLowerCase() === 'petrol') name = `${name} Liter`;
  } else {
    if(name && !name.toLowerCase().includes('bag') && !name.toLowerCase().includes('liter')){
        if(catSel.toLowerCase() === 'cement' && /^\d+(\.\d+)?$/.test(name.trim())) name = `${name.trim()} Bags`;
        if(catSel.toLowerCase() === 'petrol' && /^\d+(\.\d+)?$/.test(name.trim())) name = `${name.trim()} Liter`;
    }
  }
  if(catSel !== 'Others' && name === catSel){
    // keep as is, e.g. Petrol
  }
  name = capitalizeFirstLetter(name);
  const btn = document.getElementById('expDoneBtn');
  btn.disabled = true; btn.textContent = 'Saving...';
  try {
    if (editExpenseId !== null) {
      const { error } = await supabaseClient.from('expenses').update({ name, amount, date_iso: date, category: catSel }).eq('id', editExpenseId).eq('user_id', user.id);
      if(error) throw error;
      showBottomMessage("Updated in "+catSel, "success"); editExpenseId = null;
    } else {
      const { error } = await supabaseClient.from('expenses').insert({ name, amount, date_iso: date, category: catSel, user_id: user.id });
      if(error) throw error;
      showBottomMessage(`Added in ${catSel}`, "success");
    }
    if(document.getElementById('expName')) document.getElementById('expName').value = ''; 
    document.getElementById('expAmount').value = '';
    document.getElementById('expDate').value = todayISO();
    updateDateDisplay('expDate','expDateText');
    handleExpenseCategoryChange();
    await loadExpenses();
    setTimeout(()=>{ 
      let cat = document.getElementById('expCategoryFilter')?.value;
      if(cat === 'Others') document.getElementById('expName')?.focus();
      else document.getElementById('expAmount')?.focus();
    }, 100);
  } catch(err){ showBottomMessage(err.message,"error"); }
  finally{ btn.disabled=false; btn.textContent='Done'; }
}
function editExpense(id) {
  const item = expenses.find(e => String(e.id) === String(id)); if (!item) return;
  document.getElementById('expName').value = item.name;
  document.getElementById('expAmount').value = item.amount;
  document.getElementById('expDate').value = item.date_iso;
  if(document.getElementById('expCategoryFilter')) document.getElementById('expCategoryFilter').value = item.category || 'Others';
  updateDateDisplay('expDate', 'expDateText');
  editExpenseId = item.id;
  document.getElementById('expDoneBtn').textContent = 'Update';
  handleExpenseCategoryChange();
}
function deleteExpense(id) { openDeleteDialog('expense', id); }
async function performDeleteExpense(id) {
  if (await deleteRow('expenses', id)) {
    if (String(editExpenseId) === String(id)) { editExpenseId = null; document.getElementById('expDoneBtn').textContent = 'Done'; }
    showBottomMessage("Expense deleted", "success"); await loadExpenses();
  }
}
function handleExpenseCategoryChange(){
  let sel = document.getElementById('expCategoryFilter');
  if(!sel) return;
  if(sel.value === NEW_CAT_LABEL){
    currentCategoryTarget = 'expCategoryFilter';
    document.getElementById('newCategoryDialog')?.classList.add('active');
    document.getElementById('newCategoryInput').value = "";
    document.getElementById('newCategoryInput').focus();
    return;
  }
  let ph = document.getElementById('expName');
  let phWrap = ph;
  let amountInput = document.getElementById('expAmount');
  if(sel.value === 'Others' || sel.value === 'All Categories'){
    // Others ma Name + Amount banne
    if(phWrap){ phWrap.style.display = ''; phWrap.required = true; phWrap.placeholder = "Expense Name"; }
    if(amountInput){ amountInput.placeholder = "Enter Amount"; }
  }else{
    // Biji category ma direct Amount - Name hide
    if(phWrap){ 
      phWrap.style.display = 'none'; 
      phWrap.required = false; 
      phWrap.value = '';
    }
    if(amountInput){ 
      if(sel.value.toLowerCase() === 'petrol') amountInput.placeholder = sel.value + " Amount (e.g. 500)";
      else if(sel.value.toLowerCase() === 'cement') amountInput.placeholder = sel.value + " Amount";
      else amountInput.placeholder = sel.value + " - Enter Amount";
      amountInput.focus();
    }
  }
}

function renderExpenses() {
  // Main screen ma selected date no data dekhadvo - default aaj, date badlo to badleli date no data
  const selectedDate = document.getElementById('expDate')?.value || todayISO();
  let filtered = expenses.filter(e => {
    return e.date_iso === selectedDate;
  });
  const wrap = document.getElementById('expenseTableWrap');
  if (filtered.length === 0) {
    wrap.innerHTML = `<div class="empty-note">No expense for ${formatDate(selectedDate)}. Add new or check Filter.</div>`;
  } else {
    const rows = filtered.map(e => {
      const parsed = parseExpenseName(e.name);
      return `<tr>
        <td style="text-align:center;">${formatDate(e.date_iso)}</td>
        <td style="text-align:center;">${escapeHtml(parsed.displayName || e.name)} <span style="font-size:11px;color:#64748b;">[${escapeHtml(e.category||'Others')}]</span></td>
        <td style="text-align:center;">₹${Number(e.amount).toFixed(2)}</td>
        <td style="text-align:center;"><div class="action-btns" style="justify-content:center;"><button class="edit-btn" onclick="editExpense('${jsAttr(e.id)}')">Edit</button><button class="del-btn" onclick="deleteExpense('${jsAttr(e.id)}')">Delete</button></div></td>
      </tr>`;
    }).join('');
    wrap.innerHTML = `<table class="entries"><thead><tr><th style="text-align:center;">Date</th><th style="text-align:center;">Name [Category]</th><th style="text-align:center;">Amount</th><th style="text-align:center;">Action</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  document.getElementById('expTotal').textContent = filtered.reduce((s, e) => s + Number(e.amount || 0), 0).toFixed(2);
  scrollTableToBottom('expenseTableWrap');
}

// ---------- TRANSACTION ----------
async function loadTransactions() { transactions = await loadTable('transactions'); renderTransactions(); }
function renderTransactions() {
  // Main screen ma selected date no data
  const selectedDate = document.getElementById('txnDate')?.value || todayISO();
  const filtered = transactions.filter(t => { 
    return t.date_iso === selectedDate;
  });
  const wrap = document.getElementById('transactionTableWrap');
  if (filtered.length === 0) { wrap.innerHTML = `<div class="empty-note">No transactions for ${formatDate(selectedDate)}. Add new or check Filter.</div>`; }
  else {
    wrap.innerHTML = `<table class="entries"><thead><tr><th class="col-date">Tarikh</th><th class="col-txn-tofrom">Payer</th><th class="col-txn-tofrom">Receiver</th><th class="col-txn-amt">Paisa</th><th class="col-date">Repay (✓)</th><th class="col-date">Repay Date</th><th class="col-date">Gap</th><th class="col-action">Action</th></tr></thead><tbody>${filtered.map(t => `<tr><td class="col-date">${formatDate(t.date_iso)}</td><td class="col-txn-tofrom">${escapeHtml(t.payer)}</td><td class="col-txn-tofrom">${escapeHtml(t.receiver)}</td><td class="col-txn-amt">₹${Number(t.amount).toFixed(2)}</td><td class="col-date"><input type="checkbox" class="custom-checkbox" ${t.is_received? 'checked' : ''} onchange="toggleReceived('${jsAttr(t.id)}', this.checked)"></td><td class="col-date">${t.received_date_iso? formatDate(t.received_date_iso) : '-'}</td><td class="col-date">${calculateDaysDiff(t.date_iso, t.received_date_iso)}</td><td class="col-action"><div class="action-btns"><button class="edit-btn" onclick="editTransaction('${jsAttr(t.id)}')">Edit</button><button class="del-btn" onclick="deleteTransaction('${jsAttr(t.id)}')">Delete</button></div></td></tr>`).join('')}</tbody></table>`;
  }
  document.getElementById('txnTotal').textContent = filtered.reduce((s, t) => s + Number(t.amount), 0).toFixed(2);
  scrollTableToBottom('transactionTableWrap');
}
async function addOrUpdateTransaction(){
  const user = await getCurrentUser(); if (!user) return showBottomMessage("User is not logged in", "error");
  const fromInput = document.getElementById('txnFrom'), toInput = document.getElementById('txnTo'), amtInput = document.getElementById('txnAmount');
  if (!fromInput.checkValidity() ||!toInput.checkValidity() ||!amtInput.checkValidity()) { fromInput.reportValidity(); toInput.reportValidity(); amtInput.reportValidity(); return; }
  const from = capitalizeFirstLetter(fromInput.value.trim());
  const to = capitalizeFirstLetter(toInput.value.trim());
  const amount = parseFloat(amtInput.value);
  const date = document.getElementById('txnDate').value || todayISO();
  const btn = document.getElementById('txnDoneBtn'); btn.disabled = true; btn.textContent = editTransactionId!== null? 'Updating...' : 'Saving...';
  try {
    if (editTransactionId!== null) {
      const { error } = await supabaseClient.from('transactions').update({ payer: from, receiver: to, amount, date_iso: date }).eq('id', editTransactionId).eq('user_id', user.id);
      if (error) throw error; showBottomMessage("Transaction updated", "success"); editTransactionId = null;
    } else {
      const { error } = await supabaseClient.from('transactions').insert({ payer: from, receiver: to, amount, date_iso: date, is_received: false, received_date_iso: null, user_id: user.id });
      if (error) throw error; showBottomMessage("Transaction added", "success");
    }
    fromInput.value = ''; toInput.value = ''; amtInput.value = ''; 
    document.getElementById('txnDate').value = todayISO();
    updateDateDisplay('txnDate','txnDateText');
    await loadTransactions();
    setTimeout(()=>{ document.getElementById('txnFrom')?.focus(); }, 100);
  } catch (err) { showBottomMessage(err.message, "error"); } finally { btn.disabled = false; btn.textContent = 'Done'; }
}
function editTransaction(id){ const item = transactions.find(t => String(t.id) === String(id)); if (!item) return; document.getElementById('txnFrom').value = item.payer; document.getElementById('txnTo').value = item.receiver; document.getElementById('txnAmount').value = item.amount; document.getElementById('txnDate').value = item.date_iso; updateDateDisplay('txnDate', 'txnDateText'); editTransactionId = item.id; document.getElementById('txnDoneBtn').textContent = 'Update'; }
function deleteTransaction(id){ openDeleteDialog('transaction', id); }
async function performDeleteTransaction(id){ if (await deleteRow('transactions', id)) { if (String(editTransactionId) === String(id)) { editTransactionId = null; document.getElementById('txnDoneBtn').textContent = 'Done'; } showBottomMessage("Transaction deleted", "success"); await loadTransactions(); } }
async function toggleReceived(id, isChecked){ const user = await getCurrentUser(); if (!user) return; const { error } = await supabaseClient.from('transactions').update({ is_received: isChecked, received_date_iso: isChecked? todayISO() : null }).eq('id', id).eq('user_id', user.id); if (error) return showBottomMessage(error.message, "error"); await loadTransactions(); }

// ---------- GROUP - UPAD / LEDGER ----------
var groupRecords = [];
var editGroupId = null;
var pendingAddAmount = { person: null, group: null };
var expandedGroups = {}; // person_key => true/false for View toggle
async function loadGroups(){
  // Try Supabase table group_records, if not exists fallback to localStorage
  try{
    const user = await getCurrentUser();
    if(user){
      const { data, error } = await supabaseClient.from('group_records').select('*').eq('user_id', user.id).order('date_iso', {ascending:true});
      if(!error && data){ groupRecords = data; }
      else{
        // Fallback to localStorage
        let enc = localStorage.getItem('__g_r');
        if(enc){ groupRecords = JSON.parse(_decData(enc)||"[]"); }
        else{ groupRecords = []; }
      }
    }
  }catch(e){
    let enc = localStorage.getItem('__g_r');
    if(enc){ try{ groupRecords = JSON.parse(_decData(enc)||"[]"); }catch(_){ groupRecords=[]; } }
  }
  fillGroupSelects();
  renderGroups();
}
function handleGroupChange(){
  let sel = document.getElementById('grpGroup');
  if(!sel) return;
  if(sel.value === NEW_GROUP_LABEL){
    document.getElementById('newGroupDialog')?.classList.add('active');
    document.getElementById('newGroupInput').value = "";
    setTimeout(()=>document.getElementById('newGroupInput').focus(),100);
    return;
  }
  let grp = sel.value;
  let personInput = document.getElementById('grpPerson');
  let amtInput = document.getElementById('grpAmount');
  if(personInput) personInput.placeholder = "Enter Name";
  if(amtInput) amtInput.placeholder = "Amount";
  document.getElementById('grpGroupName').textContent = grp;
  // Reset person filter when group changes
  let pf = document.getElementById('grpPersonFilter');
  if(pf) pf.value = "Select Name";
  // Clear expanded
  expandedGroups = {};
  renderGroups();
}
function toggleGroupView(personKey){
  expandedGroups[personKey] = !expandedGroups[personKey];
  renderGroups();
}
function renderGroups(){
  const wrap = document.getElementById('groupTableWrap');
  if(!wrap) return;
  const grpFilter = document.getElementById('grpGroup')?.value || "Upad";
  const search = (document.getElementById('grpSearch')?.value || "").trim().toLowerCase();
  const personFilter = document.getElementById('grpPersonFilter')?.value || "Select Name";
  // First get all persons for current group to fill Select Name dropdown (today's data pan but dropdown ma badha dekhadvo for selection)
  let allForGroup = groupRecords.filter(g=> g.group_name === grpFilter);
  let uniquePersons = [...new Set(allForGroup.map(g=>g.person_name))].sort();
  // Fill dropdown if needed
  let personSel = document.getElementById('grpPersonFilter');
  if(personSel){
    let currentVal = personSel.value;
    let htmlOptions = `<option value="Select Name">Select Name</option>`;
    uniquePersons.forEach(p=>{ htmlOptions += `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`; });
    // Only rebuild if changed to avoid losing focus
    if(personSel.options.length !== uniquePersons.length+1 || personSel.innerHTML !== htmlOptions){
      personSel.innerHTML = htmlOptions;
      if(currentVal && [...personSel.options].some(o=>o.value===currentVal)) personSel.value = currentVal;
    }
    // Auto-fill Enter Name when Select Name chosen
    if(personSel.value !== "Select Name" && personSel.value !== ""){
      let enterNameInput = document.getElementById('grpPerson');
      if(enterNameInput && !editGroupId){
        enterNameInput.value = personSel.value;
      }
    }
  }

  const selectedDate = document.getElementById('grpDate')?.value || todayISO();
  let filtered = groupRecords.filter(g=>{
    if(grpFilter !== NEW_GROUP_LABEL && g.group_name !== grpFilter) return false;
    if(g.date_iso !== selectedDate) return false; // Selected date no data - aaj default, badlo to badleli date no data
    if(personFilter !== "Select Name" && personFilter !== "" && g.person_name !== personFilter) return false;
    if(search && !(g.person_name||'').toLowerCase().includes(search)) return false;
    return true;
  });
  // Group by person_name + group_name
  let grouped = {};
  filtered.forEach(rec=>{
    let key = rec.person_name.toLowerCase() + "|" + rec.group_name;
    if(!grouped[key]) grouped[key] = { person: rec.person_name, group: rec.group_name, key: key, records: [] };
    grouped[key].records.push(rec);
  });
  let personKeys = Object.keys(grouped).sort();
  if(personKeys.length===0){
    wrap.innerHTML = `<div class="empty-note">No ${grpFilter} records. ${personFilter!=='Select Name'?personFilter:search||'all'}</div>`;
    document.getElementById('grpTotal').textContent = "0.00";
    return;
  }
  let html = `<table class="entries"><thead><tr><th style="text-align:center;">Date</th><th style="text-align:center;">Name</th><th style="text-align:center;">Action</th></tr></thead><tbody>`;
  let total = 0;
  personKeys.forEach(key=>{
    let g = grouped[key];
    g.records.sort((a,b)=> new Date(a.date_iso) - new Date(b.date_iso));
    let personTotal = g.records.reduce((s,r)=>s+Number(r.amount||0),0);
    total += personTotal;
    let firstDate = g.records[0]?.date_iso ? formatDate(g.records[0].date_iso) : "-";
    let isExpanded = !!expandedGroups[key];
    html += `<tr style="background:#e0f2fe; border-top:2px solid #0284c7;">
      <td style="text-align:center; font-weight:600;">${firstDate}</td>
      <td style="text-align:center; font-weight:800; font-size:15px;">${escapeHtml(g.person)}</td>
      <td style="text-align:center;">
        <div class="action-btns" style="justify-content:center; flex-wrap:wrap; gap:4px;">
          <button class="edit-btn" style="background:#0284c7; color:white; border:none; border-radius:6px; padding:5px 9px; font-size:11px; font-weight:bold;" onclick="openAddAmountDialog('${jsAttr(g.person)}','${jsAttr(g.group)}')">+Add</button>
          <button class="edit-btn" style="background:#f59e0b; color:white; border:none; border-radius:6px; padding:5px 9px; font-size:11px;" onclick="toggleGroupView('${jsAttr(key)}')">${isExpanded?'Hide':'View'}</button>
          <button class="edit-btn" onclick="editGroupFirst('${jsAttr(key)}')">Edit</button>
          <button class="del-btn" onclick="deleteGroupPerson('${jsAttr(key)}')">Delete</button>
        </div>
      </td>
    </tr>`;
    if(isExpanded){
      // Show all records for this person
      g.records.forEach((rec)=>{
        html += `<tr style="background:#f8fafc;">
          <td style="text-align:center; color:#475569; font-size:13px;">${formatDate(rec.date_iso)}</td>
          <td style="text-align:center; color:#334155; font-size:13px;">₹${Number(rec.amount).toFixed(2)} <span style="color:#94a3b8; font-size:11px;">(${escapeHtml(rec.group_name)})</span></td>
          <td style="text-align:center;">
            <div class="action-btns" style="justify-content:center; gap:4px;">
              <button class="edit-btn" style="padding:3px 7px; font-size:11px;" onclick="editGroup('${jsAttr(rec.id)}')">Edit</button>
              <button class="del-btn" style="padding:3px 7px; font-size:11px;" onclick="deleteGroup('${jsAttr(rec.id)}')">Del</button>
            </div>
          </td>
        </tr>`;
      });
      html += `<tr style="background:#fef3c7;"><td colspan="3" style="text-align:center; font-weight:800; padding:8px;">Total ${escapeHtml(g.person)} = ₹${personTotal.toFixed(2)}</td></tr>`;
    }
  });
  html += `</tbody></table>`;
  wrap.innerHTML = html;
  document.getElementById('grpTotal').textContent = total.toFixed(2);
  document.getElementById('grpGroupName').textContent = grpFilter;
  scrollTableToBottom('groupTableWrap');
}
function editGroupFirst(personKey){
  // Edit first record of person as main
  let parts = personKey.split('|');
  let personName = parts[0];
  // Find first record matching personKey
  let rec = groupRecords.find(r=> (r.person_name.toLowerCase()+"|"+r.group_name)===personKey);
  if(rec) editGroup(rec.id);
}
function deleteGroupPerson(personKey){
  // Delete all records for this person+group
  if(!confirm(`Delete all records for ${personKey.split('|')[0]}?`)) return;
  let toDelete = groupRecords.filter(r=> (r.person_name.toLowerCase()+"|"+r.group_name)===personKey);
  toDelete.forEach(r=>{
    performDeleteGroup(r.id);
  });
}
var isGroupSaving = false;
async function addOrUpdateGroup(){
  if(isGroupSaving) return;
  isGroupSaving = true;
  const user = await getCurrentUser(); if(!user){ isGroupSaving=false; return showBottomMessage("Login nathi","error"); }
  const person = capitalizeFirstLetter(document.getElementById('grpPerson').value.trim());
  const amount = parseFloat(document.getElementById('grpAmount').value);
  const date = document.getElementById('grpDate').value || todayISO();
  let grpSel = document.getElementById('grpGroup')?.value || "Upad";
  if(grpSel === NEW_GROUP_LABEL){ isGroupSaving=false; return handleGroupChange(); }
  if(!person){ isGroupSaving=false; return showBottomMessage("Person Name lakho","error"); }
  if(!amount || amount<=0){ isGroupSaving=false; return showBottomMessage("Amount lakho","error"); }
  const btn = document.getElementById('grpDoneBtn'); btn.disabled=true; btn.textContent='Saving...';
  try{
    if(editGroupId !== null){
      // Update local first - important for date fix
      let idx = groupRecords.findIndex(r=>String(r.id)===String(editGroupId));
      if(idx>=0){
        groupRecords[idx].person_name=person;
        groupRecords[idx].amount=amount;
        groupRecords[idx].date_iso=date;
        groupRecords[idx].group_name=grpSel;
      }
      try{ localStorage.setItem('__g_r', _encData(JSON.stringify(groupRecords))); }catch(_){}
      // Then try Supabase
      try{
        const { error } = await supabaseClient.from('group_records').update({ person_name: person, amount, date_iso: date, group_name: grpSel }).eq('id', editGroupId).eq('user_id', user.id);
        if(error) throw error;
      }catch(e){
        console.log("Supabase group update fallback", e.message);
      }
      showBottomMessage("Group Updated","success"); editGroupId=null;
    }else{
      let newRec = { id: Date.now().toString(), person_name: person, amount, date_iso: date, group_name: grpSel, user_id: user.id };
      try{
        const { data, error } = await supabaseClient.from('group_records').insert({ person_name: person, amount, date_iso: date, group_name: grpSel, user_id: user.id }).select();
        if(error) throw error;
        if(data && data[0]) newRec = data[0];
      }catch(e){
        // fallback local will be handled below
      }
      // Always push to local
      if(!groupRecords.find(r=>String(r.id)===String(newRec.id))){
        groupRecords.push(newRec);
      }
      try{ localStorage.setItem('__g_r', _encData(JSON.stringify(groupRecords))); }catch(_){}
      showBottomMessage(`${person} - ${grpSel} ₹${amount} Added`,"success");
    }
    document.getElementById('grpPerson').value=''; document.getElementById('grpAmount').value=''; document.getElementById('grpDate').value=todayISO(); updateDateDisplay('grpDate','grpDateText');
    renderGroups();
    // Focus redirect to Enter Name
    setTimeout(()=>{ document.getElementById('grpPerson')?.focus(); }, 200);
  }catch(err){ showBottomMessage(err.message,"error"); }
  finally{ btn.disabled=false; btn.textContent='Done'; isGroupSaving=false; }
}
function editGroup(id){
  const rec = groupRecords.find(r=>String(r.id)===String(id)); if(!rec) return;
  document.getElementById('grpPerson').value = rec.person_name;
  document.getElementById('grpAmount').value = rec.amount;
  document.getElementById('grpDate').value = rec.date_iso;
  document.getElementById('grpGroup').value = rec.group_name;
  updateDateDisplay('grpDate','grpDateText');
  editGroupId = rec.id;
  document.getElementById('grpDoneBtn').textContent='Update';
  handleGroupChange();
}
function deleteGroup(id){ openDeleteDialog('group', id); }
async function performDeleteGroup(id){
  try{
    const user = await getCurrentUser();
    if(user){ await supabaseClient.from('group_records').delete().eq('id', id).eq('user_id', user.id); }
  }catch(e){}
  groupRecords = groupRecords.filter(r=>String(r.id)!==String(id));
  try{ localStorage.setItem('__g_r', _encData(JSON.stringify(groupRecords))); }catch(_){}
  if(String(editGroupId)===String(id)){ editGroupId=null; document.getElementById('grpDoneBtn').textContent='Done'; }
  showBottomMessage("Group record deleted","success");
  renderGroups();
}
function openAddAmountDialog(person, group){
  pendingAddAmount.person = person; pendingAddAmount.group = group;
  document.getElementById('addAmountPerson').textContent = person;
  document.getElementById('addAmountGroup').textContent = group;
  document.getElementById('addAmountInput').value = '';
  document.getElementById('addAmountDialog')?.classList.add('active');
  setTimeout(()=>document.getElementById('addAmountInput').focus(),100);
}
function closeAddAmountDialog(){
  pendingAddAmount.person=null; pendingAddAmount.group=null;
  document.getElementById('addAmountDialog')?.classList.remove('active');
}
async function confirmAddAmount(){
  const amount = parseFloat(document.getElementById('addAmountInput').value);
  if(!amount || amount<=0) return showBottomMessage("Amount lakho","error");
  const person = pendingAddAmount.person; const group = pendingAddAmount.group;
  if(!person || !group) return;
  const user = await getCurrentUser(); if(!user) return;
  let newRec = { id: Date.now().toString(), person_name: person, amount, date_iso: todayISO(), group_name: group, user_id: user.id };
  try{
    const { data, error } = await supabaseClient.from('group_records').insert({ person_name: person, amount, date_iso: todayISO(), group_name: group, user_id: user.id }).select();
    if(!error && data && data[0]) newRec = data[0];
  }catch(e){}
  groupRecords.push(newRec);
  try{ localStorage.setItem('__g_r', _encData(JSON.stringify(groupRecords))); }catch(_){}
  closeAddAmountDialog();
  showBottomMessage(`${person} ma ₹${amount} add thaiyu`,"success");
  renderGroups();
}
// Group create/delete dialogs
function closeNewGroupDialog(){ document.getElementById('newGroupDialog')?.classList.remove('active'); }
function confirmNewGroup(){
  let name = document.getElementById('newGroupInput').value.trim();
  if(!name) return showBottomMessage("Group name lakho","error");
  name = name.charAt(0).toUpperCase() + name.slice(1);
  let custom = []; try{ let enc = localStorage.getItem('__g_a'); if(enc) custom = JSON.parse(_decData(enc)||"[]"); }catch(e){}
  let hidden = []; try{ let enc = localStorage.getItem('__g_h'); if(enc) hidden = JSON.parse(_decData(enc)||"[]"); }catch(e){}
  if(hidden.includes(name)){
    hidden = hidden.filter(c=>c!==name);
    _saveHiddenGroups(hidden);
    fillGroupSelects();
    document.getElementById('grpGroup').value = name;
    closeNewGroupDialog();
    showBottomMessage(`"${name}" group restore thai gayu`,"success");
    renderGroups(); return;
  }
  if(getAllGroupsFiltered().map(c=>c.toLowerCase()).includes(name.toLowerCase())){
    showBottomMessage("Group already exists","error"); return;
  }
  custom.push(name);
  _saveCustomGroups(custom);
  fillGroupSelects();
  document.getElementById('grpGroup').value = name;
  document.getElementById('newGroupDialog')?.classList.remove('active');
  showBottomMessage(`Group "${name}" Created`,"success");
  handleGroupChange();
}
function openDeleteGroupDialog(){
  let groups = getAllGroupsFiltered();
  let sel = document.getElementById('deleteGroupSelect');
  let listDiv = document.getElementById('customGroupList');
  let boxVal = document.getElementById('customGroupValue');
  if(!sel || !listDiv) return;
  sel.innerHTML = "";
  listDiv.innerHTML = "";
  groups.forEach(g=>{
    let opt = document.createElement('div');
    opt.textContent = g;
    opt.style.padding = "10px"; opt.style.cursor="pointer"; opt.style.borderBottom="1px solid #eee"; opt.style.textAlign="center"; opt.style.fontWeight="600";
    opt.onclick = ()=>{ selectCustomGroup(g); };
    listDiv.appendChild(opt);
    sel.add(new Option(g,g));
  });
  if(groups.length>0){ sel.value = groups[0]; boxVal.textContent = groups[0]; }
  document.getElementById('deleteGroupDialog')?.classList.add('active');
}
function selectCustomGroup(val){
  document.getElementById('customGroupValue').textContent = val;
  document.getElementById('deleteGroupSelect').value = val;
  document.getElementById('customGroupList').style.display='none';
  let box = document.getElementById('customGroupBox');
  if(box){ box.style.background="#a16207"; box.style.color="white"; }
}
function toggleCustomGroupList(){
  let list = document.getElementById('customGroupList');
  list.style.display = list.style.display==='none'||list.style.display==='' ? 'block' : 'none';
}
function closeDeleteGroupDialog(){ document.getElementById('deleteGroupDialog')?.classList.remove('active'); document.getElementById('customGroupList').style.display='none'; }
async function confirmDeleteGroup(){
  let grpToDelete = document.getElementById('deleteGroupSelect').value;
  if(!grpToDelete) return;
  // Delete all records of this group
  try{
    const user = await getCurrentUser();
    if(user){ await supabaseClient.from('group_records').delete().eq('group_name', grpToDelete).eq('user_id', user.id); }
  }catch(e){}
  groupRecords = groupRecords.filter(r=>r.group_name !== grpToDelete);
  try{ localStorage.setItem('__g_r', _encData(JSON.stringify(groupRecords))); }catch(_){}
  // Move group to hidden
  let custom = []; try{ let enc = localStorage.getItem('__g_a'); if(enc) custom = JSON.parse(_decData(enc)||"[]"); }catch(e){}
  if(custom.includes(grpToDelete)){
    custom = custom.filter(c=>c!==grpToDelete);
    _saveCustomGroups(custom);
  }else{
    let hidden = []; try{ let enc = localStorage.getItem('__g_h'); if(enc) hidden = JSON.parse(_decData(enc)||"[]"); }catch(e){}
    if(!hidden.includes(grpToDelete)) hidden.push(grpToDelete);
    _saveHiddenGroups(hidden);
  }
  fillGroupSelects(); renderGroups();
  closeDeleteGroupDialog();
  showBottomMessage(`"${grpToDelete}" Group and Records Deleted`,"success");
}

// ---------- FILTER ----------
let filterType = 'expense';
let repayFilter = 'all';
function updateFilterDateDisplay(){
  const val = document.getElementById('filterDate')?.value;
  const txt = document.getElementById('filterDateText');
  if(!txt) return;
  if(val) txt.textContent = `📅 ${formatDate(val)}`;
  else txt.textContent = `📅 Select Date`;
}
function clearFilterDate(){
  const inp = document.getElementById('filterDate');
  if(inp) inp.value = '';
  updateFilterDateDisplay();
  renderFilterResults();
}
function openFilter(fromScreen) {
  profileDashboardBackScreen = fromScreen;
  document.querySelectorAll('.user-menu').forEach(menu => menu.classList.remove('active'));
  filterType = fromScreen; repayFilter = 'all';
  const titleEl = document.getElementById('filterTitle');
  if (titleEl){
    if(filterType === 'transaction') titleEl.textContent = 'Filter Your Transaction Data';
    else if(filterType === 'group') titleEl.textContent = 'Filter Grouping Data';
    else titleEl.textContent = 'Filter Your Expense Data';
  }
  fillMonthYear('filterMonth', 'filterYear', true);
  fillCategorySelects();
  fillGroupSelectsForFilter();
  document.getElementById('filterSearch').value = '';
  // Reset date filter to empty by default - shows whole month's all dates
  const dateInp = document.getElementById('filterDate');
  if(dateInp) { dateInp.value = ''; }
  updateFilterDateDisplay();
  const repayRow = document.getElementById('repayFilterRow');
  const categoryPill = document.getElementById('filterCategory')?.closest('.select-pill');
  const groupPill = document.getElementById('filterGroupWrap');
  if (filterType === 'transaction') {
    if (repayRow) repayRow.style.display = 'flex';
    if (categoryPill) categoryPill.style.display = 'none';
    if (groupPill) groupPill.style.display = 'none';
    document.querySelectorAll('#repayFilterRow button').forEach(b => b.classList.remove('selected'));
    document.getElementById('btnAllRepay')?.classList.add('selected');
  } else if(filterType === 'group'){
    if (repayRow) repayRow.style.display = 'none';
    if (categoryPill) categoryPill.style.display = 'none';
    if (groupPill) groupPill.style.display = '';
  } else {
    if (repayRow) repayRow.style.display = 'none';
    if (categoryPill) categoryPill.style.display = '';
    if (groupPill) groupPill.style.display = 'none';
  }
  showScreen('filter');
  renderFilterResults();
}
function fillGroupSelectsForFilter(){
  let groups = getAllGroupsFiltered();
  let sel = document.getElementById('filterGroup');
  if(!sel) return;
  let prev = sel.value || "All Groups";
  sel.innerHTML = "";
  sel.add(new Option("All Groups", "All Groups"));
  groups.forEach(g => sel.add(new Option(g, g)));
  if(["All Groups", ...groups].includes(prev)) sel.value = prev; else sel.value = "All Groups";
}
function setRepayFilter(type) {
  repayFilter = type;
  document.querySelectorAll('#repayFilterRow button').forEach(b => b.classList.remove('selected'));
  if (type === 'all') document.getElementById('btnAllRepay')?.classList.add('selected');
  if (type === 'completed') document.getElementById('btnRepayCompleted')?.classList.add('selected');
  if (type === 'remaining') document.getElementById('btnRemaining')?.classList.add('selected');
  renderFilterResults();
}
function renderFilterResults(){
  const monthVal = document.getElementById('filterMonth')?.value;
  const yearVal = document.getElementById('filterYear')?.value;
  const search = (document.getElementById('filterSearch')?.value || '').trim().toLowerCase();
  const catFilter = document.getElementById('filterCategory')?.value || "All Categories";
  const grpFilter = document.getElementById('filterGroup')?.value || "All Groups";
  const filterDateVal = document.getElementById('filterDate')?.value || '';
  const wrap = document.getElementById('filterTableWrap');
  const totalBox = document.getElementById('filterTotalBox');
  let filtered = [];
  // Helper for date filter: if filterDate selected, only that date, else whole month (no date filter)
  function passesDateFilter(date_iso){
    if(!filterDateVal) return true; // No date selected -> show whole month (all dates of that month)
    return date_iso === filterDateVal;
  }
  if (filterType === 'expense') {
    filtered = expenses.filter(e => {
      const p = parseISODate(e.date_iso);
      if(!p) return false;
      const mMatch = monthVal === 'all' || monthVal === 'overall' || p.month === parseInt(monthVal);
      const yMatch = yearVal === 'all' || yearVal === 'overall' || p.year === parseInt(yearVal);
      if(!mMatch || !yMatch) return false;
      if(!passesDateFilter(e.date_iso)) return false;
      if(catFilter!== "All Categories" && catFilter !== NEW_CAT_LABEL && (e.category||'Others')!== catFilter) return false;
      if(search &&!(e.name||'').toLowerCase().includes(search) &&!(e.category||'').toLowerCase().includes(search)) return false;
      return true;
    });
    if (filtered.length === 0) { wrap.innerHTML = `<div class="empty-note">No matching records.</div>`; totalBox.innerHTML = 'Total : ₹0.00'; return; }
    const rows = filtered.map(e => { const parsed = parseExpenseName(e.name); return `<tr><td class="col-date">${formatDate(e.date_iso)}</td><td class="col-name">${escapeHtml(e.category||'Others')}</td><td class="col-name">${escapeHtml(parsed.displayName || e.name)}</td><td class="col-amount">₹${Number(e.amount).toFixed(2)}</td></tr>`; }).join('');
    wrap.innerHTML = `<table class="entries"><thead><tr><th class="col-date">Date</th><th class="col-name">Category</th><th class="col-name">Name</th><th class="col-amount">Amount</th></tr></thead><tbody>${rows}</tbody></table>`;
    totalBox.innerHTML = `Total (${catFilter}) : ₹${filtered.reduce((s,e)=>s+Number(e.amount||0),0).toFixed(2)}`;
  } else if(filterType === 'group'){
    // Group filter with month/year and group select + date filter
    filtered = groupRecords.filter(g=>{
      const p = parseISODate(g.date_iso);
      if(!p) return false;
      const mMatch = monthVal === 'all' || monthVal === 'overall' || p.month === parseInt(monthVal);
      const yMatch = yearVal === 'all' || yearVal === 'overall' || p.year === parseInt(yearVal);
      if(!mMatch || !yMatch) return false;
      if(!passesDateFilter(g.date_iso)) return false;
      if(grpFilter !== "All Groups" && g.group_name !== grpFilter) return false;
      if(search && !(g.person_name||'').toLowerCase().includes(search) && !(g.group_name||'').toLowerCase().includes(search)) return false;
      return true;
    });
    if (filtered.length === 0) { wrap.innerHTML = `<div class="empty-note">No grouping records.</div>`; totalBox.innerHTML = 'Total : ₹0.00'; return; }
    // Grouped display like main grouping screen but for filter - person wise
    let grouped = {};
    filtered.forEach(rec=>{
      let key = rec.person_name.toLowerCase() + "|" + rec.group_name;
      if(!grouped[key]) grouped[key] = { person: rec.person_name, group: rec.group_name, records: [] };
      grouped[key].records.push(rec);
    });
    let personKeys = Object.keys(grouped).sort();
    let html = "";
    let grandTotal = 0;
    personKeys.forEach(key=>{
      let g = grouped[key];
      g.records.sort((a,b)=> new Date(a.date_iso) - new Date(b.date_iso));
      let personTotal = g.records.reduce((s,r)=>s+Number(r.amount||0),0);
      grandTotal += personTotal;
      html += `<div style="margin:10px 0; border:2px solid #0284c7; border-radius:12px; overflow:hidden;">
        <div style="background:#0284c7; color:white; text-align:center; padding:8px; font-weight:800; font-size:16px;">${escapeHtml(g.person)} [${escapeHtml(g.group)}]</div>
        <table class="entries" style="margin:0;"><tbody>`;
      g.records.forEach(rec=>{
        html += `<tr><td style="text-align:center;">${formatDate(rec.date_iso)}</td><td style="text-align:center;">₹${Number(rec.amount).toFixed(2)}</td><td style="text-align:center;">${escapeHtml(rec.group_name)}</td></tr>`;
      });
      html += `</tbody></table><div style="background:#fef3c7; text-align:center; padding:6px; font-weight:800;">Total ${escapeHtml(g.person)} = ₹${personTotal.toFixed(2)}</div></div>`;
    });
    wrap.innerHTML = html;
    totalBox.innerHTML = `Total (${grpFilter}) : ₹${grandTotal.toFixed(2)}`;
  } else {
    filtered = transactions.filter(t => {
      const p = parseISODate(t.date_iso);
      if(!p) return false;
      const mMatch = monthVal === 'all' || monthVal === 'overall' || p.month === parseInt(monthVal);
      const yMatch = yearVal === 'all' || yearVal === 'overall' || p.year === parseInt(yearVal);
      if(!mMatch || !yMatch) return false;
      if(!passesDateFilter(t.date_iso)) return false;
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

// ---------- DASHBOARD ----------
function computeDashboardTotals(month, year) {
  const totalExpense = expenses.reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalTransaction = transactions.reduce((s, i) => s + Number(i.amount || 0), 0);
  const fE = expenses.filter(i => { const p = parseISODate(i.date_iso); return p && p.month === month && p.year === year; });
  const fT = transactions.filter(i => { const p = parseISODate(i.date_iso); return p && p.month === month && p.year === year; });
  return { totalExpense, totalTransaction, monthExpenseTotal: fE.reduce((s, i) => s + Number(i.amount || 0), 0), monthTransactionTotal: fT.reduce((s, i) => s + Number(i.amount || 0), 0) };
}
function applyDashboardFilter() {
  const monthVal = document.getElementById('dashMonth').value;
  const yearVal = document.getElementById('dashYear').value;
  if(monthVal === 'all' || yearVal === 'all'){ renderDashboardOverall(); return; }
  const month = parseInt(monthVal, 10);
  const year = parseInt(yearVal, 10);
  renderDashboard(month, year);
}
function renderDashboardOverall(){
  const totalExpense = expenses.reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalTransaction = transactions.reduce((s, i) => s + Number(i.amount || 0), 0);
  if (document.getElementById('dashboardTotalExpense')) document.getElementById('dashboardTotalExpense').textContent = totalExpense.toFixed(2);
  if (document.getElementById('dashboardTotalTransaction')) document.getElementById('dashboardTotalTransaction').textContent = totalTransaction.toFixed(2);
  if (document.getElementById('dashboardMonthExpense')) document.getElementById('dashboardMonthExpense').textContent = totalExpense.toFixed(2);
  if (document.getElementById('dashboardMonthTransaction')) document.getElementById('dashboardMonthTransaction').textContent = totalTransaction.toFixed(2);
  if (document.getElementById('dashMonthExpenseTitle')) document.getElementById('dashMonthExpenseTitle').textContent = `Overall Expense`;
  if (document.getElementById('dashMonthTransactionTitle')) document.getElementById('dashMonthTransactionTitle').textContent = `Overall Transaction`;
  createChart('expenseChart', getMonthlyTotals(expenses), '#ef4444');
  createChart('transactionChart', getMonthlyTotals(transactions), '#3b82f6');
  renderDashboardSummary(new Date().getMonth(), new Date().getFullYear(), {totalExpense, totalTransaction, monthExpenseTotal: totalExpense, monthTransactionTotal: totalTransaction});
}
function getMonthlyTotals(data) { const totals = new Array(12).fill(0); data.forEach(item => { const p = parseISODate(item.date_iso); if (p) totals[p.month] += Number(item.amount || 0); }); return totals; }
function createChart(containerId, values, color = '#3b82f6') { const container = document.getElementById(containerId); if (!container) return; const maxValue = Math.max(...values, 1); container.innerHTML = `<div class="dashboard-chart">${values.map((value, index) => `<div class="chart-row"><div class="chart-month">${monthNames[index].slice(0, 3)}</div><div class="chart-bar-area"><div class="chart-bar" style="width:${value > 0? Math.max((value / maxValue) * 100, 3) : 0}%; background:${color};"></div></div><div class="chart-value">₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div></div>`).join('')}</div>`; }
function getHighestMonth(data) { const totals = getMonthlyTotals(data); const max = Math.max(...totals); if (max <= 0) return { month: '-', amount: 0 }; return { month: monthNames[totals.indexOf(max)], amount: max }; }
function renderDashboardSummary(month, year, totals) {
  const el = document.getElementById('dashboardSummary'); if (!el) return;
  const { totalExpense, totalTransaction, monthExpenseTotal, monthTransactionTotal } = totals;
  const currentLabel = `${monthNames[month]} ${year}`;
  let catTotals = {};
  expenses.forEach(e => { let c = e.category || 'Others'; catTotals[c] = (catTotals[c]||0)+Number(e.amount||0); });
  let catHtml = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).map(([cat,amt])=>`<div class="summary-item"><span class="summary-icon">📦</span><div><div class="summary-label">${escapeHtml(cat)}</div><strong>₹${amt.toFixed(2)}</strong></div></div>`).join('');
  el.innerHTML = `<div class="summary-grid">
    <div class="summary-item"><span class="summary-icon">🧾</span><div><div class="summary-label">Total Expense Records</div><strong>${expenses.length}</strong></div></div>
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

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', async () => {
  if (!navigator.onLine) { showOfflineScreen(); return; }
  fillMonthYear('expMonth', 'expYear'); fillMonthYear('txnMonth', 'txnYear'); fillCategorySelects(); fillGroupSelects();
  const todayStr = todayISO();
  const expDateEl = document.getElementById('expDate'); const txnDateEl = document.getElementById('txnDate'); const grpDateEl = document.getElementById('grpDate');
  if(expDateEl) expDateEl.value = todayStr; if(txnDateEl) txnDateEl.value = todayStr; if(grpDateEl) grpDateEl.value = todayStr;
  const expDateText = document.getElementById('expDateText'); const txnDateText = document.getElementById('txnDateText'); const grpDateText = document.getElementById('grpDateText');
  if(expDateText) expDateText.textContent = formatDate(todayStr); if(txnDateText) txnDateText.textContent = formatDate(todayStr); if(grpDateText) grpDateText.textContent = formatDate(todayStr);
  const expNameEl = document.getElementById('expName');
  if(expNameEl){
    expNameEl.addEventListener('blur', function(){
      let val = this.value.trim();
      if(!val || isNaN(val)) return;
      let cat = document.getElementById('expCategoryFilter')?.value?.toLowerCase() || '';
      if(cat === 'cement') this.value = `${val} Bags`;
      else if(cat === 'petrol') this.value = `${val} Liter`;
    });
  }
  document.getElementById('expCategoryFilter')?.addEventListener('change', ()=>handleExpenseCategoryChange());
  document.getElementById('grpGroup')?.addEventListener('change', ()=>handleGroupChange());
  document.getElementById('filterCategory')?.addEventListener('change', ()=>{
    if(document.getElementById('filterCategory').value===NEW_CAT_LABEL) handleCategorySelectChange('filterCategory');
    else renderFilterResults();
  });
  document.getElementById('filterGroup')?.addEventListener('change', ()=>renderFilterResults());
  // Enter key support for New Category/Group dialogs and Delete dialogs
  document.getElementById('newCategoryInput')?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); confirmNewCategory(); } });
  document.getElementById('newGroupInput')?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); confirmNewGroup(); } });
  document.getElementById('addAmountInput')?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); confirmAddAmount(); } });
  // Delete Category/Group via Enter when select focused - listen on document for delete dialogs
  document.addEventListener('keydown', (e)=>{
    if(e.key==='Enter'){
      if(document.getElementById('newCategoryDialog')?.classList.contains('active')){ e.preventDefault(); confirmNewCategory(); }
      else if(document.getElementById('newGroupDialog')?.classList.contains('active')){ e.preventDefault(); confirmNewGroup(); }
      else if(document.getElementById('deleteCategoryDialog')?.classList.contains('active')){ e.preventDefault(); confirmDeleteCategory(); }
      else if(document.getElementById('deleteGroupDialog')?.classList.contains('active')){ e.preventDefault(); confirmDeleteGroup(); }
      else if(document.getElementById('addAmountDialog')?.classList.contains('active')){ e.preventDefault(); confirmAddAmount(); }
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
function openDeleteDialog(type, id) { pendingDeleteType = type; pendingDeleteId = id; document.getElementById('deleteDialog')?.classList.add('active'); setTimeout(() => document.querySelector('#deleteDialog .confirm-delete-btn')?.focus(), 50); }
function closeDeleteDialog() { pendingDeleteType = null; pendingDeleteId = null; document.getElementById('deleteDialog')?.classList.remove('active'); }
async function confirmDelete() { if (!pendingDeleteType || pendingDeleteId === null) return closeDeleteDialog(); const type = pendingDeleteType, id = pendingDeleteId; closeDeleteDialog(); if (type === 'expense') await performDeleteExpense(id); if (type === 'transaction') await performDeleteTransaction(id); if (type === 'group') await performDeleteGroup(id); }
function openDeleteAccountDialog() { document.getElementById('deleteAccountDialog')?.classList.add('active'); }
function closeDeleteAccountDialog() { document.getElementById('deleteAccountDialog')?.classList.remove('active'); }
async function confirmDeleteAccount() { const user = await getCurrentUser(); if (!user) return closeDeleteAccountDialog(); const deleteBtn = document.querySelector('#deleteAccountDialog .confirm-delete-btn'); if (deleteBtn) { deleteBtn.disabled = true; deleteBtn.textContent = 'Deleting...'; } try { const { error } = await supabaseClient.rpc('delete_own_account'); if (error) throw error; expenses = []; transactions = []; await supabaseClient.auth.signOut(); closeDeleteAccountDialog(); showScreen('login'); showBottomMessage("Account and all data permanently deleted.", "success"); } catch (err) { showBottomMessage("Failed: " + err.message, "error"); if (deleteBtn) { deleteBtn.disabled = false; deleteBtn.textContent = 'Delete'; } } }

// ---------- PDF & EXCEL - IMAGE FORMAT ----------
async function downloadExpensePDF() {
  const monthVal = document.getElementById('expMonth')?.value || new Date().getMonth();
  const yearVal = document.getElementById('expYear')?.value || new Date().getFullYear();
  const catVal = document.getElementById('expCategoryFilter')?.value || "All";
  const userName = document.getElementById('homeUsername')?.innerText || document.getElementById('profileUsername')?.innerText || 'User';
  const monthNamesFull = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  let monthLabel = monthVal === 'all' ? 'Overall' : monthNamesFull[parseInt(monthVal)] || monthVal;
  let yearLabel = yearVal === 'all' ? '' : yearVal;
  let filtered = expenses.filter(e => {
    const p = parseISODate(e.date_iso); if(!p) return false;
    const mMatch = monthVal === 'all' || p.month === parseInt(monthVal);
    const yMatch = yearVal === 'all' || p.year === parseInt(yearVal);
    return mMatch && yMatch;
  });
  if(catVal !== 'All Categories' && catVal !== NEW_CAT_LABEL && catVal !== 'all'){
     if(catVal !== 'Others' || document.getElementById('expCategoryFilter')?.value === 'Others'){
        if(document.getElementById('expCategoryFilter')?.value === catVal || catVal !== 'Others'){
          if(monthVal !== 'all' || yearVal !== 'all' || catVal !== 'Others'){
            if(catVal !== 'Others') filtered = filtered.filter(e => (e.category||'Others') === catVal);
            else if(monthVal !== 'all' || yearVal !== 'all') filtered = filtered.filter(e => (e.category||'Others') === 'Others');
          }
        }
     }
  }
  if(monthVal === 'all' && yearVal === 'all' && catVal === 'Others'){
    filtered = expenses.filter(e => {
      const p = parseISODate(e.date_iso); if(!p) return false;
      return true;
    });
  }
  if(filtered.length === 0) return showBottomMessage("No data for PDF","error");
  filtered.sort((a,b)=> new Date(a.date_iso) - new Date(b.date_iso));
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const todayStr = new Date().toLocaleDateString('en-GB').replaceAll('/','-');
  doc.setFontSize(11); doc.setFont("helvetica","normal"); doc.setTextColor(0,0,0);
  doc.text(`Date: ${todayStr}`, pageWidth - 14, 10, {align:"right"});
  doc.setFontSize(18); doc.setFont("helvetica","bold");
  doc.text("Daily Expence", pageWidth/2, 22, {align:"center"});
  doc.setFontSize(13); doc.setFont("helvetica","bold"); doc.setTextColor(220, 38, 38);
  let monthYearText = `${monthLabel} ${yearLabel}`.trim(); if(monthVal === 'all' && yearVal === 'all') monthYearText = "Overall";
  doc.text(monthYearText, pageWidth/2, 30, {align:"center"});
  doc.setTextColor(0,0,0); doc.setFontSize(12); doc.setFont("helvetica","bold");
  doc.text(`Name:${userName}`, 14, 42);
  doc.text(`Category of Item:${catVal}`, pageWidth/2, 50, {align:"center"});
  const tableData = filtered.map((e, idx) => [idx+1, formatDate(e.date_iso), (e.name||'').substring(0,30), Number(e.amount).toFixed(2)]);
  doc.autoTable({
    startY: 56, head: [['Sr No', 'Date', 'Name', 'Amount']], body: tableData, theme: 'grid',
    styles: { halign: 'center', fontSize: 10, cellPadding: 3, lineColor: [0,0,0], lineWidth: 0.2 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', halign: 'center' },
    columnStyles: {0:{cellWidth:15},1:{cellWidth:35},2:{cellWidth:80},3:{cellWidth:40}}, margin: { left: 14, right: 14 }
  });
  const total = filtered.reduce((s,e)=>s+Number(e.amount||0),0);
  doc.setFontSize(12); doc.setFont("helvetica","bold"); doc.text(`Total: Rs ${total.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 18);
  doc.save(`Daily_Expence_${monthLabel}_${yearLabel}.pdf`);
}

function getFilteredExpensesForExport(){
  const monthVal = document.getElementById('expMonth')?.value || 'all';
  const yearVal = document.getElementById('expYear')?.value || 'all';
  const catVal = document.getElementById('expCategoryFilter')?.value || "All";
  let filtered = expenses.filter(e => {
    const p = parseISODate(e.date_iso); if(!p) return false;
    const mMatch = monthVal === 'all' || p.month === parseInt(monthVal);
    const yMatch = yearVal === 'all' || p.year === parseInt(yearVal);
    return mMatch && yMatch;
  });
  if(catVal !== 'All Categories' && catVal !== NEW_CAT_LABEL && catVal !== 'all' && catVal !== 'Others'){
    filtered = filtered.filter(e => (e.category||'Others') === catVal);
  } else if(catVal === 'Others' && monthVal !== 'all' && yearVal !== 'all'){
    // keep only Others when specific month/year
    if(document.getElementById('expMonth')?.value !== 'all' || document.getElementById('expYear')?.value !== 'all'){
      // optional - already filtered
    }
  }
  return filtered;
}

function downloadExpenseExcel(){
  const filtered = getFilteredExpensesForExport();
  if(filtered.length===0) return showBottomMessage("No data for Excel","error");
  const monthVal = document.getElementById('expMonth')?.value || 'all';
  const yearVal = document.getElementById('expYear')?.value || 'all';
  const monthNamesFull = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  let monthLabel = monthVal === 'all' ? 'Overall' : monthNamesFull[parseInt(monthVal)] || monthVal;

  const rows = filtered.map((e, idx)=>({
    "Sr No": idx+1,
    "Date": formatDate(e.date_iso),
    "Name": e.name,
    "Amount": Number(e.amount).toFixed(2),
    "Category": e.category||'Others'
  }));
  const total = filtered.reduce((s,e)=>s+Number(e.amount||0),0);
  rows.push({"Sr No":"", "Date":"", "Name":"Total", "Amount": total.toFixed(2), "Category":""});

  if(typeof XLSX !== 'undefined'){
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Expence");
    XLSX.writeFile(wb, `Daily_Expence_${monthLabel}_${yearVal}.xlsx`);
  } else {
    // fallback CSV
    let csv = "Sr No,Date,Name,Amount,Category\n";
    rows.forEach(r=>{ csv += `${r["Sr No"]},${r.Date},${r.Name.replace(/,/g,' ')},${r.Amount},${r.Category}\n`; });
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`Daily_Expence_${monthLabel}_${yearVal}.csv`; a.click();
  }
  showBottomMessage("Excel Downloaded", "success");
}

function downloadTransactionPDF(){
  const mVal = document.getElementById('txnMonth')?.value || 'all';
  const yVal = document.getElementById('txnYear')?.value || 'all';
  const monthNamesFull = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  let monthLabel = mVal === 'all' ? 'Overall' : monthNamesFull[parseInt(mVal)] || mVal;
  let yearLabel = yVal === 'all' ? '' : yVal;
  let filtered = transactions.filter(t => {
    const p = parseISODate(t.date_iso); if(!p) return false;
    const mMatch = mVal === 'all' || p.month === parseInt(mVal);
    const yMatch = yVal === 'all' || p.year === parseInt(yVal);
    return mMatch && yMatch;
  });
  if(filtered.length===0) return showBottomMessage("No data for PDF","error");
  filtered.sort((a,b)=> new Date(a.date_iso) - new Date(b.date_iso));
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const todayStr = new Date().toLocaleDateString('en-GB').replaceAll('/','-');
  doc.setFontSize(11); doc.setFont("helvetica","normal"); doc.text(`Date: ${todayStr}`, pageWidth-14, 10, {align:"right"});
  doc.setFontSize(18); doc.setFont("helvetica","bold"); doc.text("Money Transaction", pageWidth/2, 22, {align:"center"});
  doc.setFontSize(13); doc.setFont("helvetica","bold"); doc.setTextColor(220,38,38);
  let monthYearText = `${monthLabel} ${yearLabel}`.trim(); if(mVal==='all' && yVal==='all') monthYearText="Overall";
  doc.text(monthYearText, pageWidth/2, 30, {align:"center"});
  doc.setTextColor(0,0,0);
  const userName = document.getElementById('homeUsername')?.innerText || 'User';
  doc.setFontSize(12); doc.setFont("helvetica","bold"); doc.text(`Name:${userName}`, 14, 42);
  let body = filtered.map((t, idx)=>[idx+1, formatDate(t.date_iso), t.payer, t.receiver, Number(t.amount).toFixed(2)]);
  doc.autoTable({
    startY: 50, head: [['Sr No','Date','Payer','Receiver','Amount']], body: body, theme: 'grid',
    styles: { halign: 'center', fontSize: 10, cellPadding:3, lineColor:[0,0,0], lineWidth:0.2 },
    headStyles: { fillColor: [15,23,42], textColor:255 }, margin:{left:14,right:14}
  });
  let total = filtered.reduce((s,t)=>s+Number(t.amount),0);
  doc.setFontSize(12); doc.setFont("helvetica","bold"); doc.text(`Total: Rs ${total.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 18);
  doc.save(`Money_Transaction_${monthLabel}_${yearLabel}.pdf`);
}

function downloadTransactionExcel(){
  const mVal = document.getElementById('txnMonth')?.value || 'all';
  const yVal = document.getElementById('txnYear')?.value || 'all';
  let filtered = transactions.filter(t => {
    const p = parseISODate(t.date_iso); if(!p) return false;
    const mMatch = mVal === 'all' || p.month === parseInt(mVal);
    const yMatch = yVal === 'all' || p.year === parseInt(yVal);
    return mMatch && yMatch;
  });
  if(filtered.length===0) return showBottomMessage("No data for Excel","error");
  const rows = filtered.map((t, idx)=>({
    "Sr No": idx+1, "Date": formatDate(t.date_iso), "Payer": t.payer, "Receiver": t.receiver, "Amount": Number(t.amount).toFixed(2), "Repaid": t.is_received?'Yes':'No'
  }));
  const total = filtered.reduce((s,t)=>s+Number(t.amount),0);
  rows.push({"Sr No":"", "Date":"", "Payer":"", "Receiver":"Total", "Amount": total.toFixed(2), "Repaid":""});
  if(typeof XLSX !== 'undefined'){
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transaction");
    XLSX.writeFile(wb, `Transaction_${mVal}_${yVal}.xlsx`);
  } else {
    let csv = "Sr No,Date,Payer,Receiver,Amount,Repaid\n";
    rows.forEach(r=>{ csv+=`${r["Sr No"]},${r.Date},${r.Payer},${r.Receiver},${r.Amount},${r.Repaid}\n`; });
    const blob = new Blob([csv], {type:'text/csv'}); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`Transaction_${mVal}_${yVal}.csv`; a.click();
  }
  showBottomMessage("Excel Downloaded", "success");
}

function downloadFilterPDF(){
  const monthVal = document.getElementById('filterMonth')?.value;
  const yearVal = document.getElementById('filterYear')?.value;
  const search = (document.getElementById('filterSearch')?.value || '').trim().toLowerCase();
  const catFilter = document.getElementById('filterCategory')?.value || "All Categories";
  const grpFilter = document.getElementById('filterGroup')?.value || "All Groups";
  const filterDateVal = document.getElementById('filterDate')?.value || '';
  const monthNamesFull = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  let monthLabel = monthVal === 'all' || monthVal === 'overall' ? 'Overall' : monthNamesFull[parseInt(monthVal)] || monthVal;
  let yearLabel = yearVal === 'all' || yearVal === 'overall' ? '' : yearVal;
  let dateLabel = "";
  if(filterDateVal) dateLabel = `Date: ${formatDate(filterDateVal)}`;
  else dateLabel = `${monthLabel} All Dates`;
  function passesDateFilter(d_iso){
    if(!filterDateVal) return true;
    return d_iso === filterDateVal;
  }
  let filtered = [];
  if (filterType === 'expense') {
    filtered = expenses.filter(e => {
      const p = parseISODate(e.date_iso); if(!p) return false;
      const mMatch = monthVal === 'all' || monthVal === 'overall' || p.month === parseInt(monthVal);
      const yMatch = yearVal === 'all' || yearVal === 'overall' || p.year === parseInt(yearVal);
      if(!mMatch || !yMatch) return false;
      if(!passesDateFilter(e.date_iso)) return false;
      if(catFilter!== "All Categories" && catFilter !== NEW_CAT_LABEL && (e.category||'Others')!== catFilter) return false;
      if(search &&!(e.name||'').toLowerCase().includes(search) &&!(e.category||'').toLowerCase().includes(search)) return false;
      return true;
    });
  } else if(filterType === 'group'){
    filtered = groupRecords.filter(g=>{
      const p = parseISODate(g.date_iso); if(!p) return false;
      const mMatch = monthVal === 'all' || monthVal === 'overall' || p.month === parseInt(monthVal);
      const yMatch = yearVal === 'all' || yearVal === 'overall' || p.year === parseInt(yearVal);
      if(!mMatch || !yMatch) return false;
      if(!passesDateFilter(g.date_iso)) return false;
      if(grpFilter !== "All Groups" && g.group_name !== grpFilter) return false;
      if(search && !(g.person_name||'').toLowerCase().includes(search) && !(g.group_name||'').toLowerCase().includes(search)) return false;
      return true;
    });
  } else {
    filtered = transactions.filter(t => {
      const p = parseISODate(t.date_iso); if(!p) return false;
      const mMatch = monthVal === 'all' || monthVal === 'overall' || p.month === parseInt(monthVal);
      const yMatch = yearVal === 'all' || yearVal === 'overall' || p.year === parseInt(yearVal);
      if(!mMatch || !yMatch) return false;
      if(!passesDateFilter(t.date_iso)) return false;
      if(repayFilter === 'completed' &&!t.is_received) return false;
      if(repayFilter === 'remaining' && t.is_received) return false;
      if(search &&!((t.payer||'').toLowerCase().includes(search) || (t.receiver||'').toLowerCase().includes(search))) return false;
      return true;
    });
  }
  if (filtered.length === 0) return showBottomMessage("No data to download", "error");
  filtered.sort((a,b)=> new Date(a.date_iso||a.date) - new Date(b.date_iso||b.date));
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const todayStr = new Date().toLocaleDateString('en-GB').replaceAll('/','-');
  doc.setFontSize(11); doc.setFont("helvetica","normal"); doc.setTextColor(0,0,0);
  doc.text(`Date: ${todayStr}`, pageWidth - 14, 10, {align:"right"});
  doc.setFontSize(18); doc.setFont("helvetica","bold");
  let displayTitle = filterType==='expense' ? "Daily Expence" : filterType==='group' ? "Grouping" : "Money Transaction";
  doc.text(displayTitle, pageWidth/2, 22, {align:"center"});
  doc.setFontSize(13); doc.setFont("helvetica","bold"); doc.setTextColor(220, 38, 38);
  let monthYearText = `${monthLabel} ${yearLabel}`.trim(); if(monthVal === 'all' && yearVal === 'all') monthYearText = "Overall";
  // Add date label
  monthYearText += ` | ${dateLabel}`;
  doc.text(monthYearText, pageWidth/2, 30, {align:"center"});
  doc.setTextColor(0,0,0); doc.setFontSize(12); doc.setFont("helvetica","bold");
  const userName = document.getElementById('homeUsername')?.innerText || 'User';
  doc.text(`Name:${userName}`, 14, 42);
  if(filterType==='expense') doc.text(`Category of Item:${catFilter}`, pageWidth/2, 50, {align:"center"});
  else if(filterType==='group') doc.text(`Group:${grpFilter}`, pageWidth/2, 50, {align:"center"});
  else doc.text(`Filter:${repayFilter}`, pageWidth/2, 50, {align:"center"});

  if (filterType === 'expense') {
    let body = filtered.map((e, idx)=>[idx+1, formatDate(e.date_iso), String(e.name).substring(0,30), Number(e.amount).toFixed(2)]);
    doc.autoTable({ startY: 56, head: [['Sr No','Date','Name','Amount']], body: body, theme:'grid', styles:{halign:'center', fontSize:10, cellPadding:3, lineColor:[0,0,0], lineWidth:0.2}, headStyles:{fillColor:[15,23,42], textColor:255, fontStyle:'bold', halign:'center'}, columnStyles:{0:{cellWidth:15},1:{cellWidth:35},2:{cellWidth:80},3:{cellWidth:40}}, margin:{left:14,right:14} });
  } else if(filterType === 'group'){
    // Grouping PDF: group wise -> person wise -> person total -> group total -> grand total
    // First group by group_name
    let groupWise = {};
    filtered.forEach(rec=>{
      if(!groupWise[rec.group_name]) groupWise[rec.group_name] = [];
      groupWise[rec.group_name].push(rec);
    });
    let groupNames = Object.keys(groupWise).sort();
    let startY = 56;
    let grandTotal = 0;
    groupNames.forEach((grpName, grpIdx)=>{
      let recs = groupWise[grpName];
      recs.sort((a,b)=> new Date(a.date_iso) - new Date(b.date_iso));
      let groupTotal = recs.reduce((s,r)=>s+Number(r.amount||0),0);
      grandTotal += groupTotal;
      // Group header
      if(startY > 250){ doc.addPage(); startY = 15; }
      doc.setFontSize(13); doc.setFont("helvetica","bold"); doc.setFillColor(124,58,237);
      doc.setTextColor(255,255,255);
      doc.rect(14, startY, pageWidth-28, 9, 'F');
      doc.text(`Group: ${grpName}`, pageWidth/2, startY+6, {align:"center"});
      startY += 11;
      doc.setTextColor(0,0,0);

      // Now person wise inside this group
      let personWise = {};
      recs.forEach(r=>{
        let key = r.person_name.toLowerCase();
        if(!personWise[key]) personWise[key] = { person: r.person_name, records: [] };
        personWise[key].records.push(r);
      });
      let personKeys = Object.keys(personWise).sort();
      personKeys.forEach((pKey, pIdx)=>{
        let pObj = personWise[pKey];
        pObj.records.sort((a,b)=> new Date(a.date_iso) - new Date(b.date_iso));
        let personTotal = pObj.records.reduce((s,r)=>s+Number(r.amount||0),0);
        if(startY > 240){ doc.addPage(); startY = 15; }
        doc.setFontSize(12); doc.setFont("helvetica","bold"); doc.setFillColor(2,132,199);
        doc.setTextColor(255,255,255);
        doc.rect(14, startY, pageWidth-28, 8, 'F');
        doc.text(`${pObj.person}`, pageWidth/2, startY+5.5, {align:"center"});
        startY += 10;
        doc.setTextColor(0,0,0);
        let body = pObj.records.map((rec)=>[formatDate(rec.date_iso), Number(rec.amount).toFixed(2)]);
        doc.autoTable({
          startY: startY,
          head: [['Date','Amount']],
          body: body,
          theme: 'grid',
          styles:{halign:'center', fontSize:10, cellPadding:2, lineColor:[0,0,0], lineWidth:0.2},
          headStyles:{fillColor:[15,23,42], textColor:255},
          margin:{left:30,right:30}
        });
        startY = doc.lastAutoTable.finalY + 2;
        doc.setFontSize(10); doc.setFont("helvetica","bold");
        doc.text(`Total ${pObj.person} = Rs ${personTotal.toFixed(2)}`, pageWidth/2, startY+4, {align:"center"});
        startY += 7;
        if(pIdx < personKeys.length - 1){
          doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(100,100,100);
          doc.text(`--------------------------------------------------`, pageWidth/2, startY+2, {align:"center"});
          startY += 6;
          doc.setTextColor(0,0,0);
        }
      });
      // Group total after all persons in this group
      if(startY > 270){ doc.addPage(); startY = 15; }
      doc.setFontSize(11); doc.setFont("helvetica","bold");
      doc.text(`Group Total ${grpName} = Rs ${groupTotal.toFixed(2)}`, pageWidth/2, startY+6, {align:"center"});
      startY += 12;
      if(grpIdx < groupNames.length - 1){
        doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.setTextColor(80,80,80);
        doc.text(`==================================================`, pageWidth/2, startY+2, {align:"center"});
        startY += 8;
        doc.setTextColor(0,0,0);
      }
    });
    if(startY > 270){ doc.addPage(); startY = 15; }
    doc.setFontSize(13); doc.setFont("helvetica","bold");
    doc.text(`Grand Total (${dateLabel}) : Rs ${grandTotal.toFixed(2)}`, 14, startY+8);
  } else {
    let body = filtered.map((t, idx)=>[idx+1, formatDate(t.date_iso), String(t.payer).substring(0,12), String(t.receiver).substring(0,12), Number(t.amount).toFixed(2), t.is_received ? 'Yes' : 'No', t.received_date_iso ? formatDate(t.received_date_iso) : '-']);
    doc.autoTable({ startY: 56, head: [['Sr No','Date','Payer','Receiver','Amount','Repaid','Repay Date']], body: body, theme:'grid', styles:{halign:'center', fontSize:9, cellPadding:2, lineColor:[0,0,0], lineWidth:0.2}, headStyles:{fillColor:[15,23,42], textColor:255, fontSize:9}, margin:{left:10,right:10} });
  }
  if(filterType !== 'group'){
    let total = filtered.reduce((s, i) => s + Number(i.amount || 0), 0);
    doc.setFontSize(12); doc.setFont("helvetica","bold"); doc.text(`Total: Rs ${total.toFixed(2)} | ${dateLabel}`, 14, doc.lastAutoTable.finalY + 12);
  }
  const fileName = filterType==='expense' ? `Filter_${catFilter}_${monthLabel}_${yearLabel}_${dateLabel}.pdf` : filterType==='group' ? `Grouping_${grpFilter}_${monthLabel}_${yearLabel}_${dateLabel}.pdf` : `Filter_Transaction_${monthLabel}_${yearLabel}_${dateLabel}.pdf`;
  doc.save(fileName.replace(/ /g,'_'));
}

function downloadFilterExcel(){
  const monthVal = document.getElementById('filterMonth')?.value;
  const yearVal = document.getElementById('filterYear')?.value;
  const search = (document.getElementById('filterSearch')?.value || '').trim().toLowerCase();
  const catFilter = document.getElementById('filterCategory')?.value || "All Categories";
  const grpFilter = document.getElementById('filterGroup')?.value || "All Groups";
  const filterDateVal = document.getElementById('filterDate')?.value || '';
  function passesDateFilter(d_iso){
    if(!filterDateVal) return true;
    return d_iso === filterDateVal;
  }
  let filtered = [];
  if (filterType === 'expense') {
    filtered = expenses.filter(e => {
      const p = parseISODate(e.date_iso); if(!p) return false;
      const mMatch = monthVal === 'all' || monthVal === 'overall' || p.month === parseInt(monthVal);
      const yMatch = yearVal === 'all' || yearVal === 'overall' || p.year === parseInt(yearVal);
      if(!mMatch || !yMatch) return false;
      if(!passesDateFilter(e.date_iso)) return false;
      if(catFilter!== "All Categories" && catFilter !== NEW_CAT_LABEL && (e.category||'Others')!== catFilter) return false;
      if(search &&!(e.name||'').toLowerCase().includes(search) &&!(e.category||'').toLowerCase().includes(search)) return false;
      return true;
    });
  } else if(filterType === 'group'){
    filtered = groupRecords.filter(g=>{
      const p = parseISODate(g.date_iso); if(!p) return false;
      const mMatch = monthVal === 'all' || monthVal === 'overall' || p.month === parseInt(monthVal);
      const yMatch = yearVal === 'all' || yearVal === 'overall' || p.year === parseInt(yearVal);
      if(!mMatch || !yMatch) return false;
      if(!passesDateFilter(g.date_iso)) return false;
      if(grpFilter !== "All Groups" && g.group_name !== grpFilter) return false;
      if(search && !(g.person_name||'').toLowerCase().includes(search) && !(g.group_name||'').toLowerCase().includes(search)) return false;
      return true;
    });
  } else {
    filtered = transactions.filter(t => {
      const p = parseISODate(t.date_iso); if(!p) return false;
      const mMatch = monthVal === 'all' || monthVal === 'overall' || p.month === parseInt(monthVal);
      const yMatch = yearVal === 'all' || yearVal === 'overall' || p.year === parseInt(yearVal);
      if(!mMatch || !yMatch) return false;
      if(!passesDateFilter(t.date_iso)) return false;
      if(repayFilter === 'completed' &&!t.is_received) return false;
      if(repayFilter === 'remaining' && t.is_received) return false;
      if(search &&!((t.payer||'').toLowerCase().includes(search) || (t.receiver||'').toLowerCase().includes(search))) return false;
      return true;
    });
  }
  if (filtered.length === 0) return showBottomMessage("No data for Excel", "error");
  let rows = [];
  if(filterType==='expense'){
    rows = filtered.map((e, idx)=>({"Sr No": idx+1, "Date": formatDate(e.date_iso), "Name": e.name, "Amount": Number(e.amount).toFixed(2), "Category": e.category||'Others'}));
  } else if(filterType==='group'){
    // Excel format: Group wise -> Person wise with totals
    let groupWise = {};
    filtered.forEach(rec=>{
      if(!groupWise[rec.group_name]) groupWise[rec.group_name] = [];
      groupWise[rec.group_name].push(rec);
    });
    let groupNames = Object.keys(groupWise).sort();
    groupNames.forEach(grpName=>{
      let recs = groupWise[grpName];
      let groupTotal = recs.reduce((s,r)=>s+Number(r.amount||0),0);
      rows.push({"Person": `Group: ${grpName}`, "Date": "", "Group": "", "Amount": ""});
      let personWise = {};
      recs.forEach(r=>{
        let key = r.person_name.toLowerCase();
        if(!personWise[key]) personWise[key] = { person: r.person_name, records: [] };
        personWise[key].records.push(r);
      });
      Object.keys(personWise).sort().forEach(pk=>{
        let pObj = personWise[pk];
        pObj.records.sort((a,b)=> new Date(a.date_iso) - new Date(b.date_iso));
        let pTotal = pObj.records.reduce((s,r)=>s+Number(r.amount||0),0);
        rows.push({"Person": pObj.person, "Date": "", "Group": grpName, "Amount": ""});
        pObj.records.forEach(rec=>{
          rows.push({"Person": "", "Date": formatDate(rec.date_iso), "Group": rec.group_name, "Amount": Number(rec.amount).toFixed(2)});
        });
        rows.push({"Person": `Total ${pObj.person}`, "Date": "", "Group": "", "Amount": pTotal.toFixed(2)});
        rows.push({"Person": "--------------------------------------------------", "Date": "", "Group": "", "Amount": ""});
      });
      rows.push({"Person": `Group Total ${grpName}`, "Date": "", "Group": "", "Amount": groupTotal.toFixed(2)});
      rows.push({"Person": "==================================================", "Date": "", "Group": "", "Amount": ""});
      rows.push({"Person": "", "Date": "", "Group": "", "Amount": ""});
    });
    let grandTotal = filtered.reduce((s,i)=>s+Number(i.amount||0),0);
    let dateLabel = filterDateVal ? formatDate(filterDateVal) : "All Dates of Month";
    rows.push({"Person": `Grand Total (${dateLabel})`, "Date": "", "Group": "", "Amount": grandTotal.toFixed(2)});
  } else {
    rows = filtered.map((t, idx)=>({"Sr No": idx+1, "Date": formatDate(t.date_iso), "Payer": t.payer, "Receiver": t.receiver, "Amount": Number(t.amount).toFixed(2), "Repaid": t.is_received?'Yes':'No', "Repay Date": t.received_date_iso ? formatDate(t.received_date_iso) : '-'}));
  }
  const total = filtered.reduce((s,i)=>s+Number(i.amount||0),0);
  if(filterType==='expense') rows.push({"Sr No":"", "Date":"", "Name":"Total", "Amount": total.toFixed(2), "Category":""});
  else if(filterType!=='group') rows.push({"Sr No":"", "Date":"", "Payer":"", "Receiver":"Total", "Amount": total.toFixed(2), "Repaid":"", "Repay Date":""});

  if(typeof XLSX !== 'undefined'){
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Filter");
    let fileName = filterType==='group' ? `Grouping_${grpFilter}.xlsx` : `Filter_${catFilter||repayFilter}.xlsx`;
    XLSX.writeFile(wb, fileName);
  } else {
    let csv = Object.keys(rows[0]).join(",") + "\n";
    rows.forEach(r=>{ csv += Object.values(r).map(v=>String(v).replace(/,/g,' ')).join(",") + "\n"; });
    const blob = new Blob([csv], {type:'text/csv'}); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`Filter_${catFilter||grpFilter||repayFilter}.csv`; a.click();
  }
  showBottomMessage("Excel Downloaded", "success");
}


async function handleLogin(){ 
  const emailEl = document.getElementById('loginEmail');
  const passEl = document.getElementById('loginPassword');
  const email = emailEl.value.trim(); 
  const password = passEl.value; 
  const btn = document.getElementById('loginBtn'); 
  const errorEl = document.getElementById('loginError'); 
  if(passEl) passEl.type = 'password';
  errorEl.textContent = ''; btn.disabled = true; btn.textContent = 'Logging in...'; 
  try { 
    expenses = []; transactions = []; currentUserId = null; 
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password }); 
    if (error) throw error; 
    // ENCRYPTED localStorage - pela karta jem, pan encrypt kari ne
    try{
      localStorage.setItem('__k_e', _encData(email));
      localStorage.setItem('__k_p', _encData(password));
      // Juna keys delete
      localStorage.removeItem('savedEmail');
      localStorage.removeItem('savedPassword');
    }catch(e){}
    currentUserId = data.user.id; 
    updateUsernameDisplay(data.user); 
    showScreen('home'); 
    await loadExpenses(); 
    await loadTransactions(); 
    await loadGroups(); 
  } catch (err) { 
    errorEl.textContent = err.message || 'Login failed'; 
  } finally { 
    btn.disabled = false; btn.textContent = 'Login'; 
  } 
}
async function handleSignup(){ const email = document.getElementById('signupEmail').value.trim(); const username = document.getElementById('signupUsername').value.trim(); const password = document.getElementById('signupPassword').value; const retype = document.getElementById('signupRetype').value; const btn = document.getElementById('signupBtn'); const errorEl = document.getElementById('signupError'); errorEl.textContent = ''; if (password!== retype) return errorEl.textContent = 'Passwords do not match'; if (password.length < 6) return errorEl.textContent = 'Password must be at least 6 characters'; btn.disabled = true; btn.textContent = 'Creating account...'; try { const { error } = await supabaseClient.auth.signUp({ email, password, options: { data: { username } } }); if (error) throw error; showBottomMessage('Account created successfully!', 'success'); document.getElementById('signupForm').reset(); showScreen('login'); } catch (err) { errorEl.textContent = err.message || 'Signup failed'; } finally { btn.disabled = false; btn.textContent = 'Sign Up'; } }
async function handleForgotPassword(){ const email = document.getElementById('loginEmail').value.trim(); const forgotBtn = document.getElementById('forgotBtn'); const errorEl = document.getElementById('loginError'); if (!email) return showBottomMessage("Please enter email first", "error"); if (isSendingReset) return showBottomMessage("Reset link already sending, please wait...", "error"); const now = Date.now(); if (now - lastResetSentAt < 60000) return showBottomMessage(`Please wait ${Math.ceil((60000 - (now - lastResetSentAt)) / 1000)}s before next reset mail`, "error"); isSendingReset = true; forgotBtn.disabled = true; forgotBtn.textContent = 'Sending...'; errorEl.textContent = ''; try { const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname }); if (error) throw error; lastResetSentAt = Date.now(); localStorage.setItem('lastResetSentAt', lastResetSentAt); showBottomMessage(`Reset link sent to ${email}. Check your mail.`, "success"); } catch (err) { errorEl.textContent = err.message; showBottomMessage(err.message, "error"); } finally { isSendingReset = false; forgotBtn.disabled = false; forgotBtn.textContent = 'Forgot Password?'; } }
async function handleLogout(){ await supabaseClient.auth.signOut(); showScreen('login'); expenses = []; transactions = []; currentUserId = null; }

let selectedRowTimer = null;
function highlightRow(row){ document.querySelectorAll('table.entries tbody tr.selected-row').forEach(r => { r.classList.remove('selected-row'); }); row.classList.add('selected-row'); if (selectedRowTimer) clearTimeout(selectedRowTimer); selectedRowTimer = setTimeout(() => { row.classList.remove('selected-row'); selectedRowTimer = null; }, 3500); }
document.addEventListener('click', function(e){ const row = e.target.closest('table.entries tbody tr'); if (row) highlightRow(row); });
