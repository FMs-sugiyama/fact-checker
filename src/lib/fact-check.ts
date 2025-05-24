import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const vectorStoreId = process.env.VECTOR_STORE_ID!;

export interface CheckResult {
  ok: boolean;     // 事実と概ね一致?
  answer: string;  // GPT が生成した全文 (OK / NG + 詳細 & 出典)
  citations: string[];  // 出典だけを配列で保持
}

/**
 * ファクトチェック本体
 * @param statement チェック対象文章
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
        与えられた文章にファクトと比較して誤りがあるか確認し､回答をデータソースとともに出力してください。
        誤りがない場合は回答の冒頭にOKと出力し､その後データソースのどこに記載があるか､詳細を出力し､出典を出力してください。
        誤りがある場合は回答の冒頭にNGと出力し､その後データソースと比較した誤りの箇所を出力し､出典を出力してください。
        `,
      },
      {
        role: "user",
        content: statement,
      },
    ],
  });

  /* ───────── 出典を整形 ───────── */
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

  /* ① まず本文だけをトリムして保持 */
  const body = res.output_text.trim();

  /* ② 本文だけで OK / NG を判定 */
  const ok = /^OK/i.test(body);

  /* ③ 表示用の answer は出典を加えて組み立て */
  const answer = citationBlocks.length
    ? `${body}

---

<details>
<summary>📚 出典</summary>

${citationBlocks.join("\n\n")}

</details>`
    : body;

  return { ok, answer, citations: citationBlocks };
} 