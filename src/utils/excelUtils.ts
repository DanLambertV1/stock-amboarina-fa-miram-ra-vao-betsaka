import * as XLSX from 'xlsx';

export function exportToExcel(data: any[], filename: string) {
  try {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    
    // Convert data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    
    // Write the file
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Erreur lors de l\'export Excel');
  }
}

export function importFromExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          reject(new Error('Le fichier doit contenir au moins une ligne d\'en-tête et une ligne de données'));
          return;
        }
        
        // Convert to object format
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1) as any[][];
        
        const result = rows.map(row => {
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] || '';
          });
          return obj;
        });
        
        resolve(result);
      } catch (error) {
        reject(new Error('Erreur lors de la lecture du fichier Excel'));
      }
    };
    
    reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
    reader.readAsArrayBuffer(file);
  });
}

export function parseClipboardData(text: string): any[] {
  try {
    const lines = text.trim().split('\n');
    
    if (lines.length < 2) {
      throw new Error('Les données doivent contenir au moins une ligne d\'en-tête et une ligne de données');
    }
    
    // Detect delimiter (tab is most common from Excel copy-paste)
    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : 
                     firstLine.includes(';') ? ';' : ',';
    
    const headers = lines[0].split(delimiter).map(h => h.trim());
    const rows = lines.slice(1);
    
    return rows.map(row => {
      const values = row.split(delimiter);
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = values[index]?.trim() || '';
      });
      return obj;
    });
  } catch (error) {
    throw new Error('Erreur lors de l\'analyse des données du presse-papiers');
  }
}