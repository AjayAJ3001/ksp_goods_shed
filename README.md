# Goods Shed

Railway goods-shed register for electronically Transmitted Railway Receipts (eT-RR).

- Mobile app: React Native (Expo)
- Admin panel: React
- API: Node.js
- Database: PostgreSQL

Owner and managers sign in. Each person gets a dashboard and the RR Upload module. Uploading a PDF stores the file with the date, reads the eT-RR header and wagon rows, then the clerk types the party name and shed number for each wagon.

The same PDF file, or the same RR number, cannot be uploaded a second time.

## Run it

PostgreSQL is expected on `127.0.0.1:5433`, database `goods_shed`. The connection is in `backend/.env`.

```powershell
cd backend
npm install
npm start
```

```powershell
cd admin
npm install
npm run dev
```

Open http://localhost:5173

```powershell
cd mobile
npm install
npx expo start
```

On a phone, set the server address on the login screen to this computer’s LAN address, for example `http://192.168.1.20:4000`. The Android emulator can use `http://10.0.2.2:4000`.

## Logins

| Role | Username | Password |
| --- | --- | --- |
| Owner | admin | admin123 |
| Manager | manager | manager123 |

The owner can add more managers from the admin panel.
