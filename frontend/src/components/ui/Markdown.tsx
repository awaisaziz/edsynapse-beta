"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";

// Repair LaTeX corrupted by JSON escaping. When the model writes a single
// backslash command (e.g. \text, \big, \frac) inside a JSON string value,
// JSON.parse interprets the escape sequence: \t→TAB, \b→backspace, \f→formfeed,
// \v→vertical-tab, \r→carriage-return. So "\text{sign}" arrives as
// "<TAB>ext{sign}" and renders as garbage. Restore the control char to its
// backslash form when it precedes a letter (i.e. it began a LaTeX command),
// leaving real whitespace (followed by space/newline, not a letter) untouched.
const ESCAPE_REPAIRS: { code: number; latex: string }[] = [
  { code: 0x09, latex: "\\t" }, // \text, \times, \tau, \theta…
  { code: 0x08, latex: "\\b" }, // \big, \beta, \bar…
  { code: 0x0c, latex: "\\f" }, // \frac, \forall, \phi…
  { code: 0x0b, latex: "\\v" }, // \vec, \vdots…
  { code: 0x0d, latex: "\\r" }, // \rightarrow, \rho, \rangle…
];

function repairLatexEscapes(src: string): string {
  let out = src;
  for (const { code, latex } of ESCAPE_REPAIRS) {
    const re = new RegExp(String.fromCharCode(code) + "(?=[a-zA-Z])", "g");
    out = out.replace(re, latex);
  }
  return out;
}

// LLMs often emit LaTeX with `\( … \)` / `\[ … \]` delimiters, but remark-math
// only understands `$…$` / `$$…$$`. Markdown also strips the backslash from
// `\(`, leaving bare parens and un-rendered math. Normalize to dollar delimiters
// before parsing so the math actually renders.
function normalizeMathDelimiters(src: string): string {
  return src
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, body) => `\n$$\n${body.trim()}\n$$\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, body) => `$${body.trim()}$`);
}

// Models frequently emit LaTeX with NO math delimiters at all — a `\mathbb{R}^d`
// or a bare `x^2` / `a_i` sitting in plain prose. remark-math never sees them as
// math, CommonMark drops the backslash/braces, and the reader gets garbage like
// "mathbbR d". To handle arbitrary LLM output, detect math-like expressions that
// live outside existing math / code regions and wrap them in `$…$` so KaTeX
// renders them.
//
// Regions we must never touch are captured (and so preserved verbatim) by the
// split: fenced code blocks, inline code, and already-delimited math.
const PROTECTED_REGION =
  /(```[\s\S]*?```|`[^`]*`|\$\$[\s\S]*?\$\$|\$[^$\n]*\$)/g;

// Two kinds of bare math, in one pass:
//  1. A LaTeX command run — `\command` plus any trailing brace groups and
//     sub/superscripts (`\frac{a}{b}`, `\mathbb{R}^d`, `\sum_{i=1}^{n}`).
//  2. A bare sub/superscript expression — an identifier carrying `^`/`_` whose
//     script is either a single alnum (`x^2`, `R^d`, `a_i`) or a braced group
//     (`x_{ij}`), possibly chained (`x_i^2`). Word boundaries on both ends keep
//     it from firing inside prose: it won't touch markdown italics (`_word_`,
//     whose script is multi-char and unbraced) or identifiers (`snake_case`).
const BARE_MATH =
  /\\[a-zA-Z]+(?:\{[^{}]*\}|\^(?:\{[^{}]*\}|\w)|_(?:\{[^{}]*\}|\w))*|(?<![A-Za-z0-9])[A-Za-z0-9](?:[\^_](?:\{[^{}]*\}|[A-Za-z0-9]))+(?![A-Za-z0-9])/g;

function wrapBareMath(src: string): string {
  return src
    .split(PROTECTED_REGION)
    .map((segment, i) =>
      // Odd indices are the captured protected regions — leave them untouched.
      i % 2 === 1 ? segment : segment.replace(BARE_MATH, (m) => `$${m}$`),
    )
    .join("");
}

function prepare(src: string): string {
  return wrapBareMath(normalizeMathDelimiters(repairLatexEscapes(src)));
}

// Turn inline citation markers like [1], [Ch. 2], [Chapter 3] into styled pills.
// Applied to the string parts of rendered text nodes so it composes with markdown.
const CITATION_RE = /\[(Ch\.\s*\d+|Chapter\s*\d+|\d+)\]/gi;

function decorateCitations(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child !== "string") return child;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    CITATION_RE.lastIndex = 0;
    while ((match = CITATION_RE.exec(child)) !== null) {
      if (match.index > lastIndex) parts.push(child.slice(lastIndex, match.index));
      parts.push(
        <span
          key={match.index}
          className="inline-flex items-center mx-0.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-primary/10 text-primary border border-primary/20 align-middle"
        >
          {match[1]}
        </span>,
      );
      lastIndex = CITATION_RE.lastIndex;
    }
    if (parts.length === 0) return child;
    if (lastIndex < child.length) parts.push(child.slice(lastIndex));
    return parts;
  });
}

// Render KaTeX gracefully: on a parse error show the source (not a thrown
// exception that breaks the whole block), and don't be strict about Unicode.
const KATEX_OPTIONS = { throwOnError: false, strict: false as const, errorColor: "#dc2626" };

/**
 * Renders LLM output as GitHub-flavored Markdown with LaTeX math
 * (`$inline$` / `$$block$$`) via KaTeX, plus styled citation pills.
 */
export default function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn(
        "edsynapse-md text-xs leading-relaxed text-foreground/90 font-sans",
        "[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
        "[&_ul]:my-2 [&_ul]:ml-4 [&_ul]:list-disc [&_ol]:my-2 [&_ol]:ml-4 [&_ol]:list-decimal [&_li]:my-0.5",
        "[&_h1]:text-base [&_h1]:font-bold [&_h1]:font-display [&_h1]:mt-4 [&_h1]:mb-1.5",
        "[&_h2]:text-sm [&_h2]:font-bold [&_h2]:font-display [&_h2]:mt-3 [&_h2]:mb-1",
        "[&_h3]:text-xs [&_h3]:font-bold [&_h3]:mt-3 [&_h3]:mb-1",
        "[&_strong]:font-bold [&_strong]:text-foreground [&_em]:italic",
        "[&_a]:text-primary [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2",
        "[&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[11px] [&_code]:font-mono",
        "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-[#0f172a] [&_pre]:p-3 [&_pre]:text-[11px]",
        "[&_pre_code]:bg-transparent [&_pre_code]:px-0 [&_pre_code]:text-slate-100",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-primary/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-foreground/70",
        "[&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_table]:text-[11px]",
        "[&_th]:border [&_th]:border-black/10 [&_th]:bg-black/5 [&_th]:px-2 [&_th]:py-1 [&_th]:font-bold [&_th]:text-left",
        "[&_td]:border [&_td]:border-black/10 [&_td]:px-2 [&_td]:py-1",
        "[&_.katex-display]:my-3 [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, KATEX_OPTIONS]]}
        components={{
          p: ({ children }) => <p>{decorateCitations(children)}</p>,
          li: ({ children }) => <li>{decorateCitations(children)}</li>,
        }}
      >
        {prepare(children)}
      </ReactMarkdown>
    </div>
  );
}
