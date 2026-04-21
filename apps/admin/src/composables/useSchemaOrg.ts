import { ref, shallowRef } from 'vue'

export interface SchemaTermSummary {
  iri: string
  label: string
  description: string
}

export interface SchemaPropertyInfo extends SchemaTermSummary {
  ranges: string[]
}

export interface SchemaClassInfo extends SchemaTermSummary {
  isEnumeration: boolean
}

interface SDOAdapterLike {
  getAllClasses: () => Array<{ getIRI: (t?: 'Compact') => string }>
  getAllEnumerations: () => Array<{ getIRI: (t?: 'Compact') => string }>
  getClass: (iri: string) => {
    getIRI: (t?: 'Compact') => string
    getName: () => string | null
    getDescription: () => string | null
    getProperties: (params?: { implicit?: boolean }) => string[]
  }
  getEnumeration: (iri: string) => {
    getIRI: (t?: 'Compact') => string
    getName: () => string | null
    getDescription: () => string | null
    getProperties: (params?: { implicit?: boolean }) => string[]
    getEnumerationMembers: (params?: { implicit?: boolean }) => string[]
  }
  getProperty: (iri: string) => {
    getIRI: (t?: 'Compact') => string
    getName: () => string | null
    getDescription: () => string | null
    getRanges: (params?: { implicit?: boolean }) => string[]
  }
  getEnumerationMember: (iri: string) => {
    getIRI: (t?: 'Compact') => string
    getName: () => string | null
    getDescription: () => string | null
  }
  getTerm: (iri: string) => {
    getTermTypeLabel: () => string
  }
}

let adapterPromise: Promise<SDOAdapterLike> | null = null
const adapterRef = shallowRef<SDOAdapterLike | null>(null)
const isLoading = ref(false)
const loadError = ref<string | null>(null)

const classesCache = shallowRef<SchemaClassInfo[] | null>(null)
const propertiesByClass = new Map<string, SchemaPropertyInfo[]>()
const propertyDetailCache = new Map<string, SchemaPropertyInfo>()
const enumMembersCache = new Map<string, SchemaTermSummary[]>()

const PRIMITIVE_DATATYPES = new Set([
  'schema:Text',
  'schema:URL',
  'schema:Number',
  'schema:Integer',
  'schema:Float',
  'schema:Boolean',
  'schema:Date',
  'schema:DateTime',
  'schema:Time',
  'schema:CssSelectorType',
  'schema:PronounceableText',
  'schema:XPathType',
])

async function loadAdapter(): Promise<SDOAdapterLike> {
  if (adapterRef.value) return adapterRef.value
  if (adapterPromise) return adapterPromise

  isLoading.value = true
  loadError.value = null

  adapterPromise = (async () => {
    try {
      const mod = await import('schema-org-adapter')
      const sdoAdapter = (await mod.SOA.create({
        schemaVersion: 'latest',
      })) as unknown as SDOAdapterLike
      adapterRef.value = sdoAdapter
      return sdoAdapter
    } catch (err) {
      loadError.value = err instanceof Error ? err.message : 'Failed to load schema-org-adapter'
      adapterPromise = null
      throw err
    } finally {
      isLoading.value = false
    }
  })()

  return adapterPromise
}

function safeGetTermSummary(
  term: { getIRI: (t?: 'Compact') => string; getName: () => string | null; getDescription: () => string | null },
): SchemaTermSummary {
  return {
    iri: term.getIRI('Compact'),
    label: term.getName() ?? term.getIRI('Compact'),
    description: term.getDescription() ?? '',
  }
}

async function getAllClasses(): Promise<SchemaClassInfo[]> {
  if (classesCache.value) return classesCache.value
  const adapter = await loadAdapter()

  const classIRIs = adapter.getAllClasses().map((c) => c.getIRI('Compact'))
  const enumIRIs = new Set(adapter.getAllEnumerations().map((e) => e.getIRI('Compact')))

  const result: SchemaClassInfo[] = []
  for (const iri of classIRIs) {
    try {
      const isEnum = enumIRIs.has(iri)
      const term = isEnum ? adapter.getEnumeration(iri) : adapter.getClass(iri)
      const summary = safeGetTermSummary(term)
      result.push({ ...summary, isEnumeration: isEnum })
    } catch {
      // skip terms that fail
    }
  }
  result.sort((a, b) => a.label.localeCompare(b.label))
  classesCache.value = result
  return result
}

async function getPropertiesForClass(classIri: string): Promise<SchemaPropertyInfo[]> {
  const cached = propertiesByClass.get(classIri)
  if (cached) return cached

  const adapter = await loadAdapter()
  let propertyIRIs: string[] = []

  try {
    const isEnum = adapter.getTerm(classIri).getTermTypeLabel() === 'Enumeration'
    const term = isEnum ? adapter.getEnumeration(classIri) : adapter.getClass(classIri)
    propertyIRIs = term.getProperties({ implicit: true })
  } catch {
    propertyIRIs = []
  }

  const props: SchemaPropertyInfo[] = []
  for (const iri of propertyIRIs) {
    const detail = await getPropertyDetail(iri)
    if (detail) props.push(detail)
  }
  props.sort((a, b) => a.label.localeCompare(b.label))
  propertiesByClass.set(classIri, props)
  return props
}

async function getPropertyDetail(propertyIri: string): Promise<SchemaPropertyInfo | null> {
  const cached = propertyDetailCache.get(propertyIri)
  if (cached) return cached

  const adapter = await loadAdapter()
  try {
    const prop = adapter.getProperty(propertyIri)
    const summary = safeGetTermSummary(prop)
    const ranges = prop.getRanges({ implicit: false })
    const info: SchemaPropertyInfo = { ...summary, ranges }
    propertyDetailCache.set(propertyIri, info)
    return info
  } catch {
    return null
  }
}

async function getEnumerationMembers(enumIri: string): Promise<SchemaTermSummary[]> {
  const cached = enumMembersCache.get(enumIri)
  if (cached) return cached

  const adapter = await loadAdapter()
  try {
    const enumeration = adapter.getEnumeration(enumIri)
    const memberIRIs = enumeration.getEnumerationMembers({ implicit: true })
    const members: SchemaTermSummary[] = []
    for (const iri of memberIRIs) {
      try {
        members.push(safeGetTermSummary(adapter.getEnumerationMember(iri)))
      } catch {
        // skip
      }
    }
    members.sort((a, b) => a.label.localeCompare(b.label))
    enumMembersCache.set(enumIri, members)
    return members
  } catch {
    return []
  }
}

function classifyRange(rangeIri: string): 'text' | 'url' | 'number' | 'integer' | 'boolean' | 'date' | 'datetime' | 'time' | 'enum' | 'class' {
  switch (rangeIri) {
    case 'schema:Text':
    case 'schema:CssSelectorType':
    case 'schema:PronounceableText':
    case 'schema:XPathType':
      return 'text'
    case 'schema:URL':
      return 'url'
    case 'schema:Integer':
      return 'integer'
    case 'schema:Number':
    case 'schema:Float':
      return 'number'
    case 'schema:Boolean':
      return 'boolean'
    case 'schema:Date':
      return 'date'
    case 'schema:DateTime':
      return 'datetime'
    case 'schema:Time':
      return 'time'
    default:
      return 'class'
  }
}

async function isEnumerationClass(iri: string): Promise<boolean> {
  if (PRIMITIVE_DATATYPES.has(iri)) return false
  const adapter = await loadAdapter()
  try {
    return adapter.getTerm(iri).getTermTypeLabel() === 'Enumeration'
  } catch {
    return false
  }
}

export function useSchemaOrg() {
  return {
    isLoading,
    loadError,
    adapter: adapterRef,
    loadAdapter,
    getAllClasses,
    getPropertiesForClass,
    getPropertyDetail,
    getEnumerationMembers,
    classifyRange,
    isEnumerationClass,
  }
}
