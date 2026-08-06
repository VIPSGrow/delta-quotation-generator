# Excel Export Task

## Steps

- [x] Update `Quotation` interface in app/quotations/page.tsx to include unit, unit_value, finish, size
- [x] Add `exportToExcel` function using xlsx
- [x] Replace inert Excel `<Link>` with `<button>` calling exportToExcel
- [x] Regenerate Prisma client to fix related type errors
- [ ] Test the export
