import User from '../../models/User.js';
import {
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
} from '../services/postService.js';


export async function getAllPostsHandler(req, res) {
  let posts = await getAllPosts();
  res.status(200).json(posts);
}

export async function getPostByIdHandler(req, res) {
  const id = req.params.id;
  const post = await getPostById(id);
  res.status(200).json(post);
}

export async function createPostHandler(req, res) {
  //console.log(req.body);
  const { title, content } = req.body;
  //console.log(req.body);
  const id = req.user.userId;
  
  const userData = await User.findById(id);
  const username = userData.username;
  //console.log("in create controller handler. username = " + username);

  const newPost = await createPost({ title, content, author: id, userName: username });
  res.status(201).json(newPost);
}

export async function updatePostHandler(req, res) {
  const id = req.params.id;
  const { title, content } = req.body;
  const updatedPost = await updatePost(id, { title, content });
  res.status(200).json(updatedPost);
}

export async function deletePostHandler(req, res) {
  const id = req.params.id;
  await deletePost(id);
  res.status(204).send();
}
