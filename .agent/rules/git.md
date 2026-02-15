---
trigger: always_on
---

# Git Standards

To maintain a clean and navigable history, we will follow these standards.

## Branching Strategy
Since this is a single-user project, we will use a **Feature Branch** workflow to keep the `main` branch stable.

- `main`: Production-ready code.
- `feat/feature-name`: New features.
- `fix/bug-name`: Bug fixes.
- `docs/topic`: Documentation changes.

## Commit Messages
We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

**Format:** `<type>(scope): <description>`

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc.)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools and libraries

**Example:**
`feat(api): add endpoint for board-specific statuses`

**IMPORTANT**
Never reference agent rules or workflows in git

## Workflow
1. Create a branch from `main`.
2. Commit small, logical units of work.
3. Merge into `main` once the feature/fix is verified.
