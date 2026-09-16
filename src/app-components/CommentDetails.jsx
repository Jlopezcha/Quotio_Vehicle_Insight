import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { useAuth } from "@/app-components/AuthContext";
import { Input } from "@/components/ui/input";
import PageLayout from "./PageLayout";

function CommentDetails() {
  const [comment, setComment] = useState();
  const [content, setContent] = useState();
  const [loading, setLoading] = useState(true);
  const [isAuthor, setIsAuthor] = useState(false);
  const { id } = useParams();
  const { user } = useAuth();

  const navigate = useNavigate();

  useEffect(() => {
    async function fetchComment() {
      try {
        setLoading(true);

        const res = await fetch(`/api/comments/${id}`);
        const data = await res.json();

        setComment(data);

        if (user?._id === data.author) {
          setIsAuthor(true);
        } else {
          setIsAuthor(false);
        }
      } catch (error) {
        console.error("Failed to fetch comment: ", error);
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchComment();
  }, [id, user?._id]);

  const handleUpdate = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("quotio_token");
  
    try {
      await fetch(`/api/comments/${comment._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        
        body: JSON.stringify({
          content,
        }),
      });

      navigate(`/forums`);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("quotio_token");

    try {
      await fetch(`/api/comments/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      navigate(`/forums`);
    } catch (error) {
      console.error(error);
    }
  };

  //console.log(id);
  return (
    <PageLayout>
      {loading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : isAuthor ? (
        <div className="mx-auto max-w-3xl rounded-xl border border-border/70 bg-card/80 p-6 shadow-sm shadow-black/20">
          <h1 className="mb-5 text-3xl font-bold text-card-foreground">Edit Your Comment</h1>
          <form className="space-y-4 p-0">
            <Input
              type="string"
              placeholder={comment.content}
              required={true}
              className="h-12"
              onChange={(e) => {
                setContent(e.target.value);
              }}
            />

            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                size="lg"
                onClick={handleUpdate}
              >
                Update
              </Button>

              <Button
                type="submit"
                size="lg"
                variant="outline"
                onClick={handleDelete}
              >
                Delete
              </Button>
            </div>
          </form>
          </div>
      ) : (
        <Card className="mx-auto max-w-3xl border-border/70 bg-card/75 transition hover:shadow-md">
          <CardContent>
            <p className="text-sm text-muted-foreground">{comment.content}</p>
          </CardContent>

          <CardFooter>
            <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{comment.userName}</span>
                    <span>•</span>
                    <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                  </div>
          </CardFooter>
        </Card>
      )}
    </PageLayout>
  );
}

export default CommentDetails;
