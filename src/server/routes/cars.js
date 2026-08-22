import { Router } from 'express';
import CarMake from '../../models/CarMake.js';

const router = Router();

router.get('/makes', async (req, res) => {
  const makes = await CarMake.find({}, 'name').sort('name');
  res.json(makes.map((m) => m.name));
});

export default router;
