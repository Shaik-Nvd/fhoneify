param(
  [string]$WorkbookPath = (Join-Path $PSScriptRoot 'fixtures/Fhoneify_Cashify_Team_Testing_Clear_Instruct_with_iphone_samsung.xlsx'),
  [string]$OutputPath = 'scratch/coverage-expansion/canonical-coverage-case-register.json'
)
$ErrorActionPreference = 'Stop'
$expectedHash = '57f7b74f16e9d95ec1a17ba3f0b8ddc891cca3fe35a06bc983513ca0ec3bc0aa'
$resolvedWorkbook = (Resolve-Path -LiteralPath $WorkbookPath).Path
$hash = (Get-FileHash -LiteralPath $resolvedWorkbook -Algorithm SHA256).Hash.ToLowerInvariant()
$size = (Get-Item -LiteralPath $resolvedWorkbook).Length
if ($hash -ne $expectedHash -or $size -ne 17457) { throw "Workbook identity mismatch: sha256=$hash bytes=$size" }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead($resolvedWorkbook)
try {
  function Read-XmlEntry([string]$name) {
    $entry = $archive.GetEntry($name)
    if (!$entry) { throw "Missing workbook entry $name" }
    $reader = [IO.StreamReader]::new($entry.Open())
    try { $doc = [xml]$reader.ReadToEnd() } finally { $reader.Dispose() }
    return $doc
  }
  $ss = Read-XmlEntry 'xl/sharedStrings.xml'
  $ns = [Xml.XmlNamespaceManager]::new($ss.NameTable)
  $ns.AddNamespace('m', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
  $strings = @($ss.SelectNodes('//m:si', $ns) | ForEach-Object { ($_.SelectNodes('.//m:t', $ns) | ForEach-Object InnerText) -join '' })
  $workbook = Read-XmlEntry 'xl/workbook.xml'
  $wbNs = [Xml.XmlNamespaceManager]::new($workbook.NameTable)
  $wbNs.AddNamespace('m', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
  $worksheetName = $workbook.SelectSingleNode('//m:sheets/m:sheet[@sheetId="2"]', $wbNs).GetAttribute('name')
  if ($worksheetName -ne '02 PRICE ENTRY') { throw "Unexpected source worksheet: $worksheetName" }
  $sheet = Read-XmlEntry 'xl/worksheets/sheet2.xml'
  $ns = [Xml.XmlNamespaceManager]::new($sheet.NameTable)
  $ns.AddNamespace('m', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
  $byRow = @{}
  foreach ($row in $sheet.SelectNodes('//m:sheetData/m:row', $ns)) {
    $cells = @{}
    foreach ($cell in $row.SelectNodes('./m:c', $ns)) {
      $value = $cell.SelectSingleNode('./m:v', $ns)
      if (!$value) { continue }
      $text = $value.InnerText
      if ($cell.GetAttribute('t') -eq 's') { $text = $strings[[int]$text] }
      $column = [regex]::Match($cell.GetAttribute('r'), '^[A-Z]+').Value
      $cells[$column] = $text
    }
    $byRow[[int]$row.GetAttribute('r')] = $cells
  }
  function Classify([string]$instruction) {
    if ($instruction -match '^SCREEN SCRATCHES') { return 'screen_heavy' }
    if ($instruction -match '^CRACKED GLASS') { return 'glass_cracked' }
    if ($instruction -match '^DISPLAY LINES') { return 'display_lines' }
    if ($instruction -match '^HEAVY SPOTS') { return 'display_spots' }
    if ($instruction -match '^NON-ORIGINAL SCREEN') { return 'original_screen' }
    if ($instruction -match '^TOUCH FAILURE') { return 'touch' }
    if ($instruction -match '^CHARGING FAULT') { return 'charging' }
    if ($instruction -match '^BACK CAMERA FAULT') { return 'back_camera' }
    if ($instruction -match '^BODY SCRATCHES') { return 'body_heavy' }
    if ($instruction -match '^BODY DENTS') { return 'body_dents' }
    if ($instruction -match '^TWO DEFECTS') { return 'combined:screen_heavy+body_heavy' }
    if ($instruction -match '^THREE DISPLAY ISSUES') { return 'combined:display_spots+display_lines+display_discoloration' }
    throw "Unmapped raw instruction: $instruction"
  }
  $cases = [Collections.Generic.List[object]]::new()
  for ($rowNumber = 7; $rowNumber -le 56; $rowNumber++) {
    $r = $byRow[$rowNumber]
    if (!$r -or $r.A -notmatch '^FM\d{3}$') { throw "Unexpected source row $rowNumber" }
    $deviceId = $r.A
    $brand = if ($r.B -match '^Apple ') { 'Apple' } elseif ($r.B -match '^Samsung ') { 'Samsung' } elseif ($r.B -match '^Oneplus ') { 'OnePlus' } elseif ($r.B -match '^OnePlus ') { 'OnePlus' } elseif ($r.B -match '^Xiaomi ') { 'Xiaomi' } else { throw "Unknown brand in $($r.B)" }
    # Catalog model identity includes the manufacturer prefix, exactly as the
    # saved reference inputs and service fixtures do; retain the source cell.
    $model = [string]$r.B
    foreach ($letter in @('A','B','C')) {
      $instructionColumn = @{ A = $null; B = 'D'; C = 'E' }[$letter]
      $priceColumn = @{ A = 'G'; B = 'H'; C = 'I' }[$letter]
      $instruction = if ($letter -eq 'A') { 'PERSON A clean final price; instruction is clean baseline per workbook guide' } else { [string]$r[$instructionColumn] }
      $condition = if ($letter -eq 'A') { 'clean' } else { Classify $instruction }
      $rawPrice = $r[$priceColumn]
      $price = if ([string]::IsNullOrWhiteSpace([string]$rawPrice)) { $null } else { [int](($rawPrice -replace ',', '')) }
      $getUpto = if ([string]::IsNullOrWhiteSpace([string]$r.F)) { $null } else { [int](($r.F -replace ',', '')) }
      $caseId = "${deviceId}_${letter}"
      $cases.Add([ordered]@{
        caseId = $caseId; deviceId = $deviceId; brand = $brand; model = $model; variant = $r.C
        conditionText = $instruction; questionnaireIntent = @{}
        testerObservation = if ($null -eq $price) { $null } else { [ordered]@{ finalSellingPrice = $price; getUpto = $getUpto; sourceCell = "${priceColumn}${rowNumber}"; provenance = 'ORIGINAL_WORKBOOK_CELL'; observedAt = $null; manualTrace = $null } }
        originalWorkbook = [ordered]@{ workbookSha256 = $hash; sheet = 'TEAM PRICE ENTRY'; row = $rowNumber; phoneIdCell = "A$rowNumber"; modelCell = "B$rowNumber"; storageCell = "C$rowNumber"; instructionCell = if ($letter -eq 'A') { 'guide:A4' } else { "${instructionColumn}${rowNumber}" }; rawInstruction = $instruction; getUptoCell = "F$rowNumber"; getUpto = $getUpto; priceCell = "${priceColumn}${rowNumber}"; rawPrice = $rawPrice }
        reconstruction = [ordered]@{ sourceCaseId = $caseId; sourceConditionClass = $condition; sourceArtifact = 'original workbook sheet2 source cells'; syntheticInputsSeparateFromObservations = $true }
      })
    }
  }
  if ($cases.Count -ne 150 -or @($cases | Where-Object { $null -ne $_.testerObservation }).Count -ne 66) { throw "Expected 150 cases and 66 original prices; got $($cases.Count) and $(@($cases | Where-Object { $null -ne $_.testerObservation }).Count)" }
  $resolvedOutput = Join-Path (Get-Location) $OutputPath
  New-Item -ItemType Directory -Path (Split-Path -Parent $resolvedOutput) -Force | Out-Null
  $json = [ordered]@{ version = 'workbook-source-register/2026-10-04'; workbook = [ordered]@{ path = $resolvedWorkbook; sha256 = $hash; sizeBytes = $size; worksheet = $worksheetName; sourceRange = 'A6:I56'; priceBearingCases = 66; observationDatesAndManualTraces = 'UNKNOWN unless separately recorded in joined evidence' }; cases = $cases } | ConvertTo-Json -Depth 20
  [IO.File]::WriteAllText($resolvedOutput, $json + "`n", [Text.UTF8Encoding]::new($false))
  [ordered]@{ cases = $cases.Count; sourcePrices = 66; sha256 = $hash; output = $resolvedOutput } | ConvertTo-Json -Compress
} finally { $archive.Dispose() }
