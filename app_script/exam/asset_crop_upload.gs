/**
 * Asset Crop & Upload Integration
 * 
 * This script connects Google Sheets with the HSK FastAPI backend.
 * It processes a selected row from 'PdfParsePages', uploads the PDF blob,
 * and updates 'QuestionAssets' with the returned metadata.
 */

// Configuration - Update with your backend URL
const BACKEND_URL = "https://your-backend-url.com"; 

/**
 * Main entry point to process a single row.
 */
function processSelectedRowForAssets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('PdfParsePages');
  const activeRow = sheet.getActiveRange().getRow();
  
  if (activeRow < 2) {
    SpreadsheetApp.getUi().alert("Please select a valid row in 'PdfParsePages'.");
    return;
  }

  // Get data from row (adjust column indices based on your sheet layout)
  // Assuming: A: pdf_file_id, B: page_no, C: part_key, D: section_type, E: raw_json, F: exam_set_id, G: hsk_level
  const pdfFileId = sheet.getRange(activeRow, 1).getValue();
  const pageNo = sheet.getRange(activeRow, 2).getValue();
  const partKey = sheet.getRange(activeRow, 3).getValue();
  const sectionType = sheet.getRange(activeRow, 4).getValue();
  const rawJsonStr = sheet.getRange(activeRow, 5).getValue();
  const examSetId = sheet.getRange(activeRow, 6).getValue();
  const hskLevel = sheet.getRange(activeRow, 7).getValue();

  if (!pdfFileId || !pageNo || !rawJsonStr) {
    SpreadsheetApp.getUi().alert("Missing required data in the selected row.");
    return;
  }

  const rawJson = JSON.parse(rawJsonStr);
  const group = rawJson.group || {};
  
  const payload = {
    'exam_set_id': examSetId.toString(),
    'hsk_level': hskLevel.toString(),
    'page_no': pageNo.toString(),
    'part_key': partKey,
    'section_type': sectionType,
    'question_from': (group.question_from || 0).toString(),
    'question_to': (group.question_to || 0).toString(),
    'question_type': group.question_type || ""
  };

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

    const response = UrlFetchApp.fetch(BACKEND_URL + "/detect-crop-upload", options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode !== 200) {
      Logger.log("Error from Backend: " + responseText);
      SpreadsheetApp.getUi().alert("Backend Error: " + responseText);
      return;
    }

    const result = JSON.parse(responseText);
    const assets = result.assets || [];

    if (assets.length === 0) {
      SpreadsheetApp.getUi().alert("No assets detected on this page.");
      return;
    }

    // 3. Upsert into 'QuestionAssets' sheet
    upsertQuestionAssets(assets, examSetId, partKey);
    
    SpreadsheetApp.getUi().alert("Successfully processed " + assets.length + " assets.");

  } catch (e) {
    Logger.log("Error: " + e.toString());
    SpreadsheetApp.getUi().alert("Integration Error: " + e.toString());
  }
}

/**
 * Upserts assets into the 'QuestionAssets' sheet.
 */
function upsertQuestionAssets(assets, examSetId, partKey) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let assetSheet = ss.getSheetByName('QuestionAssets');
  
  if (!assetSheet) {
    // Create sheet if missing with headers
    assetSheet = ss.insertSheet('QuestionAssets');
    assetSheet.appendRow([
      'asset_id', 'owner_type', 'owner_id', 'asset_type', 
      'storage_provider', 'storage_path', 'public_url', 
      'asset_hint', 'sort_order', 'review_status', 'bbox'
    ]);
  }

  const existingData = assetSheet.getDataRange().getValues();
  const headers = existingData[0];
  
  assets.forEach((asset, index) => {
    // Determine owner_id based on type
    let ownerId = "";
    if (asset.owner_type === "question") {
      ownerId = examSetId + "_q" + asset.owner_ref;
    } else if (asset.owner_type === "option") {
      ownerId = examSetId + "_q" + asset.owner_ref; // owner_ref is "6_A" already
    } else if (asset.owner_type === "group_option") {
      ownerId = examSetId + "_" + partKey + "_" + asset.owner_ref;
    }

    const assetId = examSetId + "_" + asset.asset_key;
    const rowData = [
      assetId,
      asset.owner_type,
      ownerId,
      asset.asset_type,
      asset.storage_provider,
      asset.storage_path,
      asset.public_url,
      asset.asset_hint,
      index + 1,
      asset.review_status,
      JSON.stringify(asset.bbox)
    ];

    // Find existing row or append
    let foundRow = -1;
    for (let i = 1; i < existingData.length; i++) {
      if (existingData[i][0] === assetId) {
        foundRow = i + 1;
        break;
      }
    }

    if (foundRow > -1) {
      assetSheet.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      assetSheet.appendRow(rowData);
    }
  });
}
