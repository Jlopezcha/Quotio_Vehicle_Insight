import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {useState } from "react";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import PageLayout from "./PageLayout";

function CreateComment() {
  const [content, setContent] = useState();
  const { id } = useParams();

  const navigate = useNavigate();

  const handleCreate = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("quotio_token");

    try {
      await fetch(`/api/comments/create/${id}`, {
        method: "POST",
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

  return (
    <PageLayout>
      <div className="mx-auto max-w-3xl rounded-xl border border-border/70 bg-card/80 p-6 shadow-sm shadow-black/20">
        <h1 className="mb-5 text-3xl font-bold text-card-foreground">Create a Comment</h1>
        <form className="space-y-4" onSubmit={handleCreate}>

          <Input
            type="string"
            placeholder="Content for post (At least 1 character long)"
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

export default CreateComment;
