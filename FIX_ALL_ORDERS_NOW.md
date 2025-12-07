# FIX ALL STUCK ORDERS - ONE CLICK

## Step 1: Add Admin Key to Vercel (1 minute)

Go to Vercel → Settings → Environment Variables

Add this:
```
ADMIN_SECRET_KEY = your-secret-password-123
```

(Replace `your-secret-password-123` with any password you want)

Click **Save** → Click **Redeploy**

---

## Step 2: Fix ALL Stuck Orders (10 seconds)

### Option A: Open in Browser (Easiest)

Just visit this URL:
```
https://www.simnetiq.store/api/fix-all-stuck-orders?key=your-secret-password-123
```

Replace `your-secret-password-123` with the admin key you set.

✅ **DONE!** All orders will be fixed automatically!

---

### Option B: Use Curl Command

```bash
curl -X POST https://www.simnetiq.store/api/fix-all-stuck-orders \
  -H "Content-Type: application/json" \
  -d '{"adminKey": "your-secret-password-123"}'
```

---

## What It Does:

1. 🔍 Finds ALL orders where:
   - Payment is completed
   - eSIM was NOT created
   - Status is "pending" or "processing"

2. 📦 For each stuck order:
   - Creates eSIM from Airalo
   - Updates Firebase with QR code
   - Marks as "completed"

3. ✅ Returns a report:
   ```json
   {
     "success": true,
     "message": "Processed 2 orders. Fixed: 2, Failed: 0",
     "total": 2,
     "fixed": [
       {"orderId": "kargi-mobile-30days-3gb", "iccid": "...", "success": true},
       {"orderId": "kargi-mobile-7days-1gb", "iccid": "...", "success": true}
     ],
     "failed": []
   }
   ```

---

## What to Check After:

1. Visit your dashboard: https://www.simnetiq.store/dashboard
2. All stuck orders should now show QR codes!
3. Check Vercel logs to see detailed processing

---

**This will fix ALL your stuck orders in one click! 🚀**

Last Updated: Dec 7, 2025
