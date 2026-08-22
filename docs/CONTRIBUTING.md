# Contributing to BaseOps

Thank you for contributing to BaseOps! This document outlines our development guidelines, security standards, and pull request workflow.

---

## 1. Development Standards

- **TypeScript**: Strict mode enabled. Do not use `any` unless absolutely necessary with explicit justification.
- **Next.js 16 App Router**: Follow server vs. client component boundaries (`"use client"` only where state or browser APIs are required).
- **Tailwind CSS v4**: Use CSS variable design tokens and utility classes for consistent dark-theme UI.
- **Form Validation**: Use Zod schemas paired with React Hook Form for all user input.

---

## 2. Security Commandments

1. **Never Bypass RLS**: Do not disable Row Level Security on any table.
2. **Never Weaken Policies**: If an application query fails an RLS policy, fix the application query or authorization model—never remove security checks.
3. **Never Commit Secrets**: Do not commit `.env`, `.env.local`, API keys, service-role keys, or passwords.
4. **search_path Hardening**: Any new `SECURITY DEFINER` PostgreSQL function MUST declare `SET search_path = public, pg_temp`.

---

## 3. Pre-Commit Verification Checklist

Before creating a commit or opening a pull request, you must run and pass the following four verification steps:

```bash
# 1. Run all unit and security logic tests
npm test

# 2. Run live database integration & adversarial attack suite
npm run test:live

# 3. Verify TypeScript type safety
npx tsc --noEmit

# 4. Verify Next.js production build & prerendering
npm run build
```

---

## 4. Git Commit Guidelines

Write clear, semantic commit messages:
- `feat(dispatch): add parcel batch assignment`
- `fix(security): harden vehicle update RLS policy`
- `docs(db): update schema ER diagram`
- `test(security): add test for route tenant isolation`
