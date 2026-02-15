---
description: enforces a linear task management workflow to ensure clean git history
---

# Atomic Task Workflow

To maintain a clean git history and ensure high-quality code reviews, we follow an atomic task management workflow.

## Rules
1. **One Task at a Time**: Never work on more than one top-level task from the development plan simultaneously.
2. **Commit Often, Branch Cleanly**: 
   - Each task should ideally be its own commit or set of commits on a feature branch.
   - Complete the verification of the current task before moving to the next.
3. **Task Boundary Updates**: Call `task_boundary` immediately when switching to a new task to keep the UI in sync with the actual work being performed.
4. **No context-switching**: Avoid making "drive-by" fixes in unrelated files unless they are blocking the current task.

## Execution
Before starting a new task:
- [ ] Ensure the previous task is marked as `[x]` in `task.md`.
- [ ] Announce the name of the specific sub-task you are beginning.
- [ ] If applicable, create or switch to the relevant git branch.
