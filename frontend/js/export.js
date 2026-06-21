// PDF export helper using html2pdf.js (loaded on demand)
function exportElementToPdf(elementId, filename) {
  const el = document.getElementById(elementId);
  if (!el || !el.innerHTML.trim()) {
    showError('Generate a report first before exporting.');
    return;
  }
  if (typeof html2pdf === 'undefined') {
    showError('PDF export library not loaded.');
    return;
  }
  html2pdf().set({
    margin: 10,
    filename: filename || 'csrms-report.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }).from(el).save();
}
