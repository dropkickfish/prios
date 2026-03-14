import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import Image from '@tiptap/extension-image';

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  focusSignal?: number;
}

export const TipTapEditor = ({ content, onChange, placeholder, focusSignal }: TipTapEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder || 'Write something...',
      }),
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
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert focus:outline-none max-w-none min-h-[150px] p-4 bg-base-100 rounded-2xl border border-base-content/10 focus:border-primary/50 transition-colors',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
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
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 mb-1 overflow-x-auto p-1 bg-base-200/50 rounded-xl border border-base-content/5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`btn btn-xs btn-ghost ${editor.isActive('bold') ? 'btn-active bg-primary/20 text-primary' : ''}`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`btn btn-xs btn-ghost ${editor.isActive('italic') ? 'btn-active bg-primary/20 text-primary' : ''}`}
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`btn btn-xs btn-ghost ${editor.isActive('heading', { level: 1 }) ? 'btn-active bg-primary/20 text-primary' : ''}`}
          title="Heading 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`btn btn-xs btn-ghost ${editor.isActive('heading', { level: 2 }) ? 'btn-active bg-primary/20 text-primary' : ''}`}
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`btn btn-xs btn-ghost ${editor.isActive('heading', { level: 3 }) ? 'btn-active bg-primary/20 text-primary' : ''}`}
          title="Heading 3"
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`btn btn-xs btn-ghost ${editor.isActive('bulletList') ? 'btn-active bg-primary/20 text-primary' : ''}`}
          title="Bullet List"
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`btn btn-xs btn-ghost ${editor.isActive('orderedList') ? 'btn-active bg-primary/20 text-primary' : ''}`}
          title="Ordered List"
        >
          1. List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`btn btn-xs btn-ghost ${editor.isActive('codeBlock') ? 'btn-active bg-primary/20 text-primary' : ''}`}
          title="Code Block"
        >
          &lt;/&gt;
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`btn btn-xs btn-ghost ${editor.isActive('strike') ? 'btn-active bg-primary/20 text-primary' : ''}`}
          title="Strike"
        >
          <s>S</s>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`btn btn-xs btn-ghost ${editor.isActive('blockquote') ? 'btn-active bg-primary/20 text-primary' : ''}`}
          title="Blockquote"
        >
          "
        </button>
        
        <div className="divider divider-horizontal mx-1"></div>

        <button
          type="button"
          onClick={() => {
            const url = window.prompt('URL');
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          className={`btn btn-xs btn-ghost ${editor.isActive('link') ? 'btn-active bg-primary/20 text-primary' : ''}`}
          title="Link"
        >
          🔗
        </button>

        <button
          type="button"
          onClick={() => {
            const url = window.prompt('YouTube URL');
            if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
          }}
          className="btn btn-xs btn-ghost"
          title="Embed YouTube"
        >
          📺
        </button>

        <button
          type="button"
          onClick={() => {
            const url = window.prompt('Image URL');
            if (url) editor.chain().focus().setImage({ src: url }).run();
          }}
          className="btn btn-xs btn-ghost"
          title="Insert image by URL"
        >
          🖼️
        </button>
      </div>
      <EditorContent editor={editor} {...(placeholder ? { placeholder } : {})} />
    </div>
  );
};
