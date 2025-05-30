import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const vectorStoreId =
	process.env.VECTOR_STORE_ID ??
	(() => {
		throw new Error("VECTOR_STORE_ID is not set");
	})();

export interface CheckResult {
	ok: boolean; // 事実と概ね一致?
	answer: string; // GPT が生成した全文 (OK / NG + 詳細 & 出典)
	citations: string[]; // 出典だけを配列で保持
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
				content: `あなたはファクトチェッカーです。  
データソースと突き合わせて真偽を判定し、以下のフォーマットで答えてください。

────────────────────────────────
▼ステップ 0 : 事前フィルタ
  ❶ 入力テキストが「客観的で検証可能な事実命題」か判定せよ。
    ・感想／意見／価値判断のみ、あるいは一時的・主観的形容はファクトチェック対象外
    ・データソースに対応項目がまったく存在しない場合もファクトチェック対象外
		・人名や地名､URLやメールアドレス等の固有名詞やメタデータはファクトチェック対象外
		・個人の経歴もファクトチェック対象外
  ❷ 対象外なら OK とだけ出力し、理由を 1 行で補足（出典不要）。終了。

▼ステップ 1 : 真偽判定（ステップ 0 を通過した場合のみ）
  ❶ データソースで裏が取れるか確認し、次の三つから一つを選んで冒頭に出力  
      OK  : データソースと完全に一致  
      NG  : データソースと矛盾（誤りがある）  
      OK : データソースに十分な情報がなく判定不能
  ❷ その下に、判定根拠の短い説明  
  ❸ どの箇所に載っているか（節・ページ等）を箇条書き  
  ❹ 最後に出典（URL/文献名など）

▼フォーマット例
OK
- 根拠: …
- 該当箇所: …
- 出典: …

NG
- 誤り: …
- 正しい情報: …
- 出典: …

OK  ←ステップ 0 で終了
入力文は主観的感想であり客観的事実ではないため。
────────────────────────────────
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

	const ng = /^NG/i.test(body);
	const ok = !ng;

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
