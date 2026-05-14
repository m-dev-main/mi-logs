type PostPreviewProps = {
  bodyHtml: string;
};

export function PostPreview({ bodyHtml }: PostPreviewProps) {
  return (
    <section className="admin-preview" aria-labelledby="post-preview-title">
      <div className="admin-preview__header">
        <p className="eyebrow" id="post-preview-title">
          Server-rendered preview
        </p>
      </div>
      {bodyHtml.trim().length > 0 ? (
        <div className="prose prose--preview" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      ) : (
        <p className="admin-preview__empty">
          Save the post to render sanitized HTML from the API.
        </p>
      )}
    </section>
  );
}
