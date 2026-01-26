
const jwt = require('jsonwebtoken');

// Token y Secret extraídos del contexto
const SECRET = "NKG1jv4oZbcIbeHN0WEjgxZE9OLnjNZXWhOeJumHVo3Eqs+/F0KzkR4jH3QlMc2yN5iyWVj044TkHqzee/dO2Q==";
const TOKEN = "eyJhbGciOiJFUzI1NiIsImtpZCI6IjIwYmNlOTU0LTdiZjctNGY5Ny05YzY3LWY3MTllOWViODc3ZSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2pndGV0dXRtcmpreGZqeG5sY2tpLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJlYjZiZDUyMS0yNmNmLTQ4M2QtOGU5OS0xZjQ4Y2VjZThhNzEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzY5MjEwMDA4LCJpYXQiOjE3NjkyMDY0MDgsImVtYWlsIjoiZmVsaXBlQGJvdGVjLnRlY2giLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoiZmVsaXBlQGJvdGVjLnRlY2giLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiJlYjZiZDUyMS0yNmNmLTQ4M2QtOGU5OS0xZjQ4Y2VjZThhNzEifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc2OTIwMjgyN31dLCJzZXNzaW9uX2lkIjoiYWIzZTJmNjAtZjJiNC00M2JiLTliNGEtNThlMWI3MTY1NGNiIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.uHUjkVX6YgIZl0nDmM-zxO79TGrTwZUHkGYrlZk1VkWGAg2pEOyiNfvDkLLwFVwuun2jYaWSEiLkdFFTxhAZ6w";

console.log("Testing verification...");
console.log("Token Header:", JSON.stringify(jwt.decode(TOKEN, { complete: true })?.header));

try {
    // Intentar verificar asumiendo que el secreto es para HS256 (lo normal con string secrets)
    // Pero si el token dice ES256, jwt.verify intentará usar el secreto como clave pública si no forzamos algo
    // Vamos a ver qué dice
    jwt.verify(TOKEN, SECRET);
    console.log("✅ Verification SUCCESS!");
} catch (error) {
    console.log("❌ Verification FAILED:");
    console.log(error.message);
}
