'use client';

import { useEffect, useRef, useState } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

interface QuillEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    className?: string;
    readOnly?: boolean;
}

export default function QuillEditor({ value, onChange, placeholder, className, readOnly = false }: QuillEditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const quillRef = useRef<Quill | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [isInternalUpdate, setIsInternalUpdate] = useState(false);

    // Track the last value we emitted to avoid loops
    const lastEmittedValueRef = useRef<string>(value);

    // Initialize Quill
    useEffect(() => {
        if (!containerRef.current) return;

        // Check if Quill instance already exists on this node
        const existingQuill = Quill.find(containerRef.current);
        if (existingQuill && existingQuill instanceof Quill) {
            quillRef.current = existingQuill;
            return; // Already initialized
        }

        // Initialize new Quill instance
        const quill = new Quill(containerRef.current, {
            theme: 'snow',
            placeholder: placeholder || 'Write something...',
            readOnly: readOnly,
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline', 'strike'],
                    ['blockquote', 'code-block'],
                    [{ 'header': 1 }, { 'header': 2 }],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    [{ 'indent': '-1' }, { 'indent': '+1' }],
                    [{ 'direction': 'rtl' }],
                    [{ 'size': ['small', false, 'large', 'huge'] }],
                    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'font': [] }],
                    [{ 'align': [] }],
                    ['clean'],
                    ['link', 'image']
                ]
            }
        });

        // Override image handler → show inline tooltip instead of file picker
        const toolbar = quill.getModule('toolbar') as any;
        toolbar.addHandler('image', () => {
            const wrapper = wrapperRef.current;
            if (!wrapper) return;

            // Toggle off if already open
            const existing = wrapper.querySelector('.ql-image-url-bar');
            if (existing) {
                existing.remove();
                return;
            }

            // Build the tooltip — matches Quill's native ql-tooltip style
            const tooltip = document.createElement('div');
            tooltip.className = 'ql-image-url-bar';
            tooltip.innerHTML = `
                <span>Enter image url:</span>
                <input type="text" placeholder="https://example.com/image.png" />
                <a class="ql-action">Save</a>
            `;

            // Insert into the editor container (before the editor content)
            const qlContainer = wrapper.querySelector('.ql-container');
            if (qlContainer) {
                qlContainer.insertBefore(tooltip, qlContainer.firstChild);
            }

            const input = tooltip.querySelector('input') as HTMLInputElement;
            const saveBtn = tooltip.querySelector('.ql-action') as HTMLAnchorElement;

            const insertAndClose = () => {
                const url = input.value.trim();
                if (url) {
                    const range = quill.getSelection(true);
                    quill.insertEmbed(range.index, 'image', url, 'user');
                    quill.setSelection(range.index + 1, 0);
                }
                tooltip.remove();
            };

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    insertAndClose();
                } else if (e.key === 'Escape') {
                    tooltip.remove();
                    quill.focus();
                }
            });

            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                insertAndClose();
            });

            // Focus the input
            setTimeout(() => input.focus(), 50);
        });

        quillRef.current = quill;

        // Set initial content if provided
        if (value) {
            try {
                const delta = quill.clipboard.convert({ html: value });
                quill.setContents(delta, 'silent');
            } catch (e) {
                quill.root.innerHTML = value;
            }
        }

        // Handle changes
        quill.on('text-change', (delta, oldDelta, source) => {
            if (source === 'user') {
                const html = quill.root.innerHTML;
                const isEmpty = quill.getText().trim().length === 0 && !html.includes('<img');
                const finalHtml = isEmpty && !html.includes('<img') ? '' : html;
                lastEmittedValueRef.current = finalHtml;
                onChange(finalHtml);
            }
        });

        return () => {
            // Cleanup on unmount if needed
        };
    }, []); // Run once on mount

    // Handle external updates
    useEffect(() => {
        const quill = quillRef.current;
        if (!quill) return;

        if (value !== lastEmittedValueRef.current) {
            const currentHtml = quill.root.innerHTML;
            if (currentHtml === value) return;

            try {
                const delta = quill.clipboard.convert({ html: value });
                quill.setContents(delta, 'silent');
            } catch (e) {
                quill.root.innerHTML = value;
            }

            lastEmittedValueRef.current = value;
        }
    }, [value]);

    return (
        <div ref={wrapperRef} className={`quill-wrapper ${className || ''}`}>
            <div ref={containerRef} className="bg-transparent text-text-primary" />
        </div>
    );
}
