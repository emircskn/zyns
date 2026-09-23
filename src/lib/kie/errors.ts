/**
 * KIE's messages in English.
 *
 * KIE, and the model providers behind it, sometimes answer in Chinese: a
 * failed task's `failMsg`, or the `msg` of a rejected request. The studio
 * shows those messages on the tile and under the prompt bar, so they are
 * put into English here. Known phrases map to a plain sentence; anything
 * else Chinese becomes a general sentence naming whatever identifiers the
 * message mentioned (a parameter like `image_urls`, a code), so it still
 * says where the problem is. Messages that are not Chinese pass untouched.
 */
const CJK = /[㐀-䶿一-鿿]/;

/** Most specific first: the first phrase found decides the sentence. */
const PHRASES: Array<[RegExp, string]> = [
  [/参数.{0,6}错误.{0,4}或.{0,6}(内容)?违反/, "KIE rejected the request: a parameter is invalid, or the content is against its policy."],
  [/积分不足|余额不足|额度不足|点数不足|credits? insufficient/i, "Not enough credits for this run."],
  [/敏感|违规|违反.{0,6}(政策|规定)|审核|不合规|色情|暴力|涉政|内容安全|安全检测|安全策略/, "The content was flagged by the safety filter."],
  [/人脸|真人|名人|肖像/, "The image contains a face or person the model will not use."],
  [/版权|侵权|商标/, "The request was refused over copyright or trademark."],
  [/(图片|图像|视频|音频|文件|素材).{0,6}(下载|获取|读取|访问).{0,4}失败|无法(下载|获取|访问|读取)|链接.{0,4}(无效|失效|过期)|URL.{0,6}(无效|不可用|访问)/i, "KIE could not download one of the input files. Check that its link is public and still valid."],
  [/(文件|图片|图像|视频|音频).{0,6}(过大|太大|超过|超出).{0,6}(大小|限制|MB)?|大小.{0,4}(超过|超出|限制)/, "One of the input files is too large for this model."],
  [/(尺寸|分辨率|宽高|宽度|高度|像素|长宽比|比例).{0,8}(不符合|不支持|过小|过大|超出|限制|错误|无效)|(不符合|不支持).{0,8}(尺寸|分辨率|宽高|比例)/, "An input's size or aspect ratio is outside what this model accepts."],
  [/(时长|时间长度|秒数).{0,8}(不符合|不支持|过长|过短|超出|限制|错误|无效)/, "An input's duration is outside what this model accepts."],
  [/(格式|类型).{0,6}(不支持|错误|无效|不正确)|不支持.{0,6}(格式|类型)/, "One of the input files is in a format this model does not support."],
  [/(提示词|描述|文本|prompt).{0,8}(过长|太长|超过|超出|长度)/i, "The prompt is too long for this model."],
  [/(提示词|描述|prompt).{0,8}(为空|不能为空|缺失|必填)/i, "The prompt is missing."],
  [/频繁|限流|请求过多|过于频繁|超出.{0,4}(频率|速率)|rate limit/i, "Too many requests at once. Wait a moment and try again."],
  [/超时|timed? ?out/i, "The model timed out before it finished."],
  [/繁忙|拥挤|排队.{0,4}(过多|已满)|负载|容量不足|资源不足|暂不可用|不可用|维护/, "The model is busy or unavailable right now. Try again shortly."],
  [/(密钥|key|token|令牌).{0,6}(无效|错误|过期|不存在)|未授权|无权限|权限不足|认证失败|鉴权/i, "The API key was refused. Check it in your KIE dashboard."],
  [/(任务|记录|资源).{0,6}(不存在|未找到|已过期|已删除)|不存在|未找到/, "KIE could not find that task. It may have expired."],
  [/取消/, "The task was cancelled."],
  [/(参数|字段|请求)[^。，,；;]{0,28}?(错误|无效|不正确|不合法|非法|校验|验证|缺失|必填|超出范围|不在范围)|校验错误|验证错误|参数验证|错误请求|无效的请求/, "KIE rejected the request's parameters."],
  [/分页参数/, "KIE refused the page size of a listing request."],
  [/服务器.{0,4}(错误|内部)|内部错误|系统错误|服务异常|未知错误|意外/, "KIE had an internal error. Try again in a moment."],
  [/图层拆分.{0,6}失败/, "The layer decomposition failed."],
  [/生成失败|任务失败|处理失败|执行失败|失败/, "The model failed to generate this."],
];

/** Latin tokens a Chinese message quotes: parameter names, codes, numbers with units. */
function mentions(text: string): string[] {
  const found = text.match(/[A-Za-z_][A-Za-z0-9_.\-]{2,}|\d+(?:\.\d+)?\s?(?:MB|KB|px|s|秒)/g) ?? [];
  const generic = /^(code|error|msg|message|http|https|www|com|failed|request)$/i;
  return [...new Set(found.map((t) => t.replace(/秒$/, "s")))].filter((t) => !generic.test(t)).slice(0, 4);
}

export function hasChinese(text: string | undefined | null): boolean {
  return !!text && CJK.test(text);
}

/** The message in English; non-Chinese messages come back as they are. */
export function englishError(text: string): string;
export function englishError(text: string | undefined): string | undefined;
export function englishError(text: string | undefined): string | undefined {
  if (!text || !CJK.test(text)) return text;
  const sentence = PHRASES.find(([pattern]) => pattern.test(text))?.[1] ?? "KIE reported an error in Chinese that the studio does not recognise.";
  const named = mentions(text);
  return named.length ? `${sentence} (${named.join(", ")})` : sentence;
}
