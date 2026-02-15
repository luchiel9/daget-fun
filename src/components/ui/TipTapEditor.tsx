'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
// @ts-ignore
import ImageResize from 'tiptap-extension-resize-image';
import { useCallback, useEffect, useState } from 'react';

interface TipTapEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

const MenuBar = ({ editor }: { editor: any }) => {
    if (!editor) {
        return null;
    }

    const addImage = useCallback(() => {
        const url = window.prompt('URL');
        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    }, [editor]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target?.result as string;
                editor.chain().focus().setImage({ src: base64 }).run();
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="flex flex-wrap gap-1 p-2 border-b border-border-dark/40 bg-black/20 rounded-t-xl sticky top-0 z-10 w-full">
            <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={!editor.can().chain().focus().toggleBold().run()}
                className={`p-1.5 rounded-lg transition-colors ${editor.isActive('bold') ? 'bg-primary/20 text-primary' : 'text-text-secondary hover:bg-white/5 hover:text-white'}`}
                title="Bold"
            >
                <span className="material-icons text-[18px]">format_bold</span>
            </button>
            <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={!editor.can().chain().focus().toggleItalic().run()}
                className={`p-1.5 rounded-lg transition-colors ${editor.isActive('italic') ? 'bg-primary/20 text-primary' : 'text-text-secondary hover:bg-white/5 hover:text-white'}`}
                title="Italic"
            >
                <span className="material-icons text-[18px]">format_italic</span>
            </button>
            <div className="w-px h-6 bg-border-dark/40 mx-1 self-center" />
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={`p-1.5 rounded-lg transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-primary/20 text-primary' : 'text-text-secondary hover:bg-white/5 hover:text-white'}`}
                title="Heading 1"
            >
                <span className="material-icons text-[18px]">title</span>
            </button>
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`p-1.5 rounded-lg transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-primary/20 text-primary' : 'text-text-secondary hover:bg-white/5 hover:text-white'}`}
                title="Heading 2"
            >
                <span className="text-xs font-bold px-1">H2</span>
            </button>
            <div className="w-px h-6 bg-border-dark/40 mx-1 self-center" />
            <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-1.5 rounded-lg transition-colors ${editor.isActive('bulletList') ? 'bg-primary/20 text-primary' : 'text-text-secondary hover:bg-white/5 hover:text-white'}`}
                title="Bullet List"
            >
                <span className="material-icons text-[18px]">format_list_bulleted</span>
            </button>
            <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-1.5 rounded-lg transition-colors ${editor.isActive('orderedList') ? 'bg-primary/20 text-primary' : 'text-text-secondary hover:bg-white/5 hover:text-white'}`}
                title="Ordered List"
            >
                <span className="material-icons text-[18px]">format_list_numbered</span>
            </button>
            <div className="w-px h-6 bg-border-dark/40 mx-1 self-center" />

            <label className="cursor-pointer p-1.5 rounded-lg transition-colors text-text-secondary hover:bg-white/5 hover:text-white" title="Insert Image">
                <span className="material-icons text-[18px]">image</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>

            <button
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().chain().focus().undo().run()}
                className="ml-auto p-1.5 rounded-lg transition-colors text-text-secondary hover:bg-white/5 hover:text-white disabled:opacity-30"
                title="Undo"
            >
                <span className="material-icons text-[18px]">undo</span>
            </button>
            <button
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().chain().focus().redo().run()}
                className="p-1.5 rounded-lg transition-colors text-text-secondary hover:bg-white/5 hover:text-white disabled:opacity-30"
                title="Redo"
            >
                <span className="material-icons text-[18px]">redo</span>
            </button>
        </div>
    );
};

const TipTapEditor = ({ value, onChange, placeholder, className }: TipTapEditorProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            ImageResize
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-invert prose-sm sm:prose-base focus:outline-none min-h-[150px] max-w-none p-4 text-text-primary',
            },
        },
        immediatelyRender: false // Fixes some SSR hydration mismatches
    });

    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        console.log('TipTap Debug:', {
            ImageResizeDefined: !!ImageResize,
            ImageResizeType: typeof ImageResize,
            SchemaNodes: editor ? Object.keys(editor.schema.nodes) : 'editor-null'
        });
    }, [editor]);

    // Handle external updates to value prop (e.g. async data loading)
    useEffect(() => {
        if (!editor) return;

        const currentContent = editor.getHTML();

        // Skip if the content is already the same
        if (currentContent === value) {
            if (!isHydrated && value) {
                setIsHydrated(true);
            }
            return;
        }

        // If we haven't hydrated yet and value is provided, set it
        if (!isHydrated && value && value !== '<p></p>' && value !== '') {
            editor.commands.setContent(value);
            setIsHydrated(true);
        }
    }, [value, editor, isHydrated]);

    return (
        <div className={`border border-border-dark bg-background-dark/30 rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary/50 transition-all duration-200 ${className}`}>
            <MenuBar editor={editor} />
            <EditorContent editor={editor} className="rich-text-content" />
        </div>
    );
};

export default TipTapEditor;
