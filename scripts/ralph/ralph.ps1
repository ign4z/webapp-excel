# Ralph Wiggum - Long-running AI agent loop
# Usage: .\ralph.ps1 -Tool amp|claude -MaxIterations 10

param(
    [ValidateSet("amp", "claude")]
    [string]$Tool = "amp",  # Default to amp for backwards compatibility
    [int]$MaxIterations = 10
)

# Get script directory
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path

# Define file paths
$PRD_FILE = Join-Path $SCRIPT_DIR "prd.json"
$PROGRESS_FILE = Join-Path $SCRIPT_DIR "progress.txt"
$ARCHIVE_DIR = Join-Path $SCRIPT_DIR "archive"
$LAST_BRANCH_FILE = Join-Path $SCRIPT_DIR ".last-branch"

# Validate tool choice
if ($Tool -notmatch "^(amp|claude)$") {
    Write-Host "Error: Invalid tool '$Tool'. Must be 'amp' or 'claude'." -ForegroundColor Red
    exit 1
}

# Archive previous run if branch changed
if ((Test-Path $PRD_FILE) -and (Test-Path $LAST_BRANCH_FILE)) {
    try {
        $prdContent = Get-Content $PRD_FILE -Raw | ConvertFrom-Json
        $CURRENT_BRANCH = $prdContent.branchName
    }
    catch {
        $CURRENT_BRANCH = ""
    }

    $LAST_BRANCH = if (Test-Path $LAST_BRANCH_FILE) { Get-Content $LAST_BRANCH_FILE } else { "" }

    if ($CURRENT_BRANCH -and $LAST_BRANCH -and $CURRENT_BRANCH -ne $LAST_BRANCH) {
        # Archive the previous run
        $DATE = Get-Date -Format "yyyy-MM-dd"
        # Strip "ralph/" prefix from branch name for folder
        $FOLDER_NAME = $LAST_BRANCH -replace "^ralph/", ""
        $ARCHIVE_FOLDER = Join-Path $ARCHIVE_DIR "$DATE-$FOLDER_NAME"

        Write-Host "Archiving previous run: $LAST_BRANCH"
        New-Item -ItemType Directory -Path $ARCHIVE_FOLDER -Force | Out-Null

        if (Test-Path $PRD_FILE) {
            Copy-Item $PRD_FILE -Destination $ARCHIVE_FOLDER -Force
        }
        if (Test-Path $PROGRESS_FILE) {
            Copy-Item $PROGRESS_FILE -Destination $ARCHIVE_FOLDER -Force
        }

        Write-Host "   Archived to: $ARCHIVE_FOLDER"

        # Reset progress file for new run
        @"
# Ralph Progress Log
Started: $(Get-Date)
---
"@ | Out-File $PROGRESS_FILE -Encoding UTF8 -Force
    }
}

# Track current branch
if (Test-Path $PRD_FILE) {
    try {
        $prdContent = Get-Content $PRD_FILE -Raw | ConvertFrom-Json
        $CURRENT_BRANCH = $prdContent.branchName
        if ($CURRENT_BRANCH) {
            $CURRENT_BRANCH | Out-File $LAST_BRANCH_FILE -Encoding UTF8 -Force
        }
    }
    catch {
        # Ignore JSON parsing errors
    }
}

# Initialize progress file if it doesn't exist
if (-not (Test-Path $PROGRESS_FILE)) {
    @"
# Ralph Progress Log
Started: $(Get-Date)
---
"@ | Out-File $PROGRESS_FILE -Encoding UTF8 -Force
}

Write-Host "Starting Ralph - Tool: $Tool - Max iterations: $MaxIterations" -ForegroundColor Cyan

for ($i = 1; $i -le $MaxIterations; $i++) {
    Write-Host ""
    Write-Host "===============================================================" -ForegroundColor Yellow
    Write-Host "  Ralph Iteration $i of $MaxIterations ($Tool)" -ForegroundColor Yellow
    Write-Host "===============================================================" -ForegroundColor Yellow

    # Run the selected tool with the ralph prompt
    try {
        if ($Tool -eq "amp") {
            # AMP tool
            $PROMPT_FILE = Join-Path $SCRIPT_DIR "prompt.md"
            if (Test-Path $PROMPT_FILE) {
                $OUTPUT = Get-Content $PROMPT_FILE -Raw | & amp --dangerously-allow-all 2>&1
                Write-Host $OUTPUT
            }
            else {
                Write-Host "Error: prompt.md not found at $PROMPT_FILE" -ForegroundColor Red
                exit 1
            }
        }
        else {
            # Claude Code: use --dangerously-skip-permissions for autonomous operation
            $CLAUDE_FILE = Join-Path $SCRIPT_DIR "CLAUDE.md"
            if (Test-Path $CLAUDE_FILE) {
                $OUTPUT = Get-Content $CLAUDE_FILE -Raw | & claude --dangerously-skip-permissions --print 2>&1
                Write-Host $OUTPUT
            }
            else {
                Write-Host "Error: CLAUDE.md not found at $CLAUDE_FILE" -ForegroundColor Red
                exit 1
            }
        }
    }
    catch {
        Write-Host "Error running tool: $_" -ForegroundColor Red
        $OUTPUT = ""
    }

    # Check for completion signal
    if ($OUTPUT -match "<promise>COMPLETE</promise>") {
        Write-Host ""
        Write-Host "Ralph completed all tasks!" -ForegroundColor Green
        Write-Host "Completed at iteration $i of $MaxIterations" -ForegroundColor Green
        exit 0
    }

    Write-Host "Iteration $i complete. Continuing..." -ForegroundColor Gray
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "Ralph reached max iterations ($MaxIterations) without completing all tasks." -ForegroundColor Yellow
Write-Host "Check $PROGRESS_FILE for status."
exit 1
