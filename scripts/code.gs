function doPost(e) {
  var spreadsheet = SpreadsheetApp.openById("1-jYZXmU-z31-MQwb79pT2PfXgWNVcsC5sN-sM7pszmw");

  try {
    var requestData = JSON.parse(e.postData.contents);
    
    // Support both UUID and plain text QR codes
    var qrData, qrType, status;
    
    if (requestData.uuid) {
      var parsedUUID = JSON.parse(requestData.uuid);
      qrData = parsedUUID.data;
      qrType = 'uuid';
      status = parsedUUID.status;

      // Check if this is an unpaid QR code
      if (qrData.includes('-UP-')) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          message: "Payment required",
          alreadyScanned: false,
          requiresPayment: true,
          securityMessage: "This QR code requires payment before timing in. Please proceed to the registration desk."
        })).setMimeType(ContentService.MimeType.JSON);
      }
    } else if (requestData.text) {
      qrData = requestData.text;
      qrType = 'text';
      status = 'regular';
    } else {
      throw new Error("Invalid request format");
    }

    var timestamp = new Date();
    var formattedTime = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "hh:mm:ss a");

    var sheets = spreadsheet.getSheets();
    
    for (var s = 0; s < sheets.length; s++) {
      var sheet = sheets[s];
      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();

      if (values.length === 0) continue;

      // Find headers
      var idHeaderLocation = findHeaderLocation(values, ["UUID", "ID", "QR CODE I.D.", "QR CODE ID"]);
      var timeInHeaderLocation = findHeaderLocation(values, ["TIME IN", "TIME-IN", "TIMEIN"]);

      if (!idHeaderLocation || !timeInHeaderLocation) {
        Logger.log("Headers not found in sheet: " + sheet.getName());
        continue;
      }

      // Find day columns in the row below TIME-IN
      var dayColumns = [];
      var dayRowIndex = timeInHeaderLocation.row + 1;
      
      // Get all columns starting from TIME-IN column
      var rowValues = values[dayRowIndex];
      Logger.log("Row values for day columns:", rowValues);

      // Get reference date from the sheet's metadata or create one
      var METADATA_KEY = "reference_date";
      var referenceDate = null;
      var userProperties = PropertiesService.getUserProperties();
      var storedDate = userProperties.getProperty(METADATA_KEY);

      if (!storedDate) {
        // First time: Set today as reference date (Day 1)
        referenceDate = new Date(timestamp);
        userProperties.setProperty(METADATA_KEY, referenceDate.toISOString());
      } else {
        referenceDate = new Date(storedDate);
      }

      Logger.log("Reference date (Day 1):", referenceDate);

      // Map the columns to dates
      for (var col = timeInHeaderLocation.col; col < rowValues.length; col++) {
        var cellValue = String(rowValues[col]).trim();
        if (cellValue.match(/Day\s*\d+/i)) {
          var dayNum = parseInt(cellValue.match(/\d+/)[0]);
          
          // Calculate date for this day column based on reference date
          var columnDate = new Date(referenceDate);
          columnDate.setDate(referenceDate.getDate() + (dayNum - 1));

          dayColumns.push({
            col: col,
            title: cellValue,
            dayNumber: dayNum,
            date: columnDate
          });
          Logger.log(`${cellValue} maps to ${columnDate.toLocaleDateString()}`);
        }
      }

      // Get current day based on user's device time
      var today = new Date(timestamp);
      Logger.log("Current timestamp:", today);

      // Find the appropriate day column based on date difference
      var daysDiff = Math.floor((today - referenceDate) / (1000 * 60 * 60 * 24));
      var currentDayNumber = daysDiff + 1; // Day 1 = reference date
      Logger.log("Days difference:", daysDiff, "Current day number:", currentDayNumber);

      var todayColumn = dayColumns.find(col => col.dayNumber === currentDayNumber);

      // If we're on a later day than available columns, use the last column
      if (!todayColumn && currentDayNumber > dayColumns.length) {
        todayColumn = dayColumns[dayColumns.length - 1];
      }

      Logger.log("Selected column:", todayColumn);

      if (!todayColumn) {
        Logger.log("No valid day column found");
        continue;
      }

      // Search for ID and check/update time
      for (var i = dayRowIndex + 1; i < values.length; i++) {
        var cellValue = String(values[i][idHeaderLocation.col]).trim();
        var searchValue = String(qrData).trim();
        
        if (cellValue === searchValue) {
          // Check existing time in today's column
          var timeInValue = values[i][todayColumn.col];
          
          if (timeInValue && String(timeInValue).trim() !== '') {
            return ContentService.createTextOutput(JSON.stringify({
              success: false,
              message: "Already scanned for " + todayColumn.title,
              alreadyScanned: true,
              timeIn: timeInValue,
              securityMessage: "You have already recorded your time for " + todayColumn.title
            })).setMimeType(ContentService.MimeType.JSON);
          }

          // Record new time
          var timeInCell = sheet.getRange(i + 1, todayColumn.col + 1);
          timeInCell.setNumberFormat("@");
          timeInCell.setValue("'" + formattedTime);

          // After successfully recording time, update Early Top 10
          updateEarlyTop10(spreadsheet, {
            name: values[i][3],  // Column D - Name
            company: values[i][4], // Column E - Company
            email: values[i][5],   // Column F - Email
            timeIn: formattedTime,
            date: today
          });

          return ContentService.createTextOutput(JSON.stringify({
            success: true,
            message: "Time In recorded for " + todayColumn.title,
            sheet: sheet.getName(),
            timeIn: formattedTime,
            status: status,
            day: todayColumn.title
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    return ContentService.createTextOutput(
      JSON.stringify({ 
        success: false, 
        message: `${qrType.toUpperCase()} not found: ${qrData} in any sheet` 
      })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("Error: " + error.toString());
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, message: "Error: " + error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// Helper function to find header location
function findHeaderLocation(values, possibleHeaders) {
  for (var i = 0; i < values.length; i++) {
    for (var j = 0; j < values[i].length; j++) {
      var cellValue = String(values[i][j]).trim().toUpperCase();
      // More flexible header matching
      if (possibleHeaders.some(header => 
        cellValue === header.toUpperCase() || 
        cellValue.replace(/\s+/g, '') === header.toUpperCase().replace(/\s+/g, '')
      )) {
        return { row: i, col: j };
      }
    }
  }
  return null;
}

// Helper function to find day columns under TIME-IN header
function findDayColumns(sheet, timeInHeader) {
  var headerRow = timeInHeader.row + 1; // Row below TIME-IN header
  var values = sheet.getRange(headerRow + 1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var dayColumns = [];

  // Start from TIME-IN column
  for (var i = timeInHeader.col; i < values.length; i++) {
    var cellValue = String(values[i]).trim();
    if (cellValue.match(/Day\s*\d+/i)) { // Match "Day" followed by numbers
      dayColumns.push({
        col: i,
        title: cellValue,
        dayNumber: parseInt(cellValue.match(/\d+/)[0])
      });
    }
  }

  return dayColumns;
}

// Helper function to find the appropriate column for today
function findTodayColumn(dayColumns, today) {
  // Get current day number (1-based)
  var currentDay = today.getDate();
  
  // Make sure we have valid day columns
  if (!dayColumns || dayColumns.length === 0) return null;
  
  // Find the matching day column
  var dayNumber = ((currentDay - 1) % dayColumns.length) + 1;
  var matchingColumn = dayColumns.find(col => col.dayNumber === dayNumber);
  
  Logger.log("Current date: " + today.toLocaleDateString());
  Logger.log("Looking for day number: " + dayNumber);
  Logger.log("Found column: " + (matchingColumn ? matchingColumn.title : "none"));
  
  return matchingColumn || dayColumns[0];
}

// Add this helper function at the bottom
function isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

function getDaysBetweenDates(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
  const diffDays = Math.round(Math.abs((date1 - date2) / oneDay));
  return diffDays;
}

function updateEarlyTop10(spreadsheet, entryData) {
  // Get or create "Early Top 10" sheet
  let earlyTop10Sheet = spreadsheet.getSheetByName("Early Top 10");
  if (!earlyTop10Sheet) {
    earlyTop10Sheet = createEarlyTop10Sheet(spreadsheet);
  }

  // Get current date in format "MM/DD/YYYY"
  const currentDate = Utilities.formatDate(entryData.date, Session.getScriptTimeZone(), "MM/dd/yyyy");

  // Get existing data
  const data = earlyTop10Sheet.getDataRange().getValues();
  const headerRow = data[0];

  // Define the fixed columns
  const NAME_COL = 0;
  const COMPANY_COL = 1;
  const EMAIL_COL = 2;
  const TIME_COL = 3;

  // Initialize headers if needed
  if (headerRow.length < 4) {
    earlyTop10Sheet.getRange(1, 1).setValue("Name");
    earlyTop10Sheet.getRange(1, 2).setValue("Company Name");
    earlyTop10Sheet.getRange(1, 3).setValue("Email Address");
    earlyTop10Sheet.getRange(1, 4).setValue("TIME-IN");
    // Re-fetch data after header initialization
    data[0] = ["Name", "Company Name", "Email Address", "TIME-IN"];
  }

  // Get today's entries (if any exist)
  let todayEntries = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][TIME_COL]) { // Check TIME-IN column
      todayEntries.push({
        name: data[i][NAME_COL],
        company: data[i][COMPANY_COL],
        email: data[i][EMAIL_COL],
        timeIn: data[i][TIME_COL]
      });
    }
  }

  // Add new entry
  todayEntries.push({
    name: entryData.name,
    company: entryData.company,
    email: entryData.email,
    timeIn: entryData.timeIn
  });

  // Sort by time
  todayEntries.sort((a, b) => {
    const timeA = new Date(`1970/01/01 ${a.timeIn}`).getTime();
    const timeB = new Date(`1970/01/01 ${b.timeIn}`).getTime();
    return timeA - timeB;
  });

  // Keep only top 10
  todayEntries = todayEntries.slice(0, 10);

  // Clear existing entries
  if (data.length > 1) {
    earlyTop10Sheet.getRange(2, 1, Math.max(data.length - 1, 10), 4).clear();
  }

  // Write top 10 entries
  todayEntries.forEach((entry, index) => {
    const rowIndex = index + 2; // Start from row 2
    const range = earlyTop10Sheet.getRange(rowIndex, 1, 1, 4);
    range.setValues([[
      entry.name,
      entry.company,
      entry.email,
      entry.timeIn
    ]]);
    
    // Format time column to 12-hour format
    earlyTop10Sheet.getRange(rowIndex, 4)
      .setNumberFormat("hh:mm:ss am/pm")
      .setValue(entry.timeIn);
  });
}

function createEarlyTop10Sheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet("Early Top 10");
  
  // Set up headers with correct labels
  const headers = [["Name", "Company Name", "Email Address", "TIME-IN"]];
  sheet.getRange(1, 1, 1, 4).setValues(headers);
  
  // Format header row
  const headerRange = sheet.getRange(1, 1, 1, 4);
  headerRange.setBackground("#4169E1");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  
  // Set column widths
  sheet.setColumnWidth(1, 200); // Name
  sheet.setColumnWidth(2, 200); // Company Name
  sheet.setColumnWidth(3, 250); // Email Address
  sheet.setColumnWidth(4, 100); // TIME-IN
  
  // Add borders and formatting
  sheet.getRange(1, 1, 11, 4).setBorder(true, true, true, true, true, true);
  
  return sheet;
}
