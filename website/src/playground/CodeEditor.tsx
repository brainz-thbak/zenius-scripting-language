import { type RefObject, useRef } from 'react'

interface CodeEditorProps {
  id: string
  label: string
  language: 'ZSL' | 'JSON'
  value: string
  inputRef?: RefObject<HTMLTextAreaElement | null>
  onChange: (value: string) => void
}

export function CodeEditor({
  id,
  label,
  language,
  value,
  inputRef,
  onChange,
}: CodeEditorProps) {
  const gutter = useRef<HTMLDivElement>(null)
  const lineCount = value.split('\n').length

  return (
    <section className="zsl-panel" aria-labelledby={`${id}-label`}>
      <div className="zsl-panel-heading">
        <label id={`${id}-label`} htmlFor={id}>
          {label}
        </label>
        <span className="zsl-language-tag">{language}</span>
      </div>
      <div className={`zsl-editor zsl-editor--${language.toLowerCase()}`}>
        <div className="zsl-editor-gutter" ref={gutter} aria-hidden="true">
          {Array.from({ length: lineCount }, (_, index) => index + 1).map(
            (line) => (
              <div key={line}>{line}</div>
            ),
          )}
        </div>
        <textarea
          id={id}
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          onScroll={(event) => {
            if (gutter.current)
              gutter.current.scrollTop = event.currentTarget.scrollTop
          }}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          wrap="off"
          placeholder={language === 'JSON' ? '{}' : '템플릿을 입력하세요'}
        />
      </div>
    </section>
  )
}
