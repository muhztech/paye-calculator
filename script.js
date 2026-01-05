let selectedPayslipFile = null;

/* ===============================
   FILE SELECTION & CAMERA
================================ */

function handlePayslipSelection(event) {
  const file = event.target.files[0];
  if (!file) return;
  selectedPayslipFile = file;
  previewFile(file);
}

function openCamera() {
  const cameraInput = document.createElement("input");
  cameraInput.type = "file";
  cameraInput.accept = "image/*";
  cameraInput.capture = "environment";

  cameraInput.onchange = function (e) {
    const file = e.target.files[0];
    if (!file) return;
    selectedPayslipFile = file;
    previewFile(file);
  };

  cameraInput.click();
}

function previewFile(file) {
  const reader = new FileReader();
  reader.onload = function () {
    const img = document.getElementById("previewImage");
    img.src = reader.result;
    img.style.display = "block";
  };
  reader.readAsDataURL(file);
}

/* ===============================
   PAYE OCR PROCESSING
================================ */

function processPayslip() {
  const file = selectedPayslipFile;

  if (!file) {
    alert("Please select a payslip using gallery or camera");
    return;
  }

  document.getElementById("loading").innerText = "Reading payslip... Please wait";

  Tesseract.recognize(file, 'eng')
    .then(({ data: { text } }) => {

      document.getElementById("loading").innerText = "";

      text = text.toUpperCase();

      let gross = extractAmount(text, ["GROSS PAY", "GROSS"]);
      let pension = extractAmount(text, ["PENSION"]);
      let payeCurrent = extractAmount(text, ["PAYE", "PAY AS YOU EARN"]);

      if (!gross) {
        alert("Could not detect Gross Pay. Try a clearer payslip.");
        return;
      }

      calculateNewPAYE(gross, pension || 0, payeCurrent || 0);
    })
    .catch(err => {
      alert("Error reading payslip");
      console.error(err);
    });
}

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

/* ===============================
   NEW PAYE CALCULATION
================================ */

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
