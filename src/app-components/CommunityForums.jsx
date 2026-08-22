import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app-components/AuthContext";
import PageLayout from "./PageLayout";

function CommunityForums() {
  const [posts, setPosts] = useState([]);
  const { user } = useAuth();

  const navigate = useNavigate();

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch("/api/posts/");
        console.log(res);
        const data = await res.json();
        console.log(data);
        setPosts(data);
      } catch (error) {
        console.error("Failed to fetch posts: ", error);
      }
    }

    fetchPosts();
  }, []);

  return (
    <PageLayout>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-3 text-5xl font-extrabold tracking-tight text-foreground">
            Community Forums
          </h1>
          {!user && (
            <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
              Sign in to post and be a part of the community.
            </p>
          )}
        </div>

        {user && (
          <Button type="submit" size="lg" onClick={() => navigate(`/createpost`)}>
            Create Post
          </Button>
        )}
      </div>

      <div className="mx-auto max-w-4xl space-y-4">
        {posts?.length > 0 &&
          posts.map((post) => (
            <Card
              key={post._id}
              onClick={() => navigate(`/post/${post._id}`)}
              className="cursor-pointer border-border/70 bg-card/75 transition hover:border-primary/50 hover:shadow-md"
            >
              <CardHeader className="space-y-1">
                <CardTitle className="text-lg text-card-foreground">{post.title}</CardTitle>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>•</span>
                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
              </CardHeader>

              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Click to view discussion...
                </p>
              </CardContent>
            </Card>
          ))}
      </div>
    </PageLayout>
  );
}

export default CommunityForums;
