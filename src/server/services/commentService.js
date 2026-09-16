import {
  getAll,
  getById,
  findByPostId,
  create,
  update,
  remove,
} from '../repo/commentRepo.js';

export async function getAllComments() {
  return getAll();
}

export async function getCommentById(id) {
  const comment = await getById(id);
  if (comment) return comment;
  else {
    const error = new Error(`Comment ${id} not found`);
    error.status = 404;
    throw error;
  }
}

export async function getCommentsByPostId(id) {
  const comments = await findByPostId(id);
  if (comments) return comments;
  else {
    const error = new Error(`Comments with post ${id} not found`);
    error.status = 404;
    throw error;
  }
}

export async function createCommeent(commentData) {
  console.log(commentData);
  return create(commentData);
}

export async function updateComment(id, updatedData) {
  const updatedComment = await update(id, updatedData);
  if (updatedComment) return updatedComment;
  else {
    const error = new Error(`Comment ${id} not found`);
    error.status = 404;
    throw error;
  }
}

export async function deleteComment(id) {
  const result = await remove(id);
  if (result) return;
  else {
    const error = new Error(`Comment ${id} not found`);
    error.status = 404;
    throw error;
  }
}