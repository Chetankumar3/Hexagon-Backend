#!/usr/bin/env node
/**
 * Script to generate VAPID keys for Web Push Notifications
 * 
 * Usage: node src/scripts/generateVapidKeys.js
 * 
 * This will output the keys that should be added to your .env file:
 * VAPID_PUBLIC_KEY=...
 * VAPID_PRIVATE_KEY=...
 * VAPID_EMAIL=mailto:your-email@example.com
 */

import webpush from "web-push";

const vapidKeys = webpush.generateVAPIDKeys();

console.log("\n🔑 VAPID Keys Generated!\n");
console.log("Add these to your .env file:\n");
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_EMAIL=mailto:your-email@example.com\n`);
console.log("⚠️  Keep VAPID_PRIVATE_KEY secret! Never commit it to version control.\n");

