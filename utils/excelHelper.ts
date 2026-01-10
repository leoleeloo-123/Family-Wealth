import * as XLSX from 'xlsx';
import { AppData, TabName } from '../types';
import { EXCEL_STRUCTURE } from '../constants';

export const parseExcelFile = async (file: File): Promise<{ data: AppData; logs: string[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject("File reading failed.");
    reader.onload = (e) => {
      try {
        const bytes = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(bytes, { type: 'array', cellDates: true });
        const result: Partial<AppData> = {};
        const logs: string[] = [];

        Object.keys(EXCEL_STRUCTURE).forEach((tabName) => {
          const tab = tabName as TabName;
          const sheet = workbook.Sheets[tab];
          
          if (!sheet) {
            logs.push(`⚠️ Missing sheet: "${tab}". Initializing with 0 records.`);
            result[tab] = [] as any;
            return;
          }

          const json = XLSX.utils.sheet_to_json(sheet, { defval: null });
          
          // Column verification
          const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] as string[];
          const expectedCols = EXCEL_STRUCTURE[tab];
          
          expectedCols.forEach(col => {
            if (!headers || !headers.includes(col)) {
              logs.push(`⚠️ Column "${col}" not found in sheet "${tab}". Values for this field will be empty.`);
            }
          });

          // Filter out rows that are completely empty (XLSX sometimes returns these)
          result[tab] = json.filter((row: any) => 
            Object.values(row).some(v => v !== null && v !== undefined && v !== '')
          ) as any;
        });

        resolve({ data: result as AppData, logs });
      } catch (err) {
        console.error("Excel Parser Error:", err);
        reject("The file is not a valid Excel document or is corrupted.");
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

export const exportToExcel = (data: AppData, fileName: string = 'family_assets_export.xlsx') => {
  try {
    const workbook = XLSX.utils.book_new();
    
    (Object.keys(EXCEL_STRUCTURE) as TabName[]).forEach((tab) => {
      const sheetData = data[tab] || [];
      const sheet = XLSX.utils.json_to_sheet(sheetData, { header: EXCEL_STRUCTURE[tab] });
      XLSX.utils.book_append_sheet(workbook, sheet, tab);
    });

    XLSX.writeFile(workbook, fileName);
  } catch (err) {
    console.error("Export Error:", err);
    alert("Export failed: " + err);
  }
};
