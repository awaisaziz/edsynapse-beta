# Admin Setup

EdSynapse has three roles: **teacher**, **student**, and **admin**. The admin
role is **not** exposed through the sign-up UI — it can only be assigned by
directly updating the database.

## Prerequisites

- Access to the Aurora PostgreSQL cluster (via `psql`, a SQL client, or the
  `npm run db:setup` pipeline).
- The target user must already have a regular account (teacher or student) created
  through the normal sign-up flow.

## Promoting a user to admin

### 1. Find the user's ID

Look up the user by email:

```sql
SELECT id, email, name, role, status
  FROM users
 WHERE email = 'target-user@example.com';
```

### 2. Update the role

```sql
UPDATE users
   SET role = 'admin', updated_at = now()
 WHERE email = 'target-user@example.com';
```

Or by user ID if you already have it:

```sql
UPDATE users
   SET role = 'admin', updated_at = now()
 WHERE id = '<user-id>';
```

### 3. Verify

```sql
SELECT id, email, name, role, status
  FROM users
 WHERE email = 'target-user@example.com';
```

The user must **log out and log back in** (or clear the `edsynapse_session`
cookie) for the role change to take effect, since the session caches the role at
login time.

## Revoking admin access

To demote an admin back to a regular role:

```sql
UPDATE users
   SET role = 'teacher', updated_at = now()   -- or 'student'
 WHERE email = 'admin-user@example.com';
```

## Listing all admins

```sql
SELECT id, email, name, status, created_at
  FROM users
 WHERE role = 'admin'
 ORDER BY created_at;
```

## What the admin role unlocks

Once promoted, the user gains access to the `/admin` dashboard, which includes:

| Feature              | API routes                                         |
| -------------------- | -------------------------------------------------- |
| User directory       | `GET/PATCH /api/admin/users`, `/api/admin/users/[id]` |
| Suspend / reactivate | `PATCH /api/admin/users/[id]`                      |
| Course oversight     | `GET/DELETE /api/admin/courses`, `/api/admin/courses/[id]` |
| Support inbox        | `GET/POST /api/admin/support`, `/api/admin/support/[id]` |

All admin API routes are protected by `requireUser("admin")`, which verifies the
session's role server-side before executing any logic. The edge middleware
(`src/middleware.ts`) also gates the `/admin` path by cookie presence.

## Schema reference

The admin role is defined by a check constraint added in
[`002-admin-support.sql`](../frontend/scripts/002-admin-support.sql):

```sql
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('teacher', 'student', 'admin'));
```

User status (used by suspend/reactivate):

```sql
ALTER TABLE users ADD CONSTRAINT users_status_check
  CHECK (status IN ('active', 'suspended'));
```
