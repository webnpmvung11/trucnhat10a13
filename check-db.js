import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app);

async function check() {
  const snap = await getDocs(collection(db, 'accounts'));
  console.log("Total accounts:", snap.size);
  snap.forEach(d => {
    console.log(d.id, "=>", d.data());
  });
  process.exit(0);
}
check().catch(console.error);
