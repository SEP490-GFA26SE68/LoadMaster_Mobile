import type { vi } from './vi'

/** Câu đổi theo số lượng. Tiếng Việt không chia số nhiều nên hai dạng giống nhau. */
export type PluralMessage = { readonly one: string; readonly other: string }

export type MessageTree = { readonly [key: string]: string | PluralMessage | MessageTree }

type Messages = typeof vi

/** Chỉ object có đúng hai key `one`, `other` mới là câu số nhiều; còn lại là nhóm key. */
type IsPlural<Node> = Node extends PluralMessage
  ? [Exclude<keyof Node, keyof PluralMessage>] extends [never]
    ? true
    : false
  : false

type IsLeaf<Node> = Node extends string ? true : IsPlural<Node>

type LeafKeys<Tree, Prefix extends string = ''> = {
  [Key in keyof Tree & string]: IsLeaf<Tree[Key]> extends true
    ? `${Prefix}${Key}`
    : LeafKeys<Tree[Key], `${Prefix}${Key}.`>
}[keyof Tree & string]

export type MessageKey = LeafKeys<Messages>

type MessageAt<Tree, Key extends string> = Key extends `${infer Head}.${infer Rest}`
  ? Head extends keyof Tree
    ? MessageAt<Tree[Head], Rest>
    : never
  : Key extends keyof Tree
    ? Tree[Key]
    : never

/** 'Tài khoản {name}' → 'name' */
type ParamNames<Message> = Message extends `${string}{${infer Name}}${infer Rest}`
  ? Name | ParamNames<Rest>
  : never

type UnionToIntersection<Union> = (Union extends unknown ? (arg: Union) => void : never) extends (
  arg: infer Intersection,
) => void
  ? Intersection
  : never

type Placeholder<Name> = Name extends string ? `${string}{${Name}}${string}` : never

/** Câu dịch là chuỗi bất kỳ, nhưng phải giữ đủ mọi `{tham số}` của câu nguồn. */
type Translation<Text> = [ParamNames<Text>] extends [never]
  ? string
  : UnionToIntersection<Placeholder<ParamNames<Text>>>

/**
 * Hình dạng bản dịch suy từ từ điển nguồn: đúng bộ key, không thiếu, không thừa.
 * Dùng `satisfies Dictionary<typeof vi>` để lỗi hiện ngay lúc `tsc -b`.
 */
export type Dictionary<Source> = {
  readonly [Key in keyof Source]: Source[Key] extends string
    ? Translation<Source[Key]>
    : IsPlural<Source[Key]> extends true
      ? { readonly [Form in keyof PluralMessage]: Translation<Source[Key][Form & keyof Source[Key]]> }
      : Dictionary<Source[Key]>
}

export type ParamValue = string | number

export type MessageParams = Readonly<Record<string, ParamValue>>

type Texts<Message> = Message extends PluralMessage ? Message['one'] | Message['other'] : Message

type KeyParams<Key extends MessageKey> = ParamNames<Texts<MessageAt<Messages, Key>>>

export type ParamsArgs<Key extends MessageKey> =
  MessageAt<Messages, Key> extends PluralMessage
    ? [params: { readonly count: number } & Readonly<Record<Exclude<KeyParams<Key>, 'count'>, ParamValue>>]
    : [KeyParams<Key>] extends [never]
      ? []
      : [params: Readonly<Record<KeyParams<Key>, ParamValue>>]

/**
 * `t(key)` hoặc `t(key, params)`. Key gợi ý tự động từ `vi.ts`; câu có `{tham số}` thì
 * bắt buộc truyền đúng tên; câu số nhiều bắt buộc `count: number`. Số trong tham số
 * được format theo ngôn ngữ; số có đơn vị thì format trước bằng `useFormat()`.
 *
 * Gõ sai key thường hiện lỗi "Expected 2 arguments": TypeScript không suy được key
 * nên quay về cả tập key, trong đó có câu cần tham số.
 */
export type TFunction = <Key extends MessageKey>(key: Key, ...params: ParamsArgs<Key>) => string
