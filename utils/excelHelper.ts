
import * as XLSX from 'xlsx';
import { AppData, TabName } from '../types';
import { EXCEL_STRUCTURE } from '../constants';

/**
 * Normalizes Excel data by:
 * 1. Trimming whitespace from headers
 * 2. Mapping rows to the expected schema
 * 3. Ensuring numeric values are actually numbers
 */
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

          // Convert to array of arrays first to handle header normalization manually
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];
          
          if (rows.length === 0) {
            result[tab] = [];
            return;
          }

          // Clean headers (trim spaces)
          const rawHeaders = rows[0] as string[];
          const cleanHeaders = rawHeaders.map(h => String(h || '').trim());
          const expectedCols = EXCEL_STRUCTURE[tab];

          // Check for missing columns
          expectedCols.forEach(col => {
            if (!cleanHeaders.includes(col)) {
              logs.push(`⚠️ Column "${col}" not found in sheet "${tab}".`);
            }
          });

          // Map remaining rows to objects based on cleaned headers
          const dataRows = rows.slice(1).map((row) => {
            const obj: any = {};
            expectedCols.forEach(col => {
              const colIndex = cleanHeaders.indexOf(col);
              let val = colIndex > -1 ? row[colIndex] : null;

              // Data Type Normalization
              if (val !== null && val !== undefined) {
                // Force numeric types for columns expected to be numbers
                const numericCols = ['保额', '汇率', '购入价格', '股份', '市值', '估值', '借款额', '公司总分红', '分红金额'];
                if (numericCols.includes(col)) {
                  const num = Number(val);
                  val = !isNaN(num) ? num : val;
                }
                
                // Convert Date objects to YYYY-MM-DD strings for consistency
                if (val instanceof Date) {
                  val = val.toISOString().split('T')[0];
                }
              }
              
              obj[col] = val;
            });
            return obj;
          });

          // Filter out truly empty rows
          result[tab] = dataRows.filter((row: any) => 
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
