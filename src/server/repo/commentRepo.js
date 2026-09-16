import { connectdb } from '../../../src/config/db.js';
import Comment from '../../models/Comment.js';


await connectdb();

export async function getAll(){
    const comments = await Comment.find();
    return comments;
}

export async function getById(id){
    const comment = await Comment.findById(id);
    return comment;
}

export async function findByPostId(id){
    let comments = await Comment.find({post: id});
    return comments;
}

export async function create(commentData) {
  const newComment = await Comment.create(commentData);
  return newComment;
}

export async function update(id, updatedCommentData){
    console.log(id);

    const updatedComment = await Comment.findByIdAndUpdate(
        id,
        updatedCommentData,
        {
            new: true,           
            runValidators: true, 
        }
    ).populate('post')

    return updatedComment;
}

export async function remove(id){
    const deletedComment = await Comment.findByIdAndDelete(id);
    return deletedComment;
}