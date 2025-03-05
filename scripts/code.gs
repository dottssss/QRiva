function doPost(e) {
  var spreadsheet = SpreadsheetApp.openById("1V77NWKs8D7CT2u5MAi7vEEeNa1XycSpsZbax9Ej7sbM");

  try {
    var requestData = JSON.parse(e.postData.contents);
    var parsedUUID = JSON.parse(requestData.uuid);
    var uuid = parsedUUID.data;
    var status = parsedUUID.status;
    var timestamp = new Date();
    var formattedTime = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "hh:mm:ss a");

    var sheets = spreadsheet.getSheets();

    for (var s = 0; s < sheets.length; s++) {
      var sheet = sheets[s];
      var values = sheet.getDataRange().getValues();
      
      if (values.length === 0) continue;

      var headers = values[0];
      var timeInColumn = -1;

      for (var col = 0; col < headers.length; col++) {
        if (headers[col].toString().toLowerCase().includes("time in")) {
          timeInColumn = col + 1;
          break;
        }
      }

      if (timeInColumn === -1) continue;

      for (var i = 1; i < values.length; i++) {
        if (String(values[i][0]).trim() === String(uuid).trim()) {
          // Check if time-in already exists
          if (values[i][timeInColumn - 1] && values[i][timeInColumn - 1].toString().trim() !== '') {
            return ContentService.createTextOutput(
              JSON.stringify({
                success: false,
                message: "QR Code already scanned",
                alreadyScanned: true,
                timeIn: values[i][timeInColumn - 1],
                securityMessage: "For security purposes, each QR code can only be scanned once to prevent duplicate entries and maintain accurate attendance records."
              })
            ).setMimeType(ContentService.MimeType.JSON);
          }

          var cell = sheet.getRange(i + 1, timeInColumn);
          cell.setNumberFormat("@");
          cell.setValue("'" + formattedTime);

          return ContentService.createTextOutput(
            JSON.stringify({ 
              success: true, 
              message: "Time In recorded", 
              sheet: sheet.getName(), 
              timeIn: formattedTime, 
              status: status, 
              row: i + 1, 
              column: timeInColumn 
            })
          ).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    // ...existing error handling...
  } catch (error) {
    // ...existing error handling...
  }
}