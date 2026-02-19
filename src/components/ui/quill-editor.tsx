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
                    ['link', 'image'] // Removed video
                ]
            }
        });

        quillRef.current = quill;

        // Set initial content if provided
        if (value) {
            try {
                // Try to convert HTML to Delta to preserve structure
                const delta = quill.clipboard.convert({ html: value });
                quill.setContents(delta, 'silent');
            } catch (e) {
                // Fallback: direct innerHTML manipulation
                quill.root.innerHTML = value;
            }
        }

        // Handle changes
        quill.on('text-change', (delta, oldDelta, source) => {
            // Only emit if change is from user
            if (source === 'user') {
                const html = quill.root.innerHTML;

                // Normalization: treat empty editor as empty string
                // Quill often leaves <p><br></p> for empty content
                const isEmpty = quill.getText().trim().length === 0 && !html.includes('<img');

                const finalHtml = isEmpty && !html.includes('<img') ? '' : html;

                lastEmittedValueRef.current = finalHtml;
                onChange(finalHtml);
            }
        });

        return () => {
            // Cleanup on unmount if needed
            // We don't necessarily want to destroy it if we are just re-rendering, 
            // but reacting requires cleanup. 
            // However, strictly following the prompt "Single Quill instance per mount", 
            // we should check existing instance.
        };
    }, []); // Run once on mount

    // Handle external updates
    useEffect(() => {
        const quill = quillRef.current;
        if (!quill) return;

        // If the value has changed externally and it's not what we just emitted
        if (value !== lastEmittedValueRef.current) {

            // Basic comparison to avoid loop if normalization differs slightly
            // But we should be careful.

            // Use a flag to prevent the text-change handler from firing onChange
            // properly handled by 'silent' source in setContents, but strictly speaking 
            // text-change is emitted with source 'api' which we filter out above.

            const currentHtml = quill.root.innerHTML;
            if (currentHtml === value) return; // No change needed

            try {
                const delta = quill.clipboard.convert({ html: value });
                quill.setContents(delta, 'silent');
            } catch (e) {
                quill.root.innerHTML = value;
            }

            // Update reference so we don't think we need to emit this back
            lastEmittedValueRef.current = value;
        }
    }, [value]);

    return (
        <div className={`quill-wrapper ${className || ''}`}>
            <div ref={containerRef} className="bg-transparent text-text-primary" />
        </div>
    );
}
