import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { useAuth } from "@/app-components/AuthContext";
import PageLayout from "./PageLayout";

function ForumThread() {
  const [post, setPost] = useState({});
  const [comments, setComments] = useState([]);
  const { id } = useParams();
  const { user } = useAuth();

  const navigate = useNavigate();

  useEffect(() => {
    async function fetchThread() {
      try {
        const res = await fetch(`/api/posts/${id}`);
        console.log(res);
        const data = await res.json();
        console.log(data);
        setPost(data);

        const cmmts = await fetch(`/api/comments/filter-comments/${id}`);
        console.log(cmmts);
        const commentsData = await cmmts.json();
        setComments(commentsData);
      } catch (error) {
        console.error("Failed to fetch posts: ", error);
      }
    }

    fetchThread();
  }, [id]);

  return (
    <PageLayout>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-3 text-5xl font-extrabold tracking-tight text-foreground">
            Thread
          </h1>
          {!user && (
            <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
              Sign in to create and edit/delete.
            </p>
          )}
        </div>
      </div>

        <div className="mx-auto max-w-4xl space-y-4">
          <Card
            onClick={() => navigate(`/post/${post._id}`)}
            className="cursor-pointer border-border/70 bg-card/75 transition hover:border-primary/50 hover:shadow-md"
          >
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg text-card-foreground">
                {post.title}
              </CardTitle>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>•</span>
                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
            </CardHeader>

            <CardContent>
              <p className="text-sm text-muted-foreground">{post.content}</p>
            </CardContent>
          </Card>
        </div>

        <div className="mx-auto max-w-4xl space-y-4 m-5">
          <p>Comments</p>
          <Separator />
        </div>

        <div className="mx-auto max-w-4xl space-y-4">
          {comments?.length > 0 &&
            comments.map((comment) => (
              <Card
                key={comment._id}
                onClick={() => navigate(`/comment/${comment._id}`)}
                className="cursor-pointer border-border/70 bg-card/75 transition hover:border-primary/50 hover:shadow-md"
              >
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {comment.content}
                  </p>
                </CardContent>

                <CardFooter>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>•</span>
                    <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardFooter>
              </Card>
            ))}
        </div>

        {user && (
          <Button
            className={"m-7"}
            type="submit"
            size="lg"
            onClick={() => navigate(`/createcomment/${id}`)}
          >
            Create Comment
          </Button>
        )}
      
    </PageLayout>
  );
}

export default ForumThread;
