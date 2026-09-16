//import mongoose from 'mongoose';
import { connectdb } from '../../../src/config/db.js';
import Post from '../../models/Post.js';
import Comment from '../../models/Comment.js'

await connectdb();

export async function getAll(){
    const posts = await Post.find();
    return posts;
}

export async function getById(id){
    const post = await Post.findById(id);
    return post;
}

export async function create(postData) {
  const newPost = await Post.create(postData);
  return newPost;
}

export async function update(id, updatedData){
    console.log(id);

    const updatedPost = await Post.findByIdAndUpdate(
        id,
        updatedData,
        {
            new: true,           
            runValidators: true, 
        }
    )

    return updatedPost
}

export async function remove(id){
    await Comment.deleteMany({post: id});
    const deletedPost = await Post.findByIdAndDelete(id);
    return deletedPost;
}