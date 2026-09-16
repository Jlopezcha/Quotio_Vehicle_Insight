import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userName : {type: String, required: true},
  post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required:true, index:true}
});

export default mongoose.model('Comment', commentSchema);
