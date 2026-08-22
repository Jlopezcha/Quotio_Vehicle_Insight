import mongoose from 'mongoose';

const carMakeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
});

export default mongoose.model('CarMake', carMakeSchema);
