function showPAYE() {
  document.getElementById("payeSection").classList.remove("hidden");
  document.getElementById("selfSection").classList.add("hidden");
  document.getElementById("payeTab").classList.add("active");
  document.getElementById("selfTab").classList.remove("active");
  document.getElementById("result").innerHTML = "";
}

function showSelf() {
  document.getElementById("selfSection").classList.remove("hidden");
  document.getElementById("payeSection").classList.add("hidden");
  document.getElementById("selfTab").classList.add("active");
  document.getElementById("payeTab").classList.remove("active");
  document.getElementById("result").innerHTML = "";
}

/* ================= PAYE (UNCHANGED LOGIC) ================= */

function processPayslip() {
  const file = document.getElementById("fileInput").files[0];
  if (!file) {
    alert("Please upload a payslip");
    return;
  }

  document.getElementById("loading").innerText = "Reading payslip...";

  Tesseract.recognize(file, 'eng')
    .then(({ data: { text } }) => {
      document.getElementById("loading").innerText = "";
      text = text.toUpperCase();

      let gross = extractAmount(text, ["GROSS PAY", "GROSS"]);
      let pension = extractAmount(text, ["PENSION"]) || 0;
      let payeCurrent = extractAmount(text, ["PAYE", "PAY AS YOU EARN"]) || 0;

      calculateTax(gross * 12, pension * 12, payeCurrent * 12, true);
    })
    .catch(() => alert("Error reading payslip"));
}

function extractAmount(text, keys) {
  for (let key of keys) {
    let match = text.match(new RegExp(key + "[^0-9]*([0-9,.]+)"));
    if (match) return Number(match[1].replace(/,/g, ""));
  }
  return null;
}

/* ================= SELF-EMPLOYED ================= */

function calculateSelfEmployed() {
  let gross = Number(document.getElementById("grossIncome").value);
  let expenses = Number(document.getElementById("expenses").value);
  let pension = Number(document.getElementById("pension").value) || 0;

  if (!gross) {
    alert("Enter gross income");
    return;
  }

  let profit = gross - expenses;
  calculateTax(profit, pension, 0, false);
}

/* ================= CORE TAX ENGINE ================= */

function calculateTax(income, pension, currentPAYE, isPAYE) {

  let taxable = income - pension - 800000;
  if (taxable <= 0) {
    document.getElementById("result").innerHTML = `
      <b>No Tax Payable</b><br>
      Income protected by ₦800,000 relief.
    `;
    return;
  }

  let bands = [
    { limit: 2200000, rate: 0.15 },
    { limit: 9000000, rate: 0.18 },
    { limit: 13000000, rate: 0.21 },
    { limit: 25000000, rate: 0.23 },
    { limit: Infinity, rate: 0.25 }
  ];

  let tax = 0;
  let remaining = taxable;

  for (let b of bands) {
    if (remaining <= 0) break;
    let amt = Math.min(b.limit, remaining);
    tax += amt * b.rate;
    remaining -= amt;
  }

  let monthly = tax / 12;

  document.getElementById("result").innerHTML = `
    <p><b>Annual Taxable Income:</b> ₦${taxable.toLocaleString()}</p>
    <p><b>Annual Tax:</b> ₦${tax.toLocaleString()}</p>
    <p><b>Monthly Tax:</b> ₦${monthly.toLocaleString()}</p>
  `;
}
