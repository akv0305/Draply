# Draply Coding Conventions
- Money is integer paise everywhere. Never floats.
- Times stored UTC, rendered in IST (Asia/Kolkata).
- All async functions return Result<T> from /lib/utils/result.
- Server Components by default; "use client" only when needed.
- DB writes via Server Actions or /app/api/* — never from client.
- Hard-logic stubs live in /lib/stubs and are marked
  with `// TODO[IDX]: <description>` so we can grep them.
- shadcn/ui primitives only — no custom CSS unless asked.
- Mobile-first: design at 375px, then 768, then 1280.
