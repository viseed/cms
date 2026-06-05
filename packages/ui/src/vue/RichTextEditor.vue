<script setup lang="ts">
import { Color } from '@tiptap/extension-color'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { inject, onBeforeUnmount, ref, watch } from 'vue'

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

const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const showColorMenu = ref(false)

const editor = useEditor({
  content: props.modelValue || '',
  extensions: [
    StarterKit.configure({ link: false, underline: false }),
    Link.configure({ openOnClick: false }),
    Image,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Underline,
    TextStyle,
    Color,
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

const imagePicker = inject<(() => Promise<string | null>) | null>('imagePicker', null)

async function addImage() {
  if (!editor.value) return
  const url = imagePicker ? await imagePicker() : window.prompt('Image URL')
  if (!url) return
  editor.value.chain().focus().setImage({ src: url }).run()
}

function setColor(color: string) {
  if (!editor.value) return
  editor.value.chain().focus().setColor(color).run()
  showColorMenu.value = false
}

function unsetColor() {
  if (!editor.value) return
  editor.value.chain().focus().unsetColor().run()
  showColorMenu.value = false
}

function activeColor(): string {
  return editor.value?.getAttributes('textStyle').color ?? ''
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
      <button type="button" :class="{ active: editor.isActive({ textAlign: 'left' }) }" title="Align left" @click="editor.chain().focus().setTextAlign('left').run()">&#8676;</button>
      <button type="button" :class="{ active: editor.isActive({ textAlign: 'center' }) }" title="Align center" @click="editor.chain().focus().setTextAlign('center').run()">&#8596;</button>
      <button type="button" :class="{ active: editor.isActive({ textAlign: 'right' }) }" title="Align right" @click="editor.chain().focus().setTextAlign('right').run()">&#8677;</button>
      <button type="button" :class="{ active: editor.isActive({ textAlign: 'justify' }) }" title="Justify" @click="editor.chain().focus().setTextAlign('justify').run()">&#8644;</button>
      <span class="rte-divider" />
      <button type="button" :class="{ active: editor.isActive('bulletList') }" @click="editor.chain().focus().toggleBulletList().run()">• List</button>
      <button type="button" :class="{ active: editor.isActive('orderedList') }" @click="editor.chain().focus().toggleOrderedList().run()">1. List</button>
      <span class="rte-divider" />
      <button type="button" :class="{ active: editor.isActive('link') }" @click="setLink">Link</button>
      <button type="button" @click="addImage">Image</button>
      <span class="rte-divider" />
      <div class="rte-color-wrap">
        <button
          type="button"
          class="rte-color-btn"
          title="Text color"
          @click="showColorMenu = !showColorMenu"
        >
          <span class="rte-color-label" :style="{ borderBottomColor: activeColor() || 'transparent' }">A</span>
          <span class="rte-color-arrow">▾</span>
        </button>
        <div v-if="showColorMenu" class="rte-color-menu">
          <div class="rte-color-palette">
            <button
              v-for="color in COLOR_PALETTE"
              :key="color"
              type="button"
              class="rte-color-swatch"
              :style="{ backgroundColor: color }"
              :title="color"
              @click="setColor(color)"
            />
          </div>
          <button type="button" class="rte-color-reset" @click="unsetColor">Reset màu</button>
        </div>
      </div>
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

.rte-color-wrap {
  position: relative;
}

.rte-color-btn {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px 6px;
}

.rte-color-label {
  font-weight: 700;
  font-size: 0.85rem;
  border-bottom: 3px solid transparent;
  line-height: 1.2;
  padding-bottom: 1px;
}

.rte-color-arrow {
  font-size: 0.6rem;
  line-height: 1;
  opacity: 0.7;
}

.rte-color-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 100;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px;
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.12);
  min-width: 130px;
}

.rte-color-palette {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 6px;
}

.rte-color-swatch {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid rgb(0 0 0 / 0.15);
  padding: 0;
  cursor: pointer;
}

.rte-color-swatch:hover {
  transform: scale(1.2);
  border-color: rgb(0 0 0 / 0.4);
}

.rte-color-reset {
  width: 100%;
  padding: 3px 6px;
  font-size: 0.75rem;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  cursor: pointer;
  color: #374151;
  text-align: center;
}

.rte-color-reset:hover {
  background: #e5e7eb;
}
</style>
