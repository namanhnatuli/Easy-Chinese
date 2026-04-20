import "server-only";

import { getGoogleSheetsAccessToken } from "@/features/vocabulary-sync/google-service-account";

interface GoogleSheetProperties {
  title: string;
  sheetId: number;
}

interface GoogleSheetValueRow {
  rowNumber: number;
  values: Record<string, string>;
}

export interface GoogleSheetReadResult {
  spreadsheetId: string;
  sheetName: string;
  sheetId: string;
  headers: string[];
  rows: GoogleSheetValueRow[];
}

function normalizeHeaderName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function hasAnyVisibleCell(values: string[]) {
  return values.some((value) => value.trim().length > 0);
}

async function fetchGoogleJson<T>(url: string) {
  const accessToken = await getGoogleSheetsAccessToken();
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const responseText = await response.text();
    let message = `Google Sheets request failed (${response.status})`;

    try {
      const json = JSON.parse(responseText);
      if (json.error?.message) {
        message = json.error.message;
      }
    } catch {
      message = `${message}: ${responseText}`;
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

async function fetchSpreadsheetProperties(spreadsheetId: string) {
  return fetchGoogleJson<{
    sheets?: Array<{
      properties?: GoogleSheetProperties;
    }>;
  }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets(properties(title,sheetId))`,
  );
}

async function fetchSheetValues(spreadsheetId: string, sheetName: string) {
  const encodedRange = encodeURIComponent(sheetName);

  return fetchGoogleJson<{
    values?: string[][];
  }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodedRange}?majorDimension=ROWS`,
  );
}

export async function readGoogleSheetRows(input: {
  spreadsheetId: string;
  sheetName: string;
}): Promise<GoogleSheetReadResult> {
  const [metadata, valuesResponse] = await Promise.all([
    fetchSpreadsheetProperties(input.spreadsheetId),
    fetchSheetValues(input.spreadsheetId, input.sheetName),
  ]);

  const sheetProperties = metadata.sheets
    ?.map((sheet) => sheet.properties)
    .find((sheet): sheet is GoogleSheetProperties => Boolean(sheet && sheet.title === input.sheetName));

  if (!sheetProperties) {
    throw new Error(`Google Sheet "${input.sheetName}" was not found in spreadsheet ${input.spreadsheetId}.`);
  }

  const values = valuesResponse.values ?? [];
  const headerRowIndex = values.findIndex(hasAnyVisibleCell);

  if (headerRowIndex === -1) {
    return {
      spreadsheetId: input.spreadsheetId,
      sheetName: input.sheetName,
      sheetId: String(sheetProperties.sheetId),
      headers: [],
      rows: [],
    };
  }

  const rawHeaders = values[headerRowIndex] ?? [];
  const headers = rawHeaders.map(normalizeHeaderName);
  const duplicateHeaders = headers.filter((header, index) => header && headers.indexOf(header) !== index);

  if (duplicateHeaders.length > 0) {
    throw new Error(`Google Sheet header row contains duplicate columns: ${[...new Set(duplicateHeaders)].join(", ")}`);
  }

  const rows = values
    .slice(headerRowIndex + 1)
    .map((cells, index) => {
      const rowNumber = headerRowIndex + 2 + index;
      const rowValues = headers.reduce<Record<string, string>>((result, header, headerIndex) => {
        if (!header) {
          return result;
        }

        result[header] = (cells[headerIndex] ?? "").trim();
        return result;
      }, {});

      return {
        rowNumber,
        values: rowValues,
      };
    })
    .filter((row) => Object.values(row.values).some((value) => value.length > 0));

  return {
    spreadsheetId: input.spreadsheetId,
    sheetName: input.sheetName,
    sheetId: String(sheetProperties.sheetId),
    headers,
    rows,
  };
}
