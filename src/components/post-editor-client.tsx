import type { PartialBlock } from "@blocknote/core"
import { BlockNoteView } from "@blocknote/mantine"
import { useCreateBlockNote } from "@blocknote/react"
import { useEffect, useRef } from "react"
import "@blocknote/mantine/style.css"

export function PostEditorClient({
  initial,
  editable = true,
  onChange,
}: {
  initial: Array<Record<string, unknown>>
  editable?: boolean
  onChange?: (blocks: Array<Record<string, unknown>>) => void
}) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const editor = useCreateBlockNote({
    initialContent:
      initial.length > 0 ? (initial as Array<PartialBlock>) : undefined,
  })

  useEffect(() => {
    onChangeRef.current?.(editor.document)
  }, [editor])

  return (
    <div className="overflow-hidden rounded-2xl border border-input bg-background">
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme="light"
        onChange={() => {
          onChangeRef.current?.(editor.document)
        }}
      />
    </div>
  )
}
