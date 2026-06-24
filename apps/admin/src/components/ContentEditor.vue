<script setup lang="ts">
import CharacterCount from '@tiptap/extension-character-count'
import { Color } from '@tiptap/extension-color'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableRow } from '@tiptap/extension-table-row'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { onBeforeUnmount, ref, watch } from 'vue'
import { useMediaPicker } from '../composables/useMediaPicker'
import WidgetInsertModal from './editor/WidgetInsertModal.vue'
import { WidgetEmbedExtension } from './editor/widget-embed-extension'

const COLOR_PALETTE = [
  '#000000',
  '#374151',
  '#6b7280',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#ffffff',
]

const showColorMenu = ref(false)

const props = defineProps<{
  modelValue: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function parseContent(value: string | null) {
  if (!value) return undefined
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

const editor = useEditor({
  content: parseContent(props.modelValue),
  extensions: [
    StarterKit.configure({ link: false, underline: false }),
    Link.configure({ openOnClick: false }),
    Image,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Underline,
    CharacterCount,
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    TextStyle,
    Color,
    WidgetEmbedExtension,
  ],
  onUpdate({ editor: e }) {
    emit('update:modelValue', JSON.stringify(e.getJSON()))
  },
})

watch(
  () => props.modelValue,
  (val) => {
    if (!editor.value) return
    const currentJson = JSON.stringify(editor.value.getJSON())
    if (val !== currentJson) {
      editor.value.commands.setContent(parseContent(val) ?? '', false)
    }
  },
)

onBeforeUnmount(() => {
  editor.value?.destroy()
})

function setLink() {
  if (!editor.value) return
  const prev = editor.value.getAttributes('link').href
  const url = window.prompt('URL', prev ?? 'https://')
  if (url === null) return
  if (url === '') {
    editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

const { openMediaPicker } = useMediaPicker()

async function addImage() {
  if (!editor.value) return
  const url = await openMediaPicker()
  if (!url) return
  editor.value.chain().focus().setImage({ src: url }).run()
}

function insertTable() {
  if (!editor.value) return
  editor.value.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
}

function setTextColor(color: string) {
  if (!editor.value) return
  editor.value.chain().focus().setColor(color).run()
  showColorMenu.value = false
}

function unsetTextColor() {
  if (!editor.value) return
  editor.value.chain().focus().unsetColor().run()
  showColorMenu.value = false
}

function onPickerInput(event: Event) {
  const target = event.target as HTMLInputElement
  if (target?.value) setTextColor(target.value)
}

const showWidgetModal = ref(false)

function insertWidget(widgetId: string, widgetType: string) {
  if (!editor.value) return
  editor.value
    .chain()
    .focus()
    .insertContent({
      type: 'widgetEmbed',
      attrs: { widgetId, widgetType },
    })
    .run()
  showWidgetModal.value = false
}
</script>

<template>
  <div v-if="editor" class="content-editor">
    <div class="toolbar">
      <div class="toolbar-group">
        <button
          type="button"
          title="Bold"
          :class="{ active: editor.isActive('bold') }"
          @click="editor.chain().focus().toggleBold().run()"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          title="Italic"
          :class="{ active: editor.isActive('italic') }"
          @click="editor.chain().focus().toggleItalic().run()"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          title="Underline"
          :class="{ active: editor.isActive('underline') }"
          @click="editor.chain().focus().toggleUnderline().run()"
        >
          <u>U</u>
        </button>
        <button
          type="button"
          title="Strikethrough"
          :class="{ active: editor.isActive('strike') }"
          @click="editor.chain().focus().toggleStrike().run()"
        >
          <s>S</s>
        </button>
      </div>

      <span class="toolbar-divider" />

      <div class="toolbar-group">
        <button
          type="button"
          title="Heading 1"
          :class="{ active: editor.isActive('heading', { level: 1 }) }"
          @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
        >
          H1
        </button>
        <button
          type="button"
          title="Heading 2"
          :class="{ active: editor.isActive('heading', { level: 2 }) }"
          @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
        >
          H2
        </button>
        <button
          type="button"
          title="Heading 3"
          :class="{ active: editor.isActive('heading', { level: 3 }) }"
          @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
        >
          H3
        </button>
      </div>

      <span class="toolbar-divider" />

      <div class="toolbar-group">
        <button
          type="button"
          title="Bullet list"
          :class="{ active: editor.isActive('bulletList') }"
          @click="editor.chain().focus().toggleBulletList().run()"
        >
          •&thinsp;List
        </button>
        <button
          type="button"
          title="Ordered list"
          :class="{ active: editor.isActive('orderedList') }"
          @click="editor.chain().focus().toggleOrderedList().run()"
        >
          1.&thinsp;List
        </button>
        <button
          type="button"
          title="Blockquote"
          :class="{ active: editor.isActive('blockquote') }"
          @click="editor.chain().focus().toggleBlockquote().run()"
        >
          Quote
        </button>
        <button
          type="button"
          title="Code block"
          :class="{ active: editor.isActive('codeBlock') }"
          @click="editor.chain().focus().toggleCodeBlock().run()"
        >
          Code
        </button>
      </div>

      <span class="toolbar-divider" />

      <div class="toolbar-group">
        <button
          type="button"
          title="Align left"
          :class="{ active: editor.isActive({ textAlign: 'left' }) }"
          @click="editor.chain().focus().setTextAlign('left').run()"
        >
          Left
        </button>
        <button
          type="button"
          title="Align center"
          :class="{ active: editor.isActive({ textAlign: 'center' }) }"
          @click="editor.chain().focus().setTextAlign('center').run()"
        >
          Center
        </button>
        <button
          type="button"
          title="Align right"
          :class="{ active: editor.isActive({ textAlign: 'right' }) }"
          @click="editor.chain().focus().setTextAlign('right').run()"
        >
          Right
        </button>
      </div>

      <span class="toolbar-divider" />

      <div class="toolbar-group">
        <button
          type="button"
          title="Insert link"
          :class="{ active: editor.isActive('link') }"
          @click="setLink"
        >
          Link
        </button>
        <button type="button" title="Insert image" @click="addImage">
          Image
        </button>
      </div>

      <span class="toolbar-divider" />

      <div class="toolbar-group color-group">
        <div class="color-picker-wrap">
          <button
            type="button"
            title="Text color"
            class="color-trigger"
            @click="showColorMenu = !showColorMenu"
          >
            <span
              class="color-swatch"
              :style="{ background: editor.getAttributes('textStyle').color || '#1e293b' }"
            />
            A
            <span class="caret">▾</span>
          </button>
          <div v-if="showColorMenu" class="color-menu" @click.stop>
            <div class="color-palette">
              <button
                v-for="c in COLOR_PALETTE"
                :key="c"
                type="button"
                class="color-cell"
                :title="c"
                :style="{ background: c }"
                @click="setTextColor(c)"
              />
            </div>
            <div class="color-actions">
              <label class="color-custom">
                <span>Custom</span>
                <input
                  type="color"
                  :value="editor.getAttributes('textStyle').color || '#000000'"
                  @input="onPickerInput"
                >
              </label>
              <button type="button" class="color-reset" @click="unsetTextColor">
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <span class="toolbar-divider" />

      <div class="toolbar-group">
        <button
          type="button"
          title="Insert table"
          @click="insertTable"
        >
          ⊞ Table
        </button>
        <button
          type="button"
          title="Add column before"
          :disabled="!editor.can().addColumnBefore()"
          @click="editor.chain().focus().addColumnBefore().run()"
        >
          +Col◀
        </button>
        <button
          type="button"
          title="Add column after"
          :disabled="!editor.can().addColumnAfter()"
          @click="editor.chain().focus().addColumnAfter().run()"
        >
          +Col▶
        </button>
        <button
          type="button"
          title="Delete column"
          :disabled="!editor.can().deleteColumn()"
          @click="editor.chain().focus().deleteColumn().run()"
        >
          −Col
        </button>
        <button
          type="button"
          title="Add row before"
          :disabled="!editor.can().addRowBefore()"
          @click="editor.chain().focus().addRowBefore().run()"
        >
          +Row▲
        </button>
        <button
          type="button"
          title="Add row after"
          :disabled="!editor.can().addRowAfter()"
          @click="editor.chain().focus().addRowAfter().run()"
        >
          +Row▼
        </button>
        <button
          type="button"
          title="Delete row"
          :disabled="!editor.can().deleteRow()"
          @click="editor.chain().focus().deleteRow().run()"
        >
          −Row
        </button>
        <button
          type="button"
          title="Toggle header row"
          :disabled="!editor.can().toggleHeaderRow()"
          @click="editor.chain().focus().toggleHeaderRow().run()"
        >
          Header
        </button>
        <button
          type="button"
          title="Delete table"
          :disabled="!editor.can().deleteTable()"
          @click="editor.chain().focus().deleteTable().run()"
        >
          Del Table
        </button>
      </div>

      <span class="toolbar-divider" />

      <div class="toolbar-group">
        <button
          type="button"
          title="Horizontal rule"
          @click="editor.chain().focus().setHorizontalRule().run()"
        >
          ―
        </button>
        <button
          type="button"
          title="Undo"
          :disabled="!editor.can().undo()"
          @click="editor.chain().focus().undo().run()"
        >
          Undo
        </button>
        <button
          type="button"
          title="Redo"
          :disabled="!editor.can().redo()"
          @click="editor.chain().focus().redo().run()"
        >
          Redo
        </button>
      </div>

      <span class="toolbar-divider" />

      <div class="toolbar-group">
        <button
          type="button"
          title="Insert Widget"
          class="toolbar-widget-btn"
          @click="showWidgetModal = true"
        >
          ❖ Widget
        </button>
      </div>
    </div>

    <WidgetInsertModal
      v-if="showWidgetModal"
      @select="insertWidget"
      @close="showWidgetModal = false"
    />

    <EditorContent :editor="editor" class="editor-body" />

    <div class="editor-footer">
      {{ editor.storage.characterCount.characters() }} characters
      · {{ editor.storage.characterCount.words() }} words
    </div>
  </div>
</template>

<style scoped>
.content-editor {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 6px 8px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 8px 8px 0 0;
}

.toolbar-group {
  display: flex;
  gap: 2px;
}

.toolbar-divider {
  width: 1px;
  align-self: stretch;
  background: #e2e8f0;
  margin: 0 4px;
}

.toolbar button {
  padding: 4px 8px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  color: #475569;
  line-height: 1.4;
  white-space: nowrap;
}

.toolbar button:hover {
  background: #e2e8f0;
}

.toolbar button.active {
  background: #1a56db;
  color: #fff;
}

.toolbar button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.editor-body {
  min-height: 300px;
  max-height: 600px;
  overflow-y: auto;
}

.editor-body :deep(.tiptap) {
  padding: 16px;
  outline: none;
  min-height: 300px;
  font-size: 1rem;
  line-height: 1.7;
  color: #1e293b;
}

.editor-body :deep(.tiptap > * + *) {
  margin-top: 0.75em;
}

.editor-body :deep(h1) { font-size: 2rem; font-weight: 700; }
.editor-body :deep(h2) { font-size: 1.5rem; font-weight: 600; }
.editor-body :deep(h3) { font-size: 1.25rem; font-weight: 600; }

.editor-body :deep(ul),
.editor-body :deep(ol) {
  padding-left: 1.5rem;
}

.editor-body :deep(blockquote) {
  border-left: 3px solid #e2e8f0;
  padding-left: 1rem;
  color: #64748b;
  font-style: italic;
}

.editor-body :deep(pre) {
  background: #1e293b;
  color: #e2e8f0;
  padding: 12px 16px;
  border-radius: 6px;
  overflow-x: auto;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.9rem;
}

.editor-body :deep(code) {
  background: #f1f5f9;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 0.9em;
}

.editor-body :deep(pre code) {
  background: none;
  padding: 0;
}

.editor-body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
}

.editor-body :deep(a) {
  color: #1a56db;
  text-decoration: underline;
}

.editor-body :deep(hr) {
  border: none;
  border-top: 2px solid #e2e8f0;
  margin: 1.5rem 0;
}

.editor-body :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1rem 0;
  table-layout: fixed;
  overflow: hidden;
}

.editor-body :deep(table td),
.editor-body :deep(table th) {
  border: 1px solid #cbd5e1;
  padding: 8px 12px;
  vertical-align: top;
  position: relative;
}

.editor-body :deep(table th) {
  background: #f1f5f9;
  font-weight: 600;
  text-align: left;
}

.editor-body :deep(table .selectedCell::after) {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(26, 86, 219, 0.12);
  pointer-events: none;
}

.editor-body :deep(table .column-resize-handle) {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: 0;
  width: 4px;
  background: #1a56db;
  pointer-events: none;
}

.color-picker-wrap {
  position: relative;
}

.color-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
}

.color-swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 3px;
  border: 1px solid #cbd5e1;
}

.color-trigger .caret {
  font-size: 0.6rem;
  color: #94a3b8;
}

.color-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 20;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  min-width: 200px;
}

.color-palette {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.color-cell {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  cursor: pointer;
}

.color-cell:hover {
  transform: scale(1.1);
}

.color-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e2e8f0;
  gap: 8px;
}

.color-custom {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: #475569;
  cursor: pointer;
}

.color-custom input[type='color'] {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
}

.color-reset {
  font-size: 0.75rem;
  color: #ef4444 !important;
}

.editor-footer {
  padding: 6px 12px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 0.75rem;
  color: #94a3b8;
  text-align: right;
}

.toolbar-widget-btn {
  color: #6366f1;
  font-weight: 500;
}
.toolbar-widget-btn:hover {
  background: #eff6ff;
  color: #4f46e5;
}
</style>
