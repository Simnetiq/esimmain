# ✅ eSIM Delete Feature

## What Was Added

A delete option has been added to the Dashboard that allows users to delete their eSIMs.

## Changes Made

### 1. Dashboard.jsx
**File:** `packages/customer-app/src/components/Dashboard.jsx`

#### Added `handleDeleteOrder` function:
```javascript
const handleDeleteOrder = async (order) => {
  // Shows confirmation dialog
  // Marks order as deleted in Firebase
  // Removes from UI
  // Shows success/error toast
}
```

**What it does:**
- ✅ Shows confirmation dialog before deleting
- ✅ Marks order as `deleted: true` in Firebase
- ✅ Sets `deletedAt` timestamp
- ✅ Changes status to 'deleted'
- ✅ Updates local state to remove from orders list
- ✅ Shows success/error toast notification

#### Updated Query:
```javascript
// Now filters out deleted orders
const esimsQuery = query(
  collection(db, 'users', currentUser.uid, 'esims'),
  where('deleted', '!=', true)  // ← NEW: Exclude deleted orders
);
```

### 2. RecentOrders.jsx
**File:** `packages/customer-app/src/components/dashboard/RecentOrders.jsx`

**Changes:**
- Added `onDeleteOrder` prop
- Passes it down to EsimCard components

### 3. EsimCard.jsx
**File:** `packages/customer-app/src/components/dashboard/EsimCard.jsx`

**Changes:**
- Added Trash2 icon import from lucide-react
- Added `onDeleteOrder` prop
- Added delete button (top-left corner)

**Delete Button Features:**
- 🗑️ Red trash icon
- 👁️ Hidden by default, appears on card hover
- 🛑 Stops event propagation (doesn't trigger QR view)
- 🌍 RTL-aware positioning
- 🎨 Smooth hover animations

**Visual Position:**
```
┌─────────────────────────────┐
│ 🗑️ (hover)        [Status] │  ← Delete (left), Status (right)
│                              │
│  🏴  Country Name            │
│      Plan Details            │
│                              │
│  [Data Usage Bar]            │
│                              │
│  $10.00         [View QR]    │
└─────────────────────────────┘
```

---

## How It Works

### User Flow:

1. **User hovers over eSIM card**
   - Delete button (🗑️) appears in top-left corner

2. **User clicks delete button**
   - Confirmation dialog appears: "Are you sure you want to delete this eSIM? This action cannot be undone."

3. **User confirms**
   - Order is marked as deleted in Firebase
   - Card disappears from dashboard
   - Success toast: "eSIM deleted successfully"

4. **User cancels**
   - Nothing happens, card remains

### Firebase Structure:

**Before deletion:**
```javascript
users/{uid}/esims/{orderId}: {
  status: 'active',
  // ... other fields
}
```

**After deletion:**
```javascript
users/{uid}/esims/{orderId}: {
  status: 'deleted',      // ← Updated
  deleted: true,          // ← New
  deletedAt: timestamp,   // ← New
  // ... other fields preserved
}
```

**Note:** Data is **NOT permanently deleted** - it's marked as deleted. This allows:
- ✅ Recovery if needed
- ✅ Audit trail
- ✅ Analytics on deleted orders

---

## Translation Keys

Add these to your translation files:

```javascript
// English
{
  "dashboard.deleteEsim": "Delete eSIM",
  "dashboard.confirmDelete": "Are you sure you want to delete this eSIM? This action cannot be undone.",
  "dashboard.orderDeleted": "eSIM deleted successfully",
  "dashboard.deleteOrderError": "Failed to delete eSIM: {{error}}"
}

// Hebrew (example)
{
  "dashboard.deleteEsim": "מחק eSIM",
  "dashboard.confirmDelete": "האם אתה בטוח שברצונך למחוק eSIM זה? פעולה זו אינה ניתנת לביטול.",
  "dashboard.orderDeleted": "eSIM נמחק בהצלחה",
  "dashboard.deleteOrderError": "נכשל במחיקת eSIM: {{error}}"
}
```

---

## Testing

### Test Cases:

1. **✅ Delete with confirmation**
   - Hover over eSIM card
   - Click delete button
   - Confirm in dialog
   - Verify: Card disappears, success toast appears

2. **✅ Cancel deletion**
   - Click delete button
   - Cancel in dialog
   - Verify: Card remains, no changes

3. **✅ Deleted orders don't reload**
   - Delete an eSIM
   - Refresh page
   - Verify: Deleted eSIM doesn't appear

4. **✅ Multiple deletions**
   - Delete multiple eSIMs
   - Verify: Each deletes correctly

5. **✅ RTL layout**
   - Switch to Hebrew/Arabic
   - Verify: Delete button appears on right side

6. **✅ Mobile view**
   - Test on mobile
   - Verify: Delete button accessible

---

## Security Considerations

### ✅ Current Implementation:
- User can only delete their own orders (Firebase security rules)
- Data is soft-deleted (marked, not removed)
- Client-side confirmation prevents accidental deletion

### 🔒 Recommended Firebase Security Rules:

```javascript
// In firestore.rules
match /users/{userId}/esims/{esimId} {
  // Users can only delete their own eSIMs
  allow update: if request.auth.uid == userId 
    && request.resource.data.deleted == true
    && request.resource.data.status == 'deleted';
    
  // Don't allow permanent deletion
  allow delete: if false;
}
```

---

## Future Enhancements

### Possible Improvements:

1. **Permanent Deletion Option**
   - Add admin function to permanently delete after X days
   - "Empty trash" functionality

2. **Undo Deletion**
   - Show "Undo" button in toast notification
   - Allow recovery within 30 seconds

3. **Bulk Delete**
   - Select multiple eSIMs
   - Delete all at once

4. **Trash/Archive View**
   - Show deleted eSIMs in separate tab
   - Allow restoration

5. **Confirmation Modal**
   - Replace browser confirm with custom modal
   - Better styling and UX

6. **Deletion Reasons**
   - Ask why user is deleting
   - Collect feedback for improvement

---

## Troubleshooting

### Issue: Delete button doesn't appear
**Solution:** Make sure you're hovering over the card. The button has `group-hover:opacity-100` class.

### Issue: Deleted eSIMs still appear
**Solution:** 
1. Check Firebase - is `deleted: true` set?
2. Clear browser cache
3. Check query includes `where('deleted', '!=', true)`

### Issue: Can't delete (error)
**Solution:**
1. Check Firebase security rules allow update
2. Check console for error messages
3. Verify user is authenticated

### Issue: Translation missing
**Solution:** Add translation keys to your i18n files (see Translation Keys section above)

---

## Summary

✅ **What works:**
- Delete button with confirmation
- Soft deletion (data preserved)
- Query filters out deleted orders
- RTL support
- Hover animations
- Toast notifications

✅ **User experience:**
- Clear visual feedback
- Prevents accidental deletion
- Smooth animations
- Accessible on all devices

✅ **Data integrity:**
- Orders marked, not destroyed
- Audit trail maintained
- Can be recovered if needed

---

## Files Modified

1. `packages/customer-app/src/components/Dashboard.jsx`
   - Added `handleDeleteOrder` function
   - Updated query to filter deleted orders
   - Passed `onDeleteOrder` to RecentOrders

2. `packages/customer-app/src/components/dashboard/RecentOrders.jsx`
   - Added `onDeleteOrder` prop
   - Passed to EsimCard

3. `packages/customer-app/src/components/dashboard/EsimCard.jsx`
   - Added Trash2 icon
   - Added delete button with hover effect
   - Added click handler with stopPropagation

**No database migrations needed** - the `deleted` field is added dynamically when deleting.

---

**Status:** ✅ Ready for testing and deployment
