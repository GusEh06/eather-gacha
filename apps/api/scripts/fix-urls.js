// Fix entity image URLs to match Firebase Storage
const updates = [
  { nombre: "Vael", imageUrl: "https://firebasestorage.googleapis.com/v0/b/desarrollo-ix-parcial-2.firebasestorage.app/o/vael.png?alt=media&token=db2d362b-7b67-4887-bbad-743234104b76" },
  { nombre: "Morr", imageUrl: "https://firebasestorage.googleapis.com/v0/b/desarrollo-ix-parcial-2.firebasestorage.app/o/morr.png?alt=media&token=8c00f4ed-8d4f-423e-94f3-3607c9eff2ec" },
  { nombre: "Cendra", imageUrl: "https://firebasestorage.googleapis.com/v0/b/desarrollo-ix-parcial-2.firebasestorage.app/o/cendra.png?alt=media&token=0d9a7049-e546-4285-b481-83bf8f2c567d" },
  { nombre: "Pyk", imageUrl: "https://firebasestorage.googleapis.com/v0/b/desarrollo-ix-parcial-2.firebasestorage.app/o/pyk.png?alt=media&token=7c0ee905-4d15-4645-8af1-432cb19d9fdf" },
  { nombre: "Grael", imageUrl: "https://firebasestorage.googleapis.com/v0/b/desarrollo-ix-parcial-2.firebasestorage.app/o/grael.png?alt=media&token=64608a8a-0066-461f-85d6-89cee2e11626" },
  { nombre: "Fyssen", imageUrl: "https://firebasestorage.googleapis.com/v0/b/desarrollo-ix-parcial-2.firebasestorage.app/o/fyssen.png?alt=media&token=ef7c2e92-b1ad-4148-b862-5bae130d1450" },
  { nombre: "Keth", imageUrl: "https://firebasestorage.googleapis.com/v0/b/desarrollo-ix-parcial-2.firebasestorage.app/o/keth.png?alt=media&token=84cd7fb7-5480-47c2-bddf-ddea5d2e6e7c" },
  { nombre: "Solen", imageUrl: "https://firebasestorage.googleapis.com/v0/b/desarrollo-ix-parcial-2.firebasestorage.app/o/solen.png?alt=media&token=8123e89f-6df5-4c91-9930-2e47e72381d0" },
  { nombre: "Ixar", imageUrl: "https://firebasestorage.googleapis.com/v0/b/desarrollo-ix-parcial-2.firebasestorage.app/o/ixar.png?alt=media&token=8c1f089e-78b9-4691-9b46-a8d4dafd6bb6" },
];

for (const u of updates) {
  const result = db.entities.updateOne(
    { nombre: u.nombre },
    { $set: { imageUrl: u.imageUrl } }
  );
  print(`${u.nombre}: matched=${result.matchedCount}, modified=${result.modifiedCount}`);
}

print("\n--- Verification ---");
db.entities.find({}, { nombre: 1, imageUrl: 1, _id: 0 }).forEach(doc => printjson(doc));
