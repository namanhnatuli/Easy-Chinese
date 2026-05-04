function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('HSK Import')
    .addItem('1. Setup exam sheets', 'setupExamSheets')
    .addItem('2. Create PDF import job', 'createHskPdfImportJob')
    .addItem('3. Parse pending PDF page', 'parsePendingPdfPagesWithGemini')
    .addItem('4. Crop & Upload assets (selected row)', 'processSelectedRowForAssets')
    .addItem('5. Commit parsed pages', 'commitParsedPdfPagesToExamSheets')
    .addToUi();
}