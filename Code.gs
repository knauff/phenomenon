/**
 * The Phenomenon Project - Unified Ledger Management & Bidirectional Sync
 * 1. Web Form Ingestion (doPost)
 * 2. Push Sheet to GitHub Pull Request (createGithubPullRequest)
 * 3. Seed / Overwrite Sheet from GitHub CSV (pullFromGithubCsv)
 */

// 1. Spreadsheet Menu Hook
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('GitHub Sync')
    .addItem('Submit Sheet as Pull Request', 'createGithubPullRequest')
    .addSeparator()
    .addItem('Seed/Overwrite Sheet from GitHub CSV', 'pullFromGithubCsv')
    .addToUi();
}

// 2. Anonymous Web Form Ingestion Pipeline
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var rawContents = e.postData.contents;
    var data = JSON.parse(rawContents);

    // Schema mapping all 12 telemetry attributes
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

    // Auto-create header row if sheet is uninitialized
    if (sheet.getLastRow() === 0) {
      var headerRow = schema.map(function(item) { return item.label; });
      sheet.appendRow(headerRow);
    }

    // Append record
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

// 3. Pull & Overwrite Active Sheet from GitHub CSV
function pullFromGithubCsv() {
  var ui = SpreadsheetApp.getUi();
  var props = PropertiesService.getScriptProperties();

  var token = props.getProperty('GITHUB_TOKEN');
  var owner = props.getProperty('REPO_OWNER');
  var repo = props.getProperty('REPO_NAME');
  var baseBranch = props.getProperty('BASE_BRANCH') || 'main';
  var targetFilePath = props.getProperty('FILE_PATH') || 'data/phenomenon_master_dataset.csv';

  if (!token || !owner || !repo) {
    ui.alert(
      'Missing Configuration',
      'Please configure GITHUB_TOKEN, REPO_OWNER, and REPO_NAME under Project Settings > Script Properties.',
      ui.ButtonSet.OK
    );
    return;
  }

  // Destructive Action Confirmation Dialog
  var confirm = ui.alert(
    'WARNING: Overwrite Active Sheet',
    'This will completely ERASE all existing rows in the active sheet and replace them with the current data from GitHub repository (' + owner + '/' + repo + ' @ ' + baseBranch + ').\n\nThis operation cannot be undone. Are you sure you want to proceed?',
    ui.ButtonSet.YES_NO
  );

  if (confirm !== ui.Button.YES) {
    return;
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast('Fetching latest CSV file from GitHub...', 'GitHub Sync', 5);

    var fileContentUrl = 'https://api.github.com/repos/' + owner + '/' + repo + '/contents/' + targetFilePath + '?ref=' + baseBranch;
    var apiHeaders = {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'Google-Apps-Script-PR-Engine'
    };

    var res = UrlFetchApp.fetch(fileContentUrl, {
      method: 'GET',
      headers: apiHeaders,
      muteHttpExceptions: true
    });

    if (res.getResponseCode() !== 200) {
      throw new Error('Failed to fetch file from GitHub (' + res.getResponseCode() + '): ' + res.getContentText());
    }

    var json = JSON.parse(res.getContentText());
    if (!json.content) {
      throw new Error('No content returned for file: ' + targetFilePath);
    }

    // Decode GitHub Base64 content to raw UTF-8 CSV string
    var cleanBase64 = json.content.replace(/\s/g, '');
    var decodedBytes = Utilities.base64Decode(cleanBase64, Utilities.Charset.UTF_8);
    var csvText = Utilities.newBlob(decodedBytes).getDataAsString('UTF-8');

    // Parse RFC 4180 CSV rows into a 2D array
    var rows = parseCsvString(csvText);

    if (rows.length === 0 || rows[0].length === 0) {
      throw new Error('Parsed CSV contains no rows or invalid data.');
    }

    ss.toast('Overwriting spreadsheet with incoming dataset...', 'GitHub Sync', 5);

    var sheet = ss.getActiveSheet();

    // Clear all contents, data, and previous formats
    sheet.clear();

    // Populate sheet in a single atomic setValues call
    var range = sheet.getRange(1, 1, rows.length, rows[0].length);
    range.setValues(rows);

    // Format header row
    sheet.getRange(1, 1, 1, rows[0].length).setFontWeight('bold');
    sheet.setFrozenRows(1);

    ui.alert(
      'Sheet Overwrite Complete',
      'Successfully synced ' + (rows.length - 1) + ' records from GitHub (' + targetFilePath + ').',
      ui.ButtonSet.OK
    );

  } catch (err) {
    Logger.log('GitHub Pull Error: ' + err.toString());
    ui.alert('Import Failed', err.message, ui.ButtonSet.OK);
  }
}

// 4. GitHub Pull Request Dispatcher
function createGithubPullRequest() {
  var ui = SpreadsheetApp.getUi();
  var props = PropertiesService.getScriptProperties();

  var token = props.getProperty('GITHUB_TOKEN');
  var owner = props.getProperty('REPO_OWNER');
  var repo = props.getProperty('REPO_NAME');
  var baseBranch = props.getProperty('BASE_BRANCH') || 'main';
  var targetFilePath = props.getProperty('FILE_PATH') || 'data/phenomenon_master_dataset.csv';

  if (!token || !owner || !repo) {
    ui.alert(
      'Missing Configuration',
      'Please configure GITHUB_TOKEN, REPO_OWNER, and REPO_NAME under Project Settings > Script Properties.',
      ui.ButtonSet.OK
    );
    return;
  }

  var response = ui.alert(
    'Confirm Pull Request Submission',
    'This will format the active sheet as CSV, push it to a new branch on ' + owner + '/' + repo + ', and open a Pull Request against ' + baseBranch + '. Proceed?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    return;
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast('Formatting sheet into RFC 4180 CSV...', 'GitHub Sync', 5);

    var sheet = ss.getActiveSheet();
    var csvContent = convertSheetToCsv(sheet);
    var contentBase64 = Utilities.base64Encode(csvContent, Utilities.Charset.UTF_8);

    var apiHeaders = {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'Google-Apps-Script-PR-Engine'
    };

    // Step A: Fetch base branch HEAD commit SHA
    ss.toast('Querying base branch commit SHA...', 'GitHub Sync', 5);
    var baseRefUrl = 'https://api.github.com/repos/' + owner + '/' + repo + '/git/ref/heads/' + baseBranch;
    var baseRefRes = UrlFetchApp.fetch(baseRefUrl, {
      method: 'GET',
      headers: apiHeaders,
      muteHttpExceptions: true
    });

    if (baseRefRes.getResponseCode() !== 200) {
      throw new Error('Failed to locate base branch (' + baseBranch + '): ' + baseRefRes.getContentText());
    }

    var baseCommitSha = JSON.parse(baseRefRes.getContentText()).object.sha;

    // Step B: Create isolated feature branch
    var timestamp = Utilities.formatDate(new Date(), 'UTC', 'yyyyMMdd-HHmmss');
    var newBranchName = 'telemetry-update-' + timestamp;
    var createBranchUrl = 'https://api.github.com/repos/' + owner + '/' + repo + '/git/refs';

    var createBranchRes = UrlFetchApp.fetch(createBranchUrl, {
      method: 'POST',
      headers: apiHeaders,
      contentType: 'application/json',
      payload: JSON.stringify({
        ref: 'refs/heads/' + newBranchName,
        sha: baseCommitSha
      }),
      muteHttpExceptions: true
    });

    if (createBranchRes.getResponseCode() !== 201) {
      throw new Error('Failed to create branch (' + newBranchName + '): ' + createBranchRes.getContentText());
    }

    // Step C: Check if target file exists on repository to obtain blob SHA
    var fileContentUrl = 'https://api.github.com/repos/' + owner + '/' + repo + '/contents/' + targetFilePath + '?ref=' + newBranchName;
    var fileSha = null;

    var checkFileRes = UrlFetchApp.fetch(fileContentUrl, {
      method: 'GET',
      headers: apiHeaders,
      muteHttpExceptions: true
    });

    if (checkFileRes.getResponseCode() === 200) {
      fileSha = JSON.parse(checkFileRes.getContentText()).sha;
    }

    // Step D: Commit file blob to feature branch
    ss.toast('Committing updated dataset to ' + newBranchName + '...', 'GitHub Sync', 5);
    var commitPayload = {
      message: 'data: sync research telemetry ledger [' + timestamp + ']',
      content: contentBase64,
      branch: newBranchName
    };
    if (fileSha) {
      commitPayload.sha = fileSha;
    }

    var commitUrl = 'https://api.github.com/repos/' + owner + '/' + repo + '/contents/' + targetFilePath;
    var commitRes = UrlFetchApp.fetch(commitUrl, {
      method: 'PUT',
      headers: apiHeaders,
      contentType: 'application/json',
      payload: JSON.stringify(commitPayload),
      muteHttpExceptions: true
    });

    if (commitRes.getResponseCode() !== 200 && commitRes.getResponseCode() !== 201) {
      throw new Error('Commit failed: ' + commitRes.getContentText());
    }

    // Step E: Open Pull Request against base branch
    ss.toast('Opening Pull Request on GitHub...', 'GitHub Sync', 5);
    var recordCount = sheet.getLastRow() - 1;
    var prUrl = 'https://api.github.com/repos/' + owner + '/' + repo + '/pulls';
    var prPayload = {
      title: 'Update Telemetry Ledger (' + timestamp + ')',
      head: newBranchName,
      base: baseBranch,
      body: '### Automated Telemetry Synchronization\n\n' +
            '* **Source Tab**: `' + sheet.getName() + '`\n' +
            '* **Verified Records**: ' + (recordCount > 0 ? recordCount : 0) + '\n' +
            '* **Target Path**: `' + targetFilePath + '`\n\n' +
            '_Dispatched via Google Sheets Apps Script integration._'
    };

    var prRes = UrlFetchApp.fetch(prUrl, {
      method: 'POST',
      headers: apiHeaders,
      contentType: 'application/json',
      payload: JSON.stringify(prPayload),
      muteHttpExceptions: true
    });

    if (prRes.getResponseCode() !== 201) {
      throw new Error('Pull Request creation failed: ' + prRes.getContentText());
    }

    var prData = JSON.parse(prRes.getContentText());
    var prHtmlUrl = prData.html_url;

    ui.alert(
      'Pull Request Created',
      'Branch created: ' + newBranchName + '\n\n' +
      'Review on GitHub:\n' + prHtmlUrl,
      ui.ButtonSet.OK
    );

  } catch (err) {
    Logger.log('GitHub PR Error: ' + err.toString());
    ui.alert('Synchronization Failed', err.message, ui.ButtonSet.OK);
  }
}

// 5. RFC 4180 Compliant CSV Serializer (Sheet -> CSV Text)
function convertSheetToCsv(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length === 0) return '';

  var csvLines = [];

  for (var r = 0; r < data.length; r++) {
    var row = data[r];
    var line = [];

    for (var c = 0; c < row.length; c++) {
      var cell = row[c];

      if (cell instanceof Date) {
        line.push('"' + cell.toISOString() + '"');
      } else {
        var str = String(cell == null ? '' : cell);
        if (str.indexOf('"') !== -1 || str.indexOf(',') !== -1 || str.indexOf('\n') !== -1 || str.indexOf('\r') !== -1) {
          str = '"' + str.replace(/"/g, '""') + '"';
        }
        line.push(str);
      }
    }
    csvLines.push(line.join(','));
  }

  return csvLines.join('\r\n');
}

// 6. RFC 4180 Compliant CSV Parser (CSV Text -> 2D Sheet Array)
function parseCsvString(text) {
  var lines = [];
  var row = [];
  var inQuotes = false;
  var currentField = '';

  for (var i = 0; i < text.length; i++) {
    var char = text[i];
    var nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentField.trim());
      if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
        lines.push(row);
      }
      row = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField || row.length > 0) {
    row.push(currentField.trim());
    lines.push(row);
  }

  // Normalize jagged column lengths across rows
  if (lines.length > 0) {
    var maxCols = 0;
    for (var r = 0; r < lines.length; r++) {
      if (lines[r].length > maxCols) maxCols = lines[r].length;
    }
    for (var r = 0; r < lines.length; r++) {
      while (lines[r].length < maxCols) {
        lines[r].push('');
      }
    }
  }

  return lines;
}