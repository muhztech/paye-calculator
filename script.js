// Main function now accepts a file
function processPayslip(file) {
  if (!file) {
    alert("Please take a photo or upload a payslip first!");
    return;
  }

  document.getElementById("loading").innerText = "Reading payslip... Please wait";

  Tesseract.recognize(
    file,
    'eng',
    { logger: m => console.log(m) }
  ).then(({ data: { text } }) => {

    document.getElementById("loading").innerText = "";

    // Convert text to uppercase for easier matching
    text = text.toUpperCase();

    // Try to extract figures
    let gross = extractAmount(text, ["GROSS PAY", "GROSS"]);
    let pension = extractAmount(text, ["PENSION"]);
    let payeCurrent = extractAmount(text, ["PAYE", "PAY AS YOU EARN"]);

    if (!gross) {
      alert("Could not detect Gross Pay. Try a clearer payslip.");
      return;
    }

    calculateNewPAYE(gross, pension || 0, payeCurrent || 0);

  }).catch(err => {
    alert("Error reading payslip");
    console.error(err);
  });
}

// Extract amount after keywords
function extractAmount(text, keywords) {
  for (let key of keywords) {
    let regex = new RegExp(key + "[^0-9]*([0-9,.]+)");
    let match = text.match(regex);
    if (match) {
      return Number(match[1].replace(/,/g, ""));
    }
  }
  return null;
}

// PAYE calculation logic
function calculateNewPAYE(monthlyGross, pensionMonthly, currentPAYE) {

  let annualIncome = monthlyGross * 12;
  let pensionAnnual = pensionMonthly * 12;
  let taxableIncome = annualIncome - pensionAnnual;

  let tax = 0;

  if (taxableIncome > 800000) {
    let remaining = taxableIncome - 800000;

    let bands = [
      { limit: 2200000, rate: 0.15 },
      { limit: 9000000, rate: 0.18 },
      { limit: 13000000, rate: 0.21 },
      { limit: 25000000, rate: 0.23 },
      { limit: Infinity, rate: 0.25 }
    ];

    for (let band of bands) {
      if (remaining <= 0) break;
      let amount = Math.min(band.limit, remaining);
      tax += amount * band.rate;
      remaining -= amount;
    }
  }

  let monthlyNewPAYE = tax / 12;
  let difference = currentPAYE - monthlyNewPAYE;

  document.getElementById("result").innerHTML = `
    <p><b>Detected Gross Pay:</b> ₦${monthlyGross.toLocaleString()}</p>
    <p><b>Detected Pension:</b> ₦${pensionMonthly.toLocaleString()}</p>
    <p><b>Current PAYE:</b> ₦${currentPAYE.toLocaleString()}</p>
    <hr>
    <p><b>Correct PAYE (New Law):</b> ₦${monthlyNewPAYE.toLocaleString()}</p>
    <p><b>Difference:</b> ₦${difference.toLocaleString()}</p>
  `;
}
