import User from '../../models/User.js';
import{
    getAllComments,
    getCommentById,
    getCommentsByPostId,
    createCommeent,
    updateComment,
    deleteComment,
} from '../services/commentService.js';

export async function getAllCommentsHandler(req, res) {
    let comments = await getAllComments();
    res.status(200).json(comments);
}

export async function getCommentByIdHandler(req, res) {
    const id = req.params.id;
    const comment = await getCommentById(id);
    res.status(200).json(comment);
}

export async function getCommentsByPostIdHandler(req, res) {
    const id = req.params.id;
    const comments = await getCommentsByPostId(id);
    res.status(200).json(comments);
}

export async function createCommentHandler(req, res){
    const {content} = req.body;
    const id = req.user.userId;

    const userData = await User.findById(id);
    const username = userData.username;

    const newComment = await createCommeent({content, author: req.user.userId, userName: username, post: req.params.id});
    res.status(201).json(newComment);
}


export async function updateCommentHandler(req, res){
    const id = req.params.id;
    const {content} = req.body;
    const updatedComment = await updateComment(id, {content});
    res.status(200).json(updatedComment);
}

export async function deleteCommentHandler(req, res) {
    const id = req.params.id;
    await deleteComment(id);
    res.status(204).send();
}

