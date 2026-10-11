import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId || "(default)");

async function check() {
  const snap = await getDocs(collection(db, 'accounts'));
  console.log("Total accounts:", snap.size);
  if (snap.size === 0) {
    console.log("Seeding...");
    await setDoc(doc(db, 'accounts', 'Admin'), { pin: '8888', name: 'Giáo viên chủ nhiệm' });
    await setDoc(doc(db, 'accounts', 'Manager'), { pin: '1013', name: 'Lớp phó' });
    const snap2 = await getDocs(collection(db, 'accounts'));
    console.log("Total accounts after seed:", snap2.size);
  }
  process.exit(0);
}
check().catch(console.error);
