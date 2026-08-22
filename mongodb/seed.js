import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectdb } from '../src/config/db.js';
import User from '../src/models/User.js';
import CarMake from '../src/models/CarMake.js';

const carMakes = [
  'Acura', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet',
  'Chrysler', 'Dodge', 'Ford', 'Genesis', 'GMC', 'Honda',
  'Hyundai', 'Infiniti', 'Jeep', 'Kia', 'Lexus', 'Lincoln',
  'Mazda', 'Mercedes-Benz', 'Mitsubishi', 'Nissan', 'RAM',
  'Subaru', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo',
];

const syntheticUsers = [
  { email: 'alice@example.com', password: 'password123' },
  { email: 'bob@example.com', password: 'securepass1' },
  { email: 'charlie@example.com', password: 'mypassword9' },
  { email: 'diana@example.com', password: 'diana12345' },
  { email: 'eve@example.com', password: 'evepassword' },
];

await connectdb();

await CarMake.deleteMany({});
await CarMake.insertMany(carMakes.map((name) => ({ name })));
console.log(`Seeded ${carMakes.length} car makes`);

await User.deleteMany({});
const users = await Promise.all(
  syntheticUsers.map(async ({ email, password }) => ({
    email,
    passwordHash: await bcrypt.hash(password, 10),
  }))
);
await User.insertMany(users);
console.log(`Seeded ${users.length} users`);

await mongoose.disconnect();
console.log('Done.');
