---
trigger: always_on
---

# Coding & Tooling Standards

## JavaScript / TypeScript
- **Framework**: React with Vite.
- **Language**: TypeScript (Strict mode enabled).
- **Naming**: 
    - Components: PascalCase (e.g., `CardComponent.tsx`).
    - Functions/Variables: camelCase.
    - Exporting: Preferred named exports over default exports for better IDE support.
- **Language Standard**: **British English (en-GB)** must be used for all naming, comments, and IDs (e.g., `Prioritise` instead of `Prioritize`, `colour` instead of `color`).

## Core Modules & Routing
We will adhere to these specific names for the primary app sections to ensure consistency:
1. **Dashboard**: The main overview and mission control.
2. **Prioritise**: The decision-making/swipe interface for backlog tasks.
3. **Execute**: The focused interface for the single task currently in "Doing".
4. **Settings**: Configuration, board management, and notification settings.

> [!IMPORTANT]
> If a new part of the application or a feature is introduced that does not have defined terminology, a discussion must take place to agree on naming before implementation begins.

## Styling
- **Utility-First**: Tailwind CSS.
- **Components**: DaisyUI for standard UI elements (buttons, modals, cards).
- **Custom CSS**: Use Vanilla CSS modules ONLY if Tailwind cannot achieve the specific design (e.g., complex animations).

## Tooling
- **Linting**: ESLint with `eslint-config-prettier`.
- **Formatting**: Prettier with 2-space indentation.
- **Database**: Drizzle ORM. Keep schema definitions in a central `schema.ts` file.

## Testing
- **Unit/Integration**: Vitest.
- **Focus**: Test core business logic (scheduling, prioritization constraints) over UI components where possible.
