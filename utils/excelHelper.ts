
import * as XLSX from 'xlsx';
import { AppData, TabName } from '../types';
import { EXCEL_STRUCTURE } from '../constants';

export const parseExcelFile = async (file: File): Promise<{ data: AppData; logs: string[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const result: Partial<AppData> = {};
        const logs: string[] = [];

        Object.keys(EXCEL_STRUCTURE).forEach((tab) => {
          const sheet = workbook.Sheets[tab];
          if (!sheet) {
            logs.push(`Missing tab: ${tab}`);
            result[tab as TabName] = [] as any;
          } else {
            const json = XLSX.utils.sheet_to_json(sheet);
            // Basic column check
            const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] as string[];
            const expected = EXCEL_STRUCTURE[tab as TabName];
            expected.forEach(col => {
              if (!headers?.includes(col)) logs.push(`Missing column "${col}" in tab "${tab}"`);
            });
            result[tab as TabName] = json as any;
          }
        });

        resolve({ data: result as AppData, logs });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

export const exportToExcel = (data: AppData, fileName: string = 'family_assets_export.xlsx') => {
  const workbook = XLSX.utils.book_new();
  
  (Object.keys(EXCEL_STRUCTURE) as TabName[]).forEach((tab) => {
    const sheetData = data[tab];
    const sheet = XLSX.utils.json_to_sheet(sheetData, { header: EXCEL_STRUCTURE[tab] });
    XLSX.utils.book_append_sheet(workbook, sheet, tab);
  });

  XLSX.writeFile(workbook, fileName);
};
