import { db } from "../api/queries/connection";
import { users, menuItems, openingHours } from "./schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  // Clear existing data (ignore errors if tables don't exist yet)
  try { db.delete(users).run(); } catch { /* table may not exist yet */ }
  try { db.delete(menuItems).run(); } catch { /* table may not exist yet */ }
  try { db.delete(openingHours).run(); } catch { /* table may not exist yet */ }

  // Seed super admin
  db.insert(users).values({
    firstName: "Dave",
    surname: "Akinbolu",
    role: "super_admin",
    username: "akinboludave@gmail.com",
    passwordHash: bcrypt.hashSync("davester2005", 10),
    mustChangePassword: false,
    canChangePassword: true,
    isActive: true,
    isSuspended: false,
    loginAttempts: 0,
  }).run();

  // Seed admin
  db.insert(users).values({
    firstName: "Admin",
    role: "admin",
    username: "admin",
    passwordHash: bcrypt.hashSync("admin123", 10),
    mustChangePassword: false,
    canChangePassword: true,
    isActive: true,
    isSuspended: false,
    loginAttempts: 0,
  }).run();

  // Seed opening hours
  const hours = [
    { day: "monday", dayLabel: "Monday", openTime: "12:00", closeTime: "19:00", isClosed: false },
    { day: "tuesday", dayLabel: "Tuesday", openTime: "12:00", closeTime: "19:00", isClosed: false },
    { day: "wednesday", dayLabel: "Wednesday", openTime: "12:00", closeTime: "19:00", isClosed: false },
    { day: "thursday", dayLabel: "Thursday", openTime: "12:00", closeTime: "19:00", isClosed: false },
    { day: "friday", dayLabel: "Friday", openTime: "12:00", closeTime: "19:00", isClosed: false },
    { day: "saturday", dayLabel: "Saturday", openTime: "12:00", closeTime: "19:00", isClosed: false },
    { day: "sunday", dayLabel: "Sunday", openTime: null, closeTime: null, isClosed: true },
  ];
  for (const h of hours) {
    db.insert(openingHours).values(h).run();
  }

  // Seed all menu items
  const menu = [
    // Drinks
    { name: "Malta Guinness", description: "Non-alcoholic malt drink, 330ml", price: "£2.70", imagePath: "/malta-guinness.jpg", category: "Drinks" },
    { name: "Amstel Malta", description: "Non-alcoholic malt drink, 330ml", price: "£2.70", imagePath: "/amstel-malt.jpg", category: "Drinks" },
    { name: "Coca-Cola", description: "Classic Coca-Cola, 330ml", price: "£2.00", imagePath: "/coca-cola.jpg", category: "Drinks" },
    { name: "Fanta Orange", description: "Refreshing orange soda, 330ml", price: "£2.00", imagePath: "/fanta.jpg", category: "Drinks" },
    { name: "Sprite", description: "Lemon-lime soda, 330ml", price: "£2.00", imagePath: "/sprite.jpg", category: "Drinks" },
    { name: "Appletiser", description: "Sparkling apple drink, 250ml", price: "£2.70", imagePath: "/appletiser.jpg", category: "Drinks" },
    { name: "San Pellegrino Orange", description: "Italian sparkling orange beverage, 330ml", price: "£2.70", imagePath: "/san-pellegrino-orange.jpg", category: "Drinks" },
    { name: "San Pellegrino Lemon", description: "Italian sparkling lemon beverage, 330ml", price: "£2.70", imagePath: "/san-pellegrino-lemon.jpg", category: "Drinks" },
    { name: "Zobo", description: "Refreshing Nigerian hibiscus drink, naturally sweetened and served chilled", price: "£2.50", imagePath: "/zobo-small.jpg", category: "Drinks" },
    { name: "Bottled Water", description: "Still mineral water, 500ml", price: "£1.35", imagePath: "/bottled-water.jpg", category: "Drinks" },
    // Swallow
    { name: "Iyan (Pounded Yam)", description: "Smooth pounded yam made from yam flour", price: "£3.50", imagePath: "/poundo-yam.jpg", category: "Swallow" },
    { name: "Eba (Garri)", description: "Traditional cassava flour swallow", price: "£3.00", imagePath: "/eba.jpg", category: "Swallow" },
    // Soups
    { name: "Edikaikong (Calabar Signature)", description: "The king of Calabar soups! Rich vegetable soup with pumpkin leaves, waterleaf, assorted meats, and dried fish. Spice level can be adjusted to your preference.", price: "£14.99", imagePath: "/edikaikong-new.jpg", category: "Soups", isPopular: true, isSpicy: true },
    { name: "Afang Soup (Calabar Special)", description: "Nutritious soup made with Afang leaves, waterleaf, assorted meats, and seafood. Spice level can be adjusted to your preference.", price: "£14.99", imagePath: "/afang-soup-new.jpg", category: "Soups", isPopular: true, isSpicy: true },
    { name: "Egusi Soup", description: "Rich and creamy melon seed soup with leafy vegetables, assorted meats, and fish. A Nigerian favorite that can be made mild or spicy to your taste.", price: "£13.99", imagePath: "/egusi-soup-new.jpg", category: "Soups", isPopular: true },
    { name: "Efo Riro", description: "Traditional Yoruba spinach stew with assorted meats and smoked fish. We can adjust the spice level to suit your palate.", price: "£13.99", imagePath: "/efo-riro-new.jpg", category: "Soups", isSpicy: true },
    { name: "Ogbono Soup", description: "Delicious draw soup made with ground ogbono seeds, assorted meats, and fish. A comforting Nigerian classic with customizable spice.", price: "£13.99", imagePath: "/ogbono-soup-new.jpg", category: "Soups" },
    { name: "Okra (Ila)", description: "Delicious okra soup with seafood, meats, and traditional seasonings. Spice level can be adjusted to your preference.", price: "£12.99", imagePath: "/okra-soup-new.jpg", category: "Soups", isSpicy: true },
    { name: "Stew with Chicken", description: "Rich tomato-based stew with tender chicken pieces. Served with your choice of swallow. Spice level can be adjusted.", price: "£12.50", imagePath: "/stew-chicken.jpg", category: "Soups", isSpicy: true },
    { name: "Stew with Beef", description: "Rich tomato-based stew with tender beef pieces. Served with your choice of swallow. Spice level can be adjusted.", price: "£12.50", imagePath: "/stew-beef.jpg", category: "Soups", isSpicy: true },
    // Main Course
    { name: "Coconut Rice (Chicken)", description: "Fragrant rice cooked in creamy coconut milk with spices, served with grilled chicken. Dairy-free.", price: "£13.99", imagePath: "/coconut-rice-new.jpg", category: "Main Course", dietary: "Dairy-Free" },
    { name: "Jollof Rice (Chicken or Beef + Plantain)", description: "Nigeria's famous party rice with your choice of chicken or beef, served with sweet fried plantains.", price: "£12.50", imagePath: "/jollof-rice-plantain.jpg", category: "Main Course", isPopular: true },
    { name: "Jollof Rice (Chicken or Beef)", description: "Classic Nigerian Jollof rice cooked in rich tomato stew with your choice of chicken or beef.", price: "£12.00", imagePath: "/jollof-rice.jpg", category: "Main Course" },
    { name: "Fried Rice (Chicken or Beef)", description: "Fragrant fried rice with mixed vegetables and your choice of chicken or beef.", price: "£12.50", imagePath: "/fried-rice.jpg", category: "Main Course" },
    { name: "Rice and Stew", description: "Steamed white rice served with our signature tomato stew and your choice of protein.", price: "£17.20", imagePath: "/rice-and-stew.jpg", category: "Main Course", isSpicy: true },
    { name: "Vegetarian Beans and Dodo", description: "Slow-cooked beans in palm oil sauce served with sweet fried plantains. A delicious vegetarian option.", price: "£14.80", imagePath: "/vegetarian-beans-dodo.jpg", category: "Main Course" },
    { name: "Abula", description: "Traditional Yoruba mixed soup combining Amala withGbegiri and Ewedu, served with assorted meats and fish.", price: "£21.99", imagePath: "/abula.jpg", category: "Main Course" },
    { name: "Ayamase - Ofada Stew", description: "Authentic Nigerian Ofada stew made with green bell peppers, locust beans, and assorted meats. A spicy Yoruba delicacy.", price: "£18.99", imagePath: "/ayamase-ofada-stew.jpg", category: "Main Course", isSpicy: true },
    { name: "Ayamase", description: "Flavorful Ayamase rice dish with green pepper sauce, boiled eggs, and your choice of protein.", price: "£16.99", imagePath: "/ayamase.jpg", category: "Main Course", isSpicy: true },
    // Sides
    { name: "Fried Plantain", description: "Sweet and crispy fried ripe plantain slices", price: "£2.00", imagePath: "/fried-plantain.jpg", category: "Sides" },
    { name: "Moi Moi", description: "Steamed bean pudding made with black-eyed peas, peppers, and spices", price: "£3.50", imagePath: "/moi-moi-new.jpg", category: "Sides" },
    { name: "Puff Puff", description: "Traditional Nigerian fried dough balls, lightly sweetened", price: "£3.50", imagePath: "/puffpuff.jpg", category: "Sides" },
    { name: "Meat Pie", description: "Flaky pastry filled with seasoned minced meat and vegetables", price: "£3.50", imagePath: "/meatpie.jpg", category: "Sides" },
    // Grills & Pepper Soups
    { name: "Pepper Soup (Goat Meat)", description: "Spicy Nigerian pepper soup with tender goat meat pieces. Spice level can be adjusted.", price: "£9.99", imagePath: "/pepper-soup-goat.jpg", category: "Grills & Pepper Soups", isSpicy: true, isPreorder: true },
    { name: "Pepper Soup (Catfish)", description: "Spicy Nigerian pepper soup with fresh catfish. Spice level can be adjusted.", price: "£12.99", imagePath: "/catfish-pepper-soup.jpg", category: "Grills & Pepper Soups", isPopular: true, isSpicy: true, isPreorder: true },
    { name: "Pepper Soup (Chicken)", description: "Spicy Nigerian pepper soup with tender chicken pieces. Spice level can be adjusted.", price: "£10.99", imagePath: "/pepper-soup-goat.jpg", category: "Grills & Pepper Soups", isSpicy: true, isPreorder: true },
    { name: "Pepper Snail", description: "Delicacy of snails cooked in spicy pepper soup broth. Spice level can be adjusted.", price: "£10.00", imagePath: "/peppered-snail.jpg", category: "Grills & Pepper Soups", isSpicy: true, isPreorder: true },
    { name: "Goat Head (Isi Ewu)", description: "Traditional Igbo delicacy of spiced goat head. A Nigerian specialty available on pre-order.", price: "£17.00", imagePath: "/goat-head-isi-ewu.jpg", category: "Grills & Pepper Soups", isPreorder: true, isSpicy: true },
    { name: "Suya", description: "Spicy grilled meat skewers with traditional suya spice blend. Spice level can be adjusted.", price: "£10.99", imagePath: "/suya-new.jpg", category: "Grills & Pepper Soups", isSpicy: true, isPreorder: true },
    { name: "Grilled Chicken", description: "Succulent chicken pieces marinated and grilled to perfection", price: "£7.99", imagePath: "/grilled-chicken.jpg", category: "Grills & Pepper Soups", isPreorder: true },
    { name: "Grilled Fish", description: "Fresh whole tilapia fish marinated and grilled with spices. Spice level can be adjusted.", price: "£15.99", imagePath: "/grilled-fish.jpg", category: "Grills & Pepper Soups", isSpicy: true, isPreorder: true },
  ];

  for (const item of menu) {
    db.insert(menuItems).values(item).run();
  }

  console.log("Seeded successfully!");
  console.log("Super admin: akinboludave@gmail.com / davester2005");
  console.log("Admin: admin / admin123");
}

seed();
