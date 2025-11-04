/**
 * Parses a CSV string into an array of arrays.
 * @param csvString The CSV content as a string.
 * @returns A 2D array of strings.
 */
const parseCSV = (csvString: string): string[][] => {
    if (!csvString) return [];
    return csvString.trim().split('\n').map(row => row.split(',').map(cell => cell.trim()));
}

/**
 * Parses a master answer key CSV into a structured object.
 * Expects format: taskId,id,prediction
 * @param masterKeyCsv The master answer key file content.
 * @returns An object where keys are taskIds and values are the answer data for that task.
 * @deprecated This function is for a single master key file. Use parseTaskKey for individual files.
 */
export const parseMasterKey = (masterKeyCsv: string): { [taskId: string]: string[][] } => {
    const rows = parseCSV(masterKeyCsv);
    if (rows.length === 0) {
        throw new Error("Master answer key file is empty or invalid.");
    }

    const keyMap: { [taskId: string]: string[][] } = {};
    
    // Skip header row if it exists
    const startIndex = rows[0][0].toLowerCase() === 'taskid' ? 1 : 0;

    for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 3) continue; // Malformed row
        
        const [taskId, id, prediction] = row;
        if (!keyMap[taskId]) {
            keyMap[taskId] = [];
        }
        keyMap[taskId].push([id, prediction]);
    }

    return keyMap;
}

/**
 * Parses a CSV for a single task's answer key.
 * Expects format: id,prediction
 */
export const parseTaskKey = (csvString: string): string[][] => {
    const rows = parseCSV(csvString);
    if (rows.length === 0) {
        throw new Error("Task key file is empty or invalid.");
    }
    // Skip header row if it exists (e.g., 'id,prediction')
    const startIndex = rows[0][0].toLowerCase() === 'id' ? 1 : 0;
    
    const dataRows = rows.slice(startIndex);

    if (dataRows.some(row => row.length < 2)) {
        throw new Error("Some rows in the task key file are malformed. Expected 'id,prediction'.");
    }

    return dataRows;
};


/**
 * Calculates the accuracy score by comparing a submission CSV to an answer key array.
 * @param submissionCsv The contestant's submission file content.
 * @param answerKeyData The pre-parsed answer key data for the specific task.
 * @returns A score from 0 to 100 representing the percentage of correct predictions.
 */
export const calculateScore = (submissionCsv: string, answerKeyData: string[][]): number => {
    const submissionData = parseCSV(submissionCsv);

    if (submissionData.length === 0) {
        throw new Error("Submission file is empty or invalid.");
    }

    // Skip header row for comparison if present
    const subStartIndex = submissionData[0][0].toLowerCase() === 'id' ? 1 : 0;
    const actualSubData = submissionData.slice(subStartIndex);

    if (actualSubData.length !== answerKeyData.length) {
        throw new Error(`Submission has ${actualSubData.length} data rows, but answer key has ${answerKeyData.length}. Row counts must match.`);
    }

    let correctPredictions = 0;
    
    // Assumes the format is [ID, Prediction] for both files.
    for (let i = 0; i < answerKeyData.length; i++) {
        const submissionRow = actualSubData[i];
        const answerRow = answerKeyData[i];

        if (!submissionRow || !answerRow || submissionRow.length < 2 || answerRow.length < 2) continue;

        // Compare the prediction column (index 1)
        if (submissionRow[1] === answerRow[1]) {
            correctPredictions++;
        }
    }

    const accuracy = (correctPredictions / answerKeyData.length) * 100;
    return accuracy;
};