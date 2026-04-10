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

let sock = makeWASocket({ auth: state, version }), currentQR = null, isReady = false
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
    sock.ev.on("connection.update", async ({ qr, connection, lastDisconnect }) => {
        if (qr) currentQR = qr

        if (connection === "open") {
            isReady = true
            currentQR = null
        }

        if (connection === "close") {
            isReady = false
            const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut)
            if (shouldReconnect) {
                sock = makeWASocket({ auth: state, version })
                startSock()
            }
        }
    })
}
startSock()

// -------------------- AUTH --------------------
app.get("/auth", async (req, res) => {
    if (isReady) return res.json({ authenticated: true })

    if (currentQR) {
        const path = `${DEFAULT_WS}/qr.png`
        await QRCode.toFile(path, currentQR)
        return res.json({ authenticated: false, qr: path })
    }

    return res.json({ authenticated: false, qr: null })
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