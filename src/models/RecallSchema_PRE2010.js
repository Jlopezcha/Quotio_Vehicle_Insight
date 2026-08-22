import mongoose from 'mongoose';

const recallSchemaPre2010 = new mongoose.Schema({
  record_id: { type: Number},
  campaign_number: { type: String, required: true },
  make: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: String, required: true },
  recall_code: { type: String},
  component: { type: String},
  summary: { type: String},
  risk: { type: String},
  remedy: { type: String},
  notes: { type: String}
});

export default mongoose.model('RecallDataPre2010', recallSchemaPre2010);
