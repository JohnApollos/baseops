# BaseOps API & RPC Reference Specification

This document provides the formal API specification for all HTTP Route Handlers and Database Remote Procedure Calls (RPCs) in BaseOps.

---

## 1. HTTP API Route Handlers

### 1.1 `POST /api/invite-team`
Invites a new team member (owner, dispatcher, or driver) into the caller's organization.

- **Authentication**: Required (Caller must possess an active Supabase session cookie).
- **Authorization**: Caller role must be `owner` or `dispatcher`.
  - *Dispatchers* are restricted to inviting `driver` roles only.
  - *Owners* may invite `owner`, `dispatcher`, or `driver` roles.

#### Request Headers:
```http
Content-Type: application/json
```

#### Request Body Schema:
```json
{
  "email": "james@company.com",
  "role": "driver",
  "full_name": "James Ochieng",
  "phone": "+254700300300",
  "org_id": "00000000-0000-0000-0000-000000000001"
}
```

| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `email` | `string` | **Yes** | Valid email address for the invitee. |
| `role` | `string` | **Yes** | Must be one of `"owner"`, `"dispatcher"`, or `"driver"`. |
| `full_name` | `string` | No | Full name of the invitee. |
| `phone` | `string` | No | Contact phone number. |
| `org_id` | `string (UUID)`| No | Must match caller's `org_id` (cross-tenant invite attempts rejected). |

#### Response Codes:
- **`200 OK`**: Invitation successfully created and email dispatched.
  ```json
  {
    "success": true,
    "message": "Invitation sent to james@company.com as driver."
  }
  ```
- **`400 Bad Request`**: Malformed JSON or invalid email/role.
- **`401 Unauthorized`**: Caller is not signed in.
- **`403 Forbidden`**: Caller lacks required role or attempted cross-tenant invitation.
- **`500 Internal Server Error`**: Unexpected server failure.

---

### 1.2 `GET /api/auth/callback`
Handles PKCE authorization code exchange following Supabase Auth email confirmation or OAuth redirect.

- **Authentication**: None (Exchanges one-time authorization code).
- **Query Parameters**:
  - `code` *(string)*: PKCE authorization code.
  - `next` *(string, optional)*: Redirect destination (defaults to `/dispatch`).
- **Behavior**:
  - Exchanges `code` for a session via `supabase.auth.exchangeCodeForSession()`.
  - Redirects user to `${origin}${next}` on success.
  - Redirects user to `${origin}/login?error=auth_callback_failed` on error.

---

### 1.3 `GET /api/auth/confirm`
Verifies OTP tokens or magic link hashes generated during user invitation or password recovery.

- **Query Parameters**:
  - `token_hash` *(string)*: Cryptographic verification token.
  - `type` *(string)*: Verification type (`magiclink`, `signup`, `recovery`).
  - `next` *(string, optional)*: Target redirect destination.
- **Behavior**:
  - Validates token hash via `supabase.auth.verifyOtp()`.
  - Sets authentication cookies on the response and redirects to dashboard.

---

## 2. Database Remote Procedure Calls (RPCs)

### 2.1 `create_organization_and_owner(org_name TEXT, org_slug TEXT)`
Atomically provisions a new organization and assigns the caller (`auth.uid()`) as the organization owner.

- **Language**: `PL/pgSQL`
- **Security Mode**: `SECURITY DEFINER` (`SET search_path = public, pg_temp`)
- **Permissions**: `GRANT EXECUTE TO authenticated;`
- **Parameters**:
  - `org_name` *(TEXT)*: Name of the logistics company.
  - `org_slug` *(TEXT)*: URL-safe slug.
- **Return Type**: `UUID` (The generated `organizations.id`).
- **Security Logic**:
  - Throws exception if caller already belongs to an organization.
  - Inserts new row into `public.organizations`.
  - Updates caller's row in `public.profiles` setting `org_id`, `role = 'owner'`, and `onboarded_at = now()`.

---

### 2.2 `get_user_org_id(user_id UUID)`
Internal helper function returning the `org_id` associated with a profile.

- **Language**: `PL/pgSQL`
- **Security Mode**: `SECURITY DEFINER` (`SET search_path = public, pg_temp`)
- **Permissions**: `REVOKE EXECUTE FROM PUBLIC, anon; GRANT EXECUTE TO authenticated, service_role;`
- **Return Type**: `UUID`

---

### 2.3 `get_user_role(user_id UUID)`
Internal helper function returning the RBAC `role` (`owner`, `dispatcher`, or `driver`) associated with a profile.

- **Language**: `PL/pgSQL`
- **Security Mode**: `SECURITY DEFINER` (`SET search_path = public, pg_temp`)
- **Permissions**: `REVOKE EXECUTE FROM PUBLIC, anon; GRANT EXECUTE TO authenticated, service_role;`
- **Return Type**: `TEXT`
