/**
 * Asset Crop & Upload Integration
 * 
 * Connects Google Sheets with the HSK FastAPI backend.
 * Processes a selected row from 'PdfParsePages', uploads the PDF,
 * and updates 'QuestionAssets' with the returned metadata.
 */

/**
 * Main entry point to process the currently selected row in PdfParsePages.
 */
function processSelectedRowForAssets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getSheet_(CONFIG.SHEET_PDF_PAGES);
  const activeRow = sheet.getActiveRange().getRow();
  
  if (activeRow < 2) {
    SpreadsheetApp.getUi().alert("Please select a valid row in '" + CONFIG.SHEET_PDF_PAGES + "'.");
    return;
  }

  // Get data from row matching setup.gs indices
  const values = sheet.getRange(activeRow, 1, 1, 11).getValues()[0];
  const examSetId = safeString_(values[0]);
  const pdfFileId = safeString_(values[1]);
  const pageNo = values[2];
  const partKey = safeString_(values[3]);
  const sectionType = safeString_(values[4]);
  const qFrom = values[5];
  const qTo = values[6];
  const rawJsonStr = safeString_(values[8]);

  if (!pdfFileId || !pageNo || !rawJsonStr) {
    SpreadsheetApp.getUi().alert("Missing required data (PDF ID, Page No, or Raw JSON) in the selected row.");
    return;
  }

  const rawJson = JSON.parse(rawJsonStr);
  const group = rawJson.group || {};
  
  // Prepare payload for FastAPI
  const payload = {
    'exam_set_id': examSetId,
    'hsk_level': '1', // Default to 1 for now, or extract from examSetId
    'page_no': pageNo.toString(),
    'part_key': partKey,
    'section_type': sectionType,
    'question_from': (qFrom || 0).toString(),
    'question_to': (qTo || 0).toString(),
    'question_type': group.question_type || ""
  };

  // Extract HSK level from exam_set_id if possible (e.g., hsk1_...)
  if (examSetId.indexOf('hsk') === 0) {
    const levelMatch = examSetId.match(/hsk(\d)/i);
    if (levelMatch) payload['hsk_level'] = levelMatch[1];
  }

  try {
    // 1. Fetch PDF from Drive
    const pdfBlob = DriveApp.getFileById(pdfFileId).getBlob();
    payload['file'] = pdfBlob;

    // 2. Post to FastAPI
    const options = {
      'method': 'post',
      'payload': payload,
      'muteHttpExceptions': true
    };

    logger_("Calling crop backend at " + CONFIG.CROP_BACKEND_URL);
    const response = UrlFetchApp.fetch(CONFIG.CROP_BACKEND_URL + "/detect-crop-upload", options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode !== 200) {
      throw new Error("Backend Error (" + responseCode + "): " + responseText);
    }

    const result = JSON.parse(responseText);
    const assets = result.assets || [];

    if (assets.length === 0) {
      SpreadsheetApp.getUi().alert("No assets detected on this page.");
      return;
    }

    // 3. Upsert into 'QuestionAssets' sheet
    saveAssetsToSheet_(assets, examSetId, partKey);
    
    SpreadsheetApp.getUi().alert("Successfully processed " + assets.length + " assets.");

  } catch (e) {
    logger_("Error in processSelectedRowForAssets: " + e.toString());
    SpreadsheetApp.getUi().alert("Integration Error: " + e.toString());
  }
}

/**
 * Saves returned assets into the QuestionAssets sheet.
 */
function saveAssetsToSheet_(assets, examSetId, partKey) {
  assets.forEach((asset, index) => {
    // Standardize owner_id
    let ownerId = "";
    if (asset.owner_type === "question") {
      ownerId = examSetId + "_q" + asset.owner_ref;
    } else if (asset.owner_type === "option") {
      ownerId = examSetId + "_q" + asset.owner_ref; 
    } else if (asset.owner_type === "group_option") {
      ownerId = examSetId + "_" + partKey + "_" + asset.owner_ref;
    }

    const assetId = examSetId + "_" + asset.asset_key;
    
    // Match headers: [asset_id, owner_type, owner_id, asset_type, storage_provider, storage_path, public_url, transcript_zh, transcript_pinyin, sort_order, review_status, bbox]
    const rowValues = [
      assetId,
      asset.owner_type,
      ownerId,
      asset.asset_type,
      asset.storage_provider,
      asset.storage_path,
      asset.public_url,
      asset.asset_hint || "", // transcript_zh
      "", // transcript_pinyin
      index + 1,
      asset.review_status,
      JSON.stringify(asset.bbox)
    ];

    upsertRowByFirstColumn_(CONFIG.SHEET_ASSETS, assetId, rowValues);
  });
}

function logger_(msg) {
  Logger.log(msg);
}
