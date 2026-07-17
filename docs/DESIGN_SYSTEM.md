# ExamTrust Design System

## Design read

ExamTrust is a trust-first academic assessment product for students, lecturers, and administrators. The interface uses a calm modern academic language with practical information density and restrained motion.

- Design variance: 4/10
- Motion intensity: 3/10
- Visual density: 6/10
- Foundation: customized shadcn/ui and Radix UI on Tailwind CSS 3
- Brand accent: teal-blue
- Typography: Be Vietnam Pro
- Themes: light, dark, and system preference

## Visual rules

- Use one teal-blue brand accent. Semantic success, warning, and danger colors are reserved for real states.
- Cards use a 14px outer radius, controls use 8-10px, and status labels use 6px.
- Prefer spacing and subtle dividers over nested cards.
- Use tabular figures for scores, counts, time, and analytics.
- Avoid decorative gradients, glass effects, fake metrics, and unsupported social proof.
- Motion communicates feedback or state change only and must respect reduced-motion preferences.

## Product rules

- Integrity screens describe signals for instructor review and never declare cheating automatically.
- Exam-taking screens prioritize focus, timer visibility, autosave state, and recovery information.
- Pass or fail labels come from business data. The presentation layer does not recalculate them.
- Existing routes, API field names, entity IDs, and seeded demo data remain unchanged.

## Accessibility and responsive targets

- WCAG AA contrast minimum, visible focus, keyboard navigation, semantic headings, and labeled controls.
- Interactive targets are at least 44px where practical.
- Verify at 360x800, 768x1024, 1280x800, and 1440x900.
- Multi-column layouts collapse explicitly below 768px; data tables provide horizontal scroll or a compact card view.
