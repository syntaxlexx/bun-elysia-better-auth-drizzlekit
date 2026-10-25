import { useEffect, useState } from "react"
import type { ComponentType } from "react"

type EditorProps = {
  initial: Array<Record<string, unknown>>
  editable?: boolean
  onChange?: (blocks: Array<Record<string, unknown>>) => void
}

export function PostEditor(props: EditorProps) {
  const [editor, setEditor] = useState<{
    Component: ComponentType<EditorProps>
  } | null>(null)

  useEffect(() => {
    let active = true
    void import("./post-editor-client").then((mod) => {
      if (active) {
        setEditor({ Component: mod.PostEditorClient })
      }
    })
    return () => {
      active = false
    }
  }, [])

  if (!editor) {
    return <div className="min-h-64 rounded-2xl bg-muted" />
  }

  const Editor = editor.Component
  return <Editor editable={props.editable ?? true} {...props} />
}
