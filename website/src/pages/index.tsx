import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import {
  BookOpen,
  Braces,
  Check,
  ChevronDown,
  Clipboard,
  ListTree,
  TriangleAlert,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { CodeEditor } from '../playground/CodeEditor'
import { evaluate, formatAst, parseContext } from '../playground/evaluate'
import {
  type PlaygroundInput,
  quickReference,
  samples,
} from '../playground/samples'

type ResultView = 'output' | 'ast'
type CopyState = { text: string; status: 'copied' | 'unavailable' }

export default function PlaygroundPage() {
  const { siteConfig } = useDocusaurusContext()
  const version = siteConfig.customFields?.zslVersion
  const [input, setInput] = useState(samples[0].input)
  const [view, setView] = useState<ResultView>('output')
  const [copyState, setCopyState] = useState<CopyState | null>(null)
  const templateInput = useRef<HTMLTextAreaElement>(null)
  const context = useMemo(() => parseContext(input.context), [input.context])
  const result = useMemo(
    () => evaluate(input.source, context),
    [input.source, context],
  )
  const resultText = useMemo(() => {
    if (result.kind === 'error') return null
    return view === 'ast' ? formatAst(result.expression) : result.output
  }, [result, view])
  const copyStatus = copyState?.text === resultText ? copyState.status : null

  function selectSample(sampleInput: PlaygroundInput) {
    editInput(sampleInput)
    setView('output')
  }

  function editInput(nextInput: PlaygroundInput) {
    setInput(nextInput)
    setCopyState(null)
  }

  function selectIssue(start: number, end: number) {
    const editor = templateInput.current
    editor?.focus()
    editor?.setSelectionRange(start, end)
  }

  function selectResultView(nextView: ResultView) {
    setView(nextView)
    setCopyState(null)
  }

  async function copyResult() {
    if (!resultText) return

    try {
      await navigator.clipboard.writeText(resultText)
      setCopyState({ text: resultText, status: 'copied' })
    } catch {
      setCopyState({ text: resultText, status: 'unavailable' })
    }
  }

  return (
    <Layout
      title="플레이그라운드"
      description="ZSL 템플릿을 브라우저에서 평가하고 결과와 진단을 확인하세요."
    >
      <main className="zsl-playground">
        <header className="zsl-intro">
          <div>
            <h1>
              Playground<span>.</span>
            </h1>
            <p>ZSL 템플릿을 편집하고 결과를 실시간으로 확인하세요.</p>
          </div>
          {typeof version === 'string' && (
            <span className="zsl-version">v{version}</span>
          )}
        </header>

        <div className="zsl-workspace">
          <div className="zsl-workspace-main">
            <CodeEditor
              id="zsl-template"
              label="템플릿"
              language="ZSL"
              value={input.source}
              inputRef={templateInput}
              onChange={(source) => editInput({ ...input, source })}
            />
            <CodeEditor
              id="zsl-context"
              label="컨텍스트"
              language="JSON"
              value={input.context}
              onChange={(nextContext) =>
                editInput({ ...input, context: nextContext })
              }
            />
            <section
              className="zsl-panel zsl-result"
              aria-labelledby="zsl-result-heading"
            >
              <div className="zsl-panel-heading">
                <div className="zsl-result-heading">
                  <h2 id="zsl-result-heading">실행 결과</h2>
                  {result.kind === 'success' ? (
                    <span className="zsl-state zsl-state--success">
                      <Check size={13} aria-hidden="true" />
                      성공
                    </span>
                  ) : (
                    <span className="zsl-state zsl-state--error">
                      <TriangleAlert size={13} aria-hidden="true" />
                      오류
                    </span>
                  )}
                </div>
                <div className="zsl-panel-tools">
                  <fieldset
                    className="zsl-view-switch"
                    aria-label="실행 결과 보기"
                  >
                    <button
                      type="button"
                      aria-pressed={view === 'output'}
                      onClick={() => selectResultView('output')}
                    >
                      출력
                    </button>
                    <button
                      type="button"
                      aria-pressed={view === 'ast'}
                      onClick={() => selectResultView('ast')}
                    >
                      AST
                    </button>
                  </fieldset>
                  <button
                    className="zsl-action zsl-copy"
                    type="button"
                    aria-label={
                      copyStatus === 'copied' ? '복사됨' : '결과 복사'
                    }
                    title={copyStatus === 'copied' ? '복사됨' : '결과 복사'}
                    disabled={!resultText}
                    onClick={() => void copyResult()}
                  >
                    {copyStatus === 'copied' ? (
                      <Check size={15} aria-hidden="true" />
                    ) : (
                      <Clipboard size={15} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
              <div className="zsl-result-body" aria-live="polite">
                {result.kind === 'success' ? (
                  <pre
                    className={
                      view === 'ast' ? 'zsl-ast-output' : 'zsl-template-output'
                    }
                  >
                    {resultText === null
                      ? 'AST를 JSON으로 표시할 수 없습니다.'
                      : resultText || '출력이 비어 있습니다.'}
                  </pre>
                ) : (
                  <div className="zsl-diagnostics">
                    <code>{result.code}</code>
                    {result.issues.length ? (
                      <ul>
                        {result.issues.map(({ message, span }) => (
                          <li key={`${span.start}:${span.end}:${message}`}>
                            <button
                              className="zsl-issue"
                              type="button"
                              onClick={() => selectIssue(span.start, span.end)}
                            >
                              <span>{message}</span>
                              <code>
                                [{span.start}, {span.end})
                              </code>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>{result.message}</p>
                    )}
                  </div>
                )}
                {copyStatus === 'unavailable' && (
                  <p className="zsl-copy-message">
                    클립보드에 복사할 수 없습니다.
                  </p>
                )}
              </div>
            </section>
          </div>

          <aside className="zsl-sidebar" aria-label="예제와 문법 참조">
            <section
              className="zsl-panel"
              aria-labelledby="zsl-samples-heading"
            >
              <div className="zsl-panel-heading zsl-sidebar-heading">
                <ListTree size={16} aria-hidden="true" />
                <h2 id="zsl-samples-heading">예제</h2>
              </div>
              <ul className="zsl-samples">
                {samples.map(
                  ({ id, name, description, input: sampleInput }) => (
                    <li key={id}>
                      <button
                        type="button"
                        className="zsl-sample"
                        aria-pressed={input === sampleInput}
                        onClick={() => selectSample(sampleInput)}
                      >
                        <span>{name}</span>
                        <small>{description}</small>
                      </button>
                    </li>
                  ),
                )}
              </ul>
            </section>
            <section
              className="zsl-panel"
              aria-labelledby="zsl-reference-heading"
            >
              <div className="zsl-panel-heading zsl-sidebar-heading">
                <Braces size={16} aria-hidden="true" />
                <h2 id="zsl-reference-heading">문법 빠른 참조</h2>
              </div>
              <div className="zsl-reference">
                {quickReference.map(
                  ({ notation, name, description, example }) => (
                    <details key={notation}>
                      <summary>
                        <code>{notation}</code>
                        <span>{name}</span>
                        <ChevronDown size={15} aria-hidden="true" />
                      </summary>
                      <div>
                        <p>{description}</p>
                        <code>{example}</code>
                      </div>
                    </details>
                  ),
                )}
              </div>
              <Link className="zsl-reference-link" to="/docs/language">
                <BookOpen size={15} aria-hidden="true" />
                언어 명세
              </Link>
            </section>
          </aside>
        </div>
      </main>
    </Layout>
  )
}
