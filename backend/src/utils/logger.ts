import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: [
      "req.headers.authorization",
      "headers.authorization",
      "password",
      "privateKey",
      "private_key",
      "secret",
      "apiKey",
      "seedPhrase",
    ],
    censor: "[REDACTED]",
  },
  base: {
    service: "web3-micropay-backend",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
