# Phase 6: Database Runtime — SQLite / Turso / Postgres / MySQL (config + factory)

## Goal

- **Ship**: local **SQLite** + production **Turso (libSQL)** với cùng schema Drizzle hiện tại (`drizzle-orm/sqlite-core`).
- **Chuẩn bị sẵn**: khai báo **`postgres`** và **`mysql`** trong config và tài liệu để khi cần chỉ việc nối driver — kèm ranh giới rõ: hai driver này cần **lớp schema dialect** riêng trước khi “chỉ đổi driver” là đủ.

## Driver matrix (hai nhóm)

| Nhóm | Drivers | Drizzle schema | Ghi chú |
|------|---------|----------------|---------|
| **A — SQLite dialect** | `sqlite`, `turso` | Một codebase: `sqliteTable`, … | Turso = remote libSQL; bootstrap SQL kiểu SQLite/PRAGMA có thể khác file local — cần lớp bootstrap thống nhất. |
| **B — Server SQL** | `postgres`, `mysql` | Cần `pgTable` / `mysqlTable` (hoặc strategy multi-dialect có chủ đích) | Không thể reuse trực tiếp object schema `sqlite-core` cho adapter `node-postgres` / `mysql2`. |

## Scope (phase này)

- Implement nhánh **`turso`** trong `createDatabase()` (libSQL client + `drizzle-orm/libsql`), giữ **`sqlite`** mặc định dev.
- Giữ **`postgres`** / **`mysql`** trong `DatabaseConfig` và factory: hoặc **throw có hướng dẫn**, hoặc stub rõ “chưa nối” — để env/deploy chỉ cần đổi `driver` + `url` khi team sẵn sàng làm dialect B.
- Refactor bootstrap (`ensureMultisiteFoundation`, migrations nhỏ inline, …) thành **một lộ trình thực thi SQL** dùng được cho cả `bun:sqlite` và `@libsql/client` (**`createDatabase` async** + `await` trong `HanaCMS.launch()`).
- Connection / lỗi mạng (Turso): retry tạm thời trên bootstrap libSQL (3 lần, backoff ngắn).
- Tài liệu: ma trận dev/prod, env ví dụ; migration Drizzle cho Turso vẫn dùng `drizzle-kit` dialect sqlite.

## Out of scope (vẫn có thể track issue riêng)

- Schema production-ready cho **Postgres/MySQL** (bảng tương đương, kiểu timestamp, migration kit).
- Thay toàn bộ `sqliteTable` bằng một abstraction “một định nghĩa cho mọi engine” — Drizzle không có bảng trung lập kiểu đó; muốn multi-dialect phải thiết kế (duplicate có kiểm soát, codegen, hoặc một dialect chính).

## Target files

- `packages/core/src/database.ts` — factory + driver branches.
- `packages/core/src/database-bootstrap.ts` — bootstrap SQLite dialect dùng chung (Bun SQLite + libSQL).
- `packages/core/src/hana-cms.ts` — `await createDatabase(...)`.
- `packages/types/src/cms.ts` — `DatabaseConfig.driver` đủ bốn giá trị + field phụ (token, v.v.).
- `packages/core/package.json` — `@libsql/client`.
- `.cursor/rules/06-database-patterns.mdc` — matrix + quy ước hai nhóm driver.
- `apps/docs/guide/configuration.md` — ví dụ từng driver và caveat Postgres/MySQL.

## Acceptance criteria

- `createDatabase()` **async** hoạt động với `sqlite` và `turso` (cùng schema merge hiện tại).
- `DatabaseConfig` cho phép **`postgres`** / **`mysql`**; khi chọn mà chưa implement dialect B, lỗi runtime **giải thích rõ**.
- Multi-instance + nhiều domain vẫn an toàn với **nhóm A** (cùng remote DB Turso).
- Local dev mặc định không phức tạp hơn (SQLite file).
- Smoke test cho **sqlite + turso** (libSQL `file::memory:` trong CI).

## Risks

- **Parity**: PRAGMA / hành vi SQLite file vs libSQL remote.
- **API async**: mọi chỗ gọi `createDatabase` export ra ngoài package phải `await`.
- **Type `DatabaseInstance`**: `LibSQLDatabase` (một stack) — plugin luôn `await` query (async driver).

## Risk mitigation

- Bootstrap SQL tách `database-bootstrap.ts`; test song song hai nhánh A.
- Ghi ràng buộc Postgres/MySQL trong rule + docs.

## Rules to update in this phase

- `.cursor/rules/06-database-patterns.mdc` — full driver matrix, nhóm A/B, link tới file này nếu cần.

## Implementation checklist

- [x] Thêm dependency `@libsql/client` cho `@hana/core`.
- [x] Refactor bootstrap → `BootstrapCtx` + `runSqliteDialectBootstrap`; `createDatabase` async.
- [x] Wire `turso` + `authToken` (bắt buộc cho URL remote).
- [x] Message lỗi rõ ràng cho `postgres` / `mysql`.
- [x] Cập nhật docs + rule.
- [x] Smoke tests nhóm A (`packages/core/src/database-drivers.test.ts`).

## Last updated

2026-04-03 — Implemented Turso + shared bootstrap; checklist done.
2026-04-03 — Mở rộng scope: Turso + khai báo Postgres/MySQL; làm rõ hai nhóm schema Drizzle.
