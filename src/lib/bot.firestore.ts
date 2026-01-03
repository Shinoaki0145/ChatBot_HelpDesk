import {
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase/app";
import { BotDocument } from "./bot.types";

const COLLECTION = "bots";

export async function saveBot(bot: BotDocument) {
  const ref = doc(db, COLLECTION, bot.botID);
  await setDoc(ref, bot);
}

export async function getBotById(botID: string) {
  const ref = doc(db, COLLECTION, botID);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as BotDocument) : null;
}
