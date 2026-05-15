export type TocItem = {
  id: string;
  text: string;
  level: number;
};

type TableOfContentsProps = {
  items: TocItem[];
};

export function TableOfContents({ items }: TableOfContentsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav className="toc-panel" aria-labelledby="toc-title">
      <h2 id="toc-title">On this page</h2>
      <ol>
        {items.map((item) => (
          <li key={item.id} className={`toc-panel__item toc-panel__item--h${item.level}`}>
            <a href={`#${item.id}`}>{item.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
