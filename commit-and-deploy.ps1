# commit-and-deploy.ps1
# Makes clean, logically-grouped commits and pushes to GitHub,
# which triggers the GitHub Actions deploy workflow.
# Run from the repo root:  .\commit-and-deploy.ps1

$ErrorActionPreference = "Stop"
Set-Location "F:\Script-Projects\eloai"

Write-Host "==> Sanity check: no stale lock" -ForegroundColor Cyan
if (Test-Path ".git\index.lock") {
    Remove-Item ".git\index.lock" -Force
    Write-Host "    removed leftover index.lock"
}

Write-Host "==> Commit 1: auto-deploy pipeline + line-ending normalization" -ForegroundColor Cyan
git add .gitattributes .gitignore .github/workflows/deploy.yml deploy/GITHUB-ACTIONS-SETUP.md
git commit -m "Add GitHub Actions auto-deploy pipeline + LF normalization" -m "Push to master runs the test suite then rsyncs website/ to the server over SSH. .gitattributes forces LF to stop CRLF churn from Windows editors."

Write-Host "==> Commit 2: site content updates" -ForegroundColor Cyan
git add website/sections.jsx website/assets/discoveries.md
git commit -m "Update homepage program count and add latest discovery entry" -m "Hero status now reads '10 active programs'. New discoveries.md entry: native compressed-vocabulary pretraining validates end-to-end on Qwen2.5-3B."

# Optional session-summary doc, if present and untracked
if (Test-Path "docs/updates/session-summary-decoder.md") {
    Write-Host "==> Commit 3: session summary doc" -ForegroundColor Cyan
    git add docs/updates/session-summary-decoder.md
    git commit -m "Add decoder/search architecture session summary"
}

# Final commit carries [skip ci] so this FIRST push does NOT auto-deploy.
# That lets us run a safe dry-run from the Actions tab before any real deploy.
Write-Host "==> Final commit: persona identity test suite ([skip ci] = no deploy yet)" -ForegroundColor Cyan
git add tests/
git commit -m "Add persona identity + ASCII art test suite (61 tests) [skip ci]"

Write-Host "==> Pushing to origin/master" -ForegroundColor Cyan
git push origin master

Write-Host ""
Write-Host "Pushed. No deploy ran yet (first push was marked [skip ci])." -ForegroundColor Green
Write-Host "NEXT: GitHub -> Actions -> 'Deploy eloai.dev' -> Run workflow." -ForegroundColor Yellow
Write-Host "Leave 'Dry run' CHECKED. It will connect over SSH and report what WOULD" -ForegroundColor Yellow
Write-Host "change on the server, writing nothing. Paste me the log and we'll go live." -ForegroundColor Yellow
