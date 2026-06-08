import { DBService } from './db';

/** Get saved spreadsheet ID for a user email */
export async function getUserSpreadsheetId(email: string): Promise<string | null> {
  return DBService.getSpreadsheetId(email);
}

/** Save spreadsheet ID for a user email */
export async function setUserSpreadsheetId(email: string, spreadsheetId: string): Promise<void> {
  return DBService.setSpreadsheetId(email, spreadsheetId);
}

/** Create a brand new Google Sheet for a user */
export async function createSpreadsheetForUser(
  accessToken: string,
  staffName: string
): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const title = `Báo cáo bán hàng - ${staffName} (${today})`;

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: 'Báo cáo' } }]
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create spreadsheet: ${res.status}`);
  }

  const data = await res.json();
  return data.spreadsheetId;
}

export interface ReportRowData {
  date: string;
  staffName: string;
  cash: number;
  installment: number;
  moVi: boolean;
  efficiency: number;
  tivi: number;
  tuLanh: number;
  mayGiat: number;
  mayLanh: number;
  smpTab: number;
  laptop: number;
  otherProduct: string;
  mln: number;
  qdh: number;
  quat: number;
  noiCom: number;
  noiChien: number;
  locKk: number;
  otherHousehold: string;
  vi: number;
  vieon: number;
  sim: number;
  dongHo: number;
  insurance: number;
  camera: number;
  sdp: number;
  den: number;
  loa: number;
  otherAccessory: string;
  ceTc: number;
  ceSs: number;
  ceCh: number;
  ceBo: number;
  ceXtt: number;
  ictTc: number;
  ictSs: number;
  ictCh: number;
  ictBo: number;
  ictXtt: number;
  leadsText: string;
}

/**
 * Dynamically fetches the title of the first sheet (tab) in the spreadsheet
 */
async function getFirstSheetTitle(spreadsheetId: string, accessToken: string): Promise<string> {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
    });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch spreadsheet metadata: ${res.statusText}`);
    }
    
    const data = await res.json();
    if (data.sheets && data.sheets.length > 0) {
      return data.sheets[0].properties.title;
    }
    return 'Sheet1';
  } catch (error) {
    console.warn('Could not fetch spreadsheet sheet list dynamically, falling back to Trang tính 1:', error);
    return 'Trang tính 1'; // Standard fallback in Vietnamese Google Sheets
  }
}

/**
 * Appends a formatted row of report data to the specified Google Sheet.
 */
export async function appendReportToSheet(
  spreadsheetId: string,
  accessToken: string,
  rowData: ReportRowData
): Promise<{ success: boolean; range: string }> {
  const sheetName = await getFirstSheetTitle(spreadsheetId, accessToken);
  const range = `${sheetName}!A:AO`; // 41 columns (A through AO)

  // Mapping the data strictly to columns A through AO
  // columns map:
  // 1: Ngày, 2: Tên Nhân viên, 3: Tiền mặt, 4: Trả chậm, 5: Mở Ví, 6: Tỉ lệ Trả chậm %,
  // 7: Tivi, 8: Tủ lạnh, 9: Máy giặt, 10: Máy lạnh, 11: SMP/Tab, 12: Laptop, 13: SP Khác,
  // 14: Máy lọc nước, 15: Quạt điều hòa, 16: Quạt, 17: Nồi cơm, 18: Nồi chiên, 19: Máy lọc KK, 20: Gia dụng khác,
  // 21: Ví, 22: Vieon, 23: SIM, 24: Đồng hồ, 25: Bảo hiểm, 26: Camera, 27: SDP, 28: Đèn, 29: Loa, 30: Phụ kiện khác,
  // 31: CE Thành công, 32: CE So giá, 33: CE Chiến, 34: CE Bỏ, 35: CE Xin thông tin,
  // 36: ICT Thành công, 37: ICT So giá, 38: ICT Chiến, 39: ICT Bỏ, 40: ICT Xin thông tin,
  // 41: Khách hàng (Leads)
  const columns = [
    rowData.date,
    rowData.staffName || '',
    rowData.cash,
    rowData.installment,
    rowData.moVi ? 'Có' : '',
    `${Math.round(rowData.efficiency)}%`,
    rowData.tivi,
    rowData.tuLanh,
    rowData.mayGiat,
    rowData.mayLanh,
    rowData.smpTab,
    rowData.laptop,
    rowData.otherProduct || '',
    rowData.mln,
    rowData.qdh,
    rowData.quat,
    rowData.noiCom,
    rowData.noiChien,
    rowData.locKk,
    rowData.otherHousehold || '',
    rowData.vi,
    rowData.vieon,
    rowData.sim,
    rowData.dongHo,
    rowData.insurance,
    rowData.camera,
    rowData.sdp,
    rowData.den,
    rowData.loa,
    rowData.otherAccessory || '',
    rowData.ceTc,
    rowData.ceSs,
    rowData.ceCh,
    rowData.ceBo,
    rowData.ceXtt,
    rowData.ictTc,
    rowData.ictSs,
    rowData.ictCh,
    rowData.ictBo,
    rowData.ictXtt,
    rowData.leadsText || ''
  ];

  const body = {
    range: range,
    majorDimension: 'ROWS',
    values: [columns]
  };

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Google Sheets API error: ${res.status} ${res.statusText}`);
  }

  const result = await res.json();
  return {
    success: true,
    range: result.updates?.updatedRange || range
  };
}

/**
 * Generates headers if sheet is empty. It's smart to do so if needed, but append handles this.
 * Let's provide a function to write the beautiful column header rows.
 */
export async function ensureHeaders(spreadsheetId: string, accessToken: string): Promise<boolean> {
  try {
    const sheetName = await getFirstSheetTitle(spreadsheetId, accessToken);
    const range = `${sheetName}!A1:AO1`;

    // First check if something exists in A1:D1
    const checkRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (checkRes.ok) {
      const data = await checkRes.json();
      if (data.values && data.values.length > 0) {
        // Headers already exist
        return false;
      }
    }

    const headers = [
      'Ngày báo cáo', 'Tên nhân viên', 'Tiền mặt', 'Trả chậm', 'Mở Ví', 'Tỉ lệ trả chậm %',
      'Tivi', 'Tủ lạnh', 'Máy giặt', 'Máy lạnh', 'SMP/Tab', 'Laptop', 'Sản phẩm khác',
      'Máy lọc nước', 'Quạt điều hòa', 'Quạt', 'Nồi cơm', 'Nồi chiên', 'Máy lọc KK', 'Gia dụng khác',
      'Ví', 'Vieon', 'SIM', 'Đồng hồ', 'Bảo hiểm',
      'Camera', 'SDP', 'Đèn', 'Loa', 'Phụ kiện khác',
      'CE - Thành công', 'CE - So giá', 'CE - Chiến', 'CE - Bỏ', 'CE - Xin thông tin',
      'ICT - Thành công', 'ICT - So giá', 'ICT - Chiến', 'ICT - Bỏ', 'ICT - Xin thông tin',
      'Thông tin Khách hàng (Leads)'
    ];

    const body = {
      range: range,
      majorDimension: 'ROWS',
      values: [headers]
    };

    const writeRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    return writeRes.ok;
  } catch (error) {
    console.error('Failed to ensure headers in google sheet:', error);
    return false;
  }
}

/**
 * Fetches all rows from the Google Sheet
 */
export async function fetchSheetReports(spreadsheetId: string, accessToken: string): Promise<any[][]> {
  try {
    const sheetName = await getFirstSheetTitle(spreadsheetId, accessToken);
    const range = `${sheetName}!A2:AO5000`; // Fetch the rows starting from row 2
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
    
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      if (res.status === 404) {
        return [];
      }
      throw new Error(`Failed to fetch sheet rows: ${res.statusText}`);
    }

    const data = await res.json();
    return data.values || [];
  } catch (error) {
    console.error('Error fetching sheet reports:', error);
    return [];
  }
}

/**
 * Fetches the first sheet's title and sheetId dynamically
 */
async function getFirstSheetMetadata(spreadsheetId: string, accessToken: string): Promise<{ title: string; sheetId: number }> {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title,sheets.properties.sheetId`, {
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch spreadsheet metadata: ${res.statusText}`);
    const data = await res.json();
    if (data.sheets && data.sheets.length > 0) {
      return {
        title: data.sheets[0].properties.title || 'Báo cáo',
        sheetId: data.sheets[0].properties.sheetId || 0
      };
    }
    return { title: 'Báo cáo', sheetId: 0 };
  } catch (error) {
    console.warn('Could not fetch spreadsheet metadata dynamically, falling back to default:', error);
    return { title: 'Báo cáo', sheetId: 0 };
  }
}

/**
 * Deletes a row matching the date and staffName from the Google Sheet
 */
export async function deleteReportFromSheet(
  spreadsheetId: string,
  accessToken: string,
  date: string,
  staffName: string
): Promise<boolean> {
  try {
    const rows = await fetchSheetReports(spreadsheetId, accessToken);
    if (!rows || rows.length === 0) return false;

    const matchIndex = rows.findIndex(row => {
      const rowDate = row[0] || '';
      const rowStaff = row[1] || '';
      return rowDate === date && rowStaff === staffName;
    });

    if (matchIndex === -1) {
      console.warn(`No matching row found in sheet for date=${date} and staffName=${staffName}`);
      return false;
    }

    const sheetRowIndex = matchIndex + 1; // 1-indexed for the data rows (Row 2 is index 1)

    const { sheetId } = await getFirstSheetMetadata(spreadsheetId, accessToken);

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: sheetRowIndex,
                endIndex: sheetRowIndex + 1
              }
            }
          }
        ]
      })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Failed to delete row: ${res.status}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting report from sheet:', error);
    return false;
  }
}

