function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var rawContents = e.postData.contents;
    var data = JSON.parse(rawContents);

    // Schema definition mapping all 12 telemetry attributes
    var schema = [
      { label: "Timestamp", val: data.timestamp || new Date().toISOString() },
      { label: "Primary Category", val: data.category || "" },
      { label: "Phenomenon Sub-Type", val: data.subCategory || "" },
      { label: "Title / Headline", val: data.title || "" },
      { label: "Incident Date / Timeframe", val: data.incidentDate || "" },
      { label: "Environmental Setting", val: data.setting || "" },
      { label: "Geographic Region", val: data.location || "" },
      { label: "Witness Count", val: data.witnessCount || "" },
      { label: "Physical Trace Corroboration", val: data.physicalTrace || "" },
      { label: "Sensate Signatures", val: data.signatures || "" },
      { label: "Detailed Account", val: data.details || data.report || "" },
      { label: "Aftermath & Ontological Impact", val: data.aftermath || "" }
    ];

    // Ensure comprehensive 12-column header row exists
    if (sheet.getLastRow() === 0) {
      var headerRow = schema.map(function(item) { return item.label; });
      sheet.appendRow(headerRow);
    }

    // Append complete row in strict structural order
    var rowValues = schema.map(function(item) { return item.val; });
    sheet.appendRow(rowValues);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", appended: rowValues.length }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}