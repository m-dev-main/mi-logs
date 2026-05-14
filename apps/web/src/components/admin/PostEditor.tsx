import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  deleteAdminPost,
  publishAdminPost,
  PublicApiError,
  unpublishAdminPost,
  updateAdminPost,
} from "../../api/client";
import { useAutosaveState } from "../../hooks/useAutosaveState";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";
import type { AdminPost } from "../../types/api";
import { Button } from "../ui/Button";
import { DeletePostDialog } from "./DeletePostDialog";
import {
  PostForm,
  tagsArrayToCsv,
  tagsCsvToArray,
  type PostFormValue,
} from "./PostForm";
import { PostPreview } from "./PostPreview";
import { PostStatusBadge } from "./PostStatusBadge";

type PostEditorProps = {
  post: AdminPost;
};

function formValueFromPost(post: AdminPost): PostFormValue {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    bodyMarkdown: post.bodyMarkdown,
    tagsCsv: tagsArrayToCsv(post.tags),
  };
}

function saveStateLabel(saveState: string): string {
  switch (saveState) {
    case "dirty":
      return "unsaved changes";
    case "saving":
      return "saving";
    case "error":
      return "save failed";
    default:
      return "saved";
  }
}

export function PostEditor({ post }: PostEditorProps) {
  const navigate = useNavigate();
  const [currentPost, setCurrentPost] = useState(post);
  const [formValue, setFormValue] = useState<PostFormValue>(() =>
    formValueFromPost(post),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { saveState, markDirty, markError, markSaved, markSaving } =
    useAutosaveState("saved");

  useEffect(() => {
    setCurrentPost(post);
    setFormValue(formValueFromPost(post));
    markSaved();
    setErrorMessage(null);
  }, [markSaved, post]);

  const savePost = useCallback(async () => {
    markSaving();
    setErrorMessage(null);

    try {
      const response = await updateAdminPost(currentPost._id, {
        title: formValue.title,
        slug: formValue.slug,
        excerpt: formValue.excerpt,
        bodyMarkdown: formValue.bodyMarkdown,
        tags: tagsCsvToArray(formValue.tagsCsv),
      });
      setCurrentPost(response.data);
      setFormValue(formValueFromPost(response.data));
      markSaved();
      return true;
    } catch (error) {
      markError();
      setErrorMessage(
        error instanceof PublicApiError
          ? error.message
          : "The post could not be saved.",
      );
      return false;
    }
  }, [currentPost._id, formValue, markError, markSaved, markSaving]);

  const publishPost = useCallback(async () => {
    const saved = await savePost();
    if (!saved) {
      return;
    }

    setErrorMessage(null);

    try {
      const response = await publishAdminPost(currentPost._id);
      setCurrentPost(response.data);
      setFormValue(formValueFromPost(response.data));
      markSaved();
    } catch (error) {
      markError();
      setErrorMessage(
        error instanceof PublicApiError
          ? error.message
          : "The post could not be published.",
      );
    }
  }, [currentPost._id, markError, markSaved, savePost]);

  const unpublishPost = useCallback(async () => {
    setErrorMessage(null);

    try {
      const response = await unpublishAdminPost(currentPost._id);
      setCurrentPost(response.data);
      setFormValue(formValueFromPost(response.data));
      markSaved();
    } catch (error) {
      markError();
      setErrorMessage(
        error instanceof PublicApiError
          ? error.message
          : "The post could not be unpublished.",
      );
    }
  }, [currentPost._id, markError, markSaved]);

  const confirmDelete = useCallback(async () => {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await deleteAdminPost(currentPost._id);
      navigate("/admin");
    } catch (error) {
      setErrorMessage(
        error instanceof PublicApiError
          ? error.message
          : "The post could not be deleted.",
      );
      setIsDeleting(false);
    }
  }, [currentPost._id, navigate]);

  useKeyboardShortcut("s", savePost, { metaOrCtrl: true });

  function updateForm(nextValue: PostFormValue) {
    setFormValue(nextValue);
    markDirty();
  }

  return (
    <div className="post-editor">
      <header className="post-editor__toolbar">
        <div>
          <p className="eyebrow">Local editor</p>
          <h1>{currentPost.title || "Untitled draft"}</h1>
          <div className="post-editor__meta">
            <PostStatusBadge status={currentPost.status} />
            <span>{saveStateLabel(saveState)}</span>
            <span>v{currentPost.canonicalVersion}</span>
          </div>
        </div>
        <div className="post-editor__actions">
          <Button disabled={saveState === "saving"} onClick={savePost} variant="secondary">
            {saveState === "saving" ? "Saving..." : "Save"}
          </Button>
          {currentPost.status === "published" ? (
            <Button onClick={unpublishPost} variant="secondary">
              Unpublish
            </Button>
          ) : (
            <Button onClick={publishPost} variant="primary">
              Publish
            </Button>
          )}
          <Button onClick={() => setIsDeleteOpen(true)} variant="danger">
            Delete
          </Button>
        </div>
      </header>

      {errorMessage ? (
        <div className="error-state" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <div className="post-editor__grid">
        <PostForm
          isSaving={saveState === "saving"}
          onChange={updateForm}
          onSubmit={savePost}
          value={formValue}
        />
        <PostPreview bodyHtml={currentPost.bodyHtml} />
      </div>

      <DeletePostDialog
        isDeleting={isDeleting}
        isOpen={isDeleteOpen}
        onCancel={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        post={currentPost}
      />
    </div>
  );
}
