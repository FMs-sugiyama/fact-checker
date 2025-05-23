import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const vectorStoreId = process.env.VECTOR_STORE_ID!;
export interface CheckResult {
  ok: boolean;            // 事実と概ね一致?
  diffSummary?: string;   // 乖離がある場合のみ
}

/**
 * ファクトチェック本体  
 * @param statement チェック対象文章 (X で拾った Tweet, YouTube 概要欄等)
 */
export async function factCheck(statement: string): Promise<CheckResult> {

  const res = await openai.responses.create({
    model: "o3-mini",
    tools: [{ type: "file_search", vector_store_ids: [vectorStoreId] }],
    include: ["file_search_call.results"],
    input: [
      {
        type: "message",
        role: "system",
        content: `あなたはファクトチェッカーです。データソースとしてファクトが与えられています。
        与えられた文章にファクトと比較して誤りがあるか確認してください。回答は常にデータソースとともに出力してください。
        誤りがない場合は回答の冒頭にOKと出力してください。その後詳細を出力してください。
        誤りがある場合は回答の冒頭にNGと出力してください。その後誤りの箇所を指摘してください。
        `,
      },
      {
        role: "user",
        content: [
          statement
        ].join("\n"),
      },
    ],
  });
  const citationBlocks: string[] = [];

  for (const item of res.output ?? []) {
    if (item.type === "file_search_call" && item.results) {
      for (const r of item.results) {
        citationBlocks.push(
          `- **${r.filename ?? r.file_id}**\n  > ${r.text?.trim()}`,
        );
      }
    }
  }

  const answer = citationBlocks.length
    ? `${res.output_text.trim()}

---

<details>
<summary>📚 出典</summary>

${citationBlocks.join("\n\n")}

</details>`
    : res.output_text;
  /* ──────────────────────────────────────── */

  const ok = /^OK/i.test(answer); // GPT に「OK」始まりで返してもらうシンプルな判定

  return {
    ok,
    diffSummary: ok ? undefined : answer,
  };
} 