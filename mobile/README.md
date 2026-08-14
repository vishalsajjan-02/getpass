# Gatepass Mobile (Expo SDK 54)

## Run
1. Start backend: `cd backend && npm run dev`
2. Start mobile: `cd mobile && npm start`
3. Open Expo Go and scan QR (same Wi‑Fi as PC)

## API URL
Edit `app.json` → `expo.extra.apiUrl` to your PC LAN IP:

```json
"extra": {
  "apiUrl": "http://YOUR_LAN_IP:3001/api"
}
```

Current default uses this machine’s LAN IP. Phone cannot use `localhost`.

## Roles
- Employee / Guest → Dashboard (Today/History) + Attendance + New Request
- Manager → Dashboard (approve) + Attendance + New Request
- Admin → Dashboard (approve)
- Gatekeeper → Mark users In/Out

## Demo logins
- emp001@company.com / Emp@123
- manager.software-r-d@company.com / Manager@123
- admin@company.com / Admin@123
- gatekeeper@company.com / Gate@123
