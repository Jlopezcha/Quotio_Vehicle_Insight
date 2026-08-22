import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { useAuth } from "@/app-components/AuthContext";
import { Input } from "@/components/ui/input";
import PageLayout from "./PageLayout";

function PostDetails() {
  const [post, setPost] = useState();
  const [title, setTitle] = useState();
  const [content, setContent] = useState();
  const [loading, setLoading] = useState(true);
  const [isAuthor, setIsAuthor] = useState(false);
  const { id } = useParams();
  const { user } = useAuth();

  const navigate = useNavigate();

  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true);

        const res = await fetch(`/api/posts/${id}`);
        const data = await res.json();

        setPost(data);

        if (user?._id === data.author) {
          setIsAuthor(true);
        } else {
          setIsAuthor(false);
        }
      } catch (error) {
        console.error("Failed to fetch posts: ", error);
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchPosts();
  }, [id, user?._id]);

  const handleUpdate = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("quotio_token");

    try {
      await fetch(`/api/posts/${post._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
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
      await fetch(`/api/posts/${post._id}`, {
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
          <h1 className="mb-5 text-3xl font-bold text-card-foreground">Edit Your Post</h1>
          <form className="space-y-4 p-0">
            <Input
              type="string"
              placeholder={post.title}
              required={true}
              className="h-12"
              onChange={(e) => {
                setTitle(e.target.value);
              }}
            />

            <Input
              type="string"
              placeholder={post.content}
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
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg text-card-foreground">{post.title}</CardTitle>
            <div className="text-xs text-muted-foreground flex gap-3">
              <span>•</span>
              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
            </div>
          </CardHeader>

          <CardContent>
            <p className="text-sm text-muted-foreground">{post.content}</p>
          </CardContent>
        </Card>
      )}
    </PageLayout>
  );
}

export default PostDetails;
