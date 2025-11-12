# 🔧 Hardcoded URL Fix Script

## Files with Hardcoded localhost:4000 URLs

### Priority Files to Update

#### 1. **Dashboard.jsx** (10 occurrences)
- Line 38: User profile fetch
- Line 60: Achievements fetch
- Line 79: Unlocked achievements fetch
- Line 101: Plans fetch
- Line 120: Notes fetch
- Line 139: Quizzes fetch
- Line 144: Quiz attempts count
- Line 343: File upload
- Line 363: Generate summary
- Line 378: Notes refresh

**Fix**: Import `API_URL` and replace all URLs:
```javascript
import { API_URL } from '../config/api.config';

// Replace: "http://localhost:4000/api/..."
// With: `${API_URL}/api/...`
```

#### 2. **Sessions.jsx** (1 occurrence)
- Line 34: API base URL constant

**Fix**:
```javascript
import { API_URL } from '../config/api.config';
const API_BASE_URL = `${API_URL}/api`;
```

#### 3. **Login.jsx** (1 occurrence)
- Line 33: Google OAuth redirect

**Fix**:
```javascript
import { API_URL } from '../config/api.config';
window.location.href = `${API_URL}/auth/google/`;
```

#### 4. **SignUp.jsx** (1 occurrence)
- Line 98: Google OAuth redirect

**Fix**:
```javascript
import { API_URL } from '../config/api.config';
window.location.href = `${API_URL}/auth/google/`;
```

#### 5. **Quizzes.jsx** (1 occurrence)
- Line 163: User profile fetch

**Fix**:
```javascript
import { API_URL } from '../config/api.config';
const response = await fetch(`${API_URL}/api/user/profile`, {
```

#### 6. **components/api.js** (1 occurrence)
- Line 1: API_BASE constant

**Fix**:
```javascript
import { API_URL } from '../config/api.config';
export const API_BASE = API_URL;
```

#### 7. **Admin/QuizManagement.jsx** (2 occurrences)
- Line 18: Fetch quizzes
- Line 43: Delete quiz

**Fix**:
```javascript
import { API_URL } from '../../config/api.config';
// Replace URLs with `${API_URL}/api/...`
```

#### 8. **Admin/StudySessions.jsx** (2 occurrences)
- Line 17: Fetch sessions
- Line 38: End session

**Fix**:
```javascript
import { API_URL } from '../../config/api.config';
// Replace URLs with `${API_URL}/api/...`
```

#### 9. **Admin/AuditLogs.jsx** (1 occurrence)
- Line 15: Fetch audit logs

**Fix**:
```javascript
import { API_URL } from '../../config/api.config';
// Replace URLs with `${API_URL}/api/...`
```

#### 10. **Admin/AdminDashboard.jsx** (4 occurrences)
- Line 20: Admin stats
- Line 32: Recent users
- Line 46: Recent sessions
- Line 65: User action

**Fix**:
```javascript
import { API_URL } from '../../config/api.config';
// Replace URLs with `${API_URL}/api/...`
```

#### 11. **Admin/UserManagement.jsx** (2 occurrences)
- Line 12: Fetch users
- Line 26: User action

**Fix**:
```javascript
import { API_URL } from '../../config/api.config';
// Replace URLs with `${API_URL}/api/...`
```

#### 12. **firebase/battleOperations.js** (2 occurrences)
- Line 401: Sync battle results
- Line 493: Verify sync

**Fix**:
```javascript
import { API_URL } from '../config/api.config';
// Replace URLs with `${API_URL}/api/...`
```

#### 13. **components/quizzes/views/QuizList.jsx** (1 occurrence)
- Line 21: Import quiz

**Fix**:
```javascript
import { API_URL } from '../../../config/api.config';
// Replace URLs with `${API_URL}/api/...`
```

#### 14. **components/quizzes/views/QuizEditor.jsx** (1 occurrence)
- Line 50: Toggle public quiz

**Fix**:
```javascript
import { API_URL } from '../../../config/api.config';
// Replace URLs with `${API_URL}/api/...`
```

#### 15. **components/quizzes/views/QuizBattles.jsx** (1 occurrence)
- Line 22: User profile fetch

**Fix**:
```javascript
import { API_URL } from '../../../config/api.config';
// Replace URLs with `${API_URL}/api/...`
```

#### 16. **components/TextExtractor.jsx** (1 occurrence)
- Line 82: Extract PPTX

**Fix**:
```javascript
import { API_URL } from '../config/api.config';
// Replace URLs with `${API_URL}/api/...`
```

#### 17. **components/ResetPassword.jsx** (1 occurrence)
- Line 16: Password reset request

**Fix**:
```javascript
import { API_URL } from '../config/api.config';
// Replace URLs with `${API_URL}/api/...`
```

#### 18. **components/PassRecovery.jsx** (1 occurrence)
- Line 39: Reset password

**Fix**:
```javascript
import { API_URL } from '../config/api.config';
// Replace URLs with `${API_URL}/api/...`
```

#### 19. **utils/syncService.js** (1 occurrence)
- Line 279: Sync plans

**Fix**:
```javascript
import { API_URL } from '../config/api.config';
// Replace URLs with `${API_URL}/api/...`
```

## ✅ Already Fixed

- ✅ **src/api/api.js** - Now uses `API_URL` from config
- ✅ **src/config/api.config.js** - Created with proper environment detection

## 🚀 Automated Fix Command

Run this PowerShell script to help identify files:

```powershell
# Search for all hardcoded localhost URLs
Get-ChildItem -Path ".\src" -Recurse -Include "*.js","*.jsx" | 
  Select-String -Pattern "http://localhost:4000|localhost:4000" | 
  Select-Object Path, LineNumber, Line | 
  Format-Table -AutoSize
```

## 📝 Manual Fix Checklist

- [x] Create `src/config/api.config.js`
- [x] Update `src/api/api.js`
- [ ] Update `src/pages/Dashboard.jsx`
- [ ] Update `src/pages/Sessions.jsx`
- [ ] Update `src/pages/Quizzes.jsx`
- [ ] Update `src/components/Login.jsx`
- [ ] Update `src/components/SignUp.jsx`
- [ ] Update `src/components/api.js`
- [ ] Update `src/components/TextExtractor.jsx`
- [ ] Update `src/components/ResetPassword.jsx`
- [ ] Update `src/components/PassRecovery.jsx`
- [ ] Update `src/pages/Admin/AdminDashboard.jsx`
- [ ] Update `src/pages/Admin/UserManagement.jsx`
- [ ] Update `src/pages/Admin/QuizManagement.jsx`
- [ ] Update `src/pages/Admin/StudySessions.jsx`
- [ ] Update `src/pages/Admin/AuditLogs.jsx`
- [ ] Update `src/firebase/battleOperations.js`
- [ ] Update `src/components/quizzes/views/QuizList.jsx`
- [ ] Update `src/components/quizzes/views/QuizEditor.jsx`
- [ ] Update `src/components/quizzes/views/QuizBattles.jsx`
- [ ] Update `src/utils/syncService.js`

## 🔍 Verification

After fixing all URLs, run:

```powershell
# Should return no results except in api.config.js
Get-ChildItem -Path ".\src" -Recurse -Include "*.js","*.jsx" | 
  Select-String -Pattern "http://localhost:4000" | 
  Where-Object { $_.Path -notlike "*api.config.js*" }
```

## 🎯 Test Plan

1. **Set up .env file**:
```env
VITE_API_URL=http://localhost:4000
```

2. **Test locally**:
   - All API calls should work
   - Login/logout should work
   - File uploads should work
   - Admin panel should work
   - Quiz battles should work

3. **Test with production URL**:
```env
VITE_API_URL=https://your-domain.com
```

4. **Build and verify**:
```bash
npm run build
npm run preview
```

## 📊 Impact Analysis

**Total Files**: 19 files
**Total Occurrences**: ~35+ instances
**Estimated Fix Time**: 30-45 minutes
**Testing Time**: 15-20 minutes

**Critical**: All functionality depends on these API calls working correctly in production.
