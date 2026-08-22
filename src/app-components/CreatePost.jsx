import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "./PageLayout";

function CreatePost() {
  const [title, setTitle] = useState();
  const [content, setContent] = useState();

  const navigate = useNavigate();

  const handleCreate = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("quotio_token");

    try {
      await fetch(`/api/posts/`, {
        method: "POST",
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

  return (
    <PageLayout>
      <div className="mx-auto max-w-3xl rounded-xl border border-border/70 bg-card/80 p-6 shadow-sm shadow-black/20">
        <h1 className="mb-5 text-3xl font-bold text-card-foreground">Create a Post</h1>
        <form className="space-y-4" onSubmit={handleCreate}>
          <Input
            type="string"
            placeholder="Enter post title (At least 3 characters long)"
            required={true}
            className="h-12"
            onChange={(e) => {
              setTitle(e.target.value);
            }}
          />

          <Input
            type="string"
            placeholder="Content for post (At least 10 characters long)"
            required={true}
            className="h-12"
            onChange={(e) => {
              setContent(e.target.value);
            }}
          />

          <Button
            type="submit"
            size="lg"
          >
            Create
          </Button>
        </form>
      </div>
    </PageLayout>
  );
}

export default CreatePost;
