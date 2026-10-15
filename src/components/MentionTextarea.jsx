import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';

/**
 * Native textarea with a pointer-transparent text mirror. Native textareas
 * cannot color a substring, so we keep real editing/selection/IME in the
 * textarea and only paint @handles in the mirror (no contentEditable).
 */
const MentionTextarea = forwardRef(function MentionTextarea({ value = '', onScroll, ...props }, forwardedRef) {
  const inputRef = useRef(null);
  const mirrorRef = useRef(null);
  useImperativeHandle(forwardedRef, () => inputRef.current);
  const hasMention = /(^|[^\w])@[a-z0-9_]+/i.test(value);

  useLayoutEffect(() => {
    const input = inputRef.current;
    const mirror = mirrorRef.current;
    if (!input || !mirror) return undefined;
    const sync = () => {
      const style = window.getComputedStyle(input);
      for (const key of [
        'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight',
        'letterSpacing', 'textTransform', 'textIndent', 'textAlign',
        'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
        'borderTopWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderRightWidth',
        'tabSize'
      ]) mirror.style[key] = style[key];
      mirror.scrollTop = input.scrollTop;
      mirror.scrollLeft = input.scrollLeft;
    };
    sync();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sync) : null;
    observer?.observe(input);
    return () => observer?.disconnect();
  }, []);

  const parts = String(value).split(/(@[a-z0-9_]{1,20}\b)/gi);
  return (
    <div className={`chirpr-mention-editor${hasMention ? ' chirpr-mention-editor--active' : ''}`}>
      <textarea {...props} ref={inputRef} value={value} onScroll={event => {
        if (mirrorRef.current) {
          mirrorRef.current.scrollTop = event.currentTarget.scrollTop;
          mirrorRef.current.scrollLeft = event.currentTarget.scrollLeft;
        }
        onScroll?.(event);
      }} />
      <div ref={mirrorRef} className="chirpr-mention-editor__mirror" aria-hidden="true"
        style={{ visibility: hasMention ? 'visible' : 'hidden' }}>
        {parts.map((part, index) => part.startsWith('@') ?
          <span key={index} className="chirpr-editor-mention">{part}</span> :
          <span key={index}>{part}</span>)}
      </div>
    </div>
  );
});

export default MentionTextarea;
