# Box.com Storage API - Setup & Troubleshooting Guide

Dieses Dokument beschreibt die exakte Einrichtung der Box.com API für den `A2A-SIN-Box-Storage` Service.
Wenn Uploads mit 404 oder 403 fehlschlagen, liegt dies **nicht** an den allgemeinen "Jeder mit dem Link"-Freigaben, sondern an fehlenden API-Berechtigungen (CORS, falsche IDs oder abgelaufene Token).

---

## 1. CORS-Domänen konfigurieren (Häufigste Fehlerquelle!)

Wenn dein Service (z.B. `http://room-09-box-storage:3000`) auf die Box API zugreift und nicht in der CORS-Liste steht, wird der Request von Box sofort blockiert (oft als 404/403 kaschiert).

**So behebst du es:**
1. Gehe in die [Box Developer Console](https://account.box.com/developers/console).
2. Wähle deine App (z.B. `OpenSIN`) aus.
3. Scrolle nach unten zum Bereich **"CORS-Domänen"** (Zulässige Domänen).
4. Trage **alle** URLs ein, von denen Anfragen kommen könnten (kommagetrennt).
   - Beispiel: `http://localhost:3000, http://room-09-box-storage:3000`
5. Klicke auf **Änderungen speichern**.

---

## 2. Die korrekten Folder-IDs extrahieren

Die Box API verwendet **numerische IDs** (z.B. `376701205578`), NICHT die Share-Link-Slugs (z.B. `9s5htoefw1ux9ajaqj656v9a02h7z7x1`). Share-Links sind nur für menschliche Nutzer gedacht, nicht für API-Calls.

**Verifizierte Folder-IDs für dieses Konto:**
- **Public Folder ID:** `376915767916` (Share-URL: `https://app.box.com/s/mvurec77pppyqhxb09z1dwcf8bz4o7eu`)
- **Cache Folder ID:** `376701205578` (Share-URL: `https://app.box.com/s/9s5htoefw1ux9ajaqj656v9a02h7z7x1`)

**Folder-ID finden mit curl:**
```bash
curl -s -X GET "https://api.box.com/2.0/folders/0/items" \
  -H "Authorization: Bearer YOUR_DEVELOPER_TOKEN" | python3 -m json.tool
```

---

## 3. Developer Token (Development) vs. JWT (Production)

Der Developer Token ist **nur 60 Minuten gültig**!

### Für lokales Testing (Developer Token)
In der Developer Console unter "Konfiguration" -> "Entwicklertoken widerrufen/erstellen" klicken.

### Für Dauerbetrieb (Produktion - JWT)
Für dauerhaften Betrieb ohne stündliche Token-Erneuerung:
1. Gehe in der App-Konfiguration zu **"Authentifizierungsmethode"**.
2. Ändere auf **"OAuth 2.0 mit JWT (Serverauthentifizierung)"**.
3. Generiere ein Public/Private Keypair (JSON-Datei).
4. Autorisiere die App in der Box Admin-Konsole.
5. Die JSON-Keyfile ermöglicht dem Container autonome Token-Generierung.

---

## 4. Checkliste für das Deployment

Bevor du `docker compose up -d room-09-box-storage` ausführst, prüfe:
- [ ] CORS-Domänen beinhalten die lokale Docker-Netzwerk URL / localhost.
- [ ] Ordner "Public" und "Cache" sind in Box.com erstellt.
- [ ] `BOX_PUBLIC_FOLDER_ID` und `BOX_CACHE_FOLDER_ID` enthalten **nur die numerische ID**.
- [ ] Token (Developer oder JWT) ist gültig und in der `.env` hinterlegt.

---

## 5. Verifizierte .env Konfiguration

```env
# Box.com Storage (A2A-SIN-Box-Storage)
BOX_STORAGE_URL=http://room-09-box-storage:3000
BOX_STORAGE_API_KEY=your_secure_random_key_min_32_chars
BOX_DEVELOPER_TOKEN=f9PURW50E47k9dwoVKkBD64QLJLnC4Nx  # TEMP DEV TOKEN - 1h validity!
BOX_PUBLIC_FOLDER_ID=376915767916
BOX_CACHE_FOLDER_ID=376701205578
```

---

## 6. Test der API-Verbindung

```bash
# Account-Info abrufen
curl -s -X GET "https://api.box.com/2.0/users/me" \
  -H "Authorization: Bearer YOUR_DEVELOPER_TOKEN"

# Folder-Liste abrufen
curl -s -X GET "https://api.box.com/2.0/folders/0/items" \
  -H "Authorization: Bearer YOUR_DEVELOPER_TOKEN"

# Test-Upload
curl -s -X POST "https://upload.box.com/api/2.0/files/content" \
  -H "Authorization: Bearer YOUR_DEVELOPER_TOKEN" \
  -F attributes='{"name":"test.txt","parent":{"id":"FOLDER_ID"}}' \
  -F file=@/dev/null
```