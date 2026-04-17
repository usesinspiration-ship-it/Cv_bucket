# Admin Panel Technical Specification & Design

This document outlines the architecture, database schema, and implementation strategy for a premium Admin Panel for the CV Bucket application. This system implements Role-Based Access Control (RBAC) to manage user permissions and data visibility.

## 1. Core Objectives
- **User Management**: Lifecycle control for all application users.
- **Granular Permissions**: Toggle upload/download capabilities per user.
- **Data Isolation/Visibility**: Control whether a user sees only their own data or global data.
- **Resource Monitoring**: Audit logs and storage statistics.

---

## 2. Database Schema (Firestore)

### `users` (Collection)
Each document ID matches the Firebase Auth `uid`.

```typescript
interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'admin' | 'manager' | 'user';
  status: 'active' | 'suspended' | 'pending';
  permissions: {
    canUpload: boolean;
    canDownload: boolean;
    canDelete: boolean;
  };
  visibility: {
    level: 'own' | 'group' | 'all'; // 'all' allows seeing every CV in the bucket
    groupId?: string;               // For team-based visibility
  };
  limits: {
    maxUploadSizeMB: number;
    monthlyUploadLimit: number;
  };
  lastLogin: Timestamp;
  createdAt: Timestamp;
}
```

---

## 3. Backend Architecture (Express / Firebase Admin)

### A. RBAC Middleware
Protect admin-only endpoints using custom claims or Firestore lookups.

```typescript
// server/middleware/roles.ts
export async function requireRole(roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userUid = req.authUser?.uid;
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userUid).get();
    
    if (!userDoc.exists || !roles.includes(userDoc.data()?.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
}
```

### B. Data Visibility Filtering
Modify the CV repository to respect visibility levels.

```typescript
// server/services/cvRepository.ts
export async function listCvs(requestingUser: UserProfile) {
  const db = getFirestore();
  let query = db.collection('cvs');

  if (requestingUser.visibility.level === 'own') {
    query = query.where('userId', '==', requestingUser.uid);
  } else if (requestingUser.visibility.level === 'group') {
    query = query.where('groupId', '==', requestingUser.visibility.groupId);
  }
  // Admin with 'all' level doesn't get a 'where' filter

  const snapshot = await query.get();
  return snapshot.docs.map(doc => doc.data());
}
```

---

## 4. Admin API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/users` | List all users with pagination and search. |
| `PATCH` | `/api/admin/users/:uid` | Update role, permissions, or visibility level. |
| `GET` | `/api/admin/stats` | Global stats: total CVs, storage used, active users. |
| `POST` | `/api/admin/users/:uid/suspend` | Disable user access immediately. |

---

## 5. Frontend UI Design (React + Tailwind)

### Design Aesthetic: "Command Center"
- **Color Palette**: Emerald / Slate (matching core app) with high-contrast accent colors for status (Amber for suspended, Rose for critical actions).
- **Glassmorphism**: Layered cards with subtle backdrops.

### Key Components:
1.  **User Dashboard Table**:
    - Real-time search by email/name.
    - Inline toggles for `Upload` and `Download`.
    - Dropdown for `Visibility Level` (Own, Group, All).
2.  **Global Stats Row**:
    - Animated counters for "Total CVs Indexed".
    - Progress bars for Cloudflare R2 storage capacity.
3.  **Active Sessions Monitor**:
    - List of currently logged-in users and their last activity.

---

## 6. Security Implementation Steps

1.  **Firebase Custom Claims**: On first login or admin change, set `{ role: 'admin' }` in Firebase Auth custom claims to allow frontend-level protection without extra Firestore hits.
2.  **Audit Logging**: Every admin action (permission change, deletion) must be logged to a `system_logs` collection.
3.  **S3/R2 Policy Enforcement**: Generate pre-signed URLs only if the user profile has `permissions.canDownload === true`.

---

> [!TIP]
> For maximum performance, use Firebase Functions to update Custom Claims whenever a user's role is changed in the Firestore `users` collection. This ensures the frontend and backend are always in sync with minimal latency.
