import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import Image from '@tiptap/extension-image';

interface TipTapViewerProps {
  /** HTML string from TipTap (e.g. card description). */
  content: string;
  /** Optional class for the scrollable container. */
  className?: string;
}

/** Read-only render of TipTap content with formatting and YouTube embeds. */
export const TipTapViewer = ({ content, className = '' }: TipTapViewerProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      Youtube.configure({
        inline: false,
        width: 480,
        height: 270,
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-xl max-w-full h-auto my-2 border border-base-content/10',
        },
      }),
    ],
    content: content || '<p></p>',
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none py-0 prose-p:my-1.5 prose-p:first:mt-0 prose-headings:mt-2 prose-headings:mb-1 prose-headings:first:mt-0',
      },
    },
  });

  useEffect(() => {
    if (!editor || content === undefined) return;
    const current = editor.getHTML();
    const next = content || '<p></p>';
    if (current !== next) {
      editor.commands.setContent(next);
    }
  }, [editor, content]);

  if (!editor) {
    return null;
  }

  return (
    <div
      data-tiptap-viewer
      className={`overflow-y-auto overflow-x-hidden min-h-0 ${className}`}
    >
      <style>{`[data-tiptap-viewer] .ProseMirror { min-height: 0 !important; padding-top: 0 !important; }`}</style>
      <EditorContent editor={editor} />
    </div>
  );
};
