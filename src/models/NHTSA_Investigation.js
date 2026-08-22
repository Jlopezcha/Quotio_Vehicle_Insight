import mongoose from 'mongoose';

const investigationSchema = new mongoose.Schema({
  ODI_Number: { type: String},
  make: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: String, required: true },
  component: { type: String},
  manufacturer: { type: String},
  open_date: { type: String},
  close_date: { type: String},
  recall_number: { type: String},
  summary_title: { type: String},
  summary: { type: String}
});

export default mongoose.model('InvData', investigationSchema);
