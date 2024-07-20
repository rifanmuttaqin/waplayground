const {DisconnectReason, useMultiFileAuthState} = require("@whiskeysockets/baileys")
const makeWASocket = require("@whiskeysockets/baileys").default

let sock;

async function connectionLogic() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    sock = makeWASocket({
        // can provide additional config here
        printQRInTerminal: true,
        auth:state,
    })

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update || {}

        if(connection === 'close'){
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if(shouldReconnect){
                connectionLogic();
            }
        } else if(connection === 'open'){
            console.log('Connection opened');
        }
    })

    // reply message
    async function sendMessage(from) {
        try {
            const sentMsg = await sock.sendMessage(from, { text: "Siap bos ada yang bisa dibantu ?" });
            console.log("Message sent successfully", sentMsg);
        } catch (err){
            console.error("Failed to send message", err);
        }
    }

    async function keyTrigger(msgText, from) {
        if (msgText) {
            if( msgText.toLowerCase() === "halo"){
                try {
                    await sendMessage(from);
                } catch (error) {
                    console.error("Failed to send reply", error);
                }
            }
        }
    }

    sock.ev.on("messages.upsert", async ({ messages }) => {
        // console.log("ori", messages);
        for (const message of messages) {
            if (message.message && message.message.conversation) {
                const msgText = message.message.conversation;
                const from = message.key.remoteJid;
                await keyTrigger(msgText, from)
            }
        }
    });

    sock.ev.on ('creds.update', saveCreds)

}

connectionLogic();

// API endpoint to send a message
// app.post('/send-message', async (req, res) => {
//     const { id, text } = req.body;
//     if (!id || !text) {
//         return res.status(400).send('Missing id or text');
//     }
//     try {
//         await sock.sendMessage(id, { text });
//         res.status(200).send('Message sent successfully');
//     } catch (err) {
//         console.error('Failed to send message', err);
//         res.status(500).send('Failed to send message');
//     }
// });
//
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });