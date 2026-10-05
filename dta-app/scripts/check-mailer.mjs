// Run: node scripts/check-mailer.mjs
import assert from "node:assert/strict";
import net from "node:net";

const messages = [];
const server = net.createServer((socket) => {
  let buffer = "";
  let inData = false;
  let data = "";
  let rcpt = "";

  socket.write("220 localhost ESMTP\r\n");

  const consumeBody = (text) => {
    data += text;
    const end = data.indexOf("\r\n.\r\n");
    if (end === -1) return;
    messages.push({ rcpt, data: data.slice(0, end) });
    data = data.slice(end + 5);
    inData = false;
    socket.write("250 OK\r\n");
  };

  const handle = (line) => {
    const cmd = line.split(" ")[0].toUpperCase();
    if (cmd === "EHLO" || cmd === "HELO") socket.write("250-localhost\r\n250 8BITMIME\r\n");
    else if (cmd === "MAIL") socket.write("250 OK\r\n");
    else if (cmd === "RCPT") { rcpt = line; socket.write("250 OK\r\n"); }
    else if (cmd === "DATA") { socket.write("354 End data with <CR><LF>.<CR><LF>\r\n"); inData = true; }
    else if (cmd === "QUIT") { socket.write("221 Bye\r\n"); socket.end(); }
    else socket.write("250 OK\r\n");
  };

  socket.on("data", (chunk) => {
    const text = chunk.toString("utf8");
    if (inData) return consumeBody(text);
    buffer += text;
    let idx;
    while (!inData && (idx = buffer.indexOf("\r\n")) !== -1) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      handle(line);
    }
    if (inData && buffer) {
      const rest = buffer;
      buffer = "";
      consumeBody(rest);
    }
  });
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
process.env.SMTP_HOST = "127.0.0.1";
process.env.SMTP_PORT = String(server.address().port);
process.env.SMTP_SECURE = "false";
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;
process.env.CONTACT_TO_EMAIL = "inbox@example.com";
process.env.CONTACT_FROM = "notifications@example.com";

const guard = setTimeout(() => {
  console.error(`TIMEOUT: captured ${messages.length} message(s)`);
  process.exit(1);
}, 8000);

const { mailConfigured, sendNotification } = await import("../src/lib/mailer.ts");
assert.equal(mailConfigured(), true, "mailConfigured should be true with SMTP set");

await sendNotification({ subject: "SUBJ-123", text: "New office hours signup\nStudent: Ana" });
for (let i = 0; i < 200 && messages.length === 0; i++) await new Promise((r) => setTimeout(r, 20));

assert.equal(messages.length, 1, "exactly one message should be delivered");
assert.match(messages[0].rcpt, /inbox@example\.com/, "delivered to the notification inbox");
assert.match(messages[0].data, /Subject: SUBJ-123/, "subject is present");
assert.match(messages[0].data, /Student: Ana/, "body is present");

clearTimeout(guard);
server.close();
console.log("mailer self-check OK");
process.exit(0);
