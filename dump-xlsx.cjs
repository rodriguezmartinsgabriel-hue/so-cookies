const XLSX = require("xlsx");
const path = "C:\\Users\\Usuario\\Documents\\só\\Gestao Cookies SoCookies (1).xlsx";
const wb = XLSX.readFile(path);

const sheetNames = wb.SheetNames;
console.log("Sheets:", sheetNames.join(", "));

for (const name of sheetNames) {
  const ws = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  console.log("\n===== " + name + " =====");
  for (const row of data) {
    const vals = row.map(function(v) { return String(v).substring(0, 80); });
    console.log("  " + JSON.stringify(vals));
  }
}
