const DB_NAME = "RuangUangDB";
const DB_VERSION = 1;
const STORE = "transactions";
const INCOME_CATEGORIES = ["Gaji", "Penghasilan tambahan", "Bonus", "Freelance", "Pengembalian uang", "Lainnya"];
const EXPENSE_CATEGORIES = ["Makan & minum", "Transportasi", "Jajan", "Kebutuhan pribadi", "Kuliah", "Keluarga", "Tagihan", "Hiburan", "Kesehatan", "Belanja", "Transfer", "Lainnya"];
const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
let db;
let transactions = [];

const $ = id => document.getElementById(id);
const rupiah = value => new Intl.NumberFormat("id-ID", {style:"currency",currency:"IDR",maximumFractionDigits:0}).format(value || 0);
const dateISO = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const yearNow = new Date().getFullYear();

function openDB(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=()=>{const database=request.result;if(!database.objectStoreNames.contains(STORE))database.createObjectStore(STORE,{keyPath:"id"});};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
function allRecords(){
  return new Promise((resolve,reject)=>{const req=db.transaction(STORE,"readonly").objectStore(STORE).getAll();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);});
}
function putRecord(record){
  return new Promise((resolve,reject)=>{const req=db.transaction(STORE,"readwrite").objectStore(STORE).put(record);req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error);});
}
function deleteRecord(id){
  return new Promise((resolve,reject)=>{const req=db.transaction(STORE,"readwrite").objectStore(STORE).delete(id);req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error);});
}
function replaceAll(records){
  return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite"),store=tx.objectStore(STORE);store.clear();records.forEach(r=>store.put(r));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
}
function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2400);}
function yearsList(){
  const years=new Set([yearNow,yearNow-1,yearNow+1,...transactions.map(t=>Number(t.date.slice(0,4)))]);
  return [...years].sort((a,b)=>b-a);
}
function fillYearSelect(select,selected=yearNow){
  select.innerHTML=yearsList().map(y=>`<option value="${y}" ${y===Number(selected)?"selected":""}>${y}</option>`).join("");
}
function fillMonths(select,selected=new Date().getMonth()){
  select.innerHTML=MONTHS.map((m,i)=>`<option value="${i}" ${i===Number(selected)?"selected":""}>${m}</option>`).join("");
}
function updateCategoryOptions(){
  const categories=$("type").value==="Pemasukan"?INCOME_CATEGORIES:EXPENSE_CATEGORIES;
  const previous=$("category").value;
  $("category").innerHTML=categories.map(c=>`<option>${escapeHTML(c)}</option>`).join("");
  if(categories.includes(previous))$("category").value=previous;
}
function setDefaultDate(){const today=dateISO(new Date());$("date").value=today;}
function setPage(page){
  document.querySelectorAll(".page").forEach(el=>el.classList.toggle("active",el.id===page));
  document.querySelectorAll(".nav-btn").forEach(el=>el.classList.toggle("active",el.dataset.page===page));
  renderAll();
}
function yearData(year){return transactions.filter(t=>Number(t.date.slice(0,4))===Number(year));}
function monthData(year,month){return transactions.filter(t=>{const d=new Date(`${t.date}T00:00:00`);return d.getFullYear()===Number(year)&&d.getMonth()===Number(month);}).sort((a,b)=>b.date.localeCompare(a.date));}
function totals(records){return records.reduce((sum,t)=>{if(t.type==="Pemasukan")sum.income+=Number(t.amount);else sum.expense+=Number(t.amount);return sum;},{income:0,expense:0});}
function transactionRows(records){
  if(!records.length)return `<div class="empty">Belum ada transaksi untuk ditampilkan.</div>`;
  return `<table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th>Keterangan</th><th>Nominal</th><th>Aksi</th></tr></thead><tbody>${records.map(t=>`<tr><td>${escapeHTML(t.date)}</td><td>${t.type==="Pemasukan"?'<span class="green">Pemasukan</span>':'<span class="red">Pengeluaran</span>'}</td><td>${escapeHTML(t.category)}</td><td>${escapeHTML(t.description||"-")}</td><td class="amount ${t.type==="Pemasukan"?"green":"red"}">${rupiah(t.amount)}</td><td><div class="row-actions"><button class="small-btn" data-edit="${escapeHTML(t.id)}">Edit</button><button class="small-btn delete" data-delete="${escapeHTML(t.id)}">Hapus</button></div></td></tr>`).join("")}</tbody></table>`;
}
function renderInput(){
  const search=$("quickSearch").value.toLowerCase(),filter=$("quickFilter").value;
  const rows=transactions.filter(t=>(filter==="all"||t.type===filter)&&[t.category,t.description,t.note].join(" ").toLowerCase().includes(search)).sort((a,b)=>b.date.localeCompare(a.date));
  $("transactionCount").textContent=`${rows.length} transaksi`;
  $("transactionTable").innerHTML=transactionRows(rows);
}
function renderDashboard(){
  const year=$("dashboardYear").value||yearNow,records=yearData(year),sum=totals(records);
  $("dashIncome").textContent=rupiah(sum.income);$("dashExpense").textContent=rupiah(sum.expense);$("dashBalance").textContent=rupiah(sum.income-sum.expense);
  const monthTotals=MONTHS.map((_,i)=>totals(monthData(year,i)));
  const max=Math.max(1,...monthTotals.flatMap(x=>[x.income,x.expense]));
  $("monthlyChart").innerHTML=monthTotals.map((x,i)=>`<div class="chart-month" title="${MONTHS[i]}"><div class="bar income" style="height:${Math.max(x.income?2:0,x.income/max*100)}%"></div><div class="bar expense" style="height:${Math.max(x.expense?2:0,x.expense/max*100)}%"></div><span>${MONTHS[i].slice(0,3)}</span></div>`).join("");
  const cats={};records.filter(t=>t.type==="Pengeluaran").forEach(t=>cats[t.category]=(cats[t.category]||0)+Number(t.amount));
  const sorted=Object.entries(cats).sort((a,b)=>b[1]-a[1]),maxCat=Math.max(1,...sorted.map(x=>x[1]));
  $("categorySummary").innerHTML=sorted.length?sorted.map(([name,value])=>`<div class="bar-row"><span>${escapeHTML(name)}</span><div class="bar-track"><div class="bar-fill" style="width:${value/maxCat*100}%"></div></div><b>${rupiah(value)}</b></div>`).join(""):'<div class="empty">Belum ada pengeluaran pada tahun ini.</div>';
}
function renderMonthly(){
  const year=$("monthYearFilter").value||yearNow,month=$("monthFilter").value??new Date().getMonth(),records=monthData(year,month),sum=totals(records);
  $("monthIncome").textContent=rupiah(sum.income);$("monthExpense").textContent=rupiah(sum.expense);$("monthCount").textContent=`${records.length} transaksi`;$("monthlyTable").innerHTML=transactionRows(records);
}
function renderYearly(){
  const year=$("annualYear").value||yearNow;let total={income:0,expense:0};
  $("annualRows").innerHTML=MONTHS.map((m,i)=>{const s=totals(monthData(year,i));total.income+=s.income;total.expense+=s.expense;return `<tr><td>${m}</td><td class="green">${rupiah(s.income)}</td><td class="red">${rupiah(s.expense)}</td><td>${rupiah(s.income-s.expense)}</td></tr>`;}).join("");
  $("annualFoot").innerHTML=`<tr><td>Total ${year}</td><td class="green">${rupiah(total.income)}</td><td class="red">${rupiah(total.expense)}</td><td>${rupiah(total.income-total.expense)}</td></tr>`;
}
function renderAll(){renderInput();renderDashboard();renderMonthly();renderYearly();}
function resetForm(){
  $("transactionForm").reset();$("editId").value="";$("saveBtn").textContent="＋ Simpan transaksi";$("cancelEdit").classList.add("hidden");setDefaultDate();updateCategoryOptions();
}
function editTransaction(id){
  const t=transactions.find(x=>x.id===id);if(!t)return;
  $("editId").value=t.id;$("date").value=t.date;$("type").value=t.type;updateCategoryOptions();$("category").value=t.category;$("amount").value=t.amount;$("description").value=t.description||"";$("payment").value=t.payment||"Tunai";$("mood").value=t.mood||"";$("spending").value=t.spending||"";$("note").value=t.note||"";
  $("saveBtn").textContent="Simpan perubahan";$("cancelEdit").classList.remove("hidden");setPage("input");window.scrollTo({top:0,behavior:"smooth"});
}
async function handleForm(event){
  event.preventDefault();
  const date=$("date").value,amount=Number($("amount").value);
  if(!date||!Number.isFinite(amount)||amount<=0){toast("Periksa tanggal dan nominal transaksi.");return;}
  const id=$("editId").value||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const record={id,date,type:$("type").value,category:$("category").value,amount,description:$("description").value.trim(),payment:$("payment").value,mood:$("mood").value,spending:$("spending").value,note:$("note").value.trim(),updatedAt:new Date().toISOString()};
  await putRecord(record);transactions=await allRecords();resetForm();refreshYearSelects();renderAll();toast("Transaksi berhasil disimpan.");
}
async function handleTableAction(event){
  const edit=event.target.closest("[data-edit]"),del=event.target.closest("[data-delete]");
  if(edit)editTransaction(edit.dataset.edit);
  if(del&&confirm("Hapus transaksi ini?")){await deleteRecord(del.dataset.delete);transactions=await allRecords();renderAll();toast("Transaksi dihapus.");}
}
function refreshYearSelects(){
  [["activeYear",yearNow],["dashboardYear",yearNow],["monthYearFilter",yearNow],["annualYear",yearNow]].forEach(([id,def])=>{const el=$(id),value=Number(el.value)||def;fillYearSelect(el,value);});
}
function exportExcel(){
  if(!window.XLSX){toast("Library Excel belum tersedia. Sambungkan internet sekali lalu muat ulang.");return;}
  const ws=XLSX.utils.json_to_sheet(transactions.map(t=>({ID:t.id,Tanggal:t.date,Jenis:t.type,Kategori:t.category,Nominal:t.amount,Keterangan:t.description,Metode:t.payment,Mood:t.mood,Jenis_Pengeluaran:t.spending,Catatan:t.note})));
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Transaksi");XLSX.writeFile(wb,`Ruang_Uang_${yearNow}.xlsx`);
}
async function importExcel(file){
  if(!window.XLSX){toast("Library Excel belum tersedia. Sambungkan internet sekali lalu muat ulang.");return;}
  const data=await file.arrayBuffer(),wb=XLSX.read(data,{type:"array"}),ws=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(ws,{defval:""});
  const imported=rows.map(r=>({id:String(r.ID||r.id||`${Date.now()}-${Math.random()}`),date:String(r.Tanggal||r.date||"").slice(0,10),type:r.Jenis||r.type||"Pengeluaran",category:r.Kategori||r.category||"Lainnya",amount:Number(r.Nominal??r.amount)||0,description:r.Keterangan||r.description||"",payment:r.Metode||r.Metode_Pembayaran||r.payment||"Lainnya",mood:r.Mood||r.mood||"",spending:r.Jenis_Pengeluaran||r.spending||"",note:r.Catatan||r.note||""})).filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&r.amount>0);
  if(!imported.length){toast("Tidak menemukan transaksi yang valid di file.");return;}
  const mode=document.querySelector('input[name="importMode"]:checked').value;
  if(mode==="replace"){if(!confirm(`Ganti seluruh data dengan ${imported.length} transaksi dari Excel?`))return;await replaceAll(imported);}
  else{const map=new Map(transactions.map(t=>[t.id,t]));imported.forEach(t=>map.set(t.id,t));await replaceAll([...map.values()]);}
  transactions=await allRecords();refreshYearSelects();renderAll();toast(`${imported.length} transaksi berhasil diimpor.`);
}
function init(){
  $("type").addEventListener("change",updateCategoryOptions);$("transactionForm").addEventListener("submit",handleForm);$("cancelEdit").addEventListener("click",resetForm);
  $("transactionTable").addEventListener("click",handleTableAction);$("monthlyTable").addEventListener("click",handleTableAction);
  $("quickSearch").addEventListener("input",renderInput);$("quickFilter").addEventListener("change",renderInput);
  $("dashboardYear").addEventListener("change",renderDashboard);$("monthFilter").addEventListener("change",renderMonthly);$("monthYearFilter").addEventListener("change",renderMonthly);$("annualYear").addEventListener("change",renderYearly);
  $("activeYear").addEventListener("change",()=>{const y=$("activeYear").value;$("date").value=`${y}-${String(new Date().getMonth()+1).padStart(2,"0")}-${String(Math.min(new Date().getDate(),new Date(Number(y),new Date().getMonth()+1,0).getDate())).padStart(2,"0")}`;});
  $("exportBtn").addEventListener("click",exportExcel);$("importFile").addEventListener("change",e=>{if(e.target.files[0])importExcel(e.target.files[0]).catch(err=>{console.error(err);toast("Gagal membaca file Excel.");});e.target.value="";});
  $("nav").addEventListener("click",e=>{const btn=e.target.closest("[data-page]");if(btn)setPage(btn.dataset.page);});
  document.querySelectorAll("[data-go]").forEach(btn=>btn.addEventListener("click",()=>setPage(btn.dataset.go)));
}
(async function start(){
  try{db=await openDB();transactions=await allRecords();refreshYearSelects();fillMonths($("monthFilter"));$("monthYearFilter").value=String(yearNow);$("annualYear").value=String(yearNow);setDefaultDate();updateCategoryOptions();init();renderAll();
    if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js").catch(console.warn);
  }catch(error){console.error(error);toast("Database lokal tidak dapat dibuka di browser ini.");}
})();
