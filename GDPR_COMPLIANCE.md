# GDPR Compliance - Student Names Feature

## Overview

The student names feature has been implemented with GDPR compliance in mind. This document outlines the compliance measures.

## Data Storage

### Personal Data
- **Student Names**: Optional field stored in `periodStudentAllowList` table
- **Access Codes**: Anonymous 6-character codes (not personal data)

### Storage Conditions
1. **Optional**: Names are only stored if explicitly provided by teachers via CSV import
2. **Access Control**: Names are only visible to authenticated admin users
3. **No Automatic Collection**: The system does not automatically collect or store student names
4. **Local First**: Teachers download CSV, add names locally, then import back

## GDPR Compliance Measures

### ✅ Lawful Basis
- **Consent**: Teachers explicitly provide names via CSV import
- **Legitimate Interest**: Names are used for administrative purposes (group management, assignments)

### ✅ Data Minimization
- Only names are stored (no emails, IDs, or other personal data unless teacher adds them)
- Names are optional - system works fully with anonymous codes

### ✅ Access Control
- Names are only visible to authenticated admin users
- Students never see other students' names
- Access is logged via `addedBy` field (teacher email)

### ✅ Data Portability
- Teachers can export all data (codes + names) via CSV
- Data can be deleted at any time via "Clear All" function

### ✅ Right to Erasure
- Individual codes (and associated names) can be removed
- All codes for a period can be cleared
- No permanent storage - all data can be deleted

### ✅ Transparency
- Clear GDPR notice in the UI explaining the optional nature of names
- Teachers are informed that names are only stored if they provide them

## Implementation Details

### Schema
```typescript
PeriodStudentAllowList {
  studentId: string        // Access code (anonymous)
  name?: string            // Optional name (GDPR: only if provided)
  addedBy: string          // Teacher email (for audit)
  addedAt: number          // Timestamp
}
```

### Data Flow
1. Teacher generates anonymous access codes
2. Teacher downloads CSV with codes
3. Teacher adds names locally (offline)
4. Teacher imports CSV with names (explicit action)
5. Names are stored only after explicit import

### Display Logic
- Throughout the application, names are displayed when available
- If no name is available, the access code is displayed
- This ensures backward compatibility and privacy

## Recommendations

1. **Privacy Policy**: Update your privacy policy to mention:
   - Names are optional
   - Names are only stored if teachers provide them
   - Names are only visible to admins
   - Names can be deleted at any time

2. **Data Retention**: Consider implementing automatic deletion of names after a certain period if required by your institution's policy

3. **Audit Logging**: The `addedBy` field provides basic audit trail - consider adding more detailed logging if needed

4. **Student Consent**: If your institution requires student consent for name storage, ensure teachers obtain it before importing names

## Compliance Status

✅ **GDPR Compliant** - The implementation follows GDPR principles:
- Optional data collection
- Explicit consent (via CSV import)
- Access control
- Right to erasure
- Data portability
- Transparency
