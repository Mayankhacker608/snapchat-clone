const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;
const DATA_FILE = path.join(__dirname, "submissions.json");

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(data));
}

function readSubmissions() {
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveSubmission(data) {
  const submissions = readSubmissions();
  submissions.push({
    username: data.username,
    email: data.email,
    category: data.category,
    submittedAt: new Date().toISOString()
  });
  fs.writeFileSync(DATA_FILE, JSON.stringify(submissions, null, 2));
}

function serveFile(response, fileName, contentType) {
  const filePath = path.join(PUBLIC_DIR, fileName);
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, { "Content-Type": contentType });
    response.end(content);
  });
}

const server = http.createServer((request, response) => {
  if (request.method === "GET" && (request.url === "/" || request.url === "/index.html")) {
    serveFile(response, "index.html", "text/html; charset=utf-8");
    return;
  }

  if (request.method === "GET" && request.url === "/snapchat-logo.png") {
    serveFile(response, "snapchat-logo.png", "image/png");
    return;
  }

  if (request.method === "POST" && request.url === "/api/submit") {
    let body = "";

    request.on("data", chunk => {
      body += chunk.toString();
      if (body.length > 10000) {
        request.destroy();
      }
    });

    request.on("end", () => {
      try {
        const data = JSON.parse(body);
        const username = String(data.username || "").trim();
        const email = String(data.email || "").trim();
        const category = String(data.category || "").trim();

        if (!username || !email || !category) {
          sendJson(response, 400, { ok: false, error: "Missing required fields" });
          return;
        }

        saveSubmission({ username, email, category });
        sendJson(response, 200, { ok: true, message: "Submission saved" });
      } catch {
        sendJson(response, 400, { ok: false, error: "Invalid JSON" });
      }
    });
    return;
  }

  if (request.method === "GET" && request.url === "/api/submissions") {
    sendJson(response, 200, { ok: true, submissions: readSubmissions() });
    return;
  }

  response.writeHead(404, { "Content-Type": "text/plain" });
  response.end("Not found");
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
