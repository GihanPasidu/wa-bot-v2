const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });
function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}
module.exports = {

SESSION_ID: process.env.SESSION_ID === undefined ? 'cloudnextra=eyJub2lzZUtleSI6eyJwcml2YXRlIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiVUdMaWpSeHhzaGJma1dTbUNRbDFKY01uL2FMWlMySzdZRGFXck1mYzdYZz0ifSwicHVibGljIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiUllHa0orZ28rN2VMQzhhS2NDd3hSTkkzTzFhYlJRNXJjWU42NTRTcDJRST0ifX0sInBhaXJpbmdFcGhlbWVyYWxLZXlQYWlyIjp7InByaXZhdGUiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiI0T0NnUDYwYzRnVGk2amlMRVlWQlVPQ1grN2Z5NjZEMWNNRFBuSDl3bm1FPSJ9LCJwdWJsaWMiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiJqdW5ZM3dlYlNaN1hCbTdGTUFnamZyTW1rWGRCZFVnQjl4M1ZYWjR3YTBvPSJ9fSwic2lnbmVkSWRlbnRpdHlLZXkiOnsicHJpdmF0ZSI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IkFITlFNRjJiYjBaOE9sVXBtaWIxNjQ5Y1p2cWU1Wi9JMDlCcHp6SW1VWG89In0sInB1YmxpYyI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6InB2cHlCUENNZW5zc3dXWEVnS0NVRlFXNE4xZTI0cDgrdUZaam1TcGlCazA9In19LCJzaWduZWRQcmVLZXkiOnsia2V5UGFpciI6eyJwcml2YXRlIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiMkQra0VMM0RuUVFsVGd4anUwWUlDKzNwSTlSZ29xZUhhL3VBZ3Y3RUgzTT0ifSwicHVibGljIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiM2svUThHSUlmSXUyQ0lYL0QzLzIrWHgybisrVVgxRStKaHVvekxveE9GUT0ifX0sInNpZ25hdHVyZSI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6Ik8vQjVzZVJla3hqTnRDaTZYc2tFUzFqeUczVituaGRGZ2FUanJtYUdtVkpzamRtOFpEVEl4WjFTV2VoSUN3OEk2SHRuYVRLYXVVU1Q1VGFLTE0rSGpnPT0ifSwia2V5SWQiOjF9LCJyZWdpc3RyYXRpb25JZCI6MTIsImFkdlNlY3JldEtleSI6IjVRK2hHK0dBMmhWM21yNVAycXNBU010THVZVGkwRVlaQVlJcWRWSHRXS0E9IiwicHJvY2Vzc2VkSGlzdG9yeU1lc3NhZ2VzIjpbXSwibmV4dFByZUtleUlkIjozMSwiZmlyc3RVbnVwbG9hZGVkUHJlS2V5SWQiOjMxLCJhY2NvdW50U3luY0NvdW50ZXIiOjAsImFjY291bnRTZXR0aW5ncyI6eyJ1bmFyY2hpdmVDaGF0cyI6ZmFsc2V9LCJyZWdpc3RlcmVkIjpmYWxzZSwiYWNjb3VudCI6eyJkZXRhaWxzIjoiQ0lxOWpxd0JFUGU1eGI0R0dBZ2dBQ2dBIiwiYWNjb3VudFNpZ25hdHVyZUtleSI6InlDeWRYOVZNSy9BOG45V3hZcjFiaGZNQmlUQVBMeDlHeU5ucXJIMmRmR2c9IiwiYWNjb3VudFNpZ25hdHVyZSI6InFPT2R3WUJ4K1lQSWFOdFArTlR3elZ5TzY5Ukd3MTBQdDViWGZjWHVPZUFtTUFwZ252bXRlZHA5Umg0ZktwMU9Kb1h1cCtGT3k2c3pUcGQ3Ulp4NUFBPT0iLCJkZXZpY2VTaWduYXR1cmUiOiJyV1hqVHNoNmI1dldOREdnRzJ2djMvQkJKRFl5NVJjTXo5ZWp3S2RKNVJvK3Y2aEY1TWNhL3I2R2tyOFZKN3QxMWdxT0xSY0laeWRSaDVRSjRRN3Rodz09In0sIm1lIjp7ImlkIjoiOTQ3NjcyMTk2NjE6MjRAcy53aGF0c2FwcC5uZXQiLCJsaWQiOiIxNDUyNTE1NDkzMzE1NTQ6MjRAbGlkIn0sInNpZ25hbElkZW50aXRpZXMiOlt7ImlkZW50aWZpZXIiOnsibmFtZSI6Ijk0NzY3MjE5NjYxOjI0QHMud2hhdHNhcHAubmV0IiwiZGV2aWNlSWQiOjB9LCJpZGVudGlmaWVyS2V5Ijp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiQmNnc25WL1ZUQ3Z3UEovVnNXSzlXNFh6QVlrd0R5OGZSc2paNnF4OW5YeG8ifX1dLCJwbGF0Zm9ybSI6ImFuZHJvaWQiLCJyb3V0aW5nSW5mbyI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IkNBSUlEUT09In0sImxhc3RBY2NvdW50U3luY1RpbWVzdGFtcCI6MTc0MTc3NDA4MywibGFzdFByb3BIYXNoIjoiM1I5WjM5In0' : process.env.SESSION_ID,
PREFIX: process.env.PREFIX || '.' ,
PORT: process.env.PORT === undefined ? "8000" : process.env.PORT,
SUDO: process.env.SUDO === undefined ? '94767219661' : process.env.SUDO,
SESSION_NAME: process.env.PORT === undefined ? "asitha" : process.env.SESSION_NAME,
ALIVE_MSG: process.env.ALIVE_MSG === undefined ? "*Hello , I am alive now!!*" : process.env.ALIVE_MSG,
AUTO_READ_STATUS: process.env.AUTO_READ_STATUS === undefined ?"true" : process.env.AUTO_READ_STATUS,
MODE: process.env.MODE === undefined ?"public" : process.env.MODE,
AUTO_VOICE: process.env.AUTO_VOICE === undefined ? "false" : process.env.AUTO_VOICE,
AUTO_REPLY: process.env.AUTO_REPLY === undefined ? "false" : process.env.AUTO_REPLY,
AUTO_STICKER: process.env.AUTO_STICKER === undefined ? "true" : process.env.AUTO_STICKER,
ANTI_BAD: process.env.ANTI_BAD === undefined ? "false" : process.env.ANTI_BAD,
ANTI_LINK: process.env.ANTI_LINK === undefined ? "true" : process.env.ANTI_LINK,
ANTI_CALL: process.env.ANTI_CALL === undefined ? "true" : process.env.ANTI_CALL,    
DELETEMSGSENDTO : process.env.DELETEMSGSENDTO === undefined ? '' : process.env.DELETEMSGSENDTO,
ANTI_DELETE : process.env.ANTI_DELETE === undefined ? 'true' : process.env.ANTI_DELETE,
ANTI_BOT: process.env.ANTI_BOT === undefined ? "true" : process.env.ANTI_BOT,
WELCOME_GOODBYE: process.env.WELCOME_GOODBYE === undefined ? "false" : process.env.WELCOME_GOODBYE,
ALLWAYS_OFFLINE: process.env.ALLWAYS_OFFLINE === undefined ? "false" : process.env.ALLWAYS_OFFLINE,
READ_CMD: process.env.READ_CMD === undefined ? "true" : process.env.READ_CMD,
RECORDING: process.env.RECORDING === undefined ? "true" : process.env.RECORDING,
AI_CHAT: process.env.AI_CHAT === undefined ? "false" : process.env.AI_CHAT,
AUTO_REACT: process.env.AUTO_REACT === undefined ? "false" : process.env.AUTO_REACT,
NEWS_SEND_JID: process.env.NEWS_SEND_JID === undefined ? "" : process.env.NEWS_SEND_JID,
AUTO_NEWS_SENDER: process.env.AUTO_NEWS_SENDER === undefined ? "falsw" : process.env.AUTO_NEWS_SENDER,
TIKTOK_SEND_JID: process.env.TIKTOK_SEND_JID === undefined ? "" : process.env.TIKTOK_SEND_JID,
AUTO_TIKTOK_SENDER: process.env.AUTO_TIKTOK_SENDER === undefined ? "false" : process.env.AUTO_TIKTOK_SENDER,
SEEDER_GMAIL: process.env.SEEDER_GMAIL === undefined ? "" : process.env.SEEDER_GMAIL,
SEEDER_PASSWORD: process.env.SEEDER_PASSWORD === undefined ? "" : process.env.SEEDER_PASSWORD,
BAD_NO_BLOCK: process.env.BAD_NO_BLOCK === undefined ? "false" : process.env.BAD_NO_BLOCK,
};
