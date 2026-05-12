<script setup lang="ts">
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { onBeforeUnmount, watch } from 'vue'

const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editor = useEditor({
  content: props.modelValue || '',
  extensions: [
    StarterKit.configure({ link: false, underline: false }),
    Link.configure({ openOnClick: false }),
    Image,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Underline,
  ],
  onUpdate({ editor: e }) {
    emit('update:modelValue', e.getHTML())
  },
})

watch(
  () => props.modelValue,
  (val) => {
    if (!editor.value) return
    if (val !== editor.value.getHTML()) {
      editor.value.commands.setContent(val || '', false)
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

function addImage() {
  if (!editor.value) return
  const url = window.prompt('Image URL')
  if (!url) return
  editor.value.chain().focus().setImage({ src: url }).run()
}
</script>

<template>
  <div class="rte-wrap">
    <div v-if="editor" class="rte-toolbar">
      <button type="button" :class="{ active: editor.isActive('bold') }" title="Bold" @click="editor.chain().focus().toggleBold().run()">
        <strong>B</strong>
      </button>
      <button type="button" :class="{ active: editor.isActive('italic') }" title="Italic" @click="editor.chain().focus().toggleItalic().run()">
        <em>I</em>
      </button>
      <button type="button" :class="{ active: editor.isActive('underline') }" title="Underline" @click="editor.chain().focus().toggleUnderline().run()">
        <u>U</u>
      </button>
      <span class="rte-divider" />
      <button type="button" :class="{ active: editor.isActive('heading', { level: 2 }) }" @click="editor.chain().focus().toggleHeading({ level: 2 }).run()">H2</button>
      <button type="button" :class="{ active: editor.isActive('heading', { level: 3 }) }" @click="editor.chain().focus().toggleHeading({ level: 3 }).run()">H3</button>
      <span class="rte-divider" />
      <button type="button" :class="{ active: editor.isActive('bulletList') }" @click="editor.chain().focus().toggleBulletList().run()">• List</button>
      <button type="button" :class="{ active: editor.isActive('orderedList') }" @click="editor.chain().focus().toggleOrderedList().run()">1. List</button>
      <span class="rte-divider" />
      <button type="button" :class="{ active: editor.isActive('link') }" @click="setLink">Link</button>
      <button type="button" @click="addImage">Image</button>
    </div>
    <EditorContent :editor="editor" class="rte-body" :data-placeholder="placeholder" />
  </div>
</template>

<style scoped>
.rte-wrap {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
  font-size: 0.875rem;
}

.rte-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 4px 6px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.rte-toolbar button {
  padding: 3px 7px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  color: #374151;
  line-height: 1.4;
}

.rte-toolbar button:hover { background: #e5e7eb; }
.rte-toolbar button.active { background: #1a56db; color: #fff; }

.rte-divider {
  width: 1px;
  align-self: stretch;
  background: #e5e7eb;
  margin: 0 3px;
}

.rte-body {
  min-height: 120px;
  max-height: 340px;
  overflow-y: auto;
}

.rte-body :deep(.tiptap) {
  padding: 10px 12px;
  outline: none;
  min-height: 120px;
  line-height: 1.6;
  color: #1e293b;
}

.rte-body :deep(.tiptap > * + *) { margin-top: 0.5em; }
.rte-body :deep(h2) { font-size: 1.25rem; font-weight: 600; }
.rte-body :deep(h3) { font-size: 1.1rem; font-weight: 600; }
.rte-body :deep(ul), .rte-body :deep(ol) { padding-left: 1.25rem; }
.rte-body :deep(a) { color: #1a56db; text-decoration: underline; }
.rte-body :deep(img) { max-width: 100%; height: auto; border-radius: 4px; }
.rte-body :deep(p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  color: #9ca3af;
  pointer-events: none;
  height: 0;
  float: left;
}
</style>
