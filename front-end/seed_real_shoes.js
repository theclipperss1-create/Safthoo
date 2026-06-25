import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const shoesData = [
  { name: "Nike Air Max Apex", unsplashId: "photo-1542291026-7eec264c27ff", category: "runner" },
  { name: "Adidas Ultraboost Cloud", unsplashId: "photo-1606107557195-0e29a4b5b4aa", category: "runner" },
  { name: "Safthoo Court Classic", unsplashId: "photo-1608231387042-66d1773070a5", category: "sneaker" },
  { name: "Retro Leather Loafer", unsplashId: "photo-1520639888713-7851133b1ed0", category: "loafer" },
  { name: "Vanguard Chelsea Boot", unsplashId: "photo-1614252235316-8c857d38b5f4", category: "boot" },
  { name: "Air Jordan Retro Eclipse", unsplashId: "photo-1595950653106-6c9ebd614d3a", category: "sneaker" },
  { name: "Puma Mirage Tech Noir", unsplashId: "photo-1584735935682-2f2b69dff9d2", category: "runner" },
  { name: "Converse Chuck Taylor Red", unsplashId: "photo-1607522370275-f14206abe5d3", category: "sneaker" },
  { name: "Vans Old Skool Canary", unsplashId: "photo-1525966222134-fcfa99b8ae77", category: "sneaker" },
  { name: "Nike Flyknit Zephyr", unsplashId: "photo-1491553895911-0055eca6402d", category: "runner" },
  { name: "Adidas NMD Cobalt", unsplashId: "photo-1515955656352-a1fa3ffcd111", category: "runner" },
  { name: "Suede Derby Tan", unsplashId: "photo-1549298916-b41d501d3772", category: "loafer" },
  { name: "Timberland Trail Hiker", unsplashId: "photo-1514989940723-e8e51635b782", category: "boot" },
  { name: "Monolith Combat Boot", unsplashId: "photo-1506152983158-b4a74a01c721", category: "boot" },
  { name: "Safthoo Double Monkstrap", unsplashId: "photo-1533867617858-e7b97e060509", category: "loafer" },
  { name: "Minimal Leather Slip-on", unsplashId: "photo-1534653270134-4f46b572a314", category: "sneaker" },
  { name: "Club Canvas Low", unsplashId: "photo-1460353581641-37baddab0fa2", category: "sneaker" },
  { name: "Gatsby Suede Brogue", unsplashId: "photo-1603808033192-082d6919d3e1", category: "loafer" },
  { name: "Vibe Slide Charcoal", unsplashId: "photo-1603252109303-2751441dd157", category: "accessories" },
  { name: "Safthoo House Slide White", unsplashId: "photo-1628253747716-0c4f5c90fdda", category: "accessories" },
  { name: "Clarks Desert Boot Noir", unsplashId: "photo-1556906781-9a412961c28c", category: "boot" },
  { name: "New Balance Retro 990", unsplashId: "photo-1560769629-975ec94e6a86", category: "runner" },
  { name: "Nike Air Force Elite", unsplashId: "photo-1600185365483-26d7a4cc7519", category: "sneaker" },
  { name: "Fila Disruptor Chunky", unsplashId: "photo-1551107696-a4b0c5a0d9a2", category: "sneaker" },
  { name: "Under Armour Infinite", unsplashId: "photo-1582588678413-dbf45f4823e9", category: "runner" },
  { name: "Nike Zoom Pegasus Orange", unsplashId: "photo-1539185441755-769473a23570", category: "runner" },
  { name: "Dr Martens Classic Derby", unsplashId: "photo-1533867617858-e7b97e060509", category: "loafer" },
  { name: "Asics Gel Kayano Ocean", unsplashId: "photo-1543163521-1bf539c55dd2", category: "runner" },
  { name: "Red Wing Chelsea Boot", unsplashId: "photo-1614252235316-8c857d38b5f4", category: "boot" },
  { name: "Luxe Velvet Slipper", unsplashId: "photo-1533867617858-e7b97e060509", category: "loafer" }
];

const colorPool = [
  "Obsidian Black",
  "Chalk White",
  "Slate Grey",
  "Sage Green",
  "Earthy Ochre",
  "Midnight Navy",
  "Crimson Rust",
  "Sand Beige"
];

const baseSizes = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49];

async function seed() {
  console.log("Starting real shoes database seed...");

  // Delete all existing products except Geist Keycap Set
  try {
    const productsCol = collection(db, 'products');
    const snapshot = await getDocs(productsCol);
    for (const docSnap of snapshot.docs) {
      if (docSnap.id !== 'y3nXzlVHFFNNuv4BoBnx') {
        console.log(`Deleting product: ${docSnap.id}...`);
        await deleteDoc(doc(db, 'products', docSnap.id));
      }
    }
  } catch (err) {
    console.error("Error clearing old products:", err.message);
  }

  // Add 30 shoes
  for (let i = 0; i < shoesData.length; i++) {
    const sData = shoesData[i];
    
    // Deterministic colors (2-5 colors)
    const numColors = 2 + (i % 4);
    const colors = [];
    for (let c = 0; c < numColors; c++) {
      const colorIdx = (i + c * 3) % colorPool.length;
      if (!colors.includes(colorPool[colorIdx])) {
        colors.push(colorPool[colorIdx]);
      }
    }

    // Deterministic sizes (subset of 36-49)
    const numSizes = 7 + (i % 4); // 7 to 10 sizes
    const sizes = [];
    const startIdx = i % 5; // Start somewhere between 36 and 40
    for (let s = 0; s < numSizes; s++) {
      const size = baseSizes[startIdx + s];
      if (size <= 49) {
        sizes.push(size);
      }
    }

    let name = sData.name;
    const brands = ["Nike", "Adidas", "Air Jordan", "Puma", "Converse", "Vans", "Timberland", "Clarks", "New Balance", "Fila", "Under Armour", "Dr Martens", "Asics", "Red Wing"];
    for (const brand of brands) {
      if (name.startsWith(brand + " ")) {
        name = name.substring(brand.length + 1);
        break;
      }
    }
    if (!name.startsWith("Safthoo")) {
      name = "Safthoo " + name;
    }

    const price = 1100000 + (i * 65000) % 1500000;
    const stock = 8 + (i * 9) % 25;
    const imageUrl = `https://images.unsplash.com/${sData.unsplashId}?auto=format&fit=crop&w=600&q=80`;
    const description = `Model ${name} terinspirasi dari gaya hidup urban modern. Didesain secara ergonomis menggunakan material kelas atas demi menjamin estetika premium serta performa ketahanan tinggi sepanjang hari.`;
    const id = `shoe_${String(i + 1).padStart(2, '0')}`;

    try {
      console.log(`Writing product: ${name}...`);
      await setDoc(doc(db, 'products', id), {
        name: name,
        description,
        current_price: price,
        stock_qty: stock,
        image_url: imageUrl,
        category: sData.category,
        colors,
        sizes,
        is_active: true
      });
      console.log(`Product ${name} saved successfully!`);
    } catch (err) {
      console.error(`Error saving product ${name}:`, err.message);
    }
  }

  console.log("Seed finished!");
  process.exit(0);
}

seed();
