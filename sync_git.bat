@echo off
echo Staging changes...
git add -A
echo Committing...
git commit -m "feat: consolidate hardening services and implement granular RBAC"
echo Pushing...
git push origin refactor/phase-0.1-setup
echo Final Status:
git log -n 2 --oneline
git status
