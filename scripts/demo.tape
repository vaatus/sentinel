Output docs/demo.gif

Set FontSize 16
Set Width 1100
Set Height 720
Set Theme "Catppuccin Mocha"
Set TypingSpeed 30ms
Set Shell zsh

Type "node packages/cli/dist/index.js scan --framework hipaa --path ./demo-clinic-app"
Sleep 600ms
Enter
Sleep 3500ms

Type "clear"
Enter
Sleep 400ms

Type "# Bob found 19 HIPAA violations. Time to auto-remediate."
Enter
Sleep 1200ms
Type "node packages/cli/dist/index.js remediate --all --path ./demo-clinic-app 2>&1 | head -25"
Sleep 600ms
Enter
Sleep 3500ms

Type "# Open the dashboard to see the score, PHI flows, and PR diffs."
Enter
Sleep 1500ms
Type "open http://localhost:3000   # SENTINEL_TARGET=$(pwd)/demo-clinic-app npm run dashboard"
Sleep 400ms
Enter
Sleep 2000ms
