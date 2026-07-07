/**
 * HR 领域同义词词典
 *
 * 用于查询扩展：当用户查询包含"核心词"时，自动追加其同义词以提升召回率。
 * 每次最多扩展 3 个同义词，避免过度扩展引入噪声。
 * 单字不触发扩展（如"假"）。
 */
export const SYNONYM_MAP: Record<string, string[]> = {
  年假: ['年休假', '带薪年假', '带薪休假'],
  病假: ['病事假', '医疗假', '病休'],
  医保: ['医疗保险', '医保卡', '基本医疗保险'],
  社保: ['社会保险', '五险', '五险一金'],
  公积金: ['住房公积金', '住房基金'],
  加班: ['加班加点', '超时工作', '延时工作'],
  调休: ['补休', '调休假'],
  报销: ['报账', '费用报销', '差旅报销'],
  入职: ['报到', '新员工入职'],
  离职: ['辞职', '解除劳动合同'],
  绩效: ['绩效考核', 'KPI', 'OKR'],
  薪资: ['工资', '薪水', '薪酬', '待遇'],
  晋升: ['升职', '晋级', '提拔'],
  福利: ['员工福利', '企业福利', '公司福利'],
  打卡: ['考勤打卡', '签到'],
  补贴: ['补助', '津贴', '补助金'],
};

/** 每次查询扩展最多追加的同义词数量 */
export const MAX_SYNONYM_EXPANSION = 3;

/**
 * 查询扩展：在原始查询后追加匹配的同义词
 *
 * @param query 原始用户查询
 * @returns 扩展后的查询字符串
 *
 * @example
 *   expandQuery('医保报销流程')  // → '医保报销流程 医疗保险 医保卡 基本医疗保险'
 *   expandQuery('我没有年假')    // → '我没有年假'（单字"假"不触发扩展）
 *   expandQuery('今天天气')      // → '今天天气'（无匹配同义词）
 */
export function expandQuery(query: string): string {
  let expanded = query;
  const matched: string[] = [];

  for (const [term, synonyms] of Object.entries(SYNONYM_MAP)) {
    // 核心词 ≥2 字才触发扩展，避免"假"单独匹配"病假"等名词
    if (term.length >= 2 && query.includes(term)) {
      matched.push(term);
      for (const syn of synonyms) {
        if (!expanded.includes(syn)) {
          expanded += ' ' + syn;
          if (matched.length * MAX_SYNONYM_EXPANSION <= synonyms.length) break;
        }
      }
    }
  }

  return expanded;
}
