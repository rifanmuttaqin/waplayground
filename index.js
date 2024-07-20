const {DisconnectReason, useMultiFileAuthState} = require("@whiskeysockets/baileys")
const makeWASocket = require("@whiskeysockets/baileys").default
const express = require('express');

let sock;

const app = express();
app.use(express.json());

async function sendMessageByNumber(number, textString){
    try {
        const checkNumbers = await checkNumber(number);
        if(checkNumbers.exists){
            const sentMsg = await sendMessage(checkNumbers.jid, textString); // local function
            return sentMsg;
        }
        return false;
    } catch (err) {
        console.error("Failed to send message", err);
    }
}

async function checkNumber(param) {
    const id = param
    const [result] = await sock.onWhatsApp(id)
    if (result) {
        return result; // sample result = { exists: true, jid: '6285735727063@s.whatsapp.net' }
    }
}

async function sendMessage(from, text) {
    try {
        const sentMsg = await sock.sendMessage(from, {text: text});
        console.log("Message sent successfully", sentMsg);
    } catch (err) {
        console.error("Failed to send message", err);
    }
}

async function connectionLogic() {
    const {state, saveCreds} = await useMultiFileAuthState('auth_info_baileys')
    sock = makeWASocket({
        // can provide additional config here
        printQRInTerminal: true,
        auth: state,
    })

    sock.ev.on('connection.update', async (update) => {
        const {connection, lastDisconnect, qr} = update || {}

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                connectionLogic(); // return self;
            }
        } else if (connection === 'open') {
            console.log('Connection opened');
        }
    })

    async function keyTrigger(msgText, from) {
        if (msgText) {
            if (msgText.toLowerCase().startsWith('!mulai')) {
                try {
                    // other logic for bot convertation
                    await sendMessage(from,'Baik sistem dimulai, berikut daftar untuk memberi saya perintah : ');
                } catch (error) {
                    console.error("Failed to send reply", error);
                }
            }
        }
    }

    sock.ev.on("messages.upsert", async ({messages}) => {
        for (const message of messages) {
            if (message.key.remoteJid && message.message.conversation) {
                const msgText = message.message.conversation;
                const from = message.key.remoteJid;
                await keyTrigger(msgText, from)
            }
        }
    });

    sock.ev.on('creds.update', saveCreds)
}

connectionLogic();

// API endpoint to send a message
app.post('/send-message', async (req, res) => {
    const { number, text } = req.body;

    if (!number || !text) {
        return res.status(400).send('Missing number or text');
    }

    try {
        await sendMessageByNumber(number,  text);
        res.status(200).send('Message sent successfully');
    } catch (err) {
        res.status(500).send('Failed to send message');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});