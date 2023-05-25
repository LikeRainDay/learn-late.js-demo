import React, { useMemo, useState } from 'react'
import isUrl from 'is-url'
import { isKeyHotkey } from 'is-hotkey'
import { css } from '@emotion/css'
import * as SlateReact from 'slate-react'
import {
  Editable,
  useFocused,
  useSelected,
  useSlate,
  withReact,
} from 'slate-react'
import {
  createEditor,
  Descendant,
  Editor,
  Text as SlateText,
  Element as SlateElement,
  Range,
  Transforms,
} from 'slate'
import { withHistory } from 'slate-history'
import { ButtonElement, LinkElement } from './custom-types'

import { Button, Icon, Toolbar } from '../components'

const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [
      {
        text:
          'In addition to block nodes, you can create inline nodes. Here is a ',
      },
      {
        type: 'link',
        url: 'https://en.wikipedia.org/wiki/Hypertext',
        children: [
          { text: 'hyperlink' },
          {
            type: 'button',
            prefix: 'prompt',
            children: [{ text: 'editable button' }],
          },
        ],
      },
      {
        text: ', and here is a more unusual inline: an ',
      },
      {
        type: 'button',
        children: [{ text: 'editable button' }],
      },
      {
        type: 'optional',
        children: [{ text: 'editable button' }],
      },
      {
        text: '! Here is a read-only inline: ',
      },
      {
        type: 'badge',
        children: [{ text: 'Approved' }],
      },
      {
        type: 'button',
        children: [{ text: 'editable button' }],
      },
      {
        text: '.',
      },
    ],
  },
  {
    type: 'paragraph',
    children: [
      {
        text:
          'There are two ways to add links. You can either add a link via the toolbar icon above, or if you want in on a little secret, copy a URL to your keyboard and paste it while a range of text is selected. ',
      },
      // The following is an example of an inline at the end of a block.
      // This is an edge case that can cause issues.
      {
        type: 'link',
        url: 'https://twitter.com/JustMissEmma/status/1448679899531726852',
        children: [{ text: 'Finally, here is our favorite dog video.' }],
      },
      { text: '' },
    ],
  },
]
const InlinesExample = () => {
  const editor = useMemo(
    () => withInlines(withHistory(withReact(createEditor()))),
    []
  )

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = event => {
    const { selection } = editor
    if (selection && Range.isCollapsed(selection)) {
      const { nativeEvent } = event

      if (event.key === 'Enter') {
        event.preventDefault()
      }
      switch (event.key) {
        case 'Backspace': {
          // const basePoint = Editor.before(editor, selection, {})
          const [node, path] = Editor.above(editor, {})
          const [nodeFirst, pathFirst] = Editor.first(editor, selection)
          if (node.type === 'button') {
            if (nodeFirst.text === '') {
              Transforms.removeNodes(editor, { at: path })
            }
          }
          break
        }
        case 'Tab': {
          console.log('tab', event)
          event.preventDefault()
          const { selection } = editor

          const [parentNode, parentNodePoint] = Editor.parent(editor, selection)
          if (parentNode.type === 'button') {
            const [nextNode, nextPoint] = Editor.next(editor, { at: selection })
            Transforms.select(editor, nextPoint)
          } else {
            const [curNode, curNodePoint] = Editor.node(editor, selection)
            const [nextNode, nextPoint] = Editor.next(editor, { at: selection })
            if (curNode.text === '' && nextNode === undefined) {
              break
            }
            const [node, nextPath] = Editor.next(editor, { at: selection })
            Editor.withoutNormalizing(editor, () => {
              Transforms.select(editor, nextPath)
            })
          }
          break
        }
      }

      if (isKeyHotkey('left', nativeEvent)) {
        event.preventDefault()
        Transforms.move(editor, { unit: 'offset', reverse: true })
        return
      }
      if (isKeyHotkey('right', nativeEvent)) {
        event.preventDefault()
        Transforms.move(editor, { unit: 'offset' })
        return
      }
    } else {
      switch (event.key) {
        case 'Tab': {
          const isSelectable = Editor.isSelectable(editor, editor.selection)
          const [nextNode, nextPoint] = Editor.next(editor, {
            at: editor.selection,
          })
          console.log('nextNode', nextNode)
          console.log('nextPoint', nextPoint)
          if (nextNode.type === 'button') {
            Transforms.select(editor, nextPoint)
          } else {
            Transforms.select(editor, nextPoint)
          }

          event.preventDefault()
          // if (isSelectable) {
          //   Transforms.deselect(editor)
          //   Transforms.move(editor, { unit: 'offset' })
          // }
        }
      }
    }
  }
  const handlePaste = event => {
    event.preventDefault()
    const text = event.clipboardData.getData('text/plain')
    editor.insertText(text)
  }

  return (
    <SlateReact.Slate
      editor={editor}
      value={initialValue}
      onChange={value => {
        const { selection } = editor
        if (selection && Range.isCollapsed(selection)) {
          // console.log("第一个文本",value[0].children[0].text)

          const [start] = Range.edges(selection)
          const wordBefore = Editor.before(editor, start, { unit: 'word' })
          const before = wordBefore && Editor.before(editor, wordBefore)
          const beforeRange = before && Editor.range(editor, before, start)
          const beforeText = beforeRange && Editor.string(editor, beforeRange)
          const beforeMatch = beforeText && beforeText.match(/^\/(\w+)$/)
          const after = Editor.after(editor, start)
          const afterRange = Editor.range(editor, start, after)
          const afterText = Editor.string(editor, afterRange)
          const afterMatch = afterText.match(/^(\s|$)/)

          if (beforeMatch && afterMatch) {
            console.log("trigger '@' autocomplete")
            return
          }
        }
      }}
    >
      <Toolbar>
        <button
          onMouseDown={event => {
            Transforms.delete(editor, { at: Editor.range(editor, []) })
            Transforms.insertText(editor, '')
          }}
        >
          clear
        </button>
        <button
          onMouseDown={event => {
            const { children } = editor
            const texts: string[] = []
            const getText = (nodes: Node[]) => {
              nodes.forEach(node => {
                if (SlateText.isText(node)) {
                  texts.push(node.text)
                } else if (node.type === 'button') {
                  texts.push(`${node.prefix ?? ''}:`)
                  getText(node.children)
                } else if (node.children) {
                  getText(node.children)
                }
              })
            }
            getText(children)
            console.log(texts.join(''))
          }}
        >
          get all text
        </button>
        <AddLinkButton />
        <RemoveLinkButton />
        <ToggleEditableButtonButton />
      </Toolbar>
      <Editable
        renderElement={props => <Element {...props} />}
        renderLeaf={props => <Text {...props} />}
        placeholder="Enter some text..."
        onKeyDown={onKeyDown}
        onPaste={handlePaste}
      />
    </SlateReact.Slate>
  )
}

const Optional = ({ attributes, children, element }) => {
  const editor = useSlate()
  const selected = useSelected()
  const focused = useFocused()
  const [canDelete, setCanDelete] = useState(false)
  const optionalMain: React.CSSProperties = {
    display: 'inline-flex',
    borderRadius: '4px',
    border: '1px solid transparent',
    boxShadow: selected && focused ? '0 0 0 2px #B4D5FF' : 'none',
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
    maxWidth: 'calc(100% - 30px)',
    borderColor: 'grey',
    // width: 'max-content',
  }

  const optionalKey: React.CSSProperties = {
    display: 'inline-block',
    padding: '1px 8px',
    borderTopLeftRadius: '4px',
    borderBottomLeftRadius: '4px',
    userSelect: 'none',
    flexShrink: 0,
    outline: 0,
    backgroundColor: '#151313',
    color: '#fff',
    textAlign: 'left',
  }

  const optionalValue: React.CSSProperties = {
    display: 'inline-block',
    outline: 'none',
    padding: '1px 8px',
    verticalAlign: 'top',
    whiteSpace: 'pre-wrap',
    overflowY: 'scroll',
    overflowX: 'hidden',
    flex: 1,
  }
  // useEffect(() => {
  //   const isEmpty = Editor.isEmpty(editor, element)
  //   const text = Editor.hasTexts(editor, element)
  //   if (isEmpty && text) {
  //     Transforms.removeNodes(editor, {
  //       at: ReactEditor.findPath(editor, element),
  //     })
  //   }
  // }, [element])

  return (
    <>
      <span style={optionalMain} {...attributes}>
        <span style={optionalKey} contentEditable={false}>
          prompt
        </span>
        <InlineChromiumBugfix />
        <span style={optionalValue}>{children}</span>
        <InlineChromiumBugfix />
      </span>
    </>
  )
}

const withInlines = editor => {
  const {
    insertData,
    insertText,
    isInline,
    isElementReadOnly,
    isSelectable,
  } = editor

  editor.isInline = element =>
    ['link', 'button', 'badge'].includes(element.type) || isInline(element)

  editor.isElementReadOnly = element =>
    element.type === 'badge' || isElementReadOnly(element)

  editor.isSelectable = element => {
    console.log(element)
    element.type !== 'badge' && isSelectable(element)
  }

  editor.insertText = text => {
    if (text && isUrl(text)) {
      wrapLink(editor, text)
    } else {
      insertText(text)
    }
  }

  editor.insertData = data => {
    const text = data.getData('text/plain')

    if (text && isUrl(text)) {
      wrapLink(editor, text)
    } else {
      insertData(data)
    }
  }
  editor.insertText = text => {
    if (text && editor.isInline(editor)) {
      const { selection } = editor

      if (selection) {
        const [parent] = Editor.parent(editor, selection.focus.path)
        if (parent && parent.type !== 'inline') {
          const inlineText = { type: 'inline', children: [{ text }] }
          Transforms.wrapNodes(editor, inlineText, { split: true })
          return
        }
      }
    }

    insertText(text)
  }

  return editor
}

const insertLink = (editor, url) => {
  if (editor.selection) {
    wrapLink(editor, url)
  }
}

const insertButton = editor => {
  if (editor.selection) {
    wrapButton(editor)
  }
}

const isLinkActive = editor => {
  const [link] = Editor.nodes(editor, {
    match: n =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'link',
  })
  return !!link
}

const isButtonActive = editor => {
  const [button] = Editor.nodes(editor, {
    match: n =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'button',
  })
  return !!button
}

const unwrapLink = editor => {
  Transforms.unwrapNodes(editor, {
    match: n =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'link',
  })
}

const unwrapButton = editor => {
  Transforms.unwrapNodes(editor, {
    match: n =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'button',
  })
}

const wrapLink = (editor, url: string) => {
  if (isLinkActive(editor)) {
    unwrapLink(editor)
  }

  const { selection } = editor
  const isCollapsed = selection && Range.isCollapsed(selection)
  const link: LinkElement = {
    type: 'link',
    url,
    children: isCollapsed ? [{ text: url }] : [],
  }

  if (isCollapsed) {
    Transforms.insertNodes(editor, link)
  } else {
    Transforms.wrapNodes(editor, link, { split: true })
    Transforms.collapse(editor, { edge: 'end' })
  }
}

const wrapButton = editor => {
  if (isButtonActive(editor)) {
    unwrapButton(editor)
  }

  const { selection } = editor
  const isCollapsed = selection && Range.isCollapsed(selection)
  const button: ButtonElement = {
    type: 'button',
    children: isCollapsed ? [{ text: 'Edit me!' }] : [],
  }

  if (isCollapsed) {
    Transforms.insertNodes(editor, button)
  } else {
    Transforms.wrapNodes(editor, button, { split: true })
    Transforms.collapse(editor, { edge: 'end' })
  }
}

// Put this at the start and end of an inline component to work around this Chromium bug:
// https://bugs.chromium.org/p/chromium/issues/detail?id=1249405
const InlineChromiumBugfix = () => (
  <span
    contentEditable={false}
    className={css`
      font-size: 0;
    `}
  >
    {String.fromCodePoint(160) /* Non-breaking space */}
  </span>
)

const LinkComponent = ({ attributes, children, element }) => {
  const selected = useSelected()
  return (
    <a
      {...attributes}
      href={element.url}
      className={
        selected
          ? css`
              box-shadow: 0 0 0 3px #ddd;
            `
          : ''
      }
    >
      <InlineChromiumBugfix />
      {children}
      <InlineChromiumBugfix />
    </a>
  )
}

const EditableButtonComponent = ({ attributes, children }) => {
  return (
    /*
      Note that this is not a true button, but a span with button-like CSS.
      True buttons are display:inline-block, but Chrome and Safari
      have a bad bug with display:inline-block inside contenteditable:
      - https://bugs.webkit.org/show_bug.cgi?id=105898
      - https://bugs.chromium.org/p/chromium/issues/detail?id=1088403
      Worse, one cannot override the display property: https://github.com/w3c/csswg-drafts/issues/3226
      The only current workaround is to emulate the appearance of a display:inline button using CSS.
    */
    <span
      {...attributes}
      tabIndex={0}
      onClick={ev => ev.preventDefault()}
      // Margin is necessary to clearly show the cursor adjacent to the button
      className={css`
        margin: 0 0.1em;

        background-color: #efefef;
        padding: 2px 6px;
        border: 1px solid #767676;
        border-radius: 2px;
        font-size: 0.9em;
      `}
    >
      <InlineChromiumBugfix />
      <span contentEditable={false} style={{ backgroundColor: 'white' }}>
        {attributes}
      </span>

      {children}
      <InlineChromiumBugfix />
    </span>
  )
}

const BadgeComponent = ({ attributes, children, element }) => {
  const selected = useSelected()

  return (
    <span
      {...attributes}
      contentEditable={false}
      className={css`
        background-color: green;
        color: white;
        padding: 2px 6px;
        border-radius: 2px;
        font-size: 0.9em;
        ${selected && 'box-shadow: 0 0 0 3px #ddd;'}
      `}
      data-playwright-selected={selected}
    >
      <InlineChromiumBugfix />
      {children}
      <InlineChromiumBugfix />
    </span>
  )
}

const Element = props => {
  const { attributes, children, element } = props
  switch (element.type) {
    case 'link':
      return <LinkComponent {...props} />
    case 'button':
      return <Optional {...props} />
    case 'optional':
      return <Optional {...props} />
    case 'badge':
      return <BadgeComponent {...props} />
    default:
      return <span {...attributes}>{children}</span>
  }
}

const Text = props => {
  const { attributes, children, leaf } = props
  return (
    <span
      // The following is a workaround for a Chromium bug where,
      // if you have an inline at the end of a block,
      // clicking the end of a block puts the cursor inside the inline
      // instead of inside the final {text: ''} node
      // https://github.com/ianstormtaylor/slate/issues/4704#issuecomment-1006696364
      className={
        leaf.text === ''
          ? css`
              padding-left: 0.1px;
            `
          : null
      }
      {...attributes}
    >
      {children}
    </span>
  )
}

const AddLinkButton = () => {
  const editor = useSlate()
  return (
    <Button
      active={isLinkActive(editor)}
      onMouseDown={event => {
        event.preventDefault()
        const url = window.prompt('Enter the URL of the link:')
        if (!url) return
        insertLink(editor, url)
      }}
    >
      <Icon>link</Icon>
    </Button>
  )
}

const RemoveLinkButton = () => {
  const editor = useSlate()

  return (
    <Button
      active={isLinkActive(editor)}
      onMouseDown={event => {
        if (isLinkActive(editor)) {
          unwrapLink(editor)
        }
      }}
    >
      <Icon>link_off</Icon>
    </Button>
  )
}

const ToggleEditableButtonButton = () => {
  const editor = useSlate()
  return (
    <Button
      active
      onMouseDown={event => {
        event.preventDefault()
        if (isButtonActive(editor)) {
          unwrapButton(editor)
        } else {
          insertButton(editor)
        }
      }}
    >
      <Icon>smart_button</Icon>
    </Button>
  )
}

export default InlinesExample
