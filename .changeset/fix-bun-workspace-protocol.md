---
"@viseed/core": patch
"@viseed/plugin-auth": patch
"@viseed/plugin-common-widgets": patch
"@viseed/theme-blog": patch
---

Fix publishing so the `workspace:*` protocol is resolved to real versions before
packages are pushed to npm. Previously `changeset publish` (which falls back to
`npm publish` on Bun) shipped literal `workspace:*` ranges, breaking every
external install. Republishing all packages with resolved dependency versions.
