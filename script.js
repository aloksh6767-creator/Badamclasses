const sampleData = {
  groomTitle: "Rohit Sharma",
  brideTitle: "Ananya Verma",
  reportDate: "14 / 03 / 2026",
  groomName: "Rohit Sharma",
  groomRashi: "Mesh (Aries)",
  groomDob: "12 / 04 / 1994",
  groomTob: "07:45 AM",
  groomPob: "Indore, MP",
  brideName: "Ananya Verma",
  brideRashi: "Kanya (Virgo)",
  brideDob: "18 / 09 / 1996",
  brideTob: "09:20 AM",
  bridePob: "Bhopal, MP",
  varna: "1",
  vashya: "2",
  tara: "3",
  yoni: "4",
  graha: "5",
  gana: "6",
  bhakoot: "7",
  nadi: "8",
  totalMarks: "36",
  totalOutOf: "36"
};

const checkboxDefaults = {
  nadiDosha: false,
  shadashtakDosha: false,
  ganaDosha: false,
  navPanchamDosha: false,
  varnaDosha: false,
  boyMangal: false,
  yoniDosha: false,
  girlMangal: false
};

function fillFields(data) {
  Object.entries(data).forEach(([key, value]) => {
    const field = document.getElementById(key);
    if (field) {
      field.value = value;
    }
  });
}

function setCheckboxes(config) {
  Object.entries(config).forEach(([key, value]) => {
    const field = document.getElementById(key);
    if (field) {
      field.checked = value;
    }
  });
}

function clearInputs() {
  document.querySelectorAll("input[type='text']").forEach((input) => {
    input.value = "";
  });

  document.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.checked = false;
  });

  document.querySelectorAll("input[type='radio']").forEach((input) => {
    input.checked = false;
  });
}

const fillButton = document.getElementById("fillSample");
const clearButton = document.getElementById("clearForm");

if (fillButton) {
  fillButton.addEventListener("click", () => {
    fillFields(sampleData);
    setCheckboxes(checkboxDefaults);
    const auspicious = document.querySelector("input[name='finalResult'][value='auspicious']");
    if (auspicious) {
      auspicious.checked = true;
    }
  });
}

if (clearButton) {
  clearButton.addEventListener("click", clearInputs);
}

// Auto-fill once on load for quick preview
fillFields(sampleData);
setCheckboxes(checkboxDefaults);
const defaultResult = document.querySelector("input[name='finalResult'][value='auspicious']");
if (defaultResult) {
  defaultResult.checked = true;
}
