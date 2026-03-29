/**
 * invoiceScan.js - MediFlow ERP v2.0
 * Invoice scanning route - OCR via OCR.Space API + CSV parsing
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const requireAuth = require('../middleware/authMiddleware');

// Multer config: store in memory, max 10MB
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/csv', 'application/vnd.ms-excel'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Unsupported file type. Use JPG, PNG, PDF, or CSV.'));
    }
});

router.use(requireAuth);

const OCR_SPACE_API_KEY = process.env.OCR_SPACE_API_KEY || 'K89674888388957';

/**
 * POST /api/invoice-scan
 * Accepts a file (image/PDF/CSV) and returns structured purchase data
 */
router.post('/', upload.single('invoice'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { mimetype, buffer, originalname } = req.file;

        // CSV: parse directly, no OCR needed
        if (mimetype === 'text/csv' || mimetype === 'application/vnd.ms-excel' || originalname.endsWith('.csv')) {
            const result = parseCSV(buffer);
            return res.json(result);
        }

        // Image/PDF: use OCR.Space API for OCR
        const ocrText = await extractTextWithOCR(buffer, mimetype, originalname);
        const parsed = parseInvoiceText(ocrText);
        return res.json(parsed);

    } catch (error) {
        console.error('Invoice scan error:', error);
        res.status(500).json({ error: error.message || 'Failed to process invoice' });
    }
});

/**
 * Extract text from image/PDF using OCR.Space API
 * Uses multipart/form-data with file upload for better reliability
 * Includes retry logic and engine fallback
 */
async function extractTextWithOCR(buffer, mimetype, filename) {
    const isPDF = mimetype === 'application/pdf';

    // Try with Engine 2 first (better for tables/invoices), then Engine 1 as fallback
    const engines = ['2', '1'];
    let lastError = null;

    for (const engine of engines) {
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const result = await callOCRSpace(buffer, mimetype, filename, isPDF, engine);
                if (result) return result;
            } catch (err) {
                lastError = err;
                console.warn(`OCR attempt ${attempt} with Engine ${engine} failed:`, err.message);
                if (attempt < 2) {
                    // Wait before retry (exponential backoff)
                    await new Promise(r => setTimeout(r, 1000 * attempt));
                }
            }
        }
    }

    throw lastError || new Error('OCR failed after all attempts. Please try again.');
}

/**
 * Call OCR.Space API with given engine
 */
async function callOCRSpace(buffer, mimetype, filename, isPDF, engine) {
    // Use native global FormData and Blob instead of npm form-data package
    // Native fetch works perfectly with native FormData
    const form = new FormData();
    
    // Create a Blob from the buffer
    const blob = new Blob([buffer], { type: mimetype });
    
    // Use file upload instead of base64 - more reliable, smaller payload
    form.append('file', blob, filename || 'invoice.jpg');
    form.append('apikey', OCR_SPACE_API_KEY);
    form.append('OCREngine', engine);
    form.append('scale', 'true');
    form.append('isTable', 'true');
    if (isPDF) {
        form.append('filetype', 'PDF');
    }

    const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: form
    });

    if (!response.ok) {
        const errBody = await response.text();
        console.error(`OCR API HTTP error (Engine ${engine}):`, response.status, errBody);
        throw new Error(`OCR service returned error ${response.status}. Retrying...`);
    }

    const ocrResult = await response.json();

    if (ocrResult.IsErroredOnProcessing) {
        const errMsg = Array.isArray(ocrResult.ErrorMessage)
            ? ocrResult.ErrorMessage.join('; ')
            : (ocrResult.ErrorMessage || 'Unknown OCR error');
        console.error(`OCR.Space Processing Error (Engine ${engine}):`, errMsg);
        throw new Error(`OCR error: ${errMsg}`);
    }

    // Check exit code
    if (ocrResult.OCRExitCode && ocrResult.OCRExitCode > 2) {
        throw new Error('OCR could not process this image. Try a clearer photo.');
    }

    const extractedText = ocrResult.ParsedResults && ocrResult.ParsedResults.length > 0
        ? ocrResult.ParsedResults.map(p => p.ParsedText).join('\n')
        : '';

    if (!extractedText.trim()) {
        throw new Error('No text could be extracted from the image. Try a clearer, well-lit photo.');
    }

    console.log(`OCR successful with Engine ${engine}, extracted ${extractedText.length} chars`);
    return extractedText;
}

/**
 * Parse extracted OCR text into structured invoice data
 * Uses pattern matching to find invoice fields and line items
 */
function parseInvoiceText(text) {
    const result = {
        supplierInvNo: '',
        invoiceDate: '',
        items: [],
        rawText: text
    };

    if (!text) return result;

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // Try to find invoice number
    const invNoPatterns = [
        /inv(?:oice)?\s*(?:no|number|#)[.:=\s]*([A-Za-z0-9\-\/]+)/i,
        /bill\s*(?:no|number|#)[.:=\s]*([A-Za-z0-9\-\/]+)/i,
        /(?:no|number)[.:=\s]*([A-Za-z0-9\-\/]+)/i
    ];
    for (const pat of invNoPatterns) {
        const m = text.match(pat);
        if (m) { result.supplierInvNo = m[1].trim(); break; }
    }

    // Try to find date
    const datePatterns = [
        /(?:date|dt)[.:=\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
        /(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/,
        /(\d{4}[\/-]\d{1,2}[\/-]\d{1,2})/
    ];
    for (const pat of datePatterns) {
        const m = text.match(pat);
        if (m) {
            result.invoiceDate = normalizeDate(m[1].trim());
            break;
        }
    }

    // Try to parse items from tabular data
    // Look for lines that have a name followed by numbers (qty, price, etc.)
    const itemLines = [];
    let inItemSection = false;

    for (const line of lines) {
        // Detect table header
        if (/name|particular|description|product|medicine/i.test(line) &&
            /qty|quantity|rate|price|mrp|amount/i.test(line)) {
            inItemSection = true;
            continue;
        }

        // Detect end of items
        if (inItemSection && /total|grand|sub[\s-]?total|net|amount\s*due/i.test(line) && !/\d+\s+\d+/.test(line)) {
            break;
        }

        if (inItemSection) {
            const item = parseItemLine(line);
            if (item) itemLines.push(item);
        }
    }

    // If no structured items found, try a more aggressive approach
    if (itemLines.length === 0) {
        for (const line of lines) {
            // Look for lines with medicine-like names followed by numbers
            const item = parseItemLine(line);
            if (item && item.name.length > 2) {
                itemLines.push(item);
            }
        }
    }

    result.items = itemLines;
    return result;
}

/**
 * Parse a single line into an item object
 */
function parseItemLine(line) {
    if (!line || line.length < 3) return null;

    // Skip header/total lines
    if (/^(sr|s\.?no|sl|#|\d{1,2}[.)]?\s*$)/i.test(line.trim())) return null;
    if (/^(total|grand|sub|net|amount|tax|cgst|sgst|igst|discount)/i.test(line.trim())) return null;

    // Pattern: [optional sr.no] Name [Batch] Qty Price MRP [Expiry] ...
    // Try to extract numbers from the line
    const numbers = [];
    const numberRegex = /(\d+\.?\d*)/g;
    let match;
    while ((match = numberRegex.exec(line)) !== null) {
        numbers.push({ value: parseFloat(match[1]), index: match.index });
    }

    if (numbers.length < 2) return null; // Need at least qty and price

    // Extract the text part (name) - everything before the first significant number cluster
    let nameEnd = line.length;
    for (const n of numbers) {
        if (n.index < nameEnd && n.index > 2) {
            nameEnd = n.index;
            break;
        }
    }

    let name = line.substring(0, nameEnd).trim();
    // Remove leading serial numbers
    name = name.replace(/^\d+[.)]\s*/, '').trim();
    
    if (!name || name.length < 2) return null;

    // Try to extract batch number (alphanumeric pattern like B001, ABC123, etc.)
    let batch = '';
    const batchMatch = line.match(/\b([A-Z]{1,3}\d{2,6}[A-Z]?\d*)\b/i);
    if (batchMatch) batch = batchMatch[1];

    // Try to find expiry date in the line
    let expiryDate = '';
    const expiryMatch = line.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/);
    if (expiryMatch) {
        expiryDate = normalizeDate(expiryMatch[1]);
    } else {
        const expMonthYear = line.match(/(\d{1,2}[\/-]\d{2,4})(?:\s|$)/);
        if (expMonthYear) expiryDate = expMonthYear[1];
    }

    // Assign numbers to fields based on position
    const numVals = numbers.map(n => n.value);
    const item = {
        name,
        batch,
        qty: 1,
        purchasePrice: 0,
        mrp: 0,
        expiryDate,
        hsn: '',
        gstRate: 12
    };

    if (numVals.length >= 4) {
        // Likely: qty, price, mrp, amount (or similar)
        item.qty = Math.round(numVals[numVals.length - 4]) || 1;
        item.purchasePrice = numVals[numVals.length - 3] || 0;
        item.mrp = numVals[numVals.length - 2] || 0;
    } else if (numVals.length >= 3) {
        item.qty = Math.round(numVals[0]) || 1;
        item.purchasePrice = numVals[1] || 0;
        item.mrp = numVals[2] || 0;
    } else if (numVals.length >= 2) {
        item.qty = Math.round(numVals[0]) || 1;
        item.purchasePrice = numVals[1] || 0;
        item.mrp = numVals[1] || 0;
    }

    return item;
}

/**
 * Normalize date string to YYYY-MM-DD format
 */
function normalizeDate(dateStr) {
    if (!dateStr) return '';
    
    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    const parts = dateStr.split(/[\/-]/);
    if (parts.length === 3) {
        let [a, b, c] = parts;
        // DD/MM/YYYY or DD-MM-YYYY
        if (c.length === 4) return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
        // YYYY/MM/DD
        if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
        // DD/MM/YY
        const year = parseInt(c) < 50 ? `20${c}` : `19${c}`;
        return `${year}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
    }
    return dateStr;
}

/**
 * Parse CSV file into structured purchase data
 */
function parseCSV(buffer) {
    const csvStr = buffer.toString('utf-8');
    
    let records;
    try {
        records = parse(csvStr, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            relax_column_count: true
        });
    } catch (e) {
        // Try without headers
        records = parse(csvStr, {
            skip_empty_lines: true,
            trim: true,
            relax_column_count: true
        });
    }

    if (!records || !records.length) {
        return { supplierInvNo: '', invoiceDate: '', items: [], rawText: csvStr };
    }

    const items = [];

    // If records have column headers (object), map them
    if (typeof records[0] === 'object' && !Array.isArray(records[0])) {
        for (const row of records) {
            const keys = Object.keys(row);
            const findCol = (...patterns) => {
                for (const p of patterns) {
                    const k = keys.find(k => new RegExp(p, 'i').test(k));
                    if (k) return row[k];
                }
                return '';
            };

            const name = findCol('name', 'product', 'medicine', 'particular', 'description', 'item');
            if (!name) continue;

            items.push({
                name,
                batch: findCol('batch', 'lot'),
                qty: parseInt(findCol('qty', 'quantity', 'units')) || 1,
                purchasePrice: parseFloat(findCol('purchase.*price', 'cost', 'rate', 'price')) || 0,
                mrp: parseFloat(findCol('mrp', 'retail', 'selling.*price', 'max.*retail')) || 0,
                expiryDate: normalizeDate(findCol('expiry', 'exp', 'expiration')),
                hsn: findCol('hsn', 'sac'),
                gstRate: parseInt(findCol('gst', 'tax')) || 12,
                category: findCol('category', 'type') || 'General',
                schedule: findCol('schedule') || 'None',
                rackNo: findCol('rack', 'shelf', 'location'),
                reorderLevel: parseInt(findCol('reorder', 'min.*stock')) || 10,
                company: findCol('company', 'manufacturer', 'brand')
            });
        }
    } else {
        // Array-based: assume columns [Name, Batch, Qty, PurchasePrice, MRP, Expiry]
        for (const row of records) {
            if (row.length < 2 || !row[0]) continue;
            items.push({
                name: row[0] || '',
                batch: row[1] || '',
                qty: parseInt(row[2]) || 1,
                purchasePrice: parseFloat(row[3]) || 0,
                mrp: parseFloat(row[4]) || 0,
                expiryDate: normalizeDate(row[5] || ''),
                hsn: row[6] || '',
                gstRate: parseInt(row[7]) || 12
            });
        }
    }

    return {
        supplierInvNo: '',
        invoiceDate: '',
        items,
        rawText: csvStr
    };
}

module.exports = router;
