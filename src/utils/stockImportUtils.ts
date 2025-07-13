import { parseISO, isValid } from 'date-fns';

export interface StockImportData {
  product: string;
  category: string;
  date: Date;
  quantity: number;
}

export interface StockImportPreview {
  data: StockImportData[];
  errors: { row: number; field: string; message: string }[];
}

// Clean and normalize column names for your specific format
function cleanColumnName(name: string): string {
  // Remove extra spaces, normalize accents, and clean
  let cleaned = name.trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters except spaces
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .trim();
  
  // Convert to lowercase for mapping
  const lowerCleaned = cleaned.toLowerCase();
  
  // Enhanced mappings for your specific Excel format
  const mappings: { [key: string]: string } = {
    // Product variations
    'product': 'Product',
    'produit': 'Product',
    'article': 'Product',
    'nom': 'Product',
    'name': 'Product',
    'item': 'Product',
    
    // Category variations (including Type mapping)
    'category': 'Category',
    'categorie': 'Category',
    'type': 'Category',
    'famille': 'Category',
    'group': 'Category',
    'groupe': 'Category',
    
    // Date variations
    'date': 'Date',
    'jour': 'Date',
    'day': 'Date',
    'time': 'Date',
    'timestamp': 'Date',
    
    // Quantity variations
    'quantity': 'Quantity',
    'quantite': 'Quantity',
    'qty': 'Quantity',
    'qte': 'Quantity',
    'stock': 'Quantity',
    'nb': 'Quantity',
    'nombre': 'Quantity',
    'count': 'Quantity'
  };
  
  // Check for exact match first
  if (mappings[lowerCleaned]) {
    return mappings[lowerCleaned];
  }
  
  // Check for partial matches
  for (const [key, value] of Object.entries(mappings)) {
    if (lowerCleaned.includes(key) || key.includes(lowerCleaned)) {
      return value;
    }
  }
  
  // If no mapping found, return title case version
  return cleaned.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

export function validateStockImport(rawData: any[]): StockImportPreview {
  const requiredColumns = ['Product', 'Category', 'Date', 'Quantity'];
  const validData: StockImportData[] = [];
  const errors: { row: number; field: string; message: string }[] = [];

  if (rawData.length === 0) {
    errors.push({
      row: 0,
      field: 'structure',
      message: 'Aucune donnée trouvée dans le fichier'
    });
    
    return { data: [], errors };
  }

  // Get available columns from first row and normalize them
  const firstRow = rawData[0];
  const rawColumns = Object.keys(firstRow).filter(key => key !== '_rowIndex');
  
  // Create mapping from raw columns to normalized columns
  const columnMapping: { [key: string]: string } = {};
  const normalizedColumns: string[] = [];
  
  rawColumns.forEach(rawCol => {
    const normalized = cleanColumnName(rawCol);
    columnMapping[rawCol] = normalized;
    normalizedColumns.push(normalized);
  });
  
  console.log('Stock Import - Raw columns:', rawColumns);
  console.log('Stock Import - Column mapping:', columnMapping);
  console.log('Stock Import - Normalized columns:', normalizedColumns);
  console.log('Stock Import - Required columns:', requiredColumns);
  
  // Check for required columns
  const missingColumns = requiredColumns.filter(required => 
    !normalizedColumns.includes(required)
  );

  if (missingColumns.length > 0) {
    // Create detailed error message with suggestions
    let errorMessage = `Colonnes manquantes ou mal nommées.\n\n`;
    errorMessage += `📋 Colonnes requises: ${requiredColumns.join(', ')}\n`;
    errorMessage += `📄 Colonnes trouvées: ${normalizedColumns.join(', ')}\n`;
    errorMessage += `❌ Colonnes manquantes: ${missingColumns.join(', ')}\n\n`;
    
    errorMessage += `💡 Suggestions de mapping automatique:\n`;
    rawColumns.forEach(rawCol => {
      const normalized = columnMapping[rawCol];
      if (requiredColumns.includes(normalized)) {
        errorMessage += `✅ "${rawCol}" → "${normalized}"\n`;
      } else {
        errorMessage += `❓ "${rawCol}" → "${normalized}" (non reconnu)\n`;
      }
    });
    
    errorMessage += `\n🔧 Pour corriger:\n`;
    errorMessage += `• Renommez vos colonnes pour qu'elles correspondent aux noms requis\n`;
    errorMessage += `• Ou utilisez des variantes reconnues:\n`;
    errorMessage += `  - Product: "Produit", "Article", "Nom"\n`;
    errorMessage += `  - Category: "Catégorie", "Type", "Famille"\n`;
    errorMessage += `  - Date: "Date", "Jour"\n`;
    errorMessage += `  - Quantity: "Quantité", "Qty", "Qté", "Stock"`;

    errors.push({
      row: 1,
      field: 'structure',
      message: errorMessage
    });
    
    return { data: [], errors };
  }

  // Create reverse mapping to find original column names
  const reverseMapping: { [key: string]: string } = {};
  Object.entries(columnMapping).forEach(([rawCol, normalized]) => {
    reverseMapping[normalized] = rawCol;
  });

  // Process each row
  rawData.forEach((row, index) => {
    const rowNumber = row._rowIndex || index + 2;
    const stockData: Partial<StockImportData> = {};

    try {
      // Product
      const productField = row[reverseMapping.Product] || '';
      if (!productField.toString().trim()) {
        errors.push({
          row: rowNumber,
          field: 'Product',
          message: 'Le nom du produit est requis'
        });
      } else {
        stockData.product = productField.toString().trim();
      }

      // Category
      const categoryField = row[reverseMapping.Category] || '';
      if (!categoryField.toString().trim()) {
        errors.push({
          row: rowNumber,
          field: 'Category',
          message: 'La catégorie est requise'
        });
      } else {
        // Clean category name (remove extra spaces)
        stockData.category = categoryField.toString().trim().replace(/\s+/g, ' ');
      }

      // Quantity
      const quantityField = row[reverseMapping.Quantity] || '';
      const quantity = parseInt(quantityField.toString());
      if (isNaN(quantity) || quantity < 0) {
        errors.push({
          row: rowNumber,
          field: 'Quantity',
          message: 'La quantité doit être un nombre positif ou zéro'
        });
      } else {
        stockData.quantity = quantity;
      }

      // Date
      const dateField = row[reverseMapping.Date] || '';
      if (!dateField.toString().trim()) {
        errors.push({
          row: rowNumber,
          field: 'Date',
          message: 'La date est requise'
        });
      } else {
        const parsedDate = parseDate(dateField.toString());
        if (!parsedDate) {
          errors.push({
            row: rowNumber,
            field: 'Date',
            message: 'Format de date invalide (utilisez YYYY-MM-DD ou DD/MM/YYYY)'
          });
        } else {
          stockData.date = parsedDate;
        }
      }

      // If all fields are valid, add to valid data
      if (stockData.product && stockData.category && 
          stockData.quantity !== undefined && stockData.date) {
        validData.push(stockData as StockImportData);
      }

    } catch (error) {
      errors.push({
        row: rowNumber,
        field: 'general',
        message: 'Erreur lors du traitement de la ligne'
      });
    }
  });

  return { data: validData, errors };
}

function parseDate(dateString: string): Date | null {
  const trimmed = dateString.trim();
  
  // Handle Excel date numbers (days since 1900-01-01)
  const excelDateNumber = parseFloat(trimmed);
  if (!isNaN(excelDateNumber) && excelDateNumber > 1) {
    // Excel date serial number
    const excelEpoch = new Date(1900, 0, 1);
    const date = new Date(excelEpoch.getTime() + (excelDateNumber - 2) * 24 * 60 * 60 * 1000);
    if (isValid(date)) {
      return date;
    }
  }
  
  // Format DD/MM/YYYY (your format)
  const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return isValid(date) ? date : null;
  }
  
  // Format YYYY-MM-DD
  const isoDate = parseISO(trimmed);
  if (isValid(isoDate)) {
    return isoDate;
  }
  
  // Format DD-MM-YYYY
  const ddmmyyyyDashMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmyyyyDashMatch) {
    const [, day, month, year] = ddmmyyyyDashMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return isValid(date) ? date : null;
  }
  
  // Try to parse as a standard date
  const standardDate = new Date(trimmed);
  if (isValid(standardDate)) {
    return standardDate;
  }
  
  return null;
}