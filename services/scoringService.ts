/**
 * Parses a CSV string into an array of arrays, handling quoted fields with newlines and commas.
 * @param csvString The CSV content as a string.
 * @returns A 2D array of strings.
 */
export const parseCSV = (csvString: string): string[][] => {
    if (!csvString) return [];

    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;

    // Normalize line endings for consistent parsing
    const normalizedCsv = csvString.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

    for (let i = 0; i < normalizedCsv.length; i++) {
        const char = normalizedCsv[i];

        if (inQuotes) {
            if (char === '"') {
                // Check for an escaped double quote ("")
                if (i + 1 < normalizedCsv.length && normalizedCsv[i + 1] === '"') {
                    currentField += '"';
                    i++; // Skip the next quote
                } else {
                    inQuotes = false;
                }
            } else {
                currentField += char;
            }
        } else {
            switch (char) {
                case ',':
                    currentRow.push(currentField);
                    currentField = '';
                    break;
                case '\n':
                    currentRow.push(currentField);
                    rows.push(currentRow);
                    currentRow = [];
                    currentField = '';
                    break;
                case '"':
                    // A quote should only appear at the start of an unquoted field
                    if (currentField.length === 0) {
                        inQuotes = true;
                    } else {
                        // This is technically a malformed CSV (quote inside unquoted field),
                        // but we'll append it to be lenient.
                        currentField += char;
                    }
                    break;
                default:
                    currentField += char;
            }
        }
    }

    // Add the final row if the file doesn't end with a newline
    if (currentRow.length > 0 || currentField.length > 0) {
        currentRow.push(currentField);
        rows.push(currentRow);
    }

    return rows;
};


/**
 * Parses a CSV for a single task's answer key.
 * Expects format: category_id,content,overall_band_score
 */
export const parseTaskKey = (csvString: string): string[][] => {
    const rows = parseCSV(csvString);
    if (rows.length === 0) {
        throw new Error("Task key file is empty or invalid.");
    }
    // Skip header row if it exists (e.g., 'category_id,content,overall_band_score')
    const startIndex = rows[0][0].toLowerCase() === 'category_id' ? 1 : 0;
    
    const dataRows = rows.slice(startIndex);

    if (dataRows.some(row => row.length < 3)) {
        throw new Error("Some rows in the task key file are malformed. Expected 'category_id,content,overall_band_score'.");
    }

    return dataRows;
};
