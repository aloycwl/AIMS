import express from "express"
import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } from "@whiskeysockets/baileys"
import QRCode from "qrcode"
import fs from "fs"
import csv from "csv-parser"
import { parsePhoneNumberFromString } from "libphonenumber-js"
import vcard from "vcard-parser"

const DEFAULT_WS = "/home/openclaw/.openclaw/workspace"

const app = express(), { state, saveCreds } = await useMultiFileAuthState("./session")
app.use(express.json())

const { version } = await fetchLatestBaileysVersion()

let sock = makeWASocket({ auth: state, version }), currentQR = null, currentPairingCode = null, isReady = false
let job = {
    running: false,
    total: 0,
    sent: 0,
    last: null
}

const MESSAGES = [
    "Hello! Check out our latest offer.",
    "Exclusive deal just for you.",
    "Don’t miss this limited-time promotion.",
    "We’ve got something special for you."
]

sock.ev.on("creds.update", saveCreds)

const startSock = () => {
    sock.ev.on("connection.update", async ({ qr, connection, lastDisconnect, pairingCode }) => {
        if (qr) {
            currentQR = qr
            currentPairingCode = null
        }
        if (pairingCode) {
            currentPairingCode = pairingCode
        }

        if (connection === "open") {
            isReady = true
            currentQR = null
            currentPairingCode = null
        }

        if (connection === "close") {
            isReady = false
            currentQR = null
            currentPairingCode = null
            const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut)
            if (shouldReconnect) {
                sock = makeWASocket({ auth: state, version })
                startSock()
            }
        }
    })
    
    // Request pairing code after connection - only if we have credentials
    // NOTE: For fresh pairing, call /pairing-code with phone number
    if (!isReady && !currentQR && !currentPairingCode && state.creds.me) {
        setTimeout(async () => {
            if (!isReady && !currentPairingCode && state.creds.me?.id) {
                try {
                    const phone = state.creds.me.id.split(':')[0].split('@')[0]
                    const code = await sock.requestPairingCode(phone)
                    currentPairingCode = code
                    console.log("Pairing code:", code)
                } catch (e) {
                    console.log("Could not request pairing code:", e.message)
                }
            }
        }, 3000)
    }
}
startSock()

// -------------------- REAUTH (Clear session and get fresh pairing code) --------------------
app.post("/reauth", async (req, res) => {
    try {
        // Disconnect if connected
        if (sock) {
            try { await sock.logout() } catch (e) { }
        }
        
        isReady = false
        currentQR = null
        currentPairingCode = null
        
        // Clear session files completely
        const sessionDir = "./session"
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true })
        }
        
        // Reinitialize auth state with fresh session
        const freshAuth = await useMultiFileAuthState("./session")
        sock = makeWASocket({ auth: freshAuth.state, version, printQRInTerminal: false })
        sock.ev.on("creds.update", freshAuth.saveCreds)
        
        // Set up connection handler
        sock.ev.on("connection.update", async ({ qr, connection, lastDisconnect, pairingCode }) => {
            if (qr) {
                currentQR = qr
                currentPairingCode = null
                await QRCode.toFile(`${DEFAULT_WS}/qr.png`, qr)
            }
            if (pairingCode) {
                currentPairingCode = pairingCode
            }
            if (connection === "open") {
                isReady = true
                currentQR = null
                currentPairingCode = null
            }
            if (connection === "close") {
                isReady = false
                currentQR = null
                currentPairingCode = null
            }
        })
        
        res.json({ success: true, message: "Session cleared, call /auth with phone number to get pairing code" })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// -------------------- REQUEST PAIRING CODE --------------------
app.post("/pairing-code", async (req, res) => {
    try {
        const phoneNumber = req.body.phone
        if (!phoneNumber) {
            return res.status(400).json({ error: "Phone number required in format: 6591885794 (no + sign)" })
        }
        
        // Clean phone number - remove + and any spaces/dashes
        const cleanNumber = phoneNumber.replace(/[+\s\-]/g, "")
        
        const code = await sock.requestPairingCode(cleanNumber)
        currentPairingCode = code
        
        console.log("Pairing code for", cleanNumber, ":", code)
        res.json({ success: true, pairingCode: code, phone: cleanNumber })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// -------------------- LOGOUT --------------------
app.post("/logout", async (req, res) => {
    try {
        await sock.logout()
        isReady = false
        currentQR = null
        
        // Clear session files
        const sessionDir = "./session"
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true })
        }
        currentQR = null
        currentPairingCode = null
        
        console.log("Logged out, session cleared")
        res.json({ success: true, message: "logged out, session cleared" })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// -------------------- AUTH --------------------
app.get("/auth", async (req, res) => {
    if (isReady) return res.json({ authenticated: true })

    if (currentQR) {
        const path = `${DEFAULT_WS}/qr.png`
        await QRCode.toFile(path, currentQR)
        return res.json({ authenticated: false, qr: path, pairingCode: currentPairingCode })
    }

    if (currentPairingCode) {
        return res.json({ authenticated: false, qr: null, pairingCode: currentPairingCode })
    }

    // Request pairing code if not already
    try {
        const code = await sock.requestPairingCode()
        currentPairingCode = code
        return res.json({ authenticated: false, qr: null, pairingCode: code })
    } catch (e) {
        return res.json({ authenticated: false, qr: null, pairingCode: currentPairingCode, message: "Waiting for pairing code..." })
    }
})

// -------------------- NORMALIZE --------------------
const normalize = (num) => {
    if (!num) return null
    try {
        const p = parsePhoneNumberFromString(String(num))
        if (p && p.isValid()) return p.number
    } catch { }
    return null
}

// -------------------- PARSE FILE --------------------
const parseFile = (file) => {
    const ext = file.split(".").pop().toLowerCase()

    if (ext === "vcf") {
        const raw = fs.readFileSync(file, "utf-8")
        const cards = vcard.parse(raw)
        const rows = []

        cards.forEach(c => {
            const name = c.fn || "Unknown"
            const tels = c.tel || []
            tels.forEach(t => rows.push([name, t.value]))
        })

        return rows
    }

    return new Promise((resolve) => {
        const rows = []
        fs.createReadStream(file)
            .pipe(csv())
            .on("data", (r) => {
                const name = ((r["First Name"] || "") + " " + (r["Last Name"] || "")).trim()
                Object.keys(r).forEach(k => {
                    if (k.toLowerCase().includes("phone") && r[k]) {
                        rows.push([name || "Unknown", r[k]])
                    }
                })
            })
            .on("end", () => resolve(rows))
    })
}

// -------------------- FORMAT --------------------
app.post("/format", async (req, res) => {
    const file = req.body.file.startsWith("/")
        ? req.body.file
        : `${DEFAULT_WS}/${req.body.file}`

    if (!fs.existsSync(file)) {
        return res.status(400).json({ error: "file not found", path: file })
    }

    const raw = await parseFile(file)

    const seen = new Set(), final = []

    raw.forEach(([name, num]) => {
        const n = normalize(num)
        if (n && !seen.has(n)) {
            seen.add(n)
            final.push([name, n, "0"])
        }
    })

    const outPath = `${DEFAULT_WS}/clean_contacts.csv`
    const out = ["name,phone,used", ...final.map(r => `"${r[0]}","${r[1]}","0"`)]

    fs.writeFileSync(outPath, out.join("\n"))

    res.json({ success: true, count: final.length, output: outPath })
})

// -------------------- CSV HELPERS --------------------
const readCSV = () => {
    const path = `${DEFAULT_WS}/clean_contacts.csv`
    if (!fs.existsSync(path)) return []

    const raw = fs.readFileSync(path, "utf-8").split("\n").slice(1)
    return raw.filter(Boolean).map(l => {
        const [name, phone, used] = l.replace(/"/g, "").split(",")
        return { name, phone, used: Number(used) }
    })
}

const writeCSV = (data) => {
    const path = `${DEFAULT_WS}/clean_contacts.csv`
    const out = ["name,phone,used", ...data.map(r => `"${r.name}","${r.phone}","${r.used}"`)]
    fs.writeFileSync(path, out.join("\n"))
}

// -------------------- SEND --------------------
app.post("/send-batch", async (req, res) => {
    if (!isReady) return res.status(400).json({ error: "not authenticated" })
    if (job.running) return res.json({ message: "already running" })

    const data = readCSV()
    const unused = data.filter(d => d.used === 0)

    if (!unused.length) return res.json({ message: "no contacts left" })

    const pick = unused.sort(() => 0.5 - Math.random()).slice(0, 15)

    job = {
        running: true,
        total: pick.length,
        sent: 0,
        last: null
    }

    res.json({ started: true, total: pick.length })

    const delay = (ms) => new Promise(r => setTimeout(r, ms))

    for (const target of pick) {
        if (!job.running) break

        const jid = target.phone.replace("+", "") + "@s.whatsapp.net"
        const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]

        try {
            await sock.sendMessage(jid, { text: message })

            data.forEach(d => {
                if (d.phone === target.phone) d.used = 1
            })

            writeCSV(data)

            job.sent++
            job.last = target.phone

            console.log(`Sent ${job.sent}/${job.total} → ${target.phone}`)

        } catch {
            console.log("Send failed:", target.phone)
        }

        await delay(8000 + Math.random() * 5000)
    }

    job.running = false
})

app.listen(3333, () => console.log("WA API running on 3333"))